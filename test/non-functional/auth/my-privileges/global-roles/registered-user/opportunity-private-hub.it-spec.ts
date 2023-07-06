import {
  PostTypes,
  createPostOnCallout,
} from '@test/functional-api/integration/post/post.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import {
  getOpportunityData,
  removeOpportunity,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  createOrgAndSpace,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const opportunityName = 'auth-ga-opp';
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      users.qaUserId
    )
  );

  // await mutation(
  //   createDiscussion,
  //   createDiscussionVariablesData(
  //     entitiesId.opportunityCommunicationId,
  //     DiscussionCategory.GENERAL,
  //     'test'
  //   )
  // );

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

  await createPostOnCallout(
    entitiesId.opportunityCalloutId,
    'postnameid',
    { profileData: { displayName: 'postDisplayName' } },
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('myPrivileges - Opportunity of Public Space', () => {
  test('RegisteredUser privileges to Opportunity', async () => {
    // Act
    const response = await getOpportunityData(
      entitiesId.spaceId,
      entitiesId.opportunityId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(response.text).toContain(
      // eslint-disable-next-line prettier/prettier
      'User (non.space@alkem.io) does not have credentials that grant \'read\' access to Space.opportunity'
    );
    expect(response.body.data).toEqual(null);
  });
});
