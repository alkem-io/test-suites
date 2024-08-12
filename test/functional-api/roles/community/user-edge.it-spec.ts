/* eslint-disable prettier/prettier */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import { getCommunityMembersListCodegen } from './community.request.params';
import {
  assignUsersToChallengeAsMembersCodegen,
  assignUsersToOpportunityAsMembersCodegen,
  assignUsersToSpaceAndOrgAsMembersCodegen,
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
    users.globalAdmin.email,
    entitiesId.opportunity.communityId,
    CommunityRole.Lead
  );

  await removeCommunityRoleFromUserCodegen(
    users.globalAdmin.email,
    entitiesId.challenge.communityId,
    CommunityRole.Lead
  );

  await removeCommunityRoleFromUserCodegen(
    users.globalAdmin.email,
    entitiesId.space.communityId,
    CommunityRole.Lead
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
    beforeAll(async () => {
      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRole.Lead
      );
    });
    afterAll(async () => {
      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRole.Lead
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRole.Lead
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRole.Lead
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.opportunity.communityId,
        CommunityRole.Member
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.challenge.communityId,
        CommunityRole.Member
      );

      await removeCommunityRoleFromUserCodegen(
        users.nonSpaceMember.email,
        entitiesId.space.communityId,
        CommunityRole.Member
      );
    });

    describe('Assign same user as member to same community', () => {
      test('Does not have any effect in Space', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.nonSpaceMember.email,
          entitiesId.space.communityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
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

      test('Does not have any effect in Challenge', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.nonSpaceMember.email,
          entitiesId.challenge.communityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
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

      test('Does not have any effect in Opportunity', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.nonSpaceMember.email,
          entitiesId.opportunity.communityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
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
    });

    describe('Assign different users as member to same community', () => {
      test('Successfully assigned to Space', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.spaceMember.email,
          entitiesId.space.communityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.space.communityId
        );
        const data = getCommunityData.data?.lookup.community?.memberUsers;

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
        await assignCommunityRoleToUserCodegen(
          users.spaceMember.email,
          entitiesId.challenge.communityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.challenge.communityId
        );
        const data = getCommunityData.data?.lookup.community?.memberUsers;

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
        await assignCommunityRoleToUserCodegen(
          users.spaceMember.email,
          entitiesId.opportunity.communityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.opportunity.communityId
        );
        const data = getCommunityData.data?.lookup.community?.memberUsers;

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
        await assignCommunityRoleToUserCodegen(
          users.nonSpaceMember.email,
          entitiesId.space.communityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
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

      test('Does not have any effect in Challenge', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.nonSpaceMember.email,
          entitiesId.challenge.communityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
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

      test('Does not have any effect in Opportunity', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.nonSpaceMember.email,
          entitiesId.opportunity.communityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
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
  });
});

describe('Assign different users as lead to same community', () => {
  beforeAll(async () => {
    await assignUsersToSpaceAndOrgAsMembersCodegen();
    await assignUsersToChallengeAsMembersCodegen();
    await assignUsersToOpportunityAsMembersCodegen();

    await assignCommunityRoleToUserCodegen(
      users.qaUser.email,
      entitiesId.space.communityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      users.qaUser.email,
      entitiesId.challenge.communityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      users.qaUser.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      users.opportunityAdmin.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Lead
    );

    await assignCommunityRoleToUserCodegen(
      users.challengeAdmin.email,
      entitiesId.challenge.communityId,
      CommunityRole.Lead
    );

    await assignCommunityRoleToUserCodegen(
      users.spaceAdmin.email,
      entitiesId.space.communityId,
      CommunityRole.Lead
    );
  });
  afterAll(async () => {
    await removeCommunityRoleFromUserCodegen(
      users.opportunityAdmin.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.challengeAdmin.email,
      entitiesId.challenge.communityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.opportunityAdmin.email,
      entitiesId.space.communityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.opportunityAdmin.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Member
    );

    await removeCommunityRoleFromUserCodegen(
      users.challengeAdmin.email,
      entitiesId.challenge.communityId,
      CommunityRole.Member
    );

    await removeCommunityRoleFromUserCodegen(
      users.spaceAdmin.email,
      entitiesId.space.communityId,
      CommunityRole.Member
    );
  });

  test('Should assign second user as Space lead', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.spaceMember.email,
      entitiesId.space.communityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.space.communityId
    );
    const data = getCommunityData.data?.lookup.community?.leadUsers;

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
    const res = await assignCommunityRoleToUserCodegen(
      users.qaUser.email,
      entitiesId.space.communityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.space.communityId
    );
    const data = getCommunityData.data?.lookup.community?.leadUsers;

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
    const res = await assignCommunityRoleToUserCodegen(
      users.challengeMember.email,
      entitiesId.challenge.communityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.challenge.communityId
    );
    const data = getCommunityData.data?.lookup.community?.leadUsers;

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
    const res = await assignCommunityRoleToUserCodegen(
      users.qaUser.email,
      entitiesId.challenge.communityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.challenge.communityId
    );
    const data = getCommunityData.data?.lookup.community?.leadUsers;

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
    const res = await assignCommunityRoleToUserCodegen(
      users.opportunityMember.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.opportunity.communityId
    );
    const data = getCommunityData.data?.lookup.community?.leadUsers;

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
    const res = await assignCommunityRoleToUserCodegen(
      users.qaUser.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.opportunity.communityId
    );
    const data = getCommunityData.data?.lookup.community?.leadUsers;

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
