import {
  AspectTypes,
  createAspectOnCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import { createCalloutOnCollaboration } from '@test/functional-api/integration/callouts/callouts.request.params';
import { createCanvasOnCallout } from '@test/functional-api/integration/canvas/canvas.request.params';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import {
  HubVisibility,
  removeHub,
  updateHubVisibility,
} from '@test/functional-api/integration/hub/hub.request.params';

import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';

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
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
let aspectNameID = '';
let aspectDisplayName = '';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
});
describe('Full Hub Deletion', () => {
  test('should delete all hub related data', async () => {
    // Change hub preference
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );

    // Send hub community update
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test'),
      TestUser.GLOBAL_ADMIN
    );

    // Create callout
    await createCalloutOnCollaboration(entitiesId.hubCollaborationId);

    // Create canvas on callout
    await createCanvasOnCallout(entitiesId.hubCanvasCalloutId, 'CanvasName');

    // Create card on callout and comment to it
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
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
      entitiesId.hubDiscussionCalloutId,
      'comment on discussion callout'
    );

    // User application to hub community
    await createApplication(entitiesId.hubCommunityId);

    // Assign user as member and lead
    await assignUserAsCommunityMemberFunc(
      entitiesId.hubCommunityId,
      users.hubMemberId
    );
    await assignUserAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      users.hubMemberId
    );

    // Assign organization as hub community member and lead
    await assignOrganizationAsCommunityMemberFunc(
      entitiesId.hubCommunityId,
      entitiesId.hubId
    );
    await assignOrganizationAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      entitiesId.hubId
    );

    // Update hu visibility
    await updateHubVisibility(entitiesId.hubId, HubVisibility.DEMO);

    // Act
    const resDelete = await removeHub(entitiesId.hubId);
    await deleteOrganization(entitiesId.organizationId);
    console.log(resDelete.body);
    // Assert
    expect(resDelete.body.data.deleteHub.id).toEqual(entitiesId.hubId);
  });
});
