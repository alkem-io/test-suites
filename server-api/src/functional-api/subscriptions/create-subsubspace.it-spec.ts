import {
  SubscriptionClient,
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { deleteSpace } from '../journey/space/space.request.params';
import { subscriptionSubsubspaceCreated } from './subscription-queries';
import { TestUser } from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import { createSubspace } from '@functional-api/journey/subspace/subspace.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

const subsubspaceDisplayName1 = 'opp1-disp-name' + uniqueId;
const subsubspaceDisplayName2 = 'opp2-disp-name' + uniqueId;
let subsubspaceIdOne = '';
let subsubspaceIdTwo = '';

let subscription1: SubscriptionClient;
let subscription2: SubscriptionClient;
let subscription3: SubscriptionClient;

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'callouts',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
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
describe('Create subsubspace subscription', () => {
  beforeAll(async () => {
    subscription1 = new SubscriptionClient();
    subscription2 = new SubscriptionClient();
    subscription3 = new SubscriptionClient();

    const utilizedQuery = {
      operationName: 'SubsubspaceCreated',
      query: subscriptionSubsubspaceCreated,
      variables: { subspaceID: baseScenario.subspace.id },
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

  afterEach(async () => {
    await deleteSpace(subsubspaceIdOne);
    await deleteSpace(subsubspaceIdTwo);
  });

  it('receive newly created opportunities', async () => {
    // Create subsubspace
    const resOne = await createSubspace(
      subsubspaceDisplayName1,
      subsubspaceDisplayName1,
      baseScenario.subspace.id
    );
    subsubspaceIdOne = resOne?.data?.createSubspace.id ?? '';

    const resTwo = await createSubspace(
      subsubspaceDisplayName2,
      subsubspaceDisplayName2,
      baseScenario.subspace.id,
      TestUser.SPACE_ADMIN
    );
    subsubspaceIdTwo = resTwo?.data?.createSubspace.id ?? '';

    await delay(500);

    const expectedData = [
      {
        subsubspaceCreated: {
          subsubspace: { profile: { displayName: subsubspaceDisplayName1 } },
        },
      },
      {
        subsubspaceCreated: {
          subsubspace: { profile: { displayName: subsubspaceDisplayName2 } },
        },
      },
    ];

    // assert number of created opportunities
    expect(subscription1.getMessages().length).toBe(2);
    expect(subscription2.getMessages().length).toBe(2);
    expect(subscription3.getMessages().length).toBe(2);

    // assert the latest is from the correct mutation and mutation result
    expect(subscription1.getLatest()).toHaveProperty('subsubspaceCreated');
    expect(subscription2.getLatest()).toHaveProperty('subsubspaceCreated');
    expect(subscription3.getLatest()).toHaveProperty('subsubspaceCreated');

    // assert all newly created opportunities are displayed to subscribers
    expect(subscription1.getMessages()).toEqual(expectedData);
    expect(subscription2.getMessages()).toEqual(expectedData);
    expect(subscription3.getMessages()).toEqual(expectedData);
  });
});
