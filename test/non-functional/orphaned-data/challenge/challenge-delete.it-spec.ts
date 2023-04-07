import {
  AspectTypes,
  createAspectOnCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { createCanvasOnCallout } from '@test/functional-api/integration/canvas/canvas.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { eventOnChallenge } from '@test/functional-api/integration/lifecycle/innovation-flow.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgHub,
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
  ChallengePreferenceType,
  changePreferenceChallenge,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';

const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
const challengeName = 'aspect-chal';
let aspectNameID = '';
let aspectDisplayName = '';

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeForOrgHub(challengeName);
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
});
describe('Full Challenge Deletion', () => {
  test('should delete all challenge related data', async () => {
    // Change challenge preference
    await changePreferenceChallenge(
      entitiesId.hubId,
      ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
      'true'
    );

    // Send challenge community update
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(entitiesId.challengeUpdatesId, 'test'),
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaboration(entitiesId.challengeCollaborationId);

    // Create canvas on callout
    await createCanvasOnCallout(
      entitiesId.challengeCanvasCalloutId,
      'CanvasName'
    );

    // Create card on callout and comment to it
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.challengeCalloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
      AspectTypes.KNOWLEDGE
    );

    const commentId =
      resAspectonHub.body.data.createAspectOnCallout.comments.id;
    await mutation(
      sendComment,
      sendCommentVariablesData(commentId, 'test message on aspect')
    );

    // Create comment on callout
    await postCommentInCallout(
      entitiesId.challengeDiscussionCalloutId,
      'comment on discussion callout'
    );

    // Update challenge lifecycle event
    await eventOnChallenge(entitiesId.challengeId, 'ABANDONED');

    // User application to challenge community
    await createApplication(entitiesId.challengeCommunityId);

    // Assign user as member and lead
    await assignUserAsCommunityMemberFunc(
      entitiesId.challengeCommunityId,
      users.hubMemberId
    );
    await assignUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.hubMemberId
    );

    // Assign organization as challenge community member and lead
    await assignOrganizationAsCommunityMemberFunc(
      entitiesId.challengeCommunityId,
      entitiesId.hubId
    );
    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      entitiesId.hubId
    );

    // Act
    const resDelete = await removeChallenge(entitiesId.challengeId);
    await removeHub(entitiesId.hubId);
    await deleteOrganization(entitiesId.organizationId);

    // Assert
    expect(resDelete.body.data.deleteChallenge.id).toEqual(
      entitiesId.challengeId
    );
  });
});
