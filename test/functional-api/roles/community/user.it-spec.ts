import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  removeCommunityRoleFromUserCodegen,
  assignCommunityRoleToUserCodegen,
} from '../roles-request.params';
import { entitiesId } from './communications-helper';
import { CommunityRole } from '@test/generated/alkemio-schema';
import {
  dataAvailableLeadUsers,
  dataAvailableMemberUsers,
  getCommunityMembersListCodegen,
} from './community.request.params';

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
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;
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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

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

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

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
      const availableUsersBeforeAssign = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );

      const availableUsers = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
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
      const availableUsersBeforeAssign = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
      );

      const availableUsers = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
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
  describe('Challenge available users', () => {
    beforeAll(async () => {
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
      );

      const availableUsers = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
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
      const availableUsersBeforeAssign = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
      );

      const availableUsers = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
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
      const availableUsersBeforeAssign = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
      );

      const availableUsers = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
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
      const availableUsersBeforeAssign = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMemberEmail,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
      );

      const availableUsers = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
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
