import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeWithUsers,
  createOpportunityForChallenge,
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
import {
  assignUserAsOpportunityAdmin,
  userAsHubAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { users } from '@test/utils/queries/users-data';

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
let callDN = '';
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

  await createChallengeWithUsers(challengeName);
  await createOpportunityForChallenge(opportunityName);
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  callDN = `callout-d-name-${uniqueId}`;
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
});

describe('Activity logs - Opportunity', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should return empty arrays', async () => {
    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.opportunityCollaborationId,
      5
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert

    expect(resActivityData).toEqual([
      {
        collaborationID: entitiesId.opportunityCollaborationId,
        // eslint-disable-next-line quotes
        description: `[opportunity] '${users.globalAdminNameId}'`,
        triggeredBy: { id: users.globalAdminId },
        type: ActivityLogs.MEMBER_JOINED,
      },
    ]);
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      { profile: { displayName: callDN } }
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    const resActivity = await activityLogOnCollaboration(
      entitiesId.opportunityCollaborationId,
      5
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    expect(resActivityData).toEqual([
      {
        collaborationID: entitiesId.opportunityCollaborationId,
        // eslint-disable-next-line quotes
        description: `[opportunity] '${users.globalAdminNameId}'`,
        triggeredBy: { id: users.globalAdminId },
        type: ActivityLogs.MEMBER_JOINED,
      },
    ]);
  });

  test('should return MEMBER_JOINED, when user assigned from Admin', async () => {
    // Arrange

    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.opportunityCommunityId,
        users.challengeMemberId
      )
    );

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.opportunityCollaborationId,
      5
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(2);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.opportunityCollaborationId,
          // eslint-disable-next-line quotes
          description: `[opportunity] '${users.challengeMemberNameId}'`,
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  // To be updated with the changes related to canvas callouts
  test.skip('should return CALLOUT_PUBLISHED, CARD_CREATED, CARD_COMMENT, DISCUSSION_COMMENT, CANVAS_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      { profile: { displayName: callDN } }
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    const resAspectonHub = await createAspectOnCallout(
      calloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
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
    messageRes.body.data.sendMessageToRoom.id;

    const resDiscussion = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      {
        profile: {
          displayName: callDN + 'disc',
          description: 'discussion callout',
        },
        state: CalloutState.OPEN,
        type: CalloutType.COMMENTS,
      }
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
      entitiesId.opportunityCollaborationId,
      {
        profile: {
          displayName: callDN + 'canvas',
          description: 'canvas callout',
        },
        state: CalloutState.OPEN,
        type: CalloutType.CANVAS,
      }
    );
    const calloutIdCanvas = resCanvas.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutIdCanvas, CalloutVisibility.PUBLISHED);
    await createCanvasOnCallout(calloutIdCanvas, 'callout canvas');

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.opportunityCollaborationId,
      7
    );
    const resAD = resActivity.body.data.activityLogOnCollaboration;

    // Assert

    const expextedData = async (description: string, type: string) => {
      return expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.opportunityCollaborationId,
          description,
          triggeredBy: { id: users.globalAdminId },
          type,
        }),
      ]);
    };

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(7);
    expect(resAD).toEqual(
      await expextedData(
        `[${callDN}] - callout description`,
        ActivityLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resAD).toEqual(
      await expextedData(`[${aspectDisplayName}] - `, ActivityLogs.CARD_CREATED)
    );
    expect(resAD).toEqual(
      await expextedData(
        'test message on hub aspect',
        ActivityLogs.CARD_COMMENT
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        `[${callDN + 'disc'}] - discussion callout`,
        ActivityLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        'comment on discussion callout',
        ActivityLogs.DISCUSSION_COMMENT
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        `[${callDN + 'canvas'}] - canvas callout`,
        ActivityLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resAD).toEqual(
      await expextedData('[callout canvas]', ActivityLogs.CANVAS_CREATED)
    );
  });
});

// Logs used in the tests below are from the previously executed tests in the file
describe('Access to Activity logs - Opportunity', () => {
  beforeAll(async () => {
    await mutation(
      assignUserAsOpportunityAdmin,
      userAsHubAdminVariablesData(users.hubMemberId, entitiesId.opportunityId)
    );
  });

  describe('DDT user privileges to Opportunity activity logs of Private Hub', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", when intend to access Opportunity activity logs of a Private hub',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.opportunityCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to Opportunity activity logs of Public Hub', () => {
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
      'User: "$userRole" get message: "$message", when intend to access Opportunity activity logs of a Public hub',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.opportunityCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });
});
