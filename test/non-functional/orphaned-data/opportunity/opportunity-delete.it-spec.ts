import {
  PostTypes,
  createPostOnCallout,
} from '@test/functional-api/integration/post/post.request.params';
import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { createWhiteboardOnCallout } from '@test/functional-api/integration/whiteboard/whiteboard.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { eventOnChallenge } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityForChallenge,
  createOrgAndHubWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';

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

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const hubName = 'post-eco-name' + uniqueId;
const hubNameId = 'post-eco-nameid' + uniqueId;
const challengeName = 'post-chal';
const opportunityName = 'post-opp';
let postNameID = '';
let postDisplayName = '';

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityForChallenge(opportunityName);
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
    const resPostonHub = await createPostOnCallout(
      entitiesId.challengeCalloutId,
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
    const resDelete = await removeOpportunity(entitiesId.opportunityId);
    await removeChallenge(entitiesId.challengeId);
    await removeHub(entitiesId.hubId);
    await deleteOrganization(entitiesId.organizationId);

    // Assert
    expect(resDelete.body.data.deleteOpportunity.id).toEqual(
      entitiesId.opportunityId
    );
  });
});
