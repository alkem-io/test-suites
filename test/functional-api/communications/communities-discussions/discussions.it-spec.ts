/* eslint-disable quotes */
import {
  getSpaceData,
  deleteSpaceCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { DiscussionCategory } from '@test/utils/mutations/communications-mutation';
import {
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  removeMessageFromDiscussion,
  postDiscussionComment,
} from '@test/functional-api/zcommunications/communications.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';

const organizationName = 'disc-org-name' + uniqueId;
const hostNameId = 'disc-org-nameid' + uniqueId;
const spaceName = 'disc-eco-name' + uniqueId;
const spaceNameId = 'disc-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe.skip('Communication discussions', () => {
  describe('Discusssion CRUD operations', () => {
    afterEach(async () => {
      await deleteDiscussion(entitiesId.discussionId);
    });

    test('Create discussion', async () => {
      // Act
      const res = await createDiscussion(
        entitiesId.spaceCommunicationId,
        'test',
        DiscussionCategory.GENERAL
      );
      entitiesId.discussionId = res.body.data.createDiscussion.id;

      const discussionRes = await getSpaceData(entitiesId.spaceId);

      const getDiscussionData =
        discussionRes.body.data.space.community.communication.discussions[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.createDiscussion).toEqual(getDiscussionData);
    });

    test('Update discussion', async () => {
      // Arrange
      const res = await createDiscussion(
        entitiesId.spaceCommunicationId,
        'changet title ',
        DiscussionCategory.GENERAL
      );

      entitiesId.discussionId = res.body.data.createDiscussion.id;

      // Act
      const resUpdate = await updateDiscussion(
        entitiesId.discussionId,
        TestUser.GLOBAL_ADMIN,
        {
          profileData: {
            displayName: 'experiment title',
            description: 'Test',
          },
        }
      );

      const discussionRes = await getSpaceData(entitiesId.spaceId);

      const getDiscussionData =
        discussionRes.body.data.space.community.communication.discussions[0];

      // Assert
      expect(resUpdate.statusCode).toEqual(200);
      expect(getDiscussionData.category).toEqual('SHARING');
      expect(getDiscussionData.title).toEqual('experiment title');
      expect(resUpdate.body.data.updateDiscussion).toEqual(getDiscussionData);
    });

    test('Delete discussion', async () => {
      // Arrange
      const res = await createDiscussion(
        entitiesId.spaceCommunicationId,
        'test',
        DiscussionCategory.GENERAL
      );
      entitiesId.discussionId = res.body.data.createDiscussion.id;

      // Act
      await deleteDiscussion(entitiesId.discussionId);

      const discussionRes = await getSpaceData(entitiesId.spaceId);

      const getDiscussionData =
        discussionRes.body.data.space.community.communication.discussions;

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(getDiscussionData).toHaveLength(0);
    });
  });

  describe('Discussion messages', () => {
    beforeAll(async () => {
      const res = await createDiscussion(
        entitiesId.spaceCommunicationId,
        'test',
        DiscussionCategory.GENERAL
      );

      entitiesId.discussionId = res.body.data.createDiscussion.id;
    });

    afterAll(async () => {
      await deleteDiscussion(entitiesId.discussionId);
    });

    afterEach(async () => {
      await removeMessageFromDiscussion(
        entitiesId.discussionId,
        entitiesId.messageId
      );
    });

    test('Send message to discussion', async () => {
      // Act
      const res = await postDiscussionComment(
        entitiesId.discussionId,
        'test message'
      );
      entitiesId.messageId = res.body.data.sendMessageToDiscussion.id;

      const discussionRes = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );

      const getDiscussionData =
        discussionRes.body.data.space.community.communication.discussions[0]
          .messages[0];

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.sendMessageToDiscussion).toEqual(getDiscussionData);
    });

    test('Create multiple messages in one discussion', async () => {
      // Act

      const firstMessageRes = await postDiscussionComment(
        entitiesId.discussionId,
        'test message 1'
      );

      entitiesId.messageId =
        firstMessageRes.body.data.sendMessageToDiscussion.id;

      const secondMessageRes = await postDiscussionComment(
        entitiesId.discussionId,
        'test message 2'
      );

      const secondmessageId =
        secondMessageRes.body.data.sendMessageToDiscussion.id;

      const discussionRes = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );

      const getDiscussions =
        discussionRes.body.data.space.community.communication.discussions[0]
          .messages;

      // Assert
      expect(getDiscussions).toHaveLength(2);

      await removeMessageFromDiscussion(
        entitiesId.discussionId,
        entitiesId.messageId
      );
      await removeMessageFromDiscussion(
        entitiesId.discussionId,
        secondmessageId
      );
    });

    test('Delete message from discussion', async () => {
      // Arrange
      const res = await postDiscussionComment(
        entitiesId.discussionId,
        'test message remove'
      );

      entitiesId.messageId = res.body.data.sendMessageToDiscussion.id;

      let discussionRes = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const messagesBefore =
        discussionRes.body.data.space.community.communication.discussions[0]
          .messages;

      // Act
      await removeMessageFromDiscussion(
        entitiesId.discussionId,
        entitiesId.messageId
      );

      discussionRes = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const messagesAfter =
        discussionRes.body.data.space.community.communication.discussions[0]
          .messages;

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(messagesBefore).toHaveLength(1);
      expect(messagesAfter).toHaveLength(0);
    });
  });

  describe('Discussion messages', () => {
    beforeAll(async () => {
      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.ANONYMOUS_READ_ACCESS,
        'false'
      );

      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.spaceCommunityId,
          users.spaceMemberId
        )
      );

      const discussionRes = await createDiscussion(
        entitiesId.spaceCommunicationId,
        'test',
        DiscussionCategory.GENERAL
      );

      entitiesId.discussionId = discussionRes.body.data.createDiscussion.id;
    });

    afterEach(async () => {
      await removeMessageFromDiscussion(
        entitiesId.discussionId,
        entitiesId.messageId
      );
    });
    afterAll(async () => {
      await deleteDiscussion(entitiesId.discussionId);
    });
    describe('Private Space', () => {
      test('discussion message - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await postDiscussionComment(
          entitiesId.discussionId,
          'PRIVATE space - admin'
        );

        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        const spaceDataSender = await getSpaceData(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );
        const getMessageSender =
          spaceDataSender.body.data.space.community.communication.discussions[0]
            .messages;

        const spaceDataReaderMember = await getSpaceData(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const getMessageReaderMember =
          spaceDataReaderMember.body.data.space.community.communication
            .discussions[0].messages;

        const spaceDataReader = await getSpaceData(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(getMessageSender).toHaveLength(1);
        expect(getMessageSender[0]).toEqual({
          id: entitiesId.messageId,
          message: 'PRIVATE space - admin',
          sender: { id: users.globalAdminId },
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'PRIVATE space - admin',
          sender: { id: users.globalAdminId },
        });

        expect(spaceDataReader.text).toContain(
          `User (${users.nonSpaceMemberEmail}) does not have credentials that grant 'read' access `
        );
      });

      // skipping due to bug: BUG: Community members don't have rights to send comments to community discussions #2483
      test.skip('discussion message created by member - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageText = 'discussion message created by member';
        const messageRes = await postDiscussionComment(
          entitiesId.discussionId,
          'PRIVATE space - admin',
          TestUser.HUB_MEMBER
        );
        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        const spaceDataSender = await getSpaceData(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        const getMessageAdmin =
          spaceDataSender.body.data.space.community.communication.discussions[0]
            .messages;

        const spaceDataReaderMember = await getSpaceData(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const getMessageReaderMember =
          spaceDataReaderMember.body.data.space.community.communication
            .discussions[0].messages;

        const spaceDataReader = await getSpaceData(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(getMessageAdmin).toHaveLength(1);
        expect(getMessageAdmin[0]).toEqual({
          id: entitiesId.messageId,
          message: messageText,
          sender: { id: users.spaceMemberId },
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: entitiesId.messageId,
          message: messageText,
          sender: { id: users.spaceMemberId },
        });

        expect(spaceDataReader.text).toContain(
          `User (${users.nonSpaceMemberEmail}) does not have credentials that grant 'read' access `
        );
      });

      test('discussion message created by non member - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Act
        const messageRes = await postDiscussionComment(
          entitiesId.discussionId,
          'test message',
          TestUser.NON_HUB_MEMBER
        );

        const getMessageAdmin = await getSpaceData(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(
          getMessageAdmin.body.data.space.community.communication.discussions[0]
            .messages
        ).toHaveLength(0);
        expect(messageRes.text).toContain(
          "Authorization: unable to grant 'create-comment' privilege: discussion send message: test"
        );
      });
    });

    describe('Public Spaces', () => {
      beforeAll(async () => {
        await changePreferenceSpace(
          entitiesId.spaceId,
          SpacePreferenceType.ANONYMOUS_READ_ACCESS,
          'true'
        );
      });
      test('discussion updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await postDiscussionComment(
          entitiesId.discussionId,
          'test message'
        );

        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        const spaceDataSender = await getSpaceData(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );
        const getMessageSender =
          spaceDataSender.body.data.space.community.communication.discussions[0]
            .messages;

        const spaceDataReaderMember = await getSpaceData(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const getMessageReaderMember =
          spaceDataReaderMember.body.data.space.community.communication
            .discussions[0].messages;

        const spaceDataReaderNotMemberIn = await getSpaceData(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );

        const spaceDataReaderNotMember =
          spaceDataReaderNotMemberIn.body.data.space.community.communication
            .discussions[0].messages;

        // Assert
        expect(getMessageSender).toHaveLength(1);
        expect(getMessageSender[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.globalAdminId },
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.globalAdminId },
        });

        expect(spaceDataReaderNotMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.globalAdminId },
        });
      });

      // skipping due to bug: BUG: Community members don't have rights to send comments to community discussions#2483
      test.skip('discussion message created by member - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await postDiscussionComment(
          entitiesId.discussionId,
          'test message',
          TestUser.HUB_MEMBER
        );
        entitiesId.messageId = messageRes.body.data.sendMessageToDiscussion.id;

        // Act
        const spaceDataSender = await getSpaceData(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        const getMessageAdmin =
          spaceDataSender.body.data.space.community.communication.discussions[0]
            .messages;

        const spaceDataReaderMember = await getSpaceData(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const getMessageReaderMember =
          spaceDataReaderMember.body.data.space.community.communication
            .discussions[0].messages;

        const spaceDataReader = await getSpaceData(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );
        const spaceDataReaderNotMember =
          spaceDataReader.body.data.space.community.communication.discussions[0]
            .messages;

        // Assert
        expect(getMessageAdmin).toHaveLength(1);
        expect(getMessageAdmin[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.spaceMemberId },
        });

        expect(getMessageReaderMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.spaceMemberId },
        });

        expect(spaceDataReaderNotMember[0]).toEqual({
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.spaceMemberId },
        });
      });

      test('discussion message created by non member - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await postDiscussionComment(
          entitiesId.discussionId,
          'test message',
          TestUser.NON_HUB_MEMBER
        );

        // Act
        const getMessageAdmin = await getSpaceData(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(
          getMessageAdmin.body.data.space.community.communication.discussions[0]
            .messages
        ).toHaveLength(0);
        expect(messageRes.text).toContain(
          "Authorization: unable to grant 'create-comment' privilege: discussion send message: test"
        );
      });
    });
  });
});
