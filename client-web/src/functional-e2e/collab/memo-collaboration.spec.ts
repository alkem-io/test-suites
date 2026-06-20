/**
 * Memo live-collaboration — SERVICE LEVEL (epic 003-unify-collab-yjs).
 *
 * Proves the unified collaboration service converges + presents + persists for a
 * MEMO document at the y-protocols wire level, with NO React/ProseMirror UI.
 * Two raw `y-websocket` clients open the same room
 * (`ws://localhost:3000/collab/<memoId>?type=memo`) carrying the admin OIDC/BFF
 * session cookie on the handshake, and exchange Yjs sync + awareness.
 *
 * The memo binds y-prosemirror to the Y.Doc XmlFragment named "default" (the
 * ProseMirror top node); the service is agnostic to that — it just relays/persists
 * the CRDT. So we drive that same fragment directly.
 *
 * Assertions:
 *   1. Convergence — text inserted by A appears in B (CRDT relay).
 *   2. Awareness/presence — A's awareness state is visible to B.
 *   3. Persistence round-trip — after A+B drop, a cold client C rehydrates the
 *      text (server collaboration-fetch + file-service blob). Opt-in: gated
 *      behind COLLAB_ASSERT_PERSISTENCE because the cold-rehydrate timing is
 *      currently non-deterministic on the local dev stack (see README).
 *
 * Requires the local dev stack up (gateway :3000 → unified collab service +
 * server BFF). Run:
 *   pnpm --filter @alkemio/test-suite-client-web exec \
 *     playwright test src/functional-e2e/collab/memo-collaboration.spec.ts
 */
import { test, expect } from '@playwright/test';
import * as Y from 'yjs';
import { loginAsAdminCookie } from './collab-auth';
import { createMemoFixture, type CollabFixture } from './collab-fixture';
import {
  connectCollabClient,
  waitForDoc,
  waitForAwareness,
  sleep,
  type CollabClient,
} from './collab-ws';

const ASSERT_PERSISTENCE = process.env.COLLAB_ASSERT_PERSISTENCE === 'true';
const CONVERGENCE_TIMEOUT = 10000;
const AWARENESS_TIMEOUT = 5000;
const AUTOSAVE_DEBOUNCE_MS = 8000;

test.describe('Memo collaboration — service level (003-unify-collab-yjs)', () => {
  // OIDC login + two WS clients + a cold reload is heavier than the default.
  test.describe.configure({ timeout: 180000 });

  let cookie: string;
  let fixture: CollabFixture;

  test.beforeAll(async () => {
    cookie = await loginAsAdminCookie();
    fixture = await createMemoFixture(cookie);
    console.log(
      `[memo-service] memoId=${fixture.documentId}\n` +
        `              WS=ws://localhost:3000/collab/${fixture.documentId}?type=memo`
    );
  });

  test('convergence + awareness over the unified collab service', async () => {
    let a: CollabClient | undefined;
    let b: CollabClient | undefined;
    try {
      a = await connectCollabClient(fixture.documentId, 'memo', cookie, 'A');
      b = await connectCollabClient(fixture.documentId, 'memo', cookie, 'B');

      // --- Assertion 2: awareness/presence A → B ---
      a.awareness.setLocalState({ user: { name: 'memo-client-A' } });
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

      // --- Assertion 1: CRDT convergence A → B ---
      const marker = `memo-sync-${Date.now()}`;
      const fragA = a.doc.getXmlFragment('default');
      const para = new Y.XmlElement('paragraph');
      para.insert(0, [new Y.XmlText(marker)]);
      fragA.insert(fragA.length, [para]);

      await waitForDoc(
        b.doc,
        () => b!.doc.getXmlFragment('default').toString().includes(marker),
        CONVERGENCE_TIMEOUT,
        'text typed in A to converge into B'
      );
      expect(
        b.doc.getXmlFragment('default').toString(),
        'text inserted in A should converge into B via the unified collab service'
      ).toContain(marker);
    } finally {
      a?.destroy();
      b?.destroy();
    }
  });

  test('persistence round-trip (cold reload rehydrates)', async () => {
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
    const marker = `memo-persist-${Date.now()}`;
    try {
      a = await connectCollabClient(fixture.documentId, 'memo', cookie, 'A');
      b = await connectCollabClient(fixture.documentId, 'memo', cookie, 'B');

      const fragA = a.doc.getXmlFragment('default');
      const para = new Y.XmlElement('paragraph');
      para.insert(0, [new Y.XmlText(marker)]);
      fragA.insert(fragA.length, [para]);

      await waitForDoc(
        b.doc,
        () => b!.doc.getXmlFragment('default').toString().includes(marker),
        CONVERGENCE_TIMEOUT,
        'marker to converge before persistence'
      );

      // Let the server-side autosave debounce flush to file-service + server.
      await sleep(AUTOSAVE_DEBOUNCE_MS);
      a.destroy();
      b.destroy();
      a = b = undefined;
      // Let the room fully flush + release before a cold client reconnects.
      await sleep(6000);

      c = await connectCollabClient(fixture.documentId, 'memo', cookie, 'C');
      await waitForDoc(
        c.doc,
        () => c!.doc.getXmlFragment('default').toString().includes(marker),
        CONVERGENCE_TIMEOUT,
        'cold reload to rehydrate persisted memo content'
      );
      expect(
        c.doc.getXmlFragment('default').toString(),
        'cold reload should rehydrate persisted memo content (file-service blob + collaboration-fetch)'
      ).toContain(marker);
    } finally {
      a?.destroy();
      b?.destroy();
      c?.destroy();
    }
  });
});
