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
