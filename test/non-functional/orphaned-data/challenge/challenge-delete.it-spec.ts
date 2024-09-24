import { createPostOnCalloutCodegen } from '@test/functional-api/callout/post/post.request.params';
import { createCalloutOnCollaborationCodegen } from '@test/functional-api/callout/callouts.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { createApplication } from '@test/functional-api/roleset/application/application.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceChallengeCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  createChallengeForOrgSpaceCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { ChallengePreferenceType, CommunityRole } from '@alkemio/client-lib';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { createWhiteboardOnCalloutCodegen } from '@test/functional-api/callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { entitiesId } from '@test/types/entities-helper';
import {
  assignRoleToUser,
  assignRoleToOrganization,
} from '@test/functional-api/roleset/roles-request.params';
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
    await sendMessageToRoomCodegen(entitiesId.challenge.updatesId, 'test');

    // Create callout
    await createCalloutOnCollaborationCodegen(
      entitiesId.challenge.collaborationId
    );

    // Create whiteboard on callout
    await createWhiteboardOnCalloutCodegen(
      entitiesId.challenge.whiteboardCalloutId
    );

    // Create post on callout and comment to it
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.challenge.calloutId,
      { displayName: postDisplayName },
      postNameID
    );

    const commentId =
      resPostonSpace?.data?.createContributionOnCallout.post?.comments.id ?? '';

    await sendMessageToRoomCodegen(commentId, 'test message on post');

    // Create comment on callout
    await sendMessageToRoomCodegen(
      entitiesId.challenge.discussionCalloutId,
      'comment on discussion callout'
    );

    // User application to challenge community
    await createApplication(entitiesId.challenge.communityId);

    // Assign user as member and lead
    await assignRoleToUser(
      users.notificationsAdmin.email,
      entitiesId.challenge.communityId,
      CommunityRoleType.Member
    );
    await assignRoleToUser(
      users.notificationsAdmin.email,
      entitiesId.challenge.communityId,
      CommunityRoleType.Lead
    );

    // Assign organization as challenge community member and lead
    await assignRoleToOrganization(
      entitiesId.challenge.communityId,
      entitiesId.organization.id,
      CommunityRoleType.Member
    );

    await assignRoleToOrganization(
      entitiesId.challenge.communityId,
      entitiesId.organization.id,
      CommunityRoleType.Lead
    );

    // Act
    const resDelete = await deleteChallengeCodegen(entitiesId.challenge.id);
    await deleteSpaceCodegen(entitiesId.spaceId);
    await deleteOrganization(entitiesId.organization.id);

    // Assert
    expect(resDelete?.data?.deleteChallenge.id).toEqual(
      entitiesId.challenge.id
    );
  });
});
