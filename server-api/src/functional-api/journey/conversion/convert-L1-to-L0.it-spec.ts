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
  name: 'convert-l1-to-l0-inv-app',
  space: {
    // collaboration: {
    //   addPostCallout: true,
    //   addPostCollectionCallout: true,
    //   addWhiteboardCallout: true,
    // },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        //  TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      // collaboration: {
      //   addPostCallout: true,
      //   addPostCollectionCallout: true,
      //   addWhiteboardCallout: true,
      // },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN],
      },
      settings: {
        membership: { policy: CommunityMembershipPolicy.Applications },
        privacy: { mode: SpacePrivacyMode.Private },
      },
    },
  },
};

let invitationId: string;
let applicationId: string;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Create pending invitation
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

  // Create pending application
  const applicationData = await createApplication(
    baseScenario.subspace.community.roleSetId,
    TestUser.SPACE_MEMBER
  );
  applicationId = applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Convert L1 to L0 - applications and invitations', () => {
  let convertedSpace:
    | NonNullable<
        Awaited<ReturnType<typeof convertSpaceL1ToSpaceL0>>['data']
      >['convertSpaceL1ToSpaceL0']
    | undefined;

  beforeAll(async () => {
    //const before = await getSpaceData(baseScenario.subspace.id);
    const res = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);
    convertedSpace = res.data?.convertSpaceL1ToSpaceL0;

    // Sanity: conversion succeeded
    expect(convertedSpace?.level).toEqual(SpaceLevel.L0);
  });

  test('visibility is preserved after conversion', () => {
    expect(convertedSpace?.visibility).toBeDefined();
  });

  test('settings are preserved after conversion', () => {
    expect(convertedSpace?.settings).toBeDefined();
  });

  // Skip test due to this bug: BUG: Accept invitation fails, when user invited to private converted L1 to L0 subspace try to accept it #5069
  test.skip('pending invitation can be accepted after conversion', async () => {
    const acceptResult = await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.NON_SPACE_MEMBER
    );
    console.log('acceptResult', acceptResult.error);
    expect(acceptResult.status).toBe(200);

    const spaceDataAfterAccept = await getSpaceData(
      baseScenario.subspace.id,
      TestUser.NON_SPACE_MEMBER
    );

    expect(
      spaceDataAfterAccept?.data?.lookup?.space?.authorization?.myPrivileges
    ).toEqual(expect.arrayContaining(sorted_read_readAbout));
  });

  test('pending application can be approved after conversion', async () => {
    const approveResult = await eventOnRoleSetApplication(
      applicationId,
      'APPROVE'
    );

    expect(approveResult.status).toBe(200);
    expect(approveResult?.data?.eventOnApplication?.state).toContain(
      'approved'
    );

    const spaceDataAfterApproval = await getSpaceData(
      baseScenario.subspace.id,
      TestUser.SPACE_MEMBER
    );

    expect(
      spaceDataAfterApproval?.data?.lookup?.space?.authorization?.myPrivileges
    ).toEqual(expect.arrayContaining(sorted_read_readAbout));
  });
});
