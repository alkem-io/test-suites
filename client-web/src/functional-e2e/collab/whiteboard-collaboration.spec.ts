/**
 * Whiteboard live-collaboration — SERVICE LEVEL (epic 003-unify-collab-yjs).
 *
 * Mirrors the memo service-level spec for a WHITEBOARD document, with NO
 * Excalidraw UI and WITHOUT importing the @alkemio/excalidraw-yjs-binding — it
 * tests the WS/CRDT layer, not the binding. Two raw `y-websocket` clients open
 * the same room (`ws://localhost:3000/collab/<whiteboardId>?type=whiteboard`)
 * carrying the admin OIDC/BFF session cookie on the handshake.
 *
 * Yjs scene schema (the convention the binding writes and the service relays):
 *   - top-level Y.Map "elements" — keyed by element id → a nested per-property
 *     Y.Map ({ id, type, x, y, width, strokeColor, backgroundColor, ... })
 *   - top-level Y.Map "files"
 *   - top-level Y.Map "appState"
 *
 * The PER-PROPERTY nested Y.Map is the whole point: two clients editing
 * DIFFERENT properties of the SAME element merge field-by-field — both survive,
 * NOT last-write-wins. That is the headline correctness win of the epic and is
 * impossible with a coarse "serialize the whole scene" approach.
 *
 * Assertions:
 *   1. Convergence — an element seeded by A appears in B.
 *   2. PER-PROPERTY MERGE (headline) — A sets element.x, B sets the SAME
 *      element's strokeColor concurrently → BOTH properties survive on BOTH
 *      clients (NOT last-write-wins).
 *   3. Awareness/presence — A's awareness state is visible to B.
 *   4. Persistence round-trip — cold client C rehydrates the merged element.
 *      Opt-in: gated behind COLLAB_ASSERT_PERSISTENCE (cold-rehydrate timing is
 *      currently non-deterministic on the local dev stack — see README).
 *
 * Requires the local dev stack up (gateway :3000 → unified collab service +
 * server BFF). Run:
 *   pnpm --filter @alkemio/test-suite-client-web exec \
 *     playwright test src/functional-e2e/collab/whiteboard-collaboration.spec.ts
 */
import { test, expect } from '@playwright/test';
import * as Y from 'yjs';
import { loginAsAdminCookie } from './collab-auth';
import { createWhiteboardFixture, type CollabFixture } from './collab-fixture';
import {
  connectCollabClient,
  waitForDoc,
  waitForAwareness,
  sleep,
  type CollabClient,
} from './collab-ws';

const ASSERT_PERSISTENCE = process.env.COLLAB_ASSERT_PERSISTENCE === 'true';
const CONVERGENCE_TIMEOUT = 10000;
const MERGE_TIMEOUT = 10000;
const AWARENESS_TIMEOUT = 5000;
const AUTOSAVE_DEBOUNCE_MS = 8000;

/** Seeds one rectangle element into the "elements" Y.Map as a per-property Y.Map. */
function seedElement(doc: Y.Doc, id: string): void {
  const elements = doc.getMap<Y.Map<unknown>>('elements');
  doc.transact(() => {
    const el = new Y.Map<unknown>();
    el.set('id', id);
    el.set('type', 'rectangle');
    el.set('x', 10);
    el.set('y', 20);
    el.set('width', 100);
    el.set('height', 50);
    el.set('strokeColor', '#000000');
    el.set('backgroundColor', 'transparent');
    elements.set(id, el);
  });
}

function getElement(doc: Y.Doc, id: string): Y.Map<unknown> | undefined {
  return doc.getMap<Y.Map<unknown>>('elements').get(id);
}

test.describe('Whiteboard collaboration — service level (003-unify-collab-yjs)', () => {
  test.describe.configure({ timeout: 180000 });

  let cookie: string;
  let fixture: CollabFixture;

  test.beforeAll(async () => {
    cookie = await loginAsAdminCookie();
    fixture = await createWhiteboardFixture(cookie);
    console.log(
      `[wb-service] whiteboardId=${fixture.documentId}\n` +
        `             WS=ws://localhost:3000/collab/${fixture.documentId}?type=whiteboard`
    );
  });

  test('convergence + per-property merge + awareness over the unified collab service', async () => {
    let a: CollabClient | undefined;
    let b: CollabClient | undefined;
    try {
      a = await connectCollabClient(fixture.documentId, 'whiteboard', cookie, 'A');
      b = await connectCollabClient(fixture.documentId, 'whiteboard', cookie, 'B');

      // --- Assertion 3: awareness/presence A → B ---
      a.awareness.setLocalState({ user: { name: 'wb-client-A' } });
      await waitForAwareness(
        b.awareness,
        () => b!.awareness.getStates().size >= 2,
        AWARENESS_TIMEOUT,
        'A presence visible to B'
      );
      expect(
        b.awareness.getStates().size,
        'B should see A in the awareness/presence map'
      ).toBeGreaterThanOrEqual(2);

      // --- Assertion 1: convergence — A seeds an element, B sees it ---
      const elId = `wb-el-${Date.now()}`;
      seedElement(a.doc, elId);
      await waitForDoc(
        b.doc,
        () => getElement(b!.doc, elId) !== undefined,
        CONVERGENCE_TIMEOUT,
        'element seeded by A to converge into B'
      );
      const elB = getElement(b.doc, elId);
      expect(elB, 'element seeded by A should converge into B').toBeDefined();

      // --- Assertion 2: PER-PROPERTY MERGE (headline) ---
      // A and B concurrently edit DIFFERENT properties of the SAME element.
      a.doc.transact(() => {
        getElement(a!.doc, elId)!.set('x', 999);
      });
      b.doc.transact(() => {
        elB!.set('strokeColor', '#ff0000');
      });

      // Both edits must survive on BOTH clients — NOT last-write-wins.
      const merged = (doc: Y.Doc) => {
        const el = getElement(doc, elId);
        return !!el && el.get('x') === 999 && el.get('strokeColor') === '#ff0000';
      };
      await waitForDoc(a.doc, () => merged(a!.doc), MERGE_TIMEOUT, 'A to hold both merged properties');
      await waitForDoc(b.doc, () => merged(b!.doc), MERGE_TIMEOUT, 'B to hold both merged properties');

      const finalA = getElement(a.doc, elId)!;
      const finalB = getElement(b.doc, elId)!;
      // A's own property survived A's view AND B's concurrent edit landed on A.
      expect(finalA.get('x'), "A's x edit must survive").toBe(999);
      expect(finalA.get('strokeColor'), "B's concurrent strokeColor edit must survive on A (per-property merge, not last-write-wins)").toBe('#ff0000');
      // ...and symmetrically on B.
      expect(finalB.get('x'), "A's concurrent x edit must survive on B (per-property merge, not last-write-wins)").toBe(999);
      expect(finalB.get('strokeColor'), "B's strokeColor edit must survive").toBe('#ff0000');
      // Untouched properties remain intact.
      expect(finalA.get('type'), 'untouched property must remain').toBe('rectangle');
      expect(finalB.get('height'), 'untouched property must remain').toBe(50);
    } finally {
      a?.destroy();
      b?.destroy();
    }
  });

  test('persistence round-trip (cold reload rehydrates merged element)', async () => {
    test.skip(
      !ASSERT_PERSISTENCE,
      'Persistence cold-rehydrate is currently non-deterministic on the local ' +
        'dev stack (the unified collab room sometimes closes 1006 before the ' +
        'blob/collaboration-fetch flush completes). Set COLLAB_ASSERT_PERSISTENCE=true ' +
        'to enforce once the persistence path is reliable.'
    );

    let a: CollabClient | undefined;
    let b: CollabClient | undefined;
    let c: CollabClient | undefined;
    const elId = `wb-persist-${Date.now()}`;
    try {
      a = await connectCollabClient(fixture.documentId, 'whiteboard', cookie, 'A');
      b = await connectCollabClient(fixture.documentId, 'whiteboard', cookie, 'B');

      seedElement(a.doc, elId);
      await waitForDoc(
        b.doc,
        () => getElement(b!.doc, elId) !== undefined,
        CONVERGENCE_TIMEOUT,
        'element to converge before merge'
      );
      a.doc.transact(() => getElement(a!.doc, elId)!.set('x', 999));
      b.doc.transact(() => getElement(b!.doc, elId)!.set('strokeColor', '#ff0000'));

      const merged = (doc: Y.Doc) => {
        const el = getElement(doc, elId);
        return !!el && el.get('x') === 999 && el.get('strokeColor') === '#ff0000';
      };
      await waitForDoc(a.doc, () => merged(a!.doc), MERGE_TIMEOUT, 'A merge before persistence');

      await sleep(AUTOSAVE_DEBOUNCE_MS);
      a.destroy();
      b.destroy();
      a = b = undefined;
      await sleep(6000);

      c = await connectCollabClient(fixture.documentId, 'whiteboard', cookie, 'C');
      await waitForDoc(
        c.doc,
        () => merged(c!.doc),
        CONVERGENCE_TIMEOUT,
        'cold reload to rehydrate the persisted merged element'
      );
      const finalC = getElement(c.doc, elId)!;
      expect(finalC.get('x'), 'persisted x').toBe(999);
      expect(finalC.get('strokeColor'), 'persisted merged strokeColor').toBe('#ff0000');
    } finally {
      a?.destroy();
      b?.destroy();
      c?.destroy();
    }
  });
});
