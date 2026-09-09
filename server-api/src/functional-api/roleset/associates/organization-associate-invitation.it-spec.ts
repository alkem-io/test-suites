/* eslint-disable @typescript-eslint/no-explicit-any */
// An organization admin or owner invites existing Alkemio users to
// associate (Associate | +Admin | +Owner), the invitee responds, and the
// shared contracts this feature depends on: no inviter-role ceiling on who
// may offer which role; an invite-time cap plus a typed accept-time
// withheld-role notice when the cap is already full; and email invitees are
// rejected outright for organization role sets.
//
// Personas (assignRoleToUser on the organization's own role set, never a
// Space one): `organizationAdmin` = the org's ASSOCIATE + ADMIN (factory
// default) plus an explicit OWNER grant, so it also stands in for "OWNER who
// is not exclusively an owner"; `spaceMember` = ADMIN-not-associate;
// `spaceAdmin` = ADMIN + associate; `globalBetaTester` = associate-only (no
// manager credential, for the US1-AS8 refusal). Everyone else invited in a
// single test is a throwaway user created with `createUserDataOrFail` — it
// never needs to authenticate, only to be a real, distinct actor ID — except
// where a scenario needs the invitee to ACT (accept/decline/read their own
// pending list), which uses a spare globally-seeded `TestUser` persona
// instead, since only those can authenticate through `graphqlErrorWrapper`.
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '../invitations/invitation.request.params';
import {
  getSingleInvitationResult,
  usersInRoles,
} from '../roleset.request.params';
import { eventOnRoleSetInvitation } from '../roleset-events.request.params';
import { assignRoleToUser, removeRoleFromUser } from '../roles-request.params';
import {
  createUserDataOrFail,
  deleteUser,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  applyToAssociateWithOrganization,
  deleteApplication,
  meOrganizationPending,
} from '../application/application.request.params';
import { getOrganizationAssociateEligibility } from '@functional-api/contributor-management/organization/organization.request.params';

const message = 'Come associate with our organization';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'org-associate-invite',
};

let roleSetId = '';

/** Organization role caps, from `organization.role.definitions.ts`. */
const ADMIN_CAP = 6;
const OWNER_CAP = 3;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenarioOrganization(
    scenarioConfig
  );
  roleSetId = baseScenario.organization.roleSetId;

  // organizationAdmin already holds ASSOCIATE + ADMIN from the factory;
  // add OWNER so it also proves "an ADMIN who is also OWNER may invite".
  await assignRoleToUser(
    TestUserManager.users.organizationAdmin.id,
    roleSetId,
    RoleName.Owner
  );
  // ADMIN-not-associate.
  await assignRoleToUser(
    TestUserManager.users.spaceMember.id,
    roleSetId,
    RoleName.Admin
  );
  // ADMIN + associate.
  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    roleSetId,
    RoleName.Associate
  );
  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    roleSetId,
    RoleName.Admin
  );
  // Associate-only (no manager credential) — US1-AS8.
  await assignRoleToUser(
    TestUserManager.users.betaTester.id,
    roleSetId,
    RoleName.Associate
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** A throwaway user that never needs to authenticate — a real, distinct
 * invitee ID for the admin-side outcome assertions. */
const newInvitee = async () =>
  createUserDataOrFail({ profileData: { displayName: 'Org Invitee' } });

describe('Organization associate invitations (US1)', () => {
  test('US1-AS2: ADMIN invites [ASSOCIATE] → INVITED_TO_ROLE_SET, listed under the organization pending section', async () => {
    const invitee = await newInvitee();
    try {
      const res = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [invitee.id],
        [],
        message,
        [],
        TestUser.SPACE_ADMIN // ADMIN + associate
      );
      const result = getSingleInvitationResult(res);
      expect(result?.type).toEqual(
        RoleSetInvitationResultType.InvitedToRoleSet
      );
      expect(result?.invitation?.id.length).toEqual(36);
      expect(result?.invitation?.extraRoles).toEqual([]);

      await deleteInvitation(result!.invitation!.id);
    } finally {
      await deleteUser(invitee.id);
    }
  });

  test('US1-AS5: both an OWNER-not-exclusively-admin and an ADMIN-not-associate may offer any extra role (R1 — no inviter ceiling)', async () => {
    const inviteeForOwner = await newInvitee();
    const inviteeForAdmin = await newInvitee();
    try {
      const ownerInvites = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [inviteeForOwner.id],
        [],
        message,
        [RoleName.Admin],
        TestUser.ORGANIZATION_ADMIN // holds OWNER (assigned above) + ADMIN
      );
      const ownerResult = getSingleInvitationResult(ownerInvites);
      expect(ownerResult?.type).toEqual(
        RoleSetInvitationResultType.InvitedToRoleSet
      );
      expect(ownerResult?.invitation?.extraRoles).toEqual([RoleName.Admin]);

      const adminInvites = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [inviteeForAdmin.id],
        [],
        message,
        [RoleName.Owner],
        TestUser.SPACE_MEMBER // ADMIN-not-associate, no OWNER of its own
      );
      const adminResult = getSingleInvitationResult(adminInvites);
      expect(adminResult?.type).toEqual(
        RoleSetInvitationResultType.InvitedToRoleSet
      );
      expect(adminResult?.invitation?.extraRoles).toEqual([RoleName.Owner]);

      await deleteInvitation(ownerResult!.invitation!.id);
      await deleteInvitation(adminResult!.invitation!.id);
    } finally {
      await deleteUser(inviteeForOwner.id);
      await deleteUser(inviteeForAdmin.id);
    }
  });

  test('US1-AS6: invitedUserEmails on an organization role set is rejected — existing Alkemio users only', async () => {
    const res = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [],
      ['not-yet-a-user@example.com'],
      message,
      [],
      TestUser.SPACE_ADMIN
    );
    expect(res?.error?.errors).toBeDefined();
    expect(res?.data?.inviteForEntryRoleOnRoleSet).toBeUndefined();
  });

  test('US1-AS4: already an associate / already invited / has an open application → typed outcomes, no second row', async () => {
    const alreadyAssociate = await newInvitee();
    const alreadyInvited = await newInvitee();
    try {
      await assignRoleToUser(
        alreadyAssociate.id,
        roleSetId,
        RoleName.Associate
      );
      const dupMemberRes = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [alreadyAssociate.id],
        [],
        message,
        [],
        TestUser.SPACE_ADMIN
      );
      expect(getSingleInvitationResult(dupMemberRes)?.type).toEqual(
        RoleSetInvitationResultType.AlreadyMemberOfRoleSet
      );
      expect(getSingleInvitationResult(dupMemberRes)?.invitation).toBeFalsy();

      const firstInvite = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [alreadyInvited.id],
        [],
        message,
        [],
        TestUser.SPACE_ADMIN
      );
      const firstResult = getSingleInvitationResult(firstInvite);
      expect(firstResult?.type).toEqual(
        RoleSetInvitationResultType.InvitedToRoleSet
      );

      const dupInviteRes = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [alreadyInvited.id],
        [],
        message,
        [],
        TestUser.SPACE_ADMIN
      );
      expect(getSingleInvitationResult(dupInviteRes)?.type).toEqual(
        RoleSetInvitationResultType.AlreadyInvitedToRoleSet
      );
      // The result carries the EXISTING invitation rather than nothing — shipped
      // behaviour on both role-set types (server#5088, 061 R36), and the point of
      // "no second row" is that the id is the first invitation's, not that the
      // field is empty.
      expect(getSingleInvitationResult(dupInviteRes)?.invitation?.id).toEqual(
        firstResult!.invitation!.id
      );

      await deleteInvitation(firstResult!.invitation!.id);

      // Open application — the only case that needs an actor who can
      // authenticate to submit their own application.
      const appRes = await applyToAssociateWithOrganization(
        roleSetId,
        undefined,
        TestUser.NON_SPACE_MEMBER
      );
      const applicationId = appRes?.data?.applyForEntryRoleOnRoleSet?.id;
      expect(applicationId).toBeDefined();
      try {
        const dupAppRes = await inviteForEntryRoleOnRoleSet(
          roleSetId,
          [TestUserManager.users.nonSpaceMember.id],
          [],
          message,
          [],
          TestUser.SPACE_ADMIN
        );
        expect(getSingleInvitationResult(dupAppRes)?.type).toEqual(
          RoleSetInvitationResultType.AlreadyHasOpenApplication
        );
        expect(
          getSingleInvitationResult(dupAppRes)?.invitation
        ).toBeFalsy();
      } finally {
        await deleteApplication(applicationId!);
      }
    } finally {
      await deleteUser(alreadyAssociate.id);
      await deleteUser(alreadyInvited.id);
    }
  });

  test('US1-AS3: the extra-role caps (Admin max 6, Owner max 3) are enforced at invite time counting granted plus pending, and revoking a pending offer frees the next one', async () => {
    // Read the baseline rather than assuming it. The scenario's granted ADMIN
    // and OWNER holders are set up elsewhere, so a hardcoded count silently
    // turns a cap assertion into "the cap was already reached before we
    // started" the moment that setup changes.
    const baselineRoles = await usersInRoles(
      roleSetId,
      [RoleName.Admin, RoleName.Owner],
      TestUser.GLOBAL_ADMIN
    );
    const countFor = (role: RoleName): number =>
      (
        baselineRoles?.data?.lookup?.roleSet?.usersInRoles?.find(
          (r: { role: string }) => r.role === role
        )?.users ?? []
      ).length;
    const baselineAdmins = countFor(RoleName.Admin);
    const baselineOwners = countFor(RoleName.Owner);
    // Cap headroom: fill to one short of the cap, so the next offer is the last
    // that fits and the one after it is refused.
    const adminsToGrant = Math.max(0, ADMIN_CAP - 1 - baselineAdmins);
    const ownersToGrant = Math.max(0, OWNER_CAP - 1 - baselineOwners);

    const grantedAdmins = [];
    for (let i = 0; i < adminsToGrant; i++) grantedAdmins.push(await newInvitee());
    const grantedOwners = [];
    for (let i = 0; i < ownersToGrant; i++) grantedOwners.push(await newInvitee());
    const pendingAdminLast = await newInvitee();
    const refusedAdmin = await newInvitee();
    const freedAdmin = await newInvitee();
    const pendingOwnerLast = await newInvitee();
    const refusedOwner = await newInvitee();
    const created = [
      ...grantedAdmins,
      ...grantedOwners,
      pendingAdminLast,
      refusedAdmin,
      freedAdmin,
      pendingOwnerLast,
      refusedOwner,
    ];
    const invitationIds: string[] = [];
    const offerAdmin = (userId: string, as = TestUser.SPACE_ADMIN) =>
      inviteForEntryRoleOnRoleSet(roleSetId, [userId], [], message, [RoleName.Admin], as);
    const offerOwner = (userId: string, as = TestUser.SPACE_MEMBER) =>
      inviteForEntryRoleOnRoleSet(roleSetId, [userId], [], message, [RoleName.Owner], as);
    try {
      for (const u of grantedAdmins) await assignRoleToUser(u.id, roleSetId, RoleName.Admin);

      // One short of the cap: this offer is the last that fits.
      const lastAdmin = getSingleInvitationResult(await offerAdmin(pendingAdminLast.id));
      expect(lastAdmin?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
      invitationIds.push(lastAdmin!.invitation!.id);

      // Granted + pending now reach the cap — the next offer is refused and
      // creates nothing. This is the assertion that matters: pending offers
      // count toward the cap, not just granted roles.
      const overAdmin = getSingleInvitationResult(await offerAdmin(refusedAdmin.id));
      expect(overAdmin?.type).toEqual(RoleSetInvitationResultType.ExtraRoleLimitReached);
      expect(overAdmin?.invitation).toBeFalsy();

      // Revoking the pending offer frees the slot again.
      await deleteInvitation(lastAdmin!.invitation!.id);
      invitationIds.splice(invitationIds.indexOf(lastAdmin!.invitation!.id), 1);
      const freed = getSingleInvitationResult(await offerAdmin(freedAdmin.id));
      expect(freed?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
      invitationIds.push(freed!.invitation!.id);

      // Same shape for OWNER, whose cap is lower.
      for (const u of grantedOwners) await assignRoleToUser(u.id, roleSetId, RoleName.Owner);
      const lastOwner = getSingleInvitationResult(await offerOwner(pendingOwnerLast.id));
      expect(lastOwner?.type).toEqual(RoleSetInvitationResultType.InvitedToRoleSet);
      invitationIds.push(lastOwner!.invitation!.id);

      const overOwner = getSingleInvitationResult(await offerOwner(refusedOwner.id));
      expect(overOwner?.type).toEqual(RoleSetInvitationResultType.ExtraRoleLimitReached);
      expect(overOwner?.invitation).toBeFalsy();
    } finally {
      for (const id of invitationIds) await deleteInvitation(id).catch(() => undefined);
      for (const u of created) await deleteUser(u.id).catch(() => undefined);
    }
  });

  test('US1-AS7: revoking a pending invitation removes it from the invitee\'s own pending list', async () => {
    const res = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [TestUserManager.users.subspaceMember.id],
      [],
      message,
      [],
      TestUser.SPACE_ADMIN
    );
    const result = getSingleInvitationResult(res);
    const invitationId = result!.invitation!.id;

    const beforeRevoke = await meOrganizationPending(TestUser.SUBSPACE_MEMBER);
    expect(
      beforeRevoke?.data?.me.organizationInvitations.map((i: any) => i.id)
    ).toEqual(expect.arrayContaining([invitationId]));

    await deleteInvitation(invitationId);

    const afterRevoke = await meOrganizationPending(TestUser.SUBSPACE_MEMBER);
    expect(
      afterRevoke?.data?.me.organizationInvitations.map((i: any) => i.id)
    ).not.toEqual(expect.arrayContaining([invitationId]));
  });

  test('US1-AS8: a plain associate (no manager credential) cannot invite through the API', async () => {
    const invitee = await newInvitee();
    try {
      const res = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [invitee.id],
        [],
        message,
        [],
        TestUser.GLOBAL_BETA_TESTER
      );
      expect(res?.error?.errors).toBeDefined();
      expect(res?.data?.inviteForEntryRoleOnRoleSet).toBeUndefined();
    } finally {
      await deleteUser(invitee.id);
    }
  });

  test('every organization-invitation mutation above returns 200 (no Space lookup reachable on an ORGANIZATION role set — contract §7)', async () => {
    const invitee = await newInvitee();
    try {
      const res = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [invitee.id],
        [],
        message,
        [],
        TestUser.SPACE_ADMIN
      );
      expect(res?.error).toBeUndefined();
      const invitationId = getSingleInvitationResult(res)!.invitation!.id;
      await deleteInvitation(invitationId);
    } finally {
      await deleteUser(invitee.id);
    }
  });
});

describe('Organization associate invitations — the invitee responds (US2)', () => {
  test('US2-AS6: accepting [ADMIN] grants ASSOCIATE + ADMIN and the account-admin standing (R1, documented consequence)', async () => {
    const invite = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [TestUserManager.users.subspaceAdmin.id],
      [],
      message,
      [RoleName.Admin],
      TestUser.SPACE_ADMIN
    );
    const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

    const accepted = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.SUBSPACE_ADMIN
    );
    expect((accepted?.data as any)?.eventOnInvitation?.extraRolesWithheld).toEqual(
      []
    );

    const roles = await usersInRoles(
      roleSetId,
      [RoleName.Associate, RoleName.Admin],
      TestUser.GLOBAL_ADMIN
    );
    const byRole = new Map(
      (roles?.data?.lookup?.roleSet?.usersInRoles ?? []).map((r: any) => [
        r.role,
        r.users.map((u: any) => u.id),
      ])
    );
    expect(byRole.get(RoleName.Associate)).toEqual(
      expect.arrayContaining([TestUserManager.users.subspaceAdmin.id])
    );
    expect(byRole.get(RoleName.Admin)).toEqual(
      expect.arrayContaining([TestUserManager.users.subspaceAdmin.id])
    );

    // Account-admin standing: `myRolesImplicit` for the accepting persona
    // includes ACCOUNT_ADMIN on this organization's role set — a documented,
    // accepted consequence of granting ADMIN/OWNER through an invitation,
    // not mitigated by any inviter-role ceiling.
    const eligibility = await getOrganizationAssociateEligibility(
      baseScenario.organization.id,
      TestUser.SUBSPACE_ADMIN
    );
    expect(eligibility?.data?.organization.roleSet.myRolesImplicit).toEqual(
      expect.arrayContaining(['ACCOUNT_ADMIN'])
    );

    await removeRoleFromUser(
      TestUserManager.users.subspaceAdmin.id,
      roleSetId,
      RoleName.Admin
    ).catch(() => undefined);
    await removeRoleFromUser(
      TestUserManager.users.subspaceAdmin.id,
      roleSetId,
      RoleName.Associate
    ).catch(() => undefined);
  });

  test('US2-AS5: accepting [OWNER] after the cap is reached grants ASSOCIATE only and reports the withheld role', async () => {
    // The cap must be reached AFTER the invitation exists, not before: 062 also
    // validates the cap at invite time, so filling it first refuses the
    // invitation and the accept-time path can never be reached. Invite while
    // there is headroom, then consume the remaining slots, then accept.
    const fillers = [];
    try {
      const invite = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [TestUserManager.users.subsubspaceMember.id],
        [],
        message,
        [RoleName.Owner],
        TestUser.SPACE_ADMIN
      );
      const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

      // Now fill every remaining OWNER slot with granted holders, so the role
      // can no longer be granted when the invitee accepts.
      const ownersNow = await usersInRoles(
        roleSetId,
        [RoleName.Owner],
        TestUser.GLOBAL_ADMIN
      );
      const grantedOwners = (
        ownersNow?.data?.lookup?.roleSet?.usersInRoles?.[0]?.users ?? []
      ).length;
      for (let i = grantedOwners; i < OWNER_CAP; i++) {
        const filler = await newInvitee();
        fillers.push(filler);
        await assignRoleToUser(filler.id, roleSetId, RoleName.Owner);
      }

      const accepted = await eventOnRoleSetInvitation(
        invitationId,
        'ACCEPT',
        TestUser.SUBSUBSPACE_MEMBER
      );
      expect(
        (accepted?.data as any)?.eventOnInvitation?.extraRolesWithheld
      ).toEqual([RoleName.Owner]);

      const roles = await usersInRoles(
        roleSetId,
        [RoleName.Associate, RoleName.Owner],
        TestUser.GLOBAL_ADMIN
      );
      const byRole = new Map(
        (roles?.data?.lookup?.roleSet?.usersInRoles ?? []).map((r: any) => [
          r.role,
          r.users.map((u: any) => u.id),
        ])
      );
      expect(byRole.get(RoleName.Associate)).toEqual(
        expect.arrayContaining([TestUserManager.users.subsubspaceMember.id])
      );
      expect(byRole.get(RoleName.Owner)).not.toEqual(
        expect.arrayContaining([TestUserManager.users.subsubspaceMember.id])
      );
    } finally {
      await removeRoleFromUser(
        TestUserManager.users.subsubspaceMember.id,
        roleSetId,
        RoleName.Associate
      ).catch(() => undefined);
      for (const filler of fillers) {
        await deleteUser(filler.id).catch(() => undefined);
      }
    }
  });

  test('US2-AS3/AS7: REJECT leaves the invitee not-an-associate and a fresh invitation can be created afterwards', async () => {
    const invite = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [TestUserManager.users.subsubspaceAdmin.id],
      [],
      message,
      [],
      TestUser.SPACE_ADMIN
    );
    const firstId = getSingleInvitationResult(invite)!.invitation!.id;

    const rejected = await eventOnRoleSetInvitation(
      firstId,
      'REJECT',
      TestUser.SUBSUBSPACE_ADMIN
    );
    expect(rejected?.data?.eventOnInvitation?.state).toEqual('rejected');

    const roles = await usersInRoles(
      roleSetId,
      [RoleName.Associate],
      TestUser.GLOBAL_ADMIN
    );
    const associateIds = (
      roles?.data?.lookup?.roleSet?.usersInRoles?.[0]?.users ?? []
    ).map((u: any) => u.id);
    expect(associateIds).not.toEqual(
      expect.arrayContaining([TestUserManager.users.subsubspaceAdmin.id])
    );

    const reinvite = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [TestUserManager.users.subsubspaceAdmin.id],
      [],
      message,
      [],
      TestUser.SPACE_ADMIN
    );
    const secondResult = getSingleInvitationResult(reinvite);
    expect(secondResult?.type).toEqual(
      RoleSetInvitationResultType.InvitedToRoleSet
    );
    await deleteInvitation(secondResult!.invitation!.id);
  });

  test('an associate-only persona cannot ACCEPT an invitation on someone else\'s behalf', async () => {
    const invite = await inviteForEntryRoleOnRoleSet(
      roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      message,
      [],
      TestUser.SPACE_ADMIN
    );
    const invitationId = getSingleInvitationResult(invite)!.invitation!.id;
    try {
      const res = await eventOnRoleSetInvitation(
        invitationId,
        'ACCEPT',
        TestUser.GLOBAL_BETA_TESTER
      );
      expect(res?.error?.errors).toBeDefined();
    } finally {
      await deleteInvitation(invitationId).catch(() => undefined);
    }
  });
});
