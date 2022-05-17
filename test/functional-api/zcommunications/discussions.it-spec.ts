import '../../utils/array.matcher';
import {
  createTestHub,
  getHubData,
  removeHub,
} from '../integration/hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { getUser } from '@test/functional-api/user-management/user.request.params';
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
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { createOrgAndHub } from './create-entities-with-users-helper';

const organizationName = 'disc-org-name' + uniqueId;
const hostNameId = 'disc-org-nameid' + uniqueId;
const hubName = 'disc-eco-name' + uniqueId;
const hubNameId = 'disc-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
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
      const res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(
          entitiesId.hubCommunicationId,
          DiscussionCategory.GENERAL,
          'test'
        )
      );
      entitiesId.discussionId = res.body.data.createDiscussion.id;

      const discussionRes = await getHubData(entitiesId.hubId);

      const getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.createDiscussion).toEqual(getDiscussionData);
    });

    test('Update discussion', async () => {
      // Arrange
      const res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(
          entitiesId.hubCommunicationId,
          DiscussionCategory.GENERAL,
          'changet title '
        )
      );
      entitiesId.discussionId = res.body.data.createDiscussion.id;

      // Act
      const resUpdate = await mutation(
        updateDiscussion,
        updateDiscussionVariablesData(
          entitiesId.discussionId,
          DiscussionCategory.SHARING,
          'experiment title'
        )
      );

      const discussionRes = await getHubData(entitiesId.hubId);

      const getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions[0];

      // Assert
      expect(resUpdate.statusCode).toEqual(200);
      expect(getDiscussionData.category).toEqual('SHARING');
      expect(getDiscussionData.title).toEqual('experiment title');
      expect(resUpdate.body.data.updateDiscussion).toEqual(getDiscussionData);
    });

    test('Delete discussion', async () => {
      // Arrange
      const res = await mutation(
        createDiscussion,
        createDiscussionVariablesData(entitiesId.hubCommunicationId)
      );

      entitiesId.discussionId = res.body.data.createDiscussion.id;

      // Act
      await mutation(
        deleteDiscussion,
        deleteVariablesData(entitiesId.discussionId)
      );

      const discussionRes = await getHubData(entitiesId.hubId);

      const getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions;

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(getDiscussionData).toHaveLength(0);
    });
  });

  describe('Discussion messages', () => {
    beforeAll(async () => {
      const res = await mutation(
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
      const res = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message'
        )
      );
      entitiesId.messageId = res.body.data.sendMessageToDiscussion.id;

      const discussionRes = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      const getDiscussionData =
        discussionRes.body.data.hub.community.communication.discussions[0]
          .messages[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.sendMessageToDiscussion).toEqual(getDiscussionData);
    });

    test('Create multiple messages in one discussion', async () => {
      // Act

      const firstMessageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message 1'
        )
      );
      entitiesId.messageId =
        firstMessageRes.body.data.sendMessageToDiscussion.id;

      const secondMessageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message 2'
        )
      );
      const secondmessageId =
        secondMessageRes.body.data.sendMessageToDiscussion.id;

      const discussionRes = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      const getDiscussions =
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
      const res = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message remove'
        )
      );
      entitiesId.messageId = res.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      const messagesBefore =
        discussionRes.body.data.hub.community.communication.discussions[0]
          .messages;

      await mutation(
        removeMessageFromDiscussion,
        removeMessageFromDiscussionVariablesData(
          entitiesId.discussionId,
          entitiesId.messageId
        )
      );

      discussionRes = await getHubData(entitiesId.hubId, TestUser.GLOBAL_ADMIN);
      const messagesAfter =
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
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'false'
      );

      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.hubCommunityId,
          users.hubMemberId
        )
      );

      const discussionRes = await mutation(
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
    });
    afterAll(async () => {
      await mutation(
        deleteDiscussion,
        deleteVariablesData(entitiesId.discussionId)
      );
    });

    test('discussion message - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      const messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'PRIVATE hub - admin'
        )
      );
      entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

      // Act
      const hubDataSender = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      const getMessageSender =
        hubDataSender.body.data.hub.community.communication.discussions[0]
          .messages;

      const hubDataReaderMember = await getHubData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );
      const getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.discussions[0]
          .messages;

      const hubDataReader = await getHubData(
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
        `User (${users.nonHubMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('discussion message created by member - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      const messageText = 'discussion message created by member';
      const messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          messageText
        ),
        TestUser.HUB_MEMBER
      );

      entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

      // Act
      const hubDataSender = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      const getMessageAdmin =
        hubDataSender.body.data.hub.community.communication.discussions[0]
          .messages;

      const hubDataReaderMember = await getHubData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );
      const getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.discussions[0]
          .messages;

      const hubDataReader = await getHubData(
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
        `User (${users.nonHubMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('discussion message created by non member - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      const messageRes = await mutation(
        postDiscussionComment,
        postDiscussionCommentVariablesData(
          entitiesId.discussionId,
          'test message'
        ),
        TestUser.NON_HUB_MEMBER
      );

      const getMessageAdmin = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(
        getMessageAdmin.body.data.hub.community.communication.discussions[0]
          .messages
      ).toHaveLength(0);
      expect(messageRes.text).toContain(
        'Authorization: unable to grant \'create\' privilege: discussion send message: Default title'
      );
    });

    describe('Discussion messages - Public Hubs', () => {
      beforeAll(async () => {
        await changePreferenceHub(
          entitiesId.hubId,
          HubPreferenceType.ANONYMOUS_READ_ACCESS,
          'true'
        );
      });
      test('discussion updates - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(
            entitiesId.discussionId,
            'test message'
          )
        );

        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        const hubDataSender = await getHubData(
          entitiesId.hubId,
          TestUser.GLOBAL_ADMIN
        );
        const getMessageSender =
          hubDataSender.body.data.hub.community.communication.discussions[0]
            .messages;

        const hubDataReaderMember = await getHubData(
          entitiesId.hubId,
          TestUser.HUB_MEMBER
        );
        const getMessageReaderMember =
          hubDataReaderMember.body.data.hub.community.communication
            .discussions[0].messages;

        const hubDataReaderNotMemberIn = await getHubData(
          entitiesId.hubId,
          TestUser.NON_HUB_MEMBER
        );

        const hubDataReaderNotMember =
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
        const messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(
            entitiesId.discussionId,
            'test message'
          ),
          TestUser.HUB_MEMBER
        );
        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        const hubDataSender = await getHubData(
          entitiesId.hubId,
          TestUser.GLOBAL_ADMIN
        );

        const getMessageAdmin =
          hubDataSender.body.data.hub.community.communication.discussions[0]
            .messages;

        const hubDataReaderMember = await getHubData(
          entitiesId.hubId,
          TestUser.HUB_MEMBER
        );
        const getMessageReaderMember =
          hubDataReaderMember.body.data.hub.community.communication
            .discussions[0].messages;

        const hubDataReader = await getHubData(
          entitiesId.hubId,
          TestUser.NON_HUB_MEMBER
        );
        const hubDataReaderNotMember =
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
        const messageRes = await mutation(
          postDiscussionComment,
          postDiscussionCommentVariablesData(
            entitiesId.discussionId,
            'test message'
          ),
          TestUser.NON_HUB_MEMBER
        );

        // Act
        const getMessageAdmin = await getHubData(
          entitiesId.hubId,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(
          getMessageAdmin.body.data.hub.community.communication.discussions[0]
            .messages
        ).toHaveLength(0);
        expect(messageRes.text).toContain(
          'Authorization: unable to grant \'create\' privilege: discussion send message: Default title'
        );
      });
    });
  });
});
