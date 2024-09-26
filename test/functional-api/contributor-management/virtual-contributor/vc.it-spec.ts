import '@test/utils/array.matcher';
import {
  createVirtualContributorOnAccount,
  deleteVirtualContributorOnAccount,
  queryVCData,
  removeVirtualContributorFromRoleSet,
  updateVirtualContributor,
} from './vc.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
  updateSpacePlatformSettings,
  updateSpaceSettings,
} from '../../journey/space/space.request.params';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceWithUsers } from '@test/utils/data-setup/entities';
import { entitiesId } from '@test/types/entities-helper';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { SearchVisibility, SpaceVisibility } from '@alkemio/client-lib';
import { createChallenge } from '@test/utils/mutations/journeys/challenge';
import {
  assignLicensePlanToAccount,
  getVCLicensePlan,
} from '@test/functional-api/license/license.params.request';
import {
  deleteInvitation,
  inviteContributors,
} from '../../roleset/invitations/invitation.request.params';
import { getRoleSetInvitationsApplications } from '../../roleset/application/application.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { createUser, deleteUser } from '../user/user.request.params';
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
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  vcLicensePlanId = vcLicensePlan[0].id;

  // await createChallengeForOrgSpace(challengeName);
  await updateSpaceSettings(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Public,
    },
    membership: {
      policy: CommunityMembershipPolicy.Applications,
    },
  });

  await assignLicensePlanToAccount(entitiesId.accountId, vcLicensePlanId);

  await updateSpacePlatformSettings(
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

  const responseVCL1 = await createChallenge(l1NameVC, l1NameIdVC, vcSpaceId);

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
  await deleteSpace(l1VCId);
  await deleteSpace(vcSpaceId);

  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Virtual Contributor', () => {
  afterEach(async () => {
    await removeVirtualContributorFromRoleSet(entitiesId.space.roleSetId, vcId);
    await deleteInvitation(invitationId);
  });

  test('should not delete user who hosts an account', async () => {
    const response = await deleteUser(users.betaTester.id);

    // Assert
    expect(response.error?.errors[0].message).toContain(
      'Unable to delete User: account contains one or more resources'
    );

    await createUser({
      firstName: 'beta',
      lastName: 'tester',
      email: 'beta.tester@alkem.io',
    });
  });

  test('should return invitations after virtual contributor is removed', async () => {
    // Act
    invitationData = await inviteContributors(
      entitiesId.space.roleSetId,
      [vcId],
      TestUser.GLOBAL_ADMIN
    );

    invitationId =
      invitationData?.data?.inviteContributorsForCommunityMembership?.id;

    await deleteVirtualContributorOnAccount(vcId);

    const invitationsDataCommunity = await getRoleSetInvitationsApplications(
      entitiesId.space.roleSetId,
      TestUser.HUB_ADMIN
    );

    // Assert
    expect(invitationsDataCommunity.status).toBe(200);
    expect(
      invitationsDataCommunity?.data?.lookup?.roleSet?.invitations
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
