import '@test/utils/array.matcher';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeSpace } from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';

import { PostTypes, createPostOnCallout } from '../post/post.request.params';

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
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { ActivityLogs } from './activity-logs-enum';
import { mutation } from '@test/utils/graphql.request';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { postCommentInCallout } from '../comments/comments.request.params';
import { createWhiteboardOnCallout } from '../whiteboard/whiteboard.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignSpaceAdmin,
  userAsSpaceAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  RoleType,
  assignCommunityRoleToUser,
} from '../community/community.request.params';

let calloutDisplayName = '';
let calloutId = '';
let postNameID = '';
let postDisplayName = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Activity logs - Space', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should return empty arrays', async () => {
    // Act
    const res = await activityLogOnCollaboration(
      entitiesId.spaceCollaborationId,
      5
    );

    // Assert
    expect(res.body.data.activityLogOnCollaboration).toEqual([]);
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    const resActivity = await activityLogOnCollaboration(
      entitiesId.spaceCollaborationId,
      5
    );

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toEqual([]);
  });

  test.only('should return MEMBER_JOINED, when user assigned from Admin or individually joined', async () => {
    // Arrange

    const a = await joinCommunity(
      entitiesId.spaceCommunityId,
      TestUser.HUB_MEMBER
    );
    console.log(a.body);
    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.spaceCommunityId,
        users.spaceAdminId
      )
    );

    const b = await assignCommunityRoleToUser(
      users.spaceAdminId,
      entitiesId.spaceCommunityId,
      RoleType.ADMIN
    );
    console.log(b.body);

    // Act
    const resActivity = await activityLogOnCollaboration(
      entitiesId.spaceCollaborationId,
      5
    );
    const resActivityData = resActivity.body.data.activityLogOnCollaboration;

    // Assert
    expect(resActivity.body.data.activityLogOnCollaboration).toHaveLength(2);
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
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    const resPostonSpace = await createPostOnCallout(
      calloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    const postDataCreate = resPostonSpace.body.data.createPostOnCallout;
    postDataCreate.id;
    const postCommentsIdSpace = postDataCreate.comments.id;

    const messageRes = await mutation(
      sendComment,
      sendCommentVariablesData(
        postCommentsIdSpace,
        'test message on space post'
      ),
      TestUser.GLOBAL_ADMIN
    );
    messageRes.body.data.sendMessageToRoom.id;

    const resDiscussion = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      {
        profile: {
          displayName: calloutDisplayName + 'disc',
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

    const resWhiteboard = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      {
        profile: {
          displayName: calloutDisplayName + 'whiteboard',
          description: 'whiteboard callout',
        },
        state: CalloutState.OPEN,
        type: CalloutType.WHITEBOARD,
      }
    );
    const calloutIdWhiteboard =
      resWhiteboard.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutIdWhiteboard,
      CalloutVisibility.PUBLISHED
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
    await mutation(
      assignSpaceAdmin,
      userAsSpaceAdminVariablesData(users.spaceAdminId, entitiesId.spaceId)
    );
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
      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.ANONYMOUS_READ_ACCESS,
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
