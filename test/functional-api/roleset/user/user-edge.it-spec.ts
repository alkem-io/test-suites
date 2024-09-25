/* eslint-disable prettier/prettier */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import { getRoleSetMembersList } from '../roleset.request.params';
import {
  assignUsersToChallengeAsMembersCodegen,
  assignUsersToOpportunityAsMembersCodegen,
  assignUsersToSpaceAndOrgAsMembersCodegen,
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import {
  removeRoleFromUser,
  assignRoleToUser,
} from '../roles-request.params';
import { entitiesId } from '../../../types/entities-helper';
import { CommunityRoleType } from '@test/generated/alkemio-schema';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

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
  await deleteSpaceCodegen(entitiesId.opportunity.id);
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Assign / Remove users to community', () => {
  describe('Assign users', () => {
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

    describe('Assign same user as member to same community', () => {
      test('Does not have any effect in Space', async () => {
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

      test('Does not have any effect in Challenge', async () => {
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

      test('Does not have any effect in Opportunity', async () => {
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
    });

    describe('Assign different users as member to same community', () => {
      test('Successfully assigned to Space', async () => {
        // Act
        await assignRoleToUser(
          users.spaceMember.email,
          entitiesId.space.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          entitiesId.space.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.spaceMember.email,
            }),
          ])
        );
      });

      test('Successfully assigned to Challenge', async () => {
        // Act
        await assignRoleToUser(
          users.spaceMember.email,
          entitiesId.challenge.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          entitiesId.challenge.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.spaceMember.email,
            }),
          ])
        );
      });

      test('Successfully assigned to Opportunity', async () => {
        // Act
        await assignRoleToUser(
          users.spaceMember.email,
          entitiesId.opportunity.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembers = await getRoleSetMembersList(
          entitiesId.opportunity.roleSetId
        );
        const data = roleSetMembers.data?.lookup.roleSet?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.spaceMember.email,
            }),
          ])
        );
      });
    });

    describe('Assign same user as lead to same community', () => {
      test('Does not have any effect in Space', async () => {
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

      test('Does not have any effect in Challenge', async () => {
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

      test('Does not have any effect in Opportunity', async () => {
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
  });
});

describe('Assign different users as lead to same community', () => {
  beforeAll(async () => {
    await assignUsersToSpaceAndOrgAsMembersCodegen();
    await assignUsersToChallengeAsMembersCodegen();
    await assignUsersToOpportunityAsMembersCodegen();

    await assignRoleToUser(
      users.qaUser.email,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member
    );

    await assignRoleToUser(
      users.qaUser.email,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Member
    );

    await assignRoleToUser(
      users.qaUser.email,
      entitiesId.opportunity.roleSetId,
      CommunityRoleType.Member
    );

    await assignRoleToUser(
      users.opportunityAdmin.email,
      entitiesId.opportunity.roleSetId,
      CommunityRoleType.Lead
    );

    await assignRoleToUser(
      users.challengeAdmin.email,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    await assignRoleToUser(
      users.spaceAdmin.email,
      entitiesId.space.roleSetId,
      CommunityRoleType.Lead
    );
  });
  afterAll(async () => {
    await removeRoleFromUser(
      users.opportunityAdmin.email,
      entitiesId.opportunity.roleSetId,
      CommunityRoleType.Lead
    );

    await removeRoleFromUser(
      users.challengeAdmin.email,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    await removeRoleFromUser(
      users.opportunityAdmin.email,
      entitiesId.space.roleSetId,
      CommunityRoleType.Lead
    );

    await removeRoleFromUser(
      users.opportunityAdmin.email,
      entitiesId.opportunity.roleSetId,
      CommunityRoleType.Member
    );

    await removeRoleFromUser(
      users.challengeAdmin.email,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Member
    );

    await removeRoleFromUser(
      users.spaceAdmin.email,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member
    );
  });

  test('Should assign second user as Space lead', async () => {
    // Act
    const res = await assignRoleToUser(
      users.spaceMember.email,
      entitiesId.space.roleSetId,
      CommunityRoleType.Lead
    );

    const roleSetMembers = await getRoleSetMembersList(
      entitiesId.space.roleSetId
    );
    const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

    // Assert
    expect(data).toHaveLength(2);
    expect(JSON.stringify(res)).not.toContain(
      '"Max limit of users reached for role \'lead\': 2, cannot assign new user."'
    );
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.spaceMember.email,
        }),
      ])
    );
  });

  test('Should throw error for assigning third user as Space lead', async () => {
    // Act
    const res = await assignRoleToUser(
      users.qaUser.email,
      entitiesId.space.roleSetId,
      CommunityRoleType.Lead
    );

    const roleSetMembers = await getRoleSetMembersList(
      entitiesId.space.roleSetId
    );
    const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

    // Assert
    expect(data).toHaveLength(2);
    expect(JSON.stringify(res)).toContain(
      "Max limit of users reached for role 'lead': 2, cannot assign new user."
    );
    expect(data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.qaUser.email,
        }),
      ])
    );
  });

  test('Should assign second user as Challenge lead', async () => {
    // Act
    const res = await assignRoleToUser(
      users.challengeMember.email,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    const roleSetMembers = await getRoleSetMembersList(
      entitiesId.challenge.roleSetId
    );
    const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

    // Assert
    expect(data).toHaveLength(2);
    expect(JSON.stringify(res)).not.toContain(
      '"Max limit of users reached for role \'lead\': 2, cannot assign new user."'
    );
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.challengeMember.email,
        }),
      ])
    );
  });

  test('Should throw error for assigning third user as Challenge lead', async () => {
    // Act
    const res = await assignRoleToUser(
      users.qaUser.email,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    const roleSetMembers = await getRoleSetMembersList(
      entitiesId.challenge.roleSetId
    );
    const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

    // Assert
    expect(data).toHaveLength(2);
    expect(JSON.stringify(res)).toContain(
      "Max limit of users reached for role 'lead': 2, cannot assign new user."
    );
    expect(data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.qaUser.email,
        }),
      ])
    );
  });

  test('Should assign second user as Opportunity lead', async () => {
    // Act
    const res = await assignRoleToUser(
      users.opportunityMember.email,
      entitiesId.opportunity.roleSetId,
      CommunityRoleType.Lead
    );

    const roleSetMembers = await getRoleSetMembersList(
      entitiesId.opportunity.roleSetId
    );
    const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

    // Assert
    expect(data).toHaveLength(2);
    expect(JSON.stringify(res)).not.toContain(
      "Max limit of users reached for role 'lead': 2, cannot assign new user"
    );
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.opportunityMember.email,
        }),
      ])
    );
  });

  test('Should throw error for assigning third user as Challenge lead', async () => {
    // Act
    const res = await assignRoleToUser(
      users.qaUser.email,
      entitiesId.opportunity.roleSetId,
      CommunityRoleType.Lead
    );

    const roleSetMembers = await getRoleSetMembersList(
      entitiesId.opportunity.roleSetId
    );
    const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

    // Assert
    expect(data).toHaveLength(2);
    expect(JSON.stringify(res)).toContain(
      "Max limit of users reached for role 'lead': 2, cannot assign new user"
    );
    expect(data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.qaUser.email,
        }),
      ])
    );
  });
});
