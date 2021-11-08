import '../../../utils/array.matcher';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  getEcoverseData,
  removeEcoverse,
} from '../ecoverse/ecoverse.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
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
  sendMessageToDiscussion,
  sendMessageToDiscussionVariablesData,
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
          'test',
          'experiment message'
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
          'changet title                                                                                                                                                                                                                                                                                                                                                                            ',
          'experiment message'
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
        sendMessageToDiscussion,
        sendMessageToDiscussionVariablesData(discussionId, 'test message')
      );
      messageId = res.body.data.sendMessageToDiscussion.messages[0].id;

      let discussionRes = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );

      let getDiscussionData =
        discussionRes.body.data.ecoverse.community.communication.discussions[0]
          .messages[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.sendMessageToDiscussion.messages[0]).toEqual(
        getDiscussionData
      );
    });

    test('Create multiple messages in one discussion', async () => {
      // Act

      let firstMessageRes = await mutation(
        sendMessageToDiscussion,
        sendMessageToDiscussionVariablesData(discussionId, 'test message 1')
      );
      messageId =
        firstMessageRes.body.data.sendMessageToDiscussion.messages[0].id;

      let secondMessageRes = await mutation(
        sendMessageToDiscussion,
        sendMessageToDiscussionVariablesData(discussionId, 'test message 2')
      );
      let secondMessageId =
        secondMessageRes.body.data.sendMessageToDiscussion.messages[1].id;

      let discussionRes = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );

      let getDiscussions =
        discussionRes.body.data.ecoverse.community.communication.discussions[0]
          .messages;

      // Assert
      expect(getDiscussions).toHaveLength(3);
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(discussionId, secondMessageId)
      );
    });
  });

  // Skipped due to bug with authorization
  // https://app.zenhub.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/1526
  describe.skip('Discussion messages - Private Hub', () => {
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

    afterAll(async () => {
      await mutation(deleteDiscussion, deleteVariablesData(discussionId));
    });

    // To be confirmed - should non-ecoverse member be able to see discussion from private Hub
    test.skip('discussion message - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      let messageRes = await mutation(
        sendMessageToDiscussion,
        sendMessageToDiscussionVariablesData(
          discussionId,
          'PRIVATE hub - admin'
        )
      );

      messageId = messageRes.body.data.sendMessageToDiscussion.messages[1].id;

      // Act
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        ecoverseDataSender.body.data.ecoverse.community.communication
          .discussions[0].messages;

      await getEcoverseData(ecoverseId, TestUser.ECOVERSE_MEMBER);
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
      expect(getMessageSender).toHaveLength(2);
      expect(getMessageSender[1]).toEqual({
        id: messageId,
        message: 'PRIVATE hub - admin',
        sender: globalAdmin,
      });

      expect(getMessageReaderMember[1]).toEqual({
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
      let messageRes = await mutation(
        sendMessageToDiscussion,
        sendMessageToDiscussionVariablesData(discussionId, 'test message'),
        TestUser.ECOVERSE_MEMBER
      );
      messageRes.body.data.sendMessageToDiscussion.messages;

      let newMessageId =
        messageRes.body.data.sendMessageToDiscussion.messages[0].id;

      // Act
      await getEcoverseData(ecoverseId);
      let ecoverseDataSender = await getEcoverseData(
        ecoverseId,
        TestUser.GLOBAL_ADMIN
      );

      let getMessageAdmin =
        ecoverseDataSender.body.data.ecoverse.community.communication
          .discussions[0].messages;

      await getEcoverseData(ecoverseId, TestUser.ECOVERSE_MEMBER);
      let ecoverseDataReaderMember = await getEcoverseData(
        ecoverseId,
        TestUser.ECOVERSE_MEMBER
      );
      let getMessageReaderMember =
        ecoverseDataReaderMember.body.data.ecoverse.community.communication
          .discussions[0].messages;

      await getEcoverseData(ecoverseId, TestUser.NON_ECOVERSE_MEMBER);
      let ecoverseDataReader = await getEcoverseData(
        ecoverseId,
        TestUser.NON_ECOVERSE_MEMBER
      );

      // Assert
      expect(getMessageAdmin).toHaveLength(3);
      expect(getMessageAdmin[0]).toEqual({
        id: newMessageId,
        message: 'test message',
        sender: ecoverseMemberId,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: newMessageId,
        message: 'test message',
        sender: ecoverseMemberId,
      });

      expect(ecoverseDataReader.text).toContain(
        `User (${nonEcoverseMemberId}) does not have credentials that grant 'read' access `
      );
    });

    test('discussion message created by non member - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act

      let messageRes = await mutation(
        sendMessageToDiscussion,
        sendMessageToDiscussionVariablesData(discussionId, 'test message'),
        TestUser.NON_ECOVERSE_MEMBER
      );

      messageRes.body.data.sendMessageToDiscussion.messages;
      let mesId = messageRes.body.data.sendMessageToDiscussion.id;

      // Assert
      expect(messageRes.text).toContain(
        `User (${nonEcoverseMemberId}) does not have credentials that grant 'read' access to Discussion.messages`
      );
      expect(messageRes.text).not.toContain({
        data: {
          sendMessageToDiscussion: {
            id: mesId,
          },
        },
      });
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
          sendMessageToDiscussion,
          sendMessageToDiscussionVariablesData(discussionId, 'test message')
        );

        messageId = messageRes.body.data.sendMessageToDiscussion.messages[0].id;

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

        // ToDo - may be a bug - request must be executed twice, to get the data
        await getEcoverseData(ecoverseId, TestUser.NON_ECOVERSE_MEMBER);
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
        let discussionRes = await mutation(
          createDiscussion,
          createDiscussionVariablesData(communicationID),
          TestUser.ECOVERSE_MEMBER
        );

        let secondDiscussionId = discussionRes.body.data.createDiscussion.id;

        let messageRes = await mutation(
          sendMessageToDiscussion,
          sendMessageToDiscussionVariablesData(discussionId, 'test message'),
          TestUser.ECOVERSE_MEMBER
        );
        messageRes.body.data.sendMessageToDiscussion.messages;
        let newMessageId =
          messageRes.body.data.sendMessageToDiscussion.messages[0].id;

        // Act
        await getEcoverseData(ecoverseId);
        let ecoverseDataSender = await getEcoverseData(
          ecoverseId,
          TestUser.GLOBAL_ADMIN
        );

        let getMessageAdmin =
          ecoverseDataSender.body.data.ecoverse.community.communication
            .discussions[1].messages;

        await getEcoverseData(ecoverseId, TestUser.ECOVERSE_MEMBER);
        let ecoverseDataReaderMember = await getEcoverseData(
          ecoverseId,
          TestUser.ECOVERSE_MEMBER
        );
        let getMessageReaderMember =
          ecoverseDataReaderMember.body.data.ecoverse.community.communication
            .discussions[1].messages;

        await getEcoverseData(ecoverseId, TestUser.NON_ECOVERSE_MEMBER);
        let ecoverseDataReader = await getEcoverseData(
          ecoverseId,
          TestUser.NON_ECOVERSE_MEMBER
        );
        let ecoverseDataReaderNotMember =
          ecoverseDataReader.body.data.ecoverse.community.communication
            .discussions[1].messages;

        // Assert
        expect(getMessageAdmin).toHaveLength(1);
        expect(getMessageAdmin[0]).toEqual({
          id: newMessageId,
          message: 'test message',
          sender: ecoverseMemberId,
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: newMessageId,
          message: 'test message',
          sender: ecoverseMemberId,
        });

        expect(ecoverseDataReaderNotMember[0]).toEqual({
          id: newMessageId,
          message: 'test message',
          sender: ecoverseMemberId,
        });

        await mutation(
          deleteDiscussion,
          deleteVariablesData(secondDiscussionId)
        );
      });

      test('discussion message created by non member - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        let discussionRes = await mutation(
          createDiscussion,
          createDiscussionVariablesData(communicationID),
          TestUser.NON_ECOVERSE_MEMBER
        );

        discussionRes.body.data.createDiscussion.id;
        let secondDiscussionId = discussionRes.body.data.createDiscussion.id;

        let messageRes = await mutation(
          sendMessageToDiscussion,
          sendMessageToDiscussionVariablesData(
            secondDiscussionId,
            'test message'
          ),
          TestUser.NON_ECOVERSE_MEMBER
        );

        messageRes.body.data.sendMessageToDiscussion.messages;

        let newMessageId =
          messageRes.body.data.sendMessageToDiscussion.messages[0].id;

        // Act
        await getEcoverseData(ecoverseId);
        let ecoverseDataSender = await getEcoverseData(
          ecoverseId,
          TestUser.GLOBAL_ADMIN
        );

        let getMessageAdmin =
          ecoverseDataSender.body.data.ecoverse.community.communication
            .discussions[0].messages;

        await getEcoverseData(ecoverseId, TestUser.ECOVERSE_MEMBER);
        let ecoverseDataReaderMember = await getEcoverseData(
          ecoverseId,
          TestUser.ECOVERSE_MEMBER
        );
        let getMessageReaderMember =
          ecoverseDataReaderMember.body.data.ecoverse.community.communication
            .discussions[0].messages;

        await getEcoverseData(ecoverseId, TestUser.NON_ECOVERSE_MEMBER);
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
          id: newMessageId,
          message: 'test message',
          sender: readerNotMemberId,
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: newMessageId,
          message: 'test message',
          sender: readerNotMemberId,
        });

        expect(ecoverseDataReaderNotMember[0]).toEqual({
          id: newMessageId,
          message: 'test message',
          sender: readerNotMemberId,
        });
      });
    });
  });
});
