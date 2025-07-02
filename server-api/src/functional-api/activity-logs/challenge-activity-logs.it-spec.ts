import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import { getActivityLogOnCollaboration } from './activity-log-params';
import {
  createCalloutOnCalloutsSet,
  deleteCallout,
  updateCalloutVisibility,
} from '@functional-api/callout/callouts.request.params';
import { createPostOnCallout } from '@functional-api/callout/post/post.request.params';
import { sendMessageToRoom } from '../communications/communication.params';
import { createWhiteboardOnCallout } from '../callout/call-for-whiteboards/whiteboard-collection-callout.params.request';
import { assignRoleToUser, joinRoleSet } from '../roleset/roles-request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  ActivityEventType,
  CalloutVisibility,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/types/alkemio-schema';
import {
  CalloutContributionType,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

let calloutDisplayName = '';
let calloutId = '';
let postNameID = '';
let postDisplayName = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'subspace-activity',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      membership: {
        policy: CommunityMembershipPolicy.Open,
      },
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

beforeEach(async () => {
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Activity logs - Subspace', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should return empty arrays', async () => {
    // Act
    const res = await getActivityLogOnCollaboration(
      baseScenario.subspace.collaboration.id,
      5
    );
    const resActivityData = res?.data?.activityLogOnCollaboration;
    // Assert
    expect(resActivityData).toEqual(expect.arrayContaining([]));
  });

  test('should NOT return CALLOUT_PUBLISHED, when created', async () => {
    // Arrange
    const res = await createCalloutOnCalloutsSet(
      baseScenario.subspace.collaboration.calloutsSetId
    );
    calloutId = res?.data?.createCalloutOnCalloutsSet.id ?? '';

    const resActivity = await getActivityLogOnCollaboration(
      baseScenario.subspace.collaboration.id,
      5
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;
    // Assert
    expect(resActivityData).toEqual(expect.arrayContaining([]));
  });

  test('should return MEMBER_JOINED, when user assigned from Admin or individually joined', async () => {
    // Arrange
    await joinRoleSet(
      baseScenario.subspace.community.roleSetId,
      TestUser.SPACE_MEMBER
    );

    await assignRoleToUser(
      TestUserManager.users.spaceAdmin.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Member
    );

    // Act
    const resActivity = await getActivityLogOnCollaboration(
      baseScenario.subspace.collaboration.id,
      3
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;

    // Assert
    expect(resActivityData).toHaveLength(3);
    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: baseScenario.subspace.collaboration.id,
          description: `${TestUserManager.users.spaceAdmin.id}`,
          triggeredBy: { id: TestUserManager.users.globalAdmin.id },
          type: ActivityEventType.MemberJoined,
        }),
      ])
    );

    expect(resActivityData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collaborationID: baseScenario.subspace.collaboration.id,
          description: `${TestUserManager.users.spaceMember.id}`,
          triggeredBy: { id: TestUserManager.users.spaceMember.id },
          type: ActivityEventType.MemberJoined,
        }),
      ])
    );
  });

  // To be updated with the changes related to whiteboard callouts

  test.skip('should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED', async () => {
    // Arrange
    const res = await createCalloutOnCalloutsSet(
      baseScenario.subspace.collaboration.calloutsSetId
    );
    calloutId = res?.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(calloutId, CalloutVisibility.Published);

    const resPostonSpace = await createPostOnCallout(
      calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.GLOBAL_ADMIN
    );
    const postDataCreate =
      resPostonSpace?.data?.createContributionOnCallout.post;
    const postCommentsIdSpace = postDataCreate?.comments.id ?? '';

    await sendMessageToRoom(
      postCommentsIdSpace,
      'test message on space post',
      TestUser.GLOBAL_ADMIN
    );

    const resDiscussion = await createCalloutOnCalloutsSet(
      baseScenario.subspace.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName: calloutDisplayName + 'disc',
            description: 'discussion callout',
          },
        },
        settings: {
          contribution: {
            enabled: true,
            allowedTypes: [CalloutContributionType.Post],
            commentsEnabled: true,
          },
        },
      }
    );
    const calloutIdDiscussion =
      resDiscussion?.data?.createCalloutOnCalloutsSet.id ?? '';
    const discussionCalloutCommentsId =
      resDiscussion?.data?.createCalloutOnCalloutsSet?.comments?.id ?? '';

    await updateCalloutVisibility(
      calloutIdDiscussion,
      CalloutVisibility.Published
    );

    await sendMessageToRoom(
      discussionCalloutCommentsId,
      'comment on discussion callout'
    );

    const resWhiteboard = await createCalloutOnCalloutsSet(
      baseScenario.subspace.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName: calloutDisplayName + 'whiteboard',
            description: 'whiteboard callout',
          },
        },
        settings: {
          contribution: {
            enabled: true,
            allowedTypes: [CalloutContributionType.Whiteboard],
          },
        },
      }
    );
    const calloutIdWhiteboard =
      resWhiteboard?.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(
      calloutIdWhiteboard,
      CalloutVisibility.Published
    );

    await createWhiteboardOnCallout(calloutIdWhiteboard);

    // Act
    const resActivity = await getActivityLogOnCollaboration(
      baseScenario.subspace.collaboration.id,
      7
    );
    const resActivityData = resActivity?.data?.activityLogOnCollaboration;

    // Assert
    const expextedData = async (description: string, type: string) => {
      return expect.arrayContaining([
        expect.objectContaining({
          collaborationID: baseScenario.subspace.collaboration.id,
          description,
          triggeredBy: { id: TestUserManager.users.globalAdmin.id },
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
describe('Access to Activity logs - Subspace', () => {
  beforeAll(async () => {
    await assignRoleToUser(
      TestUserManager.users.spaceMember.id,
      baseScenario.subspace.id,
      RoleName.Admin
    );
  });

  describe('DDT user privileges to Public Subspace activity logs of Private Space', () => {
    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });
      await updateSpaceSettings(baseScenario.subspace.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });
    // Arrange
    test.each`
      userRole
      ${TestUser.GLOBAL_ADMIN}
      ${TestUser.SPACE_ADMIN}
      ${TestUser.SPACE_MEMBER}
    `(
      'User: "$userRole" get message: "$message", when intend to access Public Subspace activity logs of a Private space',
      async ({ userRole }) => {
        // Act
        const resActivity = await getActivityLogOnCollaboration(
          baseScenario.subspace.collaboration.id,
          5,
          userRole
        );

        // Assert
        expect(
          resActivity.data?.activityLogOnCollaboration[0]?.collaborationID
        ).toContain(baseScenario.subspace.collaboration.id);
      }
    );

    test.each`
      userRole                     | message
      ${TestUser.NON_SPACE_MEMBER} | ${'Authorization'}
    `(
      'User: "$userRole" get Error message: "$message", when intend to access Public Subspace activity logs of a Private space',
      async ({ userRole, message }) => {
        // Act
        const resActivity = await getActivityLogOnCollaboration(
          baseScenario.subspace.collaboration.id,
          5,
          userRole
        );

        // Assert
        expect(resActivity.error?.errors[0]?.message).toContain(message);
      }
    );
  });

  describe('DDT user privileges to Public Subspace activity logs of Public Space', () => {
    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
      await updateSpaceSettings(baseScenario.subspace.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });
    // Arrange
    test.each`
      userRole
      ${TestUser.GLOBAL_ADMIN}
      ${TestUser.SPACE_ADMIN}
      ${TestUser.SPACE_MEMBER}
      ${TestUser.NON_SPACE_MEMBER}
    `(
      'User: "$userRole" get message: "$message", when intend to access Public Subspace activity logs of a Public space',
      async ({ userRole }) => {
        // Act
        const resActivity = await getActivityLogOnCollaboration(
          baseScenario.subspace.collaboration.id,
          5,
          userRole
        );

        // Assert
        expect(
          resActivity.data?.activityLogOnCollaboration[0]?.collaborationID
        ).toContain(baseScenario.subspace.collaboration.id);
      }
    );
  });
});
