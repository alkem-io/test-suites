import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createPostOnCalloutCodegen,
  PostTypes,
} from '../callout/post/post.request.params';
import { deleteSpaceCodegen } from '../journey/space/space.request.params';
import { subscriptionRooms } from './subscrition-queries';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { sendMessageToRoomCodegen } from '../communications/communication.params';
import { entitiesId } from '../roles/community/communications-helper';

const organizationName = 'com-sub-org-n' + uniqueId;
const hostNameId = 'com-sub-org-nd' + uniqueId;
const spaceName = 'com-sub-eco-n' + uniqueId;
const spaceNameId = 'com-sub-eco-nd' + uniqueId;
const challengeName = `chname${uniqueId}`;
const opportunityName = `opname${uniqueId}`;
const postNameID = `asp-name-id-${uniqueId}`;
const postDisplayName = `post-d-name-${uniqueId}`;
let postCommentsIdSpace = '';
let postCommentsIdChallenge = '';
let postCommentsIdOpportunity = '';

let messageGaId = '';
let messageHaId = '';
let messageHmId = '';

const messageGAText = 'GA test message on post';
const messageHAText = 'HA test message on post';
const messageHMText = 'HM test message on post';

let subscription1: SubscriptionClient;
let subscription2: SubscriptionClient;
let subscription3: SubscriptionClient;

const expectedDataFunc = async (
  messageGaId: string,
  messageHaId: string,
  messageHmId: string
) => {
  return [
    expect.objectContaining({
      roomEvents: {
        message: {
          data: {
            id: messageGaId,
            message: messageGAText,
            sender: { id: users.globalAdminId },
          },
        },
      },
    }),
    expect.objectContaining({
      roomEvents: {
        message: {
          data: {
            id: messageHaId,
            message: messageHAText,
            sender: { id: users.spaceAdminId },
          },
        },
      },
    }),
    expect.objectContaining({
      roomEvents: {
        message: {
          data: {
            id: messageHmId,
            message: messageHMText,
            sender: { id: users.spaceMemberId },
          },
        },
      },
    }),
  ];
};

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});
describe('Post comments subscription', () => {
  describe('Space comments subscription ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.spaceCalloutId,
        { displayName: postDisplayName },
        postNameID,
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'roomEvents',
        query: subscriptionRooms,
        variables: { roomID: postCommentsIdSpace },
      };

      await subscription1.subscribe(utilizedQuery, TestUser.GLOBAL_ADMIN);
      await subscription2.subscribe(utilizedQuery, TestUser.HUB_ADMIN);
      await subscription3.subscribe(utilizedQuery, TestUser.HUB_MEMBER);
    });

    afterAll(async () => {
      subscription1.terminate();
      subscription2.terminate();
      subscription3.terminate();
    });

    it('receives message after new comment is created - 3 sender / 3 receivers', async () => {
      // create comment
      const messageGA = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        messageGAText,
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA?.data?.sendMessageToRoom.id;

      const messageHA = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        messageHAText,
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA?.data?.sendMessageToRoom.id;

      const messageHM = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        messageHMText,
        TestUser.HUB_MEMBER
      );
      messageHmId = messageHM?.data?.sendMessageToRoom.id;

      await delay(500);
      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);
      expect(subscription2.getMessages().length).toBe(3);
      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty('roomEvents');
      expect(subscription2.getLatest()).toHaveProperty('roomEvents');
      expect(subscription3.getLatest()).toHaveProperty('roomEvents');

      // assert all messages are received from all subscribers
      expect(subscription1.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
      expect(subscription2.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
      expect(subscription3.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
    });
  });

  describe('Challenge comments subscription ', () => {
    beforeAll(async () => {
      const resPostonChallenge = await createPostOnCalloutCodegen(
        entitiesId.challengeCalloutId,
        { displayName: postDisplayName + 'ch' },
        postNameID + 'ch',
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      postCommentsIdChallenge =
        resPostonChallenge.data?.createContributionOnCallout.post?.comments
          .id ?? '';

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'roomEvents',
        query: subscriptionRooms,
        variables: { roomID: postCommentsIdChallenge },
      };

      await subscription1.subscribe(utilizedQuery, TestUser.GLOBAL_ADMIN);
      await subscription2.subscribe(utilizedQuery, TestUser.HUB_ADMIN);
      await subscription3.subscribe(utilizedQuery, TestUser.HUB_MEMBER);
    });

    afterAll(async () => {
      subscription1.terminate();
      subscription2.terminate();
      subscription3.terminate();
    });
    it('receives message after new comment is created - 3 sender / 3 receivers', async () => {
      // create comment
      const messageGA = await sendMessageToRoomCodegen(
        postCommentsIdChallenge,
        messageGAText,
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA?.data?.sendMessageToRoom.id;

      const messageHA = await sendMessageToRoomCodegen(
        postCommentsIdChallenge,
        messageHAText,
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA?.data?.sendMessageToRoom.id;

      const messageHM = await sendMessageToRoomCodegen(
        postCommentsIdChallenge,
        messageHMText,
        TestUser.HUB_MEMBER
      );
      messageHmId = messageHM?.data?.sendMessageToRoom.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);
      expect(subscription2.getMessages().length).toBe(3);
      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty('roomEvents');
      expect(subscription2.getLatest()).toHaveProperty('roomEvents');
      expect(subscription3.getLatest()).toHaveProperty('roomEvents');

      // assert all messages are received from all subscribers
      expect(subscription1.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
      expect(subscription2.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
      expect(subscription3.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
    });
  });

  describe('Opportunity comments subscription ', () => {
    beforeAll(async () => {
      const resPostonChallenge = await createPostOnCalloutCodegen(
        entitiesId.opportunityCalloutId,
        { displayName: postDisplayName + 'opp' },
        postNameID + 'opp',
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );

      postCommentsIdOpportunity =
        resPostonChallenge.data?.createContributionOnCallout.post?.comments
          .id ?? '';

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'roomEvents',
        query: subscriptionRooms,
        variables: { roomID: postCommentsIdOpportunity },
      };

      await subscription1.subscribe(utilizedQuery, TestUser.GLOBAL_ADMIN);
      await subscription2.subscribe(utilizedQuery, TestUser.HUB_ADMIN);
      await subscription3.subscribe(utilizedQuery, TestUser.HUB_MEMBER);
    });

    afterAll(async () => {
      subscription1.terminate();
      subscription2.terminate();
      subscription3.terminate();
    });
    it('receives message after new comment is created - 3 sender / 3 receivers', async () => {
      // create comment
      const messageGA = await sendMessageToRoomCodegen(
        postCommentsIdOpportunity,
        messageGAText,
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA?.data?.sendMessageToRoom.id;

      const messageHA = await sendMessageToRoomCodegen(
        postCommentsIdOpportunity,
        messageHAText,
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA?.data?.sendMessageToRoom.id;

      const messageHM = await sendMessageToRoomCodegen(
        postCommentsIdOpportunity,
        messageHMText,
        TestUser.HUB_MEMBER
      );
      messageHmId = messageHM?.data?.sendMessageToRoom.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);
      expect(subscription2.getMessages().length).toBe(3);
      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty('roomEvents');
      expect(subscription2.getLatest()).toHaveProperty('roomEvents');
      expect(subscription3.getLatest()).toHaveProperty('roomEvents');

      // assert all messages are received from all subscribers
      expect(subscription1.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
      expect(subscription2.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
      expect(subscription3.getMessages()).toEqual(
        await expectedDataFunc(messageGaId, messageHaId, messageHmId)
      );
    });
  });
});
