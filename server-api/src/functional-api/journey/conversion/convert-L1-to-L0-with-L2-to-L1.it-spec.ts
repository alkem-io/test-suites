import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { sortArraysInObject } from '@utils/array.matcher';
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
import {
  RoleName,
  SpaceLevel,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

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

let subspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let subsubspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let convertedL0:
  | NonNullable<
      Awaited<ReturnType<typeof convertSpaceL1ToSpaceL0>>['data']
    >['convertSpaceL1ToSpaceL0']
  | undefined;
let promotedL1Data: NonNullable<
  Awaited<ReturnType<typeof getSpaceData>>['data']
>['lookup']['space'];
let invitationId: string;
let applicationId: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Create pending invitation on L1 subspace
  const invitationData = await inviteForEntryRoleOnRoleSet(
    baseScenario.subspace.community.roleSetId,
    [TestUserManager.users.nonSpaceMember.id],
    [],
    'welcome',
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const invitationResult = getSingleInvitationResult(invitationData);
  invitationId = invitationResult?.invitation?.id ?? '';

  // Create pending application on L1 subspace
  const applicationData = await createApplication(
    baseScenario.subspace.community.roleSetId,
    TestUser.SPACE_MEMBER
  );
  applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

  // Capture state before conversion
  subspaceBefore = await getSpaceData(baseScenario.subspace.id);
  subsubspaceBefore = await getSpaceData(baseScenario.subsubspace.id);

  // Execute conversion
  const res = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);
  convertedL0 = res.data?.convertSpaceL1ToSpaceL0;

  const subsubspaceAfter = await getSpaceData(baseScenario.subsubspace.id);
  promotedL1Data = subsubspaceAfter.data?.lookup.space;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Convert L1 to L0 with cascading L2 to L1', () => {
  describe('parent L1 promoted to L0', () => {
    test('level is L0', () => {
      expect(convertedL0?.level).toEqual(SpaceLevel.L0);
    });

    test('visibility is preserved', () => {
      expect(convertedL0?.visibility).toEqual(
        subspaceBefore.data?.lookup.space?.visibility
      );
    });

    test('about is preserved', () => {
      expect(convertedL0?.about).toEqual(
        subspaceBefore.data?.lookup.space?.about
      );
    });

    test('account host is preserved', () => {
      expect(convertedL0?.account.host).toEqual(
        subspaceBefore.data?.lookup.space?.account.host
      );
    });

    test('settings are preserved', () => {
      expect(convertedL0?.settings).toEqual(
        subspaceBefore.data?.lookup.space?.settings
      );
    });

    test('community members are preserved', () => {
      const membersBefore =
        subspaceBefore.data?.lookup.space?.community.roleSet.memberUsers
          ?.map(u => u.id)
          .sort();
      const membersAfter = convertedL0?.community.roleSet.memberUsers
        ?.map(u => u.id)
        .sort();

      expect(membersAfter).toEqual(membersBefore);
    });

    test('subspaces are preserved', () => {
      expect(sortArraysInObject(convertedL0?.subspaces)).toEqual(
        sortArraysInObject(subspaceBefore.data?.lookup.space?.subspaces)
      );
    });
  });

  describe('child L2 promoted to L1', () => {
    test('level is L1', () => {
      expect(promotedL1Data?.level).toEqual(SpaceLevel.L1);
    });

    test('visibility is preserved', () => {
      expect(promotedL1Data?.visibility).toEqual(
        subsubspaceBefore.data?.lookup.space?.visibility
      );
    });

    test('about is preserved', () => {
      expect(promotedL1Data?.about).toEqual(
        subsubspaceBefore.data?.lookup.space?.about
      );
    });

    test('account host is preserved', () => {
      expect(promotedL1Data?.account.host).toEqual(
        subsubspaceBefore.data?.lookup.space?.account.host
      );
    });

    test('settings are preserved', () => {
      expect(promotedL1Data?.settings).toEqual(
        subsubspaceBefore.data?.lookup.space?.settings
      );
    });

    test('community members are preserved', () => {
      const membersBefore =
        subsubspaceBefore.data?.lookup.space?.community.roleSet.memberUsers
          ?.map(u => u.id)
          .sort();
      const membersAfter = promotedL1Data?.community.roleSet.memberUsers
        ?.map(u => u.id)
        .sort();

      expect(membersAfter).toEqual(membersBefore);
    });

    test('subspaces are preserved', () => {
      expect(sortArraysInObject(promotedL1Data?.subspaces)).toEqual(
        sortArraysInObject(subsubspaceBefore.data?.lookup.space?.subspaces)
      );
    });
  });

  describe('pending invitations and applications after cascade', () => {
    // Skip test due to this bug: BUG: Accept invitation fails, when user invited to private converted L1 to L0 subspace try to accept it #5069
    test.skip('pending invitation on L1 can be accepted after conversion', async () => {
      const acceptResult = await eventOnRoleSetInvitation(
        invitationId,
        'ACCEPT',
        TestUser.NON_SPACE_MEMBER
      );

      expect(acceptResult.status).toBe(200);
    });

    test('pending application on L1 can be approved after conversion', async () => {
      const approveResult = await eventOnRoleSetApplication(
        applicationId,
        'APPROVE'
      );

      expect(approveResult.status).toBe(200);
      expect(approveResult?.data?.eventOnApplication?.state).toContain(
        'approved'
      );
    });
  });
});
