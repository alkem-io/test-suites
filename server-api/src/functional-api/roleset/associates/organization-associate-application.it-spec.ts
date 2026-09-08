// A registered user applies to associate with an organization, the
// organization decides, and the shared `allowApplications` switch /
// entry-role normalization contracts this feature depends on.
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  queryHarnessDb,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipStatus,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  applyToAssociateWithOrganization,
  deleteApplication,
} from '../application/application.request.params';
import { eventOnRoleSetApplication } from '../roleset-events.request.params';
import { getErrorCode, getRoleSetApplicationForm } from '../roleset.request.params';
import { assignRoleToUser, removeRoleFromUser } from '../roles-request.params';
import {
  getOrganizationAssociateEligibility,
  updateOrganizationSettings,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { inviteForEntryRoleOnRoleSet } from '../invitations/invitation.request.params';
import { getSingleInvitationResult } from '../roleset.request.params';
import { RoleSetInvitationResultType } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const note = 'note';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'org-associate-apply',
};
let roleSetId = '';

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenarioOrganization(
    scenarioConfig
  );
  roleSetId = baseScenario.organization.roleSetId;

  // An ADMIN able to approve/reject, distinct from the applicant personas.
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
  // Associate-only, for the "cannot APPROVE" refusal.
  await assignRoleToUser(
    TestUserManager.users.betaTester.id,
    roleSetId,
    RoleName.Associate
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Organization associate applications (US3)', () => {
  test('US3-AS1: a registered user applies with a note — application created', async () => {
    const res = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.QA_USER
    );
    expect(res?.error).toBeUndefined();
    const applicationId = res?.data?.applyForEntryRoleOnRoleSet?.id;
    expect(applicationId?.length).toEqual(36);

    // Applying again while the first is still pending — typed refusal, no
    // second row.
    const dup = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.QA_USER
    );
    expect(getErrorCode(dup)).toEqual('ROLESET_OPEN_APPLICATION_EXISTS');

    await deleteApplication(applicationId!);
  });

  test('contract §4 (discriminating): an existing ORGANIZATION_ASSOCIATE reads myMembershipStatus === MEMBER and is refused a duplicate application with ROLESET_ALREADY_MEMBER', async () => {
    await assignRoleToUser(
      TestUserManager.users.subspaceMember.id,
      roleSetId,
      RoleName.Associate
    );
    try {
      const eligibility = await getOrganizationAssociateEligibility(
        baseScenario.organization.id,
        TestUser.SUBSPACE_MEMBER
      );
      expect(eligibility?.data?.organization.roleSet.myMembershipStatus).toEqual(
        CommunityMembershipStatus.Member
      );

      const res = await applyToAssociateWithOrganization(
        roleSetId,
        note,
        TestUser.SUBSPACE_MEMBER
      );
      expect(getErrorCode(res)).toEqual('ROLESET_ALREADY_MEMBER');
      expect(res?.data?.applyForEntryRoleOnRoleSet).toBeUndefined();
    } finally {
      await removeRoleFromUser(
        TestUserManager.users.subspaceMember.id,
        roleSetId,
        RoleName.Associate
      ).catch(() => undefined);
    }
  });

  test('US3-AS5: switching allowApplications off refuses new applications (typed error, zero rows) but leaves an earlier pending application listed and approvable', async () => {
    const earlier = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.NON_SPACE_MEMBER
    );
    const earlierId = earlier?.data?.applyForEntryRoleOnRoleSet?.id;
    expect(earlierId?.length).toEqual(36);

    await updateOrganizationSettings(baseScenario.organization.id, {
      membership: {
        allowUsersMatchingDomainToJoin: false,
        allowApplications: false,
      },
    });
    try {
      const blocked = await applyToAssociateWithOrganization(
        roleSetId,
        note,
        TestUser.SUBSPACE_ADMIN
      );
      expect(getErrorCode(blocked)).toEqual('ROLESET_APPLICATIONS_NOT_ACCEPTED');
      expect(blocked?.data?.applyForEntryRoleOnRoleSet).toBeUndefined();

      // The earlier application is unaffected — still there and decidable.
      const approved = await eventOnRoleSetApplication(
        earlierId!,
        'APPROVE',
        TestUser.SPACE_ADMIN
      );
      expect(approved?.data?.eventOnApplication?.state).toEqual('approved');
    } finally {
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowApplications: true,
        },
      });
      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        roleSetId,
        RoleName.Associate
      ).catch(() => undefined);
    }
  });

  test('US3-AS3/AS4: APPROVE grants ASSOCIATE, REJECT does not and the applicant may apply again', async () => {
    const applyRes = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.SUBSUBSPACE_MEMBER
    );
    const applicationId = applyRes?.data?.applyForEntryRoleOnRoleSet?.id;

    const rejected = await eventOnRoleSetApplication(
      applicationId!,
      'REJECT',
      TestUser.SPACE_ADMIN
    );
    expect(rejected?.data?.eventOnApplication?.state).toEqual('rejected');

    const eligibilityAfterReject = await getOrganizationAssociateEligibility(
      baseScenario.organization.id,
      TestUser.SUBSUBSPACE_MEMBER
    );
    expect(
      eligibilityAfterReject?.data?.organization.roleSet.myMembershipStatus
    ).not.toEqual(CommunityMembershipStatus.Member);

    const reapply = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.SUBSUBSPACE_MEMBER
    );
    const secondApplicationId = reapply?.data?.applyForEntryRoleOnRoleSet?.id;
    expect(secondApplicationId?.length).toEqual(36);

    const approved = await eventOnRoleSetApplication(
      secondApplicationId!,
      'APPROVE',
      TestUser.SPACE_ADMIN
    );
    expect(approved?.data?.eventOnApplication?.state).toEqual('approved');

    const eligibilityAfterApprove = await getOrganizationAssociateEligibility(
      baseScenario.organization.id,
      TestUser.SUBSUBSPACE_MEMBER
    );
    expect(
      eligibilityAfterApprove?.data?.organization.roleSet.myMembershipStatus
    ).toEqual(CommunityMembershipStatus.Member);

    await removeRoleFromUser(
      TestUserManager.users.subsubspaceMember.id,
      roleSetId,
      RoleName.Associate
    ).catch(() => undefined);
  });

  test('an associate-only persona cannot APPROVE an application', async () => {
    const applyRes = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.SUBSUBSPACE_ADMIN
    );
    const applicationId = applyRes?.data?.applyForEntryRoleOnRoleSet?.id;
    try {
      const res = await eventOnRoleSetApplication(
        applicationId!,
        'APPROVE',
        TestUser.GLOBAL_BETA_TESTER
      );
      expect(res?.error?.errors).toBeDefined();
    } finally {
      await deleteApplication(applicationId!).catch(() => undefined);
    }
  });

  test('US3-AS6: inviting an applicant with an open application is refused (ALREADY_HAS_OPEN_APPLICATION)', async () => {
    const applyRes = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.GLOBAL_SUPPORT_ADMIN
    );
    const applicationId = applyRes?.data?.applyForEntryRoleOnRoleSet?.id;
    expect(applicationId?.length).toEqual(36);
    try {
      const invite = await inviteForEntryRoleOnRoleSet(
        roleSetId,
        [TestUserManager.users.globalSupportAdmin.id],
        [],
        'welcome',
        [],
        TestUser.SPACE_ADMIN
      );
      const result = getSingleInvitationResult(invite);
      expect(result?.type).toEqual(
        RoleSetInvitationResultType.AlreadyHasOpenApplication
      );
      expect(result?.invitation).toBeFalsy();
    } finally {
      await deleteApplication(applicationId!).catch(() => undefined);
    }
  });

  test('US3-AS9: a pre-migration-shaped organization row reads allowApplications === true and the seeded question as optional', async () => {
    await queryHarnessDb(
      "UPDATE organization SET settings = settings #- '{membership,allowApplications}' WHERE id = $1",
      [baseScenario.organization.id]
    );
    try {
      const eligibility = await getOrganizationAssociateEligibility(
        baseScenario.organization.id,
        TestUser.GLOBAL_ADMIN
      );
      // The @AfterLoad backstop heals the missing key on read, independent
      // of the eligibility signal's own reason — assert through the settings
      // round trip too via updateOrganizationSettings' echo (no-op update).
      const settingsRes = await updateOrganizationSettings(
        baseScenario.organization.id,
        { membership: { allowUsersMatchingDomainToJoin: false } }
      );
      expect(
        settingsRes?.data?.updateOrganizationSettings.settings.membership
          .allowApplications
      ).toEqual(true);
      expect(eligibility?.error).toBeUndefined();

      const form = await getRoleSetApplicationForm(roleSetId);
      const questions = form?.data?.lookup?.roleSet?.applicationForm?.questions ?? [];
      expect(questions[0]?.required).toEqual(false);
    } finally {
      await updateOrganizationSettings(baseScenario.organization.id, {
        membership: {
          allowUsersMatchingDomainToJoin: false,
          allowApplications: true,
        },
      });
    }
  });

  test('every application mutation above returns 200 on an organization role set (no Space lookup reachable — contract §7)', async () => {
    const applyRes = await applyToAssociateWithOrganization(
      roleSetId,
      note,
      TestUser.QA_USER
    );
    expect(applyRes?.error).toBeUndefined();
    const applicationId = applyRes?.data?.applyForEntryRoleOnRoleSet?.id;

    const approve = await eventOnRoleSetApplication(
      applicationId!,
      'APPROVE',
      TestUser.SPACE_ADMIN
    );
    expect(approve?.error).toBeUndefined();

    await removeRoleFromUser(
      TestUserManager.users.qaUser.id,
      roleSetId,
      RoleName.Associate
    ).catch(() => undefined);
  });
});
