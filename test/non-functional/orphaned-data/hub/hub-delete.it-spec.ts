import {
  PostTypes,
  createPostOnCallout,
} from '@test/functional-api/integration/post/post.request.params';
import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { createWhiteboardOnCallout } from '@test/functional-api/integration/whiteboard/whiteboard.request.params';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import {
  HubVisibility,
  createTestHub,
  removeHub,
  updateHubVisibility,
} from '@test/functional-api/integration/hub/hub.request.params';

import {
  createOrganization,
  deleteOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';

import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignOrganizationAsCommunityLeadFunc,
  assignOrganizationAsCommunityMemberFunc,
  assignUserAsCommunityLeadFunc,
  assignUserAsCommunityMemberFunc,
} from '@test/utils/mutations/assign-mutation';
import {
  sendComment,
  sendCommentVariablesData,
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
//import { users } from '@test/utils/queries/users-data';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const hubName = 'post-eco-name' + uniqueId;
const hubNameId = 'post-eco-nameid' + uniqueId;
let postNameID = '';
let postDisplayName = '';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});
describe('Full Hub Deletion', () => {
  test('should delete all hub related data', async () => {
    // Change hub preference
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );

    // Send hub community update
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test'),
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaboration(entitiesId.hubCollaborationId);

    // Create whiteboard on callout
    await createWhiteboardOnCallout(
      entitiesId.hubWhiteboardCalloutId,
      'WhiteboardName'
    );

    // Create post on callout and comment to it
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE
    );
    const commentId = resPostonHub.body.data.createPostOnCallout.comments.id;
    await mutation(
      sendComment,
      sendCommentVariablesData(commentId, 'test message on post')
    );

    // Create comment on callout
    await postCommentInCallout(
      entitiesId.hubDiscussionCalloutId,
      'comment on discussion callout'
    );

    // User application to hub community
    await createApplication(entitiesId.hubCommunityId);

    // Assign user as member and lead
    const a = await assignUserAsCommunityMemberFunc(
      entitiesId.hubCommunityId,
      'notifications@alkem.io'
    );
    console.log(a.body);
    await assignUserAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      'notifications@alkem.io'
    );

    // Assign organization as hub community member and lead
    await assignOrganizationAsCommunityMemberFunc(
      entitiesId.hubCommunityId,
      entitiesId.organizationId
    );
    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      entitiesId.organizationId
    );

    // Update hu visibility
    await updateHubVisibility(entitiesId.hubId, HubVisibility.DEMO);

    // Act
    const resDelete = await removeHub(entitiesId.hubId);
    await deleteOrganization(entitiesId.organizationId);
    console.log(resDelete.body);
    // Assert
    expect(resDelete.body.data.deleteHub.id).toEqual(entitiesId.hubId);
  });
});
