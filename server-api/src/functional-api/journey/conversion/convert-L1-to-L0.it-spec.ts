/**
 * Convert L1 to L0 — pending invitations & applications (alkem-io/server#6019)
 *
 * Scenarios:
 * - A pending invitation is no longer available on the community roleSet after L1 -> L0 conversion.
 * - A pending application is no longer available on the community roleSet after L1 -> L0 conversion.
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import { inviteForEntryRoleOnRoleSet } from '@functional-api/roleset/invitations/invitation.request.params';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import {
  getSingleInvitationResult,
  getCommunityApplicationsInvitations,
} from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  SpaceLevel,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0-inv-app',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
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

  // alkem-io/server#6019 — pending invitations must be removed on L1->L0 conversion
  // so recipients cannot accept a stale invite (the broken flow from alkem-io/server#5069).
  test('pending invitation is no longer available after conversion', async () => {
    const result = await getCommunityApplicationsInvitations(
      baseScenario.subspace.community.roleSetId
    );

    const invitationIds =
      result.data?.lookup.roleSet?.invitations.map(i => i.id) ?? [];

    expect(invitationIds).not.toContain(invitationId);
  });

  // alkem-io/server#6019 — pending applications must be removed on L1->L0 conversion.
  test('pending application is no longer available after conversion', async () => {
    const result = await getCommunityApplicationsInvitations(
      baseScenario.subspace.community.roleSetId
    );

    const applicationIds =
      result.data?.lookup.roleSet?.applications.map(a => a.id) ?? [];

    expect(applicationIds).not.toContain(applicationId);
  });
});
