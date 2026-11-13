# Test plan — global search and the Space sidebar search (W2 journey 8)

> **Status:** Draft (built, green locally) · **Depth:** standard (read-only surfaces; the risk is the rebuild returning the wrong set, or leaking across Spaces) · **Source:** `docs/qa/server-rebuild/plan.md` § W2 row 8; client-net audit rows B4 / M1 and § 4 item 24; issue [test-suites#719](https://github.com/alkem-io/test-suites/issues/719)

There is no diff. The basis is the plan, the audit, and product source read at client-web `origin/develop` @ `25ded1467` and server `origin/develop` @ `e120d25a1`. Before this suite **no Playwright spec typed a query** into either search surface: `sidebar-widgets/us1` and `space-settings-write/us3` assert the sidebar's `Search posts` box exists, and `explore-platform/explore-spaces-search-count` (#700) drives the `/spaces` explorer's own search box, which is a different surface. The sidebar widget has a deferred plan (`sidebar-search/sidebar-search-test-plan.md`, TC-01…TC-10, none built) and one manual ACC run.

The journey's oracle (plan row 8): **this run's own run-unique names are found, another run's are not**, with a positive control that makes each absence meaningful.

## How to run

```bash
cd client-web && PW_BROWSER=chromium UI_HEADLESS=true pnpm run test:local-stack --project="Local stack — search"
cd client-web && pnpm exec playwright test --config=config/playwright.config.local-stack.ts src/functional-e2e/search/
```

- **Needs a search backend:** Elasticsearch with the `alkemio-data-*` index templates (`reporting-orchestration/elastic/elk/.scripts/search/`), wired to the server (`ELASTICSEARCH_URL`). Every case is tagged `@local-stack`: the shared test cluster does not run a search backend, so the nightly project `Search` (tier `extended`) excludes all five until it does.
- `beforeAll` rebuilds the index (`ingestSearchFromScratch`), waits for **that ingest task** to finish (lib `readTask`: `COMPLETED`, or the hook fails with the task's errors), then expects the search API, as the viewer, to return **exactly** this run's fixtures. The new indices go live only at the end of the ingest (the aliases swap), which takes minutes on a large database: about 4.5 minutes on the local develop copy. The task wait is bounded by **`SEARCH_INGEST_TIMEOUT_MS`** (default 360 000 ms, lib `searchIngestTimeoutMs()`); a timeout reads "the search ingest did not finish within N ms". `beforeAll`'s own timeout is 150 s plus two ingests.
- **One retry, for a known server defect** (alkem-io/server#6382): two overlapping from-scratch ingests race, and an earlier one that finishes after ours swaps in an index read before our fixtures existed. On a shared backend another user's ingest can do that (it happened once while this file was built: this run's posts were indexed, the other Space was not). If the completed ingest's index lacks the fixtures, the hook ingests once more; a second miss fails the hook.
- The ingest builds new indices and swaps the aliases at the end, so other users of the stack keep searching during it, but each run swaps the index for everyone on that backend. Run the file alone, one worker. Two files that ingest at the same time can still swap in an index built before the other file's fixtures existed; that is why the journey is one file, and why it should not run beside `explore-spaces-search-count` with more than one worker.
- No `KRATOS_ADMIN_URL` needed: nothing joins a Space. The viewer is the harness persona `non.space`, read-only.

## Risk

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | Search finds nothing, or misses a Space, Subspace or post that exists and the user may see (index projection, mapping, or result hydration broken on the rebuild) | Medium (rebuild) | High | **High** | GS-1, GS-2, SB-1 |
| R2 | Search returns things that do not match the query (another run's data, a post without the word) | Medium | Medium | Medium | GS-1, GS-2 |
| R3 | A Space-scoped search returns another Space's content (`searchInSpaceFilter`) | Low-Med | High | **Medium-High** | GS-3, SB-1, SB-2 |
| R4 | The sidebar search ignores the tab: it lists another tab's posts (`searchInFlowStateFilter`) | Medium | Medium | Medium | SB-1, SB-2 |
| R5 | The sidebar's count disagrees with what is listed | Low | Low | Low | SB-1, SB-2 |
| R6 | Clearing the sidebar search leaves the tab filtered | Low | Medium | Low | SB-1 |

Elevated-risk triggers: [x] authorization/visibility (scope filters) · [x] cross-repo contract (client ↔ server ↔ Elasticsearch projection, rebuilt) · [ ] migration · [ ] breaking contract · [x] infra/config (a search backend the test cluster lacks) · [ ] data-destructive · [ ] performance-sensitive.

## Existing coverage before this work

Searched test-suites `origin/develop` @ `ef405cc0` plus #700 rebased on it, for `search(`, `searchInFlowStateFilter`, `FlowStateSearch`, `Platform Search`, `Search posts`, `searchbox`. Every hit was opened.

| Area | State | Evidence |
|---|---|---|
| Global search, API | **Strong.** Categories, filters, the 10-term limit, `searchInSpaceFilter`, archived Spaces, the public/private Space and Subspace visibility matrices | `server-api/…/search/search.it-spec.ts` |
| Spaces total and paging, API + `/spaces` explorer | **Full** for its story | `server-api/…/search/search-spaces-total.it-spec.ts`, `explore-platform/explore-spaces-search-count.spec.ts` (#700) |
| Global search overlay, UI | **None** | — |
| Sidebar search widget, UI | Presence only (no query typed) | `sidebar-widgets/us1-default-rendering`, `space-settings-write/us3` |
| Flow-state scoped search, API | **None** (`searchInFlowStateFilter` had no caller outside generated code) | — |

Reuse: the visibility matrices, the term limit and the Spaces count are not repeated here. 0 existing tests are invalidated.

## Personas and data

`non.space` (member of neither Space) is the viewer of every case and the actor of every lib read-back, so the API and the browser answer the same user. The file seeds two PUBLIC L0 Spaces through `TestScenarioFactory`:

- **mine** — named after `word` = `jeight<uid>`, with one PUBLIC L1. Its first tab holds `J8 <postWord> first` and `J8 control <uid>`; its last tab holds `J8 <postWord> last`.
- **other** — named after `otherWord`, drawn from the same generator: exactly what another run of this file leaves behind. Its first tab holds `J8 <postWord> elsewhere`: the same post word in another Space.

Teardown is `teardownScenario` for both Spaces in the file-level `afterAll`, which also runs after a failed `beforeAll`.

## Scenario → test mapping

Techniques: **EP** equivalence partitions (own / other run; in / out of scope; this tab / other tab) · **DT** scope × location · **UC** use-case walk.

| ID | Scenario | Technique | Oracle | Automated by | Layer |
|---|---|---|---|---|---|
| GS-1 | From `/home`, Search → type this run's word → Enter | EP, UC | No scope chip. The Spaces section lists exactly `l0-<word>-…` and `l1-<word>` (sorted names equal); `otherWord` appears nowhere in the results. Positive control: removing the chip and searching `otherWord` lists exactly the other Space, and `word` appears nowhere | `us1-global-and-sidebar-search.spec.ts` › GS-1 | UI (+ lib in the precondition) |
| GS-2 | From `/home`, search the post word | EP | The Posts section has exactly 3 cards: first, last and elsewhere; the control post (same Space and tab, no word) is absent | › GS-2 | UI |
| GS-3 | Inside my Space, open Search: scope chip "Currently searching: <my Space>"; search the post word, then widen to Entire platform | DT, EP | Scoped: 2 cards (first, last), elsewhere absent. Widened: 3 cards, elsewhere present — the positive control that the scoped absence came from the scope, not the index | › GS-3 | UI |
| SB-1 | My Space, first tab: type the post word into the sidebar's Search posts | EP | Lib (`searchCallouts` with the Space and tab) returns exactly `first`. The summary reads `1 item related to "<postWord>"`; `first` is shown; `last`, `control` and `elsewhere` have no item on the page. Positive controls: before searching, `first` and `control` are in the feed. Clear filters: the summary goes and `control` is back | › SB-1 | UI + lib |
| SB-2 | My Space, last tab: same search | EP | Lib returns exactly `last`. Summary `1 item …`; `last` shown; `first` and `elsewhere` absent | › SB-2 | UI + lib |
| — | Visibility matrices, term limit, archived Spaces, Space-scoped API search | — | — | `server-api/…/search/search.it-spec.ts` | covered (API) |
| — | Spaces total, paging, `/spaces` explorer count | — | — | #700 specs | covered |

The run-unique oracle: `word` and `otherWord` come from `UniqueIDGenerator`, so a search for this run's word that returned any other Space would show a name this run did not create, and the whole-pane `getByText(otherWord)` count catches the other run in any section (Spaces, Organisations, Posts).

### Regression guards

- **GS-1:** the projection drops Subspaces, or hydrates the wrong Space for a hit; or a query matches by prefix / fuzz across run ids.
- **GS-2:** posts are not projected, or framing titles are not searchable.
- **GS-3 / SB-1 / SB-2:** `searchInSpaceFilter` or `searchInFlowStateFilter` ignored on the rebuild — the other Space's post, or the other tab's, would appear.
- **SB-1 clear:** the cleared filter is kept and the tab stays filtered.

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Tag-chip search, the 10-term request shape, burst debounce, `{{matches}}` literal, `N+` convergence | Planned as TC-04, TC-07…TC-09 in the sidebar-search plan; out of J8's oracle | `sidebar-search-test-plan.md` |
| A private Space's content hidden from a non-member in search | Covered at API level by the visibility matrices | `search.it-spec.ts` |
| Users and Organisations categories | Shared personas are not run-unique, so the "found / not found" oracle cannot be built on them without creating users | follow-up (disposable user) |
| Search on the shared test cluster | No Elasticsearch there | ruling S-1 |
| Whiteboard text not searchable | Known product defect server#6457 (SV-15) | sidebar-search manual run |

## Open rulings for the lead

| # | Question | Provisional default |
|---|---|---|
| S-1 | #719 asks for two green runs on test-alkem.io, but the test cluster runs no Elasticsearch (this plan, `sidebar-search` and #700 all say so). Add a search backend to the test cluster, or accept local-stack-only for J8? | local-stack only (`@local-stack`); the nightly project lists the file and runs nothing |
| S-2 | Is a full index rebuild per run acceptable on the shared validation environment the rebuild will use (W3)? | yes on the local stack; revisit for W3 (an incremental ingest or a test-only reindex would be cheaper) |

## Build notes (2026-11-12)

Built uncommitted on `qa/w2-journey-8` (= #700 rebased on `develop`). New lib function `searchCallouts` (folded callout search with optional Space and tab scope), exported from the barrel and listed in the lib contract with `ingestSearchFromScratch` and `searchSpacesAndSubspaces`.

**Search backend.** The local develop server is wired to the sandbox Elasticsearch (its own `alkemio-data-<user>-` index pattern). A from-scratch ingest of the local copy takes about 4.5 minutes (≈435 Spaces, 1 400 Subspaces, 12 000 callouts). The first build polled for 150 s and so always timed out before the alias swap; the wait is now on the ingest task, bounded by `SEARCH_INGEST_TIMEOUT_MS`. #700's `explore-spaces-search-count` and `search-spaces-total.it-spec.ts` had the same 120 s poll and now use `searchIngestTimeoutMs()` too.

**Locators.** Written from client-web source, then checked on the first live run: all matched (dialog "Platform Search", regions "Search results" / "Spaces results" / "Posts results", the "Search input" box and the "Active search terms" chips, the scope button "Change search scope. Currently searching: …", the sidebar's "Search posts" searchbox, its `status` summary and "Clear filters"). No locator changes were needed.

**Local runs** (chromium, headless, one worker, the file alone): two consecutive runs on 2026-11-12, **5/5 passed** each (5.1 min, almost all of it the ingest), no retry needed; teardown removed both Space trees each time and no Space or organisation named `jeight*` was left (anonymous `spaces` / `organizations` read). An earlier run with the task wait in place was also 5/5 (5.3 min).

**Red-proof** (one sabotage per case, run once, then restored byte-identical; a failed case restarts the worker, so each re-seeded and re-ingested):

| Case | Sabotage | Failed at |
|---|---|---|
| GS-1 | searches the other run's word where this run's is expected (a server returning another run's Space) | the Spaces names poll: expected `[l0-<word>-…, l1-<word>]`, received `[l0-<otherWord>-…]` |
| GS-2 | adds a second term the control post carries (a post without the word returned) | `cards` `toHaveCount(3)`: received 4 |
| GS-3 | widens the scope to Entire platform before searching (the Space scope ignored) | `cards` `toHaveCount(2)`: received 3 |
| SB-1 | asserts the hit's own item absent (proves the by-id absence check sees rendered search results) | `postItem(first)` `toHaveCount(0)`: received 1 |
| SB-2 | read-back without the tab filter (`searchInFlowStateFilter` dropped) | `postIdsFoundFor` `toEqual([last])`: received `[first, last]` |

**Product observations.** No product defect found. The first red-proof run hit the overlapping-ingest race (server#6382) on the shared backend, which is why the retry exists; a later run hit one transient 502 while the server restarted, which the task wait now retries.
