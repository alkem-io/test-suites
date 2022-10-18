import '@test/utils/array.matcher';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';

import {
  AspectTypes,
  createAspectOnCallout,
} from '../aspect/aspect.request.params';

import { TestUser } from '@test/utils';
import { activityLogOnCollaboration } from './activity-log-params';
import {
  CalloutState,
  CalloutType,
  CalloutVisibility,
} from '../callouts/callouts-enum';
import {
  deleteCallout,
  createCalloutOnCollaboration,
  updateCalloutVisibility,
} from '../callouts/callouts.request.params';
import {
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { ActivityLogs } from './activity-logs-enum';
import { mutation } from '@test/utils/graphql.request';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { postCommentInCallout } from '../comments/comments.request.params';
import { createCanvasOnCallout } from '../canvas/canvas.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignHubAdmin,
  userAsHubAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';

let calloutNameID = '';
let calloutDisplayName = '';
let calloutId = '';
let hubAspectId = '';
let aspectNameID = '';
let aspectDisplayName = '';
let aspectDescription = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const hubName = 'callout-eco-name' + uniqueId;
const hubNameId = 'callout-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  calloutNameID = `callout-name-id-${uniqueId}`;
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
  aspectDescription = `aspectDescription-${uniqueId}`;
});

describe('Activity logs - Hub', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should return empty arrays', async () => {
    // Act
    const res = await activityLogOnCollaboration(entitiesId.hubCollaborationId);

    // Assert
    expect(res.body.data.activityLogOnCollaboration).toEqual([]);
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    const resActivity = await activityLogOnCollaboration(
      entitiesId.hubCollaborationId
    );

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toEqual([]);
  });

  test('should return MEMBER_JOINED, when user assigned from Admin or individually joined', async () => {
    // Arrange

    await joinCommunity(entitiesId.hubCommunityId, TestUser.HUB_MEMBER);

    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.hubCommunityId,
        users.hubAdminId
      )
    );

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.hubCollaborationId
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(2);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: '[Community] New member: hub admin',
          resourceID: entitiesId.hubCommunityId,
          triggeredBy: users.hubAdminId,
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: '[Community] New member: hub member',
          resourceID: entitiesId.hubCommunityId,
          triggeredBy: users.hubMemberId,
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should return CALLOUT_PUBLISHED, CARD_CREATED, CARD_COMMENT, DISCUSSION_COMMENT, CANVAS_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    const resAspectonHub = await createAspectOnCallout(
      calloutId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    const aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
    hubAspectId = aspectDataCreate.id;
    const aspectCommentsIdHub = aspectDataCreate.comments.id;

    const messageRes = await mutation(
      sendComment,
      sendCommentVariablesData(
        aspectCommentsIdHub,
        'test message on hub aspect'
      ),
      TestUser.GLOBAL_ADMIN
    );
    messageRes.body.data.sendComment.id;

    const resDiscussion = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName + 'disc',
      calloutNameID + 'di',
      'discussion callout',
      CalloutState.OPEN,
      CalloutType.COMMENTS
    );
    const calloutIdDiscussion =
      resDiscussion.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutIdDiscussion,
      CalloutVisibility.PUBLISHED
    );

    await postCommentInCallout(
      calloutIdDiscussion,
      'comment on discussion callout'
    );

    const resCanvas = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName + 'canvas',
      calloutNameID + 'ca',
      'canvas callout',
      CalloutState.OPEN,
      CalloutType.CANVAS
    );
    const calloutIdCanvas = resCanvas.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutIdCanvas, CalloutVisibility.PUBLISHED);

    const canvas = await createCanvasOnCallout(
      calloutIdCanvas,
      'callout canvas'
    );
    const canvasId = canvas.body.data.createCanvasOnCallout.id;

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.hubCollaborationId
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    // Note: as part of the test on 7 new activities are created, but as they cannot be removed, the number is 9 as there are 2 from the previous test
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(9);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: `[Callout] New Callout published: '${calloutDisplayName}'`,
          resourceID: calloutId,
          triggeredBy: users.globalAdminId,
          type: ActivityLogs.CALLOUT_PUBLISHED,
        }),
      ])
    );
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: `[Card] New Card created with title: ${aspectDisplayName}`,
          resourceID: hubAspectId,
          triggeredBy: users.globalAdminId,
          type: ActivityLogs.CARD_CREATED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: `[Card] Comment added on card: ${aspectDisplayName}`,
          resourceID: hubAspectId,
          triggeredBy: users.globalAdminId,
          type: ActivityLogs.CARD_COMMENT,
        }),
      ])
    );
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: `[Callout] New Callout published: '${calloutDisplayName +
            'disc'}'`,
          resourceID: calloutIdDiscussion,
          triggeredBy: users.globalAdminId,
          type: ActivityLogs.CALLOUT_PUBLISHED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: `[Callout] New comment added on: '${calloutDisplayName +
            'disc'}'`,
          resourceID: calloutIdDiscussion,
          triggeredBy: users.globalAdminId,
          type: ActivityLogs.DISCUSSION_COMMENT,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: `[Callout] New Callout published: '${calloutDisplayName +
            'canvas'}'`,
          resourceID: calloutIdCanvas,
          triggeredBy: users.globalAdminId,
          type: ActivityLogs.CALLOUT_PUBLISHED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description: `[Canvas] New Canvas created: '${'callout canvas'}'`,
          resourceID: canvasId,
          triggeredBy: users.globalAdminId,
          type: ActivityLogs.CANVAS_CREATED,
        }),
      ])
    );
  });
});

// Logs used in the tests below are from the previously executed tests in the file
describe('Access to Activity logs - Hub', () => {
  beforeAll(async () => {
    await mutation(
      assignHubAdmin,
      userAsHubAdminVariablesData(users.hubAdminId, entitiesId.hubId)
    );
  });

  describe('DDT user privileges to Private Hub activity logs', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", when intend to access Private hub activity logs',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.hubCollaborationId,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to Public Hub activity logs', () => {
    beforeAll(async () => {
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'true'
      );
    });
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.NON_HUB_MEMBER} | ${'"data":{"activityLogOnCollaboration"'}
    `(
      'User: "$userRole" get message: "$message", when intend to access Public hub activity logs',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.hubCollaborationId,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });
});
