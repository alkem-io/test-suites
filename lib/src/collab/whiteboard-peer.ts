import WebSocket from "ws";
// yjs, y-protocols and lib0 are ESM-first and this package is CommonJS, so the
// value imports are dynamic (`loadYjs`) and only their TYPES are imported here.
import type * as decoding from "lib0/decoding" with { "resolution-mode": "import" };
import type * as encoding from "lib0/encoding" with { "resolution-mode": "import" };
import type * as awarenessProtocol from "y-protocols/awareness" with { "resolution-mode": "import" };
import type * as syncProtocol from "y-protocols/sync" with { "resolution-mode": "import" };
import type * as Y from "yjs" with { "resolution-mode": "import" };
import { testConfiguration } from "../config/test.configuration";
import { GraphqlActor, resolveActor } from "../utils/graphql.actor";

type Awareness = awarenessProtocol.Awareness;
type Runtime = {
  Y: typeof Y;
  encoding: typeof encoding;
  decoding: typeof decoding;
  awarenessProtocol: typeof awarenessProtocol;
  syncProtocol: typeof syncProtocol;
};

let runtime: Runtime | undefined;
// `import()` is kept as a real dynamic import by `module: node16`; a `require`
// of these ESM-first packages is not possible from this CommonJS library.
const loadRuntime = async (): Promise<Runtime> => {
  if (!runtime) {
    const [yjs, enc, dec, awareness, sync] = await Promise.all([
      import("yjs"),
      import("lib0/encoding"),
      import("lib0/decoding"),
      import("y-protocols/awareness"),
      import("y-protocols/sync"),
    ]);
    runtime = {
      Y: yjs,
      encoding: enc,
      decoding: dec,
      awarenessProtocol: awareness,
      syncProtocol: sync,
    };
  }
  return runtime;
};
const rt = (): Runtime => {
  if (!runtime) throw new Error("whiteboard peer runtime not loaded");
  return runtime;
};

/**
 * A Node Yjs peer for the unified collaboration service
 * (`alkem-io/collaboration-service`), speaking the same wire protocol as
 * client-web's `UnifiedCollabProvider`
 * (`src/domain/collaboration/realTimeCollaboration/unifiedCollabProvider.ts`).
 *
 * Why it exists: whiteboard content has no GraphQL or DOM view (`Whiteboard`
 * has no `content` field, canvas pixels are not in the accessibility tree and
 * `window.h` is never installed in client-web), so the only build-agnostic oracle for
 * what is stored in a board is a raw Yjs read. The peer connects as an actor,
 * can hold back inbound updates (to force a concurrent edit), writes raw keys,
 * and reads the raw `elements` map — never through the editor package's
 * defaults.
 */

/** Frame type, the first varUint of every frame (client-web `WIRE`). */
export const COLLAB_WIRE = {
  SYNC: 0,
  AWARENESS: 1,
  EPHEMERAL: 2,
  CONTROL: 3,
  DURABILITY_REQUEST: 4,
  HEARTBEAT: 5,
} as const;

export type WhiteboardPeerAccess = "read" | "write";

/** A raw element: the Y.Map's `toJSON()`, with no defaults applied. */
export type RawElement = Record<string, unknown>;

export type ConnectWhiteboardPeerOptions = {
  /** The whiteboard id; it is the collaboration document id. */
  whiteboardId: string;
  /** Who connects: a persona, a bearer, or a browser session cookie. */
  actor: GraphqlActor;
  /**
   * The Yjs client id. Pin it when the outcome depends on the id order (a
   * concurrent same-key write resolves for the HIGHER id); default random.
   */
  clientId?: number;
  /** Reject unless the service admits the peer with write access. Default true. */
  requireWrite?: boolean;
  /** Document kind in the URL. Default `whiteboard`. */
  type?: "whiteboard" | "memo";
  /** Override the origin the URL and `Origin` header are derived from. */
  baseUrl?: string;
  /** Overrides `VITE_APP_COLLAB_PATH`. Default `/collab`. */
  path?: string;
  /** Budget for dial + admission + initial sync. Default 15 s. */
  connectTimeoutMs?: number;
  /**
   * Idle time before the peer sends a heartbeat, as client-web does. Default
   * 15 s; the self-test shortens it to observe the echo.
   */
  heartbeatIdleMs?: number;
};

export type WaitForOptions = { timeoutMs?: number; intervalMs?: number };

export type AwaitDurableOptions = { timeoutMs?: number };

const PEER_ORIGIN = Symbol("whiteboard-peer-local-write");
const REMOTE_ORIGIN = Symbol("whiteboard-peer-remote");
// client-web `unifiedCollabProvider.ts`: a heartbeat after 15 s idle, and the
// session is dropped if its echo is not back within 10 s.
const HEARTBEAT_IDLE_MS = 15_000;
const HEARTBEAT_REPLY_MS = 10_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 15_000;
const DEFAULT_WAIT_TIMEOUT_MS = 15_000;
const DEFAULT_WAIT_INTERVAL_MS = 50;
const DEFAULT_DURABLE_TIMEOUT_MS = 30_000;
// A write resolves once the frame left the local `ws` buffer (not: reached the
// service). Polled on a timer, never with `setImmediate`, and bounded: far above
// the drain time of one frame on any link the harness uses.
const DRAIN_POLL_MS = 5;
const DRAIN_TIMEOUT_MS = 10_000;

const encodeFrame = (
  kind: number,
  write: (encoder: encoding.Encoder) => void,
): Uint8Array => {
  const { encoding } = rt();
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, kind);
  write(encoder);
  return encoding.toUint8Array(encoder);
};

const collabUrl = (options: ConnectWhiteboardPeerOptions): string => {
  const base = (options.baseUrl ?? testConfiguration.endPoints.server).replace(
    /\/$/,
    "",
  );
  const path = options.path ?? process.env.WHITEBOARD_COLLAB_PATH ?? "/collab";
  const normalised = (path.startsWith("/") ? path : `/${path}`).replace(
    /\/$/,
    "",
  );
  const ws = base.replace(/^http/, "ws");
  const params = new URLSearchParams({ type: options.type ?? "whiteboard" });
  return `${ws}${normalised}/${encodeURIComponent(options.whiteboardId)}?${params.toString()}`;
};

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

const toBytes = (data: WebSocket.RawData): Uint8Array => {
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data));
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
};

export class WhiteboardPeer {
  /** The peer's own replica. Prefer the raw readers below. */
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  readonly clientId: number;
  /** Set once admitted: what the service allowed this actor to do. */
  access: WhiteboardPeerAccess | undefined;
  /** The service's reason when admitted read-only (e.g. `multi-user-not-allowed`). */
  accessReason: string | undefined;
  /** Why the session ended, once it has. */
  endedReason: string | undefined;
  /** Heartbeats the service echoed back (the liveness round trip). */
  heartbeatsEchoed = 0;

  private readonly ws: WebSocket;
  private ready = false;
  /** The socket is gone (closed by either side); no more writes. */
  private closed = false;
  /** `close()` ran: awareness and doc destroyed. Independent of `closed`. */
  private destroyed = false;
  private held = false;
  private queued: Uint8Array[] = [];
  private heartbeatTimer: NodeJS.Timeout | undefined;
  /** The heartbeat sent and not echoed yet; at most one at a time. */
  private heartbeatFrame: Uint8Array | undefined;
  private heartbeatSequence = 0;
  /** The durability request sent and not answered yet; the service refuses a second one. */
  private durability:
    | {
        requestId: string;
        resolve: () => void;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
      }
    | undefined;
  private durabilitySequence = 0;
  private settleConnect:
    | { resolve: () => void; reject: (error: Error) => void }
    | undefined;
  private readonly onDocUpdate: (update: Uint8Array, origin: unknown) => void;

  /** @internal use `connectWhiteboardPeer`. */
  constructor(
    private readonly options: ConnectWhiteboardPeerOptions,
    ws: WebSocket,
  ) {
    this.ws = ws;
    const { Y, awarenessProtocol } = rt();
    this.doc = new Y.Doc();
    if (options.clientId !== undefined) this.doc.clientID = options.clientId;
    this.clientId = this.doc.clientID;
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.onDocUpdate = (update, origin) => {
      if (origin === PEER_ORIGIN) {
        this.send(
          encodeFrame(COLLAB_WIRE.SYNC, (e) =>
            rt().syncProtocol.writeUpdate(e, update),
          ),
        );
      }
    };
    this.doc.on("update", this.onDocUpdate);
  }

  /** @internal resolves once admission and the initial sync completed. */
  attachConnect(settle: {
    resolve: () => void;
    reject: (error: Error) => void;
  }): void {
    this.settleConnect = settle;
    this.ws.on("message", (data) => this.handleMessage(toBytes(data)));
    this.ws.on("close", (code, reason) => this.handleClose(code, reason));
    this.ws.on("error", (error) => this.fail(error));
    this.ws.on("unexpected-response", (_req, res) =>
      this.fail(
        new Error(
          `collab handshake refused: HTTP ${res.statusCode} ${res.statusMessage ?? ""}`.trim(),
        ),
      ),
    );
  }

  get isReady(): boolean {
    return this.ready;
  }

  /** The socket's own state; `closing` is the window after a close frame and before the `close` event. */
  get socketState(): "connecting" | "open" | "closing" | "closed" {
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "open";
      case WebSocket.CLOSING:
        return "closing";
      default:
        return "closed";
    }
  }

  // ---- inbound control ------------------------------------------------------

  /** Queue inbound document updates instead of applying them. */
  holdInbound(): void {
    this.held = true;
  }

  /** Apply every queued update in arrival order, then resume live apply. */
  releaseInbound(): void {
    this.held = false;
    const queue = this.queued;
    this.queued = [];
    const { Y } = rt();
    for (const update of queue) Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
  }

  /** Inbound updates received and not yet applied. */
  pendingInbound(): number {
    return this.queued.length;
  }

  // ---- writes ---------------------------------------------------------------

  /**
   * Run `fn` against the raw `elements` map in ONE transaction and send the
   * resulting v1 update as its own frame (as the browser does). `fn` also
   * receives the `yjs` module so a caller can build `Y.Map` values without
   * depending on `yjs` itself. Throws if the peer is read-only.
   */
  async write(
    fn: (elements: Y.Map<Y.Map<unknown>>, yjs: typeof Y) => void,
  ): Promise<void> {
    this.assertOpen();
    this.assertSocketOpen();
    if (this.access !== "write") {
      throw new Error(
        `peer has ${this.access ?? "no"} access${this.accessReason ? ` (${this.accessReason})` : ""}; cannot write`,
      );
    }
    this.doc.transact(
      () => fn(this.doc.getMap("elements") as Y.Map<Y.Map<unknown>>, rt().Y),
      PEER_ORIGIN,
    );
    await this.drained();
  }

  /** Publish an awareness state `{ user: { username } }`, as the editor does. */
  async announce(username: string): Promise<void> {
    this.assertOpen();
    this.assertSocketOpen();
    const { encoding, awarenessProtocol } = rt();
    this.awareness.setLocalStateField("user", { username });
    this.send(
      encodeFrame(COLLAB_WIRE.AWARENESS, (e) =>
        encoding.writeVarUint8Array(
          e,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
            this.clientId,
          ]),
        ),
      ),
    );
    await this.drained();
  }

  // ---- raw reads ------------------------------------------------------------

  /** One element exactly as stored (`Y.Map#toJSON`), or undefined. */
  rawElement(id: string): RawElement | undefined {
    const { Y } = rt();
    const element = this.doc.getMap("elements").get(id);
    return element instanceof Y.Map
      ? (element.toJSON() as RawElement)
      : undefined;
  }

  /** Every element exactly as stored, keyed by id (tombstoned ones included). */
  rawElements(): Record<string, RawElement> {
    const { Y } = rt();
    const out: Record<string, RawElement> = {};
    for (const [id, element] of this.doc.getMap("elements")) {
      if (element instanceof Y.Map) out[id] = element.toJSON() as RawElement;
    }
    return out;
  }

  /** Raw elements that are not soft-deleted, optionally of one type. */
  liveElements(type?: string): Array<RawElement & { id: string }> {
    return Object.entries(this.rawElements())
      .filter(
        ([, el]) => el.isDeleted !== true && (!type || el.type === type),
      )
      .map(([id, el]) => ({ ...el, id }));
  }

  /**
   * Poll `predicate` until it returns a truthy value and resolve with it.
   * Re-evaluates on every poll tick against the peer's raw doc; never a fixed
   * sleep. Rejects with `description` on timeout.
   */
  async waitFor<T>(
    predicate: () => T | undefined | null | false,
    description: string,
    options: WaitForOptions = {},
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
    const intervalMs = options.intervalMs ?? DEFAULT_WAIT_INTERVAL_MS;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (this.closed && this.endedReason) {
        throw new Error(
          `peer session ended (${this.endedReason}) while waiting for: ${description}`,
        );
      }
      const value = predicate();
      if (value) return value;
      if (Date.now() >= deadline) {
        throw new Error(
          `timed out after ${timeoutMs} ms waiting for: ${description}`,
        );
      }
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * The durability barrier: resolves once the collaboration service answers
   * `persisted` to THIS peer's own request, i.e. the room's state (which holds
   * every update this peer has sent or seen) is in both stores. Wire contract:
   * one frame, the varUint `DURABILITY_REQUEST` (4) and the raw UTF-8 JSON
   * `{ requestId }` with no length prefix; the service answers with exactly one
   * CONTROL frame `{ kind: 'persisted' | 'persist-failed', requestId }`. The
   * room-wide `{ kind: 'saved' }` broadcast is NOT an answer: it can report
   * another editor's save.
   *
   * - A clean room is answered at once (the live doc equals storage).
   * - A dirty room parks until the next successful persist, within the
   *   service's `SAVE_DEBOUNCE_MILLIS` (default 2000).
   * - A read-only session is refused: `persist-failed` "this session is
   *   read-only", so the peer must be admitted `write` (the multi-user plan).
   * - An unparseable request is answered with silence, so the timeout is the
   *   only signal then.
   *
   * Rejects on `persist-failed` (with the service's reason), on the session
   * ending, and after `timeoutMs` (default 30 s). One request at a time per peer.
   */
  async awaitDurable(options: AwaitDurableOptions = {}): Promise<void> {
    this.assertOpen();
    this.assertSocketOpen();
    if (this.durability) {
      throw new Error(
        `durability request ${this.durability.requestId} is still pending; the service refuses a second one`,
      );
    }
    const timeoutMs = options.timeoutMs ?? DEFAULT_DURABLE_TIMEOUT_MS;
    const requestId = `${this.clientId}-${++this.durabilitySequence}`;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.durability = undefined;
        reject(
          new Error(
            `durability request ${requestId} unanswered after ${timeoutMs} ms`,
          ),
        );
      }, timeoutMs);
      this.durability = { requestId, resolve, reject, timer };
      const { encoding } = rt();
      this.send(
        encodeFrame(COLLAB_WIRE.DURABILITY_REQUEST, (e) =>
          encoding.writeUint8Array(
            e,
            new TextEncoder().encode(JSON.stringify({ requestId })),
          ),
        ),
      );
    });
  }

  private settleDurability(error?: Error): void {
    const pending = this.durability;
    if (!pending) return;
    clearTimeout(pending.timer);
    this.durability = undefined;
    if (error) pending.reject(error);
    else pending.resolve();
  }

  /**
   * Idempotent. Announces departure, closes the socket, destroys the doc.
   * Also after the service closed the socket first: the doc and its awareness
   * (which runs an interval) are still destroyed.
   */
  async close(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.closed = true;
    this.endedReason ??= "closed-by-peer";
    this.clearHeartbeat();
    this.settleDurability(
      new Error("peer closed before durability was confirmed"),
    );
    this.doc.off("update", this.onDocUpdate);
    if (this.ws.readyState === WebSocket.OPEN) {
      if (this.awareness.getLocalState() !== null) {
        const { encoding, awarenessProtocol } = rt();
        awarenessProtocol.removeAwarenessStates(
          this.awareness,
          [this.clientId],
          "peer-close",
        );
        this.ws.send(
          encodeFrame(COLLAB_WIRE.AWARENESS, (e) =>
            encoding.writeVarUint8Array(
              e,
              awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
                this.clientId,
              ]),
            ),
          ),
        );
      }
      await new Promise<void>((resolve) => {
        this.ws.once("close", () => resolve());
        this.ws.close(1000);
        setTimeout(() => {
          this.ws.terminate();
          resolve();
        }, 2_000).unref();
      });
    } else if (this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.terminate();
    }
    this.awareness.destroy();
    this.doc.destroy();
  }

  // ---- wire -----------------------------------------------------------------

  private handleMessage(bytes: Uint8Array): void {
    try {
      const { decoding } = rt();
      const decoder = decoding.createDecoder(bytes);
      switch (decoding.readVarUint(decoder)) {
        case COLLAB_WIRE.SYNC:
          this.readSync(decoder);
          break;
        case COLLAB_WIRE.CONTROL:
          this.handleControl(decoder);
          break;
        case COLLAB_WIRE.HEARTBEAT:
          this.receiveHeartbeat(bytes);
          break;
        default:
          // awareness, ephemeral: nothing to do for the oracle
          break;
      }
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
      this.ws.close(4000, "protocol-decode-failed");
    }
  }

  private handleControl(decoder: decoding.Decoder): void {
    const text = Buffer.from(
      rt().decoding.readTailAsUint8Array(decoder),
    ).toString("utf8");
    let message: {
      kind?: string;
      mode?: string;
      reason?: string;
      code?: string;
      disposition?: string;
      requestId?: string;
      /** The service's reason on `persist-failed`. */
      error?: string;
    };
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (message.kind === "admission") {
      if (message.mode !== "read" && message.mode !== "write") {
        this.fail(new Error(`invalid admission mode: ${message.mode}`));
        return;
      }
      this.access = message.mode;
      this.accessReason = message.reason;
      if (message.mode !== "write" && this.options.requireWrite !== false) {
        this.fail(
          new Error(
            `collab admission is "${message.mode}"${message.reason ? ` (${message.reason})` : ""}, not write`,
          ),
        );
        return;
      }
      const { Y, encoding, syncProtocol } = rt();
      this.send(
        encodeFrame(COLLAB_WIRE.SYNC, (e) => {
          encoding.writeVarUint(e, syncProtocol.messageYjsSyncStep1);
          encoding.writeVarUint8Array(e, Y.encodeStateVector(this.doc));
        }),
      );
    } else if (message.kind === "session-end") {
      this.endedReason = message.code ?? message.disposition ?? "session-end";
      this.settleDurability(
        new Error(`session ended (${this.endedReason}) before durability was confirmed`),
      );
    } else if (
      (message.kind === "persisted" || message.kind === "persist-failed") &&
      message.requestId === this.durability?.requestId
    ) {
      if (message.kind === "persisted") this.settleDurability();
      else
        this.settleDurability(
          new Error(
            `durability request ${message.requestId} failed: ${String(message.error ?? message.reason ?? "persist-failed")}`,
          ),
        );
    }
  }

  private readSync(decoder: decoding.Decoder): void {
    if (!this.access) throw new Error("sync-before-admission");
    const { Y, encoding, decoding, syncProtocol } = rt();
    const { messageYjsSyncStep1, messageYjsSyncStep2, messageYjsUpdate } =
      syncProtocol;
    const syncType = decoding.readVarUint(decoder);
    if (syncType === messageYjsSyncStep1) {
      const stateVector = decoding.readVarUint8Array(decoder);
      const delta = Y.encodeStateAsUpdate(this.doc, stateVector);
      this.send(
        encodeFrame(COLLAB_WIRE.SYNC, (e) => {
          encoding.writeVarUint(e, messageYjsSyncStep2);
          encoding.writeVarUint8Array(
            e,
            this.access === "write" ? delta : Y.encodeStateAsUpdate(new Y.Doc()),
          );
        }),
      );
      return;
    }
    if (syncType !== messageYjsSyncStep2 && syncType !== messageYjsUpdate) {
      throw new Error("unknown-sync-type");
    }
    const update = decoding.readVarUint8Array(decoder);
    if (this.held && this.ready) this.queued.push(update);
    else Y.applyUpdate(this.doc, update, REMOTE_ORIGIN);
    if (syncType === messageYjsSyncStep2 && !this.ready) this.becomeReady();
  }

  private becomeReady(): void {
    this.ready = true;
    this.armHeartbeat(this.options.heartbeatIdleMs ?? HEARTBEAT_IDLE_MS);
    this.settleConnect?.resolve();
    this.settleConnect = undefined;
  }

  // Heartbeat, as client-web: one outstanding frame; the service echoes it
  // byte for byte; no echo within HEARTBEAT_REPLY_MS drops the session.
  private armHeartbeat(delayMs: number): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      if (this.heartbeatFrame) {
        this.endedReason ??= "heartbeat-timeout";
        this.ws.close(4000, "heartbeat-timeout");
      } else this.sendHeartbeat();
    }, delayMs);
    this.heartbeatTimer.unref();
  }

  private sendHeartbeat(): void {
    if (this.heartbeatFrame || this.ws.readyState !== WebSocket.OPEN) return;
    this.heartbeatFrame = encodeFrame(COLLAB_WIRE.HEARTBEAT, (e) =>
      rt().encoding.writeVarString(
        e,
        `${Date.now()}-${++this.heartbeatSequence}`,
      ),
    );
    this.send(this.heartbeatFrame);
    this.armHeartbeat(HEARTBEAT_REPLY_MS);
  }

  /** Only the echo of the outstanding heartbeat counts; anything else is ignored. */
  private receiveHeartbeat(frame: Uint8Array): void {
    if (!this.heartbeatFrame || !sameBytes(frame, this.heartbeatFrame)) return;
    this.heartbeatFrame = undefined;
    this.heartbeatsEchoed += 1;
    this.armHeartbeat(this.options.heartbeatIdleMs ?? HEARTBEAT_IDLE_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
    this.heartbeatFrame = undefined;
  }

  private handleClose(code: number, reason: Buffer): void {
    this.endedReason ??= `closed ${code}${reason.length ? ` ${reason.toString()}` : ""}`;
    if (!this.ready) {
      this.fail(
        new Error(
          `collab socket closed before the initial sync (${this.endedReason})`,
        ),
      );
    }
    this.closed = true;
    this.clearHeartbeat();
    this.settleDurability(
      new Error(`session ended (${this.endedReason}) before durability was confirmed`),
    );
  }

  private fail(error: Error): void {
    this.endedReason ??= error.message;
    if (this.settleConnect) {
      this.settleConnect.reject(error);
      this.settleConnect = undefined;
    }
  }

  private send(frame: Uint8Array): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(frame);
  }

  private drained(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + DRAIN_TIMEOUT_MS;
      // `ws` queues sends in order; bufferedAmount 0 means the frame left the
      // local buffer — not that the service received it.
      const check = (): void => {
        if (this.ws.bufferedAmount === 0) resolve();
        else if (this.ws.readyState !== WebSocket.OPEN)
          reject(
            new Error(
              `collab socket ${this.socketState} with a frame still queued (${this.ws.bufferedAmount} bytes)`,
            ),
          );
        else if (Date.now() >= deadline)
          reject(
            new Error(
              `timed out after ${DRAIN_TIMEOUT_MS} ms waiting for a frame to leave the socket buffer`,
            ),
          );
        else setTimeout(check, DRAIN_POLL_MS);
      };
      check();
    });
  }

  /**
   * `closed` lags the socket: between a close frame and the `close` event the
   * socket is CLOSING and `ws` drops sends silently. A write there must fail
   * loudly, not "succeed" with nothing sent.
   */
  private assertSocketOpen(): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(
        `collab socket is ${this.socketState}; nothing sent${this.endedReason ? ` (${this.endedReason})` : ""}`,
      );
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error(
        `peer is closed${this.endedReason ? ` (${this.endedReason})` : ""}`,
      );
    }
  }
}

/**
 * Connect a Node peer to a whiteboard's collaboration room and resolve once
 * the service admitted it and the initial sync finished. Rejects (loudly, with
 * the service's reason) on a refused handshake, a non-write admission (unless
 * `requireWrite: false`), a premature close or a timeout.
 *
 * Authentication is the gateway's: the session cookie
 * (`{ cookieHeader }`, the signed-in browser) or the bearer
 * (`TestUser` / `{ bearerToken }`), plus an `Origin` equal to the app origin.
 */
export const connectWhiteboardPeer = async (
  options: ConnectWhiteboardPeerOptions,
): Promise<WhiteboardPeer> => {
  await loadRuntime();
  const base = options.baseUrl ?? testConfiguration.endPoints.server;
  const headers: Record<string, string> = {
    ...resolveActor(options.actor).headers,
    Origin: new URL(base).origin,
  };
  const ws = new WebSocket(collabUrl(options), { headers });
  ws.binaryType = "nodebuffer";
  const peer = new WhiteboardPeer(options, ws);
  const timeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  let timer: NodeJS.Timeout | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `collab connect timed out after ${timeoutMs} ms (access: ${peer.access ?? "none"})`,
            ),
          ),
        timeoutMs,
      );
      peer.attachConnect({ resolve, reject });
    });
  } catch (error) {
    await peer.close();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
  return peer;
};
