import '@test/utils/array.matcher';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeForOrgSpace,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import {
  CalloutState,
  CalloutType,
  CommunityRoleType,
  ActivityEventType,
  CalloutVisibility,
  SpacePrivacyMode,
  CommunityMembershipPolicy,
} from '@test/generated/alkemio-schema';
import {
  deleteSpace,
  updateSpaceSettings,
} from '@test/functional-api/journey/space/space.request.params';
import { getActivityLogOnCollaborationCodegen } from './activity-log-params';
import {
  createCalloutOnCollaborationCodegen,
  deleteCalloutCodegen,
  updateCalloutVisibilityCodegen,
} from '@test/functional-api/callout/callouts.request.params';
import { createPostOnCalloutCodegen } from '@test/functional-api/callout/post/post.request.params';
import { sendMessageToRoomCodegen } from '../communications/communication.params';
import { createWhiteboardOnCalloutCodegen } from '../callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { assignRoleToUser, joinRoleSet } from '../roleset/roles-request.params';
import { entitiesId } from '../../types/entities-helper';
import { deleteOrganization } from '../contributor-management/organization/organization.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let challengeName = 'post-chal';
let calloutDisplayName = '';
let calloutId = '';
let postNameID = '';
let postDisplayName = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await updateSpaceSettings(entitiesId.spaceId, {
    membership: {
      policy: CommunityMembershipPolicy.Open,
    },
  });

  await createChallengeForOrgSpace(challengeName);
});

afterAll(async () => {
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Activity logs - Challenge', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should return empty arrays', async () => {
    // Act
    const res = await getActivityLogOnCollaboration(
      entitiesId.challenge.collaborationId,
      5
    );
    const resActivityData = res?.data?.activityLogOnCollaboration;
    // Assert
    expect(resActivityData).toEqual(expect.arrayContaining([]));
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.challenge.collaborationId
    );
    calloutId = res?.data?.createCalloutOnCollaboration.id ?? '';

    const resActivity = await getActivityLogOnCollaboration(
      entitiesId.challenge.collaborationId,
      5
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;
    // Assert
    expect(resActivityData).toEqual(expect.arrayContaining([]));
  });

  test('should return MEMBER_JOINED, when user assigned from Admin or individually joined', async () => {
    // Arrange
    await joinRoleSet(entitiesId.challenge.roleSetId, TestUser.HUB_MEMBER);

    await assignRoleToUser(
      users.spaceAdmin.id,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Member
    );

    // Act
    const resActivity = await getActivityLogOnCollaboration(
      entitiesId.challenge.collaborationId,
      3
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toHaveLength(3);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challenge.collaborationId,
          description: `${users.spaceAdmin.id}`,
          triggeredBy: { id: users.globalAdmin.id },
          type: ActivityEventType.MemberJoined,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challenge.collaborationId,
          description: `${users.spaceMember.id}`,
          triggeredBy: { id: users.spaceMember.id },
          type: ActivityEventType.MemberJoined,
        }),
      ])
    );
  });

  // To be updated with the changes related to whiteboard callouts

  test.skip('should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.challenge.collaborationId
    );
    calloutId = res?.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.Published
    );

    const resPostonSpace = await createPostOnCallout(
      calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.GLOBAL_ADMIN
    );
    const postDataCreate =
      resPostonSpace?.data?.createContributionOnCallout.post;
    const postCommentsIdSpace = postDataCreate?.comments.id ?? '';

    const messageRes = await sendMessageToRoom(
      postCommentsIdSpace,
      'test message on space post',
      TestUser.GLOBAL_ADMIN
    );
    messageRes?.data?.sendMessageToRoom.id;

    const resDiscussion = await createCalloutOnCollaboration(
      entitiesId.challenge.collaborationId,
      {
        framing: {
          profile: {
            displayName: calloutDisplayName + 'disc',
            description: 'discussion callout',
          },
        },
        contributionPolicy: {
          state: CalloutState.Open,
        },
        type: CalloutType.PostCollection,
      }
    );
    const calloutIdDiscussion =
      resDiscussion?.data?.createCalloutOnCollaboration.id ?? '';
    const discussionCalloutCommentsId =
      resDiscussion?.data?.createCalloutOnCollaboration?.comments?.id ?? '';

    await updateCalloutVisibility(
      calloutIdDiscussion,
      CalloutVisibility.Published
    );

    await sendMessageToRoom(
      discussionCalloutCommentsId,
      'comment on discussion callout'
    );

    const resWhiteboard = await createCalloutOnCollaboration(
      entitiesId.challenge.collaborationId,
      {
        framing: {
          profile: {
            displayName: calloutDisplayName + 'whiteboard',
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

    await updateCalloutVisibility(
      calloutIdWhiteboard,
      CalloutVisibility.Published
    );

    await createWhiteboardOnCallout(calloutIdWhiteboard);

    // Act
    const resActivity = await getActivityLogOnCollaboration(
      entitiesId.challenge.collaborationId,
      7
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;

    // Assert
    const expextedData = async (description: string, type: string) => {
      return expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.challenge.collaborationId,
          description,
          triggeredBy: { id: users.globalAdmin.id },
          type,
        }),
      ]);
    };

    // Assert
    expect(resActivityData).toHaveLength(7);
    expect(resActivityData).toEqual(
      await expextedData(
        `[${calloutDisplayName}] - callout description`,
        ActivityEventType.CalloutPublished
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        `[${postDisplayName}] - `,
        ActivityEventType.CalloutPostCreated
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        'test message on space post',
        ActivityEventType.CalloutPostComment
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        `[${calloutDisplayName + 'disc'}] - discussion callout`,
        ActivityEventType.CalloutPublished
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        'comment on discussion callout',
        ActivityEventType.DiscussionComment
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        `[${calloutDisplayName + 'whiteboard'}] - whiteboard callout`,
        ActivityEventType.CalloutPublished
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        '[callout whiteboard]',
        ActivityEventType.CalloutWhiteboardCreated
      )
    );
  });
});

// Logs used in the tests below are from the previously executed tests in the file
describe('Access to Activity logs - Challenge', () => {
  beforeAll(async () => {
    await assignRoleToUser(
      users.spaceMember.id,
      entitiesId.challenge.id,
      CommunityRoleType.Admin
    );
  });

  describe('DDT user privileges to Public Challenge activity logs of Private Space', () => {
    beforeAll(async () => {
      await updateSpaceSettings(entitiesId.spaceId, {
        privacy: { mode: SpacePrivacyMode.Private },
      });
      await updateSpaceSettings(entitiesId.challenge.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });
    // Arrange
    test.each`
      userRole                 | message
      ${TestUser.GLOBAL_ADMIN} | ${entitiesId.challenge.collaborationId}
      ${TestUser.HUB_ADMIN}    | ${entitiesId.challenge.collaborationId}
      ${TestUser.HUB_MEMBER}   | ${entitiesId.challenge.collaborationId}
    `(
      'User: "$userRole" get message: "$message", when intend to access Public Challenge activity logs of a Private space',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await getActivityLogOnCollaboration(
          entitiesId.challenge.collaborationId,
          5,
          userRole
        );

        // Assert
        expect(
          resActivity.data?.activityLogOnCollaboration[0]?.collaborationID
        ).toContain(message);
      }
    );

    test.each`
      userRole                   | message
      ${TestUser.NON_HUB_MEMBER} | ${'Authorization'}
    `(
      'User: "$userRole" get Error message: "$message", when intend to access Public Challenge activity logs of a Private space',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await getActivityLogOnCollaboration(
          entitiesId.challenge.collaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.error?.errors[0]?.message).toContain(message);
      }
    );
  });

  describe('DDT user privileges to Public Challenge activity logs of Public Space', () => {
    beforeAll(async () => {
      await updateSpaceSettings(entitiesId.spaceId, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
      await updateSpaceSettings(entitiesId.challenge.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${entitiesId.challenge.collaborationId}
      ${TestUser.HUB_ADMIN}      | ${entitiesId.challenge.collaborationId}
      ${TestUser.HUB_MEMBER}     | ${entitiesId.challenge.collaborationId}
      ${TestUser.NON_HUB_MEMBER} | ${entitiesId.challenge.collaborationId}
    `(
      'User: "$userRole" get message: "$message", when intend to access Public Challenge activity logs of a Public space',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await getActivityLogOnCollaboration(
          entitiesId.challenge.collaborationId,
          5,
          userRole
        );

        // Assert
        expect(
          resActivity.data?.activityLogOnCollaboration[0]?.collaborationID
        ).toContain(message);
      }
    );
  });
});
