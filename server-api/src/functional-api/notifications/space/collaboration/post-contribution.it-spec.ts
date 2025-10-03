/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';

import { delay } from '@alkemio/tests-lib';
import {
  createPostOnCallout,
  deletePost,
} from '@functional-api/callout/post/post.request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { notif } from '../../notification.helpers';

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

    await delay(1000);
    const mails = await getMailsData();
    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(
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

    await delay(1000);
    const mails = await getMailsData();
    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
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

    await delay(1000);
    const mails = await getMailsData();
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

    await delay(1000);
    const mails = await getMailsData();
    expect(mails[1]).toEqual(3);
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

    expect(mails[0]).toEqual(
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
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
