import {
  deleteSpaceCodegen,
  updateSpaceVisibilityCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import {
  CommunityRole,
  SpacePreferenceType,
  SpaceVisibility,
} from '@alkemio/client-lib';
import {
  PostTypes,
  createPostOnCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { createCalloutOnCollaborationCodegen } from '@test/functional-api/callout/callouts.request.params';
import { createWhiteboardOnCalloutCodegen } from '@test/functional-api/callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import {
  assignCommunityRoleToOrganizationCodegen,
  assignCommunityRoleToUserCodegen,
} from '@test/functional-api/integration/community/community.request.params';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;
let postNameID = '';
let postDisplayName = '';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});
describe('Full Space Deletion', () => {
  test('should delete all space related data', async () => {
    // Change space preference
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AllowMembersToCreateChallenges,
      'true'
    );

    // Send space community update
    await sendMessageToRoomCodegen(
      entitiesId.spaceUpdatesId,
      'test',
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaborationCodegen(entitiesId.spaceCollaborationId);

    // Create whiteboard on callout
    await createWhiteboardOnCalloutCodegen(entitiesId.spaceWhiteboardCalloutId);

    // Create post on callout and comment to it
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.spaceCalloutId,
      { displayName: postDisplayName },
      postNameID,
      PostTypes.KNOWLEDGE
    );
    const commentId =
      resPostonSpace?.data?.createContributionOnCallout.post?.comments.id ?? '';
    await sendMessageToRoomCodegen(commentId, 'test message on post');

    // Create comment on callout
    await sendMessageToRoomCodegen(
      entitiesId.spaceDiscussionCalloutId,
      'comment on discussion callout'
    );

    // User application to space community
    await createApplicationCodegen(entitiesId.spaceCommunityId);

    // Assign user as member and lead
    await assignCommunityRoleToUserCodegen(
      users.notificationsAdminEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );
    await assignCommunityRoleToUserCodegen(
      users.notificationsAdminEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );

    // Assign organization as space community member and lead
    await assignCommunityRoleToOrganizationCodegen(
      entitiesId.spaceCommunityId,
      entitiesId.organizationId,
      CommunityRole.Member
    );

    await assignCommunityRoleToOrganizationCodegen(
      entitiesId.spaceCommunityId,
      entitiesId.organizationId,
      CommunityRole.Lead
    );

    // Update hu visibility
    await updateSpaceVisibilityCodegen(
      entitiesId.spaceId,
      SpaceVisibility.Demo
    );
    // Act
    const resDelete = await deleteSpaceCodegen(entitiesId.spaceId);
    await deleteOrganizationCodegen(entitiesId.organizationId);
    // Assert
    expect(resDelete?.data?.deleteSpace.id).toEqual(entitiesId.spaceId);
  });
});
