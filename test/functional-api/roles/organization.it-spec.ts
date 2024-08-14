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
const spaceRoles = ['lead', 'member'];
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
    entitiesId.space.communityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.challenge.communityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.opportunity.communityId,
    CommunityRole.Member
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.space.communityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.challenge.communityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToOrganizationCodegen(
    hostNameId,
    entitiesId.opportunity.communityId,
    CommunityRole.Lead
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunity.id);
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('Organization role', () => {
  test('Organization role - assignment to 1 Organization, Space, Challenge, Opportunity', async () => {
    // Act
    const res = await getOrganizationRoleCodegen(entitiesId.organization.id);
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
          nameID: entitiesId.challenge.nameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
    // expect(spacesData[0].subspaces).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       nameID: entitiesId.opportunity.nameId,
    //       roles: expect.arrayContaining(availableRoles),
    //     }),
    //   ])
    // );
  });
});
