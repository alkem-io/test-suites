# Collaboration service — wire-level tests

Memo and whiteboard live collaboration against the **unified collaboration
service** (`alkem-io/collaboration-service`, epic `003-unify-collab-yjs`),
exercised the way the browser exercises it: raw WebSocket collaborators on
`wss://<host>/collab/<documentId>?type=memo|whiteboard`, speaking the service's
wire protocol. No browser, no editor binding.

```bash
pnpm --filter @alkemio/test-suite-server-api run test:collaboration
```

Part of `test:nightly`.

## Why this lives in `server-api`, not `client-web`

These are API-level tests of a backend service. Nothing in them needs a page:
the session is authenticated with the same harness bearer every GraphQL call in
this package uses (`TestScenarioFactory` mints it through
`/api/auth/non-interactive-login`), sent as the `Authorization` header on the
WebSocket upgrade. On a cluster Traefik's `alkemio-identity` chain forwards the
upgrade to the server's `/rest/internal/forward-auth`, which resolves cookie →
Hydra bearer → non-interactive bearer → anonymous and stamps
`X-Alkemio-Actor-Id`, the only credential the service trusts
(`AUTH_MODE=header`). That is identical to how the SPA's cookie is resolved —
the service never sees the difference.

The scheduled nightly (`nightly-build-trigger.yml`) deploys
`collaboration-service` with the other services, resets the database, and runs
`server-api` `test:nightly`, so a regression in the service or its routing is
caught the morning after it lands. The Playwright nightly is dispatch-only and
would also have needed a browser just to obtain a cookie.

## Files

| File | Role |
|---|---|
| `collab-ws.client.ts` | The collaborator: frames, admission, Yjs sync, awareness, durability barrier, close. Mirrors `client-web/src/domain/collaboration/realTimeCollaboration/unifiedCollabProvider.ts`. |
| `collaboration.fixtures.ts` | Private Space via `TestScenarioFactory` + one MEMO / WHITEBOARD framing callout; the framing document id is the room id. |
| `memo-collaboration.it-spec.ts` | Memo room: admission, sync, presence, durability, cold rehydrate. |
| `whiteboard-collaboration.it-spec.ts` | Whiteboard room: the same, plus per-property merge and same-property convergence. |

## Protocol, as implemented here

| Type | Direction | Meaning |
|---|---|---|
| 0 | both | y-protocols sync (SyncStep1 / SyncStep2 / Update) |
| 1 | both | y-protocols awareness |
| 2 | both | ephemeral whiteboard events — ignored |
| 3 | server → client | JSON control: `admission` (first frame, `mode: read\|write`), `persisted` / `persist-failed` (answer one durability request), `saved`, `session-end`, … |
| 4 | client → server | durability request, JSON `{ requestId }` |
| 5 | client → server (echoed) | heartbeat — ignored |

The client sends SyncStep1 only after the `admission` control, as the SPA does.

## What each case proves

| Case | Regression it catches |
|---|---|
| Space admin admitted `write`, admission before sync | admission control missing or an editor demoted to read |
| Space member admitted and synced | room authorisation broken while GraphQL reads still work |
| Outsider of a private Space not admitted | authz port failing open: a leaked id reads a private document |
| Anonymous handshake refused (memo) | identity chain not applied to `/collab` |
| A's text / element converges into B | updates not relayed within a room |
| Different properties of one element both survive on both sides | element collapsed to one value — last-write-wins |
| Same property converges to one value | divergence between editors |
| A's presence visible to B | awareness not fanned out |
| Durability request answered `persisted` | save path to file-service / metadata broken while memory keeps serving |
| Cold client rehydrates after room release | snapshot not loaded on room start |

## The one wait

The cold-rehydrate cases wait `COLLAB_ROOM_IDLE_RELEASE_MS` (default 35 s)
after the last client leaves. An empty room is released only after the
service's idle timeout (30 s by default, not overridden on the test cluster);
before that a new client is served from memory and the case would prove
nothing. It is a positive settle window, not a guess at latency.

## Environment

Only the standard `server-api` variables (`ALKEMIO_BASE_URL`,
`AUTH_TEST_HARNESS_PASSWORD`, …). The room URL is derived from
`ALKEMIO_BASE_URL`, exactly as the SPA derives it from the page origin.

## Not covered here

- The editor bindings (ProseMirror, `@excalidraw-yjs/element`) and the UI —
  that is `client-web` Playwright territory.
- Multi-pod fan-out (the test deployment runs one pod with the in-memory hub).
- Collaborator-mode downgrades (capacity, inactivity) and read-only edits being
  refused: not yet pinned; the admission `mode` is the hook to extend from.
