import '@test/utils/array.matcher';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeChallenge } from '../challenge/challenge.request.params';
import { removeSpace } from '../space/space.request.params';
import {
  createOpportunity,
  removeOpportunity,
} from './opportunity.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  assignCommunityRoleToUser,
  removeCommunityRoleFromUser,
  RoleType,
} from '../community/community.request.params';
import { users } from '@test/utils/queries/users-data';

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
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
});

beforeEach(async () => {
  const responseCreateOpportunityOnChallenge = await createOpportunity(
    entitiesId.challengeId,
    opportunityName,
    opportunityNameId
  );

  const oppData =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity;

  opportunityId = oppData.id;
  opportunityCommunityId = oppData.community.id;
});

afterEach(async () => {
  await removeOpportunity(opportunityId);
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Opportunity Admin', () => {
  test('should create opportunity admin', async () => {
    // Act
    const res = await assignCommunityRoleToUser(
      users.challengeMemberId,
      opportunityCommunityId,
      RoleType.ADMIN
    );

    // Assert
    expect(res.body.data.assignCommunityRoleToUser.agent.credentials).toEqual(
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
    const responseOppTwo = await createOpportunity(
      entitiesId.challengeId,
      `oppdname-${uniqueId}`,
      `oppnameid-${uniqueId}`
    );
    const oppDataTwo = responseOppTwo.body.data.createOpportunity;
    const opportunityIdTwo = oppDataTwo.id;
    const opportunityCommunityIdTwo = oppDataTwo.community.id;

    // Act
    const resOne = await assignCommunityRoleToUser(
      users.challengeMemberId,
      opportunityCommunityId,
      RoleType.ADMIN
    );

    const resTwo = await assignCommunityRoleToUser(
      users.opportunityMemberEmail,
      opportunityCommunityIdTwo,
      RoleType.ADMIN
    );

    // Assert
    expect(
      resOne.body.data.assignCommunityRoleToUser.agent.credentials
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityId,
          type: credentialsType,
        }),
      ])
    );
    expect(
      resTwo.body.data.assignCommunityRoleToUser.agent.credentials
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceID: opportunityIdTwo,
          type: credentialsType,
        }),
      ])
    );
    await removeOpportunity(opportunityIdTwo);
  });

  test('should be able one opportunity admin to remove another admin from opportunity', async () => {
    // Arrange
    await assignCommunityRoleToUser(
      users.challengeMemberId,
      opportunityCommunityId,
      RoleType.ADMIN
    );

    await assignCommunityRoleToUser(
      users.opportunityMemberEmail,
      opportunityCommunityId,
      RoleType.ADMIN
    );

    const res = await removeCommunityRoleFromUser(
      users.opportunityMemberEmail,
      opportunityCommunityId,
      RoleType.ADMIN,
      TestUser.CHALLENGE_MEMBER
    );

    // Assert
    expect(
      res.body.data.removeCommunityRoleFromUser.agent.credentials
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
    await assignCommunityRoleToUser(
      users.challengeMemberId,
      opportunityCommunityId,
      RoleType.ADMIN
    );

    // Act
    const res = await removeCommunityRoleFromUser(
      users.opportunityMemberEmail,
      opportunityCommunityId,
      RoleType.ADMIN,
      TestUser.CHALLENGE_MEMBER
    );

    // Assert
    expect(
      res.body.data.removeCommunityRoleFromUser.agent.credentials
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
    await assignCommunityRoleToUser(
      users.challengeMemberId,
      opportunityCommunityId,
      RoleType.ADMIN
    );

    // Act
    const res = await assignCommunityRoleToUser(
      users.challengeMemberId,
      opportunityCommunityId,
      RoleType.ADMIN
    );

    // Assert
    expect(res.text).toContain(
      `Agent (${users.challengeMemberEmail}) already has assigned credential: opportunity-admin`
    );
  });
});
