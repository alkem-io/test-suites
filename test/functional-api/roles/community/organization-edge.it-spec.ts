/* eslint-disable prettier/prettier */
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
import {
  createOrganization,
  deleteOrganization,
} from '../../integration/organization/organization.request.params';
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
let newOrgId = '';
const newOrdNameId = 'ha' + organizationName;
const newOrgName = 'ha' + hostNameId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);

  const res = await createOrganization(newOrgName, newOrdNameId);
  newOrgId = res.body.data.createOrganization.id;
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
  await deleteOrganization(newOrgId);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organizations', () => {
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
    describe('Assign same organization as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignOrganizationAsCommunityMemberFunc(
          entitiesId.spaceCommunityId,
          hostNameId
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[1];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: space-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
      test('Error is thrown for Challenge', async () => {
        // Act
        const res = await assignOrganizationAsCommunityMemberFunc(
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
        expect(res.text).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: challenge-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
      test('Error is thrown for Opportunity', async () => {
        // Act
        const res = await assignOrganizationAsCommunityMemberFunc(
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
        expect(res.text).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: opportunity-member`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
    });
    describe('Assign different organization as member to same community', () => {
      test('Successfully assigned to Space', async () => {
        // Act
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.spaceCommunityId,
          newOrdNameId
        );
        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[1];

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
      test('Successfully assigned to Challenge', async () => {
        // Act
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.challengeCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataChallengeMemberTypes(
          entitiesId.spaceId,
          entitiesId.challengeId
        );
        const data = getCommunityData[1];

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
      test('Successfully assigned to Opportunity', async () => {
        // Act
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.opportunityCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataOpportunityMemberTypes(
          entitiesId.spaceId,
          entitiesId.opportunityId
        );
        const data = getCommunityData[1];

        // Assert
        expect(data).toHaveLength(2);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
    });

    describe('Assign same organization as lead to same community', () => {
      test('Error is thrown for Space', async () => {
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
      test('Error is thrown for Challenge', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
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
        expect(res.text).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: challenge-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
      test('Error is thrown for Opportunity', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
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
        expect(res.text).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: opportunity-lead`
        );
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: hostNameId,
            }),
          ])
        );
      });
    });

    describe('Assign different organizations as lead to same community', () => {
      beforeAll(async () => {
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.spaceCommunityId,
          newOrdNameId
        );
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.challengeCommunityId,
          newOrdNameId
        );
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.opportunityCommunityId,
          newOrdNameId
        );
        await assignOrganizationAsCommunityLeadFunc(
          entitiesId.spaceCommunityId,
          entitiesId.organizationId
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
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
          entitiesId.spaceCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          "Max limit of organizations reached for role 'lead': 1, cannot assign new organization"
        );
        expect(data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: newOrdNameId,
            }),
          ])
        );
      });
      test('Two organizations assinged to Challenge', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
          entitiesId.challengeCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataChallengeMemberTypes(
          entitiesId.spaceId,
          entitiesId.challengeId
        );
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(2);
      });
      test('Two organizations assinged to Opportunity', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
          entitiesId.opportunityCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataOpportunityMemberTypes(
          entitiesId.spaceId,
          entitiesId.opportunityId
        );
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(2);
      });
    });
  });
});
