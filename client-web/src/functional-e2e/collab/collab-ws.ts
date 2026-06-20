/**
 * Raw-WebSocket Yjs client helpers for the unified collaboration service-level
 * e2e (epic 003-unify-collab-yjs).
 *
 * Each "client" is a `y-websocket` WebsocketProvider driving a Y.Doc straight at
 * the unified collaboration service over the canonical y-protocols envelope
 * (byte 0 sync / byte 1 awareness / byte 2 ephemeral / byte 3 control — see
 * `UnifiedCollabProvider.ts` / epic contracts/ws-protocol.md). The Alkemio
 * `alkemio_session` cookie rides the handshake via the `ws` `Cookie` header, so
 * Traefik's forwardAuth resolves the actor exactly as it does for the browser.
 *
 * No browser, no editor binding — this is the protocol/backend layer.
 */
import WebSocket from 'ws';
import { WebsocketProvider } from 'y-websocket';
import type { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { BASE_URL, WS_BASE } from './collab-auth';

export interface CollabClient {
  readonly doc: Y.Doc;
  readonly provider: WebsocketProvider;
  readonly awareness: Awareness;
  destroy(): void;
}

const SYNC_TIMEOUT_MS = 15000;

/**
 * Connects a fresh Yjs client to `<WS_BASE>/<documentId>?type=<type>` carrying
 * `cookie` on the WS handshake, and resolves once the provider reports `synced`
 * (initial server state applied).
 */
export function connectCollabClient(
  documentId: string,
  type: 'memo' | 'whiteboard',
  cookie: string,
  label = 'client'
): Promise<CollabClient> {
  // y-websocket appends `/<roomname>` to the base URL and the params as a query
  // string → `<WS_BASE>/<documentId>?type=<type>`. The cookie/origin ride the
  // handshake via the `ws` options (browsers do this implicitly, same-origin).
  // `ws` is structurally a WebSocket but its TS types omit some DOM members, so
  // cast through `unknown` to the constructor shape y-websocket expects.
  const WebSocketPolyfill = class extends WebSocket {
    constructor(address: string, protocols?: string | string[]) {
      super(address, protocols, {
        headers: { cookie, origin: BASE_URL },
      });
    }
  } as unknown as typeof globalThis.WebSocket;

  const doc = new Y.Doc();
  return new Promise<CollabClient>((resolve, reject) => {
    const provider = new WebsocketProvider(WS_BASE, documentId, doc, {
      params: { type },
      WebSocketPolyfill,
      // The unified service is the single source of truth; no cross-tab channel.
      disableBc: true,
      connect: true,
    });

    const timer = setTimeout(() => {
      provider.destroy();
      reject(new Error(`${label}: did not sync within ${SYNC_TIMEOUT_MS}ms`));
    }, SYNC_TIMEOUT_MS);

    // y-websocket@3 emits 'sync' (boolean) when the initial server state applied.
    provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        clearTimeout(timer);
        resolve({
          doc,
          provider,
          awareness: provider.awareness,
          destroy: () => provider.destroy(),
        });
      }
    });
  });
}

/** Resolves once `predicate()` is true, polled on the doc, or rejects on timeout. */
export function waitForDoc(
  doc: Y.Doc,
  predicate: () => boolean,
  timeoutMs = 8000,
  what = 'condition'
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (predicate()) return resolve();
    const onUpdate = () => {
      if (predicate()) {
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`waitForDoc timed out waiting for ${what}`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      doc.off('update', onUpdate);
    };
    doc.on('update', onUpdate);
  });
}

/** Resolves once `predicate()` is true, polled on awareness changes, or rejects. */
export function waitForAwareness(
  awareness: Awareness,
  predicate: () => boolean,
  timeoutMs = 5000,
  what = 'awareness condition'
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (predicate()) return resolve();
    const onChange = () => {
      if (predicate()) {
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`waitForAwareness timed out waiting for ${what}`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      awareness.off('change', onChange);
    };
    awareness.on('change', onChange);
  });
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
