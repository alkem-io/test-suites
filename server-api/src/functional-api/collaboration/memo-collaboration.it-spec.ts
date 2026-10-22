/**
 * Memo live collaboration — the unified collaboration service at the wire level
 * (epic 003-unify-collab-yjs, `alkem-io/collaboration-service`).
 *
 * Two raw WebSocket collaborators open the same memo room through the gateway
 * (`wss://<host>/collab/<memoId>?type=memo`), authenticated exactly as every
 * other API call in this package is (harness bearer → Traefik forward-auth →
 * `X-Alkemio-Actor-Id`). No browser, no ProseMirror: this proves the transport
 * and the service, which the editor merely renders.
 *
 * Each case names the regression it would catch.
 */
import { TestScenarioFactory, TestUser, UniqueIDGenerator } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  appendMemoParagraph,
  bearerFor,
  CollabClient,
  HandshakeRefusedError,
  memoText,
} from './collab-ws.client';
import {
  collaborationScenario,
  createMemoFraming,
  FramingDocument,
  ROOM_IDLE_RELEASE_MS,
  settle,
} from './collaboration.fixtures';

const uniqueId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
let memo: FramingDocument;
const open: CollabClient[] = [];

const connectAs = async (user: TestUser | null, label: string) => {
  const client = await CollabClient.connect({
    documentId: memo.documentId,
    type: 'memo',
    authorization: user ? bearerFor(user) : undefined,
    label,
  });
  open.push(client);
  return client;
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(
    collaborationScenario(`collab-memo-${uniqueId}`)
  );
  memo = await createMemoFraming(
    baseScenario.space.collaboration.calloutsSetId,
    `Collab memo ${uniqueId}`
  );
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(client => client.close().catch(() => undefined)));
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('admission — who may open the room, and how', () => {
  test('a Space admin is admitted with write access, and admission precedes sync', async () => {
    // Regression: the service skipping the admission control, or demoting an
    // editor to read — the SPA would then never send SyncStep1 / never save.
    const admin = await connectAs(TestUser.SPACE_ADMIN, 'space-admin');
    expect(admin.controls[0]?.kind).toBe('admission');
    expect(admin.admission?.mode).toBe('write');
    expect(admin.hasSynced).toBe(true);
  });

  test('a Space member is admitted and receives the initial state', async () => {
    // Regression: member access to the room broken while the GraphQL read of
    // the same memo still works (the two are authorised on different paths).
    const member = await connectAs(TestUser.SPACE_MEMBER, 'space-member');
    expect(['read', 'write']).toContain(member.admission?.mode);
    expect(member.hasSynced).toBe(true);
  });

  test('a user outside the private Space is not admitted to the room', async () => {
    // Regression: the authz port failing open — a leaked document id would then
    // be enough to read (or edit) a private memo.
    let admitted: CollabClient | undefined;
    let outcome: unknown;
    try {
      admitted = await connectAs(TestUser.NON_SPACE_MEMBER, 'outsider');
    } catch (error) {
      outcome = error;
    }
    if (admitted) {
      throw new Error(
        `outsider was admitted with mode "${admitted.admission?.mode}" (controls: ${JSON.stringify(admitted.controls)})`
      );
    }
    // Either the upgrade itself is refused, or the socket is ended before any
    // admission/sync — both keep the document closed; what must never happen
    // is the admission above.
    expect(outcome).toBeInstanceOf(Error);
    if (outcome instanceof HandshakeRefusedError) {
      expect([401, 403]).toContain(outcome.status);
    }
  });

  test('an unauthenticated handshake is refused', async () => {
    // Regression: the identity chain not applied to the `/collab` route, so an
    // anonymous socket reaches the service.
    await expect(connectAs(null, 'anonymous')).rejects.toBeInstanceOf(HandshakeRefusedError);
  });
});

describe('sync — what one collaborator does, the other sees', () => {
  test('text inserted by A converges into B', async () => {
    // Regression: the service not relaying sync updates between members of a room.
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    const b = await connectAs(TestUser.SPACE_MEMBER, 'B');
    const marker = `memo-sync-${uniqueId}-${Date.now()}`;

    appendMemoParagraph(a.doc, marker);

    await b.waitFor(() => memoText(b.doc).includes(marker), 'A\'s paragraph to reach B');
    expect(memoText(b.doc)).toContain(marker);
  });

  test("A's presence is visible to B", async () => {
    // Regression: awareness frames dropped or not fanned out (no cursors, no
    // "who is here").
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    const b = await connectAs(TestUser.SPACE_MEMBER, 'B');

    a.awareness.setLocalState({ user: { name: `collab-memo-A-${uniqueId}` } });

    await b.waitFor(
      () => [...b.awareness.getStates().values()].some(s => s?.user?.name === `collab-memo-A-${uniqueId}`),
      "A's awareness state to reach B"
    );
    expect(b.awareness.getStates().size).toBeGreaterThanOrEqual(2);
  });
});

describe('durability — edits outlive the room', () => {
  test('a durability request is answered `persisted` for the requesting edit', async () => {
    // Regression: the save path failing (file-service / metadata store) while
    // the room keeps serving from memory — the SPA would show "saving…" forever.
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    appendMemoParagraph(a.doc, `memo-durable-${uniqueId}`);

    const persisted = await a.requestDurability();

    expect(persisted.kind).toBe('persisted');
    expect(persisted.requestId).toBeTruthy();
  });

  test('a cold client rehydrates the persisted text after the room was released', async () => {
    // Regression: persisted snapshot unreadable / not loaded on room start —
    // everything looks fine until the last editor leaves.
    const marker = `memo-rehydrate-${uniqueId}`;
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    appendMemoParagraph(a.doc, marker);
    await a.requestDurability();
    await a.close();
    open.splice(open.indexOf(a), 1);

    // An empty room is released only after the service's idle timeout; before
    // that a new client is served from memory and this case would prove
    // nothing. Positive settle window, see ROOM_IDLE_RELEASE_MS.
    await settle(ROOM_IDLE_RELEASE_MS);

    const cold = await connectAs(TestUser.SPACE_MEMBER, 'cold');
    expect(memoText(cold.doc)).toContain(marker);
  });
});
