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
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { removeSpace } from '../integration/space/space.request.params';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { getOrganizationRole } from './roles-query';

const organizationName = 'orole-org-name' + uniqueId;
const hostNameId = 'orole-org-nameid' + uniqueId;
const spaceName = 'orole-eco-name' + uniqueId;
const spaceNameId = 'orole-eco-nameid' + uniqueId;
const opportunityName = 'orole-opp';
const challengeName = 'orole-chal';
const spaceRoles = ['host', 'member'];
const availableRoles = ['member', 'lead'];

beforeAll(async () => {
  await removeSpace('eco1');

  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await assignOrganizationAsCommunityMemberFunc(
    entitiesId.spaceCommunityId,
    hostNameId
  );

  await assignOrganizationAsCommunityMemberFunc(
    entitiesId.challengeCommunityId,
    hostNameId
  );
  await assignOrganizationAsCommunityMemberFunc(
    entitiesId.opportunityCommunityId,
    hostNameId
  );

  await assignOrganizationAsCommunityLeadFunc(
    entitiesId.spaceCommunityId,
    hostNameId
  );

  await assignOrganizationAsCommunityLeadFunc(
    entitiesId.challengeCommunityId,
    entitiesId.organizationId
  );
  await assignOrganizationAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    entitiesId.organizationId
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
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
