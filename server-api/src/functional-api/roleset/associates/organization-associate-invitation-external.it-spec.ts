// Organization email invitations: a not-yet-registered address is invited to
// associate with an organization through a platform invitation — the same
// mechanism as a Space email invitation, with its own organization email.
//
// Personas (assigned on the organization's own role set): `organizationAdmin`
// = ASSOCIATE + ADMIN (factory default); `spaceMember` = ADMIN-not-associate;
// `nonSpaceMember` = OWNER-not-admin; `betaTester` = associate-only (no manager
// credential); `qaUser` = a registered user with no role on the organization;
// `globalSupportAdmin` = platform support (holds the invite privilege
// everywhere). Invitees are throwaway addresses on the reserved `.test` TLD.
//
// Every mail assertion is a delta: the inbox is pruned first (`mailsToAfter`)
// and the mail the invitation itself triggered is drained before the step that
// counts (`drainMailsTo`). The address-case probe is deliberately absent — the
// address is matched exactly as typed (known gap, not asserted either way).
import {
  getGraphqlClient,
  getUserToken,
  harnessPostgresConfigured,
  queryHarnessDb,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  createUserDataOrFail,
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';
import { getRoleSetInvitationsApplications } from '../application/application.request.params';
import {
  deleteExternalInvitation,
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
  resendPlatformInvitation,
} from '../invitations/invitation.request.params';
import {
  drainMailsTo,
  mailsToAfter,
  mailSummary,
  THROTTLED_CODE,
} from '../invitations/platform-invitation.helpers';
import {
  getErrorCode,
  getRoleSetPendingPlatformInvitations,
  getSingleInvitationResult,
  lookupPlatformInvitation,
  lookupPlatformInvitationCreatedBy,
  usersInRoles,
} from '../roleset.request.params';
import { getLanguageConfig } from '@functional-api/language/language.request.params';
import { assignRoleToUser } from '../roles-request.params';

const uniqueId = UniqueIDGenerator.getID();
const message = `Join our organization ${uniqueId}`;
/** The admin-only refusal every gated call answers with. */
const NOT_AUTHORIZED = /Authorization: unable to grant/;

const addr = (label: string) => `${label}-${uniqueId}@alkemio.test`;

/** An address of exactly `length` characters that is still a valid address:
 * a short local part and dot-separated labels of at most 60 characters. */
const addressOfLength = (length: number, label: string): string => {
  const local = `${label}-${uniqueId}`;
  const tld = 'test';
  let domain = '';
  const remaining = length - local.length - 1; // the '@'
  let budget = remaining - (tld.length + 1); // reserve '.test'
  while (budget > 0) {
    const labelLength = Math.min(60, budget - 1);
    if (labelLength < 1) break;
    domain += `${'a'.repeat(labelLength)}.`;
    budget -= labelLength + 1;
  }
  const address = `${local}@${domain}${tld}`;
  // A leftover of 1-2 characters cannot hold a label: pad the local part.
  return address.length === length
    ? address
    : `${local}${'x'.repeat(length - address.length)}@${domain}${tld}`;
};

let baseScenario: OrganizationWithSpaceModel;
let roleSetId = '';
let organizationName = '';
let suggestedLanguage: string | undefined;

const platformInvitationIds = new Set<string>();
const invitationIds = new Set<string>();
const userIds = new Set<string>();

/** Invites and tracks whatever the call created, for teardown. */
const invite = async (
  options: {
    actors?: string[];
    emails?: string[];
    roles?: RoleName[];
    as?: TestUser;
    language?: string;
  } = {}
) => {
  const res = await inviteForEntryRoleOnRoleSet(
    roleSetId,
    options.actors ?? [],
    options.emails ?? [],
    message,
    options.roles ?? [RoleName.Admin],
    options.as ?? TestUser.ORGANIZATION_ADMIN,
    options.language
  );
  for (const result of res?.data?.inviteForEntryRoleOnRoleSet ?? []) {
    if (result.platformInvitation?.id) {
      platformInvitationIds.add(result.platformInvitation.id);
    }
    if (result.invitation?.id) {
      invitationIds.add(result.invitation.id);
    }
  }
  return res;
};

const allResults = (res: Awaited<ReturnType<typeof invite>>) =>
  res?.data?.inviteForEntryRoleOnRoleSet ?? [];

/** The organization's open email invitations, read as an admin. */
const openList = async (as: TestUser = TestUser.ORGANIZATION_ADMIN) => {
  const res = await getRoleSetPendingPlatformInvitations(roleSetId, as);
  expect(res?.error).toBeUndefined();
  return res?.data?.lookup?.roleSet?.platformInvitations ?? [];
};

const register = async (email: string, label: string) => {
  const id = await registerVerifiedUser(
    email,
    `fn${label}${uniqueId}`,
    `ln${label}${uniqueId}`
  );
  userIds.add(id);
  return id;
};

const createRegisteredUser = async (email: string, displayName: string) => {
  const user = await createUserDataOrFail({
    email,
    profileData: { displayName },
  });
  userIds.add(user.id);
  return user;
};

const createOrganizationScenario = async (name: string) => {
  const scenario = await TestScenarioFactory.createBaseScenarioOrganization({
    name,
  });
  return scenario;
};

beforeAll(async () => {
  baseScenario = await createOrganizationScenario('org-email-invite');
  roleSetId = baseScenario.organization.roleSetId;
  organizationName = baseScenario.organization.profile.displayName;

  // ADMIN-not-associate.
  await assignRoleToUser(
    TestUserManager.users.spaceMember.id,
    roleSetId,
    RoleName.Admin
  );
  // OWNER-not-admin.
  await assignRoleToUser(
    TestUserManager.users.nonSpaceMember.id,
    roleSetId,
    RoleName.Owner
  );
  // Associate-only.
  await assignRoleToUser(
    TestUserManager.users.betaTester.id,
    roleSetId,
    RoleName.Associate
  );

  // The language the platform offers for invitees; absent on a deployment
  // that offers none, in which case the language assertions are skipped.
  const config = await getLanguageConfig();
  const language = config.body?.data?.platform?.configuration?.language;
  const eligible: string[] = language?.eligible ?? [];
  suggestedLanguage =
    eligible.find(code => code !== language?.default) ?? eligible[0];
});

afterAll(async () => {
  for (const id of platformInvitationIds) {
    await deleteExternalInvitation(id).catch(() => undefined);
  }
  for (const id of invitationIds) {
    await deleteInvitation(id).catch(() => undefined);
  }
  for (const id of userIds) {
    await deleteUser(id).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Invite an unregistered address to an organization (US1)', () => {
  test('US1-AS2/US3-AS1: an unknown address becomes a platform invitation carrying the offered roles, the message and the language, listed as created by the admin, with exactly one email', async () => {
    const email = addr('as2');

    const mails = await mailsToAfter(
      async () => {
        const res = await invite({
          emails: [email],
          roles: [RoleName.Admin],
          language: suggestedLanguage,
        });
        expect(res?.error).toBeUndefined();
        const result = getSingleInvitationResult(res);
        expect(result?.type).toEqual(
          RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
        );
        expect(result?.invitedEmail).toEqual(email);
        expect(result?.platformInvitation?.email).toEqual(email);
        expect(result?.platformInvitation?.roleSetExtraRoles).toEqual([
          RoleName.Admin,
        ]);
      },
      email,
      1
    );
    expect(mails, mailSummary(mails)).toHaveLength(1);
    expect(mails[0].subject).toEqual(
      `You are invited to join ${organizationName} on Alkemio`
    );

    const row = (await openList()).find(p => p.email === email);
    expect(row).toBeDefined();
    expect(row).toMatchObject({
      profileCreated: false,
      roleSetExtraRoles: [RoleName.Admin],
      welcomeMessage: message,
    });
    if (suggestedLanguage) {
      expect(row?.suggestedLanguage).toEqual(suggestedLanguage);
    }

    const createdBy = await lookupPlatformInvitationCreatedBy(row!.id);
    expect(createdBy?.data?.lookup?.platformInvitation?.createdBy.id).toEqual(
      TestUserManager.users.organizationAdmin.id
    );
  });

  test('US1-AS4: inviting the same address again reports it as already invited — no second row, no second email', async () => {
    const email = addr('as4');
    const first = getSingleInvitationResult(await invite({ emails: [email] }));
    expect(first?.type).toEqual(
      RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
    );
    await drainMailsTo(email);

    const mails = await mailsToAfter(
      async () => {
        const repeat = getSingleInvitationResult(
          await invite({ emails: [email] })
        );
        expect(repeat?.type).toEqual(
          RoleSetInvitationResultType.AlreadyInvitedToPlatformAndRoleSet
        );
      },
      email,
      0
    );
    expect(mails, mailSummary(mails)).toHaveLength(0);
    expect((await openList()).filter(p => p.email === email)).toHaveLength(1);
  });

  test("US1-AS3: a registered user's stored address typed exactly is a normal invitation to that user — no email-invitation row", async () => {
    const email = addr('as3');
    const registered = await createRegisteredUser(email, 'Registered Invitee');

    const res = await invite({ emails: [email], roles: [] });
    const result = getSingleInvitationResult(res);
    expect(result?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
    expect(result?.invitedActorID).toEqual(registered.id);
    expect(result?.invitedEmail).toEqual(email);
    expect(result?.platformInvitation).toBeFalsy();
    expect((await openList()).map(p => p.email)).not.toContain(email);
  });

  test('US1-AS5: a mixed batch gives every invitee its own outcome — a picked user once, a new address, a registered address — and no role-limit outcome lands anywhere', async () => {
    const picked = await createRegisteredUser(addr('pick'), 'Picked Invitee');
    const registered = await createRegisteredUser(
      addr('reg'),
      'Registered By Address'
    );
    const newEmail = addr('new');

    const res = await invite({
      actors: [picked.id],
      emails: [newEmail, registered.email, picked.email],
      roles: [RoleName.Admin],
    });
    expect(res?.error).toBeUndefined();
    const results = allResults(res);

    // Exactly one outcome per distinct invitee: P is reached by pick AND by
    // typed address and is invited once.
    expect(results).toHaveLength(3);
    expect(
      results.map(r => r.type),
      JSON.stringify(results)
    ).not.toContain(RoleSetInvitationResultType.ExtraRoleLimitReached);

    const forPicked = results.filter(r => r.invitedActorID === picked.id);
    expect(forPicked).toHaveLength(1);
    expect(forPicked[0].type).toEqual(
      RoleSetInvitationResultType.InvitedToRoleSet
    );

    const forRegistered = results.filter(
      r => r.invitedActorID === registered.id
    );
    expect(forRegistered).toHaveLength(1);
    expect(forRegistered[0].type).toEqual(
      RoleSetInvitationResultType.InvitedToRoleSet
    );

    const forNew = results.filter(r => r.invitedEmail === newEmail);
    expect(forNew).toHaveLength(1);
    expect(forNew[0].type).toEqual(
      RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
    );
    expect(forNew[0].invitedActorID).toBeFalsy();
    expect(forNew[0].platformInvitation?.email).toEqual(newEmail);
  });

  test('US1-AS7: revoking removes the row, a later sign-up finds no invitation, and re-inviting creates a fresh row and sends a new email', async () => {
    const email = addr('as7');
    const first = getSingleInvitationResult(await invite({ emails: [email] }));
    const firstId = first!.platformInvitation!.id;
    await drainMailsTo(email);

    const revoke = await deleteExternalInvitation(
      firstId,
      TestUser.ORGANIZATION_ADMIN
    );
    expect(revoke?.error).toBeUndefined();
    expect((await openList()).map(p => p.id)).not.toContain(firstId);

    // A sign-up with the revoked address finds nothing waiting.
    const userId = await register(email, 'as7');
    const pending = await getRoleSetInvitationsApplications(roleSetId);
    expect(
      (pending?.data?.lookup?.roleSet?.invitations ?? []).filter(
        i => i.actor.id === userId
      )
    ).toHaveLength(0);
    await deleteUser(userId);
    userIds.delete(userId);

    // Re-inviting creates a fresh row and a fresh email.
    const again = addr('as7b');
    const firstAgain = getSingleInvitationResult(
      await invite({ emails: [again] })
    );
    await drainMailsTo(again);
    await deleteExternalInvitation(
      firstAgain!.platformInvitation!.id,
      TestUser.ORGANIZATION_ADMIN
    );
    const mails = await mailsToAfter(
      async () => {
        const reinvite = getSingleInvitationResult(
          await invite({ emails: [again] })
        );
        expect(reinvite?.type).toEqual(
          RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
        );
        expect(reinvite?.platformInvitation?.id).not.toEqual(
          firstAgain!.platformInvitation!.id
        );
      },
      again,
      1
    );
    expect(mails, mailSummary(mails)).toHaveLength(1);
  });

  test('US1-AS8: a plain associate and a registered non-admin are refused every email-invitation call; an ADMIN-not-associate and an OWNER are not', async () => {
    const seeded = addr('as8');
    const seededRow = getSingleInvitationResult(
      await invite({ emails: [seeded] })
    );
    const seededId = seededRow!.platformInvitation!.id;

    for (const persona of [TestUser.GLOBAL_BETA_TESTER, TestUser.QA_USER]) {
      const attempted = addr(`as8-${persona.replace('.', '')}`);
      const inviteRes = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [],
        [attempted],
        message,
        [RoleName.Admin],
        persona
      );
      expect(inviteRes?.error?.errors?.[0]?.message, persona).toMatch(
        NOT_AUTHORIZED
      );
      expect(inviteRes?.data?.inviteForEntryRoleOnRoleSet).toBeUndefined();

      const listRes = await getRoleSetPendingPlatformInvitations(
        roleSetId,
        persona
      );
      expect(listRes?.error?.errors?.[0]?.message, persona).toMatch(
        NOT_AUTHORIZED
      );

      const revokeRes = await deleteExternalInvitation(seededId, persona);
      expect(revokeRes?.error, persona).toBeDefined();

      const resendRes = await resendPlatformInvitation(seededId, persona);
      expect(resendRes?.error?.errors?.[0]?.message, persona).toMatch(
        NOT_AUTHORIZED
      );
      expect(resendRes?.data?.resendPlatformInvitation).toBeUndefined();

      // The refused invite created nothing.
      expect((await openList()).map(p => p.email)).not.toContain(attempted);
    }
    // ...and the refused revoke left the seeded row in place.
    expect((await openList()).map(p => p.id)).toContain(seededId);

    for (const persona of [TestUser.SPACE_MEMBER, TestUser.NON_SPACE_MEMBER]) {
      const email = addr(`as8-ok-${persona.replace('.', '')}`);
      const res = await invite({ emails: [email], as: persona });
      expect(res?.error, persona).toBeUndefined();
      const created = getSingleInvitationResult(res);
      expect(created?.type, persona).toEqual(
        RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
      );
      const createdId = created!.platformInvitation!.id;
      expect((await openList(persona)).map(p => p.id), persona).toContain(
        createdId
      );
      const resend = await resendPlatformInvitation(createdId, persona);
      expect(resend?.error, persona).toBeUndefined();
      const revoke = await deleteExternalInvitation(createdId, persona);
      expect(revoke?.error, persona).toBeUndefined();
    }
  });

  test('US1-AS8: platform support can invite, list and resend', async () => {
    const email = addr('as8-support');
    const res = await invite({
      emails: [email],
      as: TestUser.GLOBAL_SUPPORT_ADMIN,
    });
    expect(res?.error).toBeUndefined();
    const created = getSingleInvitationResult(res);
    expect(created?.type).toEqual(
      RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
    );
    const id = created!.platformInvitation!.id;
    expect(
      (await openList(TestUser.GLOBAL_SUPPORT_ADMIN)).map(p => p.id)
    ).toContain(id);
    const resend = await resendPlatformInvitation(
      id,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );
    expect(resend?.error).toBeUndefined();
    expect(resend?.data?.resendPlatformInvitation.id).toEqual(id);
  });

  test('boundary: a 128-character address is accepted and emailed', async () => {
    // 128 is the storage limit of the address. (A longer address is a known,
    // pre-existing failure of the shared invite path and is not asserted.)
    const email = addressOfLength(128, 'long');
    expect(email).toHaveLength(128);

    const mails = await mailsToAfter(
      async () => {
        const res = await invite({ emails: [email] });
        expect(res?.error).toBeUndefined();
        expect(getSingleInvitationResult(res)?.type).toEqual(
          RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
        );
      },
      email,
      1
    );
    expect(mails, mailSummary(mails)).toHaveLength(1);
    expect((await openList()).map(p => p.email)).toContain(email);
  });
});

describe('Resend an organization email invitation (US3)', () => {
  test('US3-AS1/AS3: one resend sends one email naming the resending admin and leaves the row unchanged; an immediate second resend is throttled and sends nothing; another invitation is independent', async () => {
    const email = addr('resend');
    const created = getSingleInvitationResult(
      await invite({ emails: [email], roles: [RoleName.Owner] })
    );
    const id = created!.platformInvitation!.id;
    await drainMailsTo(email);
    const before = await lookupPlatformInvitation(id);

    const first = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          id,
          TestUser.ORGANIZATION_ADMIN
        );
        expect(res?.error).toBeUndefined();
        expect(res?.data?.resendPlatformInvitation.id).toEqual(id);
      },
      email,
      1
    );
    expect(first, mailSummary(first)).toHaveLength(1);
    expect(first[0].subject).toEqual(
      `You are invited to join ${organizationName} on Alkemio`
    );
    expect(first[0].body).toContain('Associate + Owner');
    expect(first[0].body).toContain(message);
    expect(first[0].body).toContain(
      TestUserManager.users.organizationAdmin.displayName
    );

    const after = await lookupPlatformInvitation(id);
    expect(after?.data?.lookup?.platformInvitation).toEqual(
      before?.data?.lookup?.platformInvitation
    );

    const second = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          id,
          TestUser.ORGANIZATION_ADMIN
        );
        expect(getErrorCode(res)).toEqual(THROTTLED_CODE);
      },
      email,
      0
    );
    expect(second, mailSummary(second)).toHaveLength(0);

    // A different invitation has its own cooldown.
    const otherEmail = addr('resend2');
    const other = getSingleInvitationResult(
      await invite({ emails: [otherEmail] })
    );
    const otherResend = await resendPlatformInvitation(
      other!.platformInvitation!.id,
      TestUser.ORGANIZATION_ADMIN
    );
    expect(otherResend?.error).toBeUndefined();
  });

  test('US3-AS6: when the original inviter has been deleted another admin can still resend — the email goes out and the recorded inviter is unchanged', async () => {
    const adminEmail = addr('gone-admin');
    const adminId = await register(adminEmail, 'goneadmin');
    await assignRoleToUser(adminId, roleSetId, RoleName.Admin);

    const inviteeEmail = addr('orphan');
    const token = await getUserToken(adminEmail);
    const inviteAsThrowaway = await getGraphqlClient().InviteForEntryRoleOnRoleSet(
      {
        roleSetId,
        invitedActorIds: [],
        invitedUserEmails: [inviteeEmail],
        welcomeMessage: message,
        extraRoles: [RoleName.Admin],
      },
      { authorization: `Bearer ${token}` }
    );
    const id =
      inviteAsThrowaway.data.inviteForEntryRoleOnRoleSet[0].platformInvitation
        ?.id ?? '';
    expect(id).toHaveLength(36);
    platformInvitationIds.add(id);
    await drainMailsTo(inviteeEmail);

    const recordedBefore = await lookupPlatformInvitationCreatedBy(id);
    expect(
      recordedBefore?.data?.lookup?.platformInvitation?.createdBy.id
    ).toEqual(adminId);
    const before = await lookupPlatformInvitation(id);

    // The inviter's account goes away; the invitation addressed to someone
    // else stays.
    const deleted = await deleteUser(adminId);
    expect(deleted?.error).toBeUndefined();
    userIds.delete(adminId);

    const mails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          id,
          TestUser.ORGANIZATION_ADMIN
        );
        expect(res?.error).toBeUndefined();
      },
      inviteeEmail,
      1
    );
    expect(mails, mailSummary(mails)).toHaveLength(1);
    expect(mails[0].body).toContain(
      TestUserManager.users.organizationAdmin.displayName
    );

    const after = await lookupPlatformInvitation(id);
    expect(after?.data?.lookup?.platformInvitation).toEqual(
      before?.data?.lookup?.platformInvitation
    );
    // The recorded inviter is a bare reference that no longer resolves through
    // the API, so it is read from the table where the harness can reach it.
    if (harnessPostgresConfigured()) {
      const rows = await queryHarnessDb<{ createdBy: string }>(
        'SELECT "createdBy" FROM platform_invitation WHERE id = $1',
        [id]
      );
      expect(rows[0]?.createdBy).toEqual(adminId);
    }
  });
});

describe('Extra-role caps do not apply to an email invitee at invite time (R7)', () => {
  let capScenario: OrganizationWithSpaceModel;
  const capUsers: string[] = [];

  beforeAll(async () => {
    capScenario = await createOrganizationScenario('org-email-cap');
    const capRoleSetId = capScenario.organization.roleSetId;
    const roles = await usersInRoles(
      capRoleSetId,
      [RoleName.Admin],
      TestUser.GLOBAL_ADMIN
    );
    const admins =
      roles?.data?.lookup?.roleSet?.usersInRoles?.[0]?.users?.length ?? 0;
    for (let i = admins; i < 6; i++) {
      const user = await createUserDataOrFail({
        profileData: { displayName: `Cap Admin ${i}` },
      });
      capUsers.push(user.id);
      await assignRoleToUser(user.id, capRoleSetId, RoleName.Admin);
    }
  });

  afterAll(async () => {
    for (const id of capUsers) {
      await deleteUser(id).catch(() => undefined);
    }
    await TestScenarioFactory.cleanUpBaseScenario(capScenario);
  });

  test('US1-AS6: with six admins an email invitation offering Admin is still created and emailed, while the same offer to a registered user keeps the invite-time notice', async () => {
    const capRoleSetId = capScenario.organization.roleSetId;
    const email = addr('cap');
    let platformInvitationId = '';

    const mails = await mailsToAfter(
      async () => {
        const res = await inviteForEntryRoleOnRoleSet(
          capRoleSetId,
          [],
          [email],
          message,
          [RoleName.Admin],
          TestUser.ORGANIZATION_ADMIN
        );
        expect(res?.error).toBeUndefined();
        const result = getSingleInvitationResult(res);
        expect(result?.type).toEqual(
          RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
        );
        platformInvitationId = result?.platformInvitation?.id ?? '';
      },
      email,
      1
    );
    try {
      expect(mails, mailSummary(mails)).toHaveLength(1);
    } finally {
      await deleteExternalInvitation(platformInvitationId);
    }

    // The existing-user path is untouched: the same offer is refused up front.
    const registered = await createUserDataOrFail({
      profileData: { displayName: 'Cap Registered Invitee' },
    });
    capUsers.push(registered.id);
    const refused = await inviteForEntryRoleOnRoleSet(
      capRoleSetId,
      [registered.id],
      [],
      message,
      [RoleName.Admin],
      TestUser.ORGANIZATION_ADMIN
    );
    expect(getSingleInvitationResult(refused)?.type).toEqual(
      RoleSetInvitationResultType.ExtraRoleLimitReached
    );
  });
});
