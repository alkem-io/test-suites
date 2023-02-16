import {
  AspectTypes,
  createAspectOnCallout,
  getDataPerHubCallout,
  getDataPerOpportunityCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import {
  getOpportunityData,
  removeOpportunity,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  createOrgAndHub,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  createDiscussion,
  createDiscussionVariablesData,
  DiscussionCategory,
} from '@test/utils/mutations/communications-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;
const opportunityName = 'auth-ga-opp';
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    createDiscussion,
    createDiscussionVariablesData(
      entitiesId.opportunityCommunicationId,
      DiscussionCategory.GENERAL,
      'test'
    )
  );

  await mutation(
    sendCommunityUpdate,
    sendCommunityUpdateVariablesData(entitiesId.opportunityUpdatesId, 'test'),
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.opportunityCollaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createAspectOnCallout(
    entitiesId.opportunityCalloutId,
    'aspectDisplayName',
    'aspectnameid',
    AspectTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('myPrivileges - Opportunity of Public Hub', () => {
  test('RegisteredUser privileges to Opportunity', async () => {
    // Act
    const response = await getOpportunityData(
      entitiesId.hubId,
      entitiesId.opportunityId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(response.text).toContain(
      // eslint-disable-next-line prettier/prettier
      'User (non.hub@alkem.io) does not have credentials that grant \'read\' access to Hub.opportunity'
    );
    expect(response.body.data).toEqual(null);
  });
});
