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
import {
  assignCommunityRoleToOrganization,
  removeCommunityRoleFromOrganization,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';

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
      // await assignOrganizationAsCommunityMemberFunc(
      //   entitiesId.spaceCommunityId,
      //   hostNameId
      // );
      // await assignOrganizationAsCommunityMemberFunc(
      //   entitiesId.challengeCommunityId,
      //   hostNameId
      // );
      // await assignOrganizationAsCommunityMemberFunc(
      //   entitiesId.opportunityCommunityId,
      //   hostNameId
      // );
      // await assignOrganizationAsCommunityLeadFunc(
      //   entitiesId.spaceCommunityId,
      //   hostNameId
      // );
      // await assignOrganizationAsCommunityLeadFunc(
      //   entitiesId.challengeCommunityId,
      //   entitiesId.organizationId
      // );
      // await assignOrganizationAsCommunityLeadFunc(
      //   entitiesId.opportunityCommunityId,
      //   entitiesId.organizationId
      // );

      await assignCommunityRoleToOrganization(
        hostNameId,
        entitiesId.opportunityCommunityId,
        RoleType.MEMBER
      );
      await assignCommunityRoleToOrganization(
        hostNameId,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );

      await assignCommunityRoleToOrganization(
        hostNameId,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );

      await assignCommunityRoleToOrganization(
        entitiesId.organizationId,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
      );
      await assignCommunityRoleToOrganization(
        entitiesId.organizationId,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
      );

      await assignCommunityRoleToOrganization(
        entitiesId.organizationId,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );
    });
    afterAll(async () => {
      // await removeOrganizationAsCommunityMemberFunc(
      //   entitiesId.opportunityCommunityId,
      //   hostNameId
      // );
      // await removeOrganizationAsCommunityMemberFunc(
      //   entitiesId.challengeCommunityId,
      //   hostNameId
      // );
      // await removeOrganizationAsCommunityMemberFunc(
      //   entitiesId.spaceCommunityId,
      //   hostNameId
      // );
      // await removeOrganizationAsCommunityLeadFunc(
      //   entitiesId.opportunityCommunityId,
      //   entitiesId.organizationId
      // );
      // await removeOrganizationAsCommunityLeadFunc(
      //   entitiesId.challengeCommunityId,
      //   entitiesId.organizationId
      // );
      // await removeOrganizationAsCommunityLeadFunc(
      //   entitiesId.spaceCommunityId,
      //   entitiesId.organizationId
      // );

      await removeCommunityRoleFromOrganization(
        hostNameId,
        entitiesId.opportunityCommunityId,
        RoleType.MEMBER
      );
      await removeCommunityRoleFromOrganization(
        hostNameId,
        entitiesId.challengeCommunityId,
        RoleType.MEMBER
      );

      await removeCommunityRoleFromOrganization(
        hostNameId,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );

      await removeCommunityRoleFromOrganization(
        entitiesId.organizationId,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
      );
      await removeCommunityRoleFromOrganization(
        entitiesId.organizationId,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
      );

      await removeCommunityRoleFromOrganization(
        entitiesId.organizationId,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );
    });
    describe('Assign same organization as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignCommunityRoleToOrganization(
          hostNameId,
          entitiesId.spaceCommunityId,
          RoleType.MEMBER
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
        const res = await assignCommunityRoleToOrganization(
          hostNameId,
          entitiesId.challengeCommunityId,
          RoleType.MEMBER
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
        const res = await assignCommunityRoleToOrganization(
          hostNameId,
          entitiesId.opportunityCommunityId,
          RoleType.MEMBER
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
        await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.spaceCommunityId,
          RoleType.MEMBER
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

        await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.challengeCommunityId,
          RoleType.MEMBER
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

        await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.opportunityCommunityId,
          RoleType.MEMBER
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
        const res = await assignCommunityRoleToOrganization(
          hostNameId,
          entitiesId.spaceCommunityId,
          RoleType.LEAD
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(1);
        expect(res.text).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: space-lead`
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
        const res = await assignCommunityRoleToOrganization(
          hostNameId,
          entitiesId.challengeCommunityId,
          RoleType.LEAD
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
         const res = await assignCommunityRoleToOrganization(
          hostNameId,
          entitiesId.opportunityCommunityId,
          RoleType.LEAD
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
        await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.opportunityCommunityId,
          RoleType.MEMBER
        );
        await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.challengeCommunityId,
          RoleType.MEMBER
        );

        await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.spaceCommunityId,
          RoleType.MEMBER
        );

        await assignCommunityRoleToOrganization(
          entitiesId.organizationId,
          entitiesId.opportunityCommunityId,
          RoleType.LEAD
        );
        await assignCommunityRoleToOrganization(
          entitiesId.organizationId,
          entitiesId.challengeCommunityId,
          RoleType.LEAD
        );

        await assignCommunityRoleToOrganization(
          entitiesId.organizationId,
          entitiesId.spaceCommunityId,
          RoleType.LEAD
        );
      });

      // to be verified
      test.skip('Error is thrown for Space', async () => {
        // Act
        const res = await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.spaceCommunityId,
          RoleType.LEAD
        );

        const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
        const data = getCommunityData[3];

        // Assert
        expect(data).toHaveLength(2);
        expect(res.text).toContain(
          'Max limit of organizations reached for role \'lead\': 1, cannot assign new organization'
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
        const res = await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.challengeCommunityId,
          RoleType.LEAD
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
        const res = await assignCommunityRoleToOrganization(
          newOrdNameId,
          entitiesId.opportunityCommunityId,
          RoleType.LEAD
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
