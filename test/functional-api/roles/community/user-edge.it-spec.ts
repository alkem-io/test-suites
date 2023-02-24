/* eslint-disable prettier/prettier */
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  assignUsersToHubAndOrg,
  assignUsersToChallenge,
  assignUsersToOpportunityAsMembers,
  assignUsersToChallengeAsMembers,
  assignUsersToHubAndOrgAsMembers,
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
import { removeHub } from '../../integration/hub/hub.request.params';
import { removeOpportunity } from '../../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import {
  dataChallengeMemberTypes,
  dataHubMemberTypes,
  dataOpportunityMemberTypes,
} from './community.request.params';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const hubName = 'com-eco-name' + uniqueId;
const hubNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Assign / Remove users to community', () => {
  describe('Assign users', () => {
    beforeAll(async () => {
      await assignUserAsCommunityMemberFunc(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      );
      await assignUserAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        users.nonHubMemberEmail
      );
      await assignUserAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        users.nonHubMemberEmail
      );
      await assignUserAsCommunityLeadFunc(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      );
      await assignUserAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        users.nonHubMemberEmail
      );
      await assignUserAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        users.nonHubMemberEmail
      );
    });
    afterAll(async () => {
      await removeUserAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        users.nonHubMemberEmail
      );
      await removeUserAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        users.nonHubMemberEmail
      );
      await removeUserAsCommunityLeadFunc(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      );
      await removeUserAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        users.nonHubMemberEmail
      );
      await removeUserAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        users.nonHubMemberEmail
      );
      await removeUserAsCommunityMemberFunc(
        entitiesId.hubCommunityId,
        users.nonHubMemberEmail
      );
    });

    describe('Assign same user as member to same community', () => {
      test('Error is thrown for Hub', async () => {
        // Act
        const res = await assignUserAsCommunityMemberFunc(
          entitiesId.hubCommunityId,
          users.nonHubMemberEmail
        );

        const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
        const data = getCommunityData[0];

        // Assert
        expect(data).toHaveLength(2);
        expect(res.text).toContain(
          `Agent (${users.nonHubMemberEmail}) already has assigned credential: hub-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonHubMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Challenge', async () => {
        // Act
        const res = await assignUserAsCommunityMemberFunc(
          entitiesId.challengeCommunityId,
          users.nonHubMemberEmail
        );

        const getCommunityData = await dataChallengeMemberTypes(
          entitiesId.hubId,
          entitiesId.challengeId
        );
        const data = getCommunityData[0];

        // Assert
        expect(data).toHaveLength(2);
        expect(res.text).toContain(
          `Agent (${users.nonHubMemberEmail}) already has assigned credential: challenge-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonHubMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Opportunity', async () => {
        // Act
        const res = await assignUserAsCommunityMemberFunc(
          entitiesId.opportunityCommunityId,
          users.nonHubMemberEmail
        );

        const getCommunityData = await dataOpportunityMemberTypes(
          entitiesId.hubId,
          entitiesId.opportunityId
        );
        const data = getCommunityData[0];

        // Assert
        expect(data).toHaveLength(2);
        expect(res.text).toContain(
          `Agent (${users.nonHubMemberEmail}) already has assigned credential: opportunity-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonHubMemberEmail,
            }),
          ])
        );
      });
    });

    describe('Assign different users as member to same community', () => {
      test('Successfully assigned to Hub', async () => {
        // Act
        await assignUserAsCommunityMemberFunc(
          entitiesId.hubCommunityId,
          users.hubMemberEmail
        );

        const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
        const data = getCommunityData[0];

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.hubMemberEmail,
            }),
          ])
        );
      });

      test('Successfully assigned to Challenge', async () => {
        // Act
        await assignUserAsCommunityMemberFunc(
          entitiesId.challengeCommunityId,
          users.hubMemberEmail
        );

        const getCommunityData = await dataChallengeMemberTypes(
          entitiesId.hubId,
          entitiesId.challengeId
        );
        const data = getCommunityData[0];

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.hubMemberEmail,
            }),
          ])
        );
      });

      test('Successfully assigned to Opportunity', async () => {
        // Act
        await assignUserAsCommunityMemberFunc(
          entitiesId.opportunityCommunityId,
          users.hubMemberEmail
        );

        const getCommunityData = await dataOpportunityMemberTypes(
          entitiesId.hubId,
          entitiesId.opportunityId
        );
        const data = getCommunityData[0];

        // Assert
        expect(data).toHaveLength(3);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.hubMemberEmail,
            }),
          ])
        );
      });
    });

    describe('Assign same user as lead to same community', () => {
      test('Error is thrown for Hub', async () => {
        // Act
        const res = await assignUserAsCommunityLeadFunc(
          entitiesId.hubCommunityId,
          users.nonHubMemberEmail
        );

        const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
        const data = getCommunityData[2];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (${users.nonHubMemberEmail}) already has assigned credential: hub-host`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonHubMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Challenge', async () => {
        // Act
        const res = await assignUserAsCommunityLeadFunc(
          entitiesId.challengeCommunityId,
          users.nonHubMemberEmail
        );

        const getCommunityData = await dataChallengeMemberTypes(
          entitiesId.hubId,
          entitiesId.challengeId
        );
        const data = getCommunityData[2];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (${users.nonHubMemberEmail}) already has assigned credential: challenge-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonHubMemberEmail,
            }),
          ])
        );
      });

      test('Error is thrown for Opportunity', async () => {
        // Act
        const res = await assignUserAsCommunityLeadFunc(
          entitiesId.opportunityCommunityId,
          users.nonHubMemberEmail
        );

        const getCommunityData = await dataOpportunityMemberTypes(
          entitiesId.hubId,
          entitiesId.opportunityId
        );
        const data = getCommunityData[2];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (${users.nonHubMemberEmail}) already has assigned credential: opportunity-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: users.nonHubMemberEmail,
            }),
          ])
        );
      });
    });
  });
});

describe('Assign different users as lead to same community', () => {
  beforeAll(async () => {
    await assignUsersToHubAndOrgAsMembers();
    await assignUsersToChallengeAsMembers();
    await assignUsersToOpportunityAsMembers();

    await assignUserAsCommunityMemberFunc(
      entitiesId.hubCommunityId,
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
      entitiesId.hubCommunityId,
      users.hubAdminEmail
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
      entitiesId.hubCommunityId,
      users.hubAdminEmail
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
      entitiesId.hubCommunityId,
      users.hubAdminEmail
    );
  });

  test('Should assign second user as Hub lead', async () => {
    // Act
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      users.hubMemberEmail
    );
    const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
    const data = getCommunityData[2];

    // Assert
    expect(data).toHaveLength(2);
    expect(res.text).not.toContain(
      '"Max limit of users reached for role \'lead\': 2, cannot assign new user."'
    );
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.hubMemberEmail,
        }),
      ])
    );
  });

  test('Should throw error for assigning third user as Hub lead', async () => {
    // Act
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      users.qaUserEmail
    );

    const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.challengeMemberEmail
    );
    const getCommunityData = await dataChallengeMemberTypes(
      entitiesId.hubId,
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
      entitiesId.hubId,
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.opportunityMemberEmail
    );
    const getCommunityData = await dataOpportunityMemberTypes(
      entitiesId.hubId,
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
    const res = await assignUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.qaUserEmail
    );

    const getCommunityData = await dataOpportunityMemberTypes(
      entitiesId.hubId,
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
