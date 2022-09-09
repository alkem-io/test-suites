import {
  AspectTypes,
  createAspectOnCallout,
  getDataPerChallengeCallout,
  getDataPerHubCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import {
  getChallengeData,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgHub,
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
  ChallengePreferenceType,
  changePreferenceChallenge,
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';
const cgrud = ['READ'];

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );
  await createChallengeForOrgHub(challengeName);
  await changePreferenceChallenge(
    entitiesId.challengeId,
    ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS,
    'true'
  );

  await changePreferenceChallenge(
    entitiesId.challengeId,
    ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS,
    'true'
  );
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
  );

  await createApplication(entitiesId.challengeCommunityId, TestUser.QA_USER);

  await mutation(
    createDiscussion,
    createDiscussionVariablesData(
      entitiesId.challengeCommunicationId,
      DiscussionCategory.GENERAL,
      'test'
    )
  );

  await mutation(
    sendCommunityUpdate,
    sendCommunityUpdateVariablesData(entitiesId.challengeUpdatesId, 'test'),
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.challengeCollaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createAspectOnCallout(
    entitiesId.challengeCalloutId,
    'aspectDisplayName',
    'aspectnameid',
    'aspectDescription',
    AspectTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('myPrivileges - Challenge of Private Hub', () => {
  test('GlobalAdmin privileges to Challenge', async () => {
    // Act
    const response = await getChallengeData(
      entitiesId.hubId,
      entitiesId.challengeId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(response.text).toContain(
      // eslint-disable-next-line prettier/prettier
      'User (non.hub@alkem.io) does not have credentials that grant \'read\' access to Hub.challenge'
    );
    expect(response.body.data).toEqual(null);
  });
});
