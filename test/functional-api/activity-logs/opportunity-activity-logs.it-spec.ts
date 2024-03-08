import '@test/utils/array.matcher';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import {
  CalloutState,
  CalloutType,
  CommunityRole,
  SpacePreferenceType,
  ActivityEventType,
  CalloutVisibility,
} from '@test/generated/alkemio-schema';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import {
  createCalloutOnCollaborationCodegen,
  deleteCalloutCodegen,
  updateCalloutVisibilityCodegen,
} from '@test/functional-api/callout/callouts.request.params';
import { getActivityLogOnCollaborationCodegen } from './activity-log-params';
import {
  PostTypes,
  createPostOnCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import { sendMessageToRoomCodegen } from '../communications/communication.params';
import { createWhiteboardOnCalloutCodegen } from '../callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { assignCommunityRoleToUserCodegen } from '../roles/roles-request.params';
import { entitiesId } from '../roles/community/communications-helper';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let callDN = '';
let calloutId = '';
let postNameID = '';
let postDisplayName = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromAnyone,
    'true'
  );

  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  callDN = `callout-d-name-${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Activity logs - Opportunity', () => {
  afterEach(async () => {
    await deleteCalloutCodegen(calloutId);
  });
  test('should return empty arrays', async () => {
    // Act
    const resActivity = await getActivityLogOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      5
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toEqual([]);
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      { framing: { profile: { displayName: callDN } } }
    );
    calloutId = res?.data?.createCalloutOnCollaboration.id ?? '';

    const resActivity = await getActivityLogOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      5
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;

    expect(resActivityData).toEqual([]);
  });

  test('should return MEMBER_JOINED, when user assigned from Admin', async () => {
    // Arrange
    await assignCommunityRoleToUserCodegen(
      users.challengeMemberId,
      entitiesId.opportunityCommunityId,
      CommunityRole.Member
    );

    // Act
    const resActivity = await getActivityLogOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      5
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toHaveLength(1);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.opportunityCollaborationId,
          // eslint-disable-next-line quotes
          description: `[opportunity] '${users.challengeMemberNameId}'`,
          triggeredBy: { id: users.globalAdminId },
          type: ActivityEventType.MemberJoined,
        }),
      ])
    );
  });

  // To be updated with the changes related to whiteboard callouts
  test.skip('should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      { framing: { profile: { displayName: callDN } } }
    );
    calloutId = res?.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published
    );

    const resPostonSpace = await createPostOnCalloutCodegen(
      calloutId,
      { displayName: postDisplayName },
      postNameID,

      PostTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    const postDataCreate = resPostonSpace?.data?.createContributionOnCallout;
    const postCommentsIdSpace = postDataCreate?.post?.comments.id ?? '';

    const messageRes = await sendMessageToRoomCodegen(
      postCommentsIdSpace,
      'test message on space post',
      TestUser.GLOBAL_ADMIN
    );
    messageRes?.data?.sendMessageToRoom.id;

    const resDiscussion = await createCalloutOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      {
        framing: {
          profile: {
            displayName: callDN + 'disc',
            description: 'discussion callout',
          },
        },
        contributionPolicy: {
          state: CalloutState.Open,
        },
        type: CalloutType.Whiteboard,
      }
    );
    const calloutIdDiscussion =
      resDiscussion?.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutIdDiscussion,
      CalloutVisibility.Published
    );

    await sendMessageToRoomCodegen(
      calloutIdDiscussion,
      'comment on discussion callout'
    );

    const resWhiteboard = await createCalloutOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      {
        framing: {
          profile: {
            displayName: callDN + 'whiteboard',
            description: 'whiteboard callout',
          },
        },
        contributionPolicy: {
          state: CalloutState.Open,
        },
        type: CalloutType.Whiteboard,
      }
    );
    const calloutIdWhiteboard =
      resWhiteboard?.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutIdWhiteboard,
      CalloutVisibility.Published
    );
    await createWhiteboardOnCalloutCodegen(calloutIdWhiteboard);

    // Act
    const resActivity = await getActivityLogOnCollaborationCodegen(
      entitiesId.opportunityCollaborationId,
      7
    );
    const resAD = resActivity?.data?.activityLogOnCollaboration;

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
    expect(resAD).toHaveLength(7);
    expect(resAD).toEqual(
      await expextedData(
        `[${callDN}] - callout description`,
        ActivityEventType.CalloutPublished
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        `[${postDisplayName}] - `,
        ActivityEventType.CalloutPostCreated
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        'test message on space post',
        ActivityEventType.CalloutPostComment
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        `[${callDN + 'disc'}] - discussion callout`,
        ActivityEventType.CalloutPublished
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        'comment on discussion callout',
        ActivityEventType.DiscussionComment
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        `[${callDN + 'whiteboard'}] - whiteboard callout`,
        ActivityEventType.CalloutPublished
      )
    );
    expect(resAD).toEqual(
      await expextedData(
        '[callout whiteboard]',
        ActivityEventType.CalloutWhiteboardCreated
      )
    );
  });
});

// Logs used in the tests below are from the previously executed tests in the file
describe('Access to Activity logs - Opportunity', () => {
  beforeAll(async () => {
    await assignCommunityRoleToUserCodegen(
      users.spaceMemberId,
      entitiesId.opportunityId,
      CommunityRole.Admin
    );
  });

  describe('DDT user privileges to Opportunity activity logs of Private Space', () => {
    // Arrange
    test.each`
      userRole                 | message
      ${TestUser.GLOBAL_ADMIN} | ${entitiesId.opportunityCollaborationId}
      ${TestUser.HUB_ADMIN}    | ${entitiesId.opportunityCollaborationId}
      ${TestUser.HUB_MEMBER}   | ${entitiesId.opportunityCollaborationId}
    `(
      'User: "$userRole" get message: "$message", when intend to access Opportunity activity logs of a Private space',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await getActivityLogOnCollaborationCodegen(
          entitiesId.opportunityCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(
          resActivity.data?.activityLogOnCollaboration[0].collaborationID
        ).toContain(message);
      }
    );

    test.each`
      userRole                   | message
      ${TestUser.NON_HUB_MEMBER} | ${'Authorization'}
    `(
      'User: "$userRole" get Error message: "$message", when intend to access Opportunity activity logs of a Private space',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await getActivityLogOnCollaborationCodegen(
          entitiesId.opportunityCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.error?.errors[0]?.message).toContain(message);
      }
    );
  });

  describe('DDT user privileges to Opportunity activity logs of Public Space', () => {
    beforeAll(async () => {
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AuthorizationAnonymousReadAccess,
        'true'
      );
    });
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${entitiesId.opportunityCollaborationId}
      ${TestUser.HUB_ADMIN}      | ${entitiesId.opportunityCollaborationId}
      ${TestUser.HUB_MEMBER}     | ${entitiesId.opportunityCollaborationId}
      ${TestUser.NON_HUB_MEMBER} | ${entitiesId.opportunityCollaborationId}
    `(
      'User: "$userRole" get message: "$message", when intend to access Opportunity activity logs of a Public space',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await getActivityLogOnCollaborationCodegen(
          entitiesId.opportunityCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(
          resActivity.data?.activityLogOnCollaboration[0].collaborationID
        ).toContain(message);
      }
    );
  });
});
