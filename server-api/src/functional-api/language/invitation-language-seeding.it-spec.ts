// Feature 029-detect-signup-language — the server-side half the browser walks
// cannot reach: an inviter's suggested language is recorded on the invitation and
// SEEDED onto the new account when that person registers.
//
// This is the story's headline requirement — "the language would need to be
// stored per user, not just per web client" (alkem-io/alkemio#2017) — and it
// covers the scenarios recorded as infeasible-headless in the client-web walks:
// US4 and US5-AS2/AS3/AS4 (invitee lands in the suggested language) plus
// US5-AS7 (batch fan-out onto BOTH the Invitation and the PlatformInvitation).
//
// Registration path: the `createUser` mutation runs the same
// `finalizeUserRegistration` -> `processPendingInvitations` ->
// `seedLanguageFromInvitation` chain a Kratos sign-up finalizes through, so the
// seeding contract is exercised without driving the sign-up UI.
//
// mapping: client-web/src/functional-e2e/language-offer/language-offer-test-plan.md

import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteUser } from '../contributor-management/user/user.request.params';
import {
  InvitationLanguage,
  InviteResult,
  PlatformInvitationLanguage,
  createUserWithEmail,
  deletePlatformInvitationById,
  getLanguageConfig,
  getRoleSetInvitationLanguages,
  getUserLanguageSettings,
  inviteWithSuggestedLanguage,
} from './language.request.params';

const uniqueId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
let roleSetId = '';
/** The platform's eligible language set, read at run time (config kill switch). */
let eligible: string[] = [];
/**
 * The language these walks suggest on an invitation. Chosen to differ from the
 * platform default wherever the eligible set allows: `eligible` (what may be
 * offered/suggested) and `default` (the fallback when nothing is chosen) are
 * separate settings — currently `['nl']` vs `en` — but a config could overlap
 * them. Suggesting a NON-default language is what makes "the account came back
 * set to the suggestion" distinguishable from "the account is showing the
 * platform fallback".
 */
let eligibleLanguage = '';
let defaultLanguage = '';

/** Everything created by this file, torn down in afterAll. */
const createdUserIds: string[] = [];
const createdPlatformInvitationIds: string[] = [];

const scenarioConfig: TestScenarioConfig = {
  name: 'language-invitation-seeding',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
  },
};

/**
 * Invitee addresses use the RFC 2606 reserved `.test` TLD, never the real
 * `alkem.io` domain. Registering a user fires a "profile created" notification,
 * so a real domain would mean outbound mail (and bounces) to Alkemio's own mail
 * server on any environment that is not MailSlurper-backed. `.test` can never
 * resolve. It also keeps `assignUserToOrganizationByDomain` out of the picture —
 * a verified organization claiming `alkem.io` would otherwise auto-join these
 * throwaway accounts to a real org's role set.
 */
const inviteeEmail = (label: string) => `lang029-${label}-${uniqueId}@alkemio.test`;

/**
 * Invite a not-yet-registered email and remember the PlatformInvitation for
 * cleanup. Returns the outcome as well as the invitation, because inviting the
 * same address twice on one role set is a no-op that reports
 * ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET and hands back the original.
 */
const inviteNewEmail = async (
  email: string,
  suggestedLanguage?: string
): Promise<{ result: InviteResult; platformInvitation: PlatformInvitationLanguage }> => {
  const response = await inviteWithSuggestedLanguage({
    roleSetID: roleSetId,
    invitedUserEmails: [email],
    suggestedLanguage,
  });
  expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();
  const results: InviteResult[] = response.body.data.inviteForEntryRoleOnRoleSet;
  const platformInvitation = results[0].platformInvitation;
  if (!platformInvitation) {
    throw new Error(`no PlatformInvitation was created for ${email}`);
  }
  // Inviting an already-invited email returns the EXISTING invitation, so guard
  // against recording the same id twice (a double delete in teardown).
  if (!createdPlatformInvitationIds.includes(platformInvitation.id)) {
    createdPlatformInvitationIds.push(platformInvitation.id);
  }
  return { result: results[0], platformInvitation };
};

/** Register the invitee (the seeding path) and remember the user for cleanup. */
const registerInvitee = async (email: string, label: string) => {
  const response = await createUserWithEmail(email, `Lang${label}`, `User${uniqueId}`);
  expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();
  const user = response.body.data.createUser;
  createdUserIds.push(user.id);
  return user;
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  roleSetId = baseScenario.space.community.roleSetId;

  const config = await getLanguageConfig();
  const language = config.body.data.platform.configuration.language;
  eligible = language.eligible;
  defaultLanguage = language.default;
  // `?? ''` matters: on an EMPTY eligible set (the documented R-8 kill switch)
  // both `find` and `[0]` are undefined, and the walks would then send an absent
  // language and assert against a persisted null — a confusing failure instead of
  // the honest "this environment has offers switched off". The walks below skip
  // themselves in that case.
  eligibleLanguage = eligible.find(code => code !== defaultLanguage) ?? eligible[0] ?? '';
});

afterAll(async () => {
  // Teardown contract: attempt EVERY delete, tolerate only the one outcome that is
  // legitimate, and fail loudly on anything else — a suite that passes while leaking
  // fixtures into the shared environment is worse than one that fails.
  //
  // Two traps here:
  //  1. Neither helper THROWS on a GraphQL error. `graphqlRequestAuth` resolves with
  //     the response (errors in `body.errors`) and `graphqlErrorWrapper` resolves with
  //     `{ error: { errors } }`. A bare try/catch around these catches nothing, so the
  //     results have to be inspected.
  //  2. The not-found tolerance below is DEFENSIVE, not observed. The review premise
  //     was that registration consumes a pending PlatformInvitation so a later delete
  //     reports not-found — measured against acc on 2026-08-07 that does not happen:
  //     all seven deletes (users and invitations, consumed ones included) return
  //     cleanly. The branch is kept so a server that does start reporting not-found
  //     cannot fail teardown over a fixture that is already gone; if it ever fires,
  //     that is the signal the contract changed.
  const failures: string[] = [];

  /** Pull GraphQL errors out of either helper's return shape. */
  const errorsOf = (result: unknown): Array<Record<string, unknown>> => {
    const r = result as {
      body?: { errors?: Array<Record<string, unknown>> };
      error?: { errors?: Array<Record<string, unknown>> };
    };
    return r?.body?.errors ?? r?.error?.errors ?? [];
  };

  const isNotFound = (errors: Array<Record<string, unknown>>) =>
    errors.every(e => {
      const message = String(e.message ?? '');
      const code = String((e.extensions as { code?: string } | undefined)?.code ?? '');
      return /unable to find|not found|does not exist/i.test(message) || code === 'ENTITY_NOT_FOUND';
    });

  const remove = async (
    what: string,
    id: string,
    del: (id: string) => Promise<unknown>,
    tolerateNotFound = false
  ) => {
    try {
      const errors = errorsOf(await del(id));
      if (errors.length === 0) return;
      // A consumed invitation is expected to be gone; anything else is a real leak.
      if (tolerateNotFound && isNotFound(errors)) return;
      failures.push(`${what} ${id}: ${JSON.stringify(errors)}`);
    } catch (error) {
      // Transport/auth failures still reject — record rather than abort the loop.
      failures.push(`${what} ${id}: ${error}`);
    }
  };

  try {
    for (const id of createdUserIds) {
      await remove('user', id, deleteUser);
    }
    for (const id of createdPlatformInvitationIds) {
      await remove('platformInvitation', id, deletePlatformInvitationById, true);
    }
  } finally {
    // Runs regardless, so a failed delete above cannot leak the organization and space.
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  }

  if (failures.length > 0) {
    throw new Error(
      `[teardown] ${failures.length} fixture(s) left behind in the shared environment:\n` +
        failures.join('\n')
    );
  }
});

describe('029 — language suggested on an invitation is seeded onto the new account', () => {
  /** Nothing can be suggested when the platform offers no eligible language. */
  const offersDisabled = () => eligibleLanguage === '';

  // The platform must advertise an eligible set for any of this to apply; an
  // empty set is the documented kill switch (R-8) and would make the rest moot.
  test('platform advertises an eligible language set and a default (US1/US5 precondition)', async () => {
    const config = await getLanguageConfig();
    const language = config.body.data.platform.configuration.language;

    expect(Array.isArray(language.eligible)).toBe(true);
    expect(language.default).toBeTruthy();
    expect(
      language.eligible.length,
      'no eligible languages configured — proactive offers are switched off on this environment, so the seeding scenarios below do not apply'
    ).toBeGreaterThan(0);
  });

  // US4 / US5-AS2/AS3/AS4 — THE headline scenario of alkem-io/alkemio#2017.
  test('US4 — a new user invited with a suggested language registers already set to it', async ctx => {
    if (offersDisabled()) {
      ctx.skip('no eligible languages configured — proactive offers are switched off here (R-8)');
    }
    const email = inviteeEmail('seeded');
    const { platformInvitation } = await inviteNewEmail(email, eligibleLanguage);

    // FR-014a: the suggestion is recorded on the invitation...
    expect(platformInvitation.suggestedLanguage).toEqual(eligibleLanguage);

    // ... and applied to the account the moment that person registers.
    const user = await registerInvitee(email, 'Seeded');
    expect(user.settings.language).toEqual(eligibleLanguage);
    // The seeded value is the SUGGESTION, not the platform fallback — otherwise
    // this test could not tell seeding apart from a default. (Skipped only where
    // the eligible set offers nothing but the default itself.)
    if (eligibleLanguage !== defaultLanguage) {
      expect(user.settings.language).not.toEqual(defaultLanguage);
    }
    // Writing a language latches the one-time offer as answered, so the new user
    // is never additionally offered what they were already given.
    expect(user.settings.languageOfferAnswered).toBe(true);

    // Read back independently of the mutation's own payload.
    const readBack = await getUserLanguageSettings(user.id);
    expect(readBack.body.data.lookup.user.settings.language).toEqual(eligibleLanguage);
  });

  // Negative control: without a suggestion nothing is seeded, so the user keeps a
  // clean slate and is still eligible for the one-time offer (FR-015).
  test('US5-AS6 — an invitation with no suggested language seeds nothing', async () => {
    const email = inviteeEmail('nolang');
    const { platformInvitation } = await inviteNewEmail(email);
    expect(platformInvitation.suggestedLanguage).toBeNull();

    const user = await registerInvitee(email, 'NoLang');
    expect(user.settings.language).toBeNull();
    expect(
      user.settings.languageOfferAnswered,
      'an un-seeded account must still be eligible for the one-time offer'
    ).toBe(false);
  });

  // Re-inviting the same address on the same role set does NOT create a second
  // invitation — the server reports ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET and
  // returns the original, suggestion intact. That matters for the seeding rule:
  // a well-meant "re-invite without a language" cannot quietly strip a
  // suggestion the invitee was already given.
  //
  // NOTE: this is deliberately NOT a precedence test. The real rule — "the
  // latest-created invitation carrying an ELIGIBLE suggestion wins" — needs two
  // distinct invitations for one address, which requires a second role set (and,
  // to be distinguishable, a second eligible language). See the gap table in
  // language-offer-test-plan.md; server unit tests cover the ordering.
  test('US4 — re-inviting the same address preserves the original suggestion', async ctx => {
    if (offersDisabled()) {
      ctx.skip('no eligible languages configured — proactive offers are switched off here (R-8)');
    }
    const email = inviteeEmail('reinvite');
    const first = await inviteNewEmail(email, eligibleLanguage);
    expect(first.result.type).toEqual('INVITED_TO_PLATFORM_AND_ROLE_SET');

    const second = await inviteNewEmail(email);
    expect(second.result.type).toEqual('ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET');
    // Same invitation, not a new one — and the language survived the re-invite.
    expect(second.platformInvitation.id).toEqual(first.platformInvitation.id);
    expect(second.platformInvitation.suggestedLanguage).toEqual(eligibleLanguage);

    // The invitee still registers into the suggested language.
    const user = await registerInvitee(email, 'Reinvite');
    expect(user.settings.language).toEqual(eligibleLanguage);
    expect(user.settings.languageOfferAnswered).toBe(true);
  });

  // US5-AS7 — one batch call, two invitation kinds: an existing user takes the
  // Invitation path and a new email takes the PlatformInvitation path. Both must
  // carry the suggestion.
  test('US5-AS7 — the suggestion fans out onto both Invitation and PlatformInvitation', async ctx => {
    if (offersDisabled()) {
      ctx.skip('no eligible languages configured — proactive offers are switched off here (R-8)');
    }
    const existingUserId = TestUserManager.getUserModelByType(TestUser.NON_SPACE_MEMBER).id;
    const newEmail = inviteeEmail('fanout');

    const response = await inviteWithSuggestedLanguage({
      roleSetID: roleSetId,
      invitedActorIDs: [existingUserId],
      invitedUserEmails: [newEmail],
      suggestedLanguage: eligibleLanguage,
    });
    expect(response.body.errors, JSON.stringify(response.body.errors)).toBeUndefined();

    const results: InviteResult[] = response.body.data.inviteForEntryRoleOnRoleSet;
    const platformInvitation = results.map(r => r.platformInvitation).find(Boolean);
    if (!platformInvitation) {
      throw new Error('no PlatformInvitation was returned for the new email');
    }
    createdPlatformInvitationIds.push(platformInvitation.id);

    // Read the persisted state back rather than trusting the mutation payload.
    const readBack = await getRoleSetInvitationLanguages(roleSetId);
    const roleSet = readBack.body.data.lookup.roleSet;

    const invitation = roleSet.invitations.find((i: InvitationLanguage) => i.actor?.id === existingUserId);
    expect(invitation, 'no Invitation was created for the existing user').toBeTruthy();
    expect(invitation.suggestedLanguage).toEqual(eligibleLanguage);

    const persistedPlatformInvitation = roleSet.platformInvitations.find(
      (i: PlatformInvitationLanguage) => i.email.toLowerCase() === newEmail.toLowerCase()
    );
    expect(persistedPlatformInvitation, 'no PlatformInvitation was created for the new email').toBeTruthy();
    expect(persistedPlatformInvitation.suggestedLanguage).toEqual(eligibleLanguage);
  });

  // SC-008 server side: only eligible languages may be suggested. The client hides
  // non-eligible options; the API must refuse them regardless of the client.
  test('SC-008 — a non-eligible language is rejected at compose time', async () => {
    const notEligible = ['de', 'fr', 'es', 'bg'].find(code => !eligible.includes(code));
    expect(notEligible, 'every candidate language is eligible here — nothing to reject').toBeTruthy();

    const response = await inviteWithSuggestedLanguage({
      roleSetID: roleSetId,
      invitedUserEmails: [inviteeEmail('rejected')],
      suggestedLanguage: notEligible,
    });

    expect(response.body.errors?.[0]?.message).toContain('eligible');
    expect(response.body.data?.inviteForEntryRoleOnRoleSet).toBeFalsy();

    // Nothing was created by the rejected call.
    const readBack = await getRoleSetInvitationLanguages(roleSetId);
    const rejected = readBack.body.data.lookup.roleSet.platformInvitations.find(
      (i: PlatformInvitationLanguage) => i.email.includes('rejected')
    );
    expect(rejected, 'a rejected invitation must not be persisted').toBeUndefined();
  });
});
