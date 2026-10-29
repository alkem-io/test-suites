# Server rebuild — QA tracker

_One place for everything QA does for the move to the rebuilt server. Status is updated in this file; the reasoning lives in the documents it links. Last update: 2026-10-29 (W1 access matrix delivered; W2 pre-work delivered; W4 register updated)._

## Documents

| Document | What it is | State |
|---|---|---|
| [`plan.md`](plan.md) | The plan: workstreams W1–W6, timeline against the rebuild's slices, 14 decisions, 11 gaps, backups across the cutover | revised 2026-10-27, gaps 11 and inventory counts 2026-10-28 |
| [`knowledge/_inventory.md`](knowledge/_inventory.md) | Every server-api case, collected by vitest (234 files, 5,121 resolved cases, 78 skip, 17 todo) — the W1 completeness checklist | regenerated 2026-10-28 from `origin/develop` @ `df149442` |
| [`knowledge/_tools/`](knowledge/_tools/README.md) | How to regenerate the inventory | done |
| [`catalogue/README.md`](catalogue/README.md) | W0 output: the platform feature catalogue (57 features over the 298 root fields of the legacy schema) and the coverage matrix — API reach, UI verdict, harness use, specs and plans, where it lands in the new core, slice, verdict, gap | generated 2026-10-28; verdicts 14 full / 34 partial / 5 absent / 4 dead-by-design |
| [`catalogue/root-fields.md`](catalogue/root-fields.md) | Appendix: every root field traced to its feature, lib operation, server-api areas and client-web specs | generated 2026-10-28 |
| [`catalogue/_tools/`](catalogue/_tools/README.md) | How to regenerate the catalogue from a fresh schema and test-suites revision | done |
| [`data-integrity/acc-defect-register.md`](data-integrity/acc-defect-register.md) | W4 step 1: the ACC data-defect register — ~90 signatures across all 7 databases with counts, likely origin and a proposed rebuild classification (vanishes / repair / expected loss / quarantine / repair now / ops / ruling); identifiers stripped | seeded 2026-10-28 from the ACC audit (v0.170.2); classifications proposed, decisions 8 and 11 open |
| [`data-integrity/acc-audit-queries/`](data-integrity/acc-audit-queries/README.md) | The 41 read-only SQL probes behind the register, with the run recipe; outputs stay off-repo | stored 2026-10-28; environment-agnostic, PROD rerun pending |
| [`knowledge/<area>.md`](knowledge/) | W1 output: one behaviour document per area (rule · why · actors · evidence · legacy status · new-core mapping) | 1 of 25 drafted (`entitlements.md`); 2 areas collapsed into the access matrix |
| [`knowledge/access-matrix.md`](knowledge/access-matrix.md) | W1 output for the `platform-roles` and `storage` areas: the access oracle — for every actor role, on every resource type, under 18 settings variants, which privileges are granted and by which path (direct / parent credential / cascade / privilege rule / settings), derived from the server's authorization builders, never from stored policy rows; constants table and new-core mapping included | generated 2026-10-29 from `server` `develop` @ `eeecf9ddb`; 237 resources × 42 roles × 18 variants |
| [`knowledge/access-matrix.json`](knowledge/access-matrix.json) | The same matrix machine-readable (41,325 rows of resource × variant × role with the granted privileges and their path/rule; evidence table rule → `file:line`), for the W5 re-point to turn into assertions on `myPrivileges` or the SQL verdict | generated 2026-10-29 |
| [`knowledge/access-matrix-crosscheck.md`](knowledge/access-matrix-crosscheck.md) | Code vs acceptance data vs tests: stored policy shapes compared with the derivation after netting out the register's A1/A3/G1 rows (11 findings, 3 new register signatures, 1 untested code path with anonymous read on private-space direct storage), every `storage` and `platform-roles` case mapped to a cell (896/896 and 124/125 agree), the cells no test covers | written 2026-10-29; findings not filed — lead decides |
| [`knowledge/_tools/access/`](knowledge/_tools/access/README.md) | The generator (engine + hand-transcribed policy model with `file:line` evidence + parsers that read the enums/role definitions from the server), the test cross-check, the read-only ACC aggregate SQL; regeneration steps and the server SHA | done |
| [`client-net-audit/`](client-net-audit/README.md) | The 2026-10-14 client-web audit: 62 journeys, per-spec verdicts, harness-dependency inventory, Tier 0/1/2 backlog | done; the backlog feeds W2 |
| `../qa-knowledge/coverage-map.md` | Story-level coverage with spec references, delivered work since 2026-09 | tracked separately, referenced by gap 11 |

## Workstreams

| # | Workstream | Needs the new server? | Status | Next action | Blocked by |
|---|---|---|---|---|---|
| W0 | Platform feature catalogue + coverage matrix (gap 11) | no | **delivered** 2026-10-28 | review the 57 verdicts; place the 5 absent features (CT-4 whiteboards, CT-8 task boards, SP-10 guidelines, AI-2, AI-3) and the 4 dead-by-design rows on the W2 list and the expected-loss list | lead review |
| W1 | Server behaviour knowledge base | no | 1 / 25 areas + the access matrix (`platform-roles` + `storage` collapsed: 2,631 of 2,988 cases mapped to cells, 357 recorded as non-cell behaviour) | extract `journey` and `callout` next (slices 4–5 territory); route the matrix findings (F1 anonymous read on direct storage, F2–F5 register signatures) | review capacity (gap 8) |
| W1 | — access matrix (`platform-roles` + `storage` areas) | no | **delivered** 2026-10-29 (PR test-suites, branch `qa/w1-access-matrix`) | lead review of the 11 cross-check findings; decide whether F1 is filed; the matrix's `data-dependent` cells need the register's id-level probes | lead review |
| W2 | Client-web net built now | no | pre-work delivered (PR test-suites#696, 2026-10-29) | journeys 1–4 next; separately: form-callout-framing walks must join-as-self (Slice B), unregistered account-deletion us1–us3 drifted off the Security tab | — (W0 confirmed the ranked 12; adds task boards and community guidelines as cheap cases) |
| W3 | Dedicated validation environment | decisions now, build later | decisions open | decisions 1–4; isolation rules into `e2e-conventions.md` and ESLint; sweeper design | ops for the mail relay |
| W4 | Migration and integrity kit | legacy half no, new half yes | register seeded (addendum step 1) | take the register's two pre-dry-run repairs (C1/C2 tree and URL defects, S1/S2 backup gap) to backend and ops; agree the V/R/E/Q classification (decisions 8, 11); write the legacy-side layers 1–3 and 5; PROD rerun of the probes by an operator | decisions 8, 10, 11, 12 |
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
| platform-roles | 30 | 2,071 | `knowledge/access-matrix.md` + `access-matrix-crosscheck.md` | collapsed into access-matrix: 1,735 cases mapped to cells (124 of 125 capability rows agree, 1 declaration-only), 28 unmapped (resolver pinned to a retired credential), 299 scenario + 9 coverage-guard cases are rule-engine/audit/lifecycle behaviour for the `roleset`/`platform` documents |
| storage | 9 | 917 | `knowledge/access-matrix.md` + `access-matrix-crosscheck.md` | collapsed into access-matrix: 896 cases mapped to document/bucket cells, 896 agree; 21 upload-flow cases unmapped (not access cells) |
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

### W4 progress

| Item | State |
|---|---|
| Addendum step 1 — defect register from what is known | seeded 2026-10-28: ACC audit, all 7 databases, ~90 signatures |
| Addendum step 2 — classify each signature with the backend team | proposed per row; not yet agreed (decisions 8, 11) |
| Addendum step 3 — run the probes on ACC / hand to an operator for PROD | ACC done 2026-10-28; PROD not run (no prod context) |
| Pre-dry-run repairs the register exposes | C1 broken tree; C2 duplicate L0 nameIDs (server#6730); S1 = 719 blobs missing from storage itself on ACC (server#6726, file-service), S2 backup backfill; A2 data repair of 54 spaces (generator fixed v0.167); A1 escalation draft still unfiled |
| Layer 1 inventory parity (legacy side) | not started |
| Layer 2 identity and URL parity (legacy side) | not started |
| Layer 3 content fidelity (legacy side) | not started; S1 means the file-hash list will show a known gap until the backfill |
| Layer 5 state and settings parity (legacy side) | not started |
| Layer 6 chat parity | tolerance list exists (P1–P3); kit not started |
| Layers 4, 7 and all new-side halves | gated on the DDL / a running core |

### W2 progress

| Item | State |
|---|---|
| Pre-work: fold spec-local GraphQL into the lib (45 files) | **done** 2026-10-29 — PR test-suites#696: 316 documents in 63 files folded into 81 lib documents / 115 named functions (the inventory had grown from the audit's 42 files); zero raw documents left in client-web |
| Pre-work: lib-owned enums (41 + 17 files) | **done** 2026-10-29 — PR test-suites#696: `lib/src/common/{enums,types}`; 77 import statements in 61 files re-pointed to the barrel |
| Pre-work: ESLint boundary | **done** 2026-10-29 — PR test-suites#696: `no-restricted-imports` + `no-restricted-syntax` on `client-web/src/**`, blocking CI lint step; `tests/` (forge-verify walks) and the 33 direct generated-SDK calls still outside |
| Pre-work: lib contract test | **done** 2026-10-29 — PR test-suites#696: `server-api/src/contract/lib-contract.it-spec.ts`, vitest project `contract`, 10 tests / 13 s + global setup |
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
| 8 | Expected-loss list | backend | open — seed exists: every **V** and **E** row of the register with its count | |
| 9 | Harness contract on the new core | backend | open — asks not yet sent | |
| 10 | Dataset for the validation environment | DPO / legal | open | |
| 11 | ETL quarantine contract | backend | open — concrete shapes to ask for: register rows B1, C1, E1/I1, F2, K1, L2, L5, P2 | |
| 12 | Backup inventory for the new stores | ops | open — new input: 719 blobs (1.75 GB) of 2026 files are missing from storage itself on ACC, the backup gap is the symptom (server#6726); 2023 never backfilled (S2); recovery or expected-loss listing precedes any cutover | |
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
| 11 | No platform feature catalogue, so no true gap analysis | **closed** 2026-10-28 by `catalogue/` (W0) |

## Log

| Date | What |
|---|---|
| 2026-10-14 | Client-web net audit written; Tier 0 registrations built |
| 2026-10-27 | Plan written (lib-first draft superseded the same day); first inventory by regex; entitlements example |
| 2026-10-28 | Inventory regenerated by vitest collection after the regex version was found truncating names; plan counts corrected; gap 11 added; everything consolidated here and committed on `qa/server-rebuild-qa-plan` (PR test-suites#693) |
| 2026-10-28 | W4 register seeded from the ACC data-quality audit handed over by another session (all 7 databases, v0.170.2); identifiers stripped; the 41 probes stored under `data-integrity/acc-audit-queries/`; outputs and CSV dumps kept off-repo |
| 2026-10-29 | Register updated from the audit session's drills: S1 is file content loss on ACC, not a backup gap; A2 generator fixed in v0.167, data repair only; six server issues filed (#6726–#6731) for the live generators; F1/G3/E2 explained |
| 2026-10-29 | W2 pre-work delivered on PR test-suites#696 (branch `qa/w2-prework-lib-boundary`): the lib is the only schema boundary for client-web — actor model (`GraphqlActor`/`runAs`), 81 documents + 115 functions, lib-owned enums/types, ESLint guard with a blocking CI step, lib contract test; 89 specs run live on the local stack, one fold red (fixed), the rest attributed pre-existing/env/interference |
| 2026-10-28 | W0 delivered: 298 root fields of `server` `develop` @ `eeecf9ddb` traced through lib, server-api and client-web on test-suites @ `015bfeea1`; 57 features with verdicts; gap 11 closed |
| 2026-10-29 | W1 access matrix delivered: rules derived from `server` `develop` @ `eeecf9ddb` (18 settings variants, 237 resources, 42 roles), cross-checked against the ACC policy rows (aggregate dump, v0.170.2) and the `platform-roles` + `storage` suites (2,631 of 2,988 cases mapped, all agree); 11 findings in `access-matrix-crosscheck.md`, nothing filed |

## How to update

Change status here, reasoning in the linked document. One row per workstream item, decision or gap; never duplicate a row, correct it. Add a log line per working session.
