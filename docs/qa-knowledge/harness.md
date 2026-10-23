# QA harness notes

Where suites live, standing tooling gaps, environment quirks, and gotchas
discovered while designing/implementing plans. Correct stale entries in
place; cite this file instead of rediscovering a gap.

## Where things live

- Server-API functional specs: `server-api/src/functional-api/<domain>/*.it-spec.ts` (vitest, ESM).
- Shared GraphQL operations/fragments: `lib/src/scenario/graphql/{queries,mutations,fragments}/**/*.graphql`, consumed via generated types in `lib/src/core/generated/alkemio-schema.ts` — run `pnpm --filter @alkemio/tests-lib run codegen` then the server-api package's own codegen after editing any `.graphql` file.
- Domain-specific request wrappers: `server-api/src/functional-api/<domain>/<domain>.request.params.ts` — thin functions around `getGraphqlClient()` + `graphqlErrorWrapper`. A schema field/mutation existing does NOT mean it's reachable from a test — check for a `.graphql` operation file AND a request-params wrapper before assuming a case is buildable.
- Feature-area test plans for `server-api`-only features live in the feature directory, in the client-web house format: `journey/conversion/conversion-test-plan.md` (first, 2026-09-03), `communications/forum-discussions/forum-discussions-test-plan.md`, `templates/templates-test-plan.md` (2026-10-15). `platform-roles/platform-roles-test-plan.md` is **generated** from `capabilities.data.ts` (`pnpm run test:platform-roles:plan`) and must never be hand-edited. Client-web plans are split across `plans/`, the feature directory, and `functional-e2e/` root — check all three.
- `test-suites/docs/qa-knowledge/` did not exist before 2026-09-03 (this run created it).

## Standing tooling gaps

- ~~**No `createStateOnInnovationFlow` / `deleteStateOnInnovationFlow` request-params wrappers**~~ — **cleared 2026-10-21, PR #677**: `createStateOnInnovationFlow(flowId, displayName, description?, settings?, userRole?)` and `deleteStateOnInnovationFlow(stateId, userRole?)` live in `innovation-flow.request.params.ts` (raw-request style, next to `updateInnovationFlowStatesSortOrder` and `getFlowStatesByCollaboration`). Exact-state-count donors are now buildable; the deferred 9-state / 2-state template cases are unblocked but not yet written. Original note kept for history: despite both mutations existing in the generated schema (`lib/src/core/generated/alkemio-schema.ts`). This blocks building a donor space/template with an _exact_ custom state count (e.g. exactly 2 or exactly 9 states) at the API level — the only levers available are the platform's default templates (4 states for L0, 5 for a subspace) and renaming existing states via `updateInnovationFlowState`, which changes names but not counts. Any future case needing a precise state-count boundary (1..8 enforcement, template min/max) is blocked on this until someone adds the wrappers. Cleared once: the `.graphql` mutation files + request-params wrappers exist (small, mechanical — follow the pattern of `updateInnovationFlowState`). Still open as of 2026-09-03 — out of scope for the conversion plan's automate-now rows (M-3/M-4 stay manual).
- ~~`InnovationFlowStateData` fragment only selects `description` + `displayName`~~ — **cleared 2026-09-03** (test-suites PR implementing `conversion-test-plan.md`'s NC-1/NC-2). The fragment (`lib/src/scenario/graphql/fragments/innovation-flow/innovation-flow-state.graphql`) now also selects `id`, `sortOrder`, and `settings { allowNewCallouts descriptionDisplayMode showPublishDetails sidebar visible }`. Every consumer of `InnovationFlowStateData` (states AND currentState, on both `getSpaceData` and the conversion mutations) gets these fields for free.
- ~~`getInnovationFlowStatesWithIds` query only selects `id` + `displayName`~~ — **cleared 2026-09-03**, same PR. The query now also selects `sortOrder` and `settings { sidebar }` (kept minimal — it's a setup/ID-lookup query; use `getSpaceData` if a test needs the full per-state settings before conversion).
- ~~`updateInnovationFlowCurrentState` mutation has a `.graphql` file but zero request-params consumers~~ — **cleared 2026-09-03**, same PR. Wrapper added in `server-api/src/functional-api/innovation-flow/innovation-flow.request.params.ts`: `updateInnovationFlowCurrentState(innovationFlowId, currentStateID, userRole?)`.
- ~~`updateInnovationFlowState` wrapper doesn't expose the mutation's `settings` argument~~ — **cleared 2026-09-03**, same PR. `updateInnovationFlowState(innovationFlowStateID, displayName?, description?, settings?, userRole?)` — `displayName`/`description` are now optional too (previously `description` defaulted to `'Updated state'` even when omitted; omitting it now correctly leaves the stored value unchanged, matching the mutation's own contract). Verified the only two pre-existing callers (`transfer-callout-changed-flow.it-spec.ts`, `transfer-callout-template-flow.it-spec.ts`) don't assert on the old default.
- **`createCalloutOnCalloutsSet`'s TypeScript `options` type didn't expose `classification`** even though the underlying `CreateCalloutOnCalloutsSetInput` always supported it — the fixture-pattern note below describing this as "reusable directly in tests" was aspirational, not yet true. **Cleared 2026-09-03**, same PR: `classification?: { tagsets: { name: TagsetReservedName; tags?: string[] }[] }` added to the wrapper's options type.
- **test-suites has no DB access** (GraphQL-only surface) for this domain's specs — any assertion that needs to inspect raw table shape (e.g. verifying a migration's JSONB backfill against legacy scalar-null rows) is out of reach for automation here and belongs to release-ops SQL verification instead. Still standing — architectural, not expected to clear. **Qualified 2026-09-28** (`origin/develop` @ `0ca74068`): since 054 there IS a **loopback-only** Postgres/Redis primitive (`lib/src/config/optional-infra.ts` › `harnessPostgresConfigured`, fail-closed by `lib/src/config/loopback-guard.ts`), used by a few `roleset/associates/**` and `contributor-management/organization/**` cases that skip themselves elsewhere. It reaches a local/CI compose DB only — never ACC, prod, or the remote nightly cluster — so "did the migration rewrite _real_ pre-existing rows" is still unreachable from here.
- **Push emit assertions need `RABBITMQ_MANAGEMENT_*`**, which the nightly workflow does not set (see the `nightly` project comment in `server-api/vitest.config.ts`). A push case either skips itself where the management API is absent (`rabbitMqManagementConfigured`) or does not run nightly at all. 2026-09-28.

- **`TestUser.GLOBAL_ADMIN` does not hold Platform Operations Admin on develop (027 Slice B).**
  - `lib/src/scenario/platform-roles/harness-admin-roles.ts › HARNESS_ADMIN_ROLES` elevates `admin@alkem.io` to Roles Admin + Content Full Access + Support + Resource Admin + License Manager only.
  - The `PLATFORM_OPERATIONS_ADMIN` privilege is granted solely to the POA credential (`server platform.service.authorization.ts`). So every A11 mutation is **refused** for the default persona.
  - Calls that rely on it silently fail through `graphqlErrorWrapper`'s `{ error }`, for example `search.request.params.ts › adminSearchIngestFromScratch()` (unverified whether `search.it-spec.ts` checks the result).
  - Outside the platform-roles suite, get a POA token from `seedPlatformRoleUsers().tokens.PLATFORM_OPERATIONS_ADMIN` (idempotent; precedent `client-web/.../account-deletion/profile-removed-notification.spec.ts`).
  - Established 2026-10-15, `origin/develop` @ `663c61d9`, server @ `a9ba1ea50`.
  - **Conflicting evidence, 2026-10-23:** server `src/core/bootstrap/platform-template-definitions/user/users.json:12` seeds `admin@alkem.io` with `platform-operations-admin` (bootstrap spec: added 2026-09-16), so a freshly bootstrapped local stack may give GA the POA privilege. Unverified on test-alkem.io. Until someone checks, take resets and A11 calls from `seedPlatformRoleUsers().tokens.PLATFORM_OPERATIONS_ADMIN`, which is correct either way.
- **The platform-roles capability table does not detect new server surfaces.** `capabilities.data.ts` is hand-maintained. `coverage-guard.it-spec.ts` checks table ↔ invocations ↔ generated plan ↔ live role names, but never compares with the server census (`server src/platform/platform-role/verification/a.row.surfaces.ts`). A new gated mutation therefore leaves no red. Found 2026-10-15: `adminRepairTemplateFiles` (server#6656, A11) was missing. When a server PR adds a privileged surface, add its row + invocation and regenerate the plan. Recurred 2026-10-23: server#6708 (090) added nine Support-gated organisation Community-tab surfaces and changed A22's org consent rule, with no test-suites red. See the 090 build sheet U-6.
- **The platform-roles projects run in no nightly** (`server-api/vitest.config.ts`: "Deliberately NOT part of `nightly`: they need a server running 027", which develop now is). A gate negative that must run nightly needs its own case in a nightly-globbed domain directory. 2026-10-15.

## Fixture patterns worth reusing

- **Building a "flow-replacing" template for an existing space**: take a donor space, rename its states via `updateInnovationFlowState` to deliberately different names (so no state-name collision with the target), then `createTemplateFromSpace(donorSpaceId, donorTemplateSetId, name)`, then `updateCollaborationFromSpaceTemplate(targetCollaborationId, templateId)`. Demonstrated in `callout/transfer/transfer-callout-template-flow.it-spec.ts` (L1 target) and `journey/conversion/apply-template-l0-wholesale-replace.it-spec.ts` (L0 target — R-22). This is the only currently-buildable way to exercise "apply a template with a different state _set_" — it cannot control the exact state _count_.
- **Classifying a callout into a specific flow phase at creation**: `createCalloutOnCalloutsSet(..., { classification: { tagsets: [{ name: TagsetReservedName.FlowState, tags: [<phase displayName>] }] } })` — used by the platform's own bootstrap L0 template definition (`server/src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts`) and reusable directly in tests since 2026-09-03 (see cleared gap above). Demonstrated in `apply-template-l0-wholesale-replace.it-spec.ts`.
- **A `TestScenarioConfig` with no `space` key creates NO space at all** (`createBaseScenarioPrivate` returns early when `scenarioConfig.space` is falsy), and a `space` with no `subspace` key creates the L0 only, no L1. Always pass at least `space: {}` (L0-only scenario) or `space: { subspace: {} }` (L0 + L1) explicitly — an empty `{ name: '...' }` config silently yields empty IDs on `baseScenario.space`/`.subspace`, which then fail downstream as an opaque "Invalid value supplied for a GraphQL variable" rather than a clear setup error.

- **A "registered user with no memberships" actor, from any domain:** use `registerUser('<first>.<last>')` from `server-api/.../platform-roles/_support/users.ts`.
  - It registers through **public** Kratos (no `KRATOS_ADMIN_URL`), waits until non-interactive sign-in works, and returns `{ id, accountId, email, token }`.
  - It **reuses** any existing identity whose sign-in succeeds, so put a timestamp (`Date.now().toString(36)`) in the name when "fresh" matters.
  - Delete it with `deleteDisposableUsers(globalAdminToken, [user])` (`_support/groups/disposable-user.ts`). `callout/form/form-visibility-matrix.it-spec.ts` is the cross-domain precedent.
  - A fresh registration gets only platform, account and self credentials, plus an organisation credential if a verified organisation claims the email domain. It never gets a space credential (server `registration.service.ts` › `finalizeUserRegistration`).
  - Shared personas such as NON_SPACE_MEMBER are not guaranteed membership-free across runs. Assert the precondition with `query { me { spaceMembershipsFlat { id } } }`.
  - 2026-10-15.
- **`rawRequest(token, query, variables)`** (`platform-roles/_support/raw-request.ts`) is the house tool for bespoke reads.
  - It keeps `data` **and** `errors`, which `graphqlErrorWrapper` cannot: that wrapper drops `data` on error.
  - It sidesteps lib type drift, because inline args reach the server untyped.
  - Prefer it to a codegen round when the generated types lag the field you need. 2026-10-15.
- **Offline lib codegen:** `lib/codegen.ts` honours `CODEGEN_SCHEMA=<path to a schema.graphql>` instead of introspecting `localhost:3000`. Feed it `git -C <server clone> show origin/develop:schema.graphql > /tmp/schema.graphql`. 2026-10-15.
- **The nightly deploys server `develop`** (`deploy-all-services.yml`, every `*_branch` input defaults to `develop`). A fix merged to server develop is therefore live on test-alkem.io the next night, but not on ACC/prod until a release tag contains it. Check with `git tag --contains <sha>` before running a regression case against ACC. 2026-10-15.
- **Some activity rows are written fire-and-forget.**
  - The resolvers call `activityAdapter.calloutPostCreated` (`callout.resolver.mutations.ts`) and `calloutPublished` (`callouts.set.resolver.mutations.ts`) **without `await`**. A mutation can therefore return before its `CALLOUT_POST_CREATED` / `CALLOUT_PUBLISHED` row exists.
  - Rapid sequential seeds may also land out of `rowId` order.
  - `MEMBER_JOINED` **is** awaited (`role.set.service.events.ts`), and since Slice B its `triggeredBy` is the joining user, not the admin.
  - For a case that reads activity feeds or logs, poll bounded for the seeded rows (`expect.poll`, vitest 4; no house precedent yet).
  - Separate seed blocks with a poll when the case depends on relative order. Derive expected order from an observed baseline, never from seed order.
  - 2026-10-15, server `a9ba1ea50`.
- **Making `activityFeed` deterministic with shared personas:** pass `spaceIds: [<fresh scenario space id>]`. Personas hold memberships in many spaces, and other files write activity concurrently, so an unscoped feed is never stable. The `spaceIds` filter is intersected with the caller's credentials, so the caller must be a member. 2026-10-15.
- **Server relay pagination (`src/core/pagination/relay.style.pagination.fn.ts`), facts for any `first`/`after` query:**
  - The cursor is the entity UUID.
  - `after` is resolved through the **same filtered** query builder. A cursor taken from a row the current filter excludes raises `Unable to find entity with ID`.
  - `total` is the filtered count.
  - `hasNextPage` is a filtered count past the end row.
  - **Code-read, not run:** with `sort: 'DESC'`, `last`/`before` builds `rowId > c AND rowId <= c - last`, which is always empty. With `ASC`, it assumes contiguous `rowId`s, so any filter shortens backwards pages. No server issue is filed, because it is a code read with no reproduction and no consumer sending `last`/`before` was found; tracked as an open row in `deferred.md` so it is not lost.
  - Its unit spec is fully mocked.
  - 2026-10-15.

- **Seeding a cross-bucket ("foreign") document reference through the API.**
  - Profile _updates_ write `description` verbatim (`server profile.service.ts › updateProfile`; there is no re-home on update), unlike create paths, which re-home under the copy rule.
  - So: upload a file into one bucket (`uploadFileOnStorageBucket` on a space-about bucket), then `updateTemplate` / `updatePostTemplate` another profile's description with that document URL. The result is a reference stored outside its own bucket.
  - Space-about documents are READ for everyone, including anonymous, even on a private space (`storage/auth/private-space-document-auth.it-spec.ts:264-269`), so any owner check on them comes out readable.
  - A random UUID in the same URL shape gives a dead reference.
  - Read the description back after the write as the precondition check. 2026-10-15.
- **Server unit specs for raw-SQL admin services mock `entityManager.query` whole** (e.g. `admin.template.file.repair.service.spec.ts`). Their SQL never runs against the real schema in unit CI, so one scoped system case is the only execution of the joins. Weigh that before calling such a service "covered at unit level". 2026-10-15.

- **Async admin operations report through `task(id)`.** Mutations such as `adminCommunicationReconcileForumHierarchy` return a TaskService id. Poll `query { task(id) { status results errors } }` until the status is not `IN_PROGRESS`. No `lib` document or wrapper existed as of 2026-09-28; use a raw `graphqlRequestAuth` helper. `task`/`tasks` resolvers carry **no** auth guard on the server — do not treat a successful read as an authorization signal. 2026-09-28.
- **Loopback Redis = the server's `storage.redis`.** `lib/src/utils/harness-redis.client.ts` points at the same instance the server's messaging client uses, so single-owner leases (e.g. `alkemio:forum-hierarchy-reconcile:lease`) can be planted to test "already running" paths deterministically. Confirm the DB index before relying on it. 2026-09-28.

- **Matrix observability on a local stack (established 2026-09-29, read-only probes).**
  - Without a token, Synapse answers `GET /_matrix/client/v3/directory/room/{alias}` (alias → room id) and `GET /_matrix/client/v3/directory/list/room/{roomId}` (directory visibility).
  - `publicRooms` and room state return 401.
  - Alkemio aliases are `#<uuid>:<server_name>` (matrix-adapter `idmapper.go`). The local server name is `alkemio.matrix.host`.
  - Forum category space ids are `uuidv5("<forumId>:category:<value>", f47ac10b-58cc-4372-a567-0e02b2c3d479)` (server `forum.constants.ts`).
  - For state reads, use the dev appservice token from the server repo's tracked `.build/synapse/matrix-adapter.yaml`. Pass it through an env var set by the user. The harness must never read the server checkout, and should use GET-only helpers.
  - Users are `@<actorId>:alkemio.matrix.host`; the actor id is the localpart (adapter `idmapper.go › UserID`). The actor id equals `TestUserManager.users.<x>.agentId`. 2026-10-15.
  - **The adapter bot leaves conversation rooms once members join** (adapter #82 PR body; `docs/matrix-admin-reflection.md`). A state read made _as the bot_ sees the room frozen at the bot's leave.
    - Read and act as a joined member through appservice identity assertion (`?user_id=<member mxid>`); members are appservice ghosts.
    - This is a design-time inference from adapter code (server#6329 plan, 2026-10-15). Confirm it on the first run and correct this line.
  - Spaces are different: the bot stays a member, so the 061 forum reads as the bot remain valid.
- **Server develop's quickstart pins matrix-adapter v0.8.23** since server#6662 (2026-10-15). On 2026-09-29 it was v0.8.17, which lacked `set_children`; corrected 2026-10-15.
  - A fresh local stack therefore has `set_children` (≥ v0.8.19) and leave-as-self member removal (v0.8.23, matrix-adapter#82). `MATRIX_ADAPTER_IMAGE` overrides the pin.
  - dev-orchestration's base deployment also pins v0.8.23, and the nightly deploys adapter `develop`.
  - Check `git merge-base --is-ancestor <fix-sha> <tag>` in the adapter clone before trusting a version. Fetch tags first: the clone's local tags lagged at v0.8.18.
- **E2E locale coverage is bounded by `platform.configuration.language.eligible`.** The local stack has default `en` and eligible `["nl"]`. Switch language through the stored setting: `updateUserSettings(settingsData: { userID, settings: { language } })`, as in `language-offer/us2-cross-device-persistence.spec.ts`. 2026-09-29.

- **Seeding account resources (VC, Template Pack, Custom Homepage) on a fresh account needs a licence plan first.** A new account's entitlements for `ACCOUNT_VIRTUAL_CONTRIBUTOR`, `ACCOUNT_INNOVATION_PACK` and `ACCOUNT_INNOVATION_HUB` all have limit 0. `ACCOUNT_LICENSE_PLUS` grants VC 3, pack 3 and hub 1 (server seed migration `1764590884533`). `TestScenarioFactory` assigns it to the scenario organisation, `globalAdmin` and `spaceAdmin` accounts **only**. For a throwaway user's account, call `getLicensePlanByName('ACCOUNT_LICENSE_PLUS')` + `assignLicensePlanToAccount(accountId, id)` before `createInnovationPack` / `createVirtualContributor`. Delete those resources before the user or organisation: they are account-deletion blockers. 2026-10-15.
- **Innovation hubs have no `lib` wrapper.** The generated SDK op `CreateInnovationHub` (and `DeleteInnovationHub`) is in `lib`, but the wrapper only exists in `server-api/.../innovation-hub/innovation-hub-params.ts`. That wrapper is the template for calling `getGraphqlClient().CreateInnovationHub(...)` from client-web. It needs a unique lowercase `subdomain`. 2026-10-15.
- **A scenario's host organisation is MEMBER and LEAD of its L0 at creation.** `organization-space-membership.helpers.ts › clearHostLead` removes the Lead, and `orgIsLeadOf` / `orgIsMemberOf` read it back. `lib` has no `removeRoleFromOrganization`. 2026-10-15.
- **"Record is gone" oracle over GraphQL (no DB): `lookup.authorizationPolicy(ID)` as the Platform Operations Admin.**
  - Nearly every entity row owns one `authorization_policy` row. A policy that still resolves after its owner's delete is the observable form of an orphan.
  - The resolver (`lookup.resolver.fields.ts:292-309`) loads the row **before** it checks `PLATFORM_OPERATIONS_ADMIN`. A token without POA therefore gets `ENTITY_NOT_FOUND` for a missing id and FORBIDDEN for an existing one, so a "gone" assertion made with the wrong token passes vacuously.
  - Always pair it with a same-token "present" lookup before the delete, and assert `extensions.code === 'ENTITY_NOT_FOUND'` exactly.
  - `lookup.profile` / `storageBucket` / `document` also load before their READ check. `lookup.license(ID)` has **no** privilege check at all.
  - The not-found answer is `ENTITY_NOT_FOUND` for every lookup used here except `lookup.storageBucket`, which lets TypeORM's `EntityNotFoundError` through (`UNSPECIFIED`, message `Could not find any entity of type "StorageBucket"…`; same answer for a random UUID). `owned-records.ts` accepts exactly that one extra shape for that one field. Verified live 2026-10-16.
  - There is no `lookup.classification`, tagset, visual or reference lookup. Prove those through their policies.
  - Helper: `server-api/src/functional-api/orphan-free-deletion/_support/owned-records.ts` (`expectPoliciesPresent` / `expectPoliciesGone` / `expectLookupGone`). 2026-10-16, server `1691e98e9`.
- **A Space carries two profiles.**
  - `Space.profile` is the Actor profile (type `SPACE`, created with `displayName` only). It has no visuals, tagsets or references, and it is never renamed with the Space. Its storage bucket is the Space-level staging bucket where new callout content is uploaded before the callout exists (`space.service.authorization.ts`).
  - `Space.about.profile` (type `SPACE_ABOUT`) is what the UI shows.
  - A case about the Space's "own" profile that reads `about.profile` tests the wrong record. 2026-10-16.

- **Stored-policy oracle without a database: `authorization { credentialRules { name cascade grantedPrivileges criterias { type resourceID } } }`.**
  - The field has no privilege gate (`authorization.policy.resolver.fields.ts`). Anyone who can read the parent entity reads the stored rules, e.g. `lookup.roleSet(ID).authorization.credentialRules`.
  - It distinguishes "policy not reset since the deploy" (rule absent by name) from "rule present but the gate is broken". That is the oracle for any feature activated by an authorization reset, and it works on ACC by hand too.
  - Child policies (invitation, platform invitation, application) carry cascaded rules. Match by `grantedPrivileges` + criteria type, not by name alone.
  - Stored privilege values are the **wire** strings (`platform-support-org-membership`), not the GraphQL enum names.
  - 2026-10-23.
- **Reading audit rows: MCP `analyze_audit_log`** (`platform-roles/_support/mcp-client.ts › callAuditTool`, Platform Audit Reader token).
  - `user_history` filters by `subjectUserId` and an optional `category` (any `platform_audit_category` value, e.g. `organization_administration`).
  - Rows with a **null subject** are invisible to it: organisation email invitations, and platform-role rows targeting an organisation. Only `summary` sees them, and only as platform-wide counts by category and outcome. Prove such rows on the local stack with `queryHarnessDb` (`platform_audit_entry."subjectOrganizationId"`).
  - The tool masks only `details.oldEmail` / `details.newEmail`, so a "no email address in details" assertion on other fields is non-vacuous.
  - The tool does not return `subjectOrganizationId`; use `details.roleSetId` (or the category's own key) to tie a row to its organisation.
  - The test env has MCP on (dev-orchestration `origin/main`, test overlay `MCP_ENABLED: "true"`).
  - 2026-10-23.

- **Audit-row assertions: `roleset/associates/support-org-community.helpers.ts › auditScope()`.**
  - `rows(subjectUserId, act, expected[])` runs the action and asserts the subject gained EXACTLY those `organization_administration` rows (a delta, listed oldest first), attributed as given and carrying no `@` in `details`; `noRow` is the same with nothing expected (pair it with a `rows` positive control in the same test).
  - `expected` may also be a function of the action's result, for identifiers that exist only after the call (the `invitationId` of an `invite_user` row). Nest two `rows` scopes to measure two subjects of one call (A-12, one row per invitee).
  - With MCP off the effect assertions still run and `finish(ctx)` then skips the case with the reason, so an unasserted audit half never reads as green.
  - Rows with a null subject (organisation email invitations) are read by SQL (`orgAuditRowsSql`) and only on the local stack.
  - 2026-10-23.
- **A spec that builds no `TestScenarioFactory` scenario must call `TestUserManager.populateUserModelMap()` itself** before `getUserModelByType`/`users.*` (the map is `undefined` otherwise: "Cannot read properties of undefined (reading 'get')"). The helper's `assertSupportIsSupportOnly()` does it, grants Platform Support if missing (as `populateGlobalRoles` would) and then requires the persona to hold exactly `PLATFORM_SUPPORT` + `REGISTERED`. 2026-10-23.
- **An invocation in `platform-roles/_support/groups` must select `{ id }` only.** The generated `assignRoleToUser` / `removeRoleFromUser` documents select the whole `UserData` fragment, whose `settings` field Platform Support may not read: the action succeeds and the answer carries an authorization error BELOW the gate, which `classify` reports as `failed` (A23 hit it). Use `minimalCall` in `a23.ts` (a raw `{ id }` mutation re-thrown in the SDK error shape). 2026-10-23.
- **A negative whose call SUCCEEDS without effect is judged on the state.** Content Full Access sending `APPROVE` passes the resolver and the lifecycle only warns, so `A23.eventOnApplication` reads the application back and re-throws "no state change" as a `FORBIDDEN_POLICY` at the gate path; an APPROVE that did take effect stays `ok` and fails the negative. 2026-10-23.

## Environment / gotchas

- **Irreversible platform mutations need an owned, just-verified fixture.** `adminForumRemoveDiscussionCategory` succeeds for any `PLATFORM_FORUM_MANAGE` holder (GA, GLOBAL_SUPPORT, PLATFORM_SUPPORT since 027) on an empty category, and there is no add-category API. Until 2026-09-29, `platform-discussions.it-spec.ts`'s `beforeAll` deleted **every** platform discussion; it now deletes only the titles that file creates. Keep every remove call inside that file, and read the fixture back immediately before the call. 2026-09-29.
- **Generated TS enums are alphabetical, not declaration order.** `schema.graphql` sorts enum members, so `Object.values(ForumDiscussionCategory)` in `lib` is alphabetical. Never derive "the canonical order" or "the last member" from it. test-suites#600 picks `all[all.length-1]` and would target TIPS_AND_TRICKS. 2026-09-28.
- **`@Min/@Max` on a GraphQL input are not necessarily enforced.** The server's global `ValidationPipe` validates only the DTO classes listed in `src/core/validation/handlers/base/base.handler.ts`. Before planning a BVA case on an input, check the class is on that list; otherwise the decorators are dead code. 2026-09-28.
- **027 (server#6322, merged 2026-09-28) moved forum gates off `PLATFORM_ADMIN`.** Admin-only create, update/delete of a discussion, and category retirement now check `PLATFORM_FORUM_MANAGE`. GLOBAL_LICENSE_ADMIN lost them. Denial messages name `'platform-forum-manage'`. Existing discussions need `authorizationPolicyResetOnPlatform` before the new privilege reaches them. 2026-09-28.

- **Since 090 (server#6708, live 2026-10-23), the harness admin passes organisation Community-tab gates on the Support path.**
  - `TestUser.GLOBAL_ADMIN` holds Platform Support (`HARNESS_ADMIN_ROLES`). On an organisation it does **not** administer, its promote/demote/remove/approve/reject/revoke calls now **succeed directly** and write `organization_administration` audit rows attributed to `admin@alkem.io`. Before 090 they were refused and the lib fell back to acting as an org admin (`baseFunctions.ts › assignRoleToUser` / `removeRoleFromUser`).
  - Direct add (ASSOCIATE, or any role for a non-associate) is still refused, now with `roleset-entry-role-assign`, which `ENTRY_ASSIGN_GAP` still catches.
  - If GA targets **itself** on such an org, the server answers `PLATFORM_SUPPORT_SELF_TARGET`, which no fallback regex matches, so the fixture fails.
  - Never use GA as "the Support actor": use `TestUser.GLOBAL_SUPPORT_ADMIN` (Support only) or a disposable user granted `PlatformSupport`.
  - Organisations created by GA make GA ASSOCIATE + ADMIN, so the entity-admin path wins and nothing changes there.
- **An organisation's creator gets ASSOCIATE + ADMIN, never OWNER** (server `organization.service.ts › createOrganization`). A fresh organisation therefore has **zero** owners; the min-1-owner rule only applies once an Owner exists. 2026-10-23.
- **A lifecycle event that is valid by name but fails its guard is a silent success.** `lifecycle.service.ts` only warns when the state does not change, and returns the entity. An event not valid in the current state throws `InvalidStateTransitionException` ("Not in valid set of next events"). Example: Content Full Access sending `APPROVE` on an organisation application. It passes the resolver's UPDATE gate, fails the `hasGrantPrivilege` guard, and comes back without an error, still `new`. Oracle = state + membership, never "an error was returned". 2026-10-23, server `5a61e53b1`.
- **The local `dev-orchestration` clone can lag `origin/main`**: on 2026-10-23 it showed no `MCP_ENABLED` for the test overlay, while `origin/main` (18dad22) sets `MCP_ENABLED: "true"` there. Read env config with `git show origin/main:<path>`.
- `test.skip` left in a spec sometimes encodes a _known, tracked_ bug rather than flakiness — read the comment above it before assuming it's safe to leave skipped once the referenced issue ships. `convert-L1-to-L0-basic.it-spec.ts` had exactly this pattern for client-web#9528.
- Sibling repo clones under the workspace root can be on an unrelated branch (observed: `server/` clone on `fix/move-space-recompute-platform-roles-access`, not `develop`) — always check `git log --oneline --all | grep <issue#>` rather than assuming the checked-out branch is current; the target commit is usually still reachable via `git log --all`. Reconfirmed 2026-09-28 (same branch); reading `git show origin/develop:<path>` in the clone is the cheap workaround.

- **What a profile page shows depends on the viewer.** Three rules apply to any test that asserts another user's or organisation's Spaces:
  - `rolesUser` requires platform `READ_USERS`, which only GLOBAL_REGISTERED holds.
  - The server drops every Space or subspace the **viewer** lacks `READ_ABOUT` on (`roles/util/get.space.roles.for.contributor.query.result.ts`). Use PUBLIC fixture Spaces, on L1 too, for a non-member viewer.
  - On `/organization/<nameID>`, the client skips `rolesOrganization` without `READ_USERS`, so an **anonymous** visitor never sees an organisation's Space roles. `/user/*` is behind `NoIdentityRedirect`, so user profiles have no anonymous case at all.

  Do not use the global admin as the viewer when the visibility rule is under test. 2026-10-15.

- **Several client-web nightly suites list files explicitly, not by glob.** Examples are `User Profile`, `Space` and `Support navigation` in `config/playwright.config.nightly.ts`. A new spec in such a folder never runs nightly until its path is added. Check the suite's `testMatch` before claiming a folder is "already in nightly". 2026-10-15.
- The stale-clone note above (sibling repo clones) also applies to the **client-web** sibling clone: on 2026-10-15 its local `develop` was behind `origin/develop` by the commit under test. Read product code with `git show <merge-sha>:<path>`.

- **Document content reads (`getAuthDocument`, REST) are skipped on CI by house precedent.** `storage/uploads.it-spec.ts` gates them on `!process.env.CI`. Pair any file-content oracle with a GraphQL one (the document's policy or lookup) that runs everywhere. 2026-10-16.
- **Precedent-file caveat:** `templates/template-file-repair/template-file-repair.it-spec.ts` (a POA-token precedent cited in some briefs) is on `origin/develop` only once test-suites#672 merges; before that it lives on `test/r78-qa-coverage`. The develop precedent for a POA token outside platform-roles is `notifications/platform/platform-admin-mail.helpers.ts` (`seedPlatformRoleUsers()`). 2026-10-16.

### Conversations and Matrix (established 2026-10-15, server#6329 design, server `a9ba1ea50`)

- **Browsers no longer go through GraphQL for conversation text.** Since client-web#10365 (merged 2026-10-14), the browser reads, sends and reacts directly against Synapse, using the user's own Matrix session.
  - The session comes from Synapse SSO → `/matrix-callback?loginToken=` → `m.login.token`.
  - Membership, metadata and lifecycle stay on GraphQL.
  - So a GraphQL `FORBIDDEN_POLICY` on a conversation Room proves only the Alkemio half. Proving that a user cannot read or send _in the browser_ needs a Synapse-side oracle (local stack + token) or a UI walk.
  - server-api cannot obtain a per-user Matrix session.
- **Group membership changes are asynchronous.** The mutations call the adapter over RPC. Row deletion or insertion, the policy re-apply and the MEMBER_REMOVED/ADDED publish happen only when the Matrix leave/join event comes back.
  - Since server#6573 + adapter v0.8.23, removal is no longer synchronous. The local path runs only when the Matrix removal fails.
  - Wait on the event or poll `me.conversations`; never use a fixed delay.
- **Who receives `conversationEvents`.** The subscription filters on the publish-time `memberActorIds` snapshot.
  - MEMBER_REMOVED reaches the removed member too (server spec 040 FR-019).
  - MESSAGE_RECEIVED goes to the membership table at publish time.
  - CONVERSATION*CREATED goes to every member. That makes it the readiness anchor for subscriptions opened \_before* `createConversation`.
  - `SubscriptionClient` has no wait API (only `getMessages()`), and `subscribe()` resolves on connection ack.
- **MEMBER_REMOVED is published only after the re-applied conversation policy is saved** (`message.inbox.service.ts › handleConversationMemberLeft`). That makes it a causal anchor for authorization negatives: no poll is needed afterwards.
- **There is no per-room ordering from Matrix to server.** The adapter's `listener.go` dispatches every event in its own goroutine.
  - Never close a negative window on "a later message arrived".
  - Derive the window from the observed latency of the first event: 2×, with a 5 s floor and a 30 s cap.
- **`lookup.conversation(ID)` and `lookup.room(ID)` enforce READ**, failing with `FORBIDDEN_POLICY`. No `lib` documents exist for them; send them inline through `rawRequest`.
- **After a reset, a conversation's policy holds only the participant rule** (READ + CONTRIBUTE, cascading to the room and storage).
  - The reset landed in server#6525. The platform authorization reset re-applies every conversation policy (`messaging.service.authorization.ts`).
  - Stale grants left by removals made before the fix clear only after that reset or the next membership change.
- **The authoritative group-conversation contract** is the server repo's `specs/040-group-conversations/spec.md` (FR-009/011/013/014/018/019). Workspace spec 006 is about DM consolidation and does not cover the group lifecycle.
  - FR-014 ("fire-and-forget, true when the RPC is sent") is superseded: remove and leave now await the Matrix removal (schema descriptions since #6573).

### client-web Playwright suite foundation (established 2026-10-09)

- **Create Post framing chips fold behind a "More to add" menu.** client-web `FramingChipStrip` shows Whiteboard / Memo / Media gallery on the surface and puts Call to Action, Poll, Contributors, Subspaces, Form, Document… behind a `button` named "More to add" (menu items carry the chip label) whenever five or more chips are available. Use `helpers/callout-form.helper.ts › chooseFramingChip(dialog, label)`; a bare `getByRole('radio', { name: 'Call to Action' })` / `getByText('Subspaces')` times out (nightly 2026-10-08: CTA creation, subspaces US2, contributors US3).
- **Cookie consent is one cookie**: `accepted_cookies` = URL-encoded JSON array of categories (client-web `useAlkemioCookies.ts`). `helpers/cookies.helper.ts › grantCookieConsent(context)` seeds it; the persona fixture does so before sign-in, so persisted sessions never show the banner.
- **A retried `createOrganization` / root `createSpace` is adopted, not re-created — but only if it is provably ours.** `graphqlErrorWrapper` retries a mutation after a connection reset even when the server committed it, so the retry re-fails with "nameID is already taken" for OUR organization/space. `createOrganizationOrAdopt` (lib `baseFunctions`) and `TestScenarioFactory.createRootSpace` read the committed entity back by nameID (`lookupByName`) and continue — this was 8 of the 25 reds/flakes on the 2026-10-08 nightly. Ownership is checked before adopting (organization: the display name this call sent; space: the account it was created in AND the `l0-<name>` display name); anything else under the nameID is foreign data and is never adopted or modified (reproduced 2026-10-12: without the check a leftover organization was silently returned as the new scenario's).
- **`expectSignedIn` waits for an authenticated-only header control first.** The anonymous header has "Search", "Platform navigation" and "Log in"; only a signed-in header has "Notifications". Asserting "no Log in link" before the header has rendered passes on an anonymous page, and `userMenuAvatar` (`banner › last button`) resolves to "Platform navigation" for an anonymous visitor (reproduced 6/6 on 2026-10-12).
- **Inside a `createPersonaTest(...)` test, `browser.newContext()` inherits the persona's `storageState`.** An "anonymous" context in such a test must pass `{ storageState: undefined }` explicitly (as `subspaces-callout/us2-expanded-card-switch.spec.ts` does), or it is signed in.
- **The post-sign-in "Take me to the new design" dialog is gone** (client-web#9954, MUI shell removed); `dismissNewLookDialog` is a no-wait guard, never a timed window.
- **`@local-stack` tag + `config/playwright.config.local-stack.ts`**: cases needing loopback DB, RabbitMQ counters or server env overrides are excluded from the nightly by tag and run locally; a nightly skip therefore always means a tracked defect.
- **Throwaway users that must JOIN need a Kratos identity**: `contributors-callout/cards-fixture.ts › registerFixtureUser` (sign-up + verification + first sign-in) replaced `createUser` there; no nightly suite needs `KRATOS_ADMIN_URL` any more.
- **The Playwright nightly can use `KRATOS_ADMIN_URL`** as a safety net, exactly like the server-api nightly (kubectl port-forward of `svc/kratos-admin` to :4434). Without it `assignRoleToUser(MEMBER)` on an L0 space cannot give an API-created user an identity to JOIN with (Slice B), and every self-seeded walk that adds members fails at setup. The workflow change is pending (`.github/workflows/nightly-client-tests.yml`, see the PR description of the stability branch).
- **No fixed waits, no `networkidle`** — ESLint `no-restricted-syntax` now fails on `waitForTimeout`, `delay(` and `networkidle` in `client-web`; the only exemptions are negative settle windows derived from a product constant, marked with a `-- <reason>` disable comment. Rules: `client-web/docs/e2e-conventions.md`.
- **One config**: `client-web/config/playwright.shared.ts` — `PW_BROWSER` (chrome/chromium/firefox/webkit/msedge/mobile-chrome/mobile-safari), `PW_VIEWPORT`, `PW_WORKERS`, `PW_RETRIES`; timeout tiers `standard` 60/10 s, `extended` 120/15 s, `long` 180/20 s. A nightly project is `suite({ name, testMatch, tier })` and nothing else.
- **Password recovery runs on a disposable identity** (`authentication-password-recovery.spec.ts`): it used to change `non.space@alkem.io`'s password and restore it in `finally`; a run that died between the two left the persona unusable for every later sign-in (the 2026-10-08 login + recovery reds). Rule: a spec never mutates a shared persona's credentials.

### Space settings and the membership control (established 2026-10-15, client-web#10419 design)

- **`updateSpaceSettings` (lib `baseFunctions.ts`) always sends a full `membership` block**: `policy` defaults to `OPEN`, `allowSubspaceAdminsToInviteMembers` to `true`, and `trustedOrganizations` to `[]`. The server replaces `settings.membership` wholesale (`space.settings.service.ts › updateSettings`: `settings.membership = updateData.membership`). So **any call that omits `membership` resets the policy to OPEN.** `TestScenarioFactory.populateSpace` applies privacy, then membership, then collaboration, each as a separate call. A scenario config with `settings.collaboration` therefore ends with **policy OPEN**, whatever `settings.membership.policy` says. `default-template/default-template-per-flow-state.spec.ts` has exactly that config: APPLICATIONS + collaboration → OPEN. This is established from source, not run-verified. To flip a policy mid-test, pass `privacy.mode` and `membership` together in one call. Privacy `mode` is only applied when sent, so omitting it keeps the current value.
- **Absence of the apply control has no DOM resolution signal in the About dialogs or on the subspace banner.** While `useSpaceApplyFlow` is loading they render nothing, which is the same DOM as "hidden". Before asserting absence, wait for the `ApplicationButton` and `UserPendingMemberships` GraphQL requests to finish, then for two animation frames. The L0 sidebar does have a signal: an `<output>` (role `status`) named "Loading membership status" holds the slot until the first resolution.
- **An `/about` route opens a Radix dialog over the space page**, and the page behind it is `aria-hidden`. A role-based `toHaveCount(0)` on the sidebar or banner then passes vacuously. Assert background surfaces on the plain route, and dialogs on `/about`.
- **Seeding a pending application without the UI:** `getGraphqlClient().applyForEntryRole({ applicationData: { roleSetID, questions: [...] } })` through `graphqlErrorWrapper(…, TestUser.NON_SPACE_MEMBER)`. Examples: `organization-user-associates.helpers.ts:200`, and server-api `roleset/application/application.request.params.ts › createApplication`. The server accepts arbitrary question names. A retried call can fail with "already has an open application" for an application that was in fact created.

### Contributors callout and CRD cards (established 2026-10-02, test-suites#641)

- **New L0 scenario spaces are PRIVATE.** A walk with an anonymous or non-member viewer must set `settings: { privacy: { mode: SpacePrivacyMode.Public } }` in the scenario config, or call `updateSpaceSettings` with `privacy.mode: PUBLIC` — on the subspace too. An anonymous visitor on a private space is redirected to `/about`.
- **`createOrganization` makes the creating admin an ASSOCIATE** of the new organisation, so every fixture organisation starts with an associates count of 1. Use `removeRoleFromUser(admin, ASSOCIATE, org roleSet)` (now in `lib` `baseFunctions`) to reach a real 0.
- **The server caps a profile tagline at 128 characters** (`maxLength`); longer values are rejected, not truncated.
- **CRD tag rows (`CollapsibleTagList`) are lists of `listitem`s with a "+N" chip button named "Show N more"**; there is no `title` attribute. The cut-pill tooltip is a Radix tooltip on the inner badge `span` — hover the span, and press Escape to close it (moving the mouse away does not). The "+N" chip opens a portalled popover (`[data-radix-popper-content-wrapper]`) listing the hidden tags.
- **Measure a card grid on its top-level items only** (`region.getByRole('list').first()` → `:scope > li`): every card also contains a nested tag list and an aria-hidden measuring mirror.
- **A Playwright `has:` filter must be anchored at the page**, not at the outer locator: `items.filter({ has: region.getByRole(…) })` resolves to nothing, `items.filter({ has: page.getByRole(…) })` works.
- **After a Radix dropdown closes with Escape the page stays `aria-hidden` for a moment**, so a role-based `toHaveCount(0)` taken right then passes vacuously. Wait for `getByRole('menu')` to be hidden and assert a positive control on the same card first.
- **The chat panel is a `dialog` named after the conversation partner**; its header is not a heading.
- **A retried `createUser` can leave an untracked twin.** `graphqlErrorWrapper` retries a mutation after a connection reset even when the server already committed it, and `createUser` draws a fresh nameID and email on each attempt. On this host it happened deterministically around the seventh user created in quick succession. Put a run-unique token in every throwaway display name and sweep by it at cleanup (`contributors-callout/cards-fixture.ts` › `CardsFixture.cleanUp`).
- **Switching a Space tab replaces the history entry**: Browser Back from a subspace lands on the parent's previous tab (`?tab=3`), not on Home; click the Home tab to return client-side.

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

### Memo walks (established 2026-10-21, test-suites#678)

- **A memo on a scenario Space has ONE editor at a time.** Without the `SPACE_FLAG_MEMO_MULTI_USER` entitlement (server `memo.service.ts › isMultiUser`, read by the collaboration service on connect), only the first connection to the memo room may edit. Every later connection gets a read-only editor (`contenteditable="false"`) and the footer "You don't have permission to edit this memo. Ask the owner, …". That message is shown even to the memo's author, and even when GraphQL `myPrivileges` lists `UPDATE_CONTENT`. A two-user memo walk must open the **editing** user first, and assert that its editor is editable and holds the typed text before reading it anywhere else. US1-AS4 of `memo-pdf-download/` was red on develop for exactly this reason.
- **PDF content oracles use poppler** (`pdftotext -layout`, `pdffonts`), from `poppler-utils`. GitHub's `ubuntu-latest` runner does not ship it, so `nightly-client-tests.yml` installs it. A spec that reads PDFs must fail, not skip, when the binary is missing.

---

## Sidebar search widget (055) — designer notes, 2026-09-03

> Written independently by the 055 design session and merged in as-is when the plan was committed as a record; entries may overlap with the sections above.

What is durably true about the `test-suites` harness. Not feature notes: the test for a line
here is _would it help someone designing a different feature?_ Correct anything you find stale
and say so in your report.

> Created 2026-09-03 during the 055 sidebar-search plan. Rows carry the date and the branch they
> were established on. Reality beats a row — if they disagree, fix the row.

### Where suites live

| Suite  | Path                                                  | Runner     | Notes                                                                                                                                  |
| ------ | ----------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| API    | `server-api/src/functional-api/<domain>/*.it-spec.ts` | vitest     | one project per domain in `server-api/vitest.config.ts`; a new file in an existing domain directory is picked up with no config change |
| E2E    | `client-web/src/functional-e2e/<area>/*.spec.ts`      | Playwright | Chrome **branded channel**, not Chromium                                                                                               |
| Shared | `lib/src` (`@alkemio/tests-lib`)                      | —          | CommonJS; consumed by both via `workspace:*`                                                                                           |

A new E2E feature area = its own directory under `functional-e2e/`, listed in `CLAUDE.md`, with
`<area>-test-plan.md` **inside it**. Older plans also live in `plans/` and at the `functional-e2e/`
root — look in all three before concluding an area has none.

### Standing gaps (cite these, do not rediscover them)

| Gap                                                                   | Consequence for a plan                                                                                                                                                                                                                                    | Established                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **No database access from `test-suites`**                             | Any claim about what a migration did to _pre-existing_ rows is unreachable. Every entity these suites create is post-migration, so it exercises the application's default path, never the migration SQL. Route to manual or defer to the owning repo's CI | 2026-09-02 (10178), reconfirmed 2026-09-03 (055) |
| **No accessibility harness** — no `axe-core` / `@axe-core/playwright` | Screen-reader semantics, focus order, contrast and live-region announcements cannot be automated. Route to a manual release-checklist row                                                                                                                 | 2026-09-02 (10178), reconfirmed 2026-09-03 (055) |
| **No load/latency harness for GraphQL read paths**                    | `load-testing/` is a socket/stress tool (`stress-test.ts`, `service.socket.ts`), not a query profiler. p95 claims about a query are manual observation or post-deploy monitoring                                                                          | 2026-09-03 (055)                                 |
| **No infra lever from inside a test**                                 | A test cannot stop a stack dependency (Elasticsearch, RabbitMQ) mid-run, so "backend unavailable → error state" cases are deferred, not manual. Clears if the compose harness ever gains a service-toggle helper                                          | 2026-09-03 (055)                                 |
| **Locale assertions have no home**                                    | Six-locale copy checks belong beside the locale files in the owning repo, not here                                                                                                                                                                        | 2026-09-02 (10178)                               |
| **No cross-repo contract harness**                                    | When a client mirrors a server constant as a local literal, only the server half is pinnable here                                                                                                                                                         | 2026-09-02 (10178)                               |

### Tooling gotchas

- **`lib` generated types drift.** `lib/src/core/generated/alkemio-schema.ts` is a committed
  artifact and is regularly **behind** the merged server schema. Check for the specific enum
  value / field you intend to assert on **before** planning a case; if it is missing, `pnpm --filter
@alkemio/tests-lib run codegen` is a prerequisite task, not a detail. _(2026-09-03: it had no
  `Search = "SEARCH"` in `SidebarWidget` days after server#6448 merged.)_ _(Reconfirmed 2026-10-15 on
  `663c61d9`: `ActivityFeed(Grouped)QueryArgs` lacks `excludeMyActivity` six days after server#6639 merged.)_
- **`rg -rn` silently means `--replace n`** and corrupts output. Always `rg -n`.
- **`gh pr diff` has no `--name-only`** in the installed version; use
  `gh pr view <n> --json files -q '.files[].path'`.
- **`server-api/package.json` scripts are not uniform.** Several projects have only a `:ui` script
  (e.g. `test:search:ui` exists, `test:search` does **not**), and the root `CLAUDE.md` lists some
  that are absent. Verify the script before writing a _How to run_ block; the portable form is
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
- **`createAuthenticatedSessionFixture` is a module singleton.** Its context and page are
  module-level, so two instances in one file share **one page**, and the last
  `setupAuthentication` wins. In test-suites#615 the "admin" steps silently ran as the member.
  For two personas in one test, open one context per persona from a stored session
  (`ensurePersonaState` + `browser.newContext({ storageState })`), as
  `sidebar-widgets/sidebar-widgets.helpers.ts › openPersona` does. 2026-10-01.
- **Teardown must delete subspaces first, and must not swallow errors.** The server refuses to
  delete an L0 Space that still has a subspace. `lib` `deleteSpace` _returns_ `{ error }` rather
  than throwing, and `TestScenarioFactory.cleanUpBaseScenario` logs and continues. A UI walk that
  deleted only the L0 behind `.catch(() => {})` leaked a Space on every run, until the hosting
  account showed "Capacity reached" and no Space could be created at all. Reuse
  `subspaces-callout.helpers.ts › deleteFixtureTree` with a delete that throws on `error`.
  2026-10-01.
- **Positive controls.** Every "must not appear" assertion in this repo needs a paired assertion
  proving the thing exists somewhere — otherwise a misspelt fixture, a stale index, or a renamed
  operation makes the negative pass forever. This has bitten cross-Space search scoping and
  request-count assertions alike.

- **A test-scoped fixture runs before `beforeAll` has populated `TestUserManager`.** A `storageState` fixture that calls `TestUserManager.getUserModelByType(...)` throws `Cannot read properties of undefined (reading 'get')`. Derive persona emails with the manager's own rule, `${TestUser.X}@alkem.io`. 2026-10-01 (test-suites#613).
- **A failed Playwright test restarts the worker, and the next test re-runs `beforeAll`.** A file-level seeded fixture is then a _fresh_ one — so "pre-state" a later test captures is not the state earlier tests left. Keep each test independent of its file-mates' data. 2026-10-01.
- **CRD template dialogs:** a _dirty_ create/edit form asks "Discard your changes?" (`Keep editing` / `Yes, close`) on Cancel; a _pristine_ edit form's dismiss button reads **Done**, not Cancel (client-web#10243). The classification value reorder buttons are named `Move value N up/down`. Deleting a template card removes it before the `DeleteTemplate` round trip completes — await the operation response before reading the API. 2026-10-01.
- **Anonymous reads go through the private non-interactive endpoint with no bearer** (`postGraphqlRaw(query, { variables })`); it answers as the anonymous actor. 2026-10-01.

### Client-web / CRD locator conventions

- **CRD sidebar labels and section headings are CSS `uppercase`.** `innerText` returns the
  _rendered_ text ("SPACE LEADS"), so `innerText().indexOf('Space Leads')` is -1. Assert order on
  role/name locators via `compareDocumentPosition` (`sidebar-widgets.helpers.ts ›
expectInDocumentOrder`). Role and text locators match the DOM text and are unaffected.
  2026-10-01.
- **Space Settings > Layout columns have no accessible name.** Each column is a
  `[data-slot="card"]` whose title is a `span[title]`, and every column's menu button is named
  "Column actions". Scope with `locator('[data-slot="card"]').filter({ has: getByTitle(name, { exact: true }) })`.
  2026-10-01.

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
- **Public profile tab strip (`ProfileResourceTabStrip`)**: `tablist` named `Resource sections`. The tabs are buttons with `role="tab"` and `aria-selected`, and there is **no** `tabpanel`; only the active tab's content is in the DOM. The labels differ by profile type: user `Leading` / `Member Of` / `Other Resources`, organisation `Lead Spaces` / `All Memberships` / `Other Resources`. Since client-web#10424 the strip renders only after both the memberships and account-resources queries load. Assert order with `expect(tablist.getByRole('tab')).toHaveText([...])`, which retries and is exact on count and order. Switching a tab does not change the URL. 2026-10-15.
- Prefer role + accessible name over CSS or `data-testid`; the accessible name usually comes from a
  translation key, so read the locale JSON in the diff rather than guessing the string.

## Running server-api against the test environment from a workstation — 2026-10-16

- The nightly's target is `https://test-alkem.io`; its endpoint variables are public repo variables (`gh api repos/alkem-io/test-suites/actions/variables`). Export them over your local `.env` in a wrapper (never edit the `.env`), unset `KRATOS_ADMIN_URL` (the lib then registers personas through MailSlurper, as the nightly does) and unset every `HARNESS_SYNAPSE_*` so `conversation-member-removal-matrix.it-spec.ts` skips instead of resolving room aliases against the wrong Synapse. The local harness password is accepted by the test env's `/api/auth/non-interactive-login`.
- This is the stack to use for anything that waits on an inbound Matrix event (`MEMBER_REMOVED`, `CONVERSATION_DELETED`, message counts): the local quickstart cannot deliver them (Synapse → adapter port on loopback). First use: `--project conversations` 45/50 green in ~2 min, including the 8 re-enabled server#6329 U-tests and N-2/N-3.
- Subscription payload trap (server#6673, fixed by server#6680 in v0.169.1 — the trap pattern still applies to any other loader): a `conversationEvents` subscription that has already resolved a conversation's `members` serves that list from a per-operation DataLoader cache for every later event on the same connection. A `MEMBER_REMOVED` then still lists the removed member. Prove such payload claims on a subscription opened after the earlier event, or over HTTP, and never treat a stale list on a long-lived subscription as the product state without that control.
