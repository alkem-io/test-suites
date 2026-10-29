# platform-roles decision table — extraction notes

Source: `alkem-io/test-suites` `server-api/src/functional-api/platform-roles/`.
**Table version:** the inventory (`_inventory.md` §platform-roles, 2,071 cases) was collected from
`origin/develop @ df149442` (2026-10-27). The `~/repos/qa/test-suites` checkout
(`qa/server-rebuild-qa-plan @ 87812019`) still carries the pre-PR#685 table (115 rows: no A23 group,
no A22 organisation variants, no `A11.adminRepairTemplateFiles`). The JSON follows **df149442**
(127 rows), exported read-only with `git archive` into `scratchpad/tests/src-develop/`.

## How a cell becomes a test (`_support/role-spec.ts`)

`roles/<role>.it-spec.ts` calls `runnableFor(ROLE)`:
- `can`  = rows where `ROLE ∈ owners ∪ acceptedExtra` **and** the positive half is `planned`/`automated`
  (or `belongs: environment` with an invocation registered — today only `A19.audit-log-analyze`, which
  joins when `PLATFORM_ROLES_MCP=1` or a live `/rest/mcp` `initialize` handshake answers 2xx/401).
- `cannot` = rows where `ROLE ∉ owners ∪ acceptedExtra` and the negative half is `planned`/`automated`.
- Rows with `exclusive` positives (14: the A3/A11 platform-wide jobs) are **not** in the role files; their
  positives run only in `exclusive/destructive-positives.it-spec.ts` (`describe(<id>) > "positive: <ROLE> can"`),
  project `platform-roles-exclusive`, never nightly. Their negatives still run in the role files.
- `not-applicable` positives (owners empty: A1 credential mutations, A17, A22) and `not-automated` ones
  (`A4.deleteUser` both halves → covered by `A5.deleteUser`; `A15.adminForumRemoveDiscussionCategory` positive,
  irreversible) register nothing for that half.
- One `test(<capability id>)` per cell; a `knownDefects` entry would turn it into `test.skip("<id> (<issue>)")`
  (none today); a runnable row with no invocation registers `test.todo(<id>)` (none today — the inventory's
  2 todos are scenario-level, in R2 and G2).
- Negatives are declared first ("they change no state, so a positive can never starve one of its target").

Per role file: 126 cases (127 rows − `A4.deleteUser`); Operations Admin 112 (−14 exclusive positives);
Support 125 (−1: the forum-category positive is not automated).

## What "denied" means (`_support/types.ts`, `_support/outcome.ts`)

Every call is judged by `classify(gate, call)` → one of three outcomes:
- `ok` — no GraphQL error.
- `denied` — at least one **authorization** error (`extensions.code ∈ {FORBIDDEN, FORBIDDEN_POLICY,
  EMAIL_CHANGE_UNAUTHORIZED, MCP_ACCESS_DENIED}`) whose `path` (string segments only) **equals the gate path
  or is a non-empty prefix of it** (refused at or above the gate), e.g. gate `['platform','roleSet','usersInRole']`.
- `failed` — everything else: validation, not-found, transport (after 3 attempts with backoff), or an
  authorization error **below** the gate (the action itself ran; only a sub-field was withheld). `failed`
  fails a positive *and* a negative loudly.

**Negative (`expectRefused`)**: `outcome.kind === 'denied'`. Nothing else — a validation error or a forbidden
sub-field never counts as a refusal. Group modules therefore use minimal `{ id }` selections (A21 uses
`updateUserServiceProfile`, A23 uses raw `assignRoleToUser`/`removeRoleFromUser`) so a forbidden `settings`
sub-field cannot masquerade as a denial. `A23.eventOnApplication` (APPROVE) is the one cell judged on
**state**: Content Full Access passes the resolver (UPDATE) and the lifecycle guard silently refuses; the
invocation reads the application state and synthesises a `FORBIDDEN_POLICY` at `eventOnApplication` when it
is not `approved`.

**Positive (`expectAllowed`)**: `outcome.kind === 'ok'` **and** the invocation's `verify` passes, reading
the declared effect back (`Capability.verifies`: `effect` read back independently, usually as the
PLATFORM_CONTENT_FULL_ACCESS reader or as the caller; `returns-data` known fixture data present;
`executed` success payload only; `reached-resolver` a specific non-authorization error matched by
`acceptFailure` proves the gate was passed when the external dependency is absent — A4 drift-resolve
`EMAIL_CHANGE_DRIFT_NOT_FOUND`, A11 Matrix jobs `MATRIX_ENTITY_NOT_FOUND_ERROR`, geo/`fetch failed`).

Scenario specs reuse the same classifier through `rawOutcome(gate, token, query)`; assignment-rule
negatives additionally assert `rejectionOf(outcome)` → `ruleId` + exact message text and unchanged state.

## How the 14 role users are provisioned (`lib/src/scenario/platform-roles/platform-role-users.ts`)

`seedPlatformRoleUsers()` runs once per run in the project-level `globalSetup` (shared with the Playwright
suite): registers `<harness user>` … `<harness user>` (Kratos admin API when
configured, else self-service registration), signs in as the **bootstrap account `<harness user>`** and
refuses to continue unless it holds `PLATFORM_ROLES_ADMIN` (the break-glass role the server re-seeds on
every start). For each role whose user does not yet hold it, the bootstrap admin calls
`assignPlatformRoleToUser` (preceded by `updateUser serviceProfile=true` for `PLATFORM_SPACES_READER`,
rule 3). It then aborts if any user holds anything but `[its role, REGISTERED]` — the premise of every
negative (re-asserted by X1). Tokens are one login per role per run, handed to workers via `provide/inject`.
The bootstrap token is used only as the break-glass Roles Admin (strip residue, make disposable Roles Admins,
R5/R6/AR2 operators). Group fixtures are built once per run; organisation-creating groups
(A1,A2,A3,A6,A7,A8,A9,A11,A12,A20,A20b,A22) build sequentially (Support's credential cache), the rest in parallel.
Targets never belong to a role user: disposable users (`disposable-user.ts`), normalised pool users
(`users.ts`, roles revoked + marker cleared on acquire/release), and organisations that Support creates and
then **resigns from** (`organization-content.ts`) so no negative passes through ownership.

## Settings / fixture variants encoded in the table and group modules

| id(s) | variant |
|---|---|
| A1.grantCredentialToActor / revokeCredentialFromActor | called with a **non-role** credential (role vocabulary is rejected before the gate, which would be a denial for the wrong reason) |
| A2.* | Feature role holdable by a user **and** an organisation (`assignPlatformRoleToOrganization` rows); per-allowed-role subjects |
| A3.* | entity-scoped resets aim at throwaway user/organisations; `authorizationPolicyResetToGlobalAdminsAccess` targets a dedicated *wiped* organisation; 5 platform-wide resets are `exclusive` |
| A4.adminUserEmailChangeDriftResolve | `reached-resolver`: no drift exists → `EMAIL_CHANGE_DRIFT_NOT_FOUND` counts as pass |
| A5.* | each destructive positive consumes its own run-registered user; negatives aim at `survivor`, which also owns the single MCP key (10-key cap) |
| A6.createOrganization / deleteOrganization | one deletable organisation per allowed role, built up front |
| A7.* | targets live in an **organisation-hosted account** (Support's privilege does not exist on a user-hosted account); source space **PUBLIC** (template-from-space gates need READ); per-allowed-role pack+hub+templates plus a deny set; `updateCallout` only on the callout **inside a callout template**, never a space callout |
| A8.* | organisation account, **PRIVATE** space; `doomed` vs `kept` twin per capability; `updateCalloutPublishInfo` own callout per allowed role (Content Full Access + Resource Admin). No draft/published variant is encoded; A9 fixtures create callouts with `visibility: PUBLISHED` |
| A9.* | two organisation accounts, setup actor resigns; per-allowed-role consumable target + surviving `deny` target; L1↔L0/L2 moves need a second L0 |
| A10.* | singleton platform settings, per-run unique values; iframe/blacklist adds have no "unset" |
| A11.* | 9 platform-wide jobs `exclusive`; targeted ones use a throwaway org profile / space community / well-formed Matrix room id (`reached-resolver` on `MATRIX_ENTITY_NOT_FOUND`); `adminRepairTemplateFiles` dry-run over `[]` expects the all-zero report |
| A12.* | assign targets: organisation account / `SPACE_LICENSE_PREMIUM`; revoke targets: the disposable host's **user** account / `SPACE_LICENSE_PLUS` granted in build |
| A13.* | run-scoped plans and credential rules granting no entitlements; negatives aim at the update-kept plan/rule (lookup precedes authorization) |
| A14.adminUpdateSpaceVisibility | user-hosted space; Demo → Active round trip in `verify` |
| A15.getAccessPrivilegesForPlatformSupport | two **PRIVATE user-hosted** spaces: `allowPlatformSupportAsAdmin: true` (call target; applications list gated on GRANT) vs `false` (verify asserts no CREATE/UPDATE/DELETE/GRANT there) |
| A15.updateDiscussion / deleteDiscussion / adminForumRemoveDiscussionCategory | discussions opened by FEATURE_BETA_TESTER (author holds no forum rights); one deletable discussion per allowed role; category OTHER still holds a discussion so the (negative-only) removal cannot succeed |
| A16.createPlatformRolesAccess | PRIVATE user-hosted space, `allowPlatformSupportAsAdmin: false`; gate on `collaboration.calloutsSet.callouts` (cascading READ) because `lookup.space` opens on READ_ABOUT and Resource Admin holds non-cascading READ on the space |
| A17.updateActorNameID / updateSpace.nameID | disposable user / user-hosted space; per-role unique nameID so a wrong rename is visible |
| A19.audit-log-analyze | environment-gated MCP tool; masking (`***@alkem.io`) asserted only there |
| A20 vs A20b | same six surfaces; the **payload role** picks the gate (PLATFORM_ROLES_ADMIN vs FEATURE_BETA_TESTER); Platform × organisation lists asserted `[]` |
| A21.updateUser#0 / #1 | set vs clear `serviceProfile` on pool users; observed only via a Spaces Reader grant |
| A22.assignRoleToUser / ToVirtualContributor / ToOrganization | L0 user-hosted space; VC created on the disposable user's account after License Manager raises its baseline to 1 VC; bare organisation never in the space |
| A22.assignRoleToUser#org-entry / #org-elevated | organisation role-set: ASSOCIATE (entry) vs ADMIN (elevated, "no side door") for a non-associate |
| A23.* | organisation handed to a neutral admin, Support resigned; per-allowed-role consumable invitations/applications + one surviving deny target; `eventOnApplication` APPROVE vs `#reject` variants; Content Full Access accepted on reject/deleteInvitation/deletePlatformInvitation via the root CRUD rule |
