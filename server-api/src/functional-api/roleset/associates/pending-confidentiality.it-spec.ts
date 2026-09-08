// The pending-applications/invitations confidentiality narrowing (READ →
// GRANT on both role-set types) and the authorization-reset runbook proof
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
  authorizationPolicyResetOnOrganization,
  getOrganizationAssociateEligibility,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import { SpacePrivacyMode } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let orgScenario: OrganizationWithSpaceModel;
let spaceScenario: OrganizationWithSpaceModel;
let orgResetScenario: OrganizationWithSpaceModel;

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
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(orgScenario);
  await TestScenarioFactory.cleanUpBaseScenario(spaceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(orgResetScenario);
});

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
    expect(asAdmin?.data?.lookup?.roleSet?.applications).toBeDefined();

    const asOwner = await getOrganizationRoleSetPending(
      orgScenario.organization.roleSetId,
      TestUser.GLOBAL_BETA_TESTER
    );
    expect(asOwner?.error).toBeUndefined();
    expect(asOwner?.data?.lookup?.roleSet?.invitations).toBeDefined();
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
    expect(asSpaceAdmin?.data?.lookup?.roleSet?.invitations).toBeDefined();
    expect(
      asSpaceAdmin?.data?.lookup?.roleSet?.platformInvitations
    ).toBeDefined();
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
