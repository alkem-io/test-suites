# Server rebuild — QA tracker

_One place for everything QA does for the move to the rebuilt server. Status is updated in this file; the reasoning lives in the documents it links. Last update: 2026-11-12 (W2 rows synced after the 2026-11-11 merges)._

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
| [`knowledge/<area>.md`](knowledge/) | W1 output: one behaviour document per area (rule · why · actors · evidence · legacy status · new-core mapping) | 1 of 25 drafted (`entitlements.md`) |
| [`client-net-audit/`](client-net-audit/README.md) | The 2026-10-14 client-web audit: 62 journeys, per-spec verdicts, harness-dependency inventory, Tier 0/1/2 backlog | done; the backlog feeds W2 |
| `../qa-knowledge/coverage-map.md` | Story-level coverage with spec references, delivered work since 2026-09 | tracked separately, referenced by gap 11 |

## Workstreams

| # | Workstream | Needs the new server? | Status | Next action | Blocked by |
|---|---|---|---|---|---|
| W0 | Platform feature catalogue + coverage matrix (gap 11) | no | **delivered** 2026-10-28 | review the 57 verdicts; place the 5 absent features (CT-4 whiteboards → J5; CT-8 task boards and SP-10 guidelines → W2 extras, built 2026-11-12; AI-2, AI-3) and the 4 dead-by-design rows on the W2 list and the expected-loss list | lead review |
| W1 | Server behaviour knowledge base | no | 1 / 25 areas | extract `journey` and `callout` next (slices 4–5 territory) | review capacity (gap 8) |
| W2 | Client-web net built now | no | pre-work, journeys 1–7 and Tier 1 items 9–16 delivered (last merges 2026-11-11) | Tier 0 (#718), journey 8 (#719), item 17 (#723), extras (#722), journeys 10–12 (#721); rulings and unfiled defects for the lead in #724. Tier 0 notes: form-callout-framing walks must join-as-self (Slice B), unregistered account-deletion us1–us3 drifted off the Security tab | — (W0 confirmed the ranked 12; adds task boards and community guidelines as cheap cases) |
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
| Journey 1 — join an open Space | **done** 2026-10-30 — PR test-suites#697: `space-join-invite/us1-join-open-space.spec.ts`, nightly "Space join and invite"; 3 cases, 2/2 live runs green on test |
| Journey 2 — invite an existing user, accept, open | **done** 2026-10-30 — PR test-suites#697: `space-join-invite/us2-invite-accept.spec.ts`, same project; 4 cases incl. mail per recipient, 2/2 live runs green on test |
| Journey 3 — create a subspace through the UI | **done** 2026-10-30 — PR test-suites#697: `subspace-create/`, nightly "Subspace create"; 3 cases (L1, L2, non-member refused), 2/2 live runs green on test |
| Journey 4 — change Space privacy / membership / collaboration settings | **done** 2026-10-30 — PR test-suites#697: `space-settings-write/`, nightly "Space settings write"; 8 cases (privacy, policy, 3 member-visible toggles), 2/2 live runs green on test |
| Journey 5 — whiteboard, memo, Collabora document | **done** 2026-11-11 — PR test-suites#711 (`0cca26ac`): `content-editing/`, nightly "Content editing"; 7 cases (whiteboard E8-1..3 + E8-4 `@local-stack`, memo E10-1..2, Collabora E9-1..2), content read back over GraphQL and reopened by a second session; test-alkem.io 7/7 in two runs. Open: L-2 (nightly reopen is served from the live room, not storage — question for the lead, #724); memo signing deferred (needs a Cleverbase identity); Collabora on a host-run server needs `WOPI_SERVICE_URL` (plan KD-1) |
| Journey 6 — flow state, reorder callouts, move a contribution | **done** 2026-11-11 — PR test-suites#713 (`478af2ab`): `callout-placement/`, nightly "Callout placement" (tier extended); 7 cases (FS-1..2 phase move and rename, RO-1..3 reorder incl. member refused, MC-1..2 move a response incl. author without `MOVE_POST`), each with a lib read-back (`readCalloutsPlacement`, `readCalloutContributions`, `readPost`) and the member's view; test-alkem.io 7/7 in two runs after the QA challenge. Not covered: recorded in `docs/qa-knowledge/deferred.md` |
| Journey 7 — edit Space about, own profile, organisation | **done** 2026-11-11 — PR test-suites#714 (`21386ae0`): `profile-editing/`, nightly "Profile editing" (tier extended); 10 cases (Space About name/tagline/What/Why and tags; own profile on a disposable identity; non-admin organisation create and edit), **8 live + 2 skipped** on reproduced defects awaiting the lead's ruling (#724): H1-3 (server: `createOrganization` drops the typed references, plan R-3) and H1-2b (client: create dialog drops the description before the markdown conversion resolves, plan R-7); test-alkem.io 8 + 2 skipped in two runs. Also re-aligns `user-profile/` (City combobox, Phone moved, client-web#10499) and closes Tier 1 item 15 |
| Journey 8 — global and sidebar search | not started — test-suites#719; check open PR #700 (Spaces search total and pagination) first |
| Journey 9 — virtual contributor | parked while VCs are hidden in the client — test-suites#720 |
| Journey 10 — message leads / organisation; notification settings | built 2026-11-12 — PR test-suites#735 (on #734's lib all-pages mail readers): `contact-leads/`, nightly "Contact leads" (tier long) + local-stack "Local stack — contact Space leads"; 6 cases: organisation message from its page, one mail per admin, none to an associate, one sender copy (M1-1); organisation "direct messages" email toggled off/on in the UI, persisted across reload, read back and honoured (N1-1..N1-3); Space "Contact Leads" read back as one 1:1 chat per lead (C3-1) plus the direct-message digest, one per lead, none to a non-lead (C3-2), both `@local-stack` (Matrix; digest test windows); M1-2 skipped on reproduced server defect J10-D1 (an admin who is not an associate gets no organisation message; not filed); J10-D2 drafted (notifications drops the failed recipients of a partially failed send). Local stack, final code: nightly 2/2, local-stack 2/2, contract 38/38. New lib `assignUserRoleOnRoleSet`. Finding: the Space half of F3 is a chat since the CRD sidebar (no UI caller of `sendMessageToCommunityLeads` left). test-alkem.io runs pending |
| Journey 11 — upload file / reference; media gallery; attachment | in progress — branch `qa/w2-journey-11` (uncommitted): `file-uploads/`, nightly "File uploads" (tier extended) + local-stack "Local stack — message attachments"; 6 cases (RF-1/2 reference file, MG-1/2 media gallery, MA-1/2 chat attachment `@local-stack`), each with a storage read-back (document record, served bytes/type, outsider refused) and each oracle red-proofed; local stack 2/2 runs green 2026-11-12; test-alkem.io runs pending; product observations D-1 (`MediaGallery.storageBucket` always null) and D-2 (a DIRECT conversation can be neither left nor deleted) drafted in the plan, not filed |
| Journey 12 — forum, innovation packs, admin organisations, mentions | built 2026-11-12, uncommitted, branch `qa/w2-journey-12` (issue test-suites#721): `forum-discussions/` (J2-1 create, nightly "Forum discussions"; J3-1 comment, J3-2 thread answer + reply notification, E5-1 mention + `USER_MENTIONED` notification, `@local-stack`, ruling R-1), `innovation-packs/` (K2-1 create, K2-2 edit, L6-1 admin delete; nightly "Innovation packs"), `admin-organizations/` (L2-1 verification toggle, L2-2 admin edit form; nightly "Admin organisations"); 9 cases, each with a lib read-back (new lib `readPlatformDiscussion`, `readInnovationPack`; `readMyNotifications` payload gains the room-message shape); local stack 2/2; not yet run on test-alkem.io |
| Extras — task boards (CT-8) and community guidelines (SP-10), test-suites#722 | built 2026-11-12, branch `qa/w2-extras-read-back` (uncommitted): `task-boards/` nightly "Task boards" (5 cases: create a board, add a task to a column, move across columns, reorder in a column, non-member offered nothing and refused) and `community-guidelines/` nightly "Community guidelines" (2 cases: edit title/body + add a link, remove the link; member view). New lib `readTaskBoard`, `moveTaskToColumn`, `readSpaceCommunityGuidelines`. 7/7 in two runs on the **local** stack, every oracle red-proofed; test-alkem.io runs pending. Column administration (4 of 5 CT-8 mutations) and `removeCommunityGuidelinesContent` (no UI) stay gaps |
| Tier 1 items 9–11 (callouts 0.5 / 0.6 falsifiable; publish and visibility in 0.7 / 0.9 / 0.1 / 0.2 / 0.4) | **done** 2026-11-11 — PR test-suites#712 (`907487ac`): 0.5 asserts each created callout's kind in its detail dialog and over GraphQL (`readCalloutsSetCalloutTypes`); 0.6 has the pre-delete positive control, the rendered-feed guard, exact card count −1 and a lib read-back; every UI publish is read back as `PUBLISHED` (`readCalloutsSetCalloutVisibility`), 0.7 3.4 has the member see the callout before (absent) and after (present) the publish, 0.9 2.2's draft absence has a positive control, the three `toBeDefined()` promises are real oracles; every new oracle red-proofed; test-alkem.io Callouts 37/37 in two runs |
| Tier 1 item 16 (templates-CRD delete, comments, member contribution) | **done** 2026-11-11 — PR test-suites#715 (`21ae8214`): template delete un-commented in the post, community-guidelines and whiteboard specs (`deleteTemplateAndVerify`), cases 1–8 assert the comments setting (`readCalloutsSetCalloutResponses`), case 17m/17cm has `space.member` contribute to a template-made callout; test-alkem.io Templates 95 + 4 skipped in two runs (skips are client-web#10443 / server#6682). F-16-1 (template delete not transactional, `template.service.ts`) reproduced, draft issue awaiting the lead (#724). The `test.fail` part was done by #682 |
| Tier 0 registrations from the audit (items 1–8: memberships, session revocation, account deletion, messaging notifications, platform roles, form-callout framing, contributors callout 0.1, smoke canary) | not started — test-suites#718. The 2026-10-14 draft (smoke canary, platform roles, memberships, contributors callout 0.1) was never committed and is stale: redo it, do not apply it |
| Tier 1 items 12–14 (space create, applications, authentication) | **done** 2026-11-11 — PR test-suites#716 (`22ab19c1`): space create/delete read back by nameID, applicant bell scoped to the run's Space plus "approved applicant opens the Space", registration read-back with identity teardown, restricted-access admin positive control; test-alkem.io Space 20/20, Applications 26/26, Authentication 8/8 in two runs, nothing left behind |
| Tier 1 item 15 (`user-profile/update-basic-information`: disposable identity, read-back, stop renaming admin) | **done** 2026-11-11 — moved into the "Profile editing" suite by PR test-suites#714 (journey 7) |
| Tier 1 item 17 (`default-template-per-flow-state`: default on the member's Create Post dialog, case 4.1) | in review — open PR test-suites#703; tracked in test-suites#723 |

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
| 2026-10-28 | W0 delivered: 298 root fields of `server` `develop` @ `eeecf9ddb` traced through lib, server-api and client-web on test-suites @ `015bfeea1`; 57 features with verdicts; gap 11 closed |
| 2026-10-29 | Register updated from the audit session's drills: S1 is file content loss on ACC, not a backup gap; A2 generator fixed in v0.167, data repair only; six server issues filed (#6726–#6731) for the live generators; F1/G3/E2 explained |
| 2026-10-29 | W2 pre-work delivered on PR test-suites#696 (branch `qa/w2-prework-lib-boundary`): the lib is the only schema boundary for client-web — actor model (`GraphqlActor`/`runAs`), 81 documents + 115 functions, lib-owned enums/types, ESLint guard with a blocking CI step, lib contract test; 89 specs run live on the local stack, one fold red (fixed), the rest attributed pre-existing/env/interference |
| 2026-10-30 | W2 journeys 1–4 delivered on PR test-suites#697 (branch `qa/w2-journeys-1-4`): join, invite + accept, subspace L1/L2 create, settings writes — 18 browser cases in three nightly projects, each with a lib read-back and a negative control; lib adds `joinRoleSet`, `readSubspaceByNameId`, `readSpaceSubspaceTree`; 18/18 in two live runs on test-alkem.io; harness finding: the factory cannot delete an L0 with UI-created subspaces (now `deleteSpaceTree`) |
| 2026-11-09 | W2 Tier 1 items 9–10 in progress on branch `qa/w2-tier1-callouts`: `callouts/0.5` now proves the stored framing/response type of all 8 creates (dialog affordance + `readCalloutsSetCalloutTypes`, a new lib read-back with a contract case); `callouts/0.6` reads the deletion only after the feed has rendered (seeded card visible, no loading skeleton), asserts card count −1 and the callout gone from the callouts set; the old 0.6 oracle was shown green with the delete skipped; both files gained a file-level teardown after red-proof runs leaked scenarios |
| 2026-11-09 | W2 Tier 1 item 11 in progress on branch `qa/w2-tier1-callouts`: publish and visibility in `callouts/0.7`, `0.9`, `0.1`, `0.2` and `0.4` are falsifiable. A UI publish is read back as `PUBLISHED`, both as the admin and as the member. The server leaves a DRAFT out of a member's callouts listing (now asserted, a rebaseline candidate). The rendered-feed guard scrolls lazy below-the-fold cards in. The old 0.9 2.2 oracle was shown green on a page that never rendered the feed. |
| 2026-11-09 | W2 journey 5 built on branch `qa/w2-journey-5` (no PR yet): `content-editing/` (E8-1..4 whiteboard, E10-1..2 memo, E9-1..2 Collabora) in the nightly project "Content editing", plus lib readers and seeds (LA-1..LA-7, `WhiteboardPeer.awaitDurable`, `WhiteboardPreviewMode`). Local stack: E8-1..3, E10-1..2 and E9-1..2 green in two runs, contract 31/31. Findings: a blank Collabora document is stored as a 0-byte DOCX, so the reader handles DOCX and ODT; the Space card shows the WHITEBOARD_PREVIEW visual; the local server has no `WOPI_SERVICE_URL`, so `collaboraEditorUrl` answers 401 and every editor open fails until the server is started with it (the existing `collabora` suite is red on it too) |
| 2026-11-09 | W2 journey 5 on test-alkem.io: 7/7 in two runs (2.3 min each); the lib whiteboard peer authenticates on test; one test-side race fixed in E8-1 (raw text read before the last keystrokes synced over the remote link) |
| 2026-11-09 | W2 journey 5 PR test-suites#711 opened; E8-4 green 2/2 on the local stack with the collaboration service at `IDLE_RELEASE_SECONDS=0`, and red with file-service paused (proves a load from storage) |
| 2026-11-09 | W2 Tier 1 items 12–14 on PR test-suites#716 (branch `qa/w2-tier1-space-access`), 54/54 in two test-alkem.io runs: space create/delete read back by nameID (name, tagline, host account, Hosted Spaces row, ENTITY_NOT_FOUND + not-found route after delete) with the UI-create sweep through `deleteSpaceTree`; applicant bell assertions scoped to the run's space plus "approved applicant opens the Space" (membership read-back + member-only callout); registration reads back the Alkemio user and deletes every registered identity; restricted access gains the admin positive control. Lib adds `readSpaceByNameId`. Locator repair for client-web#10499 ("Reject and remove application") |
| 2026-11-09 | W2 Tier 1 item 16 in progress on branch `qa/w2-tier1-templates`. Template delete is un-commented in the post, community-guidelines and whiteboard specs (lib-seeded control template, read-back, absence after a reload). Cases 1–8 assert the comments setting in the Edit dialog and over GraphQL (new lib `readCalloutsSetCalloutResponses`). New case 17m has `space.member` post to a template-made callout, with the author read back. The `test.fail` part of the item was already done by #682 |
| 2026-11-09 | W2 journey 7 built on branch `qa/w2-journey-7` (not committed): `profile-editing/` — Space About, own profile, organisation create + edit, 9 cases; 8 green twice and red-proofed on the local stack, H1-3 skipped on a reproduced server defect (`createOrganization` replaces the caller's references with the default social links). Finding: `user-profile/view-profile-information` was already red on develop for two reasons, not one — City is a combobox (client-web#10499, predicted) and Phone moved from Identity to Social Links (not predicted); page object and spec re-aligned. Harness findings: a sonner toast under a resting pointer never dismisses and covers the save bar's button; `PW_BROWSER=chromium` was needed where branded Chrome is absent |
| 2026-11-12 | W2 rows synced after the 2026-11-11 merges: journeys 5 (#711), 6 (#713), 7 (#714, also Tier 1 item 15) and Tier 1 items 9–11 (#712), 12–14 (#716), 16 (#715) done; item 17 in review on #703; the remaining W2 work is tracked as test-suites#718–#723, and the open rulings and unfiled defects for the lead as #724 |

## How to update

Change status here, reasoning in the linked document. One row per workstream item, decision or gap; never duplicate a row, correct it. Add a log line per working session.
