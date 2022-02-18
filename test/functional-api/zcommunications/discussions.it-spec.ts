import '../../utils/array.matcher';
import {
  createTestEcoverse,
  hubName,
  hubNameId,
  getEcoverseData,
  removeEcoverse,
} from '../integration/hub/hub.request.params';
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
import { entitiesId, users } from './communications-helper';

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestEcoverse(
    'dodo' + hubName,
    hubNameId,
    entitiesId.organizationId
  );
  entitiesId.hubId = responseEco.body.data.createEcoverse.id;
  entitiesId.hubCommunityId = responseEco.body.data.createEcoverse.community.id;
  entitiesId.hubCommunicationId =
    responseEco.body.data.createEcoverse.community.communication.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const requestReaderMemberData = await getUser(users.hubMemberEmail);
  users.hubMemberId = requestReaderMemberData.body.data.user.id;

  const requestReaderNotMemberData = await getUser(
    users.nonEcoverseMemberEmail
  );
  users.nonEcoverseMemberId = requestReaderNotMemberData.body.data.user.id;
});

afterAll(async () => {
  await removeEcoverse(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Communication discussions', () => {
  describe('Discusssion CRUD operations', () => {
    afterEach(async () => {
      await mutation(
        deleteDiscussion,
        deleteVariablesData(entitiesId.discussionId)
      );
    });

    test('Create discussion', async () => {
      // Act
      let res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(
          entitiesId.hubCommunicationId,
          DiscussionCategory.GENERAL,
          'test'
        )
      );
      entitiesId.discussionId = res.body.data.createDiscussion.id;

      let discussionRes = await getEcoverseData(entitiesId.hubId);

      let getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.createDiscussion).toEqual(getDiscussionData);
    });

    test('Update discussion', async () => {
      // Arrange
      let res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(
          entitiesId.hubCommunicationId,
          DiscussionCategory.GENERAL,
          'changet title '
        )
      );
      entitiesId.discussionId = res.body.data.createDiscussion.id;

      // Act
      let resUpdate = await mutation(
        updateDiscussion,
        updateDiscussionVariablesData(
          entitiesId.discussionId,
          DiscussionCategory.SHARING,
          'experiment title'
        )
      );

      let discussionRes = await getEcoverseData(entitiesId.hubId);

      let getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions[0];

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
        createDiscussionVariablesData(entitiesId.hubCommunicationId)
      );

      entitiesId.discussionId = res.body.data.createDiscussion.id;

      // Act
      await mutation(
        deleteDiscussion,
        deleteVariablesData(entitiesId.discussionId)
      );

      let discussionRes = await getEcoverseData(entitiesId.hubId);

      let getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions;

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(getDiscussionData).toHaveLength(0);
    });
  });

  describe('Discussion messages', () => {
    beforeAll(async () => {
      let res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(entitiesId.hubCommunicationId)
      );
      entitiesId.discussionId = res.body.data.createDiscussion.id;
    });

    afterAll(async () => {
      await mutation(
        deleteDiscussion,
        deleteVariablesData(entitiesId.discussionId)
      );
    });

    afterEach(async () => {
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(
          entitiesId.discussionId,
          entitiesId.messageId
        )
      );
    });

    test('Send message to discussion', async () => {
      // Act
      let res = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message'
        )
      );
      entitiesId.messageId = res.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      let getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions[0]
          .messages[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.sendMessageToDiscussion).toEqual(getDiscussionData);
    });

    test('Create multiple messages in one discussion', async () => {
      // Act

      let firstMessageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message 1'
        )
      );
      entitiesId.messageId =
        firstMessageRes.body.data.sendMessageToDiscussion.id;

      let secondMessageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message 2'
        )
      );
      let secondmessageId =
        secondMessageRes.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      let getDiscussions =
        discussionRes.body.data.hub.community.communication.discussions[0]
          .messages;

      // Assert
      expect(getDiscussions).toHaveLength(2);
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(
          entitiesId.discussionId,
          entitiesId.messageId
        )
      );
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(
          entitiesId.discussionId,
          secondmessageId
        )
      );
    });

    test('Delete message from discussion', async () => {
      // Act
      let res = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message remove'
        )
      );
      entitiesId.messageId = res.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      let messagesBefore =
        discussionRes.body.data.hub.community.communication.discussions[0]
          .messages;

      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(
          entitiesId.discussionId,
          entitiesId.messageId
        )
      );

      discussionRes = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      let messagesAfter =
        discussionRes.body.data.hub.community.communication.discussions[0]
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
          entitiesId.hubCommunityId,
          users.hubMemberId
        )
      );

      let discussionRes = await mutation(
        createDiscussion,
        createDiscussionVariablesData(entitiesId.hubCommunicationId)
      );

      entitiesId.discussionId = discussionRes.body.data.createDiscussion.id;
    });

    afterEach(async () => {
      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(
          entitiesId.discussionId,
          entitiesId.messageId
        )
      );

      afterAll(async () => {
        await mutation(
          deleteDiscussion,
          deleteVariablesData(entitiesId.discussionId)
        );
      });
    });

    test('discussion message - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      let messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'PRIVATE hub - admin'
        )
      );
      entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

      // Act
      let hubDataSender = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      let getMessageSender =
        hubDataSender.body.data.hub.community.communication.discussions[0]
          .messages;

      let hubDataReaderMember = await getEcoverseData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );
      let getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.discussions[0]
          .messages;

      let hubDataReader = await getEcoverseData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: entitiesId.messageId,
        message: 'PRIVATE hub - admin',
        sender: users.globalAdminId,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'PRIVATE hub - admin',
        sender: users.globalAdminId,
      });

      expect(hubDataReader.text).toContain(
        `User (${users.nonEcoverseMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('discussion message created by member - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      let messageText = 'discussion message created by member';
      let messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          messageText
        ),
        TestUser.HUB_MEMBER
      );

      entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

      // Act
      let hubDataSender = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      let getMessageAdmin =
        hubDataSender.body.data.hub.community.communication.discussions[0]
          .messages;

      let hubDataReaderMember = await getEcoverseData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );
      let getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.discussions[0]
          .messages;

      let hubDataReader = await getEcoverseData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(getMessageAdmin).toHaveLength(1);
      expect(getMessageAdmin[0]).toEqual({
        id: entitiesId.messageId,
        message: messageText,
        sender: users.hubMemberId,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: messageText,
        sender: users.hubMemberId,
      });

      expect(hubDataReader.text).toContain(
        `User (${users.nonEcoverseMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('discussion message created by non member - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      let messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message'
        ),
        TestUser.NON_HUB_MEMBER
      );

      let getMessageAdmin = await getEcoverseData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(
        getMessageAdmin.body.data.hub.community.communication.discussions[0]
          .messages
      ).toHaveLength(0);
      expect(messageRes.text).toContain(
        `Authorization: unable to grant 'create' privilege: discussion send message: Default title`
      );
    });

    describe('Discussion messages - Public Hubs', () => {
      beforeAll(async () => {
        await mutation(
          setHubVisibility,
          setHubVisibilityVariableData(entitiesId.hubId, true)
        );
      });
      test('discussion updates - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        let messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(
            entitiesId.discussionId,
            'test message'
          )
        );

        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        let hubDataSender = await getEcoverseData(
          entitiesId.hubId,
          TestUser.GLOBAL_ADMIN
        );
        let getMessageSender =
          hubDataSender.body.data.hub.community.communication.discussions[0]
            .messages;

        let hubDataReaderMember = await getEcoverseData(
          entitiesId.hubId,
          TestUser.HUB_MEMBER
        );
        let getMessageReaderMember =
          hubDataReaderMember.body.data.hub.community.communication
            .discussions[0].messages;

        let hubDataReaderNotMemberIn = await getEcoverseData(
          entitiesId.hubId,
          TestUser.NON_HUB_MEMBER
        );

        let hubDataReaderNotMember =
          hubDataReaderNotMemberIn.body.data.hub.community.communication
            .discussions[0].messages;

        // Assert
        expect(getMessageSender).toHaveLength(1);
        expect(getMessageSender[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: users.globalAdminId,
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: users.globalAdminId,
        });

        expect(hubDataReaderNotMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: users.globalAdminId,
        });
      });

      test('discussion message created by member - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        let messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(
            entitiesId.discussionId,
            'test message'
          ),
          TestUser.HUB_MEMBER
        );
        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        let hubDataSender = await getEcoverseData(
          entitiesId.hubId,
          TestUser.GLOBAL_ADMIN
        );

        let getMessageAdmin =
          hubDataSender.body.data.hub.community.communication.discussions[0]
            .messages;

        let hubDataReaderMember = await getEcoverseData(
          entitiesId.hubId,
          TestUser.HUB_MEMBER
        );
        let getMessageReaderMember =
          hubDataReaderMember.body.data.hub.community.communication
            .discussions[0].messages;

        let hubDataReader = await getEcoverseData(
          entitiesId.hubId,
          TestUser.NON_HUB_MEMBER
        );
        let hubDataReaderNotMember =
          hubDataReader.body.data.hub.community.communication.discussions[0]
            .messages;

        // Assert
        expect(getMessageAdmin).toHaveLength(1);
        expect(getMessageAdmin[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: users.hubMemberId,
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: users.hubMemberId,
        });

        expect(hubDataReaderNotMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: users.hubMemberId,
        });
      });

      test('discussion message created by non member - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        let messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(
            entitiesId.discussionId,
            'test message'
          ),
          TestUser.NON_HUB_MEMBER
        );

        // Act
        let getMessageAdmin = await getEcoverseData(
          entitiesId.hubId,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(
          getMessageAdmin.body.data.hub.community.communication.discussions[0]
            .messages
        ).toHaveLength(0);
        expect(messageRes.text).toContain(
          `Authorization: unable to grant 'create' privilege: discussion send message: Default title`
        );
      });
    });
  });
});
