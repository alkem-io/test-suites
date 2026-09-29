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
- **test-suites has no DB access** (GraphQL-only surface) for this domain's specs — any assertion that needs to inspect raw table shape (e.g. verifying a migration's JSONB backfill against legacy scalar-null rows) is out of reach for automation here and belongs to release-ops SQL verification instead. Still standing — architectural, not expected to clear. **Qualified 2026-09-28** (`origin/develop` @ `0ca74068`): since 054 there IS a **loopback-only** Postgres/Redis primitive (`lib/src/config/optional-infra.ts` › `harnessPostgresConfigured`, fail-closed by `lib/src/config/loopback-guard.ts`), used by a few `roleset/associates/**` and `contributor-management/organization/**` cases that skip themselves elsewhere. It reaches a local/CI compose DB only — never ACC, prod, or the remote nightly cluster — so "did the migration rewrite *real* pre-existing rows" is still unreachable from here.
- **Push emit assertions need `RABBITMQ_MANAGEMENT_*`**, which the nightly workflow does not set (see the `nightly` project comment in `server-api/vitest.config.ts`). A push case either skips itself where the management API is absent (`rabbitMqManagementConfigured`) or does not run nightly at all. 2026-09-28.

## Fixture patterns worth reusing

- **Building a "flow-replacing" template for an existing space**: take a donor space, rename its states via `updateInnovationFlowState` to deliberately different names (so no state-name collision with the target), then `createTemplateFromSpace(donorSpaceId, donorTemplateSetId, name)`, then `updateCollaborationFromSpaceTemplate(targetCollaborationId, templateId)`. Demonstrated in `callout/transfer/transfer-callout-template-flow.it-spec.ts` (L1 target) and `journey/conversion/apply-template-l0-wholesale-replace.it-spec.ts` (L0 target — R-22). This is the only currently-buildable way to exercise "apply a template with a different state *set*" — it cannot control the exact state *count*.
- **Classifying a callout into a specific flow phase at creation**: `createCalloutOnCalloutsSet(..., { classification: { tagsets: [{ name: TagsetReservedName.FlowState, tags: [<phase displayName>] }] } })` — used by the platform's own bootstrap L0 template definition (`server/src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts`) and reusable directly in tests since 2026-09-03 (see cleared gap above). Demonstrated in `apply-template-l0-wholesale-replace.it-spec.ts`.
- **A `TestScenarioConfig` with no `space` key creates NO space at all** (`createBaseScenarioPrivate` returns early when `scenarioConfig.space` is falsy), and a `space` with no `subspace` key creates the L0 only, no L1. Always pass at least `space: {}` (L0-only scenario) or `space: { subspace: {} }` (L0 + L1) explicitly — an empty `{ name: '...' }` config silently yields empty IDs on `baseScenario.space`/`.subspace`, which then fail downstream as an opaque "Invalid value supplied for a GraphQL variable" rather than a clear setup error.

- **Async admin operations report through `task(id)`.** Mutations such as `adminCommunicationReconcileForumHierarchy` return a TaskService id. Poll `query { task(id) { status results errors } }` until the status is not `IN_PROGRESS`. No `lib` document or wrapper existed as of 2026-09-28; use a raw `graphqlRequestAuth` helper. `task`/`tasks` resolvers carry **no** auth guard on the server — do not treat a successful read as an authorization signal. 2026-09-28.
- **Loopback Redis = the server's `storage.redis`.** `lib/src/utils/harness-redis.client.ts` points at the same instance the server's messaging client uses, so single-owner leases (e.g. `alkemio:forum-hierarchy-reconcile:lease`) can be planted to test "already running" paths deterministically. Confirm the DB index before relying on it. 2026-09-28.

- **Matrix observability on a local stack (established 2026-09-29, read-only probes).**
  - Without a token, Synapse answers `GET /_matrix/client/v3/directory/room/{alias}` (alias → room id) and `GET /_matrix/client/v3/directory/list/room/{roomId}` (directory visibility).
  - `publicRooms` and room state return 401.
  - Alkemio aliases are `#<uuid>:<server_name>` (matrix-adapter `idmapper.go`). The local server name is `alkemio.matrix.host`.
  - Forum category space ids are `uuidv5("<forumId>:category:<value>", f47ac10b-58cc-4372-a567-0e02b2c3d479)` (server `forum.constants.ts`).
  - For state reads, use the dev appservice token from the server repo's tracked `.build/synapse/matrix-adapter.yaml`. Pass it through an env var set by the user. The harness must never read the server checkout, and should use GET-only helpers.
- **Server develop's quickstart pins matrix-adapter v0.8.17** (`quickstart-services.yml:473`) while the server pins lib 0.8.21, so local stacks lack `set_children` until the image is bumped. 2026-09-29.
- **E2E locale coverage is bounded by `platform.configuration.language.eligible`.** The local stack has default `en` and eligible `["nl"]`. Switch language through the stored setting: `updateUserSettings(settingsData: { userID, settings: { language } })`, as in `language-offer/us2-cross-device-persistence.spec.ts`. 2026-09-29.

## Environment / gotchas

- **Irreversible platform mutations need an owned, just-verified fixture.** `adminForumRemoveDiscussionCategory` succeeds for any `PLATFORM_FORUM_MANAGE` holder (GA, GLOBAL_SUPPORT, PLATFORM_SUPPORT since 027) on an empty category, and there is no add-category API. `platform-discussions.it-spec.ts`'s `beforeAll` deletes **every** platform discussion (on ACC too — the release checklist runs nightly there), so a fixture in another file can vanish mid-test. Keep admin-capable remove calls inside that file, after its `beforeAll`. Read the fixture back immediately before the call. 2026-09-28.
- **Generated TS enums are alphabetical, not declaration order.** `schema.graphql` sorts enum members, so `Object.values(ForumDiscussionCategory)` in `lib` is alphabetical. Never derive "the canonical order" or "the last member" from it. test-suites#600 picks `all[all.length-1]` and would target TIPS_AND_TRICKS. 2026-09-28.
- **`@Min/@Max` on a GraphQL input are not necessarily enforced.** The server's global `ValidationPipe` validates only the DTO classes listed in `src/core/validation/handlers/base/base.handler.ts`. Before planning a BVA case on an input, check the class is on that list; otherwise the decorators are dead code. 2026-09-28.
- **027 (server#6322, merged 2026-09-28) moved forum gates off `PLATFORM_ADMIN`.** Admin-only create, update/delete of a discussion, and category retirement now check `PLATFORM_FORUM_MANAGE`. GLOBAL_LICENSE_ADMIN lost them. Denial messages name `'platform-forum-manage'`. Existing discussions need `authorizationPolicyResetOnPlatform` before the new privilege reaches them. 2026-09-28.

- `test.skip` left in a spec sometimes encodes a *known, tracked* bug rather than flakiness — read the comment above it before assuming it's safe to leave skipped once the referenced issue ships. `convert-L1-to-L0-basic.it-spec.ts` had exactly this pattern for client-web#9528.
- Sibling repo clones under the workspace root can be on an unrelated branch (observed: `server/` clone on `fix/move-space-recompute-platform-roles-access`, not `develop`) — always check `git log --oneline --all | grep <issue#>` rather than assuming the checked-out branch is current; the target commit is usually still reachable via `git log --all`. Reconfirmed 2026-09-28 (same branch); reading `git show origin/develop:<path>` in the clone is the cheap workaround.

### Notification it-specs (established 2026-09-28, `origin/develop` @ `0ca74068`)

- **The `nightly` vitest project lists notification specs by explicit path**, not by glob (`server-api/vitest.config.ts`, the "Feature 061's own notification specs ONLY" block). A new file under `notifications/**` runs under `--project notifications` but **never nightly** until its path is added there. Put that edit in every build sheet that adds a notification spec.
- **Platform admins (`globalAdmin`, `globalSupportAdmin`) receive Space-admin notifications on every Space.** Any exact per-recipient count needs them muted by snapshot/restore (`snapshotNotificationSettings` + `assertCleanupSucceeded`), never by force-all-on. The canonical shape is `notifications/space/community/organization-invitations.it-spec.ts` beforeAll/afterAll.
- **`notif(v)` sets email + inApp only**; push is untouched. Use `notifWithPush` / `notifPush` when push matters.
- **Mute the invitee's `spaceCommunityInvitationReceived` when the invite is only setup.** The invite mail is fire-and-forget, and if it lands after `deleteMailSlurperMails()` it pollutes the next read. `organization-invitations.it-spec.ts:628-635` had to add a wait to work around exactly that.
- **Email subjects render through Nunjucks and are HTML-escaped**: a template literal quote arrives as `&#34;` (`user &#34;<name>&#34; joined <Space>`, `join-community.it-spec.ts:209`). Build exact subjects with the escape; never `includes()` a Space name when the L1 name can begin with the L0 name.
- **User and organization invitation-outcome emails share one subject shape** (`<name> accepted|declined the invitation to <Space>`). Only the in-app row `type` (`SpaceAdminUser…` vs `SpaceAdminOrganization…`) says which event fired, so assert it whenever the actor type matters.
- **The new member's welcome is the causal anchor for "admins were NOT told 'joined'".** Server `NotificationSpaceAdapter.spaceCommunityNewMember` awaits the welcome, then decides on the admin side. Once the welcome is in the inbox, a short settle (≈5 s) closes the negative without an 18 s quiet window.
- **In-app reads with polymorphic payloads** have no committed `lib` fragment. The working pattern is a test-local raw query (`organization-invitations.it-spec.ts:280-329`, `me.notifications(filter:{types})` + `... on InAppNotificationPayloadSpaceCommunityActor { actor { id } space { id } }`). New-member, user-outcome and organization-outcome rows all use that `SPACE_COMMUNITY_ACTOR` payload, so one outcome row is a valid positive control for a "no new-member row" negative. Rows persist across runs, so filter on this run's `space.id`.
- **MailSlurper's connection-pool leak drops mail under burst.** Keep each case at ≤ ~5 mails, assert per recipient + exact subject rather than inbox totals, and rerun a missing-positive once before filing it.

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
