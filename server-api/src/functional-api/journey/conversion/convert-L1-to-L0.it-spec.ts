import {
  sorted_read_readAbout,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { inviteForEntryRoleOnRoleSet } from '@functional-api/roleset/invitations/invitation.request.params';
import {
  eventOnRoleSetApplication,
  eventOnRoleSetInvitation,
} from '@functional-api/roleset/roleset-events.request.params';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  SpaceLevel,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
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
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
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

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Promoting of L1 subspace', () => {
  test.only('Conversion Subspace L1 to Space L0 with application and invitation to the subspace', async () => {
    // Arrange
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      'welcome',
      [RoleName.Member],
      TestUser.GLOBAL_ADMIN
    );
    console.log('Invitation ID:', invitationData.error);

    let invitationId = '';
    const invitationResult = getSingleInvitationResult(invitationData);
    if (invitationResult && invitationResult.invitation) {
      invitationId = invitationResult.invitation.id;
    }

    console.log('Invitation ID:', invitationId);

    const applicationData = await createApplication(
      baseScenario.subspace.community.roleSetId,
      TestUser.SPACE_MEMBER
    );
    const createAppData = applicationData?.data?.applyForEntryRoleOnRoleSet;
    const applicationId = createAppData?.id ?? '';
    console.log('Application ID:', applicationId);
    const before = await getSpaceData(baseScenario.subspace.id);

    // Act
    const res = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);
    console.log('Convert L1 to L0 Response:', res.error);
    const after = res.data?.convertSpaceL1ToSpaceL0;

    // Assert
    expect(before.data?.lookup.space?.visibility).toEqual(after?.visibility);
    expect(after?.level).toEqual(SpaceLevel.L0);

    expect(
      Array.isArray(before.data?.lookup.space?.community)
        ? before.data.lookup.space.community.slice().sort()
        : []
    ).toEqual(
      Array.isArray(after?.community) ? after.community.slice().sort() : []
    );
    expect(before.data?.lookup.space?.about).toEqual(after?.about);
    expect(before.data?.lookup.space?.account.host).toEqual(
      after?.account.host
    );
    expect(before.data?.lookup.space?.settings).toEqual(after?.settings);
    expect(before.data?.lookup.space?.subspaces).toEqual(after?.subspaces);

    // // User accepts invitation after subspace L1 has been converted to L0
    const a = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_SPACE_MEMBER
    );
    console.log('Invitation accepted', a.error);
    const spaceDataInvitation = await getSpaceData(
      baseScenario.subspace.id,
      TestUser.NON_SPACE_MEMBER
    );
    console.log('Space Data Invitation', spaceDataInvitation.data);

    // Assert
    // skip until fixed
    // expect(
    //   spaceDataInvitation?.data?.lookup?.space?.authorization?.myPrivileges
    // ).toEqual(expect.arrayContaining(sorted_read_readAbout));

    // Converted Space admin approves application after subspace L1 has been converted to L0
    const subspaceApplicationEventResponse = await eventOnRoleSetApplication(
      applicationId,
      'APPROVE'
    );

    const subspaceApplication =
      subspaceApplicationEventResponse?.data?.eventOnApplication;
    const spaceDataApplication = await getSpaceData(
      baseScenario.subspace.id,
      TestUser.SPACE_MEMBER
    );
    // Assert
    expect(subspaceApplicationEventResponse.status).toBe(200);
    expect(subspaceApplication?.state).toContain('approved');
    expect(
      spaceDataApplication?.data?.lookup?.space?.authorization?.myPrivileges
    ).toEqual(expect.arrayContaining(sorted_read_readAbout));
  });
});
