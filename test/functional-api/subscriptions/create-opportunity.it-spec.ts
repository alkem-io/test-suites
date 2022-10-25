import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '../zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from '../zcommunications/create-entities-with-users-helper';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { removeHub } from '../integration/hub/hub.request.params';
import {
  createOpportunityPredefinedData,
  removeOpportunity,
} from '../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { subscriptionOpportunityCreated } from './subscrition-queries';

const organizationName = 'com-sub-org-n' + uniqueId;
const hostNameId = 'com-sub-org-nd' + uniqueId;
const hubName = 'com-sub-eco-n' + uniqueId;
const hubNameId = 'com-sub-eco-nd' + uniqueId;
const challengeName = 'ch1-display-name' + uniqueId;

const opportunityDisplayName1 = 'opp1-disp-name' + uniqueId;
const opportunityDisplayName2 = 'opp2-disp-name' + uniqueId;
let opportunityIdOne = '';
let opportunityIdTwo = '';

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
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Create opportunity subscription', () => {
  beforeAll(async () => {
    subscription1 = new SubscriptionClient();
    subscription2 = new SubscriptionClient();
    subscription3 = new SubscriptionClient();

    await subscription1.subscribe(
      {
        operationName: 'OpportunityCreated',
        query: subscriptionOpportunityCreated,
        variables: { challengeID: entitiesId.challengeId },
      },
      TestUser.GLOBAL_ADMIN
    );

    await subscription2.subscribe(
      {
        operationName: 'OpportunityCreated',
        query: subscriptionOpportunityCreated,
        variables: { challengeID: entitiesId.challengeId },
      },
      TestUser.HUB_ADMIN
    );
    await subscription3.subscribe(
      {
        operationName: 'OpportunityCreated',
        query: subscriptionOpportunityCreated,
        variables: { challengeID: entitiesId.challengeId },
      },
      TestUser.HUB_MEMBER
    );
  });

  afterAll(async () => {
    subscription1.terminate();
    subscription2.terminate();
    subscription3.terminate();
  });
  afterEach(async () => {
    await removeOpportunity(opportunityIdOne);
    await removeOpportunity(opportunityIdTwo);
  });
  it('receive newly created opportunities', async () => {
    // Create opportunity
    const resOne = await await createOpportunityPredefinedData(
      entitiesId.challengeId,
      opportunityDisplayName1,
      opportunityDisplayName1
    );
    opportunityIdOne = resOne.body.data.createOpportunity.id;

    const resTwo = await await createOpportunityPredefinedData(
      entitiesId.challengeId,
      opportunityDisplayName2,
      opportunityDisplayName2,
      TestUser.HUB_ADMIN
    );
    opportunityIdTwo = resTwo.body.data.createOpportunity.id;

    await delay(500);

    // assert number of created opportunities
    console.log(subscription1);
    console.log(subscription1.getLatest());

    expect(subscription1.getMessages().length).toBe(2);

    expect(subscription2.getMessages().length).toBe(2);

    expect(subscription3.getMessages().length).toBe(2);

    // assert the latest is from the correct mutation and mutation result
    expect(subscription1.getLatest()).toHaveProperty('opportunityCreated');
    expect(subscription2.getLatest()).toHaveProperty('opportunityCreated');
    expect(subscription3.getLatest()).toHaveProperty('opportunityCreated');

    // assert all newly created opportunities are displayed to subscribers
    expect(subscription1.getMessages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName1 },
          },
        }),
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName2 },
          },
        }),
      ])
    );

    expect(subscription1.getMessages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName1 },
          },
        }),
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName2 },
          },
        }),
      ])
    );

    expect(subscription2.getMessages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName1 },
          },
        }),
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName2 },
          },
        }),
      ])
    );

    expect(subscription3.getMessages()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName1 },
          },
        }),
        expect.objectContaining({
          opportunityCreated: {
            opportunity: { displayName: opportunityDisplayName2 },
          },
        }),
      ])
    );
  });
});
