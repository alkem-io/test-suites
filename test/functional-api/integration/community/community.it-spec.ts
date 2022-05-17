import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { challengesData } from '@test/utils/common-params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignOrganizationAsCommunityMember,
  assignOrganizationAsCommunityLead,
  assignOrganizationAsCommunityMemberVariablesData,
  assignUserAsCommunityLead,
  assignUserAsCommunityLeadVariablesData,
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  removeOrganizationAsCommunityMember,
  removeOrganizationMemberFromCommunityVariablesData,
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  getChallengeData,
  getChallengesData,
  removeChallenge,
} from '../challenge/challenge.request.params';
import { getHubData, removeHub } from '../hub/hub.request.params';
import {
  getOpportunityData,
  removeOpportunity,
} from '../opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';

const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
const opportunityName = 'aspect-opp';
const challengeName = 'aspect-chal';

const dataHubMemberTypes = async (
  hubId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getHubData(entitiesId.hubId);

  const hubUesrsMembers = responseQuery.body.data.hub.community.memberUsers;
  const hubOrganizationMembers =
    responseQuery.body.data.hub.community.memberOrganizations;
  const hubLeadUsers = responseQuery.body.data.hub.community.leadUsers;
  const hubLeadOrganizations =
    responseQuery.body.data.hub.community.leadOrganizations;

  return [
    hubUesrsMembers,
    hubOrganizationMembers,
    hubLeadUsers,
    hubLeadOrganizations,
  ];
};

const dataChallengeMemberTypes = async (
  hubId: string,
  challengeId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getChallengeData(
    entitiesId.hubId,
    entitiesId.challengeId
  );

  const challengeUesrsMembers =
    responseQuery.body.data.hub.challenge.community.memberUsers;
  const challengeOrganizationMembers =
    responseQuery.body.data.hub.challenge.community.memberOrganizations;
  const challengeLeadUsers =
    responseQuery.body.data.hub.challenge.community.leadUsers;
  const challengeLeadOrganizations =
    responseQuery.body.data.hub.challenge.community.leadOrganizations;

  return [
    challengeUesrsMembers,
    challengeOrganizationMembers,
    challengeLeadUsers,
    challengeLeadOrganizations,
  ];
};

const dataOpportunityMemberTypes = async (
  hubId: string,
  opportunityId: string
): Promise<[
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined
]> => {
  const responseQuery = await getOpportunityData(
    entitiesId.hubId,
    entitiesId.opportunityId
  );

  const opportunityUsersMembers =
    responseQuery.body.data.hub.opportunity.community.memberUsers;
  const opportunityOrganizationMembers =
    responseQuery.body.data.hub.opportunity.community.memberOrganizations;
  const opportunityLeadUsers =
    responseQuery.body.data.hub.opportunity.community.leadUsers;
  const opportunityLeadOrganizations =
    responseQuery.body.data.hub.opportunity.community.leadOrganizations;

  return [
    opportunityUsersMembers,
    opportunityOrganizationMembers,
    opportunityLeadUsers,
    opportunityLeadOrganizations,
  ];
};

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

describe('Community', () => {
  describe('Assign / Remove members to community', () => {
    test('Assign user as member to hub', async () => {
      // Act
      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.hubCommunityId,
          users.nonHubMemberEmail
        )
      );

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonHubMemberEmail,
          }),
        ])
      );
    });
    test('Assign user as member to challenge', async () => {
      // Act
      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.challengeCommunityId,
          users.nonHubMemberEmail
        )
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.hubId,
        entitiesId.challengeId
      );
      const data = getCommunityData[0];
      // console.log(data);

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonHubMemberEmail,
          }),
        ])
      );
    });
    test('Assign user as member to opportunity', async () => {
      // Act
      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.opportunityCommunityId,
          users.nonHubMemberEmail
        )
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.hubId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[0];
      // console.log(data);

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonHubMemberEmail,
          }),
        ])
      );
    });

    test('Assign organization as member to hub', async () => {
      // Act
      await mutation(
        assignOrganizationAsCommunityMember,
        assignOrganizationAsCommunityMemberVariablesData(
          entitiesId.hubCommunityId,
          hostNameId
        )
      );

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: hostNameId,
          }),
        ])
      );
    });
    test('Assign organization as member to challenge', async () => {
      // Act
      await mutation(
        assignOrganizationAsCommunityMember,
        assignOrganizationAsCommunityMemberVariablesData(
          entitiesId.challengeCommunityId,
          hostNameId
        )
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.hubId,
        entitiesId.challengeId
      );
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: hostNameId,
          }),
        ])
      );
    });
    test('Assign organization as member to opportunity', async () => {
      // Act
      await mutation(
        assignOrganizationAsCommunityMember,
        assignOrganizationAsCommunityMemberVariablesData(
          entitiesId.opportunityCommunityId,
          hostNameId
        )
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.hubId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: hostNameId,
          }),
        ])
      );
    });

    test('Remove user as member from opportunity', async () => {
      // Act
      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.opportunityCommunityId,
          users.nonHubMemberEmail
        )
      );

      await mutation(
        removeUserAsCommunityMember,
        removeUserMemberFromCommunityVariablesData(
          entitiesId.opportunityCommunityId,
          users.nonHubMemberEmail
        )
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.hubId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonHubMemberEmail,
          }),
        ])
      );
    });
    test('Remove user as member from challenge', async () => {
      // Act
      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.challengeCommunityId,
          users.nonHubMemberEmail
        )
      );

      await mutation(
        removeUserAsCommunityMember,
        removeUserMemberFromCommunityVariablesData(
          entitiesId.challengeCommunityId,
          users.nonHubMemberEmail
        )
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.hubId,
        entitiesId.challengeId
      );
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonHubMemberEmail,
          }),
        ])
      );
    });
    test('Remove user as member from hub', async () => {
      // Act
      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.hubCommunityId,
          users.nonHubMemberEmail
        )
      );

      await mutation(
        removeUserAsCommunityMember,
        removeUserMemberFromCommunityVariablesData(
          entitiesId.hubCommunityId,
          users.nonHubMemberEmail
        )
      );

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[0];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            email: users.nonHubMemberEmail,
          }),
        ])
      );
    });

    test('Remove organization as member from opportunity', async () => {
      // Act
      await mutation(
        assignOrganizationAsCommunityMember,
        assignOrganizationAsCommunityMemberVariablesData(
          entitiesId.opportunityCommunityId,
          hostNameId
        )
      );

      await mutation(
        removeOrganizationAsCommunityMember,
        removeOrganizationMemberFromCommunityVariablesData(
          entitiesId.opportunityCommunityId,
          hostNameId
        )
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.hubId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from challenge', async () => {
      // Act
      await mutation(
        assignOrganizationAsCommunityMember,
        assignOrganizationAsCommunityMemberVariablesData(
          entitiesId.challengeCommunityId,
          hostNameId
        )
      );

      await mutation(
        removeOrganizationAsCommunityMember,
        removeOrganizationMemberFromCommunityVariablesData(
          entitiesId.challengeCommunityId,
          hostNameId
        )
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.hubId,
        entitiesId.challengeId
      );
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from hub', async () => {
      // Act
      await mutation(
        assignOrganizationAsCommunityMember,
        assignOrganizationAsCommunityMemberVariablesData(
          entitiesId.hubCommunityId,
          hostNameId
        )
      );

      await mutation(
        removeOrganizationAsCommunityMember,
        removeOrganizationMemberFromCommunityVariablesData(
          entitiesId.hubCommunityId,
          hostNameId
        )
      );

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(0);
    });
  });

  describe('Assign / Remove leads to entities', () => {
    test('Assign user as lead to hub', async () => {
      // Act
      const a = await mutation(
        assignUserAsCommunityLead,
        assignUserAsCommunityLeadVariablesData(
          entitiesId.hubCommunityId,
          users.nonHubMemberEmail
        )
      );
      console.log(a.body);

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: users.nonHubMemberEmail,
          }),
        ])
      );
    });
    test('Assign user as lead to challenge', async () => {
      // Act
    });
    test('Assign user as lead to opportunity', async () => {
      // Act
    });

    test('Assign organization as lead to hub', async () => {
      // Act
      const a = await mutation(
        assignOrganizationAsCommunityLead,
        assignOrganizationAsCommunityMemberVariablesData(
          entitiesId.hubCommunityId,
          entitiesId.organizationId
        )
      );
      console.log(a.body);

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[2];

      // Assert
      expect(data).toHaveLength(1);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nameID: hostNameId,
          }),
        ])
      );
    });
    test('Assign organization as lead to challenge', async () => {
      // Act
    });
    test('Assign organization as lead to opportunity', async () => {
      // Act
    });

    test('Remove user as lead from opportunity', async () => {
      // Act
    });
    test('Remove user as lead from challenge', async () => {
      // Act
    });
    test('Remove user as lead from hub', async () => {
      // Act
    });

    test('Remove organization as lead from opportunity', async () => {
      // Act
    });
    test('Remove organization as lead from challenge', async () => {
      // Act
    });
    test('Remove organization as lead from hub', async () => {
      // Act
    });
  });

  describe('Assign / Remove to community - edge cases', () => {
    describe('Users', () => {
      test('Assign same user as member twice to hub community', async () => {
        // Act
      });

      test('Assign same user as member twice to challenge community', async () => {
        // Act
      });

      test('Assign same user as member twice to opportunity community', async () => {
        // Act
      });

      test('Assign same user as member and lead to same hub community', async () => {
        // Act
      });

      test('Assign 2 different user as members to same hub community', async () => {
        // Act
      });

      test('Remove all users as members and leads from a community', async () => {
        // Act
      });
    });
    describe('Organizations', () => {
      test('Assign same user as member twice to hub community', async () => {
        // Act
      });

      test('Assign same user as member and lead to same hub community', async () => {
        // Act
      });

      test('Assign 2 different user as members to same hub community', async () => {
        // Act
      });

      test('Remove all users as members and leads from a community', async () => {
        // Act
      });
    });
  });
});
