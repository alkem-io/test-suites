import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createAspectOnContext,
  AspectTypes,
} from '../integration/aspect/aspect.request.params';
import { entitiesId, users } from '../zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '../zcommunications/create-entities-with-users-helper';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { removeHub } from '../integration/hub/hub.request.params';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { subscriptionCommentsMessageReceived } from './subscrition-queries';

const organizationName = 'asp-com-sub-org-name' + uniqueId;
const hostNameId = 'asp-com-sub-org-nameid' + uniqueId;
const hubName = 'asp-com-sub-eco-name' + uniqueId;
const hubNameId = 'asp-com-sub-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
const aspectNameID = `aspect-name-id-${uniqueId}`;
const aspectDisplayName = `aspect-d-name-${uniqueId}`;
const aspectDescription = `aspectDescription-${uniqueId}`;
let aspectCommentsIdHub = '';
let aspectIdHub = '';
let aspectCommentsIdChallenge = '';
let aspectIdChallenge = '';
let aspectCommentsIdOpportunity = '';
let aspectIdOpportunity = '';

let subscription1: any;
let subscription2: any;
let subscription3: any;

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
    const messageGAText = 'GA test message on hub aspect';
    const messageHAText = 'HA test message on hub aspect';
    const messageHMText = 'HM test message on hub aspect';

    beforeAll(async () => {
      const resAspectonHub = await createAspectOnContext(
        entitiesId.hubContextId,
        aspectDisplayName,
        aspectNameID,
        aspectDescription,
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      aspectCommentsIdHub =
        resAspectonHub.body.data.createAspectOnContext.comments.id;
      aspectIdHub = resAspectonHub.body.data.createAspectOnContext.id;
      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      await subscription1.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdHub },
        },
        TestUser.GLOBAL_ADMIN
      );

      await subscription2.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdHub },
        },
        TestUser.HUB_ADMIN
      );
      await subscription3.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdHub },
        },
        TestUser.HUB_MEMBER
      );
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
      const messageGaId = messageGA.body.data.sendComment.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, messageHAText),
        TestUser.HUB_ADMIN
      );
      const messageHaId = messageHA.body.data.sendComment.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdHub, messageHMText),
        TestUser.HUB_MEMBER
      );
      const messageHmId = messageHM.body.data.sendComment.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);

      expect(subscription2.getMessages().length).toBe(3);

      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );
      expect(subscription2.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );
      expect(subscription3.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );

      // assert all messages are received from all subscribers
      expect(subscription1.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );

      expect(subscription2.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );

      expect(subscription3.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );
    });
  });

  describe('Challenge comments subscription ', () => {
    const messageGAText = 'GA test message on challenge aspect';
    const messageHAText = 'HA test message on challenge aspect';
    const messageHMText = 'HM test message on challenge aspect';

    beforeAll(async () => {
      const resAspectonChallenge = await createAspectOnContext(
        entitiesId.challengeContextId,
        aspectDisplayName + 'ch',
        aspectNameID + 'ch',
        aspectDescription,
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      aspectCommentsIdChallenge =
        resAspectonChallenge.body.data.createAspectOnContext.comments.id;
      aspectIdChallenge =
        resAspectonChallenge.body.data.createAspectOnContext.id;
      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      await subscription1.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdChallenge },
        },
        TestUser.GLOBAL_ADMIN
      );

      await subscription2.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdChallenge },
        },
        TestUser.HUB_ADMIN
      );
      await subscription3.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdChallenge },
        },
        TestUser.HUB_MEMBER
      );
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
      const messageGaId = messageGA.body.data.sendComment.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdChallenge, messageHAText),
        TestUser.HUB_ADMIN
      );
      const messageHaId = messageHA.body.data.sendComment.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdChallenge, messageHMText),
        TestUser.HUB_MEMBER
      );
      const messageHmId = messageHM.body.data.sendComment.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);

      expect(subscription2.getMessages().length).toBe(3);

      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );
      expect(subscription2.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );
      expect(subscription3.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );

      // assert all messages are received from all subscribers
      expect(subscription1.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );

      expect(subscription2.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );

      expect(subscription3.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );
    });
  });

  describe('Opportunity comments subscription ', () => {
    const messageGAText = 'GA test message on opportunity aspect';
    const messageHAText = 'HA test message on opportunity aspect';
    const messageHMText = 'HM test message on opportunity aspect';

    beforeAll(async () => {
      const resAspectonChallenge = await createAspectOnContext(
        entitiesId.opportunityContextId,
        aspectDisplayName + 'opp',
        aspectNameID + 'opp',
        aspectDescription,
        AspectTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );

      aspectCommentsIdOpportunity =
        resAspectonChallenge.body.data.createAspectOnContext.comments.id;
      aspectIdOpportunity =
        resAspectonChallenge.body.data.createAspectOnContext.id;
      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      await subscription1.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdOpportunity },
        },
        TestUser.GLOBAL_ADMIN
      );

      await subscription2.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdOpportunity },
        },
        TestUser.HUB_ADMIN
      );
      await subscription3.subscribe(
        {
          operationName: 'AspectCommentsMessageReceived',
          query: subscriptionCommentsMessageReceived,
          variables: { aspectID: aspectIdOpportunity },
        },
        TestUser.HUB_MEMBER
      );
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
      const messageGaId = messageGA.body.data.sendComment.id;

      const messageHA = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdOpportunity, messageHAText),
        TestUser.HUB_ADMIN
      );
      const messageHaId = messageHA.body.data.sendComment.id;

      const messageHM = await mutation(
        sendComment,
        sendCommentVariablesData(aspectCommentsIdOpportunity, messageHMText),
        TestUser.HUB_MEMBER
      );
      const messageHmId = messageHM.body.data.sendComment.id;

      await delay(500);

      // // assert number of received messages
      expect(subscription1.getMessages().length).toBe(3);

      expect(subscription2.getMessages().length).toBe(3);

      expect(subscription3.getMessages().length).toBe(3);

      // assert the latest is from the correct mutation and mutation result
      expect(subscription1.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );
      expect(subscription2.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );
      expect(subscription3.getLatest()).toHaveProperty(
        'aspectCommentsMessageReceived'
      );

      // assert all messages are received from all subscribers
      expect(subscription1.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );

      expect(subscription2.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );

      expect(subscription3.getMessages()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageGaId,
                message: messageGAText,
                sender: users.globalAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHaId,
                message: messageHAText,
                sender: users.hubAdminId,
              },
            },
          }),
          expect.objectContaining({
            aspectCommentsMessageReceived: {
              message: {
                id: messageHmId,
                message: messageHMText,
                sender: users.hubMemberId,
              },
            },
          }),
        ])
      );
    });
  });
});
