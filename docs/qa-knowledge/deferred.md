# Deferred cases

Every deferred case with its blocker, the condition that clears it, and an
owner. Move a row to *Cleared* (with date) once the blocker is gone — don't
re-derive it from scratch in a future run.

## Open

| Case | Story | Blocker | Clears when | Owner |
|---|---|---|---|---|
| System-level (API) test that a 9-state template is rejected on an L0/subspace flow | client-web#9528 / server#6418 | No `createStateOnInnovationFlow`/`deleteStateOnInnovationFlow` request-params wrappers — can't construct an exact 9-state donor | Wrappers added (small, mechanical — see `harness.md`) | test-suites maintainers |
| System-level (API) test that a sub-4-state (e.g. 2-state) template is accepted on an L0 | client-web#9528 / server#6418 | Same wrapper gap | Same | test-suites maintainers |
| Migration `InnovationFlowStateBounds1To8` backfill correctness against ACC's real `settings` row shapes (incl. legacy scalar-null coercion) | client-web#9528 / server#6418 | test-suites has no DB access (GraphQL-only surface) — not a tooling gap that can clear, a standing architectural constraint | Not expected to clear; stays a release-ops SQL check, not test-suites automation | Release verification / DBA |
| Un-skip and re-verify `transfer-callout-template-flow.it-spec.ts`'s two `test.skip` cases ("lands on a valid destination state" / "adopts the destination default state") | pre-existing, unrelated stale-state bug per the file's own header comment | Root-cause bug not identified in this run (out of scope — different story) | Someone triages the referenced stale-state bug | whoever owns callout-transfer |

## Cleared

(none yet)

---

## Sidebar search widget (055) — designer notes, 2026-09-03

> Written independently by the 055 design session and merged in as-is when the plan was committed as a record; entries may overlap with the sections above.

Every case a plan deferred, with its **blocker**, the **clearing condition**, and an owner.

**Check this file at the start of every run.** If a blocker has cleared, the case is now
automatable — reuse it rather than re-deriving it, and move the row to *Cleared* with the date.

### Open

| # | Case | Blocker | Clears when | Owner | Raised |
|---|---|---|---|---|---|
| D-01 | A data migration actually rewrote pre-existing rows, at the ruled position, idempotently, skipping the deliberate no-op rows | **No DB access from `test-suites`.** Every entity these suites create is post-migration, so it exercises the application default path, never the SQL | The owning repo gains a real-database migration integration test (a disposable Postgres + fixture matrix, run twice). For 055 that fixture matrix already exists as an uncommitted verification track — promoting it is the whole job | `server` CI | 2026-09-02 (10178) · re-raised 2026-09-03 (055, migration `1788200000000-AddSearchSidebarWidget`) |
| D-02 | Search backend unreachable → retryable error state, no summary label, typed text retained | **No infra lever from inside a test** — nothing can stop the Elasticsearch container mid-run | The compose harness gains a service-toggle helper a spec can call | test-suites | 2026-09-03 (055, US1-AS14) |
| D-03 | Six-locale copy: the three summary sentences and their plural forms, plus the "Search" Layout-editor label, in bg/de/en/es/fr/nl | Locale assertions have no home in this repo (standing gap) | A `client-web` unit test asserts the new keys beside the locale files | `client-web` | 2026-09-03 (055, FR-014) |
| D-04 | p95 / DB cost of the unbounded `calloutsSet.tags` query, now issued on every tab for every viewer including anonymous | **No load/latency harness for GraphQL read paths.** `load-testing/` is a socket/stress tool, not a query profiler | A query-profiling harness exists, or the follow-up lands that pushes the flow-state filter into the tag query (which would change what to measure) | test-suites / `server` | 2026-09-03 (055, release R-12) |
| D-05 | Screen-reader announcement of a `<output aria-live="polite">` live region; focus order into an always-mounted hidden drawer | **No accessibility harness** — no `axe-core` / `@axe-core/playwright` | An a11y harness is added. Note the drawer focus trap is a known pre-existing 040 defect with its own follow-up, so a test today would pin a bug | test-suites | 2026-09-02 (10178) · re-raised 2026-09-03 (055) |
| D-06 | A client's mirrored copy of a server constant agrees with the server's published value | **No cross-repo contract harness.** Only the server half is pinnable here | The client consumes the value from config at test time, or a contract harness exists | test-suites | 2026-09-02 (10178) |
| D-07 | Sidebar drawer (mobile) and desktop column share one search state across open/close | Two viewport contexts plus an always-mounted drawer whose `Menu` / `Close` locators are unverified against this repo's fixtures; Low risk. Cheap to build once the locators are confirmed on a real run | Someone confirms the drawer's open/close accessible names against the running app | test-suites | 2026-09-03 (055, US1-AS11) |

### Cleared

_None yet._ When a blocker clears, move the row here with the date and the plan that reused it.
