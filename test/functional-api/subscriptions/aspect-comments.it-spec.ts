import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createPostOnCallout,
  PostTypes,
} from '../integration/post/post.request.params';
import { entitiesId } from '../zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '../zcommunications/create-entities-with-users-helper';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { removeSpace } from '../integration/space/space.request.params';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { subscriptionRoomMessageReceived } from './subscrition-queries';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'com-sub-org-n' + uniqueId;
const hostNameId = 'com-sub-org-nd' + uniqueId;
const spaceName = 'com-sub-eco-n' + uniqueId;
const spaceNameId = 'com-sub-eco-nd' + uniqueId;
const challengeName = `chname${uniqueId}`;
const opportunityName = `opname${uniqueId}`;
const postNameID = `asp-name-id-${uniqueId}`;
const postDisplayName = `post-d-name-${uniqueId}`;
let postCommentsIdSpace = '';
let postIdSpace = '';
let postCommentsIdChallenge = '';
let postIdChallenge = '';
let postCommentsIdOpportunity = '';
let postIdOpportunity = '';

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
      roomMessageReceived: {
        message: {
          id: messageGaId,
          message: messageGAText,
          sender: { id: users.globalAdminId },
        },
      },
    }),
    expect.objectContaining({
      roomMessageReceived: {
        message: {
          id: messageHaId,
          message: messageHAText,
          sender: { id: users.spaceAdminId },
        },
      },
    }),
    expect.objectContaining({
      roomMessageReceived: {
        message: {
          id: messageHmId,
          message: messageHMText,
          sender: { id: users.spaceMemberId },
        },
      },
    }),
  ];
};

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Post comments subscription', () => {
  describe('Space comments subscription ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        entitiesId.spaceCalloutId,
        postNameID,
        { profileData: { displayName: postDisplayName } },
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      postCommentsIdSpace =
        resPostonSpace.body.data.createPostOnCallout.comments.id;
      postIdSpace = resPostonSpace.body.data.createPostOnCallout.id;

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'RoomMessageReceived',
        query: subscriptionRoomMessageReceived,
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
      const messageGA = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdSpace, messageGAText),
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA.body.data.sendMessageToRoom.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdSpace, messageHAText),
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA.body.data.sendMessageToRoom.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdSpace, messageHMText),
        TestUser.HUB_MEMBER
      );
      messageHmId = messageHM.body.data.sendMessageToRoom.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);
      expect(subscription2.getMessages().length).toBe(3);
      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty('roomMessageReceived');
      expect(subscription2.getLatest()).toHaveProperty('roomMessageReceived');
      expect(subscription3.getLatest()).toHaveProperty('roomMessageReceived');

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
      const resPostonChallenge = await createPostOnCallout(
        entitiesId.challengeCalloutId,
        postNameID + 'ch',
        { profileData: { displayName: postDisplayName + 'ch' } },
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      postCommentsIdChallenge =
        resPostonChallenge.body.data.createPostOnCallout.comments.id;
      postIdChallenge = resPostonChallenge.body.data.createPostOnCallout.id;

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'RoomMessageReceived',
        query: subscriptionRoomMessageReceived,
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
      const messageGA = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdChallenge, messageGAText),
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA.body.data.sendMessageToRoom.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdChallenge, messageHAText),
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA.body.data.sendMessageToRoom.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdChallenge, messageHMText),
        TestUser.HUB_MEMBER
      );
      messageHmId = messageHM.body.data.sendMessageToRoom.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);
      expect(subscription2.getMessages().length).toBe(3);
      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty('roomMessageReceived');
      expect(subscription2.getLatest()).toHaveProperty('roomMessageReceived');
      expect(subscription3.getLatest()).toHaveProperty('roomMessageReceived');

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
      const resPostonChallenge = await createPostOnCallout(
        entitiesId.opportunityCalloutId,
        postNameID + 'opp',
        { profileData: { displayName: postDisplayName + 'opp' } },
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );

      postCommentsIdOpportunity =
        resPostonChallenge.body.data.createPostOnCallout.comments.id;
      postIdOpportunity = resPostonChallenge.body.data.createPostOnCallout.id;

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'RoomMessageReceived',
        query: subscriptionRoomMessageReceived,
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
      const messageGA = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdOpportunity, messageGAText),
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA.body.data.sendMessageToRoom.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdOpportunity, messageHAText),
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA.body.data.sendMessageToRoom.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdOpportunity, messageHMText),
        TestUser.HUB_MEMBER
      );
      messageHmId = messageHM.body.data.sendMessageToRoom.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);
      expect(subscription2.getMessages().length).toBe(3);
      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty('roomMessageReceived');
      expect(subscription2.getLatest()).toHaveProperty('roomMessageReceived');
      expect(subscription3.getLatest()).toHaveProperty('roomMessageReceived');

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
