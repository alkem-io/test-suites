# QA coverage map

Durable record of what is covered where, by area, and what was proven
absent. Date each row and name the branch searched. Update in place rather
than appending duplicate rows for the same area — correct a stale row if
reality contradicts it.

## Space conversion / promotion (L1↔L0↔L2)

_Searched 2026-09-03, branch `qa/9528-promotion-keeps-flow-states` off
`develop` @ `7cdd17c9`, against server#6418. Updated 2026-09-03 (same date) once
`conversion-test-plan.md`'s automate-now rows (U-1/U-2/NC-1/NC-2/NC-3) landed._

| Area | Status | Evidence |
|---|---|---|
| Basic promotion properties (level, visibility, about, account host, settings, subspaces, roleSet members/leads/admins, license, calendar, community updates) | Full | `server-api/src/functional-api/journey/conversion/convert-L1-to-L0-basic.it-spec.ts` (18 of 20 assertions, unaffected by #6418) |
| Auth negatives for `convertSpaceL1ToSpaceL0` (Space Admin/Member rejected) | Full | same file |
| Innovation-flow state **carry-over** on L1→L0 promotion (names, descriptions, order) | Full | corrected `convert-L1-to-L0-basic.it-spec.ts` › `innovation flow states are carried over verbatim from the L1` (was `...match L0 template`, asserted the bug) |
| Whole-collaboration regression guard (innovationFlow + calloutsSet + timeline unchanged, excl. profile URLs) | Full | un-skipped `convert-L1-to-L0-basic.it-spec.ts` › `collaboration is preserved (excluding profile urls)` |
| Innovation-flow `currentStateID` carry-over when not the first state | Full | `convert-L1-to-L0-flow-states.it-spec.ts` › `currentStateID carried over when not the first state` |
| Per-state `settings` (sidebar incl. explicitly-empty, allowNewCallouts, visible) carry-over verbatim | Full | `convert-L1-to-L0-flow-states.it-spec.ts` › `per-state settings (sidebar) carried over verbatim` |
| Template apply on an L1 subspace → wholesale flow replacement + orphaned-callout re-homing (generic mechanism) | Full | `server-api/src/functional-api/callout/transfer/transfer-callout-template-flow.it-spec.ts` |
| Template apply on an **L0** → same mechanism (R-22) | Full | `journey/conversion/apply-template-l0-wholesale-replace.it-spec.ts` |
| Innovation-flow state-count bounds (1..8) enforcement at API/system level | **Proven absent** — no request-params wrapper exists for `createStateOnInnovationFlow`/`deleteStateOnInnovationFlow`, so no system test can construct an exact-N-state donor. Unit-level only (`innovation.flow.service.spec.ts`, server repo). Manual ACC rows M-3/M-4 (`conversion-manual-verification.md`) | see harness.md tooling gap — still open |
| `moveSpaceL1ToSpaceL0`/`L1ToL2`/`L2ToL1` (cross-L0 move, distinct from convert) | Full for basic/community/rooms/applications/auto-invite/authorization scenarios | `journey/conversion/move-L1-to-*-*.it-spec.ts` — does not touch innovation-flow at all, confirmed by search |
| Callout transfer + differing default flow state names (cross-space) | Full | `callout/transfer/transfer-callout-flow-state.it-spec.ts`, `transfer-callout-changed-flow.it-spec.ts` |

## How to search this area again

`rg -n 'innovationFlow|minimumNumberOfStates|maximumNumberOfStates|L0_FIXED_INNOVATION|L0_MIN_INNOVATION' server-api/src/functional-api` — the conversion/callout-transfer/templates directories are the load-bearing ones; also check the server repo's own `*.spec.ts` unit suites before proposing a new system-level case, several risk-relevant assertions live there only.

---

## Sidebar search widget (055) — designer notes, 2026-09-03

> Written independently by the 055 design session and merged in as-is when the plan was committed as a record; entries may overlap with the sections above.

What is covered by area, and what was **proven absent**. A documented empty result is a finding:
it saves the next run the search. Every row carries the date and the branch it was established on.

A row tells you where to look and what to expect. It never replaces opening the file when a
verdict depends on it.

| Area | State | Where | Established (date / branch) |
|---|---|---|---|
| Global search — categories, filters, location, term limit, space filter, archived spaces, public/private space+subspace visibility matrices | **Covered, strong** (844 lines) | `server-api/src/functional-api/search/search.it-spec.ts` + `search.request.params.ts` | 2026-09-03 · `qa/055-sidebar-search-widget` off `develop` @ `7cdd17c9` |
| Flow-state-scoped / folded-callout search (`searchInFlowStateFilter`, `foldCalloutResources`, category `cursor`) | **None.** 0 hits outside generated types. `lib/…/queries/search/search.graphql` selects `calloutResults` but no `cursor` | — | 2026-09-03 · same |
| Sidebar widget lists (`InnovationFlowState.settings.sidebar`) at any level | **None.** No `lib` query selects `settings`; `getInnovationFlowStatesWithIds.graphql` selects `id displayName` only | — | 2026-09-03 · same |
| `calloutsSet.tags` — the tag list, and its per-callout read authorization | **None.** 0 hits in either suite | — | 2026-09-03 · same |
| Space sidebar contents, E2E | **Blind.** Three specs use `nav[name="Space sidebar"]` purely as a scope (a "Space Leads" text check, a scoped `Add Post` lookup). **No spec asserts a widget list**, so adding a widget invalidates nothing | `public-space/non-member-tab-navigation.spec.ts`, `public-space/non-member-lead-profile-access.spec.ts`, `callouts/pages/CollaborationPage.ts` | 2026-09-03 · same |
| Search UI, E2E | **None.** Every `search` hit under `functional-e2e` is incidental (`research`, `searchVisibility`, member/user pickers) | — | 2026-09-03 · same |
| Banners / visuals / aspect ratios, any level | **None** before 10178; a first floor added by that plan | `client-web/src/functional-e2e/space-banner/`, `server-api/…/visual/` | 2026-09-02 · 10178 |
| Innovation-flow state transitions, callout transfer between states | Covered | `server-api/…/callout/transfer/*.it-spec.ts`, `…/journey/conversion/` | 2026-09-03 · same |
| Migrations — any behavioural claim about pre-existing rows | **None anywhere, structurally.** Owning-repo migration specs are static analysis of the SQL *string* | see `deferred.md` | 2026-09-03 · same |

### Owning-repo unit coverage worth knowing about

Often the right verdict is "covered at unit level, no system case needed". These were opened and
are load-bearing:

| Subject | Owning-repo test | Note |
|---|---|---|
| Sidebar widget placement rule + the four default lists | `server` › `innovation.flow.state.sidebar.defaults.spec.ts` (10-row truth table), `normalize.state.settings.spec.ts`, `innovation.flow.state.service.spec.ts`, `bootstrap.template.space.content.space.l0.sidebar.spec.ts` | pins the **TypeScript** path only — the migration SQL is a second, unbound implementation |
| Migration shape (one UPDATE, null-safe guard, throwing residual, no-op `down()`) | `server` › `src/migrations/__tests__/*.spec.ts` | **static source analysis** — never touches a database |
| Search summary label: sentences, plural forms, literal rendering of user terms and tag names | `client-web` › `SearchMatchSummary.test.tsx` | |
| Debounce incl. clear-then-retype value resurrection | `client-web` › `useDebouncedValue.test.ts` | |
| Search request term construction (one joined term, tags never dropped) | `client-web` › `flowStateSearchDataMapper.test.ts` | |
| Sidebar widget id ↔ wire enum mapping | `client-web` › `sidebarWidgetPlan.test.ts` | |

### Specs that look like coverage but are not

| Thing | Why it is not coverage | Established |
|---|---|---|
| `client-web` repo's own `e2e/specs/*.e2e.spec.ts` tagged **`@forge-acceptance`** | Absent from `ci-test.yml`, **never executed**, and driven by hand-seeded `E2E_*` env fixtures no seeder produces. Read them for locator and copy evidence — they are written from the real DOM — but never cite them as proof | 2026-09-03 · 055 (`sidebarSearchWidget`, `sidebarSearchDefaults`) |
| A migration spec under `src/migrations/__tests__/` | Asserts the text of its own SQL | 2026-09-02 · 10178, reconfirmed 055 |
