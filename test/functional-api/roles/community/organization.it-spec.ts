import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndSpace,
  createChallengeForOrgSpace,
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
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
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
        entitiesId.spaceCommunityId,
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
        entitiesId.spaceCommunityId,
        entitiesId.organizationId
      );
    });
    test('Assign organization as member to space', async () => {
      // Act
      await assignOrganizationAsCommunityMemberFunc(
        entitiesId.spaceCommunityId,
        hostNameId
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
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
        entitiesId.spaceId,
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
        entitiesId.spaceId,
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

    test('Assign organization as lead to space', async () => {
      // Act
      const res = await assignOrganizationAsCommunityLeadFunc(
        entitiesId.spaceCommunityId,
        hostNameId
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(1);
      expect(res.text).toContain(
        `Max limit of organizations reached for role '${'lead'}': 1, cannot assign new organization.`
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
        entitiesId.spaceId,
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
        entitiesId.spaceId,
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
        entitiesId.spaceCommunityId,
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
        entitiesId.spaceCommunityId,
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
        entitiesId.spaceId,
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
        entitiesId.spaceId,
        entitiesId.challengeId
      );
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from space', async () => {
      // Act

      await removeOrganizationAsCommunityMemberFunc(
        entitiesId.spaceCommunityId,
        hostNameId
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
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
        entitiesId.spaceId,
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
        entitiesId.spaceId,
        entitiesId.opportunityId
      );
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as lead from space', async () => {
      // Act
      await removeOrganizationAsCommunityLeadFunc(
        entitiesId.spaceCommunityId,
        entitiesId.organizationId
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(0);
    });
  });
});
