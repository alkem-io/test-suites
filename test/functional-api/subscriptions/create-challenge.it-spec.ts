import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpaceCodegen } from '../journey/space/space.request.params';
import { subscriptionChallengeCreated } from './subscrition-queries';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import { entitiesId } from '../roles/community/communications-helper';

const organizationName = 'com-sub-org-n' + uniqueId;
const hostNameId = 'com-sub-org-nd' + uniqueId;
const spaceName = 'com-sub-eco-n' + uniqueId;
const spaceNameId = 'com-sub-eco-nd' + uniqueId;
const challengeDisplayName1 = 'ch1-display-name' + uniqueId;
const challengeDisplayName2 = 'ch2-display-name' + uniqueId;
let challengeIdOne = '';
let challengeIdTwo = '';

let subscription1: SubscriptionClient;
let subscription2: SubscriptionClient;
let subscription3: SubscriptionClient;

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});
describe('Create challenge subscription', () => {
  beforeAll(async () => {
    subscription1 = new SubscriptionClient();
    subscription2 = new SubscriptionClient();
    subscription3 = new SubscriptionClient();

    const utilizedQuery = {
      operationName: 'ChallengeCreated',
      query: subscriptionChallengeCreated,
      variables: { spaceID: entitiesId.spaceId },
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
    await deleteSpaceCodegen(challengeIdOne);
    await deleteSpaceCodegen(challengeIdTwo);
  });

  it('receive newly created challenges', async () => {
    // Create challenge
    const resOne = await createChallengeCodegen(
      challengeDisplayName1,
      challengeDisplayName1,
      entitiesId.spaceId
    );
    challengeIdOne = resOne?.data?.createSubspace.id ?? '';

    const resTwo = await createChallengeCodegen(
      challengeDisplayName2,
      challengeDisplayName2,
      entitiesId.spaceId,
      TestUser.HUB_ADMIN
    );
    challengeIdTwo = resTwo?.data?.createSubspace.id ?? '';

    await delay(500);

    const expectedData = expect.arrayContaining([
      expect.objectContaining({
        challengeCreated: {
          spaceID: entitiesId.spaceId,
          challenge: { profile: { displayName: challengeDisplayName1 } },
        },
      }),
      expect.objectContaining({
        challengeCreated: {
          spaceID: entitiesId.spaceId,
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
