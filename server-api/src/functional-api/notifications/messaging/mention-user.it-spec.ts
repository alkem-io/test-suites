/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  testConfiguration,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { createPostOnCallout } from '@functional-api/callout/post/post.request.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

let postCommentsIdSpace = '';
let postCommentsIdSubspace = '';
let postCommentsIdSubsubspace = '';

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} mentioned you in a comment on Alkemio`;
};

const baseUrl = testConfiguration.endPoints.server + '/user';

const mentionedUser = (userDisplayName: string, userNameId: string) => {
  return `[@${userDisplayName}](${baseUrl}/${userNameId})`;
};

let preferencesConfig: any[] = [];
let preferencesPostCreatedConfig: any[] = [];
let preferencesPostCommentsCreatedConfig: any[] = [];
let preferencesCalloutPublishedConfig: any[] = [];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'messaging-mention-user',
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
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
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

  await changePreferenceUser(
    TestUserManager.users.globalAdmin.id,
    PreferenceType.NotificationPostCommentCreated,
    'false'
  );

  preferencesConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCommunicationMention,
    },
  ];

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

  preferencesCalloutPublishedConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationCalloutPublished,
    },

    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCalloutPublished,
    },
  ];

  await Promise.all(
    preferencesConfig.map(config =>
      changePreferenceUser(config.userID, config.type, 'true')
    )
  );
  await Promise.all(
    preferencesPostCreatedConfig.map(config =>
      changePreferenceUser(config.userID, config.type, 'false')
    )
  );

  await Promise.all(
    preferencesPostCommentsCreatedConfig.map(config =>
      changePreferenceUser(config.userID, config.type, 'false')
    )
  );

  await Promise.all(
    preferencesCalloutPublishedConfig.map(config =>
      changePreferenceUser(config.userID, config.type, 'false')
    )
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});
describe('Notifications - Mention User', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  describe('Callout discussion', () => {
    test('GA mention HM in Space comments callout - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoom(
        baseScenario.space.collaboration.calloutPostCommentsId,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);
      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(TestUserManager.users.globalAdmin.displayName),
            toAddresses: [TestUserManager.users.spaceMember.email],
          }),
        ])
      );
    });

    test('HM mention Non Space member in Space comments callout - 1 notification to NonHM is sent', async () => {
      // Act
      await sendMessageToRoom(
        baseScenario.space.collaboration.calloutPostCommentsId,
        `${mentionedUser(
          TestUserManager.users.nonSpaceMember.displayName,
          TestUserManager.users.nonSpaceMember.nameId
        )} comment on discussion callout`,
        TestUser.SPACE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(TestUserManager.users.spaceMember.displayName),
            toAddresses: [TestUserManager.users.nonSpaceMember.email],
          }),
        ])
      );
    });

    test('HM mention Non Space member and Space Admin in Space comments callout - 2 notification to NonHM and HA is sent', async () => {
      // Act
      await sendMessageToRoom(
        baseScenario.space.collaboration.calloutPostCommentsId,
        `${mentionedUser(
          TestUserManager.users.nonSpaceMember.displayName,
          TestUserManager.users.nonSpaceMember.nameId
        )}, ${mentionedUser(
          TestUserManager.users.spaceAdmin.displayName,
          TestUserManager.users.spaceAdmin.nameId
        )}  comment on discussion callout`,
        TestUser.SPACE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(2);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(TestUserManager.users.spaceMember.displayName),
            toAddresses: [TestUserManager.users.nonSpaceMember.email],
          }),
          expect.objectContaining({
            subject: receivers(TestUserManager.users.spaceMember.displayName),
            toAddresses: [TestUserManager.users.spaceAdmin.email],
          }),
        ])
      );
    });

    test('Non Space member mention HM in Space comments callout - 0 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoom(
        baseScenario.space.collaboration.calloutPostCommentsId,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.NON_SPACE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(0);
    });

    test('GA mention HM in Subspace comments callout - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoom(
        baseScenario.subspace.collaboration.calloutPostCommentsId,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(TestUserManager.users.globalAdmin.displayName),
            toAddresses: [TestUserManager.users.spaceMember.email],
          }),
        ])
      );
    });

    test('GA mention HM in Subsubspace comments callout - 1 notification to HM is sent', async () => {
      // Act

      await sendMessageToRoom(
        baseScenario.subsubspace.collaboration.calloutPostCommentsId,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(TestUserManager.users.globalAdmin.displayName),
            toAddresses: [TestUserManager.users.spaceMember.email],
          }),
        ])
      );
    });
  });

  describe('Post comment', () => {
    beforeAll(async () => {
      let postNameID = '';
      postNameID = `post-name-id-${uniqueId}`;
      const postDisplayName = `post-d-name-${uniqueId}`;
      const resPostonSpace = await createPostOnCallout(
        baseScenario.space.collaboration.calloutPostCollectionId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.GLOBAL_ADMIN
      );
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      const resPostonSubspace = await createPostOnCallout(
        baseScenario.subspace.collaboration.calloutPostCollectionId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.SUBSPACE_MEMBER
      );
      postCommentsIdSubspace =
        resPostonSubspace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      const resPostonOpp = await createPostOnCallout(
        baseScenario.subsubspace.collaboration.calloutPostCollectionId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.SUBSUBSPACE_MEMBER
      );
      postCommentsIdSubsubspace =
        resPostonOpp.data?.createContributionOnCallout.post?.comments.id ?? '';

      await delay(3000);
      await deleteMailSlurperMails();
    });

    test('HA mention HM in Space post - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoom(
        postCommentsIdSpace,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.SPACE_ADMIN
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(TestUserManager.users.spaceAdmin.displayName),
            toAddresses: [TestUserManager.users.spaceMember.email],
          }),
        ])
      );
    });

    test('CA mention HM in Subspace post - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoom(
        postCommentsIdSubspace,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.SUBSPACE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(
              TestUserManager.users.subspaceMember.displayName
            ),
            toAddresses: [TestUserManager.users.spaceMember.email],
          }),
        ])
      );
    });

    test('OA mention HM in Subsubspace post - 1 notification to HM is sent', async () => {
      // Act
      await sendMessageToRoom(
        postCommentsIdSubsubspace,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.SUBSUBSPACE_MEMBER
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(1);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(
              TestUserManager.users.subsubspaceMember.displayName
            ),
            toAddresses: [TestUserManager.users.spaceMember.email],
          }),
        ])
      );
    });

    test('OA mention HM in Subsubspace post (preference disabled) - 0 notification to HM is sent', async () => {
      // Arrange
      preferencesConfig.forEach(
        async config =>
          await changePreferenceUser(config.userID, config.type, 'false')
      );

      // Act
      await sendMessageToRoom(
        postCommentsIdSubsubspace,
        `${mentionedUser(
          TestUserManager.users.spaceMember.displayName,
          TestUserManager.users.spaceMember.nameId
        )} comment on discussion callout`,
        TestUser.SUBSUBSPACE_MEMBER
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(0);
    });
  });

  // ToDo: add timeline comments mentions, when implemented
  describe.skip('Post comment', () => {
    test('OA mention HM in Subsubspace post - 1 notification to HM is sent', async () => {
      expect(1).toEqual(1);
    });
  });
});
