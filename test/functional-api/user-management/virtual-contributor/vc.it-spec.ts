import '@test/utils/array.matcher';
import {
  createVirtualContributorOnAccount,
  deleteVirtualContributorOnAccount,
  queryVCData,
  removeVirtualContributorFromCommunity,
  updateVirtualContributor,
} from './vc.request.params';
import {
  createSpaceAndGetData,
  deleteSpaceCodegen,
  updateSpacePlatformCodegen,
  updateSpaceSettingsCodegen,
} from '../../journey/space/space.request.params';
import { deleteOrganizationCodegen } from '../../organization/organization.request.params';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { SearchVisibility, SpaceVisibility } from '@alkemio/client-lib';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import {
  assignLicensePlanToAccount,
  getVCLicensePlan,
} from '@test/functional-api/license/license.params.request';
import {
  deleteInvitationCodegen,
  inviteContributorsCodegen,
} from '../invitations/invitation.request.params';
import { getCommunityInvitationsApplicationsCodegen } from '../application/application.request.params';
import { createUserCodegen, deleteUserCodegen } from '../user.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let invitationId = '';
let invitationData: any;

const organizationName = 'appl-org-name' + uniqueId;
const hostNameId = 'appl-org-nameid' + uniqueId;
const spaceName = 'appl-eco-name' + uniqueId;
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

beforeAll(async () => {
  const vcLicensePlan = await getVCLicensePlan('FEATURE_VIRTUAL_CONTRIBUTORS');
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  vcLicensePlanId = vcLicensePlan[0].id;

  // await createChallengeForOrgSpaceCodegen(challengeName);
  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Public,
    },
    membership: {
      policy: CommunityMembershipPolicy.Applications,
    },
  });

  await assignLicensePlanToAccount(entitiesId.accountId, vcLicensePlanId);

  await updateSpacePlatformCodegen(
    entitiesId.spaceId,
    spaceNameId,
    SpaceVisibility.Active
  );

  const responceVcSpace = await createSpaceAndGetData(
    spaceNameVC,
    spaceNameIdVC,
    users.betaTester.accountId
  );
  const vcSpaceData = responceVcSpace?.data?.space;
  vcSpaceId = vcSpaceData?.id ?? '';
  vcSpaceAccountId = vcSpaceData?.account?.id ?? '';

  const responseVCL1 = await createChallengeCodegen(
    l1NameVC,
    l1NameIdVC,
    vcSpaceId
  );

  const vcL1Data = responseVCL1?.data?.createSubspace;
  l1VCId = vcL1Data?.id ?? '';

  const vcData = await createVirtualContributorOnAccount(
    vcName,
    vcSpaceAccountId,
    l1VCId
  );
  vcId = vcData?.data?.createVirtualContributor?.id ?? '';

  await updateVirtualContributor(vcId, SearchVisibility.Public);
});

afterAll(async () => {
  await deleteSpaceCodegen(l1VCId);
  await deleteSpaceCodegen(vcSpaceId);

  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('Virtual Contributor', () => {
  afterEach(async () => {
    await removeVirtualContributorFromCommunity(
      entitiesId.space.communityId,
      vcId
    );
    await deleteInvitationCodegen(invitationId);
  });

  test('should not delete user who hosts an account', async () => {
    const response = await deleteUserCodegen(users.betaTester.id);

    // Assert
    expect(response.error?.errors[0].message).toContain(
      'Unable to delete User: account contains one or more resources'
    );

    await createUserCodegen({
      firstName: 'beta',
      lastName: 'tester',
      email: 'beta.tester@alkem.io',
    });
  });

  test('should return invitations after virtual contributor is removed', async () => {
    // Act
    invitationData = await inviteContributorsCodegen(
      entitiesId.space.communityId,
      [vcId],
      TestUser.GLOBAL_ADMIN
    );

    invitationId =
      invitationData?.data?.inviteContributorsForCommunityMembership?.id;

    await deleteVirtualContributorOnAccount(vcId);

    const invitationsDataCommunity = await getCommunityInvitationsApplicationsCodegen(
      entitiesId.space.communityId,
      TestUser.HUB_ADMIN
    );

    // Assert
    expect(invitationsDataCommunity.status).toBe(200);
    expect(
      invitationsDataCommunity?.data?.lookup?.community?.invitations
    ).toHaveLength(0);
  });

  test.skip('query virtual contributor data', async () => {
    // Act
    const vcData = await createVirtualContributorOnAccount(
      vcName,
      vcSpaceAccountId,
      l1VCId
    );
    vcId = vcData?.data?.createVirtualContributor?.id ?? '';

    const vcDataQuery = await queryVCData(vcId);

    // Assert
    expect(vcDataQuery?.data?.virtualContributor.account?.id).toEqual(
      vcSpaceAccountId
    );
    expect(
      vcDataQuery?.data?.virtualContributor.aiPersona?.bodyOfKnowledgeID
    ).toEqual(l1VCId);
  });
});
