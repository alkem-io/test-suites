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
    test('Assign organization as member to space', async () => {
      // Act
      await assignCommunityRoleToOrganization(
        hostNameId,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
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
      await assignCommunityRoleToOrganization(
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
      await assignCommunityRoleToOrganization(
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
      await assignCommunityRoleToOrganization(
        hostNameId,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
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
    test('Assign organization as lead to challenge', async () => {
      // Act
      await assignCommunityRoleToOrganization(
        entitiesId.organizationId,
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
      await assignCommunityRoleToOrganization(
        entitiesId.organizationId,
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
    test('Remove organization as member from opportunity', async () => {
      // Act
      await removeCommunityRoleFromOrganization(
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
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from challenge', async () => {
      // Act
      await removeCommunityRoleFromOrganization(
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
      expect(data).toHaveLength(0);
    });
    test('Remove organization as member from space', async () => {
      // Act
      await removeCommunityRoleFromOrganization(
        hostNameId,
        entitiesId.spaceCommunityId,
        RoleType.MEMBER
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[1];

      // Assert
      expect(data).toHaveLength(0);
    });

    test('Remove organization as lead from opportunity', async () => {
      // Act
      await removeCommunityRoleFromOrganization(
        entitiesId.organizationId,
        entitiesId.opportunityCommunityId,
        RoleType.LEAD
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
      await removeCommunityRoleFromOrganization(
        entitiesId.organizationId,
        entitiesId.challengeCommunityId,
        RoleType.LEAD
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
      await removeCommunityRoleFromOrganization(
        entitiesId.organizationId,
        entitiesId.spaceCommunityId,
        RoleType.LEAD
      );

      const getCommunityData = await dataSpaceMemberTypes(entitiesId.spaceId);
      const data = getCommunityData[3];

      // Assert
      expect(data).toHaveLength(0);
    });
  });
});
