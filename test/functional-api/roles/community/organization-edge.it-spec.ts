/* eslint-disable prettier/prettier */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import { getRoleSetMembersList } from './roleset.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
} from '@test/functional-api/organization/organization.request.params';
import {
  assignRoleToOrganization,
  assignRoleToOrganization3,
  removeRoleFromOrganization,
} from '../roles-request.params';
import { entitiesId } from './communications-helper';
import { CommunityRoleType } from '@test/generated/alkemio-schema';

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
  await deleteSpaceCodegen(entitiesId.opportunity.id);
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
  await deleteOrganizationCodegen(newOrgId);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organizations', () => {
    beforeAll(async () => {
      await assignRoleToOrganization(
        hostNameId,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Member
      );
      await assignRoleToOrganization(
        hostNameId,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );

      await assignRoleToOrganization(
        hostNameId,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );

      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Lead
      );
      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.challenge.communityId,
        CommunityRoleType.Lead
      );

      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.space.communityId,
        CommunityRoleType.Lead
      );
    });
    afterAll(async () => {
      await removeRoleFromOrganization(
        hostNameId,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Member
      );
      await removeRoleFromOrganization(
        hostNameId,
        entitiesId.challenge.communityId,
        CommunityRoleType.Member
      );

      await removeRoleFromOrganization(
        hostNameId,
        entitiesId.space.communityId,
        CommunityRoleType.Member
      );

      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.opportunity.communityId,
        CommunityRoleType.Lead
      );
      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.challenge.communityId,
        CommunityRoleType.Lead
      );

      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.space.communityId,
        CommunityRoleType.Lead
      );
    });
    describe('Assign same organization as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignRoleToOrganization(
          hostNameId,
          entitiesId.space.communityId,
          CommunityRoleType.Member
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.space.communityId
        );
        const data =
          getCommunityData.data?.lookup.community?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${entitiesId.organization.agentId}) already has assigned credential: space-member`
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
        const res = await assignRoleToOrganization(
          hostNameId,
          entitiesId.challenge.communityId,
          CommunityRoleType.Member
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.challenge.communityId
        );
        const data =
          getCommunityData.data?.lookup.community?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${entitiesId.organization.agentId}) already has assigned credential: space-member`
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
        const res = await assignRoleToOrganization(
          hostNameId,
          entitiesId.opportunity.communityId,
          CommunityRoleType.Member
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.opportunity.communityId
        );
        const data =
          getCommunityData.data?.lookup.community?.memberOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${entitiesId.organization.agentId}) already has assigned credential: space-member`
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
        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.space.communityId,
          CommunityRoleType.Member
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.space.communityId
        );
        const data =
          getCommunityData.data?.lookup.community?.memberOrganizations;

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
        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.challenge.communityId,
          CommunityRoleType.Member
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.challenge.communityId
        );
        const data =
          getCommunityData.data?.lookup.community?.memberOrganizations;

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
        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.opportunity.communityId,
          CommunityRoleType.Member
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.opportunity.communityId
        );
        const data =
          getCommunityData.data?.lookup.community?.memberOrganizations;

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
        const res = await assignRoleToOrganization(
          hostNameId,
          entitiesId.space.communityId,
          CommunityRoleType.Lead
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.space.communityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${entitiesId.organization.agentId}) already has assigned credential: space-lead`
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
        const res = await assignRoleToOrganization(
          hostNameId,
          entitiesId.challenge.communityId,
          CommunityRoleType.Lead
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.challenge.communityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${entitiesId.organization.agentId}) already has assigned credential: space-lead`
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
        const res = await assignRoleToOrganization(
          hostNameId,
          entitiesId.opportunity.communityId,
          CommunityRoleType.Lead
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.opportunity.communityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(1);
        expect(res.error?.errors[0].message).toContain(
          `Agent (${entitiesId.organization.agentId}) already has assigned credential: space-lead`
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
        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.opportunity.communityId,
          CommunityRoleType.Member
        );
        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.challenge.communityId,
          CommunityRoleType.Member
        );

        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.space.communityId,
          CommunityRoleType.Member
        );

        await assignRoleToOrganization(
          entitiesId.organization.id,
          entitiesId.opportunity.communityId,
          CommunityRoleType.Lead
        );
        await assignRoleToOrganization(
          entitiesId.organization.id,
          entitiesId.challenge.communityId,
          CommunityRoleType.Lead
        );

        await assignRoleToOrganization(
          entitiesId.organization.id,
          entitiesId.space.communityId,
          CommunityRoleType.Lead
        );
      });

      // to be verified
      test.skip('Error is thrown for Space', async () => {
        // Act
        const res = await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.space.communityId,
          CommunityRoleType.Lead
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.space.communityId
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
        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.challenge.communityId,
          CommunityRoleType.Lead
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.challenge.communityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
      test('Two organizations assinged to Opportunity', async () => {
        // Act
        await assignRoleToOrganization(
          newOrdNameId,
          entitiesId.opportunity.communityId,
          CommunityRoleType.Lead
        );

        const getCommunityData = await getRoleSetMembersList(
          entitiesId.spaceId,
          entitiesId.opportunity.communityId
        );
        const data = getCommunityData.data?.lookup.community?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
    });
  });
});
