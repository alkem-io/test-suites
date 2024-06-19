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

    describe('Assign same user as member to same community', () => {
      test('Does not have any effect in Space', async () => {
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

      test('Does not have any effect in Challenge', async () => {
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

      test('Does not have any effect in Opportunity', async () => {
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
    });

    describe('Assign different users as member to same community', () => {
      test('Successfully assigned to Space', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.spaceMemberEmail,
          entitiesId.spaceCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.spaceCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.spaceMemberEmail,
            }),
          ])
        );
      });

      test('Successfully assigned to Challenge', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.spaceMemberEmail,
          entitiesId.challengeCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.challengeCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.spaceMemberEmail,
            }),
          ])
        );
      });

      test('Successfully assigned to Opportunity', async () => {
        // Act
        await assignCommunityRoleToUserCodegen(
          users.spaceMemberEmail,
          entitiesId.opportunityCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.opportunityCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberUsers;

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.spaceMemberEmail,
            }),
          ])
        );
      });
    });

    describe('Assign same user as lead to same community', () => {
      test('Does not have any effect in Space', async () => {
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

      test('Does not have any effect in Challenge', async () => {
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

      test('Does not have any effect in Opportunity', async () => {
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
  });
});

describe('Assign different users as lead to same community', () => {
  beforeAll(async () => {
    await assignUsersToSpaceAndOrgAsMembersCodegen();
    await assignUsersToChallengeAsMembersCodegen();
    await assignUsersToOpportunityAsMembersCodegen();

    await assignCommunityRoleToUserCodegen(
      users.qaUserEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      users.qaUserEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      users.qaUserEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Member
    );

    await assignCommunityRoleToUserCodegen(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );

    await assignCommunityRoleToUserCodegen(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    await assignCommunityRoleToUserCodegen(
      users.spaceAdminEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );
  });
  afterAll(async () => {
    await removeCommunityRoleFromUserCodegen(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.opportunityAdminEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Member
    );

    await removeCommunityRoleFromUserCodegen(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );

    await removeCommunityRoleFromUserCodegen(
      users.spaceAdminEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );
  });

  test('Should assign second user as Space lead', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.spaceMemberEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.spaceCommunityId
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
          email: users.spaceMemberEmail,
        }),
      ])
    );
  });

  test('Should throw error for assigning third user as Space lead', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.qaUserEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.spaceCommunityId
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
          email: users.qaUserEmail,
        }),
      ])
    );
  });

  test('Should assign second user as Challenge lead', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.challengeMemberEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.challengeCommunityId
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
          email: users.challengeMemberEmail,
        }),
      ])
    );
  });

  test('Should throw error for assigning third user as Challenge lead', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.qaUserEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.challengeCommunityId
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
          email: users.qaUserEmail,
        }),
      ])
    );
  });

  test('Should assign second user as Opportunity lead', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.opportunityMemberEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.opportunityCommunityId
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
          email: users.opportunityMemberEmail,
        }),
      ])
    );
  });

  test('Should throw error for assigning third user as Challenge lead', async () => {
    // Act
    const res = await assignCommunityRoleToUserCodegen(
      users.qaUserEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );

    const getCommunityData = await getCommunityMembersListCodegen(
      entitiesId.spaceId,
      entitiesId.opportunityCommunityId
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
          email: users.qaUserEmail,
        }),
      ])
    );
  });
});
