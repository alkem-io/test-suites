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
import {
  assignUserAsCommunityLeadFunc,
  assignUserAsCommunityMemberFunc,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  removeUserAsCommunityLeadFunc,
  removeUserAsCommunityMemberFunc,
} from '@test/utils/mutations/remove-mutation';
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

  await removeUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    users.globalAdminEmail
  );
  await removeUserAsCommunityLeadFunc(
    entitiesId.challengeCommunityId,
    users.globalAdminEmail
  );
  await removeUserAsCommunityLeadFunc(
    entitiesId.spaceCommunityId,
    users.globalAdminEmail
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
      await assignUserAsCommunityMemberFunc(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityLeadFunc(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        users.nonSpaceMemberEmail
      );
      await assignUserAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        users.nonSpaceMemberEmail
      );
    });
    afterAll(async () => {
      await removeUserAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        users.nonSpaceMemberEmail
      );
      await removeUserAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        users.nonSpaceMemberEmail
      );
      await removeUserAsCommunityLeadFunc(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberEmail
      );
      await removeUserAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        users.nonSpaceMemberEmail
      );
      await removeUserAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        users.nonSpaceMemberEmail
      );
      await removeUserAsCommunityMemberFunc(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberEmail
      );
    });

    describe('Assign same user as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignUserAsCommunityMemberFunc(
          entitiesId.spaceCommunityId,
          users.nonSpaceMemberEmail
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
        const res = await assignUserAsCommunityMemberFunc(
          entitiesId.challengeCommunityId,
          users.nonSpaceMemberEmail
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
        const res = await assignUserAsCommunityMemberFunc(
          entitiesId.opportunityCommunityId,
          users.nonSpaceMemberEmail
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
        await assignUserAsCommunityMemberFunc(
          entitiesId.spaceCommunityId,
          users.spaceMemberEmail
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
        await assignUserAsCommunityMemberFunc(
          entitiesId.challengeCommunityId,
          users.spaceMemberEmail
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
        await assignUserAsCommunityMemberFunc(
          entitiesId.opportunityCommunityId,
          users.spaceMemberEmail
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
        const res = await assignUserAsCommunityLeadFunc(
          entitiesId.spaceCommunityId,
          users.nonSpaceMemberEmail
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[2];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (${users.nonSpaceMemberEmail}) already has assigned credential: space-host`
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
        const res = await assignUserAsCommunityLeadFunc(
          entitiesId.challengeCommunityId,
          users.nonSpaceMemberEmail
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
        const res = await assignUserAsCommunityLeadFunc(
          entitiesId.opportunityCommunityId,
          users.nonSpaceMemberEmail
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

    await assignUserAsCommunityMemberFunc(
      entitiesId.spaceCommunityId,
      users.qaUserEmail
    );

    await assignUserAsCommunityMemberFunc(
      entitiesId.challengeCommunityId,
      users.qaUserEmail
    );

    await assignUserAsCommunityMemberFunc(
      entitiesId.opportunityCommunityId,
      users.qaUserEmail
    );

    await assignUserAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      users.spaceAdminEmail
    );
    await assignUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.challengeAdminEmail
    );
    await assignUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.opportunityAdminEmail
    );
  });
  afterAll(async () => {
    await removeUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.opportunityAdminEmail
    );
    await removeUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.challengeAdminEmail
    );
    await removeUserAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      users.spaceAdminEmail
    );
    await removeUserAsCommunityMemberFunc(
      entitiesId.opportunityCommunityId,
      users.opportunityAdminEmail
    );
    await removeUserAsCommunityMemberFunc(
      entitiesId.challengeCommunityId,
      users.challengeAdminEmail
    );
    await removeUserAsCommunityMemberFunc(
      entitiesId.spaceCommunityId,
      users.spaceAdminEmail
    );
  });

  test('Should assign second user as Space lead', async () => {
    // Act
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      users.spaceMemberEmail
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      users.qaUserEmail
    );

    const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).toContain(
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.challengeMemberEmail
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.qaUserEmail
    );

    const getCommunityData = await dataChallengeMemberTypes(
      entitiesId.spaceId,
      entitiesId.challengeId
    );
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).toContain(
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.opportunityMemberEmail
    );
    const getCommunityData = await dataOpportunityMemberTypes(
      entitiesId.spaceId,
      entitiesId.opportunityId
    );
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).not.toContain(
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.qaUserEmail
    );

    const getCommunityData = await dataOpportunityMemberTypes(
      entitiesId.spaceId,
      entitiesId.opportunityId
    );
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).toContain(
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
