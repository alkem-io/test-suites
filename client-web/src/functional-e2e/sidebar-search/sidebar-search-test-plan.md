# Test plan — Sidebar search widget (10167)

> **Status:** Approved as a record — QA lead, 2026-09-03; **automation deferred** (the ten automate-now cases need a compose stack with Elasticsearch, which the shared test environment does not provide — see `docs/qa-knowledge/deferred.md`) · **Depth:** standard — forced by the QA lead; the evidence argues **deep**
> (4 elevated-risk triggers), see *Residual risk* · **Story:**
> [client-web#10167](https://github.com/alkem-io/client-web/issues/10167) ·
> **Release:** [alkem-io/alkemio#2111](https://github.com/alkem-io/alkemio/issues/2111) (Release 74) ·
> **Basis:** workspace spec `055-sidebar-search-widget` (spec.md, contracts, data-model) + the three
> merged diffs — [server#6448](https://github.com/alkem-io/server/pull/6448),
> [client-web#10253](https://github.com/alkem-io/client-web/pull/10253),
> [client-web#10256](https://github.com/alkem-io/client-web/pull/10256). All three read in full.

Search moved out of the Knowledge Base tab's content area into a sidebar `search` widget available
on **every** tab: a debounced text field, tag chips, and a gray match-summary label with a clear X.
One additive `SEARCH` enum value, four new default sidebar lists, and a data-only migration that
inserts `search` into every stored non-empty list. `test-suites` had **zero** coverage of sidebar
widget lists, flow-state search, or callout tag lists at any level — this is a first floor under
the area, not an extension of one, and its headline claim is deliberately narrow: the migration
half is **not reachable from this repo**.

## How to run

```bash
# API — the existing `search` vitest project picks the new files up
cd server-api && pnpm exec vitest run --project search --fileParallelism=false
# (there is NO `test:search` script — only `test:search:ui`; the root CLAUDE.md is stale here)

# E2E — Chrome branded channel, headless
cd client-web && UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/sidebar-search/
```

Prerequisites: `.env` in both packages; a **search backend (Elasticsearch) in the local compose
stack** — without it every case below fails for the wrong reason; `server-api` runs serially and
re-ingests via `adminSearchIngestFromScratch()` + a settle delay (the pattern in
`search/search.it-spec.ts`); the stack must have run migration `1788200000000-AddSearchSidebarWidget`.
`lib/src/core/generated/alkemio-schema.ts` is **stale** — it has no `Search = "SEARCH"`; codegen
against the merged server schema is a prerequisite for TC-01/TC-02.

## Risk

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A tab has **no search at all** — the in-content row is deleted and the stored list lacks `search` (migration missed the row, or an admin had emptied it) | Medium | High | **High** | TC-01, TC-02, TC-06, MAN-2, MAN-3 |
| R2 | The placement rule is implemented **twice** (TS `insertSearchWidget()` + migration SQL) with nothing binding them — an upgraded Space shows Search in a different slot than one created after (release R-16) | Medium | Medium | **Medium** | TC-01, TC-02, MAN-2 |
| R3 | A keystroke burst floods the search backend — the uncapped eager short-page confirmation chained sequential requests on one keystroke; now live on Home for anonymous traffic (release R-17) | Medium | High | **High** | TC-07, MAN-1 |
| R4 | Markup-shaped input corrupts the label — `<Trans values>` re-interpolated, so typing `{{matches}}` was substituted with the count, and a tag named `<img …>` rendered as pseudo-markup (release R-17) | Medium | Medium | **Med-High** | TC-08, MAN-1 |
| R5 | The count never converges — sticks at `N+` with every card rendered, or inflates on folded duplicates | Medium | Medium | **Medium** | TC-09, MAN-1 |
| R6 | `CalloutsSetTags` — an unbounded query — is now issued on **every** tab for **every** viewer including anonymous, degrading p95/DB, or exposing tags of callouts the viewer cannot read (release R-12, FR-017) | High | High | **High** | TC-03, TC-10, MAN-4 |
| R7 | Results leak across Spaces or flow states — the new `searchInSpaceFilter` is the only bound, and A-6 admits a residual within-Space leak for unstamped documents | Low-Med | High | **Medium** | TC-05 |
| R8 | Rolling-deploy vocabulary skew: an old server drops `search` on read, an old client carries it opaquely | Low | Medium | Low-Med | not automated — deploy-order row |

Elevated-risk triggers present: **migration** (data-only, no DDL) · **authorization/visibility**
(FR-017: the tag list and results now reachable by anonymous on every tab) · **cross-repo contract**
(server enum → client `WIDGET_ID_TO_WIRE`; the placement rule duplicated across TS and SQL) ·
**performance-sensitive path** (R6, R3). Absent: breaking contract change, infra/config,
data-destructive (`down()` is an intentional no-op).

## Existing coverage before this work

Searched branch `qa/055-sidebar-search-widget` off `develop` @ `7cdd17c9`, across `server-api/src`,
`client-web/src`, `lib/src` (generated excluded), by entity (`SidebarWidget`, `CalloutsSet`),
operation (`FlowStateSearch`, `CalloutsSetTags`, `search`), field (`sidebar`, `searchInFlowStateFilter`,
`foldCalloutResources`, `tags`) and user-visible copy (`Search posts`, `items related to`,
`Space sidebar`). Every candidate below was opened.

| Area | State | Evidence |
|---|---|---|
| Sidebar widget lists, any level | **None.** `sidebar` has 0 functional hits in `server-api/src` and `lib/src`; `settings { sidebar }` is selected by no query in `lib` | `lib/…/queries/innovation-flow/getInnovationFlowStatesWithIds.graphql` selects `id displayName` only |
| Flow-state / folded-callout search | **None.** `searchInFlowStateFilter`, `foldCalloutResources` and the category `cursor` have **0** hits outside generated types; `lib/…/queries/search/search.graphql` selects `calloutResults` but **no cursor** | `lib/src/scenario/graphql/queries/search/search.graphql` |
| Global search | **Strong, and adjacent.** Categories, filters, location, the 10-term limit, invalid terms, `searchInSpaceFilter`, archived spaces, and the public/private space+subspace visibility matrices | `server-api/src/functional-api/search/search.it-spec.ts` (844 lines, opened) |
| `calloutsSet.tags` authorization | **None.** 0 hits anywhere in the suites | — |
| Space sidebar, E2E | Present but **blind to its contents**: three specs use `nav[name="Space sidebar"]` only as a scope — "Space Leads" text, a scoped `Add Post` lookup. **No spec asserts a widget list**, so none is invalidated | `public-space/non-member-tab-navigation.spec.ts`, `public-space/non-member-lead-profile-access.spec.ts`, `callouts/pages/CollaborationPage.ts` |
| Search, E2E | **None.** Every `search` hit is incidental (`research`, `searchVisibility`, member pickers) | grep over `client-web/src/functional-e2e` |
| Owning-repo unit suites | **Strong, and they close four scenarios.** server: the 10-row `insertSearchWidget` truth table + the four default literals, `normalizeStateSettings`, the create default, the resolver shape, the bootstrap L0 template. client-web: `SearchMatchSummary.test.tsx` (plurals, literal text), `useDebouncedValue.test.ts` (incl. the clear-then-retype regression), `useFlowStateSearch.test.tsx`, `flowStateSearchDataMapper.test.ts`, `sidebarWidgetPlan.test.ts` | all opened via the diffs |
| ⚠ Migration | **Static analysis only.** `1788200000000-AddSearchSidebarWidget.spec.ts` reads the migration's *source string* — guard shape, one UPDATE, throwing residual, no-op `down()`. It never touches a database. The real-DB fixture run was a one-off verification track, deliberately **not committed** (spec D-08) | `server/src/migrations/__tests__/` |
| ⚠ client-web `e2e/specs/sidebarSearch*.e2e.spec.ts` | **Not coverage.** Both are `@forge-acceptance`, absent from `ci-test.yml`, **never executed**, and driven by hand-seeded env fixtures (`E2E_SPACE_URL` needing ≥12 "report" posts, named tags, an unsafe-tag post, a second Space) that no seeder produces. Read as a specification of the walk — reused below as locator evidence, never cited as proof | client-web `e2e/specs/` |

**Reuse: 5 of 15 scenarios needed no new test** — the placement rule's TS half, the label copy and
plural forms, the debounce hook, the client request-term shaping, and the 10-term server limit are
all fully covered where they live. **0 existing tests are invalidated** (nothing in this repo
asserts a sidebar list, the removed content row, or the old `Search...` placeholder). Confirmed
unaffected: the three specs that scope to `Space sidebar` — all use scoped lookups that stay
correct with one more widget in the column.

## Scenario → test mapping

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| TC-01 A Space created from the platform default template stores `search` at index **3 / 2 / 3 / 3** on tabs 1–4 | AC1, R1, R2 | planned — see build sheet | API |
| TC-02 A newly added tab stores the generic default `[intent, createPost, applicationButton, search, index]` | R1, R2 | planned — see build sheet | API |
| TC-03 `calloutsSet.tags` never returns a tag that only a callout the viewer cannot read carries (anonymous + non-member) | FR-017, R6 | planned — see build sheet | API |
| TC-04 The widget's exact request — one joined term of a 12-word sentence + 10 tags, flow-state + Space filters, folded — returns results, never the 10-term error | AC2, R3, R7 | planned — see build sheet | API |
| TC-05 A flow-state-scoped search in Space A never returns Space B's callout (with a positive control in B) | AC2, R7 | planned — see build sheet | API |
| TC-06 The sidebar search field is on all four tabs, is the **only** search field on the page, and the X restores the browse feed | AC1, **AC3**, R1 | planned — see build sheet | E2E |
| TC-07 A 5-keystroke burst issues **at most 2** `FlowStateSearch` requests, never one per key | R3 | planned — see build sheet | E2E |
| TC-08 Typing `{{matches}}` quotes it verbatim in the label; no substitution, no dialog | R4 | planned — see build sheet | E2E |
| TC-09 The count reads `N+` while paging and the exact `N` once the last page has loaded | R5 | planned — see build sheet | E2E |
| TC-10 A tab with the widget removed issues **0** `CalloutsSetTags` and **0** `FlowStateSearch` requests | R6, SC-005 | planned — see build sheet | E2E |
| Placement rule (10-row truth table), the four default literals, read-normalization fallback | R2 | **covered** — server › `innovation.flow.state.sidebar.defaults.spec.ts`, `normalize.state.settings.spec.ts` | unit |
| Label sentences, plural forms, literal-text rendering of terms and tag names | R4 | **covered** — client-web › `SearchMatchSummary.test.tsx` | unit |
| Debounce, and the clear-then-retype value resurrection | R3 | **covered** — client-web › `useDebouncedValue.test.ts` | unit |
| One joined term at any tag count; tags never dropped | AC2 | **covered** — client-web › `flowStateSearchDataMapper.test.ts` | unit |
| The server enforces a 10-term maximum | AC2 | **covered** — `search.it-spec.ts › should throw limit error for too many terms` | API (existing) |

### Regression guards

- **TC-07** pins the defect #10256 fixed: the eager short-page confirmation was **uncapped**, so a
  single keystroke could chain sequential `FlowStateSearch` requests until a full or empty page
  arrived. The fix allows exactly one confirmation per term/tag set. TC-07 fails if that cap is lost.
- **TC-08** pins the `<Trans values>` re-interpolation defect: `<Trans>` interpolates its text nodes
  a *second* time after `t()`, so a user-typed `{{matches}}` was substituted with the count. The fix
  renders the term through a component prop instead of an interpolation value. TC-08 fails on a
  revert to `values={{ text }}`.
- **TC-06's single-field assertion** pins AC3: the in-content search row and `FlowStateSearchField`
  are deleted. A count of 2 means the row came back — or that a second widget instance mounted.

## Manual verification — to run on **dev-alkem.io** (`https://dev.alkem.io`)

Log in as a user who **administers** a top-level Space with the four default tabs and ≥ 12 posts.
For every row that reads network evidence: open DevTools → **Network**, filter `graphql`, tick
*Preserve log*, and read the `operationName` in each POST's request payload
(`/api/private/graphql`). The two operations that matter are **`FlowStateSearch`** and
**`CalloutsSetTags`**.

| # | Row | Steps and expected outcome |
|---|---|---|
| **MAN-1** | **R-17 search-widget acceptance walk** (release HARD GATE) | **(a) Burst.** Home tab. Clear the Network log. Click the sidebar field (placeholder `Search posts...`) and type `clima` as five fast keystrokes (< 300 ms apart), then stop. **Expect: 1 or 2 `FlowStateSearch` POSTs — never 5.** Two is correct only when the first page came back short; more than two is a ⛔ blocker (the uncapped-confirmation regression). The gray label must quote **`"clima"`** — the term actually searched — not `clim` or `climate`. **(b) Convergence.** Clear the field, type a term matching more than 10 posts (e.g. `report`), wait for results. **Expect the label to read `N+ items related to "report"`.** Now scroll the results to the very bottom until no more cards load. **Expect the label to settle to an exact `N items related to "report"`, and `N` to equal the number of result cards on screen.** A label still reading `N+` with no more cards is a ⛔ blocker (the paging deadlock). **(c) Literal terms.** Clear, then type exactly `{{matches}}`. **Expect the label to read `0 items related to "{{matches}}"`** — the braces shown verbatim. If a number appears where you typed the braces, that is the re-interpolation defect and a ⛔ blocker. Repeat with `<b>bold</b>`: it must appear as literal text, with no bold rendering and no JS dialog. |
| **MAN-2** | **R-16 sidebar-position spot check** (the rule is implemented twice) | Walk tabs 1–4 of the Space and read the sidebar column top to bottom. **Expect Search to sit: tab 1 (Home) immediately after `Add Post`; tab 2 (Community) immediately after `Add Post`; tab 3 (Subspaces) immediately after `Create Subspace` **and** `Add Post` (i.e. after the last of them); tab 4 (Knowledge) immediately **before** `Post Index`.** Counting from 0 those are stored indices **3, 2, 3, 3**. Then confirm the *other* provenance: create a brand-new top-level Space and repeat — the four positions must be identical. A difference between the upgraded Space and the fresh one is R-16 realised and a ⛔ blocker. |
| **MAN-3** | **R-13 emptied-sidebar check** (ruled, intentional — verify it is survivable) | Space Settings → **Layout** → open a phase's Layout dialog and **remove every widget** from one tab; save. Open that tab as a member. **Expect: no sidebar column and — critically — no search field anywhere on the page, including the content area.** That tab now has no way to search. Then reopen Settings → Layout, re-add **Search** to that tab, save, reopen the tab. **Expect the search field to be back and working.** Confirms the documented recovery path exists; note in the release story if the copy does not warn admins. |
| **MAN-4** | **R-12 tag-query load observation** | Clear the Network log, open the Space's Home tab **in a private window while signed out**. **Expect exactly one `CalloutsSetTags` POST**, and note its duration. Repeat on each of the four tabs — one per tab load, none on a tab whose widget was removed (MAN-3's tab). Record the four durations in the release story. Anything above ~1 s on dev is worth escalating before the production deploy; this query is unbounded by design and `maxRows={2}` bounds only the *rendering*. Also confirm no `CalloutsSetTags` fires on a **subspace** page (the widget is dormant there). |
| **MAN-5** | **a11y + mobile drawer pass** | Narrow the browser below the desktop breakpoint, open the sidebar drawer, type `climate`, close the drawer. **Expect results in the main area**; reopen the drawer — **the field still shows `climate` and the label is present** (both copies share one state). Then, at desktop width, use a screen reader (or the browser's accessibility inspector) on the summary strip: it is an `<output aria-live="polite">`, so **the sentence should be announced when the count changes**. Known pre-existing defect, **not** a blocker: below the breakpoint the closed drawer's search input is still keyboard-focusable (a 040 issue, deliberately not fixed here). |

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| The migration actually inserted `search` into pre-existing rows, at the ruled index, idempotently, and skipped `[]` | **No DB access from `test-suites`** (standing gap), and every Space this repo creates is post-migration, so it exercises the TS path only — never the SQL. The server's committed spec asserts the SQL's *text*; the real-DB fixture run was deliberately not committed | **manual** — MAN-2 / MAN-3, plus **deferred** to `server` CI: the real-DB fixture matrix of spec D-08 should be promoted to a committed integration test. R2 has no automated cover anywhere today |
| Search backend unreachable → retryable error state, no label, typed text kept (US1-AS14) | Needs an infra lever — stopping the Elasticsearch container mid-run — that neither suite has; Playwright cannot reach it | **deferred** — blocker: no orchestration hook to stop a stack dependency from a test. Clears if the compose harness gains a service-toggle helper |
| The six-locale summary sentences and the "Search" editor label | Locale assertions belong beside the locale files (standing gap); `space.parity.test.ts` already covers the namespace's shape, not the new keys' text | **deferred** — a `client-web` unit test |
| p95 / DB load of `CalloutsSetTags` at realistic volume (R6) | No load harness for GraphQL read paths — `load-testing/` is a socket/stress tool for messaging, not query profiling. Building one is disproportionate to one query | **manual** — MAN-4, then post-deploy monitoring per the release story |
| Screen-reader announcement of the live region; the drawer focus trap | No `axe-core`/`@axe-core/playwright` in the repo (standing gap, same blocker as the 10178 plan's R6); the drawer trap is a known pre-existing 040 defect with its own follow-up | **manual** — MAN-5 |
| Rolling-deploy vocabulary skew (R8) | Not a test — a deploy-ordering property. Server-first with the migration Job before client-web; both directions were reasoned safe | **manual** — deploy-order row in the release checklist |
| Tag-chip overflow ("+N"), chip freshness after creating a post | Presentational, Low risk, and chip freshness is a deliberate ruling (A-11: no refetch) — a test would pin an accepted limitation, not a requirement | **manual/exploratory** — fold into MAN-1 if time allows |

**Residual risk.** The evidence supports **deep**: four elevated triggers, two repos, a migration
*and* an authorization surface. Standard was set explicitly by the QA lead and honoured — no
exploratory charters, one line per non-functional dimension, and the non-functional sweep folded
into TC-03/TC-10/MAN-4 rather than run separately. The cost is known and small: deep would have
added charters around tag-chip overflow and around a Space whose admin has heavily customised
every tab, and a fuller a11y sweep. It would **not** have closed R2 — no depth of planning gives
this repo a database.

**What this plan genuinely proves, once built:** that a Space created after the upgrade carries
`search` in the ruled slot on all four tabs and on any new tab; that the tag list respects
per-callout read authorization for anonymous and non-member viewers; that the widget's real request
shape survives a 12-word query with ten tags without tripping the term limit; that results never
cross a Space boundary; that search is on every tab and is the only search field left on the page;
and that the two defects #10256 fixed — request amplification and label re-interpolation — stay
fixed. **What it does not prove:** that the migration changed a single pre-existing row, or put
`search` in the slot the TypeScript rule would have chosen. R1 and R2 — the reason the server change
exists — are covered only for Spaces created *after* the deploy; for every Space that existed
before, the promise rests on a migration this repo cannot observe, whose only automated test reads
the text of its own SQL. **MAN-2 is therefore not a spot check in the casual sense: it is the only
execution-based evidence for R2 that will exist.**
