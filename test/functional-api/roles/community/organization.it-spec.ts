import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  removeCommunityRoleFromOrganizationCodegen,
  assignCommunityRoleToOrganizationCodegen,
} from '../roles-request.params';
import { entitiesId } from './communications-helper';
import { CommunityRole } from '@test/generated/alkemio-schema';
import { getCommunityMembersListCodegen } from './community.request.params';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Assign / Remove organization to community', () => {
  describe('Assign organization', () => {
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
    test('Assign organization as member to space', async () => {
      // Act
      await assignCommunityRoleToOrganizationCodegen(
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
      await assignCommunityRoleToOrganizationCodegen(
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
      await assignCommunityRoleToOrganizationCodegen(
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
      await assignCommunityRoleToOrganizationCodegen(
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
      await assignCommunityRoleToOrganizationCodegen(
        entitiesId.organizationId,
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
      await assignCommunityRoleToOrganizationCodegen(
        entitiesId.organizationId,
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
    test('Remove organization as member from opportunity', async () => {
      // Act
      await removeCommunityRoleFromOrganizationCodegen(
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
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from challenge', async () => {
      // Act
      await removeCommunityRoleFromOrganizationCodegen(
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
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from space', async () => {
      // Act
      await removeCommunityRoleFromOrganizationCodegen(
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
      expect(data).toHaveLength(0);
    });

    test('Remove organization as lead from opportunity', async () => {
      // Act
      await removeCommunityRoleFromOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.opportunityCommunityId,
        CommunityRole.Lead
      );

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.opportunityCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as lead from challenge', async () => {
      // Act
      await removeCommunityRoleFromOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.challengeCommunityId,
        CommunityRole.Lead
      );

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.challengeCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
    test('Remove organization as lead from space', async () => {
      // Act
      await removeCommunityRoleFromOrganizationCodegen(
        entitiesId.organizationId,
        entitiesId.spaceCommunityId,
        CommunityRole.Lead
      );

      const getCommunityData = await getCommunityMembersListCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCommunityId
      );
      const data = getCommunityData.data?.lookup.community?.leadOrganizations;

      // Assert
      expect(data).toHaveLength(0);
    });
  });
});
