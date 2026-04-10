import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL0 } from './conversion.request.params';
import { inviteForEntryRoleOnRoleSet } from '@functional-api/roleset/invitations/invitation.request.params';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import {
  eventOnRoleSetApplication,
  eventOnRoleSetInvitation,
} from '@functional-api/roleset/roleset-events.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;
let invitationId: string;
let applicationId: string;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l0-inv-app-src',
  space: {
    //collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      //collaboration: { addPostCallout: true },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      settings: {
        membership: { policy: CommunityMembershipPolicy.Applications },
        privacy: { mode: SpacePrivacyMode.Private },
      },
    },
  },
};

const targetConfig: TestScenarioConfig = {
  name: 'move-l1-l0-inv-app-tgt',
  space: {
    //collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);

  // Create pending invitation before move
  const invitationData = await inviteForEntryRoleOnRoleSet(
    sourceScenario.subspace.community.roleSetId,
    [TestUserManager.users.nonSpaceMember.id],
    [],
    'welcome before move',
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const invitationResult = getSingleInvitationResult(invitationData);
  invitationId = invitationResult?.invitation?.id ?? '';

  // Create pending application before move
  const applicationData = await createApplication(
    sourceScenario.subspace.community.roleSetId,
    TestUser.SPACE_MEMBER
  );
  applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

  // Execute cross-L0 move
  await moveSpaceL1ToSpaceL0(
    sourceScenario.subspace.id,
    targetScenario.space.id
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L0 - pre-existing applications and invitations', () => {
  // skip test until bug is resolved: BUG: Pending memberships are moved together with space#9523

  test.skip('pending invitation is invalidated after cross-L0 move', async () => {
    // Auth chain is rebuilt — old invitation should fail
    const acceptResult = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_SPACE_MEMBER
    );
    console.log('acceptResult', acceptResult);
    // Expect error or non-200 status since invitation is invalid
    const hasError =
      acceptResult.error?.errors !== undefined &&
      acceptResult.error.errors.length > 0;
    expect(hasError).toBe(true);
  });
  // skip test until bug is resolved: BUG: Pending memberships are moved together with space#9523

  test.skip('pending application is invalidated after cross-L0 move', async () => {
    // Auth chain is rebuilt — old application should fail
    const approveResult = await eventOnRoleSetApplication(
      applicationId,
      'APPROVE'
    );
    console.log('approveResult', approveResult);

    const hasError =
      approveResult.error?.errors !== undefined &&
      approveResult.error.errors.length > 0;
    expect(hasError).toBe(true);
  });

  test('new invitation can be created after move', async () => {
    const newInvitation = await inviteForEntryRoleOnRoleSet(
      sourceScenario.subspace.community.roleSetId,
      [TestUserManager.users.qaUser.id],
      [],
      'welcome after move',
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );

    const result = getSingleInvitationResult(newInvitation);
    expect(result?.invitation?.id).toBeDefined();
  });

  test('new application can be submitted and approved after move', async () => {
    // Update settings to allow applications on the moved space
    const newApp = await createApplication(
      sourceScenario.subspace.community.roleSetId,
      TestUser.SPACE_ADMIN
    );
    console.log('newApp', newApp.error, newApp.data);
    const newAppId = newApp?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
    expect(newAppId).not.toBe('');

    const approveResult = await eventOnRoleSetApplication(newAppId, 'APPROVE');

    expect(approveResult.status).toBe(200);
    expect(approveResult?.data?.eventOnApplication?.state).toContain(
      'approved'
    );
  });
});
