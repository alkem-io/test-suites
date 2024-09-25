import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteSpace } from '../journey/space/space.request.params';
import { createOpportunityCodegen } from '@test/utils/mutations/journeys/opportunity';
import { subscriptionOpportunityCreated } from './subscrition-queries';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import { deleteOrganization } from '../organization/organization.request.params';
import { entitiesId } from '../../types/entities-helper';

const organizationName = 'com-sub-org-n' + uniqueId;
const hostNameId = 'com-sub-org-nd' + uniqueId;
const spaceName = 'com-sub-eco-n' + uniqueId;
const spaceNameId = 'com-sub-eco-nd' + uniqueId;
const challengeName = 'ch1-display-name' + uniqueId;

const opportunityDisplayName1 = 'opp1-disp-name' + uniqueId;
const opportunityDisplayName2 = 'opp2-disp-name' + uniqueId;
let opportunityIdOne = '';
let opportunityIdTwo = '';

let subscription1: SubscriptionClient;
let subscription2: SubscriptionClient;
let subscription3: SubscriptionClient;

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await createChallengeWithUsers(challengeName);
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});
describe('Create opportunity subscription', () => {
  beforeAll(async () => {
    subscription1 = new SubscriptionClient();
    subscription2 = new SubscriptionClient();
    subscription3 = new SubscriptionClient();

    const utilizedQuery = {
      operationName: 'OpportunityCreated',
      query: subscriptionOpportunityCreated,
      variables: { challengeID: entitiesId.challenge.id },
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
    await deleteSpace(opportunityIdOne);
    await deleteSpace(opportunityIdTwo);
  });

  it('receive newly created opportunities', async () => {
    // Create opportunity
    const resOne = await createOpportunityCodegen(
      opportunityDisplayName1,
      opportunityDisplayName1,
      entitiesId.challenge.id
    );
    opportunityIdOne = resOne?.data?.createSubspace.id ?? '';

    const resTwo = await createOpportunityCodegen(
      opportunityDisplayName2,
      opportunityDisplayName2,
      entitiesId.challenge.id,
      TestUser.HUB_ADMIN
    );
    opportunityIdTwo = resTwo?.data?.createSubspace.id ?? '';

    await delay(500);

    const expectedData = [
      {
        opportunityCreated: {
          opportunity: { profile: { displayName: opportunityDisplayName1 } },
        },
      },
      {
        opportunityCreated: {
          opportunity: { profile: { displayName: opportunityDisplayName2 } },
        },
      },
    ];

    // assert number of created opportunities
    expect(subscription1.getMessages().length).toBe(2);
    expect(subscription2.getMessages().length).toBe(2);
    expect(subscription3.getMessages().length).toBe(2);

    // assert the latest is from the correct mutation and mutation result
    expect(subscription1.getLatest()).toHaveProperty('opportunityCreated');
    expect(subscription2.getLatest()).toHaveProperty('opportunityCreated');
    expect(subscription3.getLatest()).toHaveProperty('opportunityCreated');

    // assert all newly created opportunities are displayed to subscribers
    expect(subscription1.getMessages()).toEqual(expectedData);
    expect(subscription2.getMessages()).toEqual(expectedData);
    expect(subscription3.getMessages()).toEqual(expectedData);
  });
});
