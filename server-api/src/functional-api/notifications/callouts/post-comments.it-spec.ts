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
import {
  removeMessageOnRoom,
  sendMessageToRoom,
} from '@functional-api/communications/communication.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

let spacePostId = '';
let subspacePostId = '';
let subsubspacePostId = '';
let postDisplayName = '';
let postCommentsIdSpace = '';
let postCommentsIdSubspace = '';
let postCommentsIdSubsubspace = '';
let messageId = '';
export let preferencesPostCreatedConfig: any[] = [];
export let preferencesPostCommentsCreatedConfig: any[] = [];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'post-comments-notifications',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
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
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
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
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
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

  preferencesPostCreatedConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationPostCreated,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationPostCreatedAdmin,
    },
  ];

  preferencesPostCommentsCreatedConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationPostCommentCreated,
    },
  ];
  await deleteMailSlurperMails();
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - post comments', () => {
  let postNameID = '';
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
  beforeEach(async () => {
    await deleteMailSlurperMails();

    postNameID = `post-name-id-${uniqueId}`;
    postDisplayName = `post-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationPostCommentCreated,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationPostCreated,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationPostCreatedAdmin,
      'false'
    );
    preferencesPostCreatedConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    preferencesPostCommentsCreatedConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await delay(6000);
    await removeMessageOnRoom(
      postCommentsIdSpace,
      messageId,
      TestUser.GLOBAL_ADMIN
    );
  });
  describe('GA create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        baseScenario.space.collaboration.calloutPostCollectionId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.GLOBAL_ADMIN
      );
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePost(spacePostId);
    });
    test('GA create comment - GA(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.GLOBAL_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();
      expect(mails[1]).toEqual(0);
    });

    test('HM create comment - GA(1) get notifications', async () => {
      const spacePostSubjectText = `${baseScenario.space.about.profile.displayName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.SPACE_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [TestUserManager.users.globalAdmin.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('HM create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        baseScenario.space.collaboration.calloutPostCollectionId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.SPACE_MEMBER
      );
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePost(spacePostId);
    });
    test('HM create comment - HM(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.SPACE_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[1]).toEqual(0);
    });

    test('HA create comment - HM(1) get notifications', async () => {
      const spacePostSubjectText = `${baseScenario.space.about.profile.displayName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.SPACE_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [TestUserManager.users.spaceMember.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('CM create post on subspace  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        baseScenario.subspace.collaboration.calloutPostCollectionId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.SUBSPACE_MEMBER
      );
      subspacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSubspace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePost(subspacePostId);
    });
    test('CM create comment - CM(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSubspace,
        'test message on subspace post',
        TestUser.SUBSPACE_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[1]).toEqual(0);
    });

    test('CA create comment - CM(1) get notifications', async () => {
      const subspacePostSubjectText = `${baseScenario.subspace.about.profile.displayName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSubspace,
        'test message on subspace post',
        TestUser.SUBSPACE_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: subspacePostSubjectText,
            toAddresses: [TestUserManager.users.subspaceMember.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('OM create post on subsubspace  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        baseScenario.subsubspace.collaboration.calloutPostCollectionId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.SUBSUBSPACE_MEMBER
      );
      subsubspacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSubsubspace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePost(subsubspacePostId);
    });
    test('OM create comment - OM(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSubsubspace,
        'test message on subsubspace post',
        TestUser.SUBSUBSPACE_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[1]).toEqual(0);
    });

    test('CA create comment - OM(1) get notifications', async () => {
      const subsubspacePostSubjectText = `${baseScenario.subsubspace.about.profile.displayName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoom(
        postCommentsIdSubsubspace,
        'test message on subsubspace post',
        TestUser.SUBSPACE_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: subsubspacePostSubjectText,
            toAddresses: [TestUserManager.users.subsubspaceMember.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  test('OA create post on subsubspace and comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesPostCommentsCreatedConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const resPostonSpace = await createPostOnCallout(
      baseScenario.subsubspace.collaboration.calloutPostCollectionId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.SUBSUBSPACE_ADMIN
    );
    subsubspacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
    postCommentsIdSubsubspace =
      resPostonSpace.data?.createContributionOnCallout.post?.comments.id ?? '';
    await sendMessageToRoom(
      postCommentsIdSubsubspace,
      'test message on subsubspace post',
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
