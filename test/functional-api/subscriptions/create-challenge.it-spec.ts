import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '../zcommunications/communications-helper';
import { createOrgAndHubWithUsers } from '../zcommunications/create-entities-with-users-helper';
import {
  createChallengePredefinedData,
  removeChallenge,
} from '../integration/challenge/challenge.request.params';
import { removeHub } from '../integration/hub/hub.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { subscriptionChallengeCreated } from './subscrition-queries';

const organizationName = 'com-sub-org-n' + uniqueId;
const hostNameId = 'com-sub-org-nd' + uniqueId;
const hubName = 'com-sub-eco-n' + uniqueId;
const hubNameId = 'com-sub-eco-nd' + uniqueId;
const challengeDisplayName1 = 'ch1-display-name' + uniqueId;
const challengeDisplayName2 = 'ch2-display-name' + uniqueId;
let challengeIdOne = '';
let challengeIdTwo = '';

let subscription1: SubscriptionClient;
let subscription2: SubscriptionClient;
let subscription3: SubscriptionClient;

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Create challenge subscription', () => {
  beforeAll(async () => {
    subscription1 = new SubscriptionClient();
    subscription2 = new SubscriptionClient();
    subscription3 = new SubscriptionClient();

    const utilizedQuery = {
      operationName: 'ChallengeCreated',
      query: subscriptionChallengeCreated,
      variables: { hubID: entitiesId.hubId },
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

  afterEach(async () => {
    await removeChallenge(challengeIdOne);
    await removeChallenge(challengeIdTwo);
  });

  it('receive newly created challenges', async () => {
    // Create challenge
    const resOne = await createChallengePredefinedData(
      challengeDisplayName1,
      challengeDisplayName1,
      entitiesId.hubId
    );
    challengeIdOne = resOne.body.data.createChallenge.id;

    const resTwo = await createChallengePredefinedData(
      challengeDisplayName2,
      challengeDisplayName2,
      entitiesId.hubId,
      TestUser.HUB_ADMIN
    );
    challengeIdTwo = resTwo.body.data.createChallenge.id;

    await delay(500);

    const expectedData = expect.arrayContaining([
      expect.objectContaining({
        challengeCreated: {
          hubID: entitiesId.hubId,
          challenge: { profile: { displayName: challengeDisplayName1 } },
        },
      }),
      expect.objectContaining({
        challengeCreated: {
          hubID: entitiesId.hubId,
          challenge: { profile: { displayName: challengeDisplayName2 } },
        },
      }),
    ]);

    // assert number of created challenges
    expect(subscription1.getMessages().length).toBe(2);
    expect(subscription2.getMessages().length).toBe(2);
    expect(subscription3.getMessages().length).toBe(2);

    // assert the latest is from the correct mutation and mutation result
    expect(subscription1.getLatest()).toHaveProperty('challengeCreated');
    expect(subscription2.getLatest()).toHaveProperty('challengeCreated');
    expect(subscription3.getLatest()).toHaveProperty('challengeCreated');

    // assert all newly created challenges are displayed to subscribers
    expect(subscription1.getMessages()).toEqual(expectedData);
    expect(subscription2.getMessages()).toEqual(expectedData);
    expect(subscription3.getMessages()).toEqual(expectedData);
  });
});
