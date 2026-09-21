import {
  ConversationCreationType,
  delay,
  SubscriptionClient,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { subscriptionRooms } from '@functional-api/subscriptions/subscription-queries';
import {
  sendMessageToRoom,
  sendMessageToRoomWithHeaders,
} from '../communication.params';
import {
  createConversation,
  deleteConversation,
  getProxySurfaceUsage,
} from './conversation.request.params';

const scenarioConfig: TestScenarioConfig = {
  name: 'proxy-surface-usage',
  space: {
    collaboration: { addPostCallout: true },
  },
};

type UsageRow = {
  surface: string;
  disposition: string;
  callerClass: string;
  roomType?: string | null;
  media: boolean;
  count: number;
};

const FLUSH_INTERVAL_MS = Number(
  process.env.COMMUNICATIONS_PROXY_USAGE_FLUSH_INTERVAL_MS ?? 10_000
);
const FLUSH_MARGIN_MS = 3000;
const MATRIX_TRANSPORT_HEADER = { 'x-alkemio-messaging-transport': 'matrix' };

let baseScenario: Awaited<
  ReturnType<typeof TestScenarioFactory.createBaseScenario>
>;
let conversationId = '';
let conversationRoomId = '';
let roomEventsSubscription: SubscriptionClient | undefined;

const todayRows = async (): Promise<UsageRow[]> => {
  const res = await getProxySurfaceUsage(1, TestUser.GLOBAL_ADMIN);
  expect(res?.error).toBeUndefined();
  const day =
    res?.data?.platformAdmin?.communication?.proxySurfaceUsage?.days?.at(-1);
  expect(day).toBeDefined();
  expect(day?.livenessMinutes).toBeGreaterThanOrEqual(1);
  expect(day?.livenessMinutes).toBeLessThanOrEqual(day?.expectedMinutes ?? 0);
  return (day?.rows ?? []) as UsageRow[];
};

const countOf = (
  rows: UsageRow[],
  match: Partial<
    Pick<UsageRow, 'surface' | 'callerClass' | 'roomType' | 'disposition'>
  >
) =>
  rows
    .filter(r =>
      Object.entries(match).every(
        ([k, v]) => (r as Record<string, unknown>)[k] === v
      )
    )
    .reduce((sum, r) => sum + r.count, 0);

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const created = await createConversation(
    [TestUserManager.users.nonSpaceMember.agentId],
    ConversationCreationType.Direct,
    undefined,
    TestUser.QA_USER
  );
  conversationId = created?.data?.createConversation?.id ?? '';
  conversationRoomId = created?.data?.createConversation?.room?.id ?? '';
});

afterAll(async () => {
  roomEventsSubscription?.terminate();
  if (conversationId) {
    await deleteConversation(conversationId, TestUser.QA_USER).catch(() => {});
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Proxy surface usage ledger', () => {
  test('sends land in WEB_MATRIX / WEB_GRAPHQL rows for the conversation room, a callout send in a LATER_MATRIX_ROOM_SCOPE row, and a roomEvents registration is counted', async () => {
    const before = await todayRows();

    // Act: one declared send, one undeclared, one to a callout comments room,
    // one roomEvents registration on the conversation room.
    await sendMessageToRoomWithHeaders(
      conversationRoomId,
      'declared transport',
      TestUser.QA_USER,
      MATRIX_TRANSPORT_HEADER
    );
    await sendMessageToRoom(
      conversationRoomId,
      'undeclared transport',
      TestUser.QA_USER
    );
    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'callout comment',
      TestUser.GLOBAL_ADMIN
    );
    roomEventsSubscription = new SubscriptionClient();
    await roomEventsSubscription.subscribe(
      {
        operationName: 'roomEvents',
        query: subscriptionRooms,
        variables: { roomID: conversationRoomId },
      },
      TestUser.QA_USER
    );

    await delay(FLUSH_INTERVAL_MS + FLUSH_MARGIN_MS);
    const after = await todayRows();

    // Assert: exact deltas per bucket.
    const delta = (match: Parameters<typeof countOf>[1]) =>
      countOf(after, match) - countOf(before, match);

    expect(
      delta({
        surface: 'Mutation.sendMessageToRoom',
        callerClass: 'WEB_MATRIX',
        roomType: 'conversation_direct',
        disposition: 'MIGRATED_BROWSER_DATA_PLANE',
      })
    ).toBe(1);
    expect(
      delta({
        surface: 'Mutation.sendMessageToRoom',
        callerClass: 'WEB_GRAPHQL',
        roomType: 'conversation_direct',
        disposition: 'MIGRATED_BROWSER_DATA_PLANE',
      })
    ).toBe(1);
    expect(
      delta({
        surface: 'Mutation.sendMessageToRoom',
        roomType: 'callout',
        disposition: 'LATER_MATRIX_ROOM_SCOPE',
      })
    ).toBe(1);
    expect(
      delta({
        surface: 'Subscription.roomEvents',
        roomType: 'conversation_direct',
      })
    ).toBe(1);

    const sendRows = after.filter(
      r => r.surface === 'Mutation.sendMessageToRoom'
    );
    expect(sendRows.every(r => r.media === false)).toBe(true);
  });

  test('a web caller is never classified as API, SERVICE, MCP or ANONYMOUS', async () => {
    const rows = await todayRows();
    const nonWeb = rows.filter(
      r =>
        r.surface === 'Mutation.sendMessageToRoom' &&
        r.roomType === 'conversation_direct' &&
        !['WEB_MATRIX', 'WEB_GRAPHQL'].includes(r.callerClass)
    );
    expect(nonWeb).toEqual([]);
  });

  test('a non-operator cannot read the ledger', async () => {
    const res = await getProxySurfaceUsage(1, TestUser.QA_USER);
    expect(res?.error?.errors?.length).toBeGreaterThan(0);
    expect(JSON.stringify(res?.error)).toContain('FORBIDDEN_POLICY');
  });

  test('the ledger window is bounded to 1..45 days', async () => {
    const tooMany = await getProxySurfaceUsage(46, TestUser.GLOBAL_ADMIN);
    expect(tooMany?.error?.errors?.length).toBeGreaterThan(0);
    const zero = await getProxySurfaceUsage(0, TestUser.GLOBAL_ADMIN);
    expect(zero?.error?.errors?.length).toBeGreaterThan(0);
  });

  // The MCP caller class is proven by the server unit spec
  // (proxy.caller.class.spec.ts); tests-lib has no MCP API-key fixture yet.
  test.skip('an MCP API-key caller lands in the MCP class even when it declares the matrix transport', () => {});
});
