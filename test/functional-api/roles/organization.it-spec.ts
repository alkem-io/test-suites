import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteChallengeCodegen } from '../integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '../integration/space/space.request.params';
import { deleteOpportunityCodegen } from '../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { getOrganizationRole } from './roles-query';
import { assignCommunityRoleToOrganizationCodegen } from '../integration/community/community.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { CommunityRole } from '@alkemio/client-lib';

const organizationName = 'orole-org-name' + uniqueId;
const hostNameId = 'orole-org-nameid' + uniqueId;
const spaceName = 'orole-eco-name' + uniqueId;
const spaceNameId = 'orole-eco-nameid' + uniqueId;
const opportunityName = 'orole-opp';
const challengeName = 'orole-chal';
const spaceRoles = ['host', 'lead', 'member'];
const availableRoles = ['member', 'lead'];

beforeAll(async () => {
  await deleteSpaceCodegen('eco1');

  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.challengeCommunityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.opportunityCommunityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Organization role', () => {
  test('Organization role - assignment to 1 Organization, Space, Challenge, Opportunity', async () => {
    // Act
    const res = await getOrganizationRole(entitiesId.organizationId);
    const spacesData = res.body.data.rolesOrganization.spaces;

    // Assert
    expect(spacesData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: spaceNameId,
          roles: expect.arrayContaining(spaceRoles),
        }),
      ])
    );

    expect(spacesData[0].challenges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.challengeNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
    expect(spacesData[0].opportunities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.opportunityNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
  });
});
