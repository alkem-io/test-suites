// The pending-applications/invitations confidentiality narrowing (READ →
// GRANT on both role-set types) and the authorization-reset runbook proof
// that restores APPLY visibility on a pre-existing organization afterwards.
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  harnessPostgresConfigured,
  queryHarnessDb,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  OrganizationAssociateEligibilityReason,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  getOrganizationRoleSetPending,
  getRoleSetPendingApplications,
  getRoleSetPendingInvitations,
  getRoleSetPendingPlatformInvitations,
} from '../roleset.request.params';
import { assignRoleToUser } from '../roles-request.params';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '../invitations/invitation.request.params';
import { getSingleInvitationResult } from '../roleset.request.params';
import {
  applyToAssociateWithOrganization,
  deleteApplication,
} from '../application/application.request.params';
import {
  createUserDataOrFail,
  deleteUser,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  authorizationPolicyResetOnOrganization,
  getOrganizationAssociateEligibility,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import { SpacePrivacyMode } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let orgScenario: OrganizationWithSpaceModel;
let spaceScenario: OrganizationWithSpaceModel;
let orgResetScenario: OrganizationWithSpaceModel;

// Real pending rows, so the positive assertions below prove the lists are
// READ (with content), not merely "the field resolved": one application and
// one invitation on the organization, one invitation on the public Space.
let orgApplicationId = '';
let orgInvitationId = '';
let spaceInvitationId = '';
let throwawayInviteeId = '';

beforeAll(async () => {
  orgScenario = await TestScenarioFactory.createBaseScenarioOrganization({
    name: 'org-pending-confidentiality',
  });
  await assignRoleToUser(
    TestUserManager.users.nonSpaceMember.id,
    orgScenario.organization.roleSetId,
    RoleName.Admin
  );
  await assignRoleToUser(
    TestUserManager.users.betaTester.id,
    orgScenario.organization.roleSetId,
    RoleName.Owner
  );

  // The subspace exists for its admin: with the Space's
  // `allowSubspaceAdminsToInviteMembers` on, a subspace admin may invite to
  // the Space (and so may read its pending invitations) without being a
  // Space admin — the one persona that separates the invite gate from the
  // decide gate on the Space side.
  spaceScenario = await TestScenarioFactory.createBaseScenario({
    name: 'space-pending-confidentiality',
    space: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [
          TestUser.SPACE_ADMIN,
          TestUser.SPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
        ],
      },
      subspace: {
        collaboration: { addTutorialCallouts: false },
        community: {
          admins: [TestUser.SUBSPACE_ADMIN],
          members: [TestUser.SUBSPACE_ADMIN],
        },
      },
    },
  });

  await updateSpaceSettings(spaceScenario.space.id, {
    privacy: { mode: SpacePrivacyMode.Public },
    membership: { allowSubspaceAdminsToInviteMembers: true },
  });

  orgResetScenario = await TestScenarioFactory.createBaseScenarioOrganization(
    { name: 'org-authz-reset-loop' }
  );

  // Pending rows. QA_USER applies to the organization (it stays a plain
  // registered user, which is exactly the persona the refusal tests use);
  // a throwaway user is invited to the organization and to the Space.
  const applied = await applyToAssociateWithOrganization(
    orgScenario.organization.roleSetId,
    'confidential note',
    TestUser.QA_USER
  );
  orgApplicationId = applied?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
  expect(orgApplicationId).not.toEqual('');

  const throwaway = await createUserDataOrFail({
    profileData: { displayName: 'Pending Invitee' },
  });
  throwawayInviteeId = throwaway.id;
  const orgInvite = await inviteForEntryRoleOnRoleSet(
    orgScenario.organization.roleSetId,
    [throwawayInviteeId],
    [],
    'welcome',
    [],
    TestUser.NON_SPACE_MEMBER
  );
  orgInvitationId = getSingleInvitationResult(orgInvite)?.invitation?.id ?? '';
  expect(orgInvitationId).not.toEqual('');

  const spaceInvite = await inviteForEntryRoleOnRoleSet(
    spaceScenario.space.community.roleSetId,
    [throwawayInviteeId],
    [],
    'welcome',
    [],
    TestUser.SPACE_ADMIN
  );
  spaceInvitationId =
    getSingleInvitationResult(spaceInvite)?.invitation?.id ?? '';
  expect(spaceInvitationId).not.toEqual('');
});

afterAll(async () => {
  // Every wrapper here resolves a GraphQL refusal as `{ error }` and never
  // rejects, so `.catch()` would see nothing. Attempt every deletion, then the
  // scenario teardowns, and only then fail the hook with everything that was
  // left behind — a pending record or throwaway user that survives keeps
  // showing up in the next run's pending lists.
  const failures: string[] = [];
  const deletions: Array<[string, () => Promise<{ error?: unknown } | undefined>]> = [
    ['space invitation', () => deleteInvitation(spaceInvitationId)],
    ['organization invitation', () => deleteInvitation(orgInvitationId)],
    ['organization application', () => deleteApplication(orgApplicationId)],
    ['throwaway invitee', () => deleteUser(throwawayInviteeId)],
  ];
  for (const [label, run] of deletions) {
    try {
      const res = await run();
      if (res?.error) failures.push(`${label}: ${JSON.stringify(res.error)}`);
    } catch (error) {
      failures.push(`${label}: ${(error as Error)?.message ?? error}`);
    }
  }
  await TestScenarioFactory.cleanUpBaseScenario(orgScenario);
  await TestScenarioFactory.cleanUpBaseScenario(spaceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(orgResetScenario);
  if (failures.length > 0) {
    throw new Error(
      `pending-confidentiality fixtures were not fully torn down:\n${failures.join('\n')}`
    );
  }
});

type PendingResult = Awaited<ReturnType<typeof getOrganizationRoleSetPending>>;
const applicationIds = (res: PendingResult): string[] =>
  (res?.data?.lookup?.roleSet?.applications ?? []).map(a => a.id);
const invitationIds = (res: PendingResult): string[] =>
  (res?.data?.lookup?.roleSet?.invitations ?? []).map(i => i.id);

describe('Pending-list confidentiality — organizations (US7-AS2, contract §6)', () => {
  test('a plain registered user is refused; ORGANIZATION_ADMIN and ORGANIZATION_OWNER read the pending lists', async () => {
    const asPlainUser = await getOrganizationRoleSetPending(
      orgScenario.organization.roleSetId,
      TestUser.QA_USER
    );
    expect(asPlainUser?.error?.errors).toBeDefined();
    expect(asPlainUser?.data).toBeUndefined();

    const asAdmin = await getOrganizationRoleSetPending(
      orgScenario.organization.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );
    expect(asAdmin?.error).toBeUndefined();
    expect(applicationIds(asAdmin)).toContain(orgApplicationId);
    expect(invitationIds(asAdmin)).toContain(orgInvitationId);

    const asOwner = await getOrganizationRoleSetPending(
      orgScenario.organization.roleSetId,
      TestUser.GLOBAL_BETA_TESTER
    );
    expect(asOwner?.error).toBeUndefined();
    expect(applicationIds(asOwner)).toContain(orgApplicationId);
    expect(invitationIds(asOwner)).toContain(orgInvitationId);
  });

  test('the applicant themself (a plain registered user) is still refused — applying grants no read on the lists', async () => {
    const asApplicant = await getOrganizationRoleSetPending(
      orgScenario.organization.roleSetId,
      TestUser.QA_USER
    );
    expect(asApplicant?.error?.errors).toBeDefined();
    expect(asApplicant?.data).toBeUndefined();
  });

  test('GLOBAL_SUPPORT reads the invitation lists (it may invite) but is refused the applications (it does not decide them)', async () => {
    // The two gates differ on purpose: whoever may create an invitation may
    // see the pending ones (the invite dialog dedupes on them), while the
    // applications carry the applicant's answers and are readable only by
    // those who decide them. Platform support holds the first standing on
    // organizations, not the second. Read one field per query — the fields
    // are non-null, so a combined read would null all three on the refusal.
    const roleSetId = orgScenario.organization.roleSetId;

    const invitations = await getRoleSetPendingInvitations(
      roleSetId,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );
    expect(invitations?.error).toBeUndefined();
    expect(
      (invitations?.data?.lookup?.roleSet?.invitations ?? []).map(i => i.id)
    ).toContain(orgInvitationId);

    const platformInvitations = await getRoleSetPendingPlatformInvitations(
      roleSetId,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );
    expect(platformInvitations?.error).toBeUndefined();
    expect(
      platformInvitations?.data?.lookup?.roleSet?.platformInvitations
    ).toBeDefined();

    const applications = await getRoleSetPendingApplications(
      roleSetId,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );
    expect(applications?.error?.errors).toBeDefined();
    expect(applications?.data).toBeUndefined();
  });
});

describe('Pending-list confidentiality — a PUBLIC Space (US7-AS3, deliberate R3 change)', () => {
  test('a plain member is refused; a Space admin reads the pending lists', async () => {
    const roleSetId = spaceScenario.space.community.roleSetId;

    const asPlainMember = await getOrganizationRoleSetPending(
      roleSetId,
      TestUser.SPACE_MEMBER
    );
    expect(asPlainMember?.error?.errors).toBeDefined();
    expect(asPlainMember?.data).toBeUndefined();

    const asSpaceAdmin = await getOrganizationRoleSetPending(
      roleSetId,
      TestUser.SPACE_ADMIN
    );
    expect(asSpaceAdmin?.error).toBeUndefined();
    expect(asSpaceAdmin?.data?.lookup?.roleSet?.applications).toBeDefined();
    expect(invitationIds(asSpaceAdmin)).toContain(spaceInvitationId);
    expect(
      asSpaceAdmin?.data?.lookup?.roleSet?.platformInvitations
    ).toBeDefined();
  });

  test('a plain member is refused each of the three lists on its own', async () => {
    // The combined read above proves the refusal as a whole; these prove
    // that no single list is quietly open to a member on a public Space.
    const roleSetId = spaceScenario.space.community.roleSetId;
    const reads = await Promise.all([
      getRoleSetPendingApplications(roleSetId, TestUser.SPACE_MEMBER),
      getRoleSetPendingInvitations(roleSetId, TestUser.SPACE_MEMBER),
      getRoleSetPendingPlatformInvitations(roleSetId, TestUser.SPACE_MEMBER),
    ]);
    for (const read of reads) {
      expect(read?.error?.errors).toBeDefined();
      expect(read?.data).toBeUndefined();
    }
  });

  test('a Space admin reads each of the three lists on its own', async () => {
    const roleSetId = spaceScenario.space.community.roleSetId;

    const applications = await getRoleSetPendingApplications(
      roleSetId,
      TestUser.SPACE_ADMIN
    );
    expect(applications?.error).toBeUndefined();
    expect(applications?.data?.lookup?.roleSet?.applications).toBeDefined();

    const invitations = await getRoleSetPendingInvitations(
      roleSetId,
      TestUser.SPACE_ADMIN
    );
    expect(invitations?.error).toBeUndefined();
    expect(
      (invitations?.data?.lookup?.roleSet?.invitations ?? []).map(i => i.id)
    ).toContain(spaceInvitationId);

    const platformInvitations = await getRoleSetPendingPlatformInvitations(
      roleSetId,
      TestUser.SPACE_ADMIN
    );
    expect(platformInvitations?.error).toBeUndefined();
    expect(
      platformInvitations?.data?.lookup?.roleSet?.platformInvitations
    ).toBeDefined();
  });

  test('with allowSubspaceAdminsToInviteMembers on, a subspace admin reads the Space invitations but is refused its applications', async () => {
    // The setting hands subspace admins the standing to invite to the Space,
    // and with it the pending-invitation lists; it hands them nothing about
    // deciding applications, so that list stays closed to them.
    const roleSetId = spaceScenario.space.community.roleSetId;

    const invitations = await getRoleSetPendingInvitations(
      roleSetId,
      TestUser.SUBSPACE_ADMIN
    );
    expect(invitations?.error).toBeUndefined();
    expect(
      (invitations?.data?.lookup?.roleSet?.invitations ?? []).map(i => i.id)
    ).toContain(spaceInvitationId);

    const platformInvitations = await getRoleSetPendingPlatformInvitations(
      roleSetId,
      TestUser.SUBSPACE_ADMIN
    );
    expect(platformInvitations?.error).toBeUndefined();
    expect(
      platformInvitations?.data?.lookup?.roleSet?.platformInvitations
    ).toBeDefined();

    const applications = await getRoleSetPendingApplications(
      roleSetId,
      TestUser.SUBSPACE_ADMIN
    );
    expect(applications?.error?.errors).toBeDefined();
    expect(applications?.data).toBeUndefined();
  });

  test('an account admin of the hosting organization who is not a Space admin is refused — R46 (live-verified standing)', async () => {
    // The base scenario's Space is created under its organization's account
    // and ORGANIZATION_ADMIN administers that organization (and so holds the
    // implicit ACCOUNT_ADMIN credential) but is NOT a Space admin. The account
    // CRUD cascade never reaches an L0 Space's policy — the Space builds its
    // own, giving account admins READ_ABOUT/READ_LICENSE only — so this
    // persona holds neither UPDATE nor GRANT on the Space role set and the
    // narrowing refuses it exactly like any other non-admin. Recorded so the
    // round-2 review claim ("account admins hold cascaded UPDATE without
    // GRANT") cannot be re-asserted without a failing test.
    const asAccountAdmin = await getOrganizationRoleSetPending(
      spaceScenario.space.community.roleSetId,
      TestUser.ORGANIZATION_ADMIN
    );
    expect(asAccountAdmin?.error?.errors).toBeDefined();
    expect(asAccountAdmin?.data).toBeUndefined();
  });
});

describe('Authorization reset runbook (US7-AS6, contract §11, R4)', () => {
  // Loopback Postgres only: the stored rule is stripped by direct SQL, which
  // the nightly run (remote cluster, no POSTGRES_* set) cannot reach.
  test.skipIf(!harnessPostgresConfigured())('stripping the stored APPLY rule reports APPLY_NOT_GRANTED; the per-organization reset loop restores ELIGIBLE_TO_APPLY', async () => {
    const before = await getOrganizationAssociateEligibility(
      orgResetScenario.organization.id,
      TestUser.QA_USER
    );
    expect(before?.data?.organization.myAssociateEligibility.reason).toEqual(
      OrganizationAssociateEligibilityReason.EligibleToApply
    );

    await queryHarnessDb(
      `UPDATE authorization_policy
         SET "credentialRules" = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM jsonb_array_elements("credentialRules") elem
           WHERE elem->>'name' != 'credentialRuleTypes-organizationRoleSetApply'
         )
       WHERE id = (SELECT "authorizationId" FROM role_set WHERE id = $1)`,
      [orgResetScenario.organization.roleSetId]
    );

    const stripped = await getOrganizationAssociateEligibility(
      orgResetScenario.organization.id,
      TestUser.QA_USER
    );
    expect(
      stripped?.data?.organization.myAssociateEligibility.reason
    ).toEqual(OrganizationAssociateEligibilityReason.ApplyNotGranted);
    expect(
      stripped?.data?.organization.myAssociateEligibility.canApply
    ).toEqual(false);

    const reset = await authorizationPolicyResetOnOrganization(
      orgResetScenario.organization.id
    );
    expect(reset?.error).toBeUndefined();

    const after = await getOrganizationAssociateEligibility(
      orgResetScenario.organization.id,
      TestUser.QA_USER
    );
    expect(after?.data?.organization.myAssociateEligibility.reason).toEqual(
      OrganizationAssociateEligibilityReason.EligibleToApply
    );
  });
});
