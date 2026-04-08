import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { convertSpaceL2ToSpaceL1 } from './conversion.request.params';
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
  name: 'convert-l2-to-l1',
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
        settings: {
          membership: { policy: CommunityMembershipPolicy.Applications },
          privacy: { mode: SpacePrivacyMode.Private },
        },
      },
    },
  },
};

let subsubspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let promotedSpace:
  | NonNullable<
      Awaited<ReturnType<typeof convertSpaceL2ToSpaceL1>>['data']
    >['convertSpaceL2ToSpaceL1']
  | undefined;
let invitationId: string;
let applicationId: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Create pending invitation on L2 subsubspace
  const invitationData = await inviteForEntryRoleOnRoleSet(
    baseScenario.subsubspace.community.roleSetId,
    [TestUserManager.users.nonSpaceMember.id],
    [],
    'welcome',
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const invitationResult = getSingleInvitationResult(invitationData);
  invitationId = invitationResult?.invitation?.id ?? '';

  // Create pending application on L2 subsubspace
  const applicationData = await createApplication(
    baseScenario.subsubspace.community.roleSetId,
    TestUser.SUBSPACE_MEMBER
  );
  applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

  // Capture state before conversion
  subsubspaceBefore = await getSpaceData(baseScenario.subsubspace.id);

  // Execute conversion — note: using subsubspace.id (L2), not subspace.id
  const res = await convertSpaceL2ToSpaceL1(baseScenario.subsubspace.id);
  promotedSpace = res.data?.convertSpaceL2ToSpaceL1;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Convert L2 to L1', () => {
  describe('basic properties after promotion', () => {
    test('level is promoted to L1', () => {
      expect(promotedSpace?.level).toEqual(SpaceLevel.L1);
    });

    test('collaboration calloutsSet is preserved', () => {
      expect(promotedSpace?.collaboration.calloutsSet).toEqual(
        subsubspaceBefore.data?.lookup.space?.collaboration.calloutsSet
      );
    });

    test('innovation flow states are preserved', () => {
      expect(promotedSpace?.collaboration.innovationFlow.states).toEqual(
        subsubspaceBefore.data?.lookup.space?.collaboration.innovationFlow
          .states
      );
    });

    test('visibility is preserved', () => {
      expect(promotedSpace?.visibility).toEqual(
        subsubspaceBefore.data?.lookup.space?.visibility
      );
    });

    test('about/profile is preserved', () => {
      expect(promotedSpace?.about).toEqual(
        subsubspaceBefore.data?.lookup.space?.about
      );
    });

    test('account host is preserved', () => {
      expect(promotedSpace?.account.host).toEqual(
        subsubspaceBefore.data?.lookup.space?.account.host
      );
    });

    test('settings are preserved', () => {
      expect(promotedSpace?.settings).toEqual(
        subsubspaceBefore.data?.lookup.space?.settings
      );
    });

    test('community members are preserved', () => {
      const membersBefore =
        subsubspaceBefore.data?.lookup.space?.community.roleSet.memberUsers
          ?.map(u => u.id)
          .sort();
      const membersAfter = promotedSpace?.community.roleSet.memberUsers
        ?.map(u => u.id)
        .sort();

      expect(membersAfter).toEqual(membersBefore);
    });

    test('community admins are preserved', () => {
      const adminsBefore =
        subsubspaceBefore.data?.lookup.space?.community.roleSet.adminUsers
          ?.map(u => u.id)
          .sort();
      const adminsAfter = promotedSpace?.community.roleSet.adminUsers
        ?.map(u => u.id)
        .sort();

      expect(adminsAfter).toEqual(adminsBefore);
    });

    test('subspaces are preserved', () => {
      expect(sortArraysInObject(promotedSpace?.subspaces)).toEqual(
        sortArraysInObject(subsubspaceBefore.data?.lookup.space?.subspaces)
      );
    });
  });

  describe('pending invitations and applications after promotion', () => {
    test('pending invitation can be accepted after promotion', async () => {
      const acceptResult = await eventOnRoleSetInvitation(
        invitationId,
        'ACCEPT',
        TestUser.NON_SPACE_MEMBER
      );

      expect(acceptResult.status).toBe(200);
    });

    test('pending application can be approved after promotion', async () => {
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
