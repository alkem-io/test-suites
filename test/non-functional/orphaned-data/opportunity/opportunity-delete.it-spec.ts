import {
  PostTypes,
  createPostOnCallout,
} from '@test/functional-api/integration/post/post.request.params';
import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { createWhiteboardOnCallout } from '@test/functional-api/integration/whiteboard/whiteboard.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/integration/challenge/challenge.request.params';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/integration/space/space.request.params';
import { eventOnChallenge } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';

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
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import {
  createChallengeWithUsersCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;
const challengeName = 'post-chal';
const opportunityName = 'post-opp';
let postNameID = '';
let postDisplayName = '';

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});
describe('Full Opportunity Deletion', () => {
  test('should delete all opportunity related data', async () => {
    // Send opportunity community update
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(entitiesId.opportunityId, 'test'),
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaboration(entitiesId.opportunityCollaborationId);

    // Create whiteboard on callout
    await createWhiteboardOnCallout(
      entitiesId.opportunityWhiteboardCalloutId,
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

    // Update opportunity lifecycle event
    await eventOnChallenge(entitiesId.opportunityId, 'ABANDONED');

    // Assign user as member and lead
    await assignUserAsCommunityMemberFunc(
      entitiesId.opportunityCommunityId,
      users.notificationsAdminId
    );
    await assignUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.notificationsAdminId
    );

    // Assign organization as opportunity community member and lead
    await assignOrganizationAsCommunityMemberFunc(
      entitiesId.opportunityCommunityId,
      entitiesId.organizationId
    );
    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      entitiesId.organizationId
    );

    // Act
    const resDelete = await deleteOpportunityCodegen(entitiesId.opportunityId);
    await deleteChallengeCodegen(entitiesId.challengeId);
    await deleteSpaceCodegen(entitiesId.spaceId);
    await deleteOrganizationCodegen(entitiesId.organizationId);

    // Assert
    expect(resDelete?.data?.deleteOpportunity.id).toEqual(
      entitiesId.opportunityId
    );
  });
});
