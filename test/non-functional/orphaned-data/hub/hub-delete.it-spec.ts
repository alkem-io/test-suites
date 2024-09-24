import {
  deleteSpaceCodegen,
  updateSpacePlatformCodegen,
  updateSpaceSettingsCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { createPostOnCalloutCodegen } from '@test/functional-api/callout/post/post.request.params';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { createCalloutOnCollaborationCodegen } from '@test/functional-api/callout/callouts.request.params';
import { createWhiteboardOnCalloutCodegen } from '@test/functional-api/callout/call-for-whiteboards/whiteboard-collection-callout.params.request';

import { users } from '@test/utils/queries/users-data';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  assignRoleToUser,
  assignRoleToOrganization3,
} from '@test/functional-api/roles/roles-request.params';
import { CommunityRole, SpaceVisibility } from '@test/generated/alkemio-schema';

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
    await updateSpaceSettingsCodegen(entitiesId.spaceId, {
      collaboration: { allowMembersToCreateSubspaces: true },
    });

    // Send space community update
    await sendMessageToRoomCodegen(
      entitiesId.space.updatesId,
      'test',
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaborationCodegen(entitiesId.space.collaborationId);

    // Create whiteboard on callout
    await createWhiteboardOnCalloutCodegen(
      entitiesId.space.whiteboardCalloutId
    );

    // Create post on callout and comment to it
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID
    );
    const commentId =
      resPostonSpace?.data?.createContributionOnCallout.post?.comments.id ?? '';
    await sendMessageToRoomCodegen(commentId, 'test message on post');

    // Create comment on callout
    await sendMessageToRoomCodegen(
      entitiesId.space.discussionCalloutId,
      'comment on discussion callout'
    );

    // User application to space community
    await createApplicationCodegen(entitiesId.space.communityId);

    // Assign user as member and lead
    await assignRoleToUser(
      users.notificationsAdmin.email,
      entitiesId.space.communityId,
      CommunityRoleType.Member
    );
    await assignRoleToUser(
      users.notificationsAdmin.email,
      entitiesId.space.communityId,
      CommunityRoleType.Lead
    );

    // Assign organization as space community member and lead
    await assignRoleToOrganization3(
      entitiesId.space.communityId,
      entitiesId.organization.id,
      CommunityRoleType.Member
    );

    await assignRoleToOrganization3(
      entitiesId.space.communityId,
      entitiesId.organization.id,
      CommunityRoleType.Lead
    );

    // Update space visibility
    await updateSpacePlatformCodegen(
      entitiesId.spaceId,
      spaceNameId,
      SpaceVisibility.Active
    );

    // Act
    const resDelete = await deleteSpaceCodegen(entitiesId.spaceId);
    await deleteOrganizationCodegen(entitiesId.organization.id);
    // Assert
    expect(resDelete?.data?.deleteSpace.id).toEqual(entitiesId.spaceId);
  });
});
