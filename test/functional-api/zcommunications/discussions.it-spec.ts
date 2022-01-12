import '../../utils/array.matcher';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  getEcoverseData,
  removeEcoverse,
} from '../integration/ecoverse/ecoverse.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  setHubVisibility,
  setHubVisibilityVariableData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createDiscussion,
  createDiscussionVariablesData,
  DiscussionCategory,
  removeMessageFromDiscussion,
  removeMessageFromDiscussionVariablesData,
  postDiscussionComment,
  postDiscussionCommentVariablesData,
  updateDiscussion,
  updateDiscussionVariablesData,
} from '@test/utils/mutations/communications-mutation';
import {
  deleteDiscussion,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';

let email = 'admin@alkem.io';
let globalAdmin = '';
let readerEmailMember = 'ecoverse.member@alkem.io';
let ecoverseMemberId = '';
let nonEcoverseMemberId = 'non.ecoverse@alkem.io';
let readerNotMemberId = '';
let ecoverseId = '';
let organizationId = '';
let ecoverseCommunityId = '';
let messageId = '';
let communicationID = '';
let discussionId = '';

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestEcoverse(
    'dodo' + ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
  ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;
  communicationID =
    responseEco.body.data.createEcoverse.community.communication.id;

  const requestUserData = await getUser(email);
  globalAdmin = requestUserData.body.data.user.id;

  const requestReaderMemberData = await getUser(readerEmailMember);
  ecoverseMemberId = requestReaderMemberData.body.data.user.id;

  const requestReaderNotMemberData = await getUser(nonEcoverseMemberId);
  readerNotMemberId = requestReaderNotMemberData.body.data.user.id;
});

afterAll(async () => {
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
});

describe('Communication discussions', () => {
  describe('Discusssion CRUD operations', () => {
    afterEach(async () => {
      await mutation(deleteDiscussion, deleteVariablesData(discussionId));
    });

    test('Create discussion', async () => {
      // Act
      let res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(
          communicationID,
          DiscussionCategory.GENERAL,
          'test'
        )
      );
      discussionId = res.body.data.createDiscussion.id;

      let discussionRes = await getEcoverseData(ecoverseId);

      let getDiscussionData =
        discussionRes.body.data.ecoverse.community.communication.discussions[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.createDiscussion).toEqual(getDiscussionData);
    });

    test('Update discussion', async () => {
      // Arrange
      let res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(
          communicationID,
          DiscussionCategory.GENERAL,
          'changet title '
        )
      );
      discussionId = res.body.data.createDiscussion.id;

      // Act
      let resUpdate = await mutation(
        updateDiscussion,
        updateDiscussionVariablesData(
          discussionId,
          DiscussionCategory.SHARING,
          'experiment title'
        )
      );

      let discussionRes = await getEcoverseData(ecoverseId);

      let getDiscussionData =
        discussionRes.body.data.ecoverse.community.communication.discussions[0];

      // Assert
      expect(resUpdate.statusCode).toEqual(200);
      expect(getDiscussionData.category).toEqual('SHARING');
      expect(getDiscussionData.title).toEqual('experiment title');
      expect(resUpdate.body.data.updateDiscussion).toEqual(getDiscussionData);
    });

    test('Delete discussion', async () => {
      // Arrange
      let res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(communicationID)
      );

      discussionId = res.body.data.createDiscussion.id;

      // Act
      await mutation(deleteDiscussion, deleteVariablesData(discussionId));

      let discussionRes = await getEcoverseData(ecoverseId);

      let getDiscussionData =
        discussionRes.body.data.ecoverse.community.communication.discussions;

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(getDiscussionData).toHaveLength(0);
    });
  });

  describe('Discussion messages', () => {
    beforeAll(async () => {
      let res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(communicationID)
      );
      discussionId = res.body.data.createDiscussion.id;
    });

    afterAll(async () => {
      await mutation(deleteDiscussion, deleteVariablesData(discussionId));
    });

    afterEach(async () => {
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(discussionId, messageId)
      );
    });

    test('Send message to discussion', async () => {
      // Act
      let res = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(discussionId, 'test message')
      );
      messageId = res.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );

      let getDiscussionData =
        discussionRes.body.data.ecoverse.community.communication.discussions[0]
          .messages[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.sendMessageToDiscussion).toEqual(getDiscussionData);
    });

    test('Create multiple messages in one discussion', async () => {
      // Act

      let firstMessageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(discussionId, 'test message 1')
      );
      messageId = firstMessageRes.body.data.sendMessageToDiscussion.id;

      let secondMessageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(discussionId, 'test message 2')
      );
      let secondMessageId =
        secondMessageRes.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );

      let getDiscussions =
        discussionRes.body.data.ecoverse.community.communication.discussions[0]
          .messages;

      // Assert
      expect(getDiscussions).toHaveLength(2);
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(discussionId, messageId)
      );
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(discussionId, secondMessageId)
      );
    });

    test('Delete message from discussion', async () => {
      // Act
      let res = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(discussionId, 'test message')
      );
      messageId = res.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let messagesBefore =
        discussionRes.body.data.ecoverse.community.communication.discussions[0]
          .messages;

      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(discussionId, messageId)
      );

      discussionRes = await getEcoverseData(ecoverseId, TestUser.GLOBAL_ADMIN);
      let messagesAfter =
        discussionRes.body.data.ecoverse.community.communication.discussions[0]
          .messages;

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(messagesBefore).toHaveLength(1);
      expect(messagesAfter).toHaveLength(0);
    });
  });

  describe('Discussion messages - Private Hub', () => {
    beforeAll(async () => {
      await mutation(
        assignUserToCommunity,
        assignUserToCommunityVariablesData(
          ecoverseCommunityId,
          ecoverseMemberId
        )
      );

      let discussionRes = await mutation(
        createDiscussion,
        createDiscussionVariablesData(communicationID)
      );

      discussionId = discussionRes.body.data.createDiscussion.id;
    });

    afterEach(async () => {
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(discussionId, messageId)
      );

      afterAll(async () => {
        await mutation(deleteDiscussion, deleteVariablesData(discussionId));
      });
    });

    test('discussion message - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      let messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(discussionId, 'PRIVATE hub - admin')
      );
      messageId = messageRes.body.data.sendMessageToDiscussion.id;

      // Act
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication
          .discussions[0].messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );
      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.communication
          .discussions[0].messages;

      let ecoverseDataReader = await getEcoverseData(
        ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: messageId,
        message: 'PRIVATE hub - admin',
        sender: globalAdmin,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: messageId,
        message: 'PRIVATE hub - admin',
        sender: globalAdmin,
      });

      expect(ecoverseDataReader.text).toContain(
        `User (${nonEcoverseMemberId}) does not have credentials that grant 'read' access `
      );
    });

    test('discussion message created by member - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      let messageText = 'discussion message created by member';
      let messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(discussionId, messageText),
        TestUser.ECOVERSE_MEMBER
      );

      messageId = messageRes.body.data.sendMessageToDiscussion.id;

      // Act
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );

      let getMessageAdmin =
        ecoverseDataSender.body.data.ecoverse.community.communication
          .discussions[0].messages;

      let ecoverseDataReaderMember = await getEcoverseData(
        ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );
      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.communication
          .discussions[0].messages;

      let ecoverseDataReader = await getEcoverseData(
        ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );

      // Assert
      expect(getMessageAdmin).toHaveLength(1);
      expect(getMessageAdmin[0]).toEqual({
        id: messageId,
        message: messageText,
        sender: ecoverseMemberId,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: messageId,
        message: messageText,
        sender: ecoverseMemberId,
      });

      expect(ecoverseDataReader.text).toContain(
        `User (${nonEcoverseMemberId}) does not have credentials that grant 'read' access `
      );
    });

    test('discussion message created by non member - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      let messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(discussionId, 'test message'),
        TestUser.NON_ECOVERSE_MEMBER
      );

      let getMessageAdmin = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(
        getMessageAdmin.body.data.ecoverse.community.communication
          .discussions[0].messages
      ).toHaveLength(0);
      expect(messageRes.text).toContain(
        `Authorization: unable to grant 'create' privilege: discussion send message: Default title`
      );
    });

    describe('Discussion messages - Public Hubs', () => {
      beforeAll(async () => {
        await mutation(
          setHubVisibility,
          setHubVisibilityVariableData(ecoverseId, true)
        );
      });
      test('discussion updates - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        let messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(discussionId, 'test message')
        );

        messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        let ecoverseDataSender = await getEcoverseData(
          ecoverseId,
          TestUser.GLOBAL_ADMIN
        );
        let getMessageSender =
          ecoverseDataSender.body.data.ecoverse.community.communication
            .discussions[0].messages;

        let ecoverseDataReaderMember = await getEcoverseData(
          ecoverseId,
          TestUser.ECOVERSE_MEMBER
        );
        let getMessageReaderMember =
          ecoverseDataReaderMember.body.data.ecoverse.community.communication
            .discussions[0].messages;

        let ecoverseDataReaderNotMemberIn = await getEcoverseData(
          ecoverseId,
          TestUser.NON_ECOVERSE_MEMBER
        );

        let ecoverseDataReaderNotMember =
          ecoverseDataReaderNotMemberIn.body.data.ecoverse.community
            .communication.discussions[0].messages;

        // Assert
        expect(getMessageSender).toHaveLength(1);
        expect(getMessageSender[0]).toEqual({
          id: messageId,
          message: 'test message',
          sender: globalAdmin,
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: messageId,
          message: 'test message',
          sender: globalAdmin,
        });

        expect(ecoverseDataReaderNotMember[0]).toEqual({
          id: messageId,
          message: 'test message',
          sender: globalAdmin,
        });
      });

      test('discussion message created by member - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        let messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(discussionId, 'test message'),
          TestUser.ECOVERSE_MEMBER
        );
        messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        let ecoverseDataSender = await getEcoverseData(
          ecoverseId,
          TestUser.GLOBAL_ADMIN
        );

        let getMessageAdmin =
          ecoverseDataSender.body.data.ecoverse.community.communication
            .discussions[0].messages;

        let ecoverseDataReaderMember = await getEcoverseData(
          ecoverseId,
          TestUser.ECOVERSE_MEMBER
        );
        let getMessageReaderMember =
          ecoverseDataReaderMember.body.data.ecoverse.community.communication
            .discussions[0].messages;

        let ecoverseDataReader = await getEcoverseData(
          ecoverseId,
          TestUser.NON_ECOVERSE_MEMBER
        );
        let ecoverseDataReaderNotMember =
          ecoverseDataReader.body.data.ecoverse.community.communication
            .discussions[0].messages;

        // Assert
        expect(getMessageAdmin).toHaveLength(1);
        expect(getMessageAdmin[0]).toEqual({
          id: messageId,
          message: 'test message',
          sender: ecoverseMemberId,
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: messageId,
          message: 'test message',
          sender: ecoverseMemberId,
        });

        expect(ecoverseDataReaderNotMember[0]).toEqual({
          id: messageId,
          message: 'test message',
          sender: ecoverseMemberId,
        });
      });

      test('discussion message created by non member - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        let messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(discussionId, 'test message'),
          TestUser.NON_ECOVERSE_MEMBER
        );

        // Act
        let getMessageAdmin = await getEcoverseData(
          ecoverseId,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(
          getMessageAdmin.body.data.ecoverse.community.communication
            .discussions[0].messages
        ).toHaveLength(0);
        expect(messageRes.text).toContain(
          `Authorization: unable to grant 'create' privilege: discussion send message: Default title`
        );
      });
    });
  });
});
