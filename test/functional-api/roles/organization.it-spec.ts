import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpaceCodegen } from '../journey/space/space.request.params';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import {
  assignCommunityRoleToOrganizationCodegen,
  getOrganizationRoleCodegen,
} from './roles-request.params';
import { entitiesId } from './community/communications-helper';
import { CommunityRole } from '@test/generated/alkemio-schema';

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
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Organization role', () => {
  test('Organization role - assignment to 1 Organization, Space, Challenge, Opportunity', async () => {
    // Act
    const res = await getOrganizationRoleCodegen(entitiesId.organizationId);
    const spacesData = res?.data?.rolesOrganization.spaces ?? [];

    // Assert
    expect(spacesData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: spaceNameId,
          roles: expect.arrayContaining(spaceRoles),
        }),
      ])
    );

    expect(spacesData[0].subspaces).toEqual(
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
