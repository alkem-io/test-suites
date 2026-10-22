/**
 * Whiteboard live collaboration — the unified collaboration service at the
 * wire level (epic 003-unify-collab-yjs, `alkem-io/collaboration-service`).
 *
 * Same transport and authentication as the memo spec; the document is the
 * Excalidraw scene the service materialises for `type=whiteboard`
 * (`applyConvention` in the service): root `Y.Map`s `elements`, `files`,
 * `appState`. The editor binding (`@excalidraw-yjs/element`, `elementToYMap`)
 * stores EVERY element as its own `Y.Map` with one key per property — which is
 * what makes two people editing different properties of the same shape merge
 * field by field instead of last-write-wins. The headline case below pins that
 * guarantee at the service boundary; the binding itself is not imported.
 */
import * as Y from 'yjs';
import { TestScenarioFactory, TestUser, UniqueIDGenerator } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { bearerFor, CollabClient, HandshakeRefusedError } from './collab-ws.client';
import {
  collaborationScenario,
  createWhiteboardFraming,
  FramingDocument,
  ROOM_IDLE_RELEASE_MS,
  settle,
} from './collaboration.fixtures';

const uniqueId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
let whiteboard: FramingDocument;
const open: CollabClient[] = [];

const connectAs = async (user: TestUser | null, label: string) => {
  const client = await CollabClient.connect({
    documentId: whiteboard.documentId,
    type: 'whiteboard',
    authorization: user ? bearerFor(user) : undefined,
    label,
  });
  open.push(client);
  return client;
};

/** One rectangle, stored the way the editor binding stores it: a per-property Y.Map. */
const seedRectangle = (doc: Y.Doc, id: string): void => {
  doc.transact(() => {
    const element = new Y.Map<unknown>();
    element.set('id', id);
    element.set('type', 'rectangle');
    element.set('x', 10);
    element.set('y', 20);
    element.set('width', 100);
    element.set('height', 50);
    element.set('strokeColor', '#000000');
    element.set('backgroundColor', 'transparent');
    doc.getMap<Y.Map<unknown>>('elements').set(id, element);
  });
};

const element = (doc: Y.Doc, id: string): Y.Map<unknown> | undefined =>
  doc.getMap<Y.Map<unknown>>('elements').get(id);

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(
    collaborationScenario(`collab-wb-${uniqueId}`)
  );
  whiteboard = await createWhiteboardFraming(
    baseScenario.space.collaboration.calloutsSetId,
    `Collab whiteboard ${uniqueId}`
  );
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(client => client.close().catch(() => undefined)));
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('admission', () => {
  test('a Space admin is admitted with write access, and admission precedes sync', async () => {
    const admin = await connectAs(TestUser.SPACE_ADMIN, 'space-admin');
    expect(admin.controls[0]?.kind).toBe('admission');
    expect(admin.admission?.mode).toBe('write');
    expect(admin.hasSynced).toBe(true);
  });

  test('a user outside the private Space is not admitted to the room', async () => {
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
    expect(outcome).toBeInstanceOf(Error);
    if (outcome instanceof HandshakeRefusedError) {
      expect([401, 403]).toContain(outcome.status);
    }
  });
});

describe('sync and merge', () => {
  test('an element drawn by A converges into B', async () => {
    // Regression: sync updates not relayed for whiteboard rooms.
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    const b = await connectAs(TestUser.SPACE_MEMBER, 'B');
    const id = `rect-${uniqueId}-${Date.now()}`;

    seedRectangle(a.doc, id);

    await b.waitFor(() => element(b.doc, id) !== undefined, 'A\'s rectangle to reach B');
    expect(element(b.doc, id)?.get('type')).toBe('rectangle');
  });

  test('concurrent edits to DIFFERENT properties of the same element both survive on both sides', async () => {
    // Regression: the service (or a future binding) collapsing an element to a
    // single value, so the later writer silently erases the other's change.
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    const b = await connectAs(TestUser.SPACE_MEMBER, 'B');
    const id = `merge-${uniqueId}-${Date.now()}`;
    seedRectangle(a.doc, id);
    await b.waitFor(() => element(b.doc, id) !== undefined, 'the rectangle to reach B');

    // Issued back to back, before either side has seen the other's update.
    a.doc.transact(() => element(a.doc, id)!.set('x', 999));
    b.doc.transact(() => element(b.doc, id)!.set('strokeColor', '#ff0000'));

    const merged = (doc: Y.Doc) => {
      const el = element(doc, id);
      return !!el && el.get('x') === 999 && el.get('strokeColor') === '#ff0000';
    };
    await a.waitFor(() => merged(a.doc), "B's strokeColor to land on A");
    await b.waitFor(() => merged(b.doc), "A's x to land on B");

    for (const doc of [a.doc, b.doc]) {
      const el = element(doc, id)!;
      expect(el.get('x')).toBe(999);
      expect(el.get('strokeColor')).toBe('#ff0000');
      // Untouched properties are intact.
      expect(el.get('type')).toBe('rectangle');
      expect(el.get('height')).toBe(50);
    }
  });

  test('concurrent edits to the SAME property converge to one value on both sides', async () => {
    // Regression: divergence — two editors left looking at different documents.
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    const b = await connectAs(TestUser.SPACE_MEMBER, 'B');
    const id = `conflict-${uniqueId}-${Date.now()}`;
    seedRectangle(a.doc, id);
    await b.waitFor(() => element(b.doc, id) !== undefined, 'the rectangle to reach B');

    a.doc.transact(() => element(a.doc, id)!.set('y', 111));
    b.doc.transact(() => element(b.doc, id)!.set('y', 222));

    await a.waitFor(() => element(a.doc, id)!.get('y') === element(b.doc, id)!.get('y'), 'A and B to agree on y');
    const agreed = element(a.doc, id)!.get('y');
    expect([111, 222]).toContain(agreed);
    expect(element(b.doc, id)!.get('y')).toBe(agreed);
  });

  test("A's presence is visible to B", async () => {
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    const b = await connectAs(TestUser.SPACE_MEMBER, 'B');
    a.awareness.setLocalState({ user: { name: `collab-wb-A-${uniqueId}` } });
    await b.waitFor(
      () => [...b.awareness.getStates().values()].some(s => s?.user?.name === `collab-wb-A-${uniqueId}`),
      "A's awareness state to reach B"
    );
    expect(b.awareness.getStates().size).toBeGreaterThanOrEqual(2);
  });
});

describe('durability', () => {
  test('a durability request is answered `persisted` for the requesting edit', async () => {
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    seedRectangle(a.doc, `durable-${uniqueId}`);
    const persisted = await a.requestDurability();
    expect(persisted.kind).toBe('persisted');
  });

  test('a cold client rehydrates the merged element after the room was released', async () => {
    const id = `rehydrate-${uniqueId}`;
    const a = await connectAs(TestUser.SPACE_ADMIN, 'A');
    seedRectangle(a.doc, id);
    a.doc.transact(() => {
      element(a.doc, id)!.set('x', 999);
      element(a.doc, id)!.set('strokeColor', '#ff0000');
    });
    await a.requestDurability();
    await a.close();
    open.splice(open.indexOf(a), 1);

    // Positive settle window: the room must be RELEASED (service idle timeout)
    // for the next client to be served from the snapshot, not from memory.
    await settle(ROOM_IDLE_RELEASE_MS);

    const cold = await connectAs(TestUser.SPACE_MEMBER, 'cold');
    const el = element(cold.doc, id);
    expect(el, 'persisted element present after cold start').toBeDefined();
    expect(el!.get('x')).toBe(999);
    expect(el!.get('strokeColor')).toBe('#ff0000');
  });
});
