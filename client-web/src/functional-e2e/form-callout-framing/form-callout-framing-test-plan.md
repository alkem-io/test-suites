# Test plan — Form callout framing (080)

> **Status:** Implemented (test-suites#651). Mapping reconciled with the code on 2026-10-02 by the QA PR challenge (static; cases it added are marked *(added)*), then **run live on 2026-10-06** against `develop` with server#6567, notifications#613 and client-web#10362 merged — results under *Live runs* below. · **Story:** epic [alkemio#2005](https://github.com/alkem-io/alkemio/issues/2005), test sub-issue [test-suites#642](https://github.com/alkem-io/test-suites/issues/642) · **Spec:** `specs/080-form-callout-framing/` in `alkem-io/agents-hq` (source of truth for the US/AS/FR/SC/D/R ids below; it governs where the issues disagree) · **Build sheet:** that spec's `tasks/test-suites.md` (T301–T309)

- **Suites:**
  - `server-api/src/functional-api/callout/form/` — seven it-specs (`form-lifecycle`, `form-never-appears`, `form-placement-guards`, `form-presentation`, `form-space-move`, `form-submit-validation`, `form-visibility-matrix`) plus `form.request.params.ts`.
  - `server-api/src/functional-api/notifications/space/collaboration/form-response.it-spec.ts` — MailSlurper.
  - `client-web/src/functional-e2e/form-callout-framing/` — five `@forge-acceptance` walks, persisted from the /forge live verification. They provision their own Kratos identities, Space and Forms; they do not use the harness personas.

## How to run

```bash
cd server-api
pnpm exec vitest run --project callouts src/functional-api/callout/form
pnpm exec vitest run --project notifications src/functional-api/notifications/space/collaboration/form-response.it-spec.ts

cd ../client-web   # needs KRATOS_ADMIN_URL and ALKEMIO_ADMIN_PASSWORD
UI_HEADLESS=true pnpm run test:form-callout-framing
```

- **Nightly:** the it-specs run through the `callout/**` glob and the explicit `form-response.it-spec.ts` entry of the server-api `nightly` project. The walks are **not** nightly; the default Playwright config ignores the folder.
- **Local-only cases:** cases that read Postgres (`delete-rows`, the R14 audit rows) skip themselves unless `harnessPostgresConfigured()`; the push case skips without the RabbitMQ management API. Walk US4-AS6 (re-scoped to a consumer outage, see *Not covered*) needs `NOTIFICATIONS_STOP_CMD`/`_START_CMD`. Walk US4-AS8 needs the loopback harness Postgres.
- **Walk credentials:** the walks sign the platform admin in with `ALKEMIO_ADMIN_PASSWORD`. On a harness stack the Global Admin *is* `admin@alkem.io`, so that value is the server-api `AUTH_TEST_HARNESS_PASSWORD` — not the server's `AUTH_ADMIN_PASSWORD`. A wrong value costs a 401 per file and then a login rate limit (429); `ALKEMIO_ADMIN_TOKEN` (a pre-minted bearer) skips the login altogether.
- **Shared personas:** `form-visibility-matrix.it-spec.ts` registers four **disposable users** (`formpcfa.*`, `formpsupport.*`, `formgsreader.*`, `formpsreader.*`) for its platform-role cells, grants each its one platform role and deletes them in `afterAll`, so no shared harness persona changes while the file runs. The notification spec still switches settings rows of four shared personas (snapshot and restore), which files running in parallel can observe.
- **Known server defects, cases skipped until the fix lands:** the cases are written against the expected behaviour and carry `test.skip` with the issue link in the title (operator decision 2026-10-06: skip rather than `test.fails`); drop the `.skip` when the server fix is on `develop`. [server#6591](https://github.com/alkem-io/server/issues/6591) (existence probe through `deleteCalloutFormResponse`) and [server#6592](https://github.com/alkem-io/server/issues/6592) (stale parent credentials after a cross-L0 move).

## Scenario → test

Spec ids are the 080 spec's. "API" = `server-api/src/functional-api/callout/form/`; "walk" = this folder.

| Scenario | Test |
| --- | --- |
| SC-003 read scope, role × visibility (mine, total, listed, canReadAll, canModerate) | API `form-visibility-matrix.it-spec.ts › Form responses — read scope per role` (12 roles × 2 visibilities + anonymous) |
| SC-003 delete-others per role (under MEMBERS) | API `form-visibility-matrix.it-spec.ts › who can delete another member’s response` incl. *anonymous (added)* |
| SC-003 Global Support with / without support-as-admin; GS cannot read a private Post | API `form-visibility-matrix.it-spec.ts › a private space`, `› a space that allows platform support as admin` |
| US3-AS7 / D-4 parent-space member submits, reads own | API `form-visibility-matrix.it-spec.ts › a parent space member with inherited rights` *(added)*; walk `us3 › US3-AS7` |
| US3-AS8 / FR-020d ex-admin creator: own only, no moderation, cannot delete the Post | API `form-visibility-matrix.it-spec.ts › the ex-admin creator`; `form-lifecycle.it-spec.ts › who may delete which response`; walk `us3 › US3-AS8` |
| R14 audit of platform-role moderation (PCFA, GA audited; space admin, owner, GS-as-admin not) | API `form-visibility-matrix.it-spec.ts › audit of platform-role moderation (R14, local Postgres)` *(added, local only)* |
| R15 moving a subspace under another space carries its Forms to the new ancestors' admins and away from the old | API `form-space-move.it-spec.ts` *(added, live)* — nine cells around `moveSpaceL1ToSpaceL0`; the four that pin the new and old parent admins (stored parent credentials, B's admin reads all, A's admin reads nothing, A's admin cannot delete) are `test.skip` on [server#6592](https://github.com/alkem-io/server/issues/6592) |
| FR-020 the refusal of `deleteCalloutFormResponse` must not reveal whether a response id exists | API `form-lifecycle.it-spec.ts › who may delete which response › a non-moderator gets the same refusal…` *(added, live)*, `test.skip` on [server#6591](https://github.com/alkem-io/server/issues/6591) (today: unknown id → `ENTITY_NOT_FOUND`, real id → `FORBIDDEN_POLICY`) |
| US1-AS1/AS4/AS6/AS7a/AS9 builder, chip, publish, close/reopen, fixed chip | walk `us1` |
| US1-AS2 / FR-001a member cannot create a Form; fixed kind both ways | API `form-placement-guards.it-spec.ts › who can create`, `› the framing kind is fixed`; walk `us1 › US1-AS2` |
| US1-AS3 / FR-001b VC knowledge base: seeded, direct add, conversion | API `form-placement-guards.it-spec.ts › carriers…` incl. *direct add (added)*, `› spaces holding a FORM callout`; walk `us1 › US1-AS3` |
| D-7 carriers: template, subspace request, transfer, space template | API `form-placement-guards.it-spec.ts` |
| US1-AS5, FR-003, FR-007, D-16 caps and lengths (0/1/50/51 questions, 1/2/20/21 options, duplicate, blank/empty label, 512/513 prompt and label, 2048/2049 explanation, options on a text question) | API `form-submit-validation.it-spec.ts › Form definition — limits` (lengths, blank/empty, text-with-options *added*) |
| FR-004a unknown question / option id on update | API `form-submit-validation.it-spec.ts › Form definition — limits` (option id *added*) |
| US2-AS2/AS3/AS10, FR-009 answer validation, no echo | API `form-submit-validation.it-spec.ts › answer validation`, `› answers to removed questions and options` *(added)*; walk `us2` |
| FR-008 BVA 512/513, 2048/2049, UTF-16 | API `form-submit-validation.it-spec.ts › answer validation` |
| US2-AS9 / FR-016b draft and closed reject; US2-AS8 no CONTRIBUTE; anonymous | API `form-submit-validation.it-spec.ts › state and access`; walk `us2 › US2-AS8/AS9` |
| US2-AS11 / FR-011 acknowledged visibility (widen rejected, narrow accepted) | API `form-submit-validation.it-spec.ts › the acknowledged visibility`; walk `us2 › US2-AS11` |
| US2-AS5/AS6/AS12, FR-014, SC-008 single mode, race, withdraw → resubmit, mode switch | API `form-lifecycle.it-spec.ts › SINGLE response mode under concurrency`; walk `us2` |
| US3-AS4 / FR-020b widen blocked after a response, narrow allowed | API `form-lifecycle.it-spec.ts › visibility changes`; walk `us3 › US3-AS4` |
| FR-009a type lock; D-3 snapshots; R9 required toggle binds new submissions only | API `form-lifecycle.it-spec.ts › editing the definition…` (R9 half *added*); walk `us4a › relabelled option` |
| R11 close / reopen, withdraw while closed | API `form-lifecycle.it-spec.ts › closing and reopening` |
| FR-032 Post delete cascades | API `form-lifecycle.it-spec.ts › deleting the Post` (row count only where harness Postgres is configured) |
| FR-030 deleted account → `createdBy` null, answers kept | API `form-lifecycle.it-spec.ts › an account deleted after responding`; walk `us4a › US4a-AS1` |
| FR-020 / US3-AS6 never a contribution, never in activity, not reachable from the schema | API `form-never-appears.it-spec.ts`; walk `us3 › US3-AS6` (full schema guard incl. `InAppNotification*` and `*SubscriptionResult`) |
| US4-AS1/AS2/AS4/AS5 email (pinned subjects, who-can-read sentence, submitter + link), parent admin none, admin-submitter receipt only, row off | `form-response.it-spec.ts`; walk `us4` (adds in-app and push) |
| US4-AS3 / FR-023a no generic contribution mail, with the generic rows switched on | `form-response.it-spec.ts › no mail carries the answer…` |
| US4-AS7 one admin notification per response | walk `us4 › US4-AS7` (3 submissions) |
| US4a-AS1..AS4 review dialogs, 120 responses in pages of 50, confirm-delete, members read all | walk `us4a` |

## Not covered

| Item | Why | Where it is pinned instead / what clears it |
| --- | --- | --- |
| R13 `mine` capped at the 50 newest, oldest first | Needs > 50 own responses: ~51 receipts plus admin mails per run into the shared nightly mailbox | server unit `callout.form.response.service.spec.ts`; add a system case only if the mail volume is accepted |
| D-15 server clamp of `first` to 50 | Same fixture cost. The walk proves only that the client never asks for more than 50 | server unit + `lookup.resolver.fields.form.responses.spec.ts`; /forge gql-live "page clamp 50/55" |
| SC-003 delete-others under ADMINS for every role | Moderation does not read visibility (D-12); the MEMBERS form is the stronger discriminator (readers with ALL still cannot delete) | Tracked advisory in the PR |
| US4-AS6 / FR-024a dispatch failure never fails the submission | No infra lever makes the server's publish fail. The walk is **re-scoped** (its title says so): it stops the notifications *consumer* and proves at-least-once delivery after a restart, not the failure path | server unit (fire-and-forget + structured log) |
| US4-AS8 / D-20 settings row that predates the feature | Needs a direct DB write | walk `us4 › US4-AS8`, loopback Postgres only; migration backfill is a release-ops SQL check |
| FR-020 MCP resources, VC ingest, contribution reporter | No harness for those paths | Structural: responses are not contributions (R1) and are root-only (D-8, walk US3-AS6 schema guard) |
| Search | Descoped by the operator on 2026-09-30 (`forge-run.md` 5d); not recorded in `spec.md` | — |
| FR-016c no comments or reactions, FR-015a no edit, FR-016d not movable | No surface exists to call | Structural; walk `us4a › US4a-AS3` asserts no edit affordance |
| Six-locale copy, "Deleted user" label in all locales | Locale assertions have no home here | client-web unit tests |

## Open questions (need a decision, not a test)

- The receipt says "Only the admins of {subspace} can read your response", but FR-020c also lets the admins of every ancestor Space, Global Admin and Global Support read it, and R15 widens that set after a move. Is SC-005 ("never stored under a wider audience than the one shown") met?
- Platform Support in a Space that allows support-as-admin has no specified read scope or moderation outcome (`data-model.md` scopes the OWN row "without support-as-admin").

## Live runs (2026-10-06, `develop` after server#6567 · notifications#613 · client-web#10362, local compose stack, Chrome headless)

### Run 1 — before this challenge's live fixes

| Suite | Result |
| --- | --- |
| `server-api` `callout/form/` (6 files) | **191 / 191** — lifecycle 32, visibility matrix 57, submit validation 54, placement guards 17, presentation 19, never-appears 12; 102 s. Loopback Postgres cases ran (not skipped). |
| `notifications/.../form-response.it-spec.ts` | **6 / 6**, 37 s (RabbitMQ management configured, push case ran) |
| Form walks (`test:form-callout-framing`) | **46 passed, 1 skipped** (US4-AS6: no stop/start commands), 0 failed, 8.5 min |

Reds and their attribution:
- **Environment (mine):** the first walk attempt failed every file in `beforeAll` with `login admin@alkem.io` → 401, then 429. Cause: I exported the server's `AUTH_ADMIN_PASSWORD`; the harness Global Admin is `admin@alkem.io` with the server-api `AUTH_TEST_HARNESS_PASSWORD`. Rerun with that value plus a pre-minted `ALKEMIO_ADMIN_TOKEN`: green. No test change needed; documented under *Walk credentials* above.
- **Product (new case):** the existence probe written for FR-020 went red live — filed as server#6591, case skipped until the fix lands.
- **Product (new case):** the R15 case went red live — the old parent's admin kept reading and could delete a response in the moved subspace, the new parent's admin read nothing; the stored ADMIN `parentCredentials` still named the old parent. Filed as server#6592, four cells skipped until the fix lands.
- **Test:** none of the pre-existing cases needed a change to pass live.

### Run 2 — after all fixes (QA-CH-14..17)

| Suite | Result |
| --- | --- |
| `server-api` `callout/form/` (7 files, incl. the new `form-space-move.it-spec.ts`) | **201 / 201** — lifecycle 33, matrix 57 (disposable users; none left behind), submit validation 54, placement 17, presentation 19, never-appears 12, space move 9 (4 skipped on server#6592); 110 s. Lifecycle's probe is skipped on server#6591. |
| `notifications/.../form-response.it-spec.ts` | **6 / 6**, 37 s |
| Form walks | **44 passed, 1 failed (US4-AS7), 2 skipped** (AS6 by design; AS8 only because the serial file stops after a failure), 9.5 min. Rerun of the `us4` file alone: **7 / 7 passed, AS6 skipped** — AS7 and AS8 green. Net: 46 / 46 runnable walks green. |

Reds and their attribution:
- **Environment — the local MailSlurper, not the product and not the test:** AS7 submits three responses and polls for three admin mails; it saw one in 90 s. RabbitMQ's `alkemio-notifications` queue showed publish = deliver = ack (every event consumed), and the sink's container log recorded the mail writes in that window, but its REST listing never returned them; after the next burst the sink listed 127 mails of the 460+ writes it had logged since the last prune, with `Invalid HELO command` / `Connection … already exists` errors clustered in bursts (a known defect of this sink). The same file passed on an immediate rerun. No test change: the case is correct, the sink is lossy under load.
- No product or test reds.
