import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeForOrgHub,
  createOrgAndHubWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';

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
  assignChallengeAdmin,
  userAsHubAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';

let challengeName = 'aspect-chal';
let calloutNameID = '';
let calloutDisplayName = '';
let calloutId = '';
let aspectNameID = '';
let aspectDisplayName = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const hubName = 'callout-eco-name' + uniqueId;
const hubNameId = 'callout-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );

  await createChallengeForOrgHub(challengeName);
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  calloutNameID = `callout-name-id-${uniqueId}`;
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
});

describe('Activity logs - Challenge', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should return empty arrays', async () => {
    // Act
    const res = await activityLogOnCollaboration(
      entitiesId.challengeCollaborationId,
      5
    );
    const resActivityData = res.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          // eslint-disable-next-line quotes
          description: "[challenge] 'admin alkemio'",
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.challengeCollaborationId,
      calloutDisplayName,
      calloutNameID
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    const resActivity = await activityLogOnCollaboration(
      entitiesId.challengeCollaborationId,
      5
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          // eslint-disable-next-line quotes
          description: "[challenge] 'admin alkemio'",
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should return MEMBER_JOINED, when user assigned from Admin or individually joined', async () => {
    // Arrange

    await joinCommunity(entitiesId.challengeCommunityId, TestUser.HUB_MEMBER);

    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.challengeCommunityId,
        users.hubAdminId
      )
    );

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.challengeCollaborationId,
      5
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(3);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          // eslint-disable-next-line quotes
          description: "[challenge] 'admin alkemio'",
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          // eslint-disable-next-line quotes
          description: "[challenge] 'hub admin'",
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          // eslint-disable-next-line quotes
          description: "[challenge] 'hub member'",
          triggeredBy: { id: users.hubMemberId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should return CALLOUT_PUBLISHED, CARD_CREATED, CARD_COMMENT, DISCUSSION_COMMENT, CANVAS_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.challengeCollaborationId,
      calloutDisplayName,
      calloutNameID
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    const resAspectonHub = await createAspectOnCallout(
      calloutId,
      aspectDisplayName,
      aspectNameID,
      AspectTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    const aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
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
      entitiesId.challengeCollaborationId,
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
      entitiesId.challengeCollaborationId,
      calloutDisplayName + 'canvas',
      calloutNameID + 'ca',
      'canvas callout',
      CalloutState.OPEN,
      CalloutType.CANVAS
    );
    const calloutIdCanvas = resCanvas.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutIdCanvas, CalloutVisibility.PUBLISHED);

    await createCanvasOnCallout(calloutIdCanvas, 'callout canvas');

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.challengeCollaborationId,
      7
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    const expextedData = async (description: string, type: string) => {
      return expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          description,
          triggeredBy: { id: users.globalAdminId },
          type,
        }),
      ]);
    };

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(7);
    expect(resActivityData).toEqual(
      await expextedData(
        `[${calloutDisplayName}] - callout description`,
        ActivityLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(`[${aspectDisplayName}] - `, ActivityLogs.CARD_CREATED)
    );
    expect(resActivityData).toEqual(
      await expextedData(
        'test message on hub aspect',
        ActivityLogs.CARD_COMMENT
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        `[${calloutDisplayName + 'disc'}] - discussion callout`,
        ActivityLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        'comment on discussion callout',
        ActivityLogs.DISCUSSION_COMMENT
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        `[${calloutDisplayName + 'canvas'}] - canvas callout`,
        ActivityLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resActivityData).toEqual(
      await expextedData('[callout canvas]', ActivityLogs.CANVAS_CREATED)
    );
  });
});

// Logs used in the tests below are from the previously executed tests in the file
describe('Access to Activity logs - Challenge', () => {
  beforeAll(async () => {
    await mutation(
      assignChallengeAdmin,
      userAsHubAdminVariablesData(users.hubAdminId, entitiesId.challengeId)
    );
  });

  describe('DDT user privileges to Challenge activity logs of Private Hub', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", when intend to access Challenge activity logs of a Private hub',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.challengeCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to Challenge activity logs of Public Hub', () => {
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
      'User: "$userRole" get message: "$message", when intend to access Challenge activity logs of a Public hub',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.challengeCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });
});
