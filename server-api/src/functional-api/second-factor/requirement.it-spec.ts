/**
 * The requirement: the platform and organisation rules, grace, refusal per
 * transport, and who is never evaluated. Plan: ./second-factor-test-plan.md.
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
  awaitLive,
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
  postGraphqlRawAs,
  postToRoom,
  readOrganizationSecondFactorRequired,
  readPlatformSecurity,
  readSecondFactorRequirement,
  readServedUser,
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
import { roleTokens, secondFactorCases, userIdOf } from './_support/cases';

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

/**
 * `'refused'` when the server answers SECOND_FACTOR_REQUIRED, otherwise the
 * user it served: a session it rejected or read as anonymous is not "not refused".
 */
const servedAs = async (actor: GraphqlActor): Promise<string | null> => {
  const answer = await readServedUser(actor);
  return errorCodes(answer).includes('SECOND_FACTOR_REQUIRED')
    ? 'refused'
    : (answer.body.data?.me?.user?.id ?? null);
};

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
// Platform-rooted only, and reader-dependent: myPrivileges is what tells
// "served as anonymous" apart from "served as the member".
const PLATFORM_ONLY =
  'query { platform { authorization { myPrivileges } configuration { defaultVisualTypeConstraints(type: BANNER) { minWidth maxWidth } } } }';

describe('Second factor — the requirement', () => {
  test('US4-AS1 D25 D35 the platform rule, switched on in grace: audit rows, the read gate, a role holder covered', async () => {
    const saved = await savePlatformRule();
    let restoredBySql = false;
    const settingsAdmin = { bearerToken: roleTokens().settingsAdmin };
    // The case switches the rule on from off, and back off when it ends. It
    // never starts from on: on a stack where the rule is live, switching it
    // off would lift it for everyone. The stored value decides, not an API
    // read that could fail or be gated.
    const stored = saved.security as {
      secondFactorRequiredForPlatformRoles?: boolean;
    } | null;
    if (stored?.secondFactorRequiredForPlatformRoles === true) {
      throw new Error(
        'second-factor: the platform rule is already on here; this case needs a stack where it is off'
      );
    }
    try {
      const rowsBefore = (await ruleRows()).length;
      const configurationBefore = await platformConfigurationRowsNamingSecurity();

      const on = await setPlatformRule(true, settingsAdmin);
      const security = on.body.data?.updatePlatformSettings.security;
      expect(security?.secondFactorRequiredForPlatformRoles, on.raw).toBe(true);
      expect(security?.secondFactorRequiredForPlatformRolesSince).toBeTruthy();
      const rows = await ruleRows();
      expect(rows).toHaveLength(rowsBefore + 1);
      expect(rows.at(-1)!).toMatchObject({
        initiatorUserId: await userIdOf(roleTokens().settingsAdmin),
        initiatorRole: 'platform_settings_admin',
        details: { scope: 'platform', from: false, to: true },
      });
      expect(await platformConfigurationRowsNamingSecurity()).toBeGreaterThan(
        configurationBefore
      );

      // On→on is accepted and is no transition.
      const again = await setPlatformRule(true, settingsAdmin);
      expect(again.body.errors, again.raw).toBeUndefined();
      expect(
        again.body.data?.updatePlatformSettings.security?.secondFactorRequiredForPlatformRoles,
        again.raw
      ).toBe(true);
      expect(await ruleRows()).toHaveLength(rowsBefore + 1);

      // The read gate.
      const asAdmin = await readPlatformSecurity(settingsAdmin);
      expect(asAdmin.body.data?.platform.settings.security?.secondFactorRequiredForPlatformRoles).toBe(true);
      const anonymous = await readPlatformSecurity({ anonymous: 'private' });
      expect(anonymous.body.data?.platform.settings.security, anonymous.raw).toBeNull();
      const member = await throwawayUser('reader');
      const memberCookie = await cookieOf(member);
      const asMember = await readPlatformSecurity(memberCookie);
      expect(asMember.body.data?.platform.settings.security, asMember.raw).toBeNull();
      // Nor may a plain member switch it: refused, no row, still on.
      const byMember = await setPlatformRule(false, { bearerToken: member.token });
      expect(errorCodes(byMember), byMember.raw).toContain('FORBIDDEN_POLICY');
      expect(await ruleRows()).toHaveLength(rowsBefore + 1);
      expect(
        (await readPlatformSecurity(settingsAdmin)).body.data?.platform.settings
          .security?.secondFactorRequiredForPlatformRoles
      ).toBe(true);
      // The platform rule covers role holders only.
      expect((await requirementOf(memberCookie)).covered).toBe(false);

      // A role holder's sign-in is covered, in grace.
      const supportId = await userIdOf(roleTokens().support);
      const holder = await mintBffSessionForUser(
        platformRoleEmail('PLATFORM_SUPPORT'),
        supportId
      );
      const status = await requirementOf({ cookieHeader: holder.cookieHeader });
      expect(status.covered).toBe(true);
      expect(Date.parse(status.deadline!)).toBeGreaterThan(Date.now());
      expect(await servedAs({ cookieHeader: holder.cookieHeader })).toBe(supportId);
    } finally {
      // Off again through the API, which records the transition. The SQL
      // write is the fallback only, when that call fails: it records nothing.
      const off = await setPlatformRule(false, settingsAdmin).catch(() => undefined);
      if (
        off?.body.data?.updatePlatformSettings.security
          ?.secondFactorRequiredForPlatformRoles !== false
      ) {
        await restorePlatformRule(saved);
        restoredBySql = true;
      }
    }
    // Checked after the case's own outcome, which a throw in `finally` would mask.
    if (restoredBySql) {
      throw new Error(
        'second-factor: switching the platform rule off through the API failed; it was restored by SQL, so the audit trail has no off transition for this run'
      );
    }
  });

  test('US4-AS2 D25 the organisation rule covers owner, admin and associate; only its admin switches it; off uncovers; each transition is one row', async () => {
    const admin = await throwawayUser('orgadmin');
    const associate = await throwawayUser('associate');
    await withThrowawayOrganization({ admin, associates: [associate] }, async org => {
      const asAdmin = { bearerToken: admin.token };
      const startedAt = Date.now();
      const on = await setOrganizationRule(org.id, true, asAdmin);
      expect(on.body.data?.updateOrganizationSettings.settings.security.secondFactorRequired, on.raw).toBe(true);

      const [switchedOn] = await ruleRows(org.id);
      // The organisation's own admin holds no platform role: `self`.
      expect(switchedOn).toMatchObject({
        subjectOrganizationId: org.id,
        initiatorUserId: admin.userId,
        initiatorRole: 'self',
        details: { scope: 'organization', from: false, to: true },
      });
      const since = Date.parse((switchedOn.details as { since: string }).since);
      expect(since).toBeGreaterThanOrEqual(startedAt - SKEW_MS);
      expect(since).toBeLessThanOrEqual(Date.now() + SKEW_MS);

      for (const person of [admin, associate]) {
        const status = await requirementOf(await cookieOf(person));
        expect(status.covered, person.email).toBe(true);
        expect(Date.parse(status.deadline!)).toBe(since + GRACE_MS);
        expect(status.satisfied).toBe(false);
      }

      // An associate is covered but may not switch the rule: refused, no row, still on.
      const byAssociate = await setOrganizationRule(org.id, false, {
        bearerToken: associate.token,
      });
      expect(errorCodes(byAssociate), byAssociate.raw).toContain('FORBIDDEN_POLICY');
      expect(await ruleRows(org.id)).toHaveLength(1);
      expect(await readOrganizationSecondFactorRequired(org.id, asAdmin)).toBe(true);

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

      // In grace, covered and not yet satisfied.
      const grace = await requirementOf(await cookieOf(member));
      expect(grace).toMatchObject({ covered: true, satisfied: false });
      expect(Date.parse(grace.deadline!)).toBeGreaterThan(Date.now());

      // A reset in grace does not shorten the grace.
      const reset = await resetSecondFactor(
        member.userId,
        { bearerToken: roleTokens().support },
        { invalidatePassword: false }
      );
      expect(reset.body.errors, reset.raw).toBeUndefined();
      const marker = await readSubjectMarker(member.identityId);
      const afterReset = await cookieOf(member, { createdAtEpochS: marker + 1 });
      expect(await servedAs(afterReset)).toBe(member.userId);
      expect(await requirementOf(afterReset)).toMatchObject({
        covered: true,
        deadline: grace.deadline,
      });

      const session = await cookieOf(member, { createdAtEpochS: marker + 1 });
      const roomId = await createPrivateRoom(asAdmin, [member.userId]);
      const sub = await subscribeToRoom(session.cookieHeader, roomId);
      try {
        await awaitLive(sub, () => postToRoom(roomId, 'before', asAdmin), DELIVERY_BOUND_MS);
        const memoPdf = `/api/private/rest/memo/${randomUUID()}/pdf`;
        const ics = `/api/private/rest/calendar/event/${randomUUID()}/ics`;
        // Control: in grace, the same request is answered by its route — 404
        // for an unknown memo, where a session it rejected would be 401. Not
        // the ics route: for an unknown event it never answers at all.
        expect((await restGet(memoPdf, session.cookieHeader)).status).toBe(404);
        // Control: in grace, a platform-rooted document is served as the member.
        const anonymous = await postGraphqlRawAs({ anonymous: 'private' }, PLATFORM_ONLY);
        expect(anonymous.body.errors, anonymous.raw).toBeUndefined();
        const inGrace = await postGraphqlRawAs(session, PLATFORM_ONLY);
        expect(inGrace.body.errors, inGrace.raw).toBeUndefined();
        expect(inGrace.body).not.toEqual(anonymous.body);

        // No cache — the very next request sees the aged rule.
        await ageRuleSince({ organizationId: org.id }, 15);

        // Refused on every transport.
        const me = await postGraphqlRawAs(session, 'query { me { id } }');
        expect(me.status).toBe(200);
        const error = me.body.errors?.[0]?.extensions as Record<string, unknown>;
        expect(error).toMatchObject({ code: 'SECOND_FACTOR_REQUIRED', numericCode: 11119 });

        const platformOnly = await postGraphqlRawAs(session, PLATFORM_ONLY);
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

        // The established subscription delivers nothing more and closes 4403.
        const after = await postToRoom(roomId, 'after', asAdmin);
        await eventually(() => sub.closeCode() !== undefined, DELIVERY_BOUND_MS, 'socket close');
        expect(sub.closeCode()).toBe(4403);
        expect(sub.messageIds).not.toContain(after);
      } finally {
        sub.dispose();
      }

      // A sign-in that completed the second factor is not refused; one that
      // reached only aal1 is.
      expect(
        await servedAs(await cookieOf(member, { createdAtEpochS: marker + 1, acr: 'aal2' }))
      ).toBe(member.userId);
      expect(
        await servedAs(await cookieOf(member, { createdAtEpochS: marker + 1, acr: 'aal1' }))
      ).toBe('refused');

      // A late joiner is refused on the very next request. The
      // session is served once right before the grant, so whatever the server
      // remembers about it is fresh when the grant lands.
      const late = await cookieOf(lateJoiner);
      expect(await servedAs(late)).toBe(lateJoiner.userId);
      const joined = await assignOrganizationAssociate(org.roleSetId, lateJoiner.userId, asAdmin);
      expect(joined.body.errors, joined.raw).toBeUndefined();
      expect(joined.body.data?.assignRoleToUser.id).toBe(lateJoiner.userId);
      expect(await servedAs(late)).toBe('refused');

      // Covered by no rule — never refused, enrolled or not.
      for (const person of [uncovered, uncoveredEnrolled]) {
        const cookie = await cookieOf(person);
        expect(await servedAs(cookie), person.email).toBe(person.userId);
        expect((await requirementOf(cookie)).covered).toBe(false);
      }

      // A non-interactive token is not a sign-in.
      const token = { bearerToken: await getUserToken(member.email) };
      expect(await servedAs(token)).toBe(member.userId);
      expect(await requirementOf(token)).toEqual({
        covered: false,
        deadline: null,
        satisfied: false,
      });
    });
  });
});
