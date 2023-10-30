import { delay, TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '../zcommunications/communications-helper';
import { removeChallengeCodegen } from '../integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '../integration/space/space.request.params';
import {
  createOpportunityPredefinedData,
  removeOpportunityCodegen,
} from '../integration/opportunity/opportunity.request.params';
import { subscriptionOpportunityCreated } from './subscrition-queries';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';

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
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await createChallengeWithUsersCodegen(challengeName);
});

afterAll(async () => {
  subscription1.terminate();
  subscription2.terminate();
  subscription3.terminate();

  await removeChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});
describe('Create opportunity subscription', () => {
  beforeAll(async () => {
    subscription1 = new SubscriptionClient();
    subscription2 = new SubscriptionClient();
    subscription3 = new SubscriptionClient();

    const utilizedQuery = {
      operationName: 'OpportunityCreated',
      query: subscriptionOpportunityCreated,
      variables: { challengeID: entitiesId.challengeId },
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
    await removeOpportunityCodegen(opportunityIdOne);
    await removeOpportunityCodegen(opportunityIdTwo);
  });

  it('receive newly created opportunities', async () => {
    // Create opportunity
    const resOne = await createOpportunityPredefinedData(
      entitiesId.challengeId,
      opportunityDisplayName1
    );
    opportunityIdOne = resOne.body.data.createOpportunity.id;

    const resTwo = await createOpportunityPredefinedData(
      entitiesId.challengeId,
      opportunityDisplayName2,
      TestUser.HUB_ADMIN
    );
    opportunityIdTwo = resTwo.body.data.createOpportunity.id;

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
