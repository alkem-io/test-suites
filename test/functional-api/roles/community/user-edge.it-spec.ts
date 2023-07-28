/* eslint-disable prettier/prettier */
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndSpace,
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  assignUsersToSpaceAndOrg,
  assignUsersToChallenge,
  assignUsersToOpportunityAsMembers,
  assignUsersToChallengeAsMembers,
  assignUsersToSpaceAndOrgAsMembers,
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

    describe('Assign same user as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignCommunityRoleToUser(
          users.nonSpaceMemberEmail,
          entitiesId.spaceCommunityId,
          RoleType.MEMBER
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[0];

        // Assert
        expect(data).toHaveLength(2);
        expect(res.text).toContain(
          `Agent (${users.nonSpaceMemberEmail}) already has assigned credential: space-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonSpaceMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Challenge', async () => {
        // Act
        const res = await assignCommunityRoleToUser(
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
        expect(res.text).toContain(
          `Agent (${users.nonSpaceMemberEmail}) already has assigned credential: challenge-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonSpaceMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Opportunity', async () => {
        // Act
        const res = await assignCommunityRoleToUser(
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
        expect(res.text).toContain(
          `Agent (${users.nonSpaceMemberEmail}) already has assigned credential: opportunity-member`
        );
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
        await assignCommunityRoleToUser(
          users.spaceMemberEmail,
          entitiesId.spaceCommunityId,
          RoleType.MEMBER
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[0];

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
        await assignCommunityRoleToUser(
          users.spaceMemberEmail,
          entitiesId.challengeCommunityId,
          RoleType.MEMBER
        );

        const getCommunityData = await dataChallengeMemberTypes(
          entitiesId.spaceId,
          entitiesId.challengeId
        );
        const data = getCommunityData[0];

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
        await assignCommunityRoleToUser(
          users.spaceMemberEmail,
          entitiesId.opportunityCommunityId,
          RoleType.MEMBER
        );

        const getCommunityData = await dataOpportunityMemberTypes(
          entitiesId.spaceId,
          entitiesId.opportunityId
        );
        const data = getCommunityData[0];

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
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignCommunityRoleToUser(
          users.nonSpaceMemberEmail,
          entitiesId.spaceCommunityId,
          RoleType.LEAD
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[2];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (${users.nonSpaceMemberEmail}) already has assigned credential: space-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonSpaceMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Challenge', async () => {
        // Act
        const res = await assignCommunityRoleToUser(
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
        expect(res.text).toContain(
          `Agent (${users.nonSpaceMemberEmail}) already has assigned credential: challenge-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonSpaceMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Opportunity', async () => {
        // Act
        const res = await assignCommunityRoleToUser(
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
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (${users.nonSpaceMemberEmail}) already has assigned credential: opportunity-lead`
        );
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
    await assignUsersToSpaceAndOrgAsMembers();
    await assignUsersToChallengeAsMembers();
    await assignUsersToOpportunityAsMembers();

    await assignCommunityRoleToUser(
      users.qaUserEmail,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
    );

    await assignCommunityRoleToUser(
      users.qaUserEmail,
      entitiesId.challengeCommunityId,
      RoleType.MEMBER
    );

    await assignCommunityRoleToUser(
      users.qaUserEmail,
      entitiesId.opportunityCommunityId,
      RoleType.MEMBER
    );

    await assignCommunityRoleToUser(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      RoleType.LEAD
    );

    await assignCommunityRoleToUser(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      RoleType.LEAD
    );

    await assignCommunityRoleToUser(
      users.spaceAdminEmail,
      entitiesId.spaceCommunityId,
      RoleType.LEAD
    );
  });
  afterAll(async () => {
    await removeCommunityRoleFromUser(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      RoleType.LEAD
    );

    await removeCommunityRoleFromUser(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      RoleType.LEAD
    );

    await removeCommunityRoleFromUser(
      users.opportunityAdminEmail,
      entitiesId.spaceCommunityId,
      RoleType.LEAD
    );

    await removeCommunityRoleFromUser(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      RoleType.MEMBER
    );

    await removeCommunityRoleFromUser(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      RoleType.MEMBER
    );

    await removeCommunityRoleFromUser(
      users.spaceAdminEmail,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
    );
  });

  test('Should assign second user as Space lead', async () => {
    // Act
    const res = await assignCommunityRoleToUser(
      users.spaceMemberEmail,
      entitiesId.spaceCommunityId,
      RoleType.LEAD
    );

    const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).not.toContain(
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
    const res = await assignCommunityRoleToUser(
      users.qaUserEmail,
      entitiesId.spaceCommunityId,
      RoleType.LEAD
    );

    const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).toContain(
      'Max limit of users reached for role \'lead\': 2, cannot assign new user.'
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
    const res = await assignCommunityRoleToUser(
      users.challengeMemberEmail,
      entitiesId.challengeCommunityId,
      RoleType.LEAD
    );

    const getCommunityData = await dataChallengeMemberTypes(
      entitiesId.spaceId,
      entitiesId.challengeId
    );
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).not.toContain(
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
    const res = await assignCommunityRoleToUser(
      users.qaUserEmail,
      entitiesId.challengeCommunityId,
      RoleType.LEAD
    );

    const getCommunityData = await dataChallengeMemberTypes(
      entitiesId.spaceId,
      entitiesId.challengeId
    );
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).toContain(
      'Max limit of users reached for role \'lead\': 2, cannot assign new user.'
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
    const res = await assignCommunityRoleToUser(
      users.opportunityMemberEmail,
      entitiesId.opportunityCommunityId,
      RoleType.LEAD
    );

    const getCommunityData = await dataOpportunityMemberTypes(
      entitiesId.spaceId,
      entitiesId.opportunityId
    );
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).not.toContain(
      'Max limit of users reached for role \'lead\': 2, cannot assign new user'
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
    const res = await assignCommunityRoleToUser(
      users.qaUserEmail,
      entitiesId.opportunityCommunityId,
      RoleType.LEAD
    );

    const getCommunityData = await dataOpportunityMemberTypes(
      entitiesId.spaceId,
      entitiesId.opportunityId
    );
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).toContain(
      'Max limit of users reached for role \'lead\': 2, cannot assign new user'
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
