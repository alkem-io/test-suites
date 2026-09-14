// The pending-applications/invitations confidentiality narrowing (READ →
// UPDATE on both role-set types) and the authorization-reset runbook proof
// that restores APPLY visibility on a pre-existing organization afterwards.
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  queryHarnessDb,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  OrganizationAssociateEligibilityReason,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { getOrganizationRoleSetPending } from '../roleset.request.params';
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

  spaceScenario = await TestScenarioFactory.createBaseScenario({
    name: 'space-pending-confidentiality',
    space: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
    },
  });

  await updateSpaceSettings(spaceScenario.space.id, {
    privacy: { mode: SpacePrivacyMode.Public },
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
  await deleteInvitation(spaceInvitationId).catch(() => undefined);
  await deleteInvitation(orgInvitationId).catch(() => undefined);
  await deleteApplication(orgApplicationId).catch(() => undefined);
  await deleteUser(throwawayInviteeId).catch(() => undefined);
  await TestScenarioFactory.cleanUpBaseScenario(orgScenario);
  await TestScenarioFactory.cleanUpBaseScenario(spaceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(orgResetScenario);
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

  test('an account admin of the hosting organization (cascaded UPDATE, no GRANT) reads the Space pending lists — R46', async () => {
    // The base scenario's Space is created under its organization's account
    // and ORGANIZATION_ADMIN administers that organization but is NOT a Space
    // admin: it holds UPDATE on the Space role set through the account
    // cascade and never GRANT. Space Settings > Community is gated on UPDATE
    // and reads these lists, so a GRANT gate would blank it for this persona
    // (round-2 review finding 1).
    const asAccountAdmin = await getOrganizationRoleSetPending(
      spaceScenario.space.community.roleSetId,
      TestUser.ORGANIZATION_ADMIN
    );
    expect(asAccountAdmin?.error).toBeUndefined();
    expect(invitationIds(asAccountAdmin)).toContain(spaceInvitationId);
    expect(asAccountAdmin?.data?.lookup?.roleSet?.applications).toBeDefined();
  });
});

describe('Authorization reset runbook (US7-AS6, contract §11, R4)', () => {
  test('stripping the stored APPLY rule reports APPLY_NOT_GRANTED; the per-organization reset loop restores ELIGIBLE_TO_APPLY', async () => {
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
