import {
  PostTypes,
  createPostOnCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import { createCalloutOnCollaborationCodegen } from '@test/functional-api/callout/callouts.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceChallengeCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  createChallengeForOrgSpaceCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { ChallengePreferenceType, CommunityRole } from '@alkemio/client-lib';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { createWhiteboardOnCalloutCodegen } from '@test/functional-api/callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  assignCommunityRoleToUserCodegen,
  assignCommunityRoleToOrganizationCodegen,
} from '@test/functional-api/roles/roles-request.params';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;
const challengeName = 'post-chal';
let postNameID = '';
let postDisplayName = '';

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});
describe('Full Challenge Deletion', () => {
  test('should delete all challenge related data', async () => {
    // Change challenge preference
    await changePreferenceChallengeCodegen(
      entitiesId.spaceId,
      ChallengePreferenceType.AllowContributorsToCreateOpportunities,
      'true'
    );

    // Send challenge community update
    await sendMessageToRoomCodegen(entitiesId.challengeUpdatesId, 'test');

    // Create callout
    await createCalloutOnCollaborationCodegen(
      entitiesId.challengeCollaborationId
    );

    // Create whiteboard on callout
    await createWhiteboardOnCalloutCodegen(
      entitiesId.challengeWhiteboardCalloutId
    );

    // Create post on callout and comment to it
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.challengeCalloutId,
      { displayName: postDisplayName },
      postNameID,
      PostTypes.KNOWLEDGE
    );

    const commentId =
      resPostonSpace?.data?.createContributionOnCallout.post?.comments.id ?? '';

    await sendMessageToRoomCodegen(commentId, 'test message on post');

    // Create comment on callout
    await sendMessageToRoomCodegen(
      entitiesId.challengeDiscussionCalloutId,
      'comment on discussion callout'
    );

    // User application to challenge community
    await createApplicationCodegen(entitiesId.challengeCommunityId);

    // Assign user as member and lead
    await assignCommunityRoleToUserCodegen(
      users.notificationsAdminEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );
    await assignCommunityRoleToUserCodegen(
      users.notificationsAdminEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    // Assign organization as challenge community member and lead
    await assignCommunityRoleToOrganizationCodegen(
      entitiesId.challengeCommunityId,
      entitiesId.organizationId,
      CommunityRole.Member
    );

    await assignCommunityRoleToOrganizationCodegen(
      entitiesId.challengeCommunityId,
      entitiesId.organizationId,
      CommunityRole.Lead
    );

    // Act
    const resDelete = await deleteChallengeCodegen(entitiesId.challengeId);
    await deleteSpaceCodegen(entitiesId.spaceId);
    await deleteOrganizationCodegen(entitiesId.organizationId);

    // Assert
    expect(resDelete?.data?.deleteChallenge.id).toEqual(entitiesId.challengeId);
  });
});
