# QA harness notes

Where suites live, standing tooling gaps, environment quirks, and gotchas
discovered while designing/implementing plans. Correct stale entries in
place; cite this file instead of rediscovering a gap.

## Where things live

- Server-API functional specs: `server-api/src/functional-api/<domain>/*.it-spec.ts` (vitest, ESM).
- Shared GraphQL operations/fragments: `lib/src/scenario/graphql/{queries,mutations,fragments}/**/*.graphql`, consumed via generated types in `lib/src/core/generated/alkemio-schema.ts` — run `pnpm --filter @alkemio/tests-lib run codegen` then the server-api package's own codegen after editing any `.graphql` file.
- Domain-specific request wrappers: `server-api/src/functional-api/<domain>/<domain>.request.params.ts` — thin functions around `getGraphqlClient()` + `graphqlErrorWrapper`. A schema field/mutation existing does NOT mean it's reachable from a test — check for a `.graphql` operation file AND a request-params wrapper before assuming a case is buildable.
- Feature-area test plans for `server-api`-only features: no existing convention found as of 2026-09-03 (first one written: `server-api/src/functional-api/journey/conversion/conversion-test-plan.md`, following the client-web house format). Client-web plans are split across `plans/`, the feature directory, and `functional-e2e/` root — check all three.
- `test-suites/docs/qa-knowledge/` did not exist before 2026-09-03 (this run created it).

## Standing tooling gaps

- **No `createStateOnInnovationFlow` / `deleteStateOnInnovationFlow` request-params wrappers**, despite both mutations existing in the generated schema (`lib/src/core/generated/alkemio-schema.ts`). This blocks building a donor space/template with an *exact* custom state count (e.g. exactly 2 or exactly 9 states) at the API level — the only levers available are the platform's default templates (4 states for L0, 5 for a subspace) and renaming existing states via `updateInnovationFlowState`, which changes names but not counts. Any future case needing a precise state-count boundary (1..8 enforcement, template min/max) is blocked on this until someone adds the wrappers. Cleared once: the `.graphql` mutation files + request-params wrappers exist (small, mechanical — follow the pattern of `updateInnovationFlowState`). Still open as of 2026-09-03 — out of scope for the conversion plan's automate-now rows (M-3/M-4 stay manual).
- ~~`InnovationFlowStateData` fragment only selects `description` + `displayName`~~ — **cleared 2026-09-03** (test-suites PR implementing `conversion-test-plan.md`'s NC-1/NC-2). The fragment (`lib/src/scenario/graphql/fragments/innovation-flow/innovation-flow-state.graphql`) now also selects `id`, `sortOrder`, and `settings { allowNewCallouts descriptionDisplayMode showPublishDetails sidebar visible }`. Every consumer of `InnovationFlowStateData` (states AND currentState, on both `getSpaceData` and the conversion mutations) gets these fields for free.
- ~~`getInnovationFlowStatesWithIds` query only selects `id` + `displayName`~~ — **cleared 2026-09-03**, same PR. The query now also selects `sortOrder` and `settings { sidebar }` (kept minimal — it's a setup/ID-lookup query; use `getSpaceData` if a test needs the full per-state settings before conversion).
- ~~`updateInnovationFlowCurrentState` mutation has a `.graphql` file but zero request-params consumers~~ — **cleared 2026-09-03**, same PR. Wrapper added in `server-api/src/functional-api/innovation-flow/innovation-flow.request.params.ts`: `updateInnovationFlowCurrentState(innovationFlowId, currentStateID, userRole?)`.
- ~~`updateInnovationFlowState` wrapper doesn't expose the mutation's `settings` argument~~ — **cleared 2026-09-03**, same PR. `updateInnovationFlowState(innovationFlowStateID, displayName?, description?, settings?, userRole?)` — `displayName`/`description` are now optional too (previously `description` defaulted to `'Updated state'` even when omitted; omitting it now correctly leaves the stored value unchanged, matching the mutation's own contract). Verified the only two pre-existing callers (`transfer-callout-changed-flow.it-spec.ts`, `transfer-callout-template-flow.it-spec.ts`) don't assert on the old default.
- **`createCalloutOnCalloutsSet`'s TypeScript `options` type didn't expose `classification`** even though the underlying `CreateCalloutOnCalloutsSetInput` always supported it — the fixture-pattern note below describing this as "reusable directly in tests" was aspirational, not yet true. **Cleared 2026-09-03**, same PR: `classification?: { tagsets: { name: TagsetReservedName; tags?: string[] }[] }` added to the wrapper's options type.
- **test-suites has no DB access** (GraphQL-only surface) for this domain's specs — any assertion that needs to inspect raw table shape (e.g. verifying a migration's JSONB backfill against legacy scalar-null rows) is out of reach for automation here and belongs to release-ops SQL verification instead. Still standing — architectural, not expected to clear.

## Fixture patterns worth reusing

- **Building a "flow-replacing" template for an existing space**: take a donor space, rename its states via `updateInnovationFlowState` to deliberately different names (so no state-name collision with the target), then `createTemplateFromSpace(donorSpaceId, donorTemplateSetId, name)`, then `updateCollaborationFromSpaceTemplate(targetCollaborationId, templateId)`. Demonstrated in `callout/transfer/transfer-callout-template-flow.it-spec.ts` (L1 target) and `journey/conversion/apply-template-l0-wholesale-replace.it-spec.ts` (L0 target — R-22). This is the only currently-buildable way to exercise "apply a template with a different state *set*" — it cannot control the exact state *count*.
- **Classifying a callout into a specific flow phase at creation**: `createCalloutOnCalloutsSet(..., { classification: { tagsets: [{ name: TagsetReservedName.FlowState, tags: [<phase displayName>] }] } })` — used by the platform's own bootstrap L0 template definition (`server/src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts`) and reusable directly in tests since 2026-09-03 (see cleared gap above). Demonstrated in `apply-template-l0-wholesale-replace.it-spec.ts`.
- **A `TestScenarioConfig` with no `space` key creates NO space at all** (`createBaseScenarioPrivate` returns early when `scenarioConfig.space` is falsy), and a `space` with no `subspace` key creates the L0 only, no L1. Always pass at least `space: {}` (L0-only scenario) or `space: { subspace: {} }` (L0 + L1) explicitly — an empty `{ name: '...' }` config silently yields empty IDs on `baseScenario.space`/`.subspace`, which then fail downstream as an opaque "Invalid value supplied for a GraphQL variable" rather than a clear setup error.

## Environment / gotchas

- `test.skip` left in a spec sometimes encodes a *known, tracked* bug rather than flakiness — read the comment above it before assuming it's safe to leave skipped once the referenced issue ships. `convert-L1-to-L0-basic.it-spec.ts` had exactly this pattern for client-web#9528.
- Sibling repo clones under the workspace root can be on an unrelated branch (observed: `server/` clone on `fix/move-space-recompute-platform-roles-access`, not `develop`) — always check `git log --oneline --all | grep <issue#>` rather than assuming the checked-out branch is current; the target commit is usually still reachable via `git log --all`.

---

## Sidebar search widget (055) — designer notes, 2026-09-03

> Written independently by the 055 design session and merged in as-is when the plan was committed as a record; entries may overlap with the sections above.

What is durably true about the `test-suites` harness. Not feature notes: the test for a line
here is *would it help someone designing a different feature?* Correct anything you find stale
and say so in your report.

> Created 2026-09-03 during the 055 sidebar-search plan. Rows carry the date and the branch they
> were established on. Reality beats a row — if they disagree, fix the row.

### Where suites live

| Suite | Path | Runner | Notes |
|---|---|---|---|
| API | `server-api/src/functional-api/<domain>/*.it-spec.ts` | vitest | one project per domain in `server-api/vitest.config.ts`; a new file in an existing domain directory is picked up with no config change |
| E2E | `client-web/src/functional-e2e/<area>/*.spec.ts` | Playwright | Chrome **branded channel**, not Chromium |
| Shared | `lib/src` (`@alkemio/tests-lib`) | — | CommonJS; consumed by both via `workspace:*` |

A new E2E feature area = its own directory under `functional-e2e/`, listed in `CLAUDE.md`, with
`<area>-test-plan.md` **inside it**. Older plans also live in `plans/` and at the `functional-e2e/`
root — look in all three before concluding an area has none.

### Standing gaps (cite these, do not rediscover them)

| Gap | Consequence for a plan | Established |
|---|---|---|
| **No database access from `test-suites`** | Any claim about what a migration did to *pre-existing* rows is unreachable. Every entity these suites create is post-migration, so it exercises the application's default path, never the migration SQL. Route to manual or defer to the owning repo's CI | 2026-09-02 (10178), reconfirmed 2026-09-03 (055) |
| **No accessibility harness** — no `axe-core` / `@axe-core/playwright` | Screen-reader semantics, focus order, contrast and live-region announcements cannot be automated. Route to a manual release-checklist row | 2026-09-02 (10178), reconfirmed 2026-09-03 (055) |
| **No load/latency harness for GraphQL read paths** | `load-testing/` is a socket/stress tool (`stress-test.ts`, `service.socket.ts`), not a query profiler. p95 claims about a query are manual observation or post-deploy monitoring | 2026-09-03 (055) |
| **No infra lever from inside a test** | A test cannot stop a stack dependency (Elasticsearch, RabbitMQ) mid-run, so "backend unavailable → error state" cases are deferred, not manual. Clears if the compose harness ever gains a service-toggle helper | 2026-09-03 (055) |
| **Locale assertions have no home** | Six-locale copy checks belong beside the locale files in the owning repo, not here | 2026-09-02 (10178) |
| **No cross-repo contract harness** | When a client mirrors a server constant as a local literal, only the server half is pinnable here | 2026-09-02 (10178) |

### Tooling gotchas

- **`lib` generated types drift.** `lib/src/core/generated/alkemio-schema.ts` is a committed
  artifact and is regularly **behind** the merged server schema. Check for the specific enum
  value / field you intend to assert on **before** planning a case; if it is missing, `pnpm --filter
  @alkemio/tests-lib run codegen` is a prerequisite task, not a detail. *(2026-09-03: it had no
  `Search = "SEARCH"` in `SidebarWidget` days after server#6448 merged.)*
- **`rg -rn` silently means `--replace n`** and corrupts output. Always `rg -n`.
- **`gh pr diff` has no `--name-only`** in the installed version; use
  `gh pr view <n> --json files -q '.files[].path'`.
- **`server-api/package.json` scripts are not uniform.** Several projects have only a `:ui` script
  (e.g. `test:search:ui` exists, `test:search` does **not**), and the root `CLAUDE.md` lists some
  that are absent. Verify the script before writing a *How to run* block; the portable form is
  `cd server-api && pnpm exec vitest run --project <name> --fileParallelism=false`.
- **Widening a shared `lib` GraphQL document breaks unrelated specs.** When a case needs an extra
  field, add a **new** document rather than editing one other specs assert the shape of.

### Reusable patterns

- **Anonymous API calls:** `postGraphqlRaw(query, undefined, variables)` from
  `server-api/src/functional-api/graphql-guard/me-degradation.request.params.ts` — omitting the
  bearer is the anonymous lever. Do not build a second anonymous client. It also returns the raw
  status, which is what an authorization negative usually needs to assert.
- **Search re-ingest:** search assertions are only meaningful after
  `adminSearchIngestFromScratch()` followed by a settle delay (`delay(15000)` is the established
  value in `search/search.it-spec.ts`). A search assertion made before re-ingest passes or fails
  for the wrong reason. Any suite touching search needs an Elasticsearch backend in the stack.
- **Scenario data:** `TestScenarioFactory.createBaseScenario(config)` with
  `collaboration.addPostCollectionCallout` builds org → space → subspace → subsubspace with role
  memberships. `createSpaceBasicData(..., addTutorialCallouts=false, ...)` passes no
  `innovationFlowData`, so the Space inherits the **platform default L0 template** — that is the
  way to test create-time defaults.
- **E2E auth:** the session fixture (`fixtures/authenticated-session.fixture.ts`) logs each persona
  in **once per run** and persists storage state to `.auth/`. Use it. The one area that legitimately
  does not is `messaging-notifications`, which needs brand-new accounts for settings defaults.
- **Positive controls.** Every "must not appear" assertion in this repo needs a paired assertion
  proving the thing exists somewhere — otherwise a misspelt fixture, a stale index, or a renamed
  operation makes the negative pass forever. This has bitten cross-Space search scoping and
  request-count assertions alike.

### Client-web / CRD locator conventions

- The Space sidebar is `<nav aria-label="Space sidebar">`; a **sub**space sidebar is
  `<aside aria-label="SubSpace sidebar">` (role `complementary`), so one `getByRole('navigation')`
  cannot cover both — `callouts/pages/CollaborationPage.ts` uses an attribute locator for that.
- The sidebar subtree is **mounted twice** (desktop column + always-mounted mobile drawer). At
  desktop width the drawer copy is `display:none`, so visibility-respecting locators see one. A
  count of 2 at desktop width is a product finding, not a locator bug.
- Radix popover/disclosure contents are **portalled to `document.body`**, outside the owning
  landmark — do not scope a locator to the sidebar when the element can be in an overflow popover.
- `<input type="search">` has role **`searchbox`**, never `textbox`.
- `<output>` has implicit role **`status`** — the way to find a CRD live region.
- Prefer role + accessible name over CSS or `data-testid`; the accessible name usually comes from a
  translation key, so read the locale JSON in the diff rather than guessing the string.
