import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { removeChallengeCodegen } from '../../integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '../../integration/space/space.request.params';
import { removeOpportunityCodegen } from '../../integration/opportunity/opportunity.request.params';
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
  assignCommunityRoleToUserCodegen,
  removeCommunityRoleFromUserCodegen,
} from '@test/functional-api/integration/community/community.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { CommunityRole } from '@alkemio/client-lib';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );
});

afterAll(async () => {
  await removeOpportunityCodegen(entitiesId.opportunityId);
  await removeChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Assign / Remove users to community', () => {
  describe('Assign users', () => {
    afterAll(async () => {
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );
    });
    test('Assign user as member to space', async () => {
      // Act
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
      );
    });
    test('Remove user as lead from opportunity', async () => {
      // Act
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
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
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
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
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
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
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
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
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
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
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
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

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
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

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataChallengeAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.challengeId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
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

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
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
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataOpportunityAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.opportunityId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
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

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
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
