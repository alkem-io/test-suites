# Server rebuild — QA tracker

_One place for everything QA does for the move to the rebuilt server. Status is updated in this file; the reasoning lives in the documents it links. Last update: 2026-10-28._

## Documents

| Document | What it is | State |
|---|---|---|
| [`plan.md`](plan.md) | The plan: workstreams W1–W6, timeline against the rebuild's slices, 14 decisions, 11 gaps, backups across the cutover | revised 2026-10-27, gaps 11 and inventory counts 2026-10-28 |
| [`knowledge/_inventory.md`](knowledge/_inventory.md) | Every server-api case, collected by vitest (234 files, 5,121 resolved cases, 78 skip, 17 todo) — the W1 completeness checklist | regenerated 2026-10-28 from `origin/develop` @ `df149442` |
| [`knowledge/_tools/`](knowledge/_tools/README.md) | How to regenerate the inventory | done |
| [`knowledge/<area>.md`](knowledge/) | W1 output: one behaviour document per area (rule · why · actors · evidence · legacy status · new-core mapping) | 1 of 25 drafted (`entitlements.md`) |
| [`client-net-audit/`](client-net-audit/README.md) | The 2026-10-14 client-web audit: 62 journeys, per-spec verdicts, harness-dependency inventory, Tier 0/1/2 backlog | done; the backlog feeds W2 |
| `../qa-knowledge/coverage-map.md` | Story-level coverage with spec references, delivered work since 2026-09 | tracked separately, referenced by gap 11 |

## Workstreams

| # | Workstream | Needs the new server? | Status | Next action | Blocked by |
|---|---|---|---|---|---|
| W0 | Platform feature catalogue + coverage matrix (gap 11) | no | not started | build the feature list from the legacy schema, client routes and the 47 workspace specs; join the audit, inventory and coverage map onto it | — |
| W1 | Server behaviour knowledge base | no | 1 / 25 areas | extract `journey` and `callout` next (slices 4–5 territory) | review capacity (gap 8) |
| W2 | Client-web net built now | no | not started | pre-work: fold 45 spec-local GraphQL documents into the lib, lib-owned enums, ESLint boundary, lib contract test | W0 for the objective journey list (can start on the ranked 12 without it) |
| W3 | Dedicated validation environment | decisions now, build later | decisions open | decisions 1–4; isolation rules into `e2e-conventions.md` and ESLint; sweeper design | ops for the mail relay |
| W4 | Migration and integrity kit | legacy half no, new half yes | not started | write the legacy-side layers 1–3 and 5; run the defect-signature probes on ACC for the pre-image | decisions 8, 10, 11 |
| W5 | Re-point the lib and the harness | yes | gated | send the harness-contract asks (decision 9) to the backend team now | the SDL and a running core |
| W6 | Test-suites redesign | skeleton no, fill yes | not started | package skeleton after W2 pre-work lands | decision 13 |

### W1 progress by area

| Area | Files | Cases | Document | State |
|---|---|---|---|---|
| entitlements | 7 | 39 | `knowledge/entitlements.md` | drafted, needs lead review |
| journey | 36 | 304 | | next |
| callout | 18 | 394 | | next |
| roleset | 31 | 308 | | |
| contributor-management | 16 | 290 | | |
| notifications | 34 | 225 | | |
| platform-roles | 30 | 2,071 | | decision table; collapses to the capability matrix |
| storage | 9 | 917 | | decision table; collapses to the document-auth matrix |
| communications | 12 | 123 | | |
| templates | 6 | 62 | | |
| push-notifications | 3 | 65 | | |
| activity-logs | 5 | 55 | | |
| graphql-guard | 4 | 45 | | |
| calendar | 2 | 43 | | |
| pagination | 2 | 42 | | |
| search | 1 | 39 | | |
| collabora | 2 | 23 | | |
| account | 2 | 20 | | |
| language | 2 | 15 | | |
| visual | 2 | 14 | | |
| orphan-free-deletion | 3 | 12 | | |
| platform | 1 | 7 | | |
| subscriptions | 3 | 5 | | |
| configuration | 2 | 2 | | |
| innovation-pack | 1 | 1 | | |

### W2 progress

| Item | State |
|---|---|
| Pre-work: fold spec-local GraphQL into the lib (45 files) | not started |
| Pre-work: lib-owned enums (41 + 17 files) | not started |
| Pre-work: ESLint boundary | not started |
| Pre-work: lib contract test | not started |
| Journey 1 — join an open Space | not started |
| Journey 2 — invite an existing user, accept, open | not started |
| Journey 3 — create a subspace through the UI | not started |
| Journey 4 — change Space privacy / membership / collaboration settings | not started |
| Journey 5 — whiteboard, memo, Collabora document | not started |
| Journey 6 — flow state, reorder callouts, move a contribution | not started |
| Journey 7 — edit Space about, own profile, organisation | not started |
| Journey 8 — global and sidebar search | not started |
| Journey 9 — virtual contributor | not started |
| Journey 10 — message leads / organisation; notification settings | not started |
| Journey 11 — upload file / reference; media gallery; attachment | not started |
| Journey 12 — forum, innovation packs, admin organisations, mentions | not started |
| Tier 0 registrations from the audit (smoke canary, platform roles, memberships, contributors callout 0.1) | built 2026-10-14, uncommitted in the working tree |

## Decisions

Full text and recommendations in [`plan.md` § Decisions](plan.md#decisions-needed-owner-qa-lead-unless-stated).

| # | Decision | With | Status | Decided |
|---|---|---|---|---|
| 1 | Environment topology | ops | open | |
| 2 | Mail on the new environment | ops | open | |
| 3 | Harness marker and sweeper policy | — | open | |
| 4 | Which suites are exclusive | — | open | |
| 5 | Where the knowledge base lives | — | **taken**: `docs/qa/server-rebuild/knowledge/` | 2026-10-28 |
| 6 | Server-api PRs #612 and #545 | — | open | |
| 7 | Rebaseline rulings | product | open, per row | |
| 8 | Expected-loss list | backend | open | |
| 9 | Harness contract on the new core | backend | open — asks not yet sent | |
| 10 | Dataset for the validation environment | DPO / legal | open | |
| 11 | ETL quarantine contract | backend | open | |
| 12 | Backup inventory for the new stores | ops | open | |
| 13 | Test-suites redesign scope | — | open | |
| 14 | Cutover go/no-go ownership | — | open | |

## Gaps

Full text in [`plan.md` § Gaps](plan.md#gaps-found-in-the-plan-so-far).

| # | Gap | Status |
|---|---|---|
| 1 | No cutover runbook on the QA side | open |
| 2 | No performance or security verification of our own | open |
| 3 | Client rewrite has no acceptance owner | open |
| 4 | Legacy API consumers unlisted | open |
| 5 | Continuity items at cutover | open |
| 6 | Hypercare | open |
| 7 | Timeline unverified | open — ask the backend team for slice status and the cutover date |
| 8 | Review capacity for W1 | open |
| 9 | Bulk test data for the new core | open |
| 10 | Email content review | open |
| 11 | No platform feature catalogue, so no true gap analysis | open — becomes W0 |

## Log

| Date | What |
|---|---|
| 2026-10-14 | Client-web net audit written; Tier 0 registrations built |
| 2026-10-27 | Plan written (lib-first draft superseded the same day); first inventory by regex; entitlements example |
| 2026-10-28 | Inventory regenerated by vitest collection after the regex version was found truncating names; plan counts corrected; gap 11 added; everything consolidated here and committed on `qa/server-rebuild-qa-plan` |

## How to update

Change status here, reasoning in the linked document. One row per workstream item, decision or gap; never duplicate a row, correct it. Add a log line per working session.
