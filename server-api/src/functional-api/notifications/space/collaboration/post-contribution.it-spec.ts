 
import {
  deleteMailSlurperMails,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';

import {
  createPostOnCallout,
  createPostOnCalloutWithNotification,
  deletePost,
} from '@functional-api/callout/post/post.request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { getActivityLogOnCollaboration } from '@functional-api/activity-logs/activity-log-params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { ActivityEventType } from '@alkemio/client-lib/dist/types/alkemio-schema';
import { notif, getMailsDataSettled } from '../../notification.helpers';

const uniqueId = UniqueIDGenerator.getID();

let spacePostId = '';
let subspacePostId = '';
let subsubspacePostId = '';
let postDisplayName = '';

// Notification settings for post creation
const postNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(false),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(false),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(true),
      collaborationCalloutComment: notif(false),
    },
  },
};

const disablePostNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(false),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(false),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(false),
      collaborationCalloutComment: notif(false),
    },
  },
};

// Helper functions for managing post notifications
const enablePostNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId => updateUserSettings(userId, postNotificationSettings))
  );
};

const disablePostNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disablePostNotificationSettings)
    )
  );
};

const templateMemberResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
      toAddresses: [userEmail],
    }),
  ]);
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'posts-notifications',
  space: {
    collaboration: {
      addPostCallout: false,
      addPostCollectionCallout: true,
      addWhiteboardCallout: false,
      addTutorialCallouts: false,
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
    subspace: {
      collaboration: {
        addPostCallout: false,
        addPostCollectionCallout: true,
        addWhiteboardCallout: false,
        addTutorialCallouts: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {
        collaboration: {
          addPostCallout: false,
          addPostCollectionCallout: true,
          addWhiteboardCallout: false,
          addTutorialCallouts: false,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - post', () => {
  let postNameID = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();

    postNameID = `asp-name-id-${uniqueId}`;
    postDisplayName = `asp-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    // Disable notifications for global support admin
    await disablePostNotifications([
      TestUserManager.users.globalSupportAdmin.id,
    ]);

    // Enable notifications for all relevant users
    await enablePostNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceMember.id,
      TestUserManager.users.subsubspaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subsubspaceAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
    ]);
  });

  afterEach(async () => {
    await deletePost(spacePostId);
    await deletePost(subspacePostId);
    await deletePost(subsubspacePostId);
  });

  test('GA create space post - GA(1), HA (2), HM(6) get notifications', async () => {
    const postSubjectMember = `${baseScenario.space.about.profile.displayName}: New post contribution created by admin, have a look!`;

    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.GLOBAL_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    const mails = await getMailsDataSettled(6);
    expect(mails[1]).toEqual(6);
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('HA create space post - GA(1), HA (1), HM(6) get notifications', async () => {
    const postSubjectMember = `${baseScenario.space.about.profile.displayName}: New post contribution created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SPACE_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    const mails = await getMailsDataSettled(6);
    expect(mails[1]).toEqual(6);

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('HA create subspace post - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const postSubjectMember = `${baseScenario.subspace.about.profile.displayName}: New post contribution created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.subspace.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SPACE_ADMIN
    );
    subspacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    const mails = await getMailsDataSettled(5);
    expect(mails[1]).toEqual(5);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OM create subsubspace post - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const postSubjectMember = `${baseScenario.subsubspace.about.profile.displayName}: New post contribution created by subsubspace, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.subsubspace.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SUBSUBSPACE_MEMBER
    );
    subsubspacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    const mails = await getMailsDataSettled(2);
    expect(mails[1]).toEqual(2);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.globalAdmin.email
      )
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    // Subspace admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );

    // Subspace member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );

    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        postSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OA create subsubspace post - 0 notifications - all roles with notifications disabled', async () => {
    // Disable notifications for all users
    await disablePostNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceMember.id,
      TestUserManager.users.subsubspaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subsubspaceAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
    ]);

    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.subsubspace.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SUBSUBSPACE_ADMIN
    );
    subsubspacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    // Assert
    const mails = await getMailsDataSettled(0);

    expect(mails[1]).toEqual(0);
  });
});

describe('070 contribution notify switch', () => {
  let notifySwitchPostId = '';
  let notifySwitchPostNameID = '';
  let notifySwitchPostDisplayName = '';
  // Built in beforeEach, not at describe scope: baseScenario is only populated
  // by the suite's beforeAll, so reading it during collection throws and takes
  // the whole file (including the pre-existing cases) down with it.
  let notifySwitchSubjectMember = '';

  beforeAll(async () => {
    // This describe is a SIBLING of 'Notifications - post', so it does not
    // inherit that block's beforeAll. Worse, the last test there deliberately
    // disables post notifications for every role -- so without re-enabling
    // them here the "mails arrive" cases below see zero mail, and the
    // suppression case passes VACUOUSLY (it would pass even if the product
    // notified). Mirror the same enable list so each assertion is real.
    await disablePostNotifications([
      TestUserManager.users.globalSupportAdmin.id,
    ]);

    await enablePostNotifications([
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceMember.id,
      TestUserManager.users.subsubspaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subsubspaceAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
    ]);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();

    notifySwitchSubjectMember = `${baseScenario.space.about.profile.displayName}: New post contribution created by admin, have a look!`;

    notifySwitchPostNameID = `nsw-name-id-${uniqueId}`;
    notifySwitchPostDisplayName = `nsw-d-name-${uniqueId}`;
  });

  afterEach(async () => {
    await deletePost(notifySwitchPostId);
  });

  test('sendNotification false suppresses the member AND the admin contribution notification — the admin channel is suppressed by design, not drift', async () => {
    // Act
    const res = await createPostOnCalloutWithNotification(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: notifySwitchPostDisplayName },
      false,
      notifySwitchPostNameID,
      TestUser.GLOBAL_ADMIN
    );
    notifySwitchPostId =
      res.data?.createContributionOnCallout.post?.id ?? '';

    // Assert — nothing arrives at all, on either channel
    const mails = await getMailsDataSettled(0);
    expect(mails[1]).toEqual(0);

    // A member who explicitly opted in to contribution notifications still
    // receives nothing: the sender's suppression is never overridden by a
    // recipient preference.
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );

    // The space-admin contribution notification is suppressed too — one
    // flag suppresses both channels, deliberately.
    expect(mails[0]).not.toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );
  });

  test('sendNotification true notifies exactly as today — same recipients, same content as the omitted-flag path', async () => {
    // Act
    const res = await createPostOnCalloutWithNotification(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: notifySwitchPostDisplayName },
      true,
      notifySwitchPostNameID,
      TestUser.GLOBAL_ADMIN
    );
    notifySwitchPostId =
      res.data?.createContributionOnCallout.post?.id ?? '';

    // Assert — the same six recipients as the neighbouring GA-created-post
    // case above, proving explicit-true is indistinguishable from today.
    const mails = await getMailsDataSettled(6);
    expect(mails[1]).toEqual(6);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.spaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        notifySwitchSubjectMember,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('omitting sendNotification on the flag-aware mutation still notifies everyone — the wire default stays notify, pinned independently of the untouched legacy helper', async () => {
    // Act — call through the new flag-aware operation but never set the
    // argument, exercising GraphQL's own default-value substitution rather
    // than the legacy helper that never had a flag to omit.
    const res = await createPostOnCalloutWithNotification(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: notifySwitchPostDisplayName },
      undefined,
      notifySwitchPostNameID,
      TestUser.GLOBAL_ADMIN
    );
    notifySwitchPostId =
      res.data?.createContributionOnCallout.post?.id ?? '';

    // Assert — mail arrives exactly as it does for the pre-existing
    // omitted-flag helper case above.
    const mails = await getMailsDataSettled(6);
    expect(mails[1]).toEqual(6);
  });

  test('the activity log entry for the contribution is written even though sendNotification is false', async () => {
    // Act
    const res = await createPostOnCalloutWithNotification(
      baseScenario.space.collaboration.calloutPostCollectionId,
      { displayName: notifySwitchPostDisplayName },
      false,
      notifySwitchPostNameID,
      TestUser.GLOBAL_ADMIN
    );
    notifySwitchPostId =
      res.data?.createContributionOnCallout.post?.id ?? '';

    // Drain the (empty) mail expectation first so the activity read below
    // isn't racing the same async work.
    await getMailsDataSettled(0);

    // Assert — the activity log entry for this contribution is present
    // regardless of the suppressed notification.
    const activity = await getActivityLogOnCollaboration(
      baseScenario.space.collaboration.id,
      30
    );
    const entries = activity?.data?.activityLogOnCollaboration ?? [];
    const postCreatedEntry = entries.find(
      entry =>
        entry.type === ActivityEventType.CalloutPostCreated &&
        (entry.description ?? '').includes(notifySwitchPostDisplayName)
    );
    expect(postCreatedEntry).toBeDefined();
  });
});
