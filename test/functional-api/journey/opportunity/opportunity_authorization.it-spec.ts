import '@test/utils/array.matcher';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { deleteChallengeCodegen } from '../challenge/challenge.request.params';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { deleteOpportunityCodegen } from './opportunity.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { createOpportunityCodegen } from '@test/utils/mutations/journeys/opportunity';
import { CommunityRole } from '@alkemio/client-lib';
import {
  assignCommunityRoleToUserCodegen,
  removeCommunityRoleFromUserCodegen,
} from '@test/functional-api/roles/roles-request.params';

const credentialsType = 'OPPORTUNITY_ADMIN';
const opportunityName = `op-dname${uniqueId}`;
const opportunityNameId = `op-nameid${uniqueId}`;
let opportunityId = '';
let opportunityCommunityId = '';
const challengeName = `opp-auth-nam-ch-${uniqueId}`;
const organizationName = 'opp-auth-org-name' + uniqueId;
const hostNameId = 'opp-auth-org-nameid' + uniqueId;
const spaceName = 'opp-auth-eco-name' + uniqueId;
const spaceNameId = 'opp-auth-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
});

beforeEach(async () => {
  const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
    opportunityName,
    opportunityNameId,
    entitiesId.challengeId
  );

  const oppData = responseCreateOpportunityOnChallenge?.data?.createOpportunity;

  opportunityId = oppData?.id ?? '';
  opportunityCommunityId = oppData?.community?.id ?? '';
});

afterEach(async () => {
  await deleteOpportunityCodegen(opportunityId);
});

afterAll(async () => {
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Opportunity Admin', () => {
  test('should create opportunity admin', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.challengeMemberId,
      opportunityCommunityId,
      CommunityRole.Admin
    );

    // Assert
    expect(res?.data?.assignCommunityRoleToUser?.agent?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
  });

  test('should add same user as admin of 2 opportunities', async () => {
    // Arrange
    const responseOppTwo = await createOpportunityCodegen(
      `oppdname-${uniqueId}`,
      `oppnameid-${uniqueId}`,
      entitiesId.challengeId
    );
    const oppDataTwo = responseOppTwo?.data?.createOpportunity;
    const opportunityIdTwo = oppDataTwo?.id ?? '';
    const opportunityCommunityIdTwo = oppDataTwo?.community?.id ?? '';

    // Act
    const resOne = await assignCommunityRoleToUserCodegen(
      users.challengeMemberId,
      opportunityCommunityId,
      CommunityRole.Admin
    );

    const resTwo = await assignCommunityRoleToUserCodegen(
      users.opportunityMemberEmail,
      opportunityCommunityIdTwo,
      CommunityRole.Admin
    );

    // Assert
    expect(resOne?.data?.assignCommunityRoleToUser?.agent?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
    expect(resTwo?.data?.assignCommunityRoleToUser?.agent?.credentials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityIdTwo,
          type: credentialsType,
        }),
      ])
    );
    await deleteOpportunityCodegen(opportunityIdTwo);
  });

  test('should be able one opportunity admin to remove another admin from opportunity', async () => {
    // Arrange
    await assignCommunityRoleToUserCodegen(
      users.challengeMemberId,
      opportunityCommunityId,
      CommunityRole.Admin
    );

    await assignCommunityRoleToUserCodegen(
      users.opportunityMemberEmail,
      opportunityCommunityId,
      CommunityRole.Admin
    );

    const res = await removeCommunityRoleFromUserCodegen(
      users.opportunityMemberEmail,
      opportunityCommunityId,
      CommunityRole.Admin,
      TestUser.CHALLENGE_MEMBER
    );

    // Assert
    expect(
      res?.data?.removeCommunityRoleFromUser?.agent?.credentials
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
  });

  test('should remove the only admin of an opportunity', async () => {
    // Arrange
    await assignCommunityRoleToUserCodegen(
      users.challengeMemberId,
      opportunityCommunityId,
      CommunityRole.Admin
    );

    // Act
    const res = await removeCommunityRoleFromUserCodegen(
      users.opportunityMemberEmail,
      opportunityCommunityId,
      CommunityRole.Admin,
      TestUser.CHALLENGE_MEMBER
    );

    // Assert
    expect(
      res?.data?.removeCommunityRoleFromUser?.agent?.credentials
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
  });

  test('should throw error for assigning same opportunity admin twice', async () => {
    // Arrange
    await assignCommunityRoleToUserCodegen(
      users.challengeMemberId,
      opportunityCommunityId,
      CommunityRole.Admin
    );

    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.challengeMemberId,
      opportunityCommunityId,
      CommunityRole.Admin
    );

    // Assert
    expect(res?.error?.errors[0].message).toContain(
      `Agent (${users.challengeMemberEmail}) already has assigned credential: opportunity-admin`
    );
  });
});
