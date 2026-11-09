/**
 * @contract — T-1: the Node Yjs whiteboard peer (`connectWhiteboardPeer`).
 *
 * The harness has no other view of whiteboard content (no `content` field,
 * nothing in the DOM), so every collaborative whiteboard oracle stands on this
 * peer. This file proves the peer itself: admission, raw reads, the write path,
 * holding and releasing inbound updates, and the multi-user guard — including
 * the NEGATIVE (a Space without the multi-user plan admits a second connection
 * read-only), so "both connected as writers" cannot be a vacuous pass. T-1e/T-1f
 * cover the peer's own invalid transitions and its lifecycle against a scripted
 * stand-in service on localhost (the real service cannot be made to misbehave).
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
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';

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

  const connect = async (
    actor: TestUser,
    options: { clientId?: number; requireWrite?: boolean; heartbeatIdleMs?: number } = {}
  ) => {
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

  test('T-1c held inbound updates are queued, not applied, and apply on release in arrival order', async () => {
    const holder = await connect(TestUser.QA_USER);
    const writer = await connect(TestUser.SPACE_ADMIN);
    holder.holdInbound();
    await writer.write((elements, Y) => {
      const element = new Y.Map<unknown>();
      element.set('type', 'rectangle');
      element.set('x', 1);
      elements.set('el-held', element);
    });
    await writer.write(elements => {
      elements.get('el-held')?.set('x', 2);
    });
    await holder.waitFor(() => holder.pendingInbound() >= 2, 'both inbound updates to be queued');
    expect(holder.pendingInbound(), 'one queued update per write').toBe(2);
    // The updates have demonstrably arrived (positive control above); the held doc must not show them.
    expect(holder.rawElement('el-held')).toBeUndefined();

    // Arrival order: each queued update is its own transaction, the first one first. Applied in
    // reverse, Yjs would park the second (a missing dependency) and show nothing, then 2.
    const seenX: unknown[] = [];
    holder.doc.on('afterTransaction', () => seenX.push(holder.rawElement('el-held')?.x));
    holder.releaseInbound();
    expect(seenX, 'x after each applied update, in order').toEqual([1, 2]);
    expect(holder.pendingInbound()).toBe(0);
    expect(holder.rawElement('el-held')).toEqual({ type: 'rectangle', x: 2 });
    await holder.announce(`qa-${uniqueId}`);
  });

  test('T-1e invalid transitions: a closed peer refuses to write or announce', async () => {
    const peer = await connect(TestUser.QA_USER);
    await peer.close();
    await expect(peer.write(() => undefined)).rejects.toThrow(/peer is closed \(closed-by-peer\)/);
    await expect(peer.announce(`qa-${uniqueId}`)).rejects.toThrow(/peer is closed/);
  });

  test('T-1f the service echoes the heartbeat and the peer consumes the echo', async () => {
    const peer = await connect(TestUser.QA_USER, { heartbeatIdleMs: 100 });
    // Two round trips: only a consumed echo re-arms the idle timer, so a second heartbeat proves it.
    await peer.waitFor(() => peer.heartbeatsEchoed >= 2, 'two heartbeat echoes from the service');
    expect(peer.endedReason).toBeUndefined();
  });

  test('T-1j positive: awaitDurable resolves once the service answers `persisted` to this peer, and the write is then in a fresh peer', async () => {
    const writer = await connect(TestUser.QA_USER);
    await writer.write((elements, Y) => {
      const element = new Y.Map<unknown>();
      element.set('type', 'rectangle');
      element.set('x', 42);
      elements.set('el-durable', element);
    });
    await writer.awaitDurable();
    // once more on a now-clean room: answered at once, and the barrier is reusable (one outstanding at a time)
    await writer.awaitDurable();
    const reader = await connect(TestUser.SPACE_ADMIN);
    const raw = await reader.waitFor(() => reader.rawElement('el-durable'), 'the durable element to reach a fresh peer');
    expect(raw).toEqual({ type: 'rectangle', x: 42 });
  });

  test('T-1j invalid transitions: a second concurrent request is refused locally, and a closed peer cannot ask', async () => {
    const peer = await connect(TestUser.QA_USER);
    const first = peer.awaitDurable();
    await expect(peer.awaitDurable()).rejects.toThrow(/still pending/);
    await first;
    await peer.close();
    await expect(peer.awaitDurable()).rejects.toThrow(/peer is closed/);
  });
});

/**
 * A scripted stand-in for the collaboration service on localhost: `script` runs per
 * connection. Frames are built by hand: CONTROL (3) + raw JSON, SYNC (0) + sync type + a
 * v1 update (`[0, 0]` is the empty update).
 */
const FRAME = {
  admissionWrite: Buffer.concat([Buffer.from([3]), Buffer.from(JSON.stringify({ kind: 'admission', mode: 'write' }))]),
  syncStep2Empty: Buffer.from([0, 1, 2, 0, 0]),
  syncUpdateEmpty: Buffer.from([0, 2, 2, 0, 0]),
};
const isSyncStep1 = (data: Buffer): boolean => data[0] === 0 && data[1] === 0;

const fakeService = async (script: (socket: WebSocket) => void) => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  server.on('connection', script);
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  let stopped: Promise<void> | undefined;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: (): Promise<void> =>
      (stopped ??= new Promise<void>(resolve => {
        for (const client of server.clients) client.terminate();
        server.close(() => resolve());
      })),
  };
};

describe('@contract T-1 whiteboard collaboration peer (scripted stand-in service)', () => {
  test('T-1g invalid transition: a sync frame before admission is refused by the peer', async () => {
    const service = await fakeService(socket => socket.send(FRAME.syncUpdateEmpty));
    try {
      await expect(
        connectWhiteboardPeer({
          whiteboardId: 'wb-fake',
          actor: { bearerToken: 'not-used' },
          baseUrl: service.baseUrl,
          connectTimeoutMs: 5_000,
        })
      ).rejects.toThrow(/sync-before-admission/);
    } finally {
      await service.stop();
    }
  });

  test('T-1h the service closes first: close() still destroys the doc and its awareness', async () => {
    const service = await fakeService(socket => {
      socket.on('message', data => {
        if (isSyncStep1(data as Buffer)) socket.send(FRAME.syncStep2Empty);
      });
      socket.send(FRAME.admissionWrite);
    });
    try {
      const peer = await connectWhiteboardPeer({
        whiteboardId: 'wb-fake',
        actor: { bearerToken: 'not-used' },
        baseUrl: service.baseUrl,
        connectTimeoutMs: 5_000,
      });
      expect(peer.isReady).toBe(true);
      let docDestroyed = false;
      peer.doc.on('destroy', () => {
        docDestroyed = true;
      });
      await service.stop(); // the service side ends the session
      await expect.poll(() => peer.endedReason, { timeout: 5_000 }).toMatch(/^closed /);
      expect(docDestroyed, 'the socket closing alone does not destroy the doc').toBe(false);
      await peer.close();
      expect(docDestroyed, 'close() after a service close destroys the doc (and with it the awareness)').toBe(true);
      await expect(peer.write(() => undefined)).rejects.toThrow(/peer is closed \(closed /);
    } finally {
      await service.stop();
    }
  });

  test('T-1i invalid transition: a write in the CLOSING window (close frame received, close event pending) rejects', async () => {
    // The service sends a close frame but never reads the peer's reply: `ws` then holds the
    // peer in CLOSING (its close timer is 30 s), so the window is wide open and deterministic.
    const service = await fakeService(socket => {
      socket.on('message', data => {
        if (isSyncStep1(data as Buffer)) {
          socket.send(FRAME.syncStep2Empty, () => {
            socket.pause();
            socket.close(1000, 'service going away');
          });
        }
      });
      socket.send(FRAME.admissionWrite);
    });
    try {
      const peer = await connectWhiteboardPeer({
        whiteboardId: 'wb-fake',
        actor: { bearerToken: 'not-used' },
        baseUrl: service.baseUrl,
        connectTimeoutMs: 5_000,
      });
      await expect.poll(() => peer.socketState, { timeout: 5_000 }).toBe('closing');
      expect(peer.endedReason, 'the close event has not fired yet').toBeUndefined();
      await expect(peer.write(elements => elements.set('el-lost', new Map() as never))).rejects.toThrow(
        /collab socket is closing; nothing sent/
      );
      await expect(peer.announce(`qa-${uniqueId}`)).rejects.toThrow(/collab socket is closing; nothing sent/);
      expect(peer.rawElement('el-lost'), 'the rejected write did not touch the doc').toBeUndefined();
    } finally {
      await service.stop();
    }
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

  test('T-1j negative control: a read-only peer is refused by the barrier (so a peer that resolves on any control frame cannot pass the positive)', async () => {
    await connect(TestUser.QA_USER);
    const readOnly = await connect(TestUser.SPACE_ADMIN, { requireWrite: false });
    expect(readOnly.access).toBe('read');
    await expect(readOnly.awaitDurable({ timeoutMs: 10_000 })).rejects.toThrow(/failed: this session is read-only/);
  });
});
