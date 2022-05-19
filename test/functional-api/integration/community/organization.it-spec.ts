import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  assignOrganizationAsCommunityLeadFunc,
  assignOrganizationAsCommunityMemberFunc,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  removeOrganizationAsCommunityLeadFunc,
  removeOrganizationAsCommunityMemberFunc,
} from '@test/utils/mutations/remove-mutation';
import { removeChallenge } from '../challenge/challenge.request.params';
import { removeHub } from '../hub/hub.request.params';
import { removeOpportunity } from '../opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
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

describe('Assign / Remove organization to community', () => {
  describe('Assign organization', () => {
    afterAll(async () => {
      await removeOrganizationAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        hostNameId
      );
      await removeOrganizationAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        hostNameId
      );
      await removeOrganizationAsCommunityMemberFunc(
        entitiesId.hubCommunityId,
        hostNameId
      );
      await removeOrganizationAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        entitiesId.organizationId
      );
      await removeOrganizationAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        entitiesId.organizationId
      );
      await removeOrganizationAsCommunityLeadFunc(
        entitiesId.hubCommunityId,
        entitiesId.organizationId
      );
    });
    test('Assign organization as member to hub', async () => {
      // Act
      await assignOrganizationAsCommunityMemberFunc(
        entitiesId.hubCommunityId,
        hostNameId
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
      await assignOrganizationAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        hostNameId
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
      await assignOrganizationAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        hostNameId
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

    test('Assign organization as lead to hub', async () => {
      // Act
      const res = await assignOrganizationAsCommunityLeadFunc(
        entitiesId.hubCommunityId,
        hostNameId
      );

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(1);
      expect(res.text).toContain(
        'Max limit of organizations reached, cannot assign new organization.'
      );
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
      await assignOrganizationAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        entitiesId.organizationId
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.hubId,
        entitiesId.challengeId
      );
      const data = getCommunityData[3];

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
    test('Assign organization as lead to opportunity', async () => {
      // Act
      await assignOrganizationAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        entitiesId.organizationId
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.hubId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[3];

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
  });

  describe('Remove organization', () => {
    beforeAll(async () => {
      await assignOrganizationAsCommunityMemberFunc(
        entitiesId.hubCommunityId,
        hostNameId
      );
      await assignOrganizationAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        hostNameId
      );
      await assignOrganizationAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        hostNameId
      );
      await assignOrganizationAsCommunityLeadFunc(
        entitiesId.hubCommunityId,
        hostNameId
      );
      await assignOrganizationAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        entitiesId.organizationId
      );
      await assignOrganizationAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        entitiesId.organizationId
      );
    });
    test('Remove organization as member from opportunity', async () => {
      // Act

      await removeOrganizationAsCommunityMemberFunc(
        entitiesId.opportunityCommunityId,
        hostNameId
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

      await removeOrganizationAsCommunityMemberFunc(
        entitiesId.challengeCommunityId,
        hostNameId
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

      await removeOrganizationAsCommunityMemberFunc(
        entitiesId.hubCommunityId,
        hostNameId
      );

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(0);
    });

    test('Remove organization as lead from opportunity', async () => {
      // Act
      await removeOrganizationAsCommunityLeadFunc(
        entitiesId.opportunityCommunityId,
        entitiesId.organizationId
      );

      const getCommunityData = await dataOpportunityMemberTypes(
        entitiesId.hubId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as lead from challenge', async () => {
      // Act
      await removeOrganizationAsCommunityLeadFunc(
        entitiesId.challengeCommunityId,
        entitiesId.organizationId
      );

      const getCommunityData = await dataChallengeMemberTypes(
        entitiesId.hubId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as lead from hub', async () => {
      // Act
      await removeOrganizationAsCommunityLeadFunc(
        entitiesId.hubCommunityId,
        entitiesId.organizationId
      );

      const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(0);
    });
  });
});
