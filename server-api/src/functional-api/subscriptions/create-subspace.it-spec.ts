import {
  createSubspace,
  SubscriptionClient,
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { deleteSpace } from '../journey/space/space.request.params';
import { subscriptionSubspaceCreated } from './subscription-queries';
import { TestUser } from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/dist/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

const subspaceDisplayName1 = 'ch1-display-name' + uniqueId;
const subspaceDisplayName2 = 'ch2-display-name' + uniqueId;
let subspaceIdOne = '';
let subspaceIdTwo = '';

let subscription1: SubscriptionClient;
let subscription2: SubscriptionClient;
let subscription3: SubscriptionClient;

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'subs-create-subspace',
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
describe('Create subspace subscription', () => {
  beforeAll(async () => {
    subscription1 = new SubscriptionClient();
    subscription2 = new SubscriptionClient();
    subscription3 = new SubscriptionClient();

    const utilizedQuery = {
      operationName: 'SubspaceCreated',
      query: subscriptionSubspaceCreated,
      variables: { spaceID: baseScenario.space.id },
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
    await deleteSpace(subspaceIdOne);
    await deleteSpace(subspaceIdTwo);
  });

  it('receive newly created subspaces', async () => {
    // Create subspace
    const resOne = await createSubspace(
      subspaceDisplayName1,
      subspaceDisplayName1,
      baseScenario.space.id
    );
    subspaceIdOne = resOne?.data?.createSubspace.id ?? '';

    const resTwo = await createSubspace(
      subspaceDisplayName2,
      subspaceDisplayName2,
      baseScenario.space.id,
      TestUser.SPACE_ADMIN
    );
    subspaceIdTwo = resTwo?.data?.createSubspace.id ?? '';

    await delay(500);

    const expectedData = expect.arrayContaining([
      expect.objectContaining({
        subspaceCreated: {
          spaceID: baseScenario.space.id,
          subspace: { profile: { displayName: subspaceDisplayName1 } },
        },
      }),
      expect.objectContaining({
        subspaceCreated: {
          spaceID: baseScenario.space.id,
          subspace: { profile: { displayName: subspaceDisplayName2 } },
        },
      }),
    ]);

    // assert number of created subspaces
    expect(subscription1.getMessages().length).toBe(2);
    expect(subscription2.getMessages().length).toBe(2);
    expect(subscription3.getMessages().length).toBe(2);

    // assert the latest is from the correct mutation and mutation result
    expect(subscription1.getLatest()).toHaveProperty('subspaceCreated');
    expect(subscription2.getLatest()).toHaveProperty('subspaceCreated');
    expect(subscription3.getLatest()).toHaveProperty('subspaceCreated');

    // assert all newly created subspaces are displayed to subscribers
    expect(subscription1.getMessages()).toEqual(expectedData);
    expect(subscription2.getMessages()).toEqual(expectedData);
    expect(subscription3.getMessages()).toEqual(expectedData);
  });
});
