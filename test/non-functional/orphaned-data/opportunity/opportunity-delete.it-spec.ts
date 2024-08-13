import { PostTypes } from '@test/functional-api/callout/post/post.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeWithUsersCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { createCalloutOnCollaborationCodegen } from '@test/functional-api/callout/callouts.request.params';
import { createWhiteboardOnCalloutCodegen } from '@test/functional-api/callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { createPostOnCalloutCodegen } from '@test/functional-api/callout/post/post.request.params';

import { CommunityRole } from '@alkemio/client-lib';
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
    await sendMessageToRoomCodegen(
      entitiesId.opportunity.id,
      'test',
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaborationCodegen(
      entitiesId.opportunity.collaborationId
    );

    // Create whiteboard on callout
    await createWhiteboardOnCalloutCodegen(
      entitiesId.opportunity.whiteboardCalloutId
    );

    // Create post on callout and comment to it
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.challenge.calloutId,
      { displayName: postDisplayName },
      postNameID,

      PostTypes.KNOWLEDGE
    );

    const commentId =
      resPostonSpace?.data?.createContributionOnCallout.post?.comments.id ?? '';
    await sendMessageToRoomCodegen(commentId, 'test message on post');

    // Create comment on callout
    await sendMessageToRoomCodegen(
      entitiesId.challenge.discussionCalloutId,
      'comment on discussion callout'
    );

    // Assign user as member and lead
    await assignCommunityRoleToUserCodegen(
      users.notificationsAdmin.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Member
    );
    await assignCommunityRoleToUserCodegen(
      users.notificationsAdmin.email,
      entitiesId.opportunity.communityId,
      CommunityRole.Lead
    );

    // Assign organization as opportunity community member and lead
    await assignCommunityRoleToOrganizationCodegen(
      entitiesId.opportunity.communityId,
      entitiesId.organization.id,
      CommunityRole.Member
    );

    await assignCommunityRoleToOrganizationCodegen(
      entitiesId.opportunity.communityId,
      entitiesId.organization.id,
      CommunityRole.Lead
    );

    // Act
    const resDelete = await deleteOpportunityCodegen(entitiesId.opportunity.id);
    await deleteChallengeCodegen(entitiesId.challenge.id);
    await deleteSpaceCodegen(entitiesId.spaceId);
    await deleteOrganizationCodegen(entitiesId.organization.id);

    // Assert
    expect(resDelete?.data?.deleteOpportunity.id).toEqual(
      entitiesId.opportunity.id
    );
  });
});
