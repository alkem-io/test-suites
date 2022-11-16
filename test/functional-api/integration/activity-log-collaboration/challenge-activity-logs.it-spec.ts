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
import { ActLogs } from './activity-logs-enum';
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
let callDN = '';
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
  callDN = `callout-d-name-${uniqueId}`;
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
  aspectDescription = `aspectDescription-${uniqueId}`;
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
          description: '[Community] New member: admin alkemio',
          triggeredBy: { id: users.globalAdminId },
          type: ActLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.challengeCollaborationId,
      callDN,
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
          description: '[challenge] "admin alkemio"',
          triggeredBy: { id: users.globalAdminId },
          type: ActLogs.MEMBER_JOINED,
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
          type: ActLogs.MEMBER_JOINED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          description: '[Community] New member: hub admin',
          triggeredBy: { id: users.hubAdminId },
          type: ActLogs.MEMBER_JOINED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challengeCollaborationId,
          description: '[Community] New member: hub member',
          resourceID: entitiesId.challengeCommunityId,
          triggeredBy: { id: users.hubMemberId },
          type: ActLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should return CALLOUT_PUBLISHED, CARD_CREATED, CARD_COMMENT, DISCUSSION_COMMENT, CANVAS_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.challengeCollaborationId,
      callDN,
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
      entitiesId.challengeCollaborationId,
      callDN + 'disc',
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
      callDN + 'canvas',
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
      entitiesId.challengeCollaborationId,
      7
    );
    const resAD = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    // Note: as part of the test on 7 new activities are created, but as they cannot be removed, the number is 10 as there are 3 from the previous test

    const expD = async (description: string, type: string) => {
      return expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.hubCollaborationId,
          description,
          triggeredBy: { id: users.globalAdminId },
          type,
        }),
      ]);
    };

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(7);
    expect(resAD).toEqual(
      await expD(`[${callDN}] - callout description`, ActLogs.CALLOUT_PUBLISHED)
    );
    expect(resAD).toEqual(
      await expD(`[${aspectDisplayName}] - `, ActLogs.CARD_CREATED)
    );
    expect(resAD).toEqual(
      await expD('test message on hub aspect', ActLogs.CARD_COMMENT)
    );
    expect(resAD).toEqual(
      await expD(
        `[${callDN + 'disc'}] - discussion callout`,
        ActLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resAD).toEqual(
      await expD('comment on discussion callout', ActLogs.DISCUSSION_COMMENT)
    );
    expect(resAD).toEqual(
      await expD(
        `[${callDN + 'canvas'}] - canvas callout`,
        ActLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resAD).toEqual(
      await expD('[callout canvas]', ActLogs.CANVAS_CREATED)
    );

    // expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(10);
    // expect(resActivityData).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       collaborationID: entitiesId.challengeCollaborationId,
    //       description: `[Callout] New Callout published: '${callDN}'`,
    //       resourceID: calloutId,
    //       triggeredBy: users.globalAdminId,
    //       type: ActivityLogs.CALLOUT_PUBLISHED,
    //     }),
    //   ])
    // );
    // expect(resActivityData).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       collaborationID: entitiesId.challengeCollaborationId,
    //       description: `[Card] New Card created with title: ${aspectDisplayName}`,
    //       resourceID: hubAspectId,
    //       triggeredBy: users.globalAdminId,
    //       type: ActivityLogs.CARD_CREATED,
    //     }),
    //   ])
    // );

    // expect(resActivityData).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       collaborationID: entitiesId.challengeCollaborationId,
    //       description: `[Card] Comment added on card: ${aspectDisplayName}`,
    //       resourceID: hubAspectId,
    //       triggeredBy: users.globalAdminId,
    //       type: ActivityLogs.CARD_COMMENT,
    //     }),
    //   ])
    // );
    // expect(resActivityData).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       collaborationID: entitiesId.challengeCollaborationId,
    //       description: `[Callout] New Callout published: '${callDN +
    //         'disc'}'`,
    //       resourceID: calloutIdDiscussion,
    //       triggeredBy: users.globalAdminId,
    //       type: ActivityLogs.CALLOUT_PUBLISHED,
    //     }),
    //   ])
    // );

    // expect(resActivityData).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       collaborationID: entitiesId.challengeCollaborationId,
    //       description: `[Callout] New comment added on: '${callDN +
    //         'disc'}'`,
    //       resourceID: calloutIdDiscussion,
    //       triggeredBy: users.globalAdminId,
    //       type: ActivityLogs.DISCUSSION_COMMENT,
    //     }),
    //   ])
    // );

    // expect(resActivityData).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       collaborationID: entitiesId.challengeCollaborationId,
    //       description: `[Callout] New Callout published: '${callDN +
    //         'canvas'}'`,
    //       resourceID: calloutIdCanvas,
    //       triggeredBy: users.globalAdminId,
    //       type: ActivityLogs.CALLOUT_PUBLISHED,
    //     }),
    //   ])
    // );

    // expect(resActivityData).toEqual(
    //   expect.arrayContaining([
    //     expect.objectContaining({
    //       collaborationID: entitiesId.challengeCollaborationId,
    //       description: `[Canvas] New Canvas created: '${'callout canvas'}'`,
    //       resourceID: canvasId,
    //       triggeredBy: users.globalAdminId,
    //       type: ActivityLogs.CANVAS_CREATED,
    //     }),
    //   ])
    // );
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
