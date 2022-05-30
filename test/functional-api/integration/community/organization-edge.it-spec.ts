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
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
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
let newOrgId = '';
const newOrdNameId = 'ha' + organizationName;
const newOrgName = 'ha' + hostNameId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);

  const res = await createOrganization(newOrgName, newOrdNameId);
  newOrgId = res.body.data.createOrganization.id;
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
  await deleteOrganization(newOrgId);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organizations', () => {
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
    describe('Assign same organization as member to same community', () => {
      test('Error is thrown for Hub', async () => {
        // Act
        const res = await assignOrganizationAsCommunityMemberFunc(
          entitiesId.hubCommunityId,
          hostNameId
        );

        const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
        const data = getCommunityData[1];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: hub-member`
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
          entitiesId.hubId,
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
          entitiesId.hubId,
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
      test('Successfully assigned to Hub', async () => {
        // Act
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.hubCommunityId,
          newOrdNameId
        );
        const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
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
          entitiesId.hubId,
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
          entitiesId.hubId,
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
      test('Error is thrown for Hub', async () => {
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
      test('Error is thrown for Challenge', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
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
          entitiesId.hubId,
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

    describe('Assign different users as lead to same community', () => {
      const errorMaxOrgLimit =
        'Max limit of organizations reached, cannot assign new organization.';
      beforeAll(async () => {
        await assignOrganizationAsCommunityMemberFunc(
          entitiesId.hubCommunityId,
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
          entitiesId.hubCommunityId,
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
      test('Should throw error for assigning second organization as Hub lead', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
          entitiesId.hubCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataHubMemberTypes(entitiesId.hubId);
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(errorMaxOrgLimit);
        expect(data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: newOrdNameId,
            }),
          ])
        );
      });
      test('Should assign second organization as Challenge lead', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
          entitiesId.challengeCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataChallengeMemberTypes(
          entitiesId.hubId,
          entitiesId.challengeId
        );
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(2);
        expect(res.text).not.toContain(errorMaxOrgLimit);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: newOrdNameId,
            }),
          ])
        );
      });
      test('Should assign second user as Opportunity lead', async () => {
        // Act
        const res = await assignOrganizationAsCommunityLeadFunc(
          entitiesId.opportunityCommunityId,
          newOrdNameId
        );

        const getCommunityData = await dataOpportunityMemberTypes(
          entitiesId.hubId,
          entitiesId.opportunityId
        );
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(2);
        expect(res.text).not.toContain(errorMaxOrgLimit);
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: newOrdNameId,
            }),
          ])
        );
      });
    });
  });
});
