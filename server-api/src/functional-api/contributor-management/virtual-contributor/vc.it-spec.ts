/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createVirtualContributorOnAccountSpaceBased,
  deleteVirtualContributorOnAccount,
  queryVCData,
  removeVirtualContributorFromRoleSet,
  updateVirtualContributor,
} from './vc.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
  updateSpacePlatformSettings,
} from '../../journey/space/space.request.params';
import {
  createSubspace,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  assignLicensePlanToAccount,
  getLicensePlanByName,
} from '@functional-api/license/license.params.request';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '../../roleset/invitations/invitation.request.params';
import { getRoleSetInvitationsApplications } from '../../roleset/application/application.request.params';
import { deleteUser } from '../user/user.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { getAccountMainEntities } from '@functional-api/account/account.params.request';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/dist/scenario/models/OrganizationWithSpaceModel';
import {
  SpaceVisibility,
  SearchVisibility,
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';
const uniqueId = UniqueIDGenerator.getID();

let invitationId = '';
let invitationData: any;

const spaceNameId = 'appl-eco-nameid' + uniqueId;
let vcSpaceId = '';
let l1VCId = '';
let vcLicensePlanId = '';
const spaceNameVC = 'appl-sp-name' + uniqueId;
const spaceNameIdVC = 'appl-sp-nameid' + uniqueId;
const l1NameVC = 'appl-l1-name' + uniqueId;
const l1NameIdVC = 'appl-l1-nameid' + uniqueId;
let vcId = '';
let vcSpaceAccountId = '';
const vcName = 'vcName1' + uniqueId;

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'virtual-contributor',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const vcLicensePlan = await getLicensePlanByName(
    'FEATURE_VIRTUAL_CONTRIBUTORS'
  );
  vcLicensePlanId = vcLicensePlan[0].id;

  await assignLicensePlanToAccount(
    baseScenario.organization.accountId,
    vcLicensePlanId
  );

  await updateSpacePlatformSettings(
    baseScenario.space.id,
    spaceNameId,
    SpaceVisibility.Active
  );

  const responceVcSpace = await createSpaceAndGetData(
    spaceNameVC,
    spaceNameIdVC,
    TestUserManager.users.betaTester.accountId
  );
  const vcSpaceData = responceVcSpace?.data?.lookup?.space;
  vcSpaceId = vcSpaceData?.id ?? '';
  vcSpaceAccountId = vcSpaceData?.account?.id ?? '';

  const responseVCL1 = await createSubspace(l1NameVC, l1NameIdVC, vcSpaceId);

  const vcL1Data = responseVCL1?.data?.createSubspace;
  l1VCId = vcL1Data?.id ?? '';

  const vcData = await createVirtualContributorOnAccountSpaceBased(
    vcName,
    vcSpaceAccountId,
    l1VCId,
    TestUser.GLOBAL_BETA_TESTER
  );
  vcId = vcData?.data?.createVirtualContributor?.id ?? '';

  await updateVirtualContributor(vcId, SearchVisibility.Public);
});

afterAll(async () => {
  const getVirtualContributors = await getAccountMainEntities(
    TestUserManager.users.betaTester.accountId
  );
  const returnedVcs =
    getVirtualContributors.data?.lookup.account?.virtualContributors ?? [];
  for (const entity of returnedVcs) {
    await deleteVirtualContributorOnAccount(entity.id).catch();
  }
  await deleteSpace(l1VCId);
  await deleteSpace(vcSpaceId);

  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Virtual Contributor', () => {
  afterEach(async () => {
    await removeVirtualContributorFromRoleSet(
      baseScenario.space.community.roleSetId,
      vcId
    );
    await deleteInvitation(invitationId);
  });

  test('should not delete user who hosts an account', async () => {
    const response = await deleteUser(TestUserManager.users.betaTester.id);

    // Assert
    expect(response.error?.errors[0].message).toContain(
      'Unable to delete User: account contains one or more resources'
    );
  });

  test('should return invitations after virtual contributor is removed', async () => {
    // Act
    invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [vcId],
      [],
      'welcome',
      TestUser.GLOBAL_ADMIN
    );

    const invitationResult = getSingleInvitationResult(invitationData);
    if (invitationResult && invitationResult.invitation) {
      invitationId = invitationResult.invitation.id;
    }

    await deleteVirtualContributorOnAccount(vcId);

    const invitationsDataCommunity = await getRoleSetInvitationsApplications(
      baseScenario.space.community.roleSetId,
      TestUser.SPACE_ADMIN
    );

    // Assert
    expect(invitationsDataCommunity.status).toBe(200);
    expect(
      invitationsDataCommunity?.data?.lookup?.roleSet?.invitations
    ).toHaveLength(0);
  });

  test('query virtual contributor data', async () => {
    // Act
    const vcData = await createVirtualContributorOnAccountSpaceBased(
      vcName,
      vcSpaceAccountId,
      l1VCId,
      TestUser.GLOBAL_BETA_TESTER
    );
    vcId = vcData?.data?.createVirtualContributor?.id ?? '';

    const vcDataQuery = await queryVCData(vcId);

    // Assert
    expect(vcDataQuery?.data?.lookup.virtualContributor?.account?.id).toEqual(
      vcSpaceAccountId
    );
    expect(
      vcDataQuery?.data?.lookup.virtualContributor?.aiPersona?.bodyOfKnowledgeID
    ).toEqual(l1VCId);
  });
});
