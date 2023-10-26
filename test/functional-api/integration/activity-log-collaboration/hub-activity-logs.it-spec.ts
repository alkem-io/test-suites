import '@test/utils/array.matcher';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  PostTypes,
  createPostOnCalloutCodegen,
} from '../post/post.request.params';
import { TestUser } from '@test/utils';
import { activityLogOnCollaboration } from './activity-log-params';
import {
  deleteCalloutCodegen,
  createCalloutOnCollaborationCodegen,
  updateCalloutVisibilityCodegen,
} from '../callouts/callouts.request.params';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { ActivityLogs } from './activity-logs-enum';
import { mutation } from '@test/utils/graphql.request';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { postCommentInCallout } from '../comments/comments.request.params';
import { createWhiteboardOnCallout } from '../whiteboard/whiteboard.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import { users } from '@test/utils/queries/users-data';
import { assignCommunityRoleToUserCodegen } from '../community/community.request.params';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import {
  CalloutState,
  CalloutType,
  CalloutVisibility,
  CommunityRole,
  SpacePreferenceType,
} from '@alkemio/client-lib/dist/types/alkemio-schema';

let calloutDisplayName = '';
let calloutId = '';
let postNameID = '';
let postDisplayName = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
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
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

beforeEach(async () => {
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Activity logs - Space', () => {
  afterEach(async () => {
    await deleteCalloutCodegen(calloutId);
  });
  test('should return only memberJoined', async () => {
    // Act
    const res = await activityLogOnCollaboration(
      entitiesId.spaceCollaborationId,
      5
    );
    const resActivityData = res.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toHaveLength(1);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.spaceCollaborationId,
          // eslint-disable-next-line quotes
          description: `[space] '${users.globalAdminNameId}'`,
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    const resActivity = await activityLogOnCollaboration(
      entitiesId.spaceCollaborationId,
      5
    );

    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toHaveLength(1);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.spaceCollaborationId,
          // eslint-disable-next-line quotes
          description: `[space] '${users.globalAdminNameId}'`,
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  test('should return MEMBER_JOINED, when user assigned from Admin or individually joined', async () => {
    // Arrange
    await joinCommunity(entitiesId.spaceCommunityId, TestUser.HUB_MEMBER);

    await assignCommunityRoleToUserCodegen(
      users.spaceAdminId,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );
    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.spaceCollaborationId,
      5
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(3);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.spaceCollaborationId,
          // eslint-disable-next-line quotes
          description: `[space] '${users.spaceAdminNameId}'`,
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.spaceCollaborationId,
          // eslint-disable-next-line quotes
          description: `[space] '${users.globalAdminNameId}'`,
          triggeredBy: { id: users.globalAdminId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.spaceCollaborationId,
          // eslint-disable-next-line quotes
          description: `[space] '${users.spaceMemberNameId}'`,
          triggeredBy: { id: users.spaceMemberId },
          type: ActivityLogs.MEMBER_JOINED,
        }),
      ])
    );
  });

  // To be updated with the changes related to whiteboard callouts
  test.skip('should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

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
    const postDataCreate =
      resPostonSpace.data?.createContributionOnCallout.post;
    const postCommentsIdSpace = postDataCreate?.comments.id ?? '';

    const messageRes = await mutation(
      sendComment,
      sendCommentVariablesData(
        postCommentsIdSpace,
        'test message on space post'
      ),
      TestUser.GLOBAL_ADMIN
    );
    messageRes.body.data.sendMessageToRoom.id;

    const resDiscussion = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
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
        type: CalloutType.Post,
      }
    );
    const calloutIdDiscussion =
      resDiscussion.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutIdDiscussion,
      CalloutVisibility.Published
    );

    await postCommentInCallout(
      calloutIdDiscussion,
      'comment on discussion callout'
    );

    const resWhiteboard = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
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
      resWhiteboard.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutIdWhiteboard,
      CalloutVisibility.Published
    );

    await createWhiteboardOnCallout(calloutIdWhiteboard, 'callout whiteboard');

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.spaceCollaborationId,
      7
    );

    const resActivityData = resActivity.body.data.activityLogOnCollaboration;
    const expextedData = async (description: string, type: string) => {
      return expect.arrayContaining([
        expect.objectContaining({
          collaborationID: entitiesId.spaceCollaborationId,
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
      await expextedData(`[${postDisplayName}] - `, ActivityLogs.POST_CREATED)
    );
    expect(resActivityData).toEqual(
      await expextedData(
        'test message on space post',
        ActivityLogs.POST_COMMENT
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
        `[${calloutDisplayName + 'whiteboard'}] - whiteboard callout`,
        ActivityLogs.CALLOUT_PUBLISHED
      )
    );
    expect(resActivityData).toEqual(
      await expextedData(
        '[callout whiteboard]',
        ActivityLogs.WHITEBOARD_CREATED
      )
    );
  });
});

// Logs used in the tests below are from the previously executed tests in the file
describe('Access to Activity logs - Space', () => {
  beforeAll(async () => {
    await assignCommunityRoleToUserCodegen(
      users.spaceAdminId,
      entitiesId.spaceCommunityId,
      CommunityRole.Admin
    );
    // await mutation(
    //   assignSpaceAdmin,
    //   userAsSpaceAdminVariablesData(users.spaceAdminId, entitiesId.spaceId)
    // );
  });

  describe('DDT user privileges to Private Space activity logs', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", when intend to access Private space activity logs',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.spaceCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to Public Space activity logs', () => {
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
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"activityLogOnCollaboration"'}
      ${TestUser.NON_HUB_MEMBER} | ${'"data":{"activityLogOnCollaboration"'}
    `(
      'User: "$userRole" get message: "$message", when intend to access Public space activity logs',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await activityLogOnCollaboration(
          entitiesId.spaceCollaborationId,
          5,
          userRole
        );

        // Assert
        expect(resActivity.text).toContain(message);
      }
    );
  });
});
