import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { inviteForEntryRoleOnRoleSet } from '@functional-api/roleset/invitations/invitation.request.params';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0-with-l2-to-l1',
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
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
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
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      settings: {
        membership: { policy: CommunityMembershipPolicy.Applications },
        privacy: { mode: SpacePrivacyMode.Private },
      },
      subspace: {
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
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
  test('Conversion Subspace L1 to Space L0 together with L2 to L1', async () => {
    // Arrange
    await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      'welcome',
      TestUser.GLOBAL_ADMIN
    );

    await createApplication(
      baseScenario.subspace.community.roleSetId,
      TestUser.SPACE_MEMBER
    );
    const subspaceBefore = await getSpaceData(baseScenario.subspace.id);
    const subsubspaceBefore = await getSpaceData(baseScenario.subsubspace.id);

    // Act
    const res = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);

    const subsubspaceAfter = await getSpaceData(baseScenario.subsubspace.id);
    const subsubspaceAfterData = subsubspaceAfter.data?.lookup.space;
    const subspaceAfter = res.data?.convertSpaceL1ToSpaceL0;

    // Assert L1 to L0
    expect(subspaceBefore.data?.lookup.space?.visibility).toEqual(
      subspaceAfter?.visibility
    );
    expect(subspaceAfter?.level).toEqual(SpaceLevel.L0);

    expect(
      Array.isArray(subspaceBefore.data?.lookup.space?.community)
        ? subspaceBefore.data.lookup.space.community.slice().sort()
        : []
    ).toEqual(
      Array.isArray(subspaceAfter?.community)
        ? subspaceAfter.community.slice().sort()
        : []
    );
    expect(subspaceBefore.data?.lookup.space?.about).toEqual(
      subspaceAfter?.about
    );
    expect(subspaceBefore.data?.lookup.space?.account.host).toEqual(
      subspaceAfter?.account.host
    );
    expect(subspaceBefore.data?.lookup.space?.settings).toEqual(
      subspaceAfter?.settings
    );
    expect(subspaceBefore.data?.lookup.space?.subspaces).toEqual(
      subspaceAfter?.subspaces
    );

    // Assert L2 to L1
    expect(subsubspaceBefore.data?.lookup.space?.visibility).toEqual(
      subsubspaceAfterData?.visibility
    );
    expect(subsubspaceAfterData?.level).toEqual(SpaceLevel.L1);
    expect(
      Array.isArray(subsubspaceBefore.data?.lookup.space?.community)
        ? subsubspaceBefore.data.lookup.space.community.slice().sort()
        : []
    ).toEqual(
      Array.isArray(subsubspaceAfterData?.community)
        ? subsubspaceAfterData.community.slice().sort()
        : []
    );
    expect(subsubspaceBefore.data?.lookup.space?.about).toEqual(
      subsubspaceAfterData?.about
    );
    expect(subsubspaceBefore.data?.lookup.space?.account.host).toEqual(
      subsubspaceAfterData?.account.host
    );
    expect(subsubspaceBefore.data?.lookup.space?.settings).toEqual(
      subsubspaceAfterData?.settings
    );
    expect(subsubspaceBefore.data?.lookup.space?.subspaces).toEqual(
      subsubspaceAfterData?.subspaces
    );
  });
});
