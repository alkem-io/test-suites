/**
 * The requirement: the platform and organisation rules, grace, refusal per
 * transport, and who is never evaluated (US4-AS1–AS10; D10, D21, D23, D25,
 * D26, D35). Plan: ./second-factor-test-plan.md.
 *
 * Every refusal or coverage read goes through a minted cookie session — a
 * harness bearer is not a sign-in and reads the empty status by design. The
 * platform rule is switched on in grace only, never aged, and its stored value
 * is written back in `finally`; every refusal uses an organisation rule on a
 * throwaway organisation. On a database older than the server slice,
 * `authorizationPolicyResetOnPlatform` must have run once.
 */
import { randomUUID } from 'crypto';
import axios from 'axios';
import {
  ageRuleSince,
  assignOrganizationAssociate,
  authenticationAuditRows,
  createPrivateRoom,
  enrolTotp,
  errorCodes,
  eventually,
  getUserToken,
  loginWithPassword,
  mintBffSession,
  mintBffSessionForUser,
  platformConfigurationRowsNamingSecurity,
  platformRoleEmail,
  postGraphqlRaw,
  postGraphqlRawAs,
  postToRoom,
  readPlatformSecurity,
  readSecondFactorRequirement,
  readSubjectMarker,
  resetSecondFactor,
  restorePlatformRule,
  savePlatformRule,
  setOrganizationRule,
  setPlatformRule,
  subscribeToRoom,
  testConfiguration,
  withThrowawayOrganization,
  type GraphqlActor,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { roleTokens, secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();
const GRACE_MS = 14 * 24 * 60 * 60 * 1000;
const SKEW_MS = 60_000;
const DELIVERY_BOUND_MS = 30_000;
const server = () => testConfiguration.endPoints.server.replace(/\/$/, '');

/** A cookie session for `user`, as a sign-in with `acr` would leave it. */
const cookieOf = async (
  user: ThrowawayUser,
  options?: Parameters<typeof mintBffSession>[2]
): Promise<{ cookieHeader: string }> => ({
  cookieHeader: (await mintBffSession(user.identityId, user.userId, options))
    .cookieHeader,
});

const requirementOf = async (actor: GraphqlActor) => {
  const answer = await readSecondFactorRequirement(actor);
  expect(answer.body.errors, answer.raw).toBeUndefined();
  return answer.body.data!.me.secondFactorRequirement;
};

const refused = async (actor: GraphqlActor) =>
  errorCodes(await postGraphqlRawAs(actor, 'query { me { id } }')).includes(
    'SECOND_FACTOR_REQUIRED'
  );

const ruleRows = async (organizationId?: string) =>
  (await authenticationAuditRows({ organizationId })).filter(
    r =>
      r.outcome === 'configuration_changed' &&
      (r.details as { scope?: string }).scope ===
        (organizationId ? 'organization' : 'platform')
  );

const restGet = (path: string, cookieHeader: string) =>
  axios.get(`${server()}${path}`, {
    headers: { Cookie: cookieHeader },
    maxRedirects: 0,
    validateStatus: () => true,
    timeout: 15_000,
  });

const REFUSAL_BODY = { statusCode: 403, error_code: 'second_factor_required' };
const isRefusal = (answer: { status: number; data: unknown }) =>
  answer.status === 403 &&
  (answer.data as { error_code?: string } | null)?.error_code ===
    REFUSAL_BODY.error_code;
const PLATFORM_ONLY =
  'query { platform { configuration { defaultVisualTypeConstraints(type: BANNER) { minWidth maxWidth } } } }';

describe('Second factor — the requirement', () => {
  test('US4-AS1 D25 D35 the platform rule, switched on in grace: audit rows, the read gate, a role holder covered', async () => {
    const saved = await savePlatformRule();
    const settingsAdmin = { bearerToken: roleTokens().settingsAdmin };
    try {
      expect((await setPlatformRule(false, settingsAdmin)).body.errors).toBeUndefined();
      const rowsBefore = (await ruleRows()).length;
      const configurationBefore = await platformConfigurationRowsNamingSecurity();

      const on = await setPlatformRule(true, settingsAdmin);
      const security = on.body.data?.updatePlatformSettings.security;
      expect(security?.secondFactorRequiredForPlatformRoles, on.raw).toBe(true);
      expect(security?.secondFactorRequiredForPlatformRolesSince).toBeTruthy();
      const rows = await ruleRows();
      expect(rows).toHaveLength(rowsBefore + 1);
      expect(rows.at(-1)!.details).toMatchObject({ scope: 'platform', from: false, to: true });
      expect(await platformConfigurationRowsNamingSecurity()).toBeGreaterThan(
        configurationBefore
      );

      // On→on is no transition.
      await setPlatformRule(true, settingsAdmin);
      expect(await ruleRows()).toHaveLength(rowsBefore + 1);

      // The read gate.
      const asAdmin = await readPlatformSecurity(settingsAdmin);
      expect(asAdmin.body.data?.platform.settings.security?.secondFactorRequiredForPlatformRoles).toBe(true);
      const anonymous = await readPlatformSecurity({ anonymous: 'private' });
      expect(anonymous.body.data?.platform.settings.security, anonymous.raw).toBeNull();
      const member = await throwawayUser('reader');
      const asMember = await readPlatformSecurity(await cookieOf(member));
      expect(asMember.body.data?.platform.settings.security, asMember.raw).toBeNull();

      // A role holder's sign-in is covered, in grace.
      const support = await postGraphqlRaw<{ me: { user: { id: string } } }>(
        'query { me { user { id } } }',
        { bearerToken: roleTokens().support }
      );
      const holder = await mintBffSessionForUser(
        platformRoleEmail('PLATFORM_SUPPORT'),
        support.body.data!.me.user.id
      );
      const status = await requirementOf({ cookieHeader: holder.cookieHeader });
      expect(status.covered).toBe(true);
      expect(Date.parse(status.deadline!)).toBeGreaterThan(Date.now());
      expect(await refused({ cookieHeader: holder.cookieHeader })).toBe(false);
    } finally {
      await restorePlatformRule(saved);
    }
  });

  test('US4-AS2 D25 the organisation rule covers owner, admin and associate; off uncovers; each transition is one row', async () => {
    const admin = await throwawayUser('orgadmin');
    const associate = await throwawayUser('associate');
    await withThrowawayOrganization({ admin, associates: [associate] }, async org => {
      const asAdmin = { bearerToken: admin.token };
      const startedAt = Date.now();
      const on = await setOrganizationRule(org.id, true, asAdmin);
      expect(on.body.data?.updateOrganizationSettings.settings.security.secondFactorRequired, on.raw).toBe(true);

      const [switchedOn] = await ruleRows(org.id);
      expect(switchedOn.subjectOrganizationId).toBe(org.id);
      expect(switchedOn.details).toMatchObject({ scope: 'organization', from: false, to: true });
      const since = Date.parse((switchedOn.details as { since: string }).since);
      expect(since).toBeGreaterThanOrEqual(startedAt - SKEW_MS);
      expect(since).toBeLessThanOrEqual(Date.now() + SKEW_MS);

      for (const person of [admin, associate]) {
        const status = await requirementOf(await cookieOf(person));
        expect(status.covered, person.email).toBe(true);
        expect(Date.parse(status.deadline!)).toBe(since + GRACE_MS);
        expect(status.satisfied).toBe(false);
      }

      await setOrganizationRule(org.id, false, asAdmin);
      const rows = await ruleRows(org.id);
      expect(rows).toHaveLength(2);
      expect(rows[1].details).toMatchObject({ from: true, to: false });
      expect((await requirementOf(await cookieOf(associate))).covered).toBe(false);
    });
  });

  test('US4-AS3–AS10 grace, a reset in grace, the deadline passing, and who is never refused', async () => {
    const admin = await throwawayUser('rulesadmin');
    const member = await throwawayUser('covered');
    const lateJoiner = await throwawayUser('late');
    const uncovered = await throwawayUser('uncovered');
    const uncoveredEnrolled = await throwawayUser('uncenrolled');
    await enrolTotp((await loginWithPassword(member.email)).sessionToken);
    await enrolTotp((await loginWithPassword(uncoveredEnrolled.email)).sessionToken);

    await withThrowawayOrganization({ admin, associates: [member] }, async org => {
      const asAdmin = { bearerToken: admin.token };
      expect((await setOrganizationRule(org.id, true, asAdmin)).body.errors).toBeUndefined();

      // US4-AS3, AS9: in grace, covered and not yet satisfied.
      const grace = await requirementOf(await cookieOf(member));
      expect(grace).toMatchObject({ covered: true, satisfied: false });
      expect(Date.parse(grace.deadline!)).toBeGreaterThan(Date.now());

      // D21: a reset in grace does not shorten the grace.
      const reset = await resetSecondFactor(
        member.userId,
        { bearerToken: roleTokens().support },
        { invalidatePassword: false }
      );
      expect(reset.body.errors, reset.raw).toBeUndefined();
      const marker = await readSubjectMarker(member.identityId);
      const afterReset = await cookieOf(member, { createdAtEpochS: marker + 1 });
      expect(await refused(afterReset)).toBe(false);
      expect(await requirementOf(afterReset)).toMatchObject({
        covered: true,
        deadline: grace.deadline,
      });

      // The session the late joiner holds before the grant, used once.
      const late = await cookieOf(lateJoiner);
      expect(await refused(late)).toBe(false);

      const session = await cookieOf(member, { createdAtEpochS: marker + 1 });
      const roomId = await createPrivateRoom(asAdmin, [member.userId]);
      const sub = await subscribeToRoom(session.cookieHeader, roomId);
      try {
        const before = await postToRoom(roomId, 'before', asAdmin);
        await eventually(() => sub.messageIds.includes(before), DELIVERY_BOUND_MS, 'delivery in grace');
        const memoPdf = `/api/private/rest/memo/${randomUUID()}/pdf`;
        const ics = `/api/private/rest/calendar/event/${randomUUID()}/ics`;
        // Control: in grace, the same request is answered by its route. Not
        // the ics route: for an unknown event it never answers at all.
        expect(isRefusal(await restGet(memoPdf, session.cookieHeader))).toBe(false);

        // D26: no cache — the very next request sees the aged rule.
        await ageRuleSince({ organizationId: org.id }, 15);

        // US4-AS4, per transport.
        const me = await postGraphqlRawAs(session, 'query { me { id } }');
        expect(me.status).toBe(200);
        const error = me.body.errors?.[0]?.extensions as Record<string, unknown>;
        expect(error).toMatchObject({ code: 'SECOND_FACTOR_REQUIRED', numericCode: 11119 });

        const platformOnly = await postGraphqlRawAs(session, PLATFORM_ONLY);
        const anonymous = await postGraphqlRawAs({ anonymous: 'private' }, PLATFORM_ONLY);
        expect(platformOnly.body.errors).toBeUndefined();
        expect(platformOnly.body).toEqual(anonymous.body);

        const introspection = await postGraphqlRawAs<{ __schema: { queryType: { name: string } } }>(
          session,
          '{ __schema { queryType { name } } }'
        );
        expect(introspection.status).toBe(200);
        expect(introspection.body.data?.__schema.queryType.name).toBe('Query');
        expect(errorCodes(introspection)).not.toContain('SECOND_FACTOR_REQUIRED');

        const pdf = await restGet(memoPdf, session.cookieHeader);
        expect(pdf.status).toBe(403);
        expect(pdf.data).toMatchObject(REFUSAL_BODY);
        const calendar = await restGet(ics, session.cookieHeader);
        expect(calendar.status).toBe(403);
        expect(calendar.data).toMatchObject(REFUSAL_BODY);
        expect(calendar.headers.location).toBeUndefined();

        const hint = await restGet('/api/auth/oidc/id-token-hint', session.cookieHeader);
        expect(hint.status).toBe(200);
        expect(hint.data).toMatchObject({ second_factor_required: true, id_token: expect.any(String) });

        // D23: the established subscription delivers nothing more and closes 4403.
        const after = await postToRoom(roomId, 'after', asAdmin);
        await eventually(() => sub.closeCode() !== undefined, DELIVERY_BOUND_MS, 'socket close');
        expect(sub.closeCode()).toBe(4403);
        expect(sub.messageIds).not.toContain(after);
      } finally {
        sub.dispose();
      }

      // US4-AS6: a sign-in that completed the second factor is not refused.
      expect(await refused(await cookieOf(member, { createdAtEpochS: marker + 1, acr: 'aal2' }))).toBe(false);

      // US4-AS5, D10: a late joiner is refused on the very next request.
      const joined = await assignOrganizationAssociate(org.roleSetId, lateJoiner.userId, asAdmin);
      expect(joined.body.errors, joined.raw).toBeUndefined();
      expect(joined.body.data?.assignRoleToUser.id).toBe(lateJoiner.userId);
      expect(await refused(late)).toBe(true);

      // US4-AS8: covered by no rule — never refused, enrolled or not.
      for (const person of [uncovered, uncoveredEnrolled]) {
        const cookie = await cookieOf(person);
        expect(await refused(cookie), person.email).toBe(false);
        expect((await requirementOf(cookie)).covered).toBe(false);
      }

      // US4-AS10, SC-005: a non-interactive token is not a sign-in.
      const token = { bearerToken: await getUserToken(member.email) };
      expect(await refused(token)).toBe(false);
      expect(await requirementOf(token)).toEqual({
        covered: false,
        deadline: null,
        satisfied: false,
      });
    });
  });
});
