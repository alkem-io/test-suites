/**
 * A raw-WebSocket client for the unified collaboration service
 * (`alkem-io/collaboration-service`, epic 003-unify-collab-yjs), speaking the
 * wire protocol the production SPA speaks in
 * `client-web/src/domain/collaboration/realTimeCollaboration/unifiedCollabProvider.ts`:
 *
 *   [type VarUint][payload]
 *     0 SYNC                y-protocols sync (SyncStep1 / SyncStep2 / Update)
 *     1 AWARENESS           y-protocols awareness update
 *     2 EPHEMERAL           volatile whiteboard events — ignored here
 *     3 CONTROL             server → client JSON: admission, persisted,
 *                           persist-failed, saved, session-end, …
 *     4 DURABILITY_REQUEST  client → server JSON `{ requestId }`; answered by
 *                           exactly one `persisted` / `persist-failed` control
 *     5 HEARTBEAT           echoed to the sender — ignored here
 *
 * Session order, as the SPA implements it: the service's FIRST frame is the
 * `admission` control naming the immutable read/write capability; only then
 * does the client send SyncStep1 and the Yjs handshake completes.
 *
 * Authentication is the harness bearer token on the HTTP upgrade. On a cluster
 * Traefik's `alkemio-identity` chain resolves it through the server's
 * `/rest/internal/forward-auth` (cookie → Hydra bearer → non-interactive-login
 * bearer → anonymous) and stamps `X-Alkemio-Actor-Id`, which is the only
 * credential the service trusts (`AUTH_MODE=header`). No browser is involved.
 */
import WebSocket from 'ws';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { testConfiguration, TestUser, TestUserManager } from '@alkemio/tests-lib';

export const WIRE = {
  SYNC: 0,
  AWARENESS: 1,
  EPHEMERAL: 2,
  CONTROL: 3,
  DURABILITY_REQUEST: 4,
  HEARTBEAT: 5,
} as const;

export type ContentType = 'memo' | 'whiteboard';

export type ControlMessage = {
  kind: string;
  requestId?: string;
  mode?: string;
  reason?: string;
  error?: string;
  code?: string;
  scope?: string;
  disposition?: string;
  version?: number;
  users?: number;
};

export type CloseInfo = { code: number; reason: string };

/** The upgrade was answered with something other than 101. */
export class HandshakeRefusedError extends Error {
  constructor(public readonly status: number) {
    super(`collaboration handshake refused with HTTP ${status}`);
    this.name = 'HandshakeRefusedError';
  }
}

/** `wss://<ALKEMIO_BASE_URL>/collab/<documentId>?type=<memo|whiteboard>` — the URL the SPA builds. */
export const collabUrl = (documentId: string, type: ContentType): string => {
  const base = testConfiguration.endPoints.server.replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/collab/${encodeURIComponent(documentId)}?type=${type}`;
};

/** The harness user's bearer, minted by `TestScenarioFactory` through non-interactive-login. */
export const bearerFor = (user: TestUser): string => {
  const token = TestUserManager.getUserModelByType(user).authToken;
  if (!token) {
    throw new Error(`no bearer token for ${user}: create the scenario before connecting`);
  }
  return `Bearer ${token}`;
};

export type ConnectOptions = {
  documentId: string;
  type: ContentType;
  /** `Authorization` header value; omit for an anonymous handshake. */
  authorization?: string;
  /** Resolve once the initial SyncStep2 has been applied (default true). */
  waitForSync?: boolean;
  /** Budget for admission + initial sync; generous for a shared cluster. */
  timeoutMs?: number;
  /** Shows up in failure messages. */
  label?: string;
};

const DEFAULT_CONNECT_TIMEOUT_MS = 30_000;

/**
 * One connected collaborator. Edits made on `doc` are sent as sync updates,
 * `awareness.setLocalState(...)` is broadcast, and `requestDurability()` is the
 * barrier the SPA uses to know its edits reached BOTH stores.
 */
export class CollabClient {
  readonly doc = new Y.Doc();
  readonly awareness = new Awareness(this.doc);
  /** Every control frame received, in order. */
  readonly controls: ControlMessage[] = [];
  /** Resolves when the socket closes, however that happens. */
  readonly closed: Promise<CloseInfo>;
  /** Resolves after the first SyncStep2 was applied. */
  readonly synced: Promise<void>;

  private ws!: WebSocket;
  private resolveSynced!: () => void;
  private resolveClosed!: (info: CloseInfo) => void;
  private isSynced = false;
  private durabilitySequence = 0;
  private readonly pendingDurability = new Map<
    string,
    { resolve: (m: ControlMessage) => void; reject: (e: Error) => void }
  >();
  private readonly label: string;

  private constructor(label: string) {
    this.label = label;
    this.synced = new Promise<void>(resolve => (this.resolveSynced = resolve));
    this.closed = new Promise<CloseInfo>(resolve => (this.resolveClosed = resolve));
  }

  /** The admission control, or undefined if the service never sent one. */
  get admission(): ControlMessage | undefined {
    return this.controls.find(c => c.kind === 'admission');
  }

  get hasSynced(): boolean {
    return this.isSynced;
  }

  static connect(options: ConnectOptions): Promise<CollabClient> {
    const label = options.label ?? 'client';
    const client = new CollabClient(label);
    const timeoutMs = options.timeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    const waitForSync = options.waitForSync ?? true;

    return new Promise<CollabClient>((resolve, reject) => {
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        client.destroy();
        reject(error);
      };
      const succeed = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(client);
      };
      const timer = setTimeout(() => {
        const stage = client.admission
          ? client.isSynced
            ? 'synced'
            : `admitted (${client.admission.mode}) but never received SyncStep2`
          : 'never received the admission control';
        fail(new Error(`${label}: ${stage} within ${timeoutMs} ms`));
      }, timeoutMs);

      const ws = new WebSocket(collabUrl(options.documentId, options.type), {
        headers: options.authorization ? { authorization: options.authorization } : {},
        perMessageDeflate: false,
      });
      client.ws = ws;
      ws.binaryType = 'arraybuffer';

      ws.on('unexpected-response', (_req, res) => {
        fail(new HandshakeRefusedError(res.statusCode ?? 0));
      });
      ws.on('error', error => fail(error instanceof Error ? error : new Error(String(error))));
      ws.on('close', (code, reason) => {
        const info = { code, reason: reason.toString() };
        client.resolveClosed(info);
        for (const [id, pending] of client.pendingDurability) {
          pending.reject(new Error(`${label}: socket closed (${code} ${info.reason}) before durability request ${id} was answered`));
        }
        client.pendingDurability.clear();
        if (!settled) fail(new Error(`${label}: socket closed before admission/sync (${code} ${info.reason})`));
      });
      ws.on('message', data => {
        try {
          client.handleFrame(new Uint8Array(data as ArrayBuffer));
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        if (client.admission && (!waitForSync || client.isSynced)) succeed();
      });

      client.doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin === client) return;
        client.send(WIRE.SYNC, encoder => syncProtocol.writeUpdate(encoder, update));
      });
      client.awareness.on(
        'update',
        ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
          if (origin === client) return;
          client.broadcastAwareness([...added, ...updated, ...removed]);
        }
      );
    });
  }

  /**
   * Asks the service to confirm the document state that includes this client's
   * preceding edits is durable in both configured stores. Resolves with the
   * `persisted` control; rejects on `persist-failed`, close, or timeout.
   */
  requestDurability(timeoutMs = 60_000): Promise<ControlMessage> {
    const requestId = `${Date.now().toString(36)}-${(++this.durabilitySequence).toString(36)}`;
    return new Promise<ControlMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingDurability.delete(requestId);
        reject(new Error(`${this.label}: durability request ${requestId} unanswered after ${timeoutMs} ms`));
      }, timeoutMs);
      this.pendingDurability.set(requestId, {
        resolve: message => {
          clearTimeout(timer);
          resolve(message);
        },
        reject: error => {
          clearTimeout(timer);
          reject(error);
        },
      });
      const body = new TextEncoder().encode(JSON.stringify({ requestId }));
      // The body is the raw tail of the frame (no length prefix), as the SPA sends it.
      this.send(WIRE.DURABILITY_REQUEST, encoder => encoding.writeUint8Array(encoder, body));
    });
  }

  /** Resolves when `predicate()` holds; re-evaluated on every doc update and awareness change. */
  waitFor(predicate: () => boolean, what: string, timeoutMs = 15_000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const check = () => {
        if (!predicate()) return;
        cleanup();
        resolve();
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`${this.label}: timed out after ${timeoutMs} ms waiting for ${what}`));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        this.doc.off('update', check);
        this.awareness.off('change', check);
      };
      this.doc.on('update', check);
      this.awareness.on('change', check);
      check();
    });
  }

  /** Graceful close; resolves with the close code the socket ended on. */
  async close(): Promise<CloseInfo> {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(1000, 'test-done');
    }
    const info = await this.closed;
    this.destroy();
    return info;
  }

  private destroy(): void {
    try {
      this.awareness.destroy();
      this.doc.destroy();
    } catch {
      // already destroyed
    }
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.terminate();
    }
  }

  private handleFrame(bytes: Uint8Array): void {
    const decoder = decoding.createDecoder(bytes);
    const type = decoding.readVarUint(decoder);
    switch (type) {
      case WIRE.CONTROL: {
        const message = JSON.parse(
          new TextDecoder().decode(decoding.readTailAsUint8Array(decoder))
        ) as ControlMessage;
        this.controls.push(message);
        this.handleControl(message);
        return;
      }
      case WIRE.SYNC: {
        if (!this.admission) {
          throw new Error(`${this.label}: received a sync frame before the admission control`);
        }
        const reply = encoding.createEncoder();
        encoding.writeVarUint(reply, WIRE.SYNC);
        const syncType = syncProtocol.readSyncMessage(decoder, reply, this.doc, this);
        // readSyncMessage answers SyncStep1 with SyncStep2 in `reply`; forward it.
        if (encoding.length(reply) > 1) this.sendRaw(encoding.toUint8Array(reply));
        if (syncType === syncProtocol.messageYjsSyncStep2 && !this.isSynced) {
          this.isSynced = true;
          this.resolveSynced();
        }
        return;
      }
      case WIRE.AWARENESS:
        applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), this);
        return;
      case WIRE.EPHEMERAL:
      case WIRE.HEARTBEAT:
        return;
      default:
        throw new Error(`${this.label}: unknown wire type ${type}`);
    }
  }

  private handleControl(message: ControlMessage): void {
    switch (message.kind) {
      case 'admission':
        // Mirror the SPA: the Yjs handshake starts only once the capability is known.
        this.send(WIRE.SYNC, encoder => syncProtocol.writeSyncStep1(encoder, this.doc));
        if (this.awareness.getLocalState() !== null) this.broadcastAwareness([this.doc.clientID]);
        return;
      case 'persisted': {
        const pending = message.requestId ? this.pendingDurability.get(message.requestId) : undefined;
        if (!pending || !message.requestId) return;
        this.pendingDurability.delete(message.requestId);
        pending.resolve(message);
        return;
      }
      case 'persist-failed': {
        const pending = message.requestId ? this.pendingDurability.get(message.requestId) : undefined;
        if (!pending || !message.requestId) return;
        this.pendingDurability.delete(message.requestId);
        pending.reject(new Error(`${this.label}: persist-failed for ${message.requestId}: ${message.error ?? 'no error given'}`));
        return;
      }
      default:
        return;
    }
  }

  private broadcastAwareness(clients: number[]): void {
    this.send(WIRE.AWARENESS, encoder =>
      encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, clients))
    );
  }

  private send(type: number, write: (encoder: encoding.Encoder) => void): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, type);
    write(encoder);
    this.sendRaw(encoding.toUint8Array(encoder));
  }

  private sendRaw(frame: Uint8Array): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(frame);
  }
}

/** Memo content as the editor would see it: the text of the `default` fragment. */
export const memoText = (doc: Y.Doc): string => doc.getXmlFragment('default').toString();

/** Appends one paragraph to a memo, the way y-prosemirror stores a typed line. */
export const appendMemoParagraph = (doc: Y.Doc, text: string): void => {
  const fragment = doc.getXmlFragment('default');
  const paragraph = new Y.XmlElement('paragraph');
  paragraph.insert(0, [new Y.XmlText(text)]);
  fragment.insert(fragment.length, [paragraph]);
};
