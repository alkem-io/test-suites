# Server rebuild — QA plan: preserve the knowledge, build the net, verify the migration

_Revised 2026-10-27 (supersedes the lib-first draft of the same day). Sources: the architecture briefing "The Alkemio Rebuild" (Go core + file container, PostgreSQL, NATS/JetStream, Matrix direct, one SQL authorization verdict; deck dated 2026-09-22), test-suites `origin/develop` @ `df149442`, the 2026-10-14 client-web net audit (`client-net-audit/`), and the raw server-api inventory regenerated 2026-10-28 by vitest collection (`knowledge/_inventory.md`). The new core's repository is not visible yet (`alkem-io/server-go` is an empty placeholder), so everything that needs its schema is gated, and everything else starts now._

## The plan in one paragraph

Five workstreams, four of which need nothing from the new server. **W1** turns the 234 server-api specs (5,121 resolved cases, 78 skipped, 17 todo) into per-area behaviour documents — what the platform guarantees and why, never how — so the rules survive the schema and become the acceptance checklist for the new core. **W2** makes the client-web Playwright suite the real net before the server lands: the critical journeys of today's Alkemio that no spec walks yet (join, invite, create subspace, change settings, whiteboard/memo/document editing, search, profile and organisation edits, VC) get UI walks whose preconditions and read-backs go only through the lib, so the schema change later touches one package. **W3** designs the dedicated validation environment: automated and manual use of one environment without interference (harness namespace, no global mutations, a sweeper), and the mail decision — a recipient-domain split at the SMTP relay is the recommendation, with a `MailReader` abstraction as the fallback. **W4** verifies the data migration: a legacy-side inventory, URL, content, access and chat parity kit that is written now, run against every dry run and on cutover day. **W5** is the re-point once the schema exists: regenerate, port the lib contract, rebaseline, run the net — in days, because W2 confined the blast radius.

## 0. Where test-suites stands (facts that shape the plan)

| | Count | Note |
|---|---|---|
| server-api spec files / cases / skipped | 234 / 5,121 / 78 (+17 todo) | 25 areas with tests; 7 already have a house-format test plan (activity-logs, conversations, forum-discussions, conversion, orphan-free-deletion, platform-roles, templates) |
| client-web spec files / test plans / nightly files | 166 / 27 / 94 | audit verdicts: 51 STRONG, 30 USABLE, 25 WEAK, 46 NOT-A-NET; nightly 524/533 green on 2026-10-14 in ~2 h |
| lib | 64 TS files, 405 GraphQL documents, ~320-operation SDK | the only package that must change with the schema, once W2's pre-work is done |
| client-web files that bypass the lib | 45 with own GraphQL documents, 41 importing generated enums, 17 importing the raw wrapper | the reason "update only the lib" is not yet true |
| client-web files asserting on mail | 17 in 6 areas (email invitations 5, messaging 5, authentication 3, chat 2, associates 1, space invitations 1) | server-api: 36 files |
| client-web files touching platform-wide state | 10 seed the 14 platform-role users, 9 wipe the shared inbox, 7 flip persona settings, 4 assign platform roles, 4 create forum discussions, 49 navigate to global pages (Explore, Home, Forum, Library) | the list W3 must neutralise before a shared environment |
| local clone | 18 behind, 12 uncommitted Tier 0 files + the audit folder | retire first |
| open PRs on the frozen suite | #612 (parallel server-api nightly), #545 (collab wire suite) | decide merge-or-close |

## 1. What the rebuild changes (condensed; the full impact map is in the first draft's history)

The GraphQL surface is designed from scratch (31 queries, 84 intent mutations; `viewer`, `resolve(url)`, `node(id)`, one `space` document). Community/roleSet become credentials on the space; callout/contribution/post become one recursive `post` with a kind; applications/invitations become one `membership_request`; flow states become `stage`; tagsets/classifications/reactions/votes become vocabulary + label; preferences become `user_settings` attribute rows; notification kinds are registry rows; subscriptions, RabbitMQ, the matrix-adapter, the notifications service, stored authorization policies and every reset mutation disappear; files upload straight to the file container; chat goes browser → Synapse. IDs and URLs are preserved through aliases, the UI is kept, the client is rewritten against the new surface, and the cutover is a big bang with an ETL from legacy data while the legacy stack keeps running in parallel. The harness's two REST dependencies (`POST /api/auth/non-interactive-login`, `GET /api/auth/oidc/id-token-hint`) have no stated successor.

## W1 — Server behaviour knowledge base (start now; done before slice 4 closes)

**Goal.** One document per area under `docs/qa/server-rebuild/knowledge/`, each a table of behaviour rules: *ID · rule the platform guarantees · why (business reason, originating issue) · actors · evidence (spec › case) · legacy status*, followed by the constants the rules depend on (limits, plan names, error texts — the rebaseline candidates) and the "where this lands in the new core" paragraph. No mutation names, no fixtures, no request params. `entitlements.md` beside this plan is the worked example and the template.

**Why this shape.** A rule written as "a fourth innovation pack is refused and the entitlement leaves the available list" is checkable against any server, by a person or by a new test. The raw inventory of 5,121 resolved case titles (`_inventory.md`, collected by vitest so `test.each` tables and template names are expanded) is the seed and the completeness checklist, not the knowledge: a title says what a case is named for, not what it asserts, so each rule is extracted from the case body (the assertions, the error texts, the read-back) and the inventory is ticked off against it. Over half the rows are decision-table expansions: 1,749 platform-roles capability rows and 895 storage document-auth rows collapse into a handful of rules each, so the 752 describe groups are the better measure of distinct behaviours.

**Method.** Per area: read the specs, the area's test plan if it exists, and the request-params helpers; write the rules; the QA lead reviews each table (an agent drafts, a person signs the `why` column). Areas with an existing house test plan go first because the purpose is already written down. Then order by the rebuild's slices, so each area's rules are ready when the slice that reimplements them is reviewed:

| Slice window | Areas (cases) | Why in this order |
|---|---|---|
| 4–5 space and posts | journey (274), callout (237), templates (48), calendar (29), storage (18), collabora (18), visual (8), pagination (13), search (15), language (15), configuration (2), platform (7) | the space document and post kinds are the first thing the new core must get right |
| 6–7 membership and licensing | roleset (229), contributor-management (77), entitlements (16 — done), account (18), platform-roles (66), graphql-guard (33), orphan-free-deletion (12) | credentials, membership requests, plan assignments |
| 8–9 threads, notifications, activity | notifications (203), communications (88), push-notifications (65), activity-logs (31), subscriptions (5 — record, then retire) | registry-driven notification kinds; Matrix control plane |
| 10–12 library and ops | innovation-pack (1), the admin/ops rules scattered in platform-roles and platform | the ops namespace |

**Output besides the documents.** (a) A single `rebaseline-register.md` collecting every constant from every area, with a ruling column for product. (b) A `gaps.md` of rules the legacy suite never covered but the area obviously has (each example document ends with three). (c) A cross-reference from each rule to the deck's concept, so the new core's capability ledger (165 rows) can be checked against the rules rather than the other way round.

**Effort.** 25 areas; the big four (journey, callout, roleset, notifications) are a day each with an agent drafting and the lead reviewing; the rest half a day each. Two to three weeks of calendar time alongside W2.

## W2 — The client-web net, built now (start now; green on the legacy nightly before the schema lands)

**Goal.** Every critical journey of today's Alkemio is walked through the browser with a falsifiable oracle, registered in the nightly, and written so that only `lib/` changes when the server does.

**Rules for every new or touched spec** (they are the conventions in `client-web/docs/e2e-conventions.md`, tightened for the migration):

1. Preconditions and teardown through lib functions named after the business action, never an inline GraphQL document. Read-backs too: `expect(await lib.readSpaceSettings(id))`, not `rawGql`.
2. Enums from lib-owned enums, not from the generated schema.
3. No shared-persona mutation, no inbox wipe, no dependence on environment data (W3 needs this on day one).
4. Oracles are what the user sees plus one read-back; server constants only through the rebaseline register.

**Pre-work that makes the rules enforceable (first two weeks, schema-independent):**

- Fold the 45 spec-local GraphQL documents into named lib functions (~60 functions; the per-area list is in the audit §3c). Keep `postGraphqlRaw` only where a spec deliberately sends a malformed or foreign document.
- Replace the 41 generated-enum imports and the 17 raw-wrapper imports with lib-owned enums.
- ESLint `no-restricted-imports` in client-web for `@alkemio/tests-lib/core/generated/*`, `@alkemio/tests-lib/utils/graphql.*`, `@alkemio/client-lib/dist/generated/*`, and the `gql` tag.
- A lib contract test: imports every exported name the specs use (the 24 base functions, the factory, the user manager, the registration chain, the mail readers), runs `createBaseScenario` → read-back → `cleanUpBaseScenario` in under a minute. First thing to go green on the new core.

**Critical journeys to add, ranked by daily use and by the rebuild's risk** (verdicts from the audit's matrix; "absent" means no UI walk exists in any runner today):

| # | Journey | Today | Oracle that would go red on a wrong server |
|---|---|---|---|
| 1 | Join an open Space, then open it | absent | member sees the Space page and the member-only callout; a second persona does not |
| 2 | Invite an existing user to a Space → accept in the UI → open it | absent | invitation row, mail subject per recipient, membership read-back, Space opens |
| 3 | Create a subspace (L1, L2) through the UI | absent (all seeded) | subspace appears in the parent's sidebar, URL resolves, level read-back |
| 4 | Change Space privacy / membership policy / collaboration toggles through the UI | absent as a write | second persona's access changes (positive + negative control) |
| 5 | Whiteboard: draw, save, reopen; memo: edit, sign gate; Collabora document: open, type, read back | absent | content read-back changed + a second session sees it |
| 6 | Flow-state change of a post; reorder callouts; move a contribution | absent | position/state read-back, member view |
| 7 | Edit Space about/tagline/tags; edit own profile; create and edit an organisation | absent / weak | reload + read-back, disposable identity |
| 8 | Global search and sidebar search | absent (manual only) | own run-unique names found, others' not |
| 9 | Virtual contributor: create on account, add to a Space, ask in a thread, get an answer | absent | VC reply row |
| 10 | Message community leads / an organisation; notification settings persist | toast only / partial | mail per recipient; settings after reload |
| 11 | Upload a file / reference; media gallery; message attachment | absent | storage read-back, download gated by access |
| 12 | Forum: create + reply nightly; innovation packs; admin organisations; mentions | manual / absent | row + mail |

Plus the Tier 0 registrations already built on 2026-10-14 (platform smoke canary, platform roles, memberships, contributors callout 0.1 — uncommitted) and the Tier 1 falsifiability fixes in the audit (§4 items 9–17) for the writes that exist but prove nothing.

**Order.** Pre-work → journeys 1–4 (membership and structure are the new core's slices 6–7, the first place it can diverge) → 5–6 (posts and documents, slices 4–5) → 7–8 → 9–12. Each journey lands as one area directory with its test plan, registered in `playwright.config.nightly.ts`, green on the legacy nightly. Roughly five to seven weeks for the twelve with one implementer; parallelisable by area.

## W3 — The dedicated validation environment (decide now; in place before slice 5's review)

**Facts.** The Hetzner test cluster is wiped nightly and belongs to the legacy stack. The new core gets its own environment, used at the same time by the automated net and by people validating manually, and — for W4 — holding migrated, production-shaped data that must not be wiped. So the nightly reset is gone, and anything a test leaves behind or mutates globally is visible to a person, and vice versa.

**Isolation design (the harness side).**

- **Namespace by name.** Everything the harness creates already carries `UniqueIDGenerator.getID()`; add a fixed, visible marker (`qa-` prefix on display names and handles, a `qa-harness` tag where tags exist) so people can ignore harness data at a glance and a sweeper can find it.
- **Harness personas stay the harness's.** The 13 `@alkem.io` personas and the 14 platform-role users are never used by people; people get their own accounts and their own organisation. Document the split in the environment's README.
- **No global mutations on the shared environment.** The suites that assign platform roles, seed platform-role users, create forum discussions or flip settings on shared personas (the files counted in §0) run only under `HARNESS_EXCLUSIVE=true`, a Playwright project group that the shared-environment run does not include; they keep running on the local compose stack and on any throwaway environment.
- **Mail is read per recipient, never wiped.** The 9 `deleteMailSlurperMails` call sites go (Tier 0 item 4 already asks for this).
- **Global pages are asserted by own name.** The 49 specs that open Explore, Home, Forum or the Library assert on the run-unique entity they created, never on counts or first rows.
- **A sweeper, not a reset.** A harness-owned teardown job deletes `qa-`-marked entities older than N hours (spaces, organisations, packs, VCs, disposable identities) through the lib; it is the environment's garbage collector and runs after each nightly and on demand. A leaked fixture is a logged finding, not a silent accumulation.
- **Parallel-safe by construction.** With the rules above the suite can run with more than one worker, which the 2 h serial nightly needs anyway.

**Topology options (decision 1).**

| Option | What it is | For | Against |
|---|---|---|---|
| A. two environments | `validation` (migrated data, people, integrity checks, no automation) + `automation` (fresh seed, nightly reset, the net) | clean separation; automation keeps its reset | two deployments of a stack still being built; automation never meets production-shaped data |
| B. one shared environment + the isolation rules | the net and people share the migrated environment; exclusive suites run on the compose stack | one environment; automation exercises real-shaped data; matches "legacy kept in parallel" | discipline must hold from day one; sweeper is mandatory; exclusive suites lose their cluster run |

Recommendation: **B** as the baseline (the rules are needed anyway for parallelism and were the house convention already), with A's `automation` environment added only if the exclusive suites prove they need a cluster.

**Mail (decision 2).** Today MailSlurper is the SMTP sink and the read API for 17 client-web and 36 server-api files. People validating the new core need a real mail client: real invitations, real recovery mails, their own inboxes.

| Option | Mechanism | Test impact | Cost |
|---|---|---|---|
| 1. Split at the relay (recommended) | The core's SMTP points at a relay in the environment (Postfix `transport_maps` or any small MTA) that delivers `*@alkem.io` harness addresses to MailSlurper and every other recipient to the real provider | none — the lib keeps the MailSlurper reader | one relay deployment, owned by ops; a line in the environment README |
| 2. Real provider for all + a harness mailbox | Harness personas move to a domain the QA circle controls with a catch-all mailbox; the lib gets a `MailReader` interface with a MailSlurper implementation and an IMAP (or Mailosaur/testmail-style API) implementation | every mail oracle goes through the interface; delivery lag enters every wait (`digestWindow` + provider lag) | a domain + mailbox or a paid service; harness mail leaves the cluster |
| 3. MailSlurper for all, people use its web UI | nothing changes | none | does not meet the requirement for a real client |

Option 1 keeps the net untouched and gives people real mail; option 2 is the fallback if no relay can be hosted, and the `MailReader` abstraction is cheap enough to build regardless as insurance.

**Also in this workstream.** The environment's server-side test switches (messaging debounce windows, file-sweep grace, invitation resend cooldown), the Kratos admin API reachability for identity provisioning, and a token mint for the harness (the hard ask in W5).

## W4 — Data migration and integrity verification (legacy half now; new half after the DDL)

**Facts from the briefing.** Big-bang cutover with an ETL from legacy data; ids and URLs preserved through aliases; chat history untouched because the rooms are the same rooms; a dry run of a production dump against the new schema runs during the foundation slices and the ETL spec is written from its failures; roughly a hundred legacy tables map onto sixty; features verified dead (user groups, preference sets, billing integration) are dropped.

**What "verified" means here.** A reconciliation report, produced by a kit that runs the same way on every dry run and on cutover day, where every difference between the legacy pre-image and the new post-image is either zero or explained by a line in the expected-loss list. The house precedent is the release-78/79 pre- and post-deploy SQL checks in `~/repos/qa/release-7x/` (row counts, orphan checks, pre-image/post-image CSVs); this is the same approach scaled to the whole model.

**Layers of the kit.**

| Layer | Question | Legacy side (write now) | New side (after the DDL) |
|---|---|---|---|
| 1. Inventory parity | Is everything there, and only that? | counts per entity type, per Space tree and level: spaces, callouts + contributions + posts, whiteboards + memos + documents, users, organisations, VCs, role assignments, applications + invitations + platform invitations, templates, packs, calendar events, files per bucket | the same counts over the spine (`entity_type`, `post_kind`, `document`, `credential`, `membership_request`, `file`), reconciled with the expected-loss list |
| 2. Identity and URL parity | Does every legacy URL still open the same thing? | the full set of nameIDs/URLs for spaces at every level, users, organisations, callouts, posts, VCs, packs | `resolve(url)` for each → the preserved id; aliases present |
| 3. Content fidelity | Is the content byte-identical? | hashes of profile fields, markdown bodies, tagsets, references, visuals' object keys; file objects' content hashes from the file service | the same hashes from `post`, `document`, labels, and content-addressed `blob` (sha256 is the natural key there) |
| 4. Access parity | Does everyone see exactly what they saw? | for a sample matrix of actors × resources (the personas plus real accounts on the dump): `myPrivileges`, membership lists (members / leads / admins) per Space, private-Space invisibility, platform roles | the SQL verdict for the same pairs; the briefing says an admin can run it directly |
| 5. State and settings parity | Did the switches survive? | Space settings (privacy, membership policy, collaboration flags), per-post flow state, callout visibility/status, notification preferences, plan assignments and entitlements, organisation verification | per-entity settings, `post.stage_id`, `post` status, `user_settings`, `plan_assignment` |
| 6. Chat parity | Are the rooms the same rooms? | room ids per Space / thread / DM and message counts, via the Synapse admin API | the same room ids on the `thread` anchors; counts unchanged |
| 7. Behavioural smoke | Does it still behave? | — | the W2 net on the migrated environment + the W1 documents as the manual checklist for areas without a walk |

**Expected-loss list.** Written with the backend team from the briefing's "verified dead" items and from the ETL spec as it emerges from the dry runs; every reconciliation delta must map to a line here or is a finding.

**When it runs.** (1) Now, legacy side only, against ACC over the Lens port-forward (the access the release-79 analysis used) to produce the baseline numbers and the actor × resource sample. (2) On every dry run the backend team does with a production dump, to feed the ETL spec from our failures as well as theirs. (3) On the migration rehearsal(s) on the validation environment. (4) On cutover day: pre-image captured before the ETL, post-image after, go/no-go on the report. The report format is fixed in the kit so the fourth run reads like the first.

## W5 — Re-point when the server lands (gated on the SDL; days, not weeks, if W2 held)

1. `CODEGEN_SCHEMA=<sdl> pnpm --filter @alkemio/tests-lib run codegen`; delete every document the contract does not need.
2. Port the lib contract in dependency order, with the contract test as the oracle: token mint + `viewer` → personas → organisation → space / subspace / settings → credentials → posts by kind → documents → membership requests → templates and packs → agents → platform credentials. Keep every exported name; change only the implementation.
3. Rewrite the direct-SQL oracles against the new tables or replace them with `viewer` / `node(id)` reads.
4. Apply the rebaseline register rulings; label every remaining red as product / test / env.
5. Run the net in precondition order on the validation environment: smoke → authentication → space → public space → memberships → applications → invitations → callouts → documents → sidebar/classifications → templates → platform roles → the rest. Membership journeys stay red until slice 7; chat and notifications until slice 9; that is expected and reported as such.
6. Switch the nightly workflows: `deploy-all-services` fans out to the core and the file container; `cleanup-database` becomes the sweeper on the shared environment and the full reset only on a throwaway one; the legacy server-api nightly keeps running against the legacy environment until that stack is switched off, then `server-api/` moves under `testOld/` with its last green report and its knowledge documents linked.

## Timeline against the rebuild's slices

| Rebuild stage | W1 knowledge | W2 client net | W3 environment | W4 migration | W5 re-point |
|---|---|---|---|---|---|
| now (slices 2–3, foundations) | areas with plans → space/post areas | pre-work (lib folding, enums, lint, contract test) → journeys 1–4 | decisions 1 and 2; isolation rules into conventions and ESLint; sweeper | legacy-side kit + ACC baseline + actor × resource sample | asks sent (token mint, signed-in signal, SDL + ledger) |
| slices 4–5 (space works; first review round) | membership areas | journeys 5–8 green on legacy nightly | environment stood up with a dry-run dump; mail relay live | layers 1–3 and 5 on the dry run | codegen + space half of the contract; smoke canary green |
| slices 6–7 (membership) | threads areas | journeys 9–12 | people start manual validation under the rules | layer 4 access parity on the rehearsal | membership half; nightly on the validation environment |
| slices 8–9 (threads; go/no-go) | library/ops areas | messaging via UI or Matrix sender | notification switches set | layer 6 chat parity | chat and notifications suites |
| slices 10–12 and cutover | rebaseline rulings closed | full net green | automation environment only if needed | cutover-day run, go/no-go | workflows switched; legacy archived |

## Decisions needed (owner: QA lead unless stated)

| # | Decision | Recommendation |
|---|---|---|
| 1 | Environment topology (W3) | B: one shared environment + isolation rules + sweeper; add an automation environment only if the exclusive suites need a cluster |
| 2 | Mail on the new environment (W3) — with ops | relay split by recipient domain; build the `MailReader` abstraction anyway |
| 3 | Harness marker and sweeper policy (W3) | `qa-` prefix + tag; sweep after 24 h; leaks reported |
| 4 | Which suites are "exclusive" and leave the shared nightly (W3) | platform-roles, forum discussions, language-offer persona switches, account-deletion SQL/Redis specs |
| 5 | Where the knowledge base lives (W1) | `test-suites/docs/qa/server-rebuild/knowledge/` (committed), one PR per slice window |
| 6 | Server-api PRs #612 and #545 | merge #612 (halves the legacy nightly it still runs); #545 only with its two assertions pinned live |
| 7 | Rebaseline rulings (W1 register) — with product | per row, before W5 step 4 |
| 8 | Expected-loss list (W4) — with the backend team | from the "verified dead" features and the ETL spec |
| 9 | Harness contract on the new core — with the backend team | a non-interactive token mint, a signed-in signal, the SDL + ledger in the repo, test switches, Kratos admin reachability, a reset recipe |
| 10 | Dataset for the validation environment (W4 addendum) — with DPO/legal | acceptance now; pseudonymised production snapshot for the final rehearsal if allowed; production reconciliation by an operator, aggregates only |
| 11 | ETL quarantine contract — with the backend team | unmappable rows are reported, never dropped; defect signatures classified vanish / repair / quarantine |
| 12 | Backup inventory for the new stores — with ops | new-core database store + restore drill before cutover; retention of the final legacy dump; Synapse config refresh |
| 13 | Test-suites redesign scope (W6) | build the skeleton now; `api`, `performance`, `security` fill after the core exists |
| 14 | Cutover go/no-go ownership | QA owns the evidence per W4 layer; thresholds agreed before the first rehearsal |

## W4 addendum — data quality: the acceptance dataset, and the production data we may not see

**The problem.** Acceptance holds years of data shaped by every release, some of which shipped with defects; production holds a different history and is off limits for testing. A migration verified only on clean seed data proves nothing about either. A reconciliation delta on acceptance may be a migration bug or a pre-existing data defect, and the two must be told apart before cutover day, not on it.

**Approach: a known-defect register, probed as aggregates, on both datasets.**

1. **Build the register of data-defect signatures from what is already known.** Each signature is one SQL probe that returns a count and sample ids, never content. Seeds that exist today: 1,050 authorization-policy rows with empty credential rules (`authorization-policy-empty-credentialrules.csv`, test-suites root); 147 subspace ADMIN roles carrying the space-member parent credential on acceptance, 69 users affected, from the 2024-09 roleSet migration, production unchecked (`~/repos/qa/release-79/security/`); `communication.spaceID` empty strings (server#6594); the orphan families the `orphan-free-deletion` suite, the release-79 `acc-post-reset-orphans.sql` and the `orphaned-data` utility already enumerate; settings JSON rewritten wholesale by migrations (release 79 rewrote 6,733 sidebar rows); stale authorization policies after a mismatched reset worker. Then add the generic families: foreign keys pointing at nothing, required references null, duplicate handles/nameIDs, invalid JSON shapes in settings columns, credentials whose resource no longer exists, users without profile or account, spaces without account, files without a referencing row, references to files without bytes.
2. **Classify each signature by what the rebuild does with it.** Three outcomes, decided with the backend team and written next to the signature: *vanishes by construction* (every stored authorization-policy defect: the new core stores no policies, so the ETL must simply not carry them), *must be repaired in the ETL* (credential escalations, orphan references, empty ids — these map straight onto `credential` and spine rows and would reproduce the defect on the new core), or *must be quarantined* (rows the ETL cannot map; the ETL reports them, never drops them silently — an ask for the backend team).
3. **Run the probes where we may.** On acceptance ourselves over the port-forward, before every rehearsal, producing the acceptance pre-image with its defect counts. On production, the probes are handed to an operator (or to the backend team's dry-run dump) and only the aggregate output comes back: counts per signature, no rows. Production signatures that acceptance never shows become new register entries, so the ETL is tested against the shapes production actually has.
4. **Make the reconciliation defect-aware.** Every W4 layer reports deltas net of the register: a delta that equals a signature's count and classification is explained; anything else is a finding. The expected-loss list and the register are the two documents that turn "numbers differ" into "numbers differ for a known reason".
5. **Decide what dataset the validation environment holds.** Options: acceptance as is (available now, known defects, not production-shaped in volume or history); a pseudonymised production snapshot (closest to the truth; needs a DPO/legal ruling and a pseudonymisation step that keeps referential integrity, including Kratos identities and Synapse rooms); or the backend team's production-shaped seed (clean, no history). Recommendation: acceptance now for everything, a pseudonymised snapshot for the final rehearsal if legal allows, and the production reconciliation itself run by an operator on cutover day with aggregate output only.

## Backups and stores across the cutover

Today's inventory (`infrastructure-operations/orchestration/backup/inventory.yml`, one store per PostgreSQL database): `alkemio`, `synapse`, `kratos`, `hydra`, `wopi`, `assistant`, plus `chromadb`, `file-storage`, `synapse-config`, `synapse-media` pending, with the `filebackup` ledger restorable but rebuildable, and `redis` / `rabbitmq` excluded. The whiteboard and document collaboration services keep their state in the `alkemio` database. What each store means after the migration:

| Store | What the rebuild does to it | Relevance after cutover | What QA verifies |
|---|---|---|---|
| `alkemio` (legacy schema) | replaced by the new core's database (60 tables); the ETL reads it | the **last pre-ETL dump is the rollback artefact and the audit record**; keep it immutable for the retention period; it can never be restored into the new core except by re-running the ETL | the pre-image is taken from that exact dump; a restore drill of it on the legacy stack is part of the rehearsal |
| new core database | new store, new schema | the only live store from day one; needs its own inventory entry, schedule, monitor thresholds and a restore drill **before** cutover | the post-image; the restore drill is a go/no-go item |
| `kratos` | untouched by the ETL (identities, credentials, recovery) | fully relevant; the core keeps resolving `alkemio_actor_id` from identity traits | identity count parity and every persona's trait still resolving to the preserved actor id |
| `hydra` | OAuth clients and consent sessions; the core absorbs the OIDC BFF | relevant; client registrations may change | the registered clients still issue tokens the new core accepts; the signed-in signal works |
| `synapse` + `synapse-config` + `synapse-media` | "the rooms are the same rooms"; the core becomes the AppService, replacing the matrix-adapter; media becomes a cache over the file container | database fully relevant; the config backup must be **refreshed after cutover** (new AppService registration); the media store changes meaning — attachments move to the file container | room ids and message counts per room (layer 6); every legacy attachment fetchable through the new path |
| `file-storage` + file-backup S3 targets (content-addressed, SHA3-256) | the new storage engine is content-addressed blobs with replicas and a ledger; the deck says no separate backup service | the S3 targets are either the new engine's immutable archive target or a historical copy; **the hash function must match** or every object is re-hashed in the ETL | every legacy file hash present in the new blob store (layer 3); the independent immutable bucket stays in the inventory |
| `filebackup` ledger | the service is retired if the engine's own ledger replaces it | obsolete after cutover; keep the last manifest | nothing beyond layer 3 |
| `wopi` | WOPI moves into the file container | locks and document versions migrate or reset; the store is retired | document versions and the Collabora open/save cycle on migrated documents |
| `assistant`, `chromadb`, libra-flow volume | AI satellites stay; they reference platform ids | relevant unchanged, because ids are preserved | sampled references resolve on the new core |
| `redis` | sessions and caches | excluded today, excluded tomorrow; every session is invalid at cutover | everyone re-logs in; web-push subscriptions and inbox read state are migration items, not Redis |
| `rabbitmq` → NATS JetStream | queues replaced; the outbox lives in the new core's database; streams are projections | excluded, documented; retention policy to be set | dead-letter path lands in `audit_entry` (deck) |
| Elasticsearch | search documents are a projection; the `alkemio-data-*` index templates in `reporting-orchestration` assume the legacy schema | reindex at cutover; the analytics pipeline needs an owner | search finds migrated content; analytics owner confirmed |

Two asks for ops that fall out of this: a new-core store in the backup inventory with a restore drill before cutover, and the retention ruling for the final legacy dump.

## W6 — Redesign of test-suites for the next decade

The suite is a monorepo of three packages built around the legacy API. The rebuild is the moment to reshape it so that each kind of verification has a home and all of them share one harness, one environment model and one traceability key.

| Package | Purpose | Status |
|---|---|---|
| `harness-core` | environment profiles (`local`, `validation-shared`, `exclusive`, `prod-synthetic` read-only), identities and token mint, `MailReader`, Matrix client, database readers for legacy and new, the `qa-` sweeper, reporting | from `lib/` utilities |
| `harness-domain` | the business-action functions (the lib contract of W2), generated-SDK-backed, the only place that knows the schema | from `lib/scenario` |
| `client-web` | the UI net | exists |
| `api` | black-box contract and authorization tests on the new core: the actor × action × resource matrix generated from the W1 rules as data-driven cases; the successor of server-api's role at a fraction of its size | new |
| `data` | the W4 reconciliation kit, the defect-signature register, and standing database invariants (orphans, dangling credentials, duplicate handles) run nightly on the shared environment | new |
| `performance` | the budgeted screens and write paths under load (k6 or Artillery), thresholds from the briefing's budgets, plus web-vitals from Playwright; today's `load-testing/` is only an Excalidraw socket stress test and is folded in | new |
| `security` | authorization negatives from W1, session and token checks, share-link and guest access, file-download gating, an OWASP ZAP baseline against the validation environment in CI, dependency audit | new; `testOld/non-functional/auth` is the ancestor |

Cross-cutting: one tag vocabulary (`@smoke`, `@exclusive`, `@destructive`, `@migration`, `@perf`, `@security`), one ESLint ruleset with the import boundary, one report site (gh-pages already), and **W1 rule ids as test annotations** so every case in every package points at the rule it proves and the knowledge base shows its coverage per rule. The skeleton (packages, profiles, tags, annotations) is built now so W2 lands into it; `api`, `performance` and `security` fill once the new core exists. Same monorepo; `server-api/` moves under `testOld/` after cutover.

## Gaps found in the plan so far

1. **No cutover runbook on the QA side.** Freeze window, the delta written to legacy between pre-image and ETL (RPO of the migration), rollback = restore the final legacy dump + route back, quantified go/no-go criteria per W4 layer, and a timed rehearsal. The backend team owns the ETL; QA must own the go/no-go evidence.
2. **No performance or security verification of our own.** The briefing's numbers are the builder's benchmark. We need our baseline on the legacy stack now (same screens, same concurrency) and the same run on the validation environment with migrated data; and the authorization rewrite is a security change that needs adversarial cases (share links, guests, suspended actors, drafts, cross-space moves), not only parity.
3. **The client rewrite has no acceptance owner in the plan.** W2 assumes locators survive; someone must sign off UI parity, accessibility and translations (Dutch) on the rewritten client. The W2 net doubles as that check only if it is run against the rewritten client early, in its own environment.
4. **Consumers of the legacy API and schema are unlisted.** `client-lib` (public npm), `cli`, `populator`, `server-api-mcp`, `assistant-service`, the VC engines, `kratos-webhooks` identity resolution, `ecosystem-analytics`, `data-analytics`, `reporting-orchestration` index templates, the documentation site's examples. Each needs an owner and a parity check or a retirement note.
5. **Continuity items at cutover.** Everyone re-logs in; web-push subscriptions; notification inbox read state; pending invitation and recovery links in already-sent emails; platform-invitation tokens; MCP API keys. Each is a migration row or an accepted loss.
6. **Hypercare.** Synthetic monitoring on production after cutover (the smoke canary with a read-only persona), a support triage rota, an error budget and a rollback deadline.
7. **The timeline is unverified.** The deck is dated 2026-09-22 and says slices 0–1 are done; the actual slice status and the intended cutover date set every date in this plan.
8. **Review capacity.** W1 is 5,121 resolved cases in 752 describe groups to sign off; agents draft, but the "why" column needs the QA lead. Budget it, or scope W1 to the slice windows as they come.
9. **Bulk test data for the new core.** The backend team's production-shaped seeder should be reused for the automation environment instead of the scenario factory; ask for it.
10. **Email content.** Templates are rewritten with the notification registry; subjects, bodies and translations need a content review, not only a rebaseline.
11. **No platform feature catalogue, so no true gap analysis.** Every coverage view we have is derived from the tests or from one delivered story: the client-web audit lists 62 journeys read off the app's screens, the server-api inventory lists what 234 spec files assert, and `docs/qa-knowledge/coverage-map.md` holds 13 story-level sections with spec references (FR ids, workspace#NNN) for work delivered since 2026-09. None starts from the list of what Alkemio does. W1 cannot see a behaviour no test ever touched. The missing step is a catalogue of platform features built from sources that are not the tests — the legacy GraphQL mutation and query surface grouped by domain, the client-web routes and settings sections, the 47 workspace specs and the per-repo specs, and the rebuild's own 31-query / 84-mutation target surface — and one matrix feature × server-api coverage × client-web coverage × spec reference × rebuild slice, with a verdict per row (full / partial / absent / dead-by-design). That matrix is what "gap analysis" should mean here; it also decides W2's journey list objectively instead of by audit judgement, and gives W4 its expected-loss list for free. Belongs at the front of W1 as step 0.

## Not covered, on purpose

- The server-api specs are not ported; their rules live on in W1 and their coverage is replaced by the core's own in-repo tests plus the W2 net. The 23 pure-API cases hiding in Playwright files die with them unless W2 gives them a UI walk.
- Page-object breakage from a redesigned client is a separate pass, triggered only if the rewrite adopts `client-web-prototype` rather than keeping today's design as the briefing promises.
- The ETL itself and the migration dry runs are the backend team's; W4 verifies them and feeds failures back, it does not write the ETL.
