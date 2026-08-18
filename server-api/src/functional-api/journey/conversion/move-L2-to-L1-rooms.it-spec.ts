import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL2ToSpaceL1 } from './conversion.request.params';
import {
  getSpaceData,
  getSpaceCommunication,
} from '../space/space.request.params';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import {
  createCalendarEventOnCalendar,
  getCalendarEvents,
  getSpaceCalendarId,
} from '@functional-api/calendar/calendar.request.params';
import { CalendarEventType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

/**
 * Move L2 to L1 - rooms and communication
 * (workspace#030-move-subspace-parent, FR-013)
 *
 * A cross-L0 move removes memberships and pending applications/invitations
 * only; all content travels with the space. Discussion/comment rooms, the
 * updates (announcement) channel, and calendar events keep their history
 * (epic alkem-io/alkemio#1846: "Updates go with the space"). Former members
 * lose access to the moved space. Mirrors move-L1-to-L2-rooms.it-spec.ts on
 * an L2 source.
 */

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;
let calendarEventId: string;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l2-l1-rooms-src',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: { addPostCallout: true },
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
        collaboration: { addPostCallout: true },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

const targetConfig: TestScenarioConfig = {
  name: 'move-l2-l1-rooms-tgt',
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
  // Independent scenarios (distinct names, no shared state) — build concurrently.
  [sourceScenario, targetScenario] = await Promise.all([
    TestScenarioFactory.createBaseScenario(sourceConfig),
    TestScenarioFactory.createBaseScenario(targetConfig),
  ]);

  // Create a calendar event on the L2 before move
  const calendarRes = await getSpaceCalendarId(sourceScenario.subsubspace.id);
  const calendarId =
    calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ??
    '';
  const calEventRes = await createCalendarEventOnCalendar(calendarId, {
    displayName: 'Event before move L2 to L1',
    startDate: '2026-06-01T10:00:00.000Z',
    durationMinutes: 60,
    multipleDays: false,
    wholeDay: false,
    type: CalendarEventType.Event,
  });
  calendarEventId = calEventRes.data?.createEventOnCalendar?.id ?? '';

  // Send message to callout post comments room (discussion — preserved)
  await sendMessageToRoom(
    sourceScenario.subsubspace.collaboration.calloutPostCommentsId,
    'Test callout message before L2→L1 move'
  );

  // Send message to updates room (announcement channel — reset on move)
  await sendMessageToRoom(
    sourceScenario.subsubspace.communication.updatesId,
    'Test updates message before L2→L1 move'
  );

  // Execute cross-L0 L2→L1 move
  await moveSpaceL2ToSpaceL1(
    sourceScenario.subsubspace.id,
    targetScenario.subspace.id
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L2 to L1 - rooms and communication', () => {
  test('callout discussion room messages are preserved', async () => {
    const spaceData = await getSpaceData(sourceScenario.subsubspace.id);
    const callouts =
      spaceData.data?.lookup.space?.collaboration.calloutsSet.callouts ?? [];
    const postCallout = callouts.find(
      c => c.id === sourceScenario.subsubspace.collaboration.calloutPostId
    );
    const comments = postCallout?.comments?.messages ?? [];
    const messageTexts = comments.map(m => m.message);

    expect(messageTexts).toContain('Test callout message before L2→L1 move');
  });

  test('calendar events are preserved after cross-L0 move', async () => {
    const calendarRes = await getCalendarEvents(sourceScenario.subsubspace.id);
    const events =
      calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar
        ?.events ?? [];

    const preserved = events.find(e => e.id === calendarEventId);
    expect(preserved).toBeDefined();
    expect(preserved?.profile.displayName).toBe('Event before move L2 to L1');
  });

  test('updates (announcement) channel messages are preserved after cross-L0 move (FR-013)', async () => {
    const commData = await getSpaceCommunication(sourceScenario.subsubspace.id);
    const updatesMessages =
      commData.data?.lookup.space?.community.communication.updates.messages ??
      [];

    // Content travels with the space: a cross-L0 move removes memberships and
    // pending applications/invitations only. The updates channel and its
    // history are preserved (epic alkem-io/alkemio#1846: "Updates go with the
    // space"), like discussion messages and calendar events above.
    expect(updatesMessages).toHaveLength(1);
  });

  test('former member cannot access the moved space (FR-004 downstream)', async () => {
    const spaceData = await getSpaceData(
      sourceScenario.subsubspace.id,
      TestUser.SUBSUBSPACE_MEMBER
    );

    const privileges =
      spaceData.data?.lookup.space?.authorization?.myPrivileges ?? [];
    expect(privileges).not.toContain('UPDATE');
  });
});
