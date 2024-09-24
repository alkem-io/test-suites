import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  removeRoleFromUser,
  assignRoleToUser,
} from '../roles-request.params';
import { entitiesId } from './communications-helper';
import { CommunityRole } from '@test/generated/alkemio-schema';
import {
  dataAvailableLeadUsers,
  dataAvailableMemberUsers,
  getRoleSetMembersList,
} from './roleset.request.params';
import { users } from '@test/utils/queries/users-data';

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

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.opportunity.communityId,
    CommunityRoleType.Lead
  );

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.challenge.communityId,
    CommunityRoleType.Lead
  );

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.space.communityId,
    CommunityRoleType.Lead
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunity.id);
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('Assign / Remove users to community', () => {
  describe('Assign users', () => {
    afterAll(async () => {
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Lead
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Lead
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Lead
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Member
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );
    });
    test('Assign user as member to space', async () => {
      // Act
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.space.communityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;
      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });

    test('Assign user as member to challenge', async () => {
      // Act
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
    test('Assign user as member to opportunity', async () => {
      // Act
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Member
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });

    test('Assign user as lead to space', async () => {
      // Act
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Lead
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.space.communityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
    test('Assign user as lead to challenge', async () => {
      // Act
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Lead
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
    test('Assign user as lead to opportunity', async () => {
      // Act
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Lead
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
  });

  describe('Remove users', () => {
    beforeAll(async () => {
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Lead
      );
    });
    test('Remove user as lead from opportunity', async () => {
      // Act
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Lead
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

      // Assert
      expect(data).toHaveLength(0);
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
    test('Remove user as lead from challenge', async () => {
      // Act
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Lead
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

      // Assert
      expect(data).toHaveLength(0);
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
    test('Remove user as lead from space', async () => {
      // Act
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Lead
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.space.communityId
      );
      const data = getCommunityData.data?.lookup.community?.leadUsers;

      // Assert
      expect(data).toHaveLength(0);
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });

    test('Remove user as member from opportunity', async () => {
      // Act
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Member
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
    test('Remove user as member from challenge', async () => {
      // Act
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
          }),
        ])
      );
    });
    test('Remove user as member from space', async () => {
      // Act
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );

      const getCommunityData = await getRoleSetMembersList(
        entitiesId.spaceId,
        entitiesId.space.communityId
      );
      const data = getCommunityData.data?.lookup.community?.memberUsers;

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonSpaceMember.email,
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
        entitiesId.space.communityId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );

      const availableUsers = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.space.communityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.qaUser.id,
          }),
        ])
      );
    });

    test('Available leads', async () => {
      const availableUsersBeforeAssign = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.space.communityId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Lead
      );

      const availableUsers = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.space.communityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.qaUser.id,
          }),
        ])
      );
    });
  });
  describe('Challenge available users', () => {
    beforeAll(async () => {
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );

      const availableUsers = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.spaceMember.id,
          }),
        ])
      );
    });

    test('Available leads', async () => {
      const availableUsersBeforeAssign = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Lead
      );

      const availableUsers = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.challenge.communityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.spaceMember.id,
          }),
        ])
      );
    });
  });
  describe('Opportunity available users', () => {
    beforeAll(async () => {
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Member
      );

      const availableUsers = await dataAvailableMemberUsers(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.qaUser.id,
          }),
        ])
      );
    });

    test('Available leads', async () => {
      const availableUsersBeforeAssign = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Lead
      );

      const availableUsers = await dataAvailableLeadUsers(
        entitiesId.spaceId,
        entitiesId.opportunity.communityId
      );

      // Assert
      expect(availableUsers.length).toEqual(
        availableUsersBeforeAssign.length + 1
      );
      expect(availableUsers).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: users.qaUser.id,
          }),
        ])
      );
    });
  });
});
