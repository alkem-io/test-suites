import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndSpace,
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { removeChallenge } from '../../integration/challenge/challenge.request.params';
import { removeSpace } from '../../integration/space/space.request.params';
import { removeOpportunity } from '../../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import {
  dataChallengeMemberTypes,
  dataSpaceMemberTypes,
  dataSpaceAvailableMemberUsers,
  dataSpaceAvailableLeadUsers,
  dataChallengeAvailableMemberUsers,
  dataChallengeAvailableLeadUsers,
  dataOpportunityAvailableMemberUsers,
  dataOpportunityAvailableLeadUsers,
  dataOpportunityMemberTypes,
} from './community.request.params';
import {
  assignCommunityRoleToUser,
  removeCommunityRoleFromUser,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.opportunityCommunityId,
    RoleType.LEAD
  );

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.challengeCommunityId,
    RoleType.LEAD
  );

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.spaceCommunityId,
    RoleType.LEAD
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Assign / Remove users to community', () => {
  describe('Assign users', () => {
    afterAll(async () => {
      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
      );

      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
      );

      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );

      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.MEMBER
      );

      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );

      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );
    });
    test('Assign user as member to space', async () => {
      // Act
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });

    test('Assign user as member to challenge', async () => {
      // Act
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.spaceId,
        entitiesId.challengeId
      );
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
    test('Assign user as member to opportunity', async () => {
      // Act
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.MEMBER
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });

    test('Assign user as lead to space', async () => {
      // Act
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );
      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
    test('Assign user as lead to challenge', async () => {
      // Act
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.spaceId,
        entitiesId.challengeId
      );
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
    test('Assign user as lead to opportunity', async () => {
      // Act
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
  });

  describe('Remove users', () => {
    beforeAll(async () => {
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.MEMBER
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );
    });
    test('Remove user as lead from opportunity', async () => {
      // Act
      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(0);
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
    test('Remove user as lead from challenge', async () => {
      // Act
      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(0);
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
    test('Remove user as lead from space', async () => {
      // Act
      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(0);
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });

    test('Remove user as member from opportunity', async () => {
      // Act
      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.MEMBER
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
    test('Remove user as member from challenge', async () => {
      // Act
      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.spaceId,
        entitiesId.challengeId
      );
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
    test('Remove user as member from space', async () => {
      // Act
      await removeCommunityRoleFromUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );
      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMemberEmail,
          }),
        ])
      );
    });
  });
});

describe('Available users', () => {
  describe('Space available users', () => {
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataSpaceAvailableMemberUsers(
        entitiesId.spaceId
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );

      const availableUsers = await dataSpaceAvailableMemberUsers(
        entitiesId.spaceId
      );

      // Assert
      expect(availableUsers).toHaveLength(
        availableUsersBeforeAssign.length - 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.nonSpaceMemberId,
          }),
        ])
      );
    });

    test('Available leads', async () => {
      const availableUsersBeforeAssign = await dataSpaceAvailableLeadUsers(
        entitiesId.spaceId
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );

      const availableUsers = await dataSpaceAvailableLeadUsers(
        entitiesId.spaceId
      );

      // Assert
      expect(availableUsers).toHaveLength(
        availableUsersBeforeAssign.length - 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.nonSpaceMemberId,
          }),
        ])
      );
    });
  });
  describe('Challenge available users', () => {
    beforeAll(async () => {
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataChallengeAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.challengeId
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );

      const availableUsers = await dataChallengeAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.challengeId
      );

      // Assert
      expect(availableUsers).toHaveLength(
        availableUsersBeforeAssign.length - 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.spaceMemberId,
          }),
        ])
      );
    });

    test('Available leads', async () => {
      const availableUsersBeforeAssign = await dataChallengeAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.challengeId
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
      );

      const availableUsers = await dataChallengeAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.challengeId
      );

      // Assert
      expect(availableUsers).toHaveLength(
        availableUsersBeforeAssign.length - 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.spaceMemberId,
          }),
        ])
      );
    });
  });
  describe('Opportunity available users', () => {
    beforeAll(async () => {
      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataOpportunityAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.MEMBER
      );

      const availableUsers = await dataOpportunityAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );

      // Assert
      expect(availableUsers).toHaveLength(
        availableUsersBeforeAssign.length - 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.qaUserId,
          }),
        ])
      );
    });

    test('Available leads', async () => {
      const availableUsersBeforeAssign = await dataOpportunityAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );

      await assignCommunityRoleToUser(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
      );

      const availableUsers = await dataOpportunityAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );

      // Assert
      expect(availableUsers).toHaveLength(
        availableUsersBeforeAssign.length - 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.qaUserId,
          }),
        ])
      );
    });
  });
});
