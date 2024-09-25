import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpace } from '../journey/space/space.request.params';
import {
  createChallengeForOrgSpace,
  createOpportunityForChallengeCodegen,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import {
  assignRoleToOrganization,
  getOrganizationRoleCodegen,
} from './roles-request.params';
import { entitiesId } from '../../types/entities-helper';
import { CommunityRoleType } from '@test/generated/graphql';
import { deleteOrganization } from '../contributor-management/organization/organization.request.params';

const organizationName = 'orole-org-name' + uniqueId;
const hostNameId = 'orole-org-nameid' + uniqueId;
const spaceName = 'orole-eco-name' + uniqueId;
const spaceNameId = 'orole-eco-nameid' + uniqueId;
const opportunityName = 'orole-opp';
const challengeName = 'orole-chal';
const spaceRoles = ['lead', 'member'];
const availableRoles = ['member', 'lead'];

beforeAll(async () => {
  await deleteSpace('eco1');

  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);

  await assignRoleToOrganization(
    hostNameId,
    entitiesId.space.roleSetId,
    CommunityRoleType.Member
  );

  await assignRoleToOrganization(
    hostNameId,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Member
  );

  await assignRoleToOrganization(
    hostNameId,
    entitiesId.opportunity.roleSetId,
    CommunityRoleType.Member
  );

  await assignRoleToOrganization(
    hostNameId,
    entitiesId.space.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToOrganization(
    hostNameId,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToOrganization(
    hostNameId,
    entitiesId.opportunity.roleSetId,
    CommunityRoleType.Lead
  );
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
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
