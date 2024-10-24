/* eslint-disable prettier/prettier */
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpace } from '../../journey/space/space.request.params';
import { getRoleSetMembersList } from '../roleset.request.params';
import {
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';

import {
  assignRoleToOrganization,
  removeRoleFromOrganization,
} from '../roles-request.params';
import { entitiesId } from '../../../types/entities-helper';
import { CommunityRoleType } from '@test/generated/alkemio-schema';
import { createOrganization, deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';
let newOrgId = '';
const newOrgNameId = 'ha' + organizationName;
const newOrgName = 'ha' + hostNameId;

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);

  const res = await createOrganization(newOrgName, newOrgNameId);
  newOrgId = res.data?.createOrganization?.id ?? '';
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
  await deleteOrganization(newOrgId);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organizations', () => {
    beforeAll(async () => {
      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Member
      );
      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Lead
      );
      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Lead
      );

      await assignRoleToOrganization(
        entitiesId.organization.id,
        entitiesId.space.roleSetId,
        CommunityRoleType.Lead
      );
    });
    afterAll(async () => {
      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Member
      );
      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Member
      );

      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.opportunity.roleSetId,
        CommunityRoleType.Lead
      );
      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.challenge.roleSetId,
        CommunityRoleType.Lead
      );

      await removeRoleFromOrganization(
        entitiesId.organization.id,
        entitiesId.space.roleSetId,
        CommunityRoleType.Lead
      );
    });
    describe('Assign same organization as member to same community', () => {
      test('Error is thrown for Space', async () => {
        // Act
        const res = await assignRoleToOrganization(
          entitiesId.organization.id,
          entitiesId.space.roleSetId,
          CommunityRoleType.Member
        );

        const getRoleSetMembers = await getRoleSetMembersList(
          entitiesId.space.roleSetId
        );
        const data =
          getRoleSetMembers.data?.lookup.roleSet?.memberOrganizations;

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
          entitiesId.organization.id,
          entitiesId.challenge.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.challenge.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

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
          entitiesId.organization.id,
          entitiesId.opportunity.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.opportunity.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

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
          newOrgId,
          entitiesId.space.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.space.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

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
          newOrgId,
          entitiesId.challenge.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.challenge.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

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
          newOrgId,
          entitiesId.opportunity.roleSetId,
          CommunityRoleType.Member
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.opportunity.roleSetId
        );
        const data =
          roleSetMembersList.data?.lookup.roleSet?.memberOrganizations;

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
          entitiesId.organization.id,
          entitiesId.space.roleSetId,
          CommunityRoleType.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.space.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

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
          entitiesId.organization.id,
          entitiesId.challenge.roleSetId,
          CommunityRoleType.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.challenge.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

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
          entitiesId.organization.id,
          entitiesId.opportunity.roleSetId,
          CommunityRoleType.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.opportunity.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

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
          newOrgId,
          entitiesId.opportunity.roleSetId,
          CommunityRoleType.Member
        );
        await assignRoleToOrganization(
          newOrgId,
          entitiesId.challenge.roleSetId,
          CommunityRoleType.Member
        );

        await assignRoleToOrganization(
          newOrgId,
          entitiesId.space.roleSetId,
          CommunityRoleType.Member
        );

        await assignRoleToOrganization(
          entitiesId.organization.id,
          entitiesId.opportunity.roleSetId,
          CommunityRoleType.Lead
        );
        await assignRoleToOrganization(
          entitiesId.organization.id,
          entitiesId.challenge.roleSetId,
          CommunityRoleType.Lead
        );

        await assignRoleToOrganization(
          entitiesId.organization.id,
          entitiesId.space.roleSetId,
          CommunityRoleType.Lead
        );
      });

      // to be verified
      test.skip('Error is thrown for Space', async () => {
        // Act
        const res = await assignRoleToOrganization(
          newOrgId,
          entitiesId.space.roleSetId,
          CommunityRoleType.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.space.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
        expect(res.error?.errors[0].message).toContain(
          "Max limit of organizations reached for role 'lead': 1, cannot assign new organization"
        );
        expect(data).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nameID: newOrgNameId,
            }),
          ])
        );
      });
      test('Two organizations assinged to Challenge', async () => {
        // Act
        await assignRoleToOrganization(
          newOrgId,
          entitiesId.challenge.roleSetId,
          CommunityRoleType.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.challenge.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
      test('Two organizations assinged to Opportunity', async () => {
        // Act
        await assignRoleToOrganization(
          newOrgId,
          entitiesId.opportunity.roleSetId,
          CommunityRoleType.Lead
        );

        const roleSetMembersList = await getRoleSetMembersList(
          entitiesId.opportunity.roleSetId
        );
        const data = roleSetMembersList.data?.lookup.roleSet?.leadOrganizations;

        // Assert
        expect(data).toHaveLength(2);
      });
    });
  });
});
