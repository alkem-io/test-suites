/* eslint-disable quotes */
import {
  deleteSpaceCodegen,
  getSpaceDataCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { DiscussionCategory, SpacePreferenceType } from '@alkemio/client-lib';
import {
  createDiscussionCodegen,
  deleteDiscussionCodegen,
  removeMessageOnRoomCodegen,
  sendMessageToRoomCodegen,
  updateDiscussionCodegen,
} from '../communication.params';
import { CommunityRole } from '@test/generated/alkemio-schema';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/roles/roles-request.params';

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

describe('Communication discussions', () => {
  describe('Discusssion CRUD operations', () => {
    afterEach(async () => {
      await deleteDiscussionCodegen(entitiesId.discussionId);
    });

    test('Create discussion', async () => {
      // Act
      const res = await createDiscussionCodegen(
        entitiesId.spaceCommunicationId,
        'test',
        DiscussionCategory.General
      );
      const discussionData = res?.data?.createDiscussion;
      entitiesId.discussionId = discussionData?.id ?? '';

      const discussionRes = await getSpaceDataCodegen(entitiesId.spaceId);

      const getDiscussionData =
        discussionRes?.data?.space?.community?.communication?.discussions?.[0];

      // Assert
      expect(discussionData).toEqual(getDiscussionData);
    });

    test('Update discussion', async () => {
      // Arrange
      const res = await createDiscussionCodegen(
        entitiesId.spaceCommunicationId,
        'changet title ',
        DiscussionCategory.Sharing
      );
      const discussionData = res?.data?.createDiscussion;
      entitiesId.discussionId = discussionData?.id ?? '';

      // Act
      const resUpdate = await updateDiscussionCodegen(
        entitiesId.discussionId,
        TestUser.GLOBAL_ADMIN,
        {
          profileData: {
            displayName: 'experiment title',
            description: 'Test',
          },
        }
      );

      const discussionRes = await getSpaceDataCodegen(entitiesId.spaceId);

      const getDiscussionData =
        discussionRes?.data?.space?.community?.communication?.discussions?.[0];

      // Assert
      expect(getDiscussionData?.category).toEqual(DiscussionCategory.Sharing);
      expect(getDiscussionData?.profile.displayName).toEqual(
        'experiment title'
      );
      expect(resUpdate?.data?.updateDiscussion).toEqual(getDiscussionData);
    });

    test('Delete discussion', async () => {
      // Arrange
      const res = await createDiscussionCodegen(
        entitiesId.spaceCommunicationId,
        'test',
        DiscussionCategory.General
      );
      const discussionData = res?.data?.createDiscussion;
      entitiesId.discussionId = discussionData?.id ?? '';
      // Act
      await deleteDiscussionCodegen(entitiesId.discussionId);

      const discussionRes = await getSpaceDataCodegen(entitiesId.spaceId);

      const getDiscussionData =
        discussionRes?.data?.space?.community?.communication?.discussions;

      // Assert
      expect(getDiscussionData).toHaveLength(0);
    });
  });

  describe('Discussion messages', () => {
    beforeAll(async () => {
      const res = await createDiscussionCodegen(
        entitiesId.spaceCommunicationId,
        'test',
        DiscussionCategory.General
      );

      const discussionData = res?.data?.createDiscussion;
      entitiesId.discussionId = discussionData?.comments.id ?? '';
    });

    afterAll(async () => {
      await deleteDiscussionCodegen(entitiesId.discussionId);
    });

    afterEach(async () => {
      await removeMessageOnRoomCodegen(
        entitiesId.discussionId,
        entitiesId.messageId
      );
    });

    test('Send message to discussion', async () => {
      // Act
      const res = await sendMessageToRoomCodegen(
        entitiesId.discussionId,
        'test message'
      );
      entitiesId.messageId = res?.data?.sendMessageToRoom?.id;

      const discussionRes = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );

      const getDiscussionData =
        discussionRes?.data?.space?.community?.communication?.discussions?.[0]
          .comments?.messages[0];

      // Assert
      expect(res?.data?.sendMessageToRoom).toEqual(getDiscussionData);
    });

    test('Create multiple messages in one discussion', async () => {
      // Act

      const firstMessageRes = await sendMessageToRoomCodegen(
        entitiesId.discussionId,
        'test message 1'
      );
      entitiesId.messageId = firstMessageRes?.data?.sendMessageToRoom.id;

      const secondMessageRes = await sendMessageToRoomCodegen(
        entitiesId.discussionId,
        'test message 2'
      );
      const secondmessageId = secondMessageRes?.data?.sendMessageToRoom.id;

      const discussionRes = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );

      const getDiscussions =
        discussionRes?.data?.space?.community?.communication?.discussions?.[0]
          .comments?.messages;

      // Assert
      expect(getDiscussions).toHaveLength(2);

      await removeMessageOnRoomCodegen(
        entitiesId.discussionId,
        entitiesId.messageId
      );
      await removeMessageOnRoomCodegen(
        entitiesId.discussionId,
        secondmessageId
      );
    });

    test('Delete message from discussion', async () => {
      // Arrange
      const res = await sendMessageToRoomCodegen(
        entitiesId.discussionId,
        'test message remove'
      );

      entitiesId.messageId = res?.data?.sendMessageToRoom.id;

      let discussionRes = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const messagesBefore =
        discussionRes?.data?.space?.community?.communication?.discussions?.[0]
          .comments?.messages;

      // Act
      await removeMessageOnRoomCodegen(
        entitiesId.discussionId,
        entitiesId.messageId
      );

      discussionRes = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const messagesAfter =
        discussionRes?.data?.space?.community?.communication?.discussions?.[0]
          .comments?.messages;

      // Assert
      expect(messagesBefore).toHaveLength(1);
      expect(messagesAfter).toHaveLength(0);
    });
  });

  describe('Discussion messages', () => {
    beforeAll(async () => {
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AuthorizationAnonymousReadAccess,
        'false'
      );

      await assignCommunityRoleToUserCodegen(
        users.spaceMemberId,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );

      const discussionRes = await createDiscussionCodegen(
        entitiesId.spaceCommunicationId,
        'test N',
        DiscussionCategory.General
      );

      const discussionData = discussionRes?.data?.createDiscussion;
      entitiesId.discussionId = discussionData?.comments.id ?? '';
    });

    afterEach(async () => {
      await removeMessageOnRoomCodegen(
        entitiesId.discussionId,
        entitiesId.messageId
      );
    });
    afterAll(async () => {
      await deleteDiscussionCodegen(entitiesId.discussionId);
    });
    describe('Private Space', () => {
      test('discussion message - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await sendMessageToRoomCodegen(
          entitiesId.discussionId,
          'PRIVATE space - admin'
        );
        entitiesId.messageId = messageRes?.data?.sendMessageToRoom.id;

        const expectedObject = {
          id: entitiesId.messageId,
          message: 'PRIVATE space - admin',
          sender: { id: users.globalAdminId },
        };
        // Act
        const spaceDataSender = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );
        const messageFromSender =
          spaceDataSender?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages;

        const spaceDataReaderMember = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const retrievedMessage =
          spaceDataReaderMember?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages;

        const spaceDataReader = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(messageFromSender).toHaveLength(1);
        expect(messageFromSender?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(retrievedMessage?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(spaceDataReader.error?.errors[0].message).toContain(
          `User (${users.nonSpaceMemberEmail}) does not have credentials that grant 'read' access `
        );
      });

      // skipping due to bug: BUG: Community members don't have rights to send comments to community discussions #2483
      test.skip('discussion message created by member - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageText = 'discussion message created by member';
        const messageRes = await sendMessageToRoomCodegen(
          entitiesId.discussionId,
          'PRIVATE space - admin',
          TestUser.HUB_MEMBER
        );
        entitiesId.messageId = messageRes?.data?.sendMessageToRoom.id;

        const expectedObject = {
          id: entitiesId.messageId,
          message: messageText,
          sender: { id: users.spaceMemberId },
        };

        // Act
        const spaceDataSender = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        const getMessageAdmin =
          spaceDataSender?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages;

        const spaceDataReaderMember = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const retrievedMessage =
          spaceDataReaderMember?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages;

        const spaceDataReader = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(getMessageAdmin).toHaveLength(1);
        expect(getMessageAdmin?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(retrievedMessage?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(spaceDataReader.error?.errors[0].message).toContain(
          `User (${users.nonSpaceMemberEmail}) does not have credentials that grant 'read' access `
        );
      });

      test('discussion message created by non member - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Act
        const messageRes = await sendMessageToRoomCodegen(
          entitiesId.discussionId,
          'test message',
          TestUser.NON_HUB_MEMBER
        );

        const getMessageAdmin = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(
          getMessageAdmin?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages
        ).toHaveLength(0);
        expect(messageRes?.error?.errors[0].code).toContain('FORBIDDEN_POLICY');
      });
    });

    describe('Public Spaces', () => {
      beforeAll(async () => {
        await changePreferenceSpaceCodegen(
          entitiesId.spaceId,
          SpacePreferenceType.AuthorizationAnonymousReadAccess,
          'true'
        );
      });
      test('discussion updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await sendMessageToRoomCodegen(
          entitiesId.discussionId,
          'test message'
        );
        entitiesId.messageId = messageRes?.data?.sendMessageToRoom.id;

        const expectedObject = {
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.globalAdminId },
        };

        // Act
        const spaceDataSender = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );
        const messageFromSender =
          spaceDataSender?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages;

        const spaceDataReaderMember = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const retrievedMessage =
          spaceDataReaderMember?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages;

        const spaceDataReaderNotMemberIn = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );

        const spaceDataReaderNotMember =
          spaceDataReaderNotMemberIn?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages;

        // Assert
        expect(messageFromSender).toHaveLength(1);
        expect(messageFromSender?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(retrievedMessage?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(spaceDataReaderNotMember?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );
      });

      // skipping due to bug: BUG: Community members don't have rights to send comments to community discussions#2483
      test.skip('discussion message created by member - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await sendMessageToRoomCodegen(
          entitiesId.discussionId,
          'test message',
          TestUser.HUB_MEMBER
        );
        entitiesId.messageId = messageRes?.data?.sendMessageToRoom?.id;

        const expectedObject = {
          id: entitiesId.messageId,
          message: 'test message',
          sender: { id: users.spaceMemberId },
        };

        // Act
        const spaceDataSender = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        const getMessageAdmin =
          spaceDataSender?.data?.space?.community?.communication
            ?.discussions?.[0]?.comments?.messages || [];

        const spaceDataReaderMember = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.HUB_MEMBER
        );
        const retrievedMessage =
          spaceDataReaderMember?.data?.space?.community?.communication
            ?.discussions?.[0]?.comments?.messages || [];

        const spaceDataReader = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );
        const spaceDataReaderNotMember =
          spaceDataReader?.data?.space?.community?.communication
            ?.discussions?.[0]?.comments?.messages || [];

        // Assert
        expect(getMessageAdmin).toHaveLength(1);
        expect(getMessageAdmin?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(retrievedMessage?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );

        expect(spaceDataReaderNotMember?.[0]).toEqual(
          expect.objectContaining(expectedObject)
        );
      });

      test('discussion message created by non member - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
        // Arrange
        const messageRes = await sendMessageToRoomCodegen(
          entitiesId.discussionId,
          'test message',
          TestUser.NON_HUB_MEMBER
        );

        // Act
        const getMessageAdmin = await getSpaceDataCodegen(
          entitiesId.spaceId,
          TestUser.GLOBAL_ADMIN
        );

        // Assert
        expect(
          getMessageAdmin?.data?.space?.community?.communication
            ?.discussions?.[0].comments?.messages
        ).toHaveLength(0);
        expect(messageRes.error?.errors[0].code).toContain('FORBIDDEN_POLICY');
      });
    });
  });
});
