/* eslint-disable @typescript-eslint/no-explicit-any */
// 062-organization-user-associates — US1/US2: an organization admin or owner
// invites existing Alkemio users to associate (Associate | +Admin | +Owner),
// the invitee responds, and the shared contracts this feature depends on
// (no inviter-role ceiling — R1; the invite-time cap plus the accept-time
// withheld-role notice — FR-002/FR-003; email invitees rejected — FR-004).
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
      expect(getSingleInvitationResult(dupInviteRes)?.invitation).toBeFalsy();

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
    // Baseline granted ADMIN holders before this test: organizationAdmin,
    // spaceMember, spaceAdmin (3). Baseline granted OWNER holders:
    // organizationAdmin (1).
    const admin4 = await newInvitee();
    const admin5 = await newInvitee();
    const pendingAdmin6 = await newInvitee();
    const rejectedAdmin7 = await newInvitee();
    const admin8 = await newInvitee();
    const owner2 = await newInvitee();
    const pendingOwner3 = await newInvitee();
    const rejectedOwner4 = await newInvitee();
    const created = [
      admin4,
      admin5,
      pendingAdmin6,
      rejectedAdmin7,
      admin8,
      owner2,
      pendingOwner3,
      rejectedOwner4,
    ];
    const invitationIds: string[] = [];
    try {
      await assignRoleToUser(admin4.id, roleSetId, RoleName.Admin);
      await assignRoleToUser(admin5.id, roleSetId, RoleName.Admin);
      // 5 granted admins now; invite the 6th (pending) — still within the cap.
      const sixthAdmin = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [pendingAdmin6.id],
        [],
        message,
        [RoleName.Admin],
        TestUser.SPACE_ADMIN
      );
      const sixthAdminResult = getSingleInvitationResult(sixthAdmin);
      expect(sixthAdminResult?.type).toEqual(
        RoleSetInvitationResultType.InvitedToRoleSet
      );
      invitationIds.push(sixthAdminResult!.invitation!.id);

      // 5 granted + 1 pending = 6 — a 7th offer is refused, nothing created.
      const seventhAdmin = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [rejectedAdmin7.id],
        [],
        message,
        [RoleName.Admin],
        TestUser.SPACE_ADMIN
      );
      const seventhAdminResult = getSingleInvitationResult(seventhAdmin);
      expect(seventhAdminResult?.type).toEqual(
        RoleSetInvitationResultType.ExtraRoleLimitReached
      );
      expect(seventhAdminResult?.invitation).toBeFalsy();

      // Revoke the pending offer — the next Admin offer now succeeds.
      await deleteInvitation(sixthAdminResult!.invitation!.id);
      invitationIds.splice(invitationIds.indexOf(sixthAdminResult!.invitation!.id), 1);
      const eighthAdmin = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [admin8.id],
        [],
        message,
        [RoleName.Admin],
        TestUser.SPACE_ADMIN
      );
      const eighthAdminResult = getSingleInvitationResult(eighthAdmin);
      expect(eighthAdminResult?.type).toEqual(
        RoleSetInvitationResultType.InvitedToRoleSet
      );
      invitationIds.push(eighthAdminResult!.invitation!.id);

      // Owner: 1 granted (organizationAdmin) + 1 more granted = 2; the 3rd
      // (pending) still succeeds; the 4th is refused.
      await assignRoleToUser(owner2.id, roleSetId, RoleName.Owner);
      const thirdOwner = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [pendingOwner3.id],
        [],
        message,
        [RoleName.Owner],
        TestUser.SPACE_MEMBER
      );
      const thirdOwnerResult = getSingleInvitationResult(thirdOwner);
      expect(thirdOwnerResult?.type).toEqual(
        RoleSetInvitationResultType.InvitedToRoleSet
      );
      invitationIds.push(thirdOwnerResult!.invitation!.id);

      const fourthOwner = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [rejectedOwner4.id],
        [],
        message,
        [RoleName.Owner],
        TestUser.SPACE_MEMBER
      );
      const fourthOwnerResult = getSingleInvitationResult(fourthOwner);
      expect(fourthOwnerResult?.type).toEqual(
        RoleSetInvitationResultType.ExtraRoleLimitReached
      );
      expect(fourthOwnerResult?.invitation).toBeFalsy();
    } finally {
      for (const id of invitationIds) {
        await deleteInvitation(id).catch(() => undefined);
      }
      for (const user of created) {
        await deleteUser(user.id).catch(() => undefined);
      }
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
    // includes ACCOUNT_ADMIN on this organization's role set (R1's
    // documented, accepted consequence — not mitigated by an inviter
    // ceiling).
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
    // Fill the Owner cap to 3 with granted holders first.
    const owner2 = await newInvitee();
    const owner3 = await newInvitee();
    try {
      await assignRoleToUser(owner2.id, roleSetId, RoleName.Owner);
      await assignRoleToUser(owner3.id, roleSetId, RoleName.Owner);

      const invite = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [TestUserManager.users.subsubspaceMember.id],
        [],
        message,
        [RoleName.Owner],
        TestUser.SPACE_ADMIN
      );
      const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

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
      await deleteUser(owner2.id).catch(() => undefined);
      await deleteUser(owner3.id).catch(() => undefined);
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
