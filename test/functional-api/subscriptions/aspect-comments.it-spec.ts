import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createAspectOnCallout,
  AspectTypes,
} from '../integration/aspect/aspect.request.params';
import { entitiesId } from '../zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '../zcommunications/create-entities-with-users-helper';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { removeHub } from '../integration/hub/hub.request.params';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { subscriptionRoomMessageReceived } from './subscrition-queries';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'com-sub-org-n' + uniqueId;
const hostNameId = 'com-sub-org-nd' + uniqueId;
const hubName = 'com-sub-eco-n' + uniqueId;
const hubNameId = 'com-sub-eco-nd' + uniqueId;
const challengeName = `chname${uniqueId}`;
const opportunityName = `opname${uniqueId}`;
const aspectNameID = `asp-name-id-${uniqueId}`;
const aspectDisplayName = `aspect-d-name-${uniqueId}`;
let aspectCommentsIdHub = '';
let aspectCommentsIdChallenge = '';
let aspectCommentsIdOpportunity = '';

let messageGaId = '';
let messageHaId = '';
let messageHmId = '';

const messageGAText = 'GA test message on aspect';
const messageHAText = 'HA test message on aspect';
const messageHMText = 'HM test message on aspect';

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
          sender: { id: users.hubAdminId },
        },
      },
    }),
    expect.objectContaining({
      roomMessageReceived: {
        message: {
          id: messageHmId,
          message: messageHMText,
          sender: { id: users.hubMemberId },
        },
      },
    }),
  ];
};

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
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
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Aspect comments subscription', () => {
  describe('Hub comments subscription ', () => {
    beforeAll(async () => {
      const resAspectonHub = await createAspectOnCallout(
        entitiesId.hubCalloutId,
        aspectNameID,
        { profileData: { displayName: aspectDisplayName } },
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnCallout.comments.id;

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'RoomMessageReceived',
        query: subscriptionRoomMessageReceived,
        variables: { roomID: aspectCommentsIdHub },
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
        sendCommentVariablesData(aspectCommentsIdHub, messageGAText),
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA.body.data.sendMessageToRoom.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, messageHAText),
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA.body.data.sendMessageToRoom.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, messageHMText),
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
      const resAspectonChallenge = await createAspectOnCallout(
        entitiesId.challengeCalloutId,
        aspectNameID + 'ch',
        { profileData: { displayName: aspectDisplayName + 'ch' } },
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      aspectCommentsIdChallenge =
        resAspectonChallenge.body.data.createAspectOnCallout.comments.id;
      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'RoomMessageReceived',
        query: subscriptionRoomMessageReceived,
        variables: { roomID: aspectCommentsIdChallenge },
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
        sendCommentVariablesData(aspectCommentsIdChallenge, messageGAText),
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA.body.data.sendMessageToRoom.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdChallenge, messageHAText),
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA.body.data.sendMessageToRoom.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdChallenge, messageHMText),
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
      const resAspectonChallenge = await createAspectOnCallout(
        entitiesId.opportunityCalloutId,
        aspectNameID + 'opp',
        { profileData: { displayName: aspectDisplayName + 'opp' } },
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );

      aspectCommentsIdOpportunity =
        resAspectonChallenge.body.data.createAspectOnCallout.comments.id;

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'RoomMessageReceived',
        query: subscriptionRoomMessageReceived,
        variables: { roomID: aspectCommentsIdOpportunity },
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
        sendCommentVariablesData(aspectCommentsIdOpportunity, messageGAText),
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA.body.data.sendMessageToRoom.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdOpportunity, messageHAText),
        TestUser.HUB_ADMIN
      );
      messageHaId = messageHA.body.data.sendMessageToRoom.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdOpportunity, messageHMText),
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
