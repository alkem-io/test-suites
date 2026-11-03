/**
 * @contract — T-1: the Node Yjs whiteboard peer (`connectWhiteboardPeer`).
 *
 * The harness has no other view of whiteboard content (no `content` field,
 * nothing in the DOM), so every collaborative whiteboard oracle stands on this
 * peer. This file proves the peer itself: admission, raw reads, the write path,
 * holding and releasing inbound updates, and the multi-user guard — including
 * the NEGATIVE (a Space without the multi-user plan admits a second connection
 * read-only), so "both connected as writers" cannot be a vacuous pass.
 *
 * Plan: client-web/src/functional-e2e/whiteboard-collaboration/whiteboard-collaboration-test-plan.md (T-1).
 * Run: `pnpm -C server-api exec vitest run --project contract src/contract/whiteboard-peer.it-spec.ts`
 */
import {
  connectWhiteboardPeer,
  createWhiteboardFramedCallout,
  entitleSpaceForWhiteboardMultiUser,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  type TestScenarioConfig,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();
const scenarioConfig = (name: string): TestScenarioConfig => ({
  name: `${name}-${uniqueId}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER, TestUser.QA_USER],
    },
  },
});

/** One Space, one whiteboard-framing callout, and the peers opened against it. */
const useWhiteboardSpace = (name: string, { entitled }: { entitled: boolean }) => {
  const state = { scenario: undefined as OrganizationWithSpaceModel | undefined, calloutId: '', whiteboardId: '' };
  const open: WhiteboardPeer[] = [];

  beforeAll(async () => {
    state.scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig(name));
    const created = await createWhiteboardFramedCallout(
      state.scenario.space.collaboration.calloutsSetId,
      `WB peer ${uniqueId}`,
      `${name}-${uniqueId}`
    );
    state.calloutId = created.calloutId;
    state.whiteboardId = created.whiteboardId;
    if (entitled) await entitleSpaceForWhiteboardMultiUser(state.scenario.space.id, state.calloutId);
  }, 60_000);

  afterEach(async () => {
    while (open.length > 0) await open.pop()?.close();
  });

  afterAll(async () => {
    if (state.scenario) await TestScenarioFactory.cleanUpBaseScenario(state.scenario);
  }, 60_000);

  const connect = async (actor: TestUser, options: { clientId?: number; requireWrite?: boolean } = {}) => {
    const peer = await connectWhiteboardPeer({ whiteboardId: state.whiteboardId, actor, ...options });
    open.push(peer);
    return peer;
  };
  return { state, connect };
};

describe('@contract T-1 whiteboard collaboration peer (Space with the multi-user plan)', () => {
  const { connect } = useWhiteboardSpace('wb-peer', { entitled: true });

  test('T-1a a member is admitted with write access and reads an empty raw doc', async () => {
    const peer = await connect(TestUser.QA_USER);
    expect(peer.access).toBe('write');
    expect(peer.rawElements()).toEqual({});
    expect(peer.liveElements()).toEqual([]);
    await peer.close();
    await peer.close(); // idempotent
  });

  test('T-1b a raw write by one peer is read raw by a fresh peer, key for key', async () => {
    const writer = await connect(TestUser.QA_USER);
    await writer.write((elements, Y) => {
      const element = new Y.Map<unknown>();
      element.set('type', 'arrow');
      element.set('x', 10);
      element.set('width', 20);
      element.set('points', [
        [0, 0],
        [20, 6],
      ]);
      elements.set('el-1', element);
    });
    await writer.write(elements => {
      elements.get('el-1')?.delete('width');
    });

    const reader = await connect(TestUser.SPACE_ADMIN);
    expect(reader.access).toBe('write');
    const raw = await reader.waitFor(
      () => (reader.rawElement('el-1')?.type === 'arrow' ? reader.rawElement('el-1') : undefined),
      'the writer element to reach a fresh peer'
    );
    // Raw: the deleted key is absent, nothing is defaulted back in.
    expect(raw).toEqual({
      type: 'arrow',
      x: 10,
      points: [
        [0, 0],
        [20, 6],
      ],
    });
    expect(reader.liveElements('arrow').map(e => e.id)).toEqual(['el-1']);
  });

  test('T-1c held inbound updates are queued, not applied, and apply on release', async () => {
    const holder = await connect(TestUser.QA_USER);
    const writer = await connect(TestUser.SPACE_ADMIN);
    holder.holdInbound();
    await writer.write((elements, Y) => {
      const element = new Y.Map<unknown>();
      element.set('type', 'rectangle');
      elements.set('el-held', element);
    });
    await holder.waitFor(() => holder.pendingInbound() >= 1, 'an inbound update to be queued');
    // The update has demonstrably arrived (positive control above); the held doc must not show it.
    expect(holder.rawElement('el-held')).toBeUndefined();

    holder.releaseInbound();
    expect(holder.pendingInbound()).toBe(0);
    expect(holder.rawElement('el-held')).toEqual({ type: 'rectangle' });
    await holder.announce(`qa-${uniqueId}`);
  });
});

describe('@contract T-1 whiteboard collaboration peer (Space WITHOUT the multi-user plan)', () => {
  const { connect } = useWhiteboardSpace('wb-peer-solo', { entitled: false });

  test('T-1d the second connection is admitted read-only (multi-user-not-allowed) and cannot write', async () => {
    const first = await connect(TestUser.QA_USER);
    expect(first.access).toBe('write');
    // Default `requireWrite` rejects loudly with the service's reason.
    await expect(connect(TestUser.SPACE_ADMIN)).rejects.toThrow(/multi-user-not-allowed/);
    const second = await connect(TestUser.SPACE_ADMIN, { requireWrite: false });
    expect(second.access).toBe('read');
    expect(second.accessReason).toBe('multi-user-not-allowed');
    await expect(second.write(() => undefined)).rejects.toThrow(/read access/);
  });
});
