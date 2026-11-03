# Test plan — undo racing a peer edit drops required element keys (excalidraw-yjs#13)

> **Status:** Approved (in-session by ev.dimitrovv, 2026-11-03) · **Depth:** Deep — production incident (every participant's editor crashed), data-destructive collaborative path, cross-repo delivery (library release → client-web bump) · **Story:** [alkem-io/excalidraw-yjs#13](https://github.com/alkem-io/excalidraw-yjs/pull/13) (PR is the story; head `2f856b9b`)

`Scene.applyElementHistoryStep` now puts back any *required* key (`isRequiredElementKey`) that an undo/redo left empty, and `yMapToElement` defaults missing geometry and linear `points` so already-damaged boards load. The package suite proves both at Scene level. **Nothing in test-suites touched collaborative whiteboard editing before this plan, and nothing can reproduce the race without a new harness capability (T-1, a Node Yjs peer).** With T-1, the incident is reproduced deterministically through the real client and collaboration-service (WC-01), and the damaged-board load is pinned (WC-02). New area: no whiteboard plan existed anywhere. `templates-CRD/` and `public-space/` use whiteboards only as a template or access surface, not as a collaborative one.

## How to run
```bash
cd client-web && WHITEBOARD_COLLAB_FIXED=1 pnpm exec playwright test src/functional-e2e/whiteboard-collaboration/
pnpm -C server-api exec vitest run --project contract src/contract/whiteboard-peer.it-spec.ts   # T-1 self-test
```
- **Gate:** the target env's client-web must resolve `@excalidraw-yjs/excalidraw` ≥ 0.5.6 (M-2). Until then both walks are `test.skip` (house known-defect convention). **`WHITEBOARD_COLLAB_FIXED=1` lifts the skip** for a local run against a build that has the fix (`https://pkg.pr.new/@excalidraw-yjs/excalidraw@13`, or an environment after the bump); the nightly leaves it unset, so the *Whiteboard collaboration* suite lists both walks as skipped. The client-web bump PR must drop the skip (delete `fixedBuildAvailable` use in the two specs and the flag). On a build at 0.5.5 the walks must be **red** (non-vacuity; see Regression guards).
- Local stack recipe: `ALKEMIO_BASE_URL=http://localhost:3000`, `UI_HEADLESS=true`, the harness persona password (not the server admin password), no `KRATOS_ADMIN_URL`. The Node peer authenticates through the gateway with the persona's bearer (`TestUser`) plus an `Origin` equal to the app origin; it also accepts a browser `{ cookieHeader }`.
- The Space needs the `SPACE_FEATURE_WHITEBOARD_MULTI_USER` licence plan, or every second connection is read-only. Run serially: one room per test.
- The oracle is the Node peer's **raw** Y.Map read. There is no DOM or GraphQL view of canvas content (harness.md › Whiteboards).

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | Two people edit the same arrow, one presses undo, and every editor on the board crashes | Medium | Critical | **High** | WC-01, U-1, U-3, U-9 |
| R2 | A board damaged before the fix keeps crashing everyone who opens it | High (the incident board exists) | High | **High** | WC-02, M-1 |
| R3 | The fix never reaches users: unreleased, not bumped, or the deploy resolves the old version | Medium | High | **High** | M-2, gating |
| R4 | The repair breaks ordinary undo/redo (an extra step, a lost redo, an optional key forced back) | Low | Medium | Medium | U-1, U-2, U-5, U-7 |
| R5 | After a repaired undo, the arrow is visibly wrong: x/y/width revert while points/height keep the dragged shape | High (by design, when R1 fires) | Low–Medium | Medium | X-1, U-9, Q2 |
| R6 | Peers receive the damaged state one frame before the repair. A peer on the old build (stale tab, mixed rollout) can still crash | Low | High | Medium | X-1, Q1 |
| R7 | Text keys are repaired on write but not defaulted on read, so a doc that lost `text`/`fontSize` may still crash on load | Low | High | Medium | U-4, U-10, Q3 |
| R8 | Peers diverge, or undo overwrites a peer's later edit (origin-scope guarantee broken) | Low | High | Medium | U-3, WC-01 E6 |
| R9 | The server still materialises template/copy content with 0.5.5, so damage is copied verbatim | Low | Medium | Low | Q4 |

Elevated-risk triggers present: [x] cross-repo contract (library → client-web; server pins the same package) · [x] data-destructive (key loss syncs to every peer and persists) · [x] performance-sensitive path (undo, and every recompute through `yMapToElement`) · [ ] migration · [ ] breaking contract · [ ] authorization · [ ] infra/config. No `Release NN` story carries this yet (fix unreleased).

## Existing coverage before this work
- **excalidraw-yjs, new `Scene.undoConcurrentKeyLoss.test.ts`:** the concurrent lower-id undo (presence of `points`/`height` only; values are not pinned), the damaged-arrow load, and plain undo exact. **Full at Scene level** for S1–S3.
- **excalidraw-yjs, confirmed unaffected:** `Scene.native-yjs-history` (10), `Scene.native-yjs-collab` (8; different-property merge, origin-scoped undo), `multiplayerOutcomes` (6; (c) is the *causally later* same-property case, not the concurrent one), `historyLockstep` (1), `history.test.tsx` (27 + binding undo). None is invalidated.
- **`Scene.multiplayerHistory.property` is blind to this defect.** It fuzzes concurrent same-key x/y edits with undo/redo, but reads *derived* elements, so a lost key never showed. After this PR's read-side defaults, a lost `x` reads as `0`, so it is permanently masked. Treated as partial (U-8).
- **test-suites, proven absent (searched `origin/develop` be50109a):** `git grep -i "undo|redo|Control\+z"` has zero spec hits. Whiteboard specs are single-user (`templates-CRD/…/whiteboard-dialog.ts`) or render-only (`public-space/non-member-whiteboard-access.spec.ts`). `Whiteboard` has no `content` field, and no mutation input accepts raw content (server `schema.graphql`, since server#6399).
- **client-web's own `e2e/specs/multiUserCollab.e2e.spec.ts` row 4:** two-user different-property merge, with no undo. It reads `window.h`, which client-web never installs (the published bundle has no `MODE`). Prior art, not coverage.
- **Reuse: 4 of 22 scenarios need no new test** (S1, which includes Scene-level peer convergence; S2; S3; single-user undo, which is covered at package level). The 22 are the 6 mapped rows, the 10 U-cases and the 6 gaps. **0 existing tests need updating.**

## Scenario → test mapping
| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| S1 Concurrent lower-id undo leaves no required key empty | R1 | `Scene.undoConcurrentKeyLoss.test.ts` › test 1 | unit (owning repo) |
| S2 A damaged arrow doc materialises | R2 | same › test 2 | unit (owning repo) |
| S3 Plain undo restores keys exactly | R4 | same › test 3; `Scene.native-yjs-history` | unit (owning repo) |
| S4 The incident, end to end: a peer with a lower id writes concurrently, the browser drags then presses Ctrl+Z, no participant crashes, raw keys survive, no extra undo step | R1, R4, R8 | `undo-races-peer-edit.spec.ts` › WC-01 a lower-id peer writes the arrow concurrently, then B undoes: no key is lost, nobody crashes | system (UI + Node peer) |
| S5 A damaged board opens: live arrival and fresh load | R2, R6 | `damaged-board-loads.spec.ts` › WC-02 an arrow without points/height arrives live and on fresh loads: nobody crashes | system (UI + Node peer) |
| Prerequisite: Node Yjs collab peer in the lib | all S4/S5 | `lib/src/collab/whiteboard-peer.ts` (`connectWhiteboardPeer`); self-test `server-api/src/contract/whiteboard-peer.it-spec.ts` › T-1a admission + empty raw doc, T-1b raw write → raw read, T-1c hold/release inbound, T-1d the multi-user negative | tooling |
| Single-user undo/redo of create/move/resize/delete/text | R4 | `history.test.tsx`, `Scene.native-yjs-history` | unit (owning repo) |

**Owning-repo hand-back (excalidraw-yjs package suite; not for test-suites):** U-1 redo after a repaired undo (P1) · U-2 the repair adds no History/UndoManager step, App-level lockstep (P1) · U-3 DT of peer id {lower, higher} × {concurrent, causally later} (P1) · U-9 pin the repaired values in test 1 (P1) · U-4 DT of type × required key for text/line/freedraw (P2) · U-5 optional-key undo still removes or nulls it (P2) · U-7 the repaired element's version strictly increases (P2) · U-8 raw-doc required-key invariant in the property test (P2) · U-10 a damaged *text* doc loads (P2) · U-6 an element tombstoned concurrently gets no repair (P3). The build sheet specifies each.

### Regression guards
- **WC-01** pins the 2026-11-03 incident. Root cause: `Y.UndoManager` refuses to restore a key when a concurrent peer item sits between, and that peer item had already lost the map-key conflict (the lower client id), so the key ends up with no value. It must be red on 0.5.5 and green on ≥ 0.5.6.
- **WC-02** pins the read-side contract: a doc missing `points`/`height` renders for every participant.

**What was run (2026-11-03, local stack, client-web on the PR build `@excalidraw-yjs/excalidraw@13`, commit 594ad98):**
- **GREEN on the fixed build.** On the final specs WC-01 passed 3 of 3 and WC-02 3 of 3 (serial, `WHITEBOARD_COLLAB_FIXED=1`, `retries: 0`); the T-1 self-test T-1a–T-1d passed 4 of 4 on two runs. Without the flag both walks list as skipped.
- **RED on 0.5.5 — NOT RUN. Pending the orchestrator's 0.5.5 run.** Until it is done nothing proves these walks fail on the unfixed build. WC-01 on 0.5.5 is expected to fail at E2/E3 (and E4/E5); WC-02 at E2/E3.
- **Oracle checks that were run:** the "editor survived" matcher (`expectEditorAlive`) was exercised on synthetic pages and fails on an "Oops!" page and on a missing editor dialog. WC-01's E1 is a hard self-check: it fails as "race precondition not reached", never as a pass. On the fixed build the observed final state of X shows `width` restored while `points`/`height` kept the dragged shape, differing from the original and from P's concurrent value, which is the repaired outcome (a clean undo would have restored the original).
- **What was NOT proven.** I could not crash the PR build with other malformed documents (an arrow with a non-array `points`, a text element with no text keys, an arrow with 10 style keys removed all rendered without an error page), so WC-02's crash oracle has only been exercised on synthetic pages, not on a real crash, until the 0.5.5 run. The damaged intermediate state could not be observed at a peer: undo and repair arrive as one transaction, so R6/Q1's "two frames" claim is **not** confirmed at the wire (the PR author should recheck).

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| The race with two real browsers only (no harness peer) | **Rejected.** Browser client ids are random, so the peer is lower only half the time, and the concurrency window is below one round trip. Such a walk passes on 0.5.5 most of the time, so it cannot tell fixed from unfixed | WC-01 (T-1) instead |
| The repaired state survives a room reload from storage | **Deferred.** No lever evicts a room or forces a reload from the blob store | deferred.md; X-1 by refresh |
| WC-01 depends on how a reopened editor centres its content (it derives the grab point from the raw scene coordinates, then asserts through the pending-frame gate that the drag started) | **Known fragility.** If the editor's initial scroll changes, WC-01 fails at "B's first drag frame to arrive at P" with a message naming the cause, not as a false pass | a stable scene→screen mapping, if client-web ever exposes one |
| Whether the Node peer is admitted by the TEST environment's gateway with a persona bearer (Q6) | **Not verified.** Proven on the local stack only (Traefik `alkemio-resolve` accepts the non-interactive bearer). Needs a run on the test env once the bump lands | the bump PR (lifts the skip, runs once on test) |
| What the arrow looks like after a repaired undo (R5), elbow arrows, text being edited concurrently | **Exploratory.** Canvas pixels are not assertable, and the right outcome is a product question (Q2) | X-1 charter |
| A mixed-version session: a 0.5.5 stale tab while a ≥ 0.5.6 user undoes (R6) | **Manual / exploratory.** Needs two client builds at once | X-1; release checklist §4 |
| The incident board opens on PROD (R2) | **Manual.** Customer data, PROD only | M-1 → checklist §4 |
| The deployed client-web resolves ≥ 0.5.6 (R3) | **Manual, mechanically checkable.** A release-gate fact, not a behaviour | M-2 → checklist §4 |
| Two people, same shape, one undoes (smoke) | **Manual.** Extends §3.2 real-time whiteboards | M-3 → checklist §3.2/§4 |

**Proposed for `docs/release-verification-checklist.md` (not edited):**
- **§4 M-2.** `git show <client-web tag>:package.json` and its `pnpm-lock.yaml` resolve `@excalidraw-yjs/excalidraw` ≥ 0.5.6, on test, ACC and PROD.
- **§4 M-1.** After the PROD deploy, a fresh session opens the incident board (link from the board owner, never in a public issue). It renders with no "Oops!" page, and the arrow is drawn. Record the open decision on healing the board (Q5).
- **§3.2 / §4 M-3.** On ACC, two people work on one board. A drags a shape with a bound arrow while B drags that arrow's endpoint. A presses Ctrl+Z, then Ctrl+Shift+Z. Neither editor shows the error page, the arrow is still drawn on both, and a refresh shows the same board.

**Non-functional.** *Performance:* the fix adds one `observeDeep` per undo and an O(n) pass only when a key was dropped. `yMapToElement` adds constant work per element. No N+1 and no network, so no case. *Security:* no authN/authZ change. Availability is a concern: a malformed peer write can still crash text rendering (R7; the collaboration-service validates only the assets root, `room.go › applyUpdate`). No fuzzing harness exists, so U-10 and Q3 carry it. *Reliability:* undo and repair go out as **two frames** (`handleLocalUpdate` sends each update; `applyElementHistoryStep` does not use `beginLogicalMutation`), so the damaged state is briefly published (R6, Q1). Repair is idempotent (`!ymap.has(key)`). *Compatibility:* the walks are Chrome-first, `ControlOrMeta` covers macOS, and `PW_BROWSER=firefox` is optional. Mixed versions go to X-1. *Accessibility:* no UI change, nothing to assess.

**What is proven, and what is not.** Before T-1 exists, the fix is proven only inside the package (Scene level, the incident's real client ids, a manual-flush link). The code path users take (browser keyboard → History → Scene → collaboration-service → peers) is **not exercised by any automated test**, and the damaged-board load has no system test. With T-1 + WC-01/WC-02 green on an environment that resolves ≥ 0.5.6, both PR claims are proven end to end on that environment. **Three things stay unproven by automation:** the visual correctness of a repaired arrow (R5), the mixed-version window (R6), and the incident board itself on PROD (M-1). The PR's own follow-up, "until then the affected board keeps crashing anyone who opens it", has no automated check at all. Only M-2 and M-1 close it.
