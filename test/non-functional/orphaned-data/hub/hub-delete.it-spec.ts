import {
  PostTypes,
  createPostOnCallout,
} from '@test/functional-api/integration/post/post.request.params';
import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { createWhiteboardOnCallout } from '@test/functional-api/integration/whiteboard/whiteboard.request.params';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import {
  SpaceVisibility,
  createTestSpace,
  removeSpace,
  updateSpaceVisibility,
} from '@test/functional-api/integration/space/space.request.params';

import {
  createOrganization,
  deleteOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';

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
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
//import { users } from '@test/utils/queries/users-data';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;
let postNameID = '';
let postDisplayName = '';

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});
describe('Full Space Deletion', () => {
  test('should delete all space related data', async () => {
    // Change space preference
    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );

    // Send space community update
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(entitiesId.spaceUpdatesId, 'test'),
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaboration(entitiesId.spaceCollaborationId);

    // Create whiteboard on callout
    await createWhiteboardOnCallout(
      entitiesId.spaceWhiteboardCalloutId,
      'WhiteboardName'
    );

    // Create post on callout and comment to it
    const resPostonSpace = await createPostOnCallout(
      entitiesId.spaceCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE
    );
    const commentId = resPostonSpace.body.data.createPostOnCallout.comments.id;
    await mutation(
      sendComment,
      sendCommentVariablesData(commentId, 'test message on post')
    );

    // Create comment on callout
    await postCommentInCallout(
      entitiesId.spaceDiscussionCalloutId,
      'comment on discussion callout'
    );

    // User application to space community
    await createApplication(entitiesId.spaceCommunityId);

    // Assign user as member and lead
    const a = await assignUserAsCommunityMemberFunc(
      entitiesId.spaceCommunityId,
      'notifications@alkem.io'
    );
    console.log(a.body);
    await assignUserAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      'notifications@alkem.io'
    );

    // Assign organization as space community member and lead
    await assignOrganizationAsCommunityMemberFunc(
      entitiesId.spaceCommunityId,
      entitiesId.organizationId
    );
    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      entitiesId.organizationId
    );

    // Update hu visibility
    await updateSpaceVisibility(entitiesId.spaceId, SpaceVisibility.DEMO);

    // Act
    const resDelete = await removeSpace(entitiesId.spaceId);
    await deleteOrganization(entitiesId.organizationId);
    console.log(resDelete.body);
    // Assert
    expect(resDelete.body.data.deleteSpace.id).toEqual(entitiesId.spaceId);
  });
});
