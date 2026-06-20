# Unified collaboration — service-level e2e (epic `003-unify-collab-yjs`)

Service-level (protocol/backend) end-to-end tests for the **unified
collaboration service**, covering both **memo** and **whiteboard** documents.
They drive two raw `y-websocket` clients straight at the service over the
canonical y-protocols wire envelope and assert CRDT correctness — **no React,
no ProseMirror, no Excalidraw UI**. This is the robust, headless, CI-gating
layer (epic SC-009 / WS-F).

## Files

| File | Role |
|------|------|
| `collab-auth.ts` | OIDC/BFF admin login (one short-lived Playwright Chrome → `alkemio_session` cookie) + cookie-authenticated GraphQL helper. The cookie authenticates both GraphQL and the `/collab` WS handshake (Traefik forwardAuth → `X-Alkemio-Actor-Id`). |
| `collab-fixture.ts` | Creates a fresh Space + MEMO / WHITEBOARD callout via GraphQL; returns the collaboration-document UUID = the WS room id. |
| `collab-ws.ts` | Raw-WS Yjs client helpers: connect a `y-websocket` client carrying the cookie, plus `waitForDoc` / `waitForAwareness`. |
| `memo-collaboration.spec.ts` | Memo: convergence + awareness + (opt-in) persistence. |
| `whiteboard-collaboration.spec.ts` | Whiteboard: convergence + **per-property merge** + awareness + (opt-in) persistence. |

## Scenarios & assertions

Both specs open `ws://localhost:3000/collab/<documentId>?type=<memo|whiteboard>`.

**Memo** (binds to the Y.Doc XmlFragment `"default"`):
1. **Convergence** — text inserted by A appears in B.
2. **Awareness/presence** — A's awareness state is visible to B.
3. **Persistence round-trip** *(opt-in)* — after A+B drop, a cold client C
   rehydrates the text.

**Whiteboard** (Yjs scene schema: top-level `Y.Map` `elements` keyed by element
id → a **per-property** nested `Y.Map`; plus `files` and `appState`):
1. **Convergence** — an element seeded by A appears in B.
2. **Per-property merge (headline)** — A sets `element.x`, B sets the **same**
   element's `strokeColor` concurrently → **both survive on both clients**, NOT
   last-write-wins. Untouched properties stay intact.
3. **Awareness/presence** — A's awareness state is visible to B.
4. **Persistence round-trip** *(opt-in)* — cold client C rehydrates the merged
   element.

> The whiteboard test mirrors the schema the `@alkemio/excalidraw-yjs-binding`
> writes but does **not** import it — it exercises the WS/CRDT layer, not the
> binding.

## What's proven headless now vs. what needs a live stack

Everything here needs the **local dev stack up** (gateway `localhost:3000` →
unified collab service + server BFF for forward-auth + OIDC login). Against that
stack:

- ✅ **Deterministic / CI-gating**: convergence, **per-property merge**, and
  awareness/presence — for both memo and whiteboard.
- ⚠️ **Opt-in / non-gating**: the **persistence cold-rehydrate** assertions. The
  round-trip works intermittently but the cold client occasionally closes `1006`
  before the blob / `collaboration-fetch` flush completes, so enforcing it would
  flake CI. These tests are **skipped by default** with a reason and run only
  when `COLLAB_ASSERT_PERSISTENCE=true`. Enable once the persistence path is
  reliable.

## Running

Stack must be up. From the repo root (pnpm workspace):

```bash
# Both collab specs:
pnpm --filter @alkemio/test-suite-client-web exec \
  playwright test src/functional-e2e/collab

# Include the opt-in persistence assertions:
COLLAB_ASSERT_PERSISTENCE=true pnpm --filter @alkemio/test-suite-client-web exec \
  playwright test src/functional-e2e/collab
```

In CI they run via the `Collaboration` project in
`config/playwright.config.nightly.ts`
(`pnpm --filter @alkemio/test-suite-client-web run test:nightly`).

## Overrides (env)

| Var | Default | Purpose |
|-----|---------|---------|
| `COLLAB_BASE_URL` | `http://localhost:3000` | Apex origin (web + GraphQL + `/collab` WS). |
| `COLLAB_ADMIN_EMAIL` | `admin@alkem.io` | Login identity. |
| `COLLAB_ADMIN_PASSWORD` | `$AUTH_TEST_HARNESS_PASSWORD` then a fallback | Login secret. |
| `COLLAB_GQL` | `${BASE}/api/private/non-interactive/graphql` | Fixture GraphQL endpoint. |
| `COLLAB_ASSERT_PERSISTENCE` | _(unset → skipped)_ | `true` enforces the persistence round-trip. |
