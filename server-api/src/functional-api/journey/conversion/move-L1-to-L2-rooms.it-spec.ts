import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import {
  getSpaceData,
  getSpaceCommunication,
} from '../space/space.request.params';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l2-rooms-src',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: { addPostCallout: true },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

const targetConfig: TestScenarioConfig = {
  name: 'move-l1-l2-rooms-tgt',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: { addPostCallout: true },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

beforeAll(async () => {
  sourceScenario =
    await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario =
    await TestScenarioFactory.createBaseScenario(targetConfig);

  // Send message to callout post comments room
  await sendMessageToRoom(
    sourceScenario.subspace.collaboration.calloutPostCommentsId,
    'Test callout message before L1→L2 move'
  );

  // Send message to updates room
  await sendMessageToRoom(
    sourceScenario.subspace.communication.updatesId,
    'Test updates message before L1→L2 move'
  );

  // Execute cross-L0 move + demotion
  await moveSpaceL1ToSpaceL2(
    sourceScenario.subspace.id,
    targetScenario.subspace.id
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L2 - rooms and communication', () => {
  test('callout discussion room messages are preserved', async () => {
    const spaceData = await getSpaceData(sourceScenario.subspace.id);
    const callouts =
      spaceData.data?.lookup.space?.collaboration.calloutsSet.callouts ?? [];
    const postCallout = callouts.find(
      c => c.id === sourceScenario.subspace.collaboration.calloutPostId
    );
    const comments = postCallout?.comments?.messages ?? [];
    const messageTexts = comments.map(m => m.message);

    expect(messageTexts).toContain(
      'Test callout message before L1→L2 move'
    );
  });

  test('updates room is recreated empty', async () => {
    const commData = await getSpaceCommunication(
      sourceScenario.subspace.id
    );
    const updatesMessages =
      commData.data?.lookup.space?.community.communication.updates
        .messages ?? [];

    expect(updatesMessages).toHaveLength(0);
  });

  test('former member cannot access moved space rooms', async () => {
    const spaceData = await getSpaceData(
      sourceScenario.subspace.id,
      TestUser.SUBSPACE_MEMBER
    );

    const privileges =
      spaceData.data?.lookup.space?.authorization?.myPrivileges ?? [];
    expect(privileges).not.toContain('UPDATE');
  });
});
