import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  assignOrganizationAsCommunityLeadFunc,
  assignOrganizationAsCommunityMemberFunc,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { removeHub } from '../integration/hub/hub.request.params';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { getOrganizationRole } from './roles-query';

const organizationName = 'orole-org-name' + uniqueId;
const hostNameId = 'orole-org-nameid' + uniqueId;
const hubName = 'orole-eco-name' + uniqueId;
const hubNameId = 'orole-eco-nameid' + uniqueId;
const opportunityName = 'orole-opp';
const challengeName = 'orole-chal';
const hubRoles = ['host', 'member'];
const availableRoles = ['member', 'lead'];

beforeAll(async () => {
  await removeHub('eco1');

  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await assignOrganizationAsCommunityMemberFunc(
    entitiesId.hubCommunityId,
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
    entitiesId.hubCommunityId,
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
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Organization role', () => {
  test('Organization role - assignment to 1 Organization, Hub, Challenge, Opportunity', async () => {
    // Act
    const res = await getOrganizationRole(entitiesId.organizationId);
    const hubsData = res.body.data.rolesOrganization.hubs;

    // Assert
    expect(hubsData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: hubNameId,
          roles: expect.arrayContaining(hubRoles),
        }),
      ])
    );

    expect(hubsData[0].challenges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.challengeNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
    expect(hubsData[0].opportunities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameID: entitiesId.opportunityNameId,
          roles: expect.arrayContaining(availableRoles),
        }),
      ])
    );
  });
});
