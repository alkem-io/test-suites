/* eslint-disable prettier/prettier */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import { getCommunityMembersListCodegen } from './community.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
} from '@test/functional-api/organization/organization.request.params';
import { assignCommunityRoleToOrganizationCodegen, removeCommunityRoleFromOrganizationCodegen } from '../roles-request.params';
import { entitiesId } from './communications-helper';
import { CommunityRole } from '@test/generated/alkemio-schema';

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
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);

  const res = await createOrganizationCodegen(newOrgName, newOrdNameId);
  newOrgId = res.data?.createOrganization?.id ?? '';
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
  await deleteOrganizationCodegen(newOrgId);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organizations', () => {
    beforeAll(async () => {
      await assignCommunityRoleToOrganizationCodegen(
        hostNameId,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
      );
      await assignCommunityRoleToOrganizationCodegen(
        hostNameId,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToOrganizationCodegen(
        hostNameId,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );

      await assignCommunityRoleToOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
      );
      await assignCommunityRoleToOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
      );

      await assignCommunityRoleToOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
      );
    });
    afterAll(async () => {
      await removeCommunityRoleFromOrganizationCodegen(
        hostNameId,
        entitiesId.opportunityCommunityId,
        CommunityRole.Member
      );
      await removeCommunityRoleFromOrganizationCodegen(
        hostNameId,
        entitiesId.challengeCommunityId,
        CommunityRole.Member
      );

      await removeCommunityRoleFromOrganizationCodegen(
        hostNameId,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );

      await removeCommunityRoleFromOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
      );
      await removeCommunityRoleFromOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
      );

      await removeCommunityRoleFromOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
      );
    });
    describe('Assign same organization as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignCommunityRoleToOrganizationCodegen(
          hostNameId,
          entitiesId.spaceCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.spaceCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
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
        const res = await assignCommunityRoleToOrganizationCodegen(
          hostNameId,
          entitiesId.challengeCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.challengeCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: subspace-member`
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
        const res = await assignCommunityRoleToOrganizationCodegen(
          hostNameId,
          entitiesId.opportunityCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.opportunityCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: subspace-member`
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
        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.spaceCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.spaceCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberOrganizations;

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
        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.challengeCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.challengeCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberOrganizations;

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
        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.opportunityCommunityId,
          CommunityRole.Member
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.opportunityCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.memberOrganizations;

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
        const res = await assignCommunityRoleToOrganizationCodegen(
          hostNameId,
          entitiesId.spaceCommunityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.spaceCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
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
        const res = await assignCommunityRoleToOrganizationCodegen(
          hostNameId,
          entitiesId.challengeCommunityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.challengeCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: subspace-lead`
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
        const res = await assignCommunityRoleToOrganizationCodegen(
          hostNameId,
          entitiesId.opportunityCommunityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.opportunityCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (organization-${hostNameId}) already has assigned credential: subspace-lead`
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
        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.opportunityCommunityId,
          CommunityRole.Member
        );
        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.challengeCommunityId,
          CommunityRole.Member
        );

        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.spaceCommunityId,
          CommunityRole.Member
        );

        await assignCommunityRoleToOrganizationCodegen(
          entitiesId.organizationId,
          entitiesId.opportunityCommunityId,
          CommunityRole.Lead
        );
        await assignCommunityRoleToOrganizationCodegen(
          entitiesId.organizationId,
          entitiesId.challengeCommunityId,
          CommunityRole.Lead
        );

        await assignCommunityRoleToOrganizationCodegen(
          entitiesId.organizationId,
          entitiesId.spaceCommunityId,
          CommunityRole.Lead
        );
      });

      // to be verified
      test.skip('Error is thrown for Space', async () => {
        // Act
        const res = await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.spaceCommunityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.spaceCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
        expect(res.error?.errors[0].message).toContain(
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
        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.challengeCommunityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.challengeCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
      test('Two organizations assinged to Opportunity', async () => {
        // Act
        await assignCommunityRoleToOrganizationCodegen(
          newOrdNameId,
          entitiesId.opportunityCommunityId,
          CommunityRole.Lead
        );

        const getCommunityData = await getCommunityMembersListCodegen(
          entitiesId.spaceId,
          entitiesId.opportunityCommunityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
    });
  });
});
