import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpace } from '../../journey/space/space.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';

import { entitiesId } from '../../../types/entities-helper';
import {
  getRoleSetUsersInLeadRole,
  getRoleSetUsersInMemberRole,
  getRoleSetMembersList,
} from '../roleset.request.params';
import { users } from '@test/utils/queries/users-data';
import { assignRoleToUser, removeRoleFromUser } from '../roles-request.params';
import { CommunityRoleType } from '@test/generated/graphql';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.opportunity.roleSetId,
    CommunityRoleType.Lead
  );

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Lead
  );

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.space.roleSetId,
    CommunityRoleType.Lead
  );
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Assign / Remove users to community', () => {
  describe('Assign users', () => {
    afterAll(async () => {
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Lead
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Lead
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.space.roleSetId,
        CommunityRoleType.Lead
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Member
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );

      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );
    });
    test('Assign user as member to space', async () => {
      // Act
      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.space.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;
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
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.challenge.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

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
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.opportunity.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

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
        entitiesId.space.roleSetId,
        CommunityRoleType.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.space.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

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
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.challenge.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

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
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.opportunity.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

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
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Lead
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.roleSetId,
        CommunityRoleType.Lead
      );
    });
    test('Remove user as lead from opportunity', async () => {
      // Act
      await removeRoleFromUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.opportunity.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

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
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.challenge.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

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
        entitiesId.space.roleSetId,
        CommunityRoleType.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.space.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

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
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.opportunity.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

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
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.challenge.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

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
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      const roleSetMembers = await getRoleSetMembersList(
        entitiesId.space.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

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
      const availableUsersBeforeAssign = await getRoleSetUsersInMemberRole(
        entitiesId.space.roleSetId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      const availableUsers = await getRoleSetUsersInMemberRole(
        entitiesId.space.roleSetId
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
      const availableUsersBeforeAssign = await getRoleSetUsersInLeadRole(
        entitiesId.space.roleSetId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.space.roleSetId,
        CommunityRoleType.Lead
      );

      const availableUsers = await getRoleSetUsersInLeadRole(
        entitiesId.space.roleSetId
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
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await getRoleSetUsersInMemberRole(
        entitiesId.challenge.roleSetId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );

      const availableUsers = await getRoleSetUsersInMemberRole(
        entitiesId.challenge.roleSetId
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
      const availableUsersBeforeAssign = await getRoleSetUsersInLeadRole(
        entitiesId.challenge.roleSetId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Lead
      );

      const availableUsers = await getRoleSetUsersInLeadRole(
        entitiesId.challenge.roleSetId
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
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );
    });
    test('Available members', async () => {
      const availableUsersBeforeAssign = await getRoleSetUsersInMemberRole(
        entitiesId.opportunity.roleSetId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Member
      );

      const availableUsers = await getRoleSetUsersInMemberRole(
        entitiesId.opportunity.roleSetId
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
      const availableUsersBeforeAssign = await getRoleSetUsersInLeadRole(
        entitiesId.opportunity.roleSetId
      );

      await assignRoleToUser(
        users.nonSpaceMember.email,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Lead
      );

      const availableUsers = await getRoleSetUsersInLeadRole(
        entitiesId.opportunity.roleSetId
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
