import {
  PostTypes,
  createPostOnCallout,
} from '@test/functional-api/integration/post/post.request.params';
import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { createWhiteboardOnCallout } from '@test/functional-api/integration/whiteboard/whiteboard.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { eventOnChallenge } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
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
  ChallengePreferenceType,
  changePreferenceChallenge,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import {
  createChallengeForOrgSpaceCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';

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
    await changePreferenceChallenge(
      entitiesId.spaceId,
      ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
      'true'
    );

    // Send challenge community update
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(entitiesId.challengeUpdatesId, 'test')
    );

    // Create callout
    await createCalloutOnCollaboration(entitiesId.challengeCollaborationId);

    // Create whiteboard on callout
    await createWhiteboardOnCallout(
      entitiesId.challengeWhiteboardCalloutId,
      'WhiteboardName'
    );

    // Create post on callout and comment to it
    const resPostonSpace = await createPostOnCallout(
      entitiesId.challengeCalloutId,
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
      entitiesId.challengeDiscussionCalloutId,
      'comment on discussion callout'
    );

    // Update challenge lifecycle event
    await eventOnChallenge(entitiesId.challengeId, 'ABANDONED');

    // User application to challenge community
    await createApplicationCodegen(entitiesId.challengeCommunityId);

    // Assign user as member and lead
    await assignUserAsCommunityMemberFunc(
      entitiesId.challengeCommunityId,
      users.notificationsAdminId
    );
    await assignUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.notificationsAdminId
    );

    // Assign organization as challenge community member and lead
    await assignOrganizationAsCommunityMemberFunc(
      entitiesId.challengeCommunityId,
      entitiesId.organizationId
    );
    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      entitiesId.organizationId
    );

    // Act
    const resDelete = await removeChallenge(entitiesId.challengeId);
    await removeSpace(entitiesId.spaceId);
    await deleteOrganization(entitiesId.organizationId);

    // Assert
    expect(resDelete.body.data.deleteChallenge.id).toEqual(
      entitiesId.challengeId
    );
  });
});
