# Test plan — Space conversion: L1→L0 keeps the flow (client-web#9528 / server#6418)

> **Status:** Approved — QA lead, in-session, 2026-09-03 · **Depth:** Standard — QA-lead directive, see rationale below · **Story:** [client-web#9528](https://github.com/alkem-io/client-web/issues/9528) · server#6418 (merged) · Release 74 ([alkem-io/alkemio#2111](https://github.com/alkem-io/alkemio/issues/2111))

Promoting an L1 subspace to L0 used to discard its innovation-flow states and
reset the space to the platform's 4 default phases (Home/Community/Subspaces/
Knowledge). server#6418 keeps the L1's states verbatim — names, descriptions,
order, per-state settings (sidebar, visibility), and `currentStateID` — and
only re-stamps the state-count bounds to the shared 1..8 allowance. That
allowance change also removes the L0 "4 fixed phases" floor, so applying a
template to an *existing* L0 now degrades to the same wholesale
delete-and-recreate that subspaces have always had (release risk **R-22**,
product-approved). A migration backfills min-1/max-8 onto every
`innovation_flow` row. **Headline coverage claim:** the promotion fix is
proven end to end at API level (states, current state, and per-state settings
carried verbatim, no defaults appear) and the R-22 mechanism is proven
generalizing correctly to an L0 target; the 1..8 boundary values and the
migration's data backfill are proven only at unit level / by the developer
locally and are covered here by scripted manual ACC walks, not automation.

**Depth rationale.** The tier rubric treats any migration as Deep-qualifying.
This one is scoped down to Standard on the QA lead's explicit instruction,
justified because: the migration is an additive, idempotent JSONB *value*
backfill (no DDL, no destructive drop), the developer exercised up→revert→up
locally, and its transactional/locking risk is already owned by release-risk
item **R-14** with its own checklist row — duplicating that here would not
add signal. The one genuinely data-changing consequence of this diff (R-22)
is product-approved and gets a dedicated, precise manual case rather than a
scripted matrix. Single repo (server), no schema change, no auth change, no
cross-repo contract — so besides the migration, no other Deep trigger fires.

## How to run

```bash
# From test-suites root, against the QA lead's local compose stack (never bring
# a stack up from a worktree):
pnpm --filter @alkemio/tests-lib run codegen   # after the fragment/query edits (done)
cd server-api && pnpm exec vitest run src/functional-api/journey/conversion/convert-L1-to-L0-basic.it-spec.ts
cd server-api && pnpm exec vitest run src/functional-api/journey/conversion/convert-L1-to-L0-flow-states.it-spec.ts
cd server-api && pnpm exec vitest run src/functional-api/journey/conversion/apply-template-l0-wholesale-replace.it-spec.ts
cd server-api && pnpm exec vitest run src/functional-api/callout/transfer/
```
No serial-execution constraint beyond the suite defaults; conversion specs
already create/tear down their own scenarios per file.

## Risk

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| 1 | Promotion still resets an admin's custom phases to platform defaults, silently dropping names/descriptions/sidebar and the current-phase pointer — the original bug regresses | Med | High | **High** | NC-1, NC-2, U-1, U-2, M-1 |
| 2 | Applying a template to an existing L0 now deletes all phases and re-homes callouts without any in-product distinction from the old "first 4 are safe" behaviour | Med | High | **High** (R-22, approved) | NC-3, M-2 |
| 3 | 1..8 state-count bounds regress at the API surface (e.g. a template with 0 or 9 states is accepted) since the floor was lifted platform-wide via a broad migration | Low | Med | Med | M-3, M-4 |
| 4 | Migration mis-normalizes a row with legacy non-object `settings` on ACC's real data, leaving an invalid settings shape that later breaks the add/delete guards | Low | Med | Med | out of scope — no DB access from test-suites; see gaps |
| 5 | `ConversionService`'s dropped dependencies (Template/Platform/InputCreator/InnovationFlow modules) break DI wiring for the conversion mutation | Low | Med | Low-Med | confirmed by existing suite already exercising the full resolver — no new case |

Elevated-risk triggers present: migration ✓ (additive/idempotent, no DDL) · data-destructive path ✓ (R-22, approved). Not present: breaking contract change, authorization/visibility change, cross-repo contract, infra/config change.

## Existing coverage before this work

Searched by entity/operation/copy across `server-api/src/functional-api/journey/conversion/`, `callout/transfer/`, `innovation-flow/`, `templates/space/`, `activity-logs/`, and the server repo's own unit specs (`conversion.service.spec.ts`, `innovation.flow.service.spec.ts`).

- `convert-L1-to-L0-basic.it-spec.ts` (20 assertions) — level, visibility, about/profile, account host, settings, subspaces, community roleSet members/leads/admins, license (Free-not-Plus, #6022), calendar events, community updates, and the two auth negatives (Space Admin/Member cannot convert) are **full** and confirmed unaffected by this diff — none of that code path changed. **18 of 20** needed no change.
- Two assertions in that file are invalidated by the fix (see below) — the other 2 of 20.
- `convert-L1-to-L0.it-spec.ts`, `convert-L1-to-L0-with-L2-to-L1.it-spec.ts` — searched for `innovationFlow`/`states`: **zero matches**. They don't assert on flow states at all — confirmed unaffected, no change needed.
- `move-L1-to-L0-basic.it-spec.ts` — a **different mutation** (`moveSpaceL1ToSpaceL0`), never runs the conversion flow-reset code; only asserts the innovationFlow profile URL rebases. Confirmed unaffected.
- `transfer-callout-template-flow.it-spec.ts` — proves the *generic* mechanism (apply a template → wholesale flow replacement → an orphaned callout adopts the destination default state) for an **L1 subspace target**. This is the same code path R-22 now also exercises for an L0 target, but the test's target is never L0 — **partial** for R-22.
- `transfer-callout-flow-state.it-spec.ts`, `transfer-callout-changed-flow.it-spec.ts` — use the default L0/L1 template *state names*, which this diff did not change (only `minimumNumberOfStates` moved); searched for bound assertions: none found. Confirmed unaffected.
- `space-templates.it-spec.ts` — searched for bound/state-count assertions: none found. Confirmed unaffected.
- `activity-log-on-transfer-conversion.it-spec.ts` — searched: no innovationFlow assertions. Confirmed unaffected.
- Server unit level (post-diff, already merged): `conversion.service.spec.ts` — **full** for "states survive by reference + bounds re-stamped to 1/8" at the service layer. `innovation.flow.service.spec.ts` — **full** for the add/delete guards at 1..8 and for L0 wholesale-replacement-with-template-sidebars-verbatim, at the service layer.

**Reuse figure: 18 of 20 scenarios in the anchor spec, and all scenarios in the other 8 conversion/callout-transfer/template specs inventoried, needed no new test.** Two existing assertions require correction (below); three gaps get new API-level cases; the 1..8 boundary and the migration backfill are unit-proven / developer-verified only and are handled as manual ACC rows, not new automation.

### Existing tests requiring update

| File › test | Currently asserts | Must become |
|---|---|---|
| `convert-L1-to-L0-basic.it-spec.ts:159` `'innovation flow states match L0 template'` | `subspaceAfter.collaboration.innovationFlow.states` equals **`spaceBefore`** — the *parent L0's* states, i.e. the platform defaults. This literally encodes the bug: it passed only because promotion used to reset to those defaults. | Assert against **`subspaceBefore`** — the L1's *own* pre-conversion states (name it e.g. `'innovation flow states are carried over verbatim from the L1'`). |
| `convert-L1-to-L0-basic.it-spec.ts:153` `test.skip('collaboration is preserved (excluding profile urls)')` | Skipped — comment names this exact bug as the blocker. | **Un-skip.** This is the broadest available regression guard (whole `collaboration` incl. innovationFlow, calloutsSet, timeline). Run it first; if it still fails for an unrelated reason, narrow the diff, don't re-skip silently. |

## Scenario → test mapping

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| Space level promoted L1→L0 | AC (unaffected) | `convert-L1-to-L0-basic.it-spec.ts › space level is promoted to L0` | API |
| Visibility/about/account-host/settings/subspaces/roleSet/license/calendar/updates preserved | AC (unaffected) | same file, 15 existing tests | API |
| Space Admin/Member cannot convert | AC (unaffected) | same file, 2 existing tests | API |
| Flow states carried over verbatim (names, descriptions) | AC — the fix | `convert-L1-to-L0-basic.it-spec.ts › innovation flow states are carried over verbatim from the L1` (U-1, corrected — was `...match L0 template`, asserted the bug) | API |
| Whole collaboration unchanged by promotion (regression guard) | AC — the fix | `convert-L1-to-L0-basic.it-spec.ts › collaboration is preserved (excluding profile urls)` (U-2, un-skipped) | API |
| `currentStateID` carried over when the L1's current state is not the first | AC — product ruling | `convert-L1-to-L0-flow-states.it-spec.ts › currentStateID carried over when not the first state` (NC-1) | API |
| Per-state settings (sidebar, allowNewCallouts, visible) carried over verbatim | AC — "sidebar carried over" ruling | `convert-L1-to-L0-flow-states.it-spec.ts › per-state settings (sidebar) carried over verbatim` (3 tests — populated sidebar, explicitly-empty sidebar, other settings unchanged) (NC-2) | API |
| Wholesale flow replacement mechanism (generic) | Risk 2 partial | `transfer-callout-template-flow.it-spec.ts` (L1 target) | API |
| Template apply on an **L0** wholesale-replaces phases and re-homes callouts | Risk 2 (R-22) | `apply-template-l0-wholesale-replace.it-spec.ts › Apply template to an L0 - wholesale replacement (R-22)` (5 tests) (NC-3) | API |
| 1..8 add/delete-state guards, template min/max | Risk 3 | `innovation.flow.service.spec.ts` (post-diff) | Unit |
| Service-layer verbatim carry-over + bounds re-stamp | AC — the fix | `conversion.service.spec.ts` (post-diff, new test) | Unit |
| 9-state template rejected; sub-4-state L0 accepted (system level) | Risk 3 | **M-3 / M-4 (manual — see gaps)** | Manual/ACC |
| Migration backfill correctness on real data | Risk 4 | **out of scope for test-suites (no DB access)** | Manual/ops |

### Regression guards

- `convert-L1-to-L0-basic.it-spec.ts:159` (corrected, U-1) pins the exact defect: promotion must not substitute the platform-default flow for the L1's own. Root cause: `convertSpaceL1ToSpaceL0OrFail` used to call `getInnovationFlowForSpaceL0()` and rebuild the states; the fix deletes that method entirely.
- `convert-L1-to-L0-basic.it-spec.ts:153` (un-skipped, U-2) is the widest net: any future regression that touches innovationFlow, calloutsSet, or timeline during promotion trips this test, not just a flow-states-specific one.
- NC-3 pins R-22's boundary precisely: an L0 target degrades to wholesale replacement (`L0_FIXED_INNOVATION_FLOW_STATES = 0`), so a regression that silently restores fixed-phase preservation for L0 (a plausible "fix the regression the wrong way" mistake) is caught.

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| 9-state template rejected on an L0 (upper bound) | Unit-proven (`innovation.flow.service.spec.ts`); no system-level path without `createStateOnInnovationFlow`/`deleteStateOnInnovationFlow` request-params wrappers, which don't exist yet (tooling gap) | **Manual** — M-4, ACC. Deferred-automation candidate once the wrappers are built; not worth building solely for this story given unit coverage already exists |
| Sub-4-state template accepted on an L0 (lower-bound removal, the headline behaviour change) | Same tooling gap | **Manual** — M-3, ACC |
| Migration backfill correctness against ACC's real `settings` shapes (incl. legacy scalar-null rows) | test-suites has no DB access (GraphQL-only surface); this is a data-shape assertion, not a product behaviour one | **Manual/ops** — one SQL row count check before/after deploy, owned by release verification (adjacent to R-14, not duplicated here) |
| `ConversionService` DI wiring after dependency removal | Compile-time (Nest module resolution fails loudly on boot) and already exercised end-to-end by every passing conversion test | Not automated — a broken DI graph fails the whole suite, not silently; no dedicated case needed |
| Client-web rendering of a promoted space's phases (does the UI actually *show* the carried-over names/sidebar correctly, no stale cache) | client-web is unchanged in this diff and out of `REPOS IN SCOPE`; but it's the original bug report's symptom | **Manual** — M-1, ACC (visual oracle only reachable by eyeballing the UI) |

**What is genuinely proven:** after this work, the API-level suite proves the L1's flow states, current-state pointer, and per-state settings survive promotion verbatim, that no platform-default phase appears, and that the R-22 wholesale-replacement mechanism generalizes correctly to an L0 target with its callouts re-homed as designed. **What is not proven by automation:** the exact 1..8 boundary values at the system level (unit-only), and the migration's behaviour against ACC's actual data shapes (no DB access from this suite) — both are carried as scripted manual rows for the QA lead's Release 74 ACC pass, not left as silent gaps.
