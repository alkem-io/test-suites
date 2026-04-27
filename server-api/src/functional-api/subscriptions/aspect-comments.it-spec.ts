import {
  SubscriptionClient,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { createPostOnCallout } from '../callout/post/post.request.params';
import { subscriptionRooms } from './subscription-queries';
import { sendMessageToRoom } from '../communications/communication.params';
import { TestUser } from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

const postNameID = `asp-name-id-${uniqueId}`;
const postDisplayName = `post-d-name-${uniqueId}`;
let postCommentsIdSpace = '';
let postCommentsIdSubspace = '';
let postCommentsIdSubsubspace = '';

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
            sender: { id: TestUserManager.users.globalAdmin.id },
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
            sender: { id: TestUserManager.users.spaceAdmin.id },
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
            sender: { id: TestUserManager.users.spaceMember.id },
          },
        },
      },
    }),
  ];
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'callouts',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});
/** @testCase TC-1001 */
describe('Post comments subscription', () => {
  describe('Space comments subscription ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        baseScenario.space.collaboration.calloutPostId,
        { displayName: postDisplayName },
        postNameID,
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
      await subscription2.subscribe(utilizedQuery, TestUser.SPACE_ADMIN);
      await subscription3.subscribe(utilizedQuery, TestUser.SPACE_MEMBER);
    });

    afterAll(async () => {
      subscription1.terminate();
      subscription2.terminate();
      subscription3.terminate();
    });

    it('receives message after new comment is created - 3 sender / 3 receivers', async () => {
      // create comment
      const messageGA = await sendMessageToRoom(
        postCommentsIdSpace,
        messageGAText,
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA?.data?.sendMessageToRoom.id;

      const messageHA = await sendMessageToRoom(
        postCommentsIdSpace,
        messageHAText,
        TestUser.SPACE_ADMIN
      );
      messageHaId = messageHA?.data?.sendMessageToRoom.id;

      const messageHM = await sendMessageToRoom(
        postCommentsIdSpace,
        messageHMText,
        TestUser.SPACE_MEMBER
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

  describe('Subspace comments subscription ', () => {
    beforeAll(async () => {
      const resPostonSubspace = await createPostOnCallout(
        baseScenario.subspace.collaboration.calloutPostId,
        { displayName: postDisplayName + 'ch' },
        postNameID + 'ch',
        TestUser.GLOBAL_ADMIN
      );
      postCommentsIdSubspace =
        resPostonSubspace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'roomEvents',
        query: subscriptionRooms,
        variables: { roomID: postCommentsIdSubspace },
      };

      await subscription1.subscribe(utilizedQuery, TestUser.GLOBAL_ADMIN);
      await subscription2.subscribe(utilizedQuery, TestUser.SPACE_ADMIN);
      await subscription3.subscribe(utilizedQuery, TestUser.SPACE_MEMBER);
    });

    afterAll(async () => {
      subscription1.terminate();
      subscription2.terminate();
      subscription3.terminate();
    });
    it('receives message after new comment is created - 3 sender / 3 receivers', async () => {
      // create comment
      const messageGA = await sendMessageToRoom(
        postCommentsIdSubspace,
        messageGAText,
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA?.data?.sendMessageToRoom.id;

      const messageHA = await sendMessageToRoom(
        postCommentsIdSubspace,
        messageHAText,
        TestUser.SPACE_ADMIN
      );
      messageHaId = messageHA?.data?.sendMessageToRoom.id;

      const messageHM = await sendMessageToRoom(
        postCommentsIdSubspace,
        messageHMText,
        TestUser.SPACE_MEMBER
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

  describe('Subsubspace comments subscription ', () => {
    beforeAll(async () => {
      const resPostonSubspace = await createPostOnCallout(
        baseScenario.subsubspace.collaboration.calloutPostId,
        { displayName: postDisplayName + 'opp' },
        postNameID + 'opp',
        TestUser.GLOBAL_ADMIN
      );

      postCommentsIdSubsubspace =
        resPostonSubspace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      subscription1 = new SubscriptionClient();
      subscription2 = new SubscriptionClient();
      subscription3 = new SubscriptionClient();

      const utilizedQuery = {
        operationName: 'roomEvents',
        query: subscriptionRooms,
        variables: { roomID: postCommentsIdSubsubspace },
      };

      await subscription1.subscribe(utilizedQuery, TestUser.GLOBAL_ADMIN);
      await subscription2.subscribe(utilizedQuery, TestUser.SPACE_ADMIN);
      await subscription3.subscribe(utilizedQuery, TestUser.SPACE_MEMBER);
    });

    afterAll(async () => {
      subscription1.terminate();
      subscription2.terminate();
      subscription3.terminate();
    });
    it('receives message after new comment is created - 3 sender / 3 receivers', async () => {
      // create comment
      const messageGA = await sendMessageToRoom(
        postCommentsIdSubsubspace,
        messageGAText,
        TestUser.GLOBAL_ADMIN
      );
      messageGaId = messageGA?.data?.sendMessageToRoom.id;

      const messageHA = await sendMessageToRoom(
        postCommentsIdSubsubspace,
        messageHAText,
        TestUser.SPACE_ADMIN
      );
      messageHaId = messageHA?.data?.sendMessageToRoom.id;

      const messageHM = await sendMessageToRoom(
        postCommentsIdSubsubspace,
        messageHMText,
        TestUser.SPACE_MEMBER
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
