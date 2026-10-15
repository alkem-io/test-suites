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

## Space classifications (024 / alkemio#1985)

_Searched 2026-10-01, `origin/develop` @ `7b1b6ce73` (test-suites), against server#6380 and client-web#10163 (server `develop` @ `615817441`, client-web `develop` @ `2e576ee17`). Plan: `client-web/src/functional-e2e/classifications/classifications-test-plan.md`._

| Area | Status | Evidence |
|---|---|---|
| Step A/B walks, duplicate guard, single-select, About display, hide toggle, removal, subspace picker | Full (UI) | `classifications/classifications-space.spec.ts` SL-01…08 |
| Template authoring, value ids, snapshot independence, library import, seed, out-of-scope negatives | Full (UI); TL-01b skipped pending product decision (QA-PF-01) | `classifications/classifications-templates.spec.ts` TL-01…08 |
| API contract: FR-014a denials (member, non-member, 6 mutations), hidden entry on the anonymous read, FR-002a bounds 0/1/50/51, FR-011c, FR-012c, FR-018b order + re-add, FR-002c ids, SC-007 | Full (API) | `server-api/.../journey/space/space-classifications.it-spec.ts` |
| Seed idempotency / bootstrap race / seeded-pack auth (R-5/13/14) | **Proven absent** here — needs a bootstrap restart | server unit specs T047/T055 only |
| Server `test/integration/classification/classification-entry.spec.ts` | Mock-only (no DB, no HTTP) — not system coverage | its own header |

## Contributors callout — richer contributor cards (077 / client-web#10316)

_Established 2026-10-02 on `feat/077-richer-contributor-cards` (test-suites#641, merged with `origin/develop` @ `d576c14c`), against server `develop` @ `7496da9a7` and client-web `develop` @ `cc126d7a6`. Plan: `client-web/src/functional-e2e/contributors-callout/contributors-callout-test-plan.md`._

| Area | Status | Evidence |
|---|---|---|
| Five enrichment fields: null matrix, merged tag rule (FR-004 as amended), tagline trim, website normalisation, month-precision join date, associates parity at 0 and N | Full (API) | `server-api/src/functional-api/callout/contributors-collection/contributor-cards.it-spec.ts` |
| Members-only visibility (FR-032/SC-009): anonymous and non-member get no People and a 0 count; organisations/VCs enriched; PRIVATE ⇒ `FORBIDDEN_POLICY` | Full (API), UI walk in US2-AS2 | `contributor-cards-visibility.it-spec.ts`; `us2-nothing-else-changes.spec.ts` |
| Card rows, "+N", tooltip, heights, dialog/map/deep-link parity, map popup unchanged | Full except the "+N" wrap, whose test is skipped pending QA-PF-03 (client-web#10370) | `us1-card-content.spec.ts` |
| One profile link per card (FR-016) | **Red** — QA-PF-01 client-web#10369 | `us2 › US2-AS4`, `us3 › US3-AS7`, `us5 › US5 / FR-016`, shipped `0.1 › 1.4` |
| Join month: two oracles, UTC−8/UTC/UTC+14, Dutch, subspace month | Full for current-month memberships; month boundary and duplicates not buildable (no SQL) | `us4-joined-this-space.spec.ts` |
| Card menu: View Profile, Message (user, organisation incl. discard and failed send), non-contactable, signed-out | Full | `us3-card-menu.spec.ts` |

## Organization email invitations (081 / server#6575, notifications#614, client-web#10366)

_Established 2026-10-06 on `feat/081-org-email-invitations` (test-suites#653, merged with `origin/develop` @ `eafb4649`), against server `develop` @ `808f39df9`, notifications `develop` @ `71c3634` and client-web `develop` @ `368727530` (all three contain the 081 PRs). Plan: `client-web/src/functional-e2e/organization-email-invitations/organization-email-invitations-test-plan.md`._

| Area | Status | Evidence |
|---|---|---|
| Invite an unregistered address to an organization: roles, message, language carried; repeat → already invited; a registered user's stored address → normal invitation; the mixed batch gives every chip its own outcome; no invite-time Admin cap for an email invitee; revoke + re-invite; 128-character address | Full (API) + UI walk (dialog, pending table, Admin/Owner exclusive) | `roleset/associates/organization-associate-invitation-external.it-spec.ts` (US1); `organization-email-invitations/us1-invite-by-email.spec.ts` |
| Who may invite by email, list, revoke, resend: associate-only and registered non-admin refused (revoke refused on the `delete` privilege, resend/invite on the invite privilege), ADMIN-not-associate, OWNER and platform support allowed | Full (API) + API walk | same it-spec (US1-AS8 ×2); `us1-invite-by-email.spec.ts` › US1-AS8 |
| Registration precedence over the verified-domain auto-join; conversion carries roles, inviter, message, language on the organization and the Space; accept grants Associate + Admin; Owner withheld at accept when the cap is full; organization deletion removes its rows | Full (API) + UI chain (follow the mail's link → sign-up → pending dialog → accept) | `roleset/associates/organization-email-invitation-registration.it-spec.ts`; `us2-invitee-signup.spec.ts` |
| Account deletion erases the records under the account's **current** address | Full (API, platform-admin deletion) | `organization-email-invitation-registration.it-spec.ts` › US4-AS3 |
| Account deletion and records under a **previous** address (FR-021) | **Product gap — alkem-io/server#6588** (reproduced live 2026-10-06: the consumed row under the old address survives and still resolves). Not automatable until the harness can change a user's email | — (plan "Not covered") |
| A consumed record is never converted again (US4-AS4) | Loopback Postgres only (`test.skipIf(!harnessPostgresConfigured())`) | same it-spec |
| Resend, Space and organization: one more mail naming the resender, record unchanged, immediate second resend `ROLESET_INVITATION_RESEND_THROTTLED`, cooldown kept per role set + address across revoke + re-invite, consumed → `ROLESET_INVITATION` "already consumed", plain member / other-space admin / anonymous refused, deleted inviter | Full (API) + UI (both pending tables, per-row in-flight state, typed error toast) | `roleset/invitations/invitation-external-resend.it-spec.ts`; `organization-associate-invitation-external.it-spec.ts` (US3); `us3-resend.spec.ts`, `us3-as1-two-rows.spec.ts` |
| "After the window a resend succeeds again" (US3-AS3) | Conditional — runs only with `PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS` ≤ 30 on stack and harness; nightly skips it | `us3-resend.spec.ts` |
| The organization email: subject names the organization only, body names inviter / role / escaped message / invitations link, `Hello,` greeting, no in-app row for anyone; the Space email keeps its own template in the same run | Full (API) | `notifications/organization/associate-email-invitation.it-spec.ts` (in the `nightly` project by explicit path) |
| Hourly email budget (FR-029 / SC-009), push absence for the account-less recipient, FR-016 on a platform-level role set, the pending row's date column | **Not covered** (server unit specs only, where any) | plan "Not covered" |

**Helpers and fragments to reuse (do not hand-roll these):**

- `server-api/.../roleset/invitations/invitation.request.params.ts`: `inviteForEntryRoleOnRoleSet(roleSetId, invitedActorIds, invitedUserEmails, welcomeMessage, extraRoles, userRole = GLOBAL_ADMIN, suggestedLanguage?)`, `deleteExternalInvitation(invitationId, userRole)`, `resendPlatformInvitation(invitationId, userRole)`.
- `server-api/.../roleset/roleset.request.params.ts`: `getRoleSetPendingPlatformInvitations(roleSetId, userRole)` (open rows only), `lookupPlatformInvitation(id, userRole)` (answers for consumed rows too), `lookupPlatformInvitationCreatedBy(id, userRole)` (fails once the inviter is gone — that is the signal), `isPlatformInvitationGone(res)` (entity-not-found or null, nothing else), `platformInvitationRowExists(id)` (loopback Postgres, else `undefined`), `getSingleInvitationResult(res)` now typed with `invitedActorID`, `invitedEmail`, `platformInvitation { id email roleSetExtraRoles }`, `getErrorCode(res)`.
- lib fragments/documents: `PlatformInvitationData` (+ `roleSetExtraRoles`, `welcomeMessage`, `suggestedLanguage`), `InvitationData` (+ `suggestedLanguage`), `RoleSetPendingPlatformInvitations` (same three fields), `ResendPlatformInvitation`, `LookupPlatformInvitation` / `LookupPlatformInvitationCreatedBy`, `InviteForEntryRoleOnRoleSet` (+ `invitedEmail`, `suggestedLanguage`). Regenerate with `pnpm --filter @alkemio/tests-lib run codegen` against a server that has #6575.
- **Per-address mail reads, never a prune**: `server-api/.../roleset/invitations/platform-invitation.helpers.ts` — `mailsToAfter(action, address, expected)` (the delta the action produced for one address; polls until the count holds through a settle period, or ends at once on a surplus / on the first mail of an absence claim), `drainMailsTo(address)` (the creation mail has landed), `settledMailsTo(address)` (a baseline once the address's mail stops changing), `mailSummary(mails)`, `THROTTLED_CODE`, `INVITATION_REFUSED_CODE`. Walk-side equivalents in `organization-email-invitations.helpers.ts`: `mailsTo`, `waitForMailsTo(address, count)`, `settledMailsTo(address, expected?)`, `decodeMailBody`, `invitationLinkFromMail`. One `MailItem` type, exported by `@alkemio/tests-lib` (`getMailsData` is typed with it). `deleteMailSlurperMails()` is not used by these suites: invitee addresses are unique per run, so the shared inbox is never emptied and no spec reads another's mail.
- Walk-side GraphQL goes through the generated SDK as a persona (`asPersona(token, (sdk, headers) => sdk.Operation(vars, headers))` in the e2e helpers), not hand-written documents; `createDomainJoinOrganization(label, domain)` builds the verified, domain-join organization the precedence cases need; `registerUserAtAddress(email, firstName)` registers through Kratos and resolves the Alkemio user (the first authenticated call is what converts the open invitation).

**Search again with:** `git grep -n -E "platformInvitation|PlatformInvitation|invitedUserEmails|resendPlatformInvitation|ROLESET_INVITATION" <ref> -- server-api/src client-web/src lib/src ':!lib/src/core/generated'`.

## Space community notifications — invitations, joins, outcomes (061 / notifications#356)

_Searched 2026-09-28, `origin/develop` @ `0ca74068` (test-suites), against server#6467, notifications#594, client-web#10272, test-suites#632. Plan: `client-web/src/functional-e2e/organization-space-invitations/organization-space-invitations-test-plan.md`._

| Area | Status | Evidence |
|---|---|---|
| User **receives** a Space invitation (L0/L1/L2, inviter levels, muted, not-authorized-to-parent) | Full | `notifications/space/community/invitations.it-spec.ts` (8 tests, :215-448) — never accepts or rejects |
| Direct join / admin adds user → Space admins "joined" + member welcome | Full | `notifications/space/community/join-community.it-spec.ts:202,231,260` (DIRECT origin; unaffected by the 061 suppression) |
| Approved application keeps "joined" to co-admins (R40) | Full | `notifications/space/community/application-approval-new-member.it-spec.ts:224` |
| Organization invited → org admins notified; org accepts/declines → Space admins told; no generic "joined" on org accept | Full | `notifications/space/community/organization-invitations.it-spec.ts` (US2 :331-594, US4 :595-…; no-joined guard :698-706) |
| **User** accepts/declines a Space invitation → Space admins told (`SPACE_ADMIN_USER_COMMUNITY_INVITATION_*`) | **Partial** — L0 only, email + in-app, every Space admin; green on a local stack, not run against a deployed environment. Push, and the muted-setting and inviter-removed variants for user invitees, stay unit only (server `role.set.resolver.mutations.membership.spec.ts` › `user accept/decline outcome dispatch`) | `notifications/space/community/user-invitation-outcomes.it-spec.ts` › UO-1 (accept), UO-2 (decline). Absent before test-suites#646 |
| **User** invitation accept does NOT also fire generic "joined"; ancestor Spaces still do | **Partial** — organization arm and user arm both at API level: no "joined" on the invited Space at L0 and L1, L0 ancestor admins still get "joined" on an L1 accept. Local stack only; L2 not exercised (same rule, unit-pinned in `role.set.service.spec.ts` R26 cases) | `notifications/space/community/user-invitation-outcomes.it-spec.ts` › UO-1, UO-3; `organization-invitations.it-spec.ts:698-706` |
| Specs that accept a user invitation but assert NO notifications (safe from notification-rule changes) | n/a | `roleset/invitations/invitation-contributors.it-spec.ts:332,381,423`, `roleset/hierarchy-parity/invitation-hierarchy-parity.it-spec.ts`, `journey/conversion/move-L*-applications-invitations.it-spec.ts` |
| Push for Space-admin invitation outcomes | Unit only | server `notification.space.adapter.spec.ts` › `excludes whoever answered … email, in-app AND push` |
| Bell rendering of user-outcome rows | **None** — client-web #10272 unit tests name the organization events only | manual row proposed (plan M-1) |

**Search again with:** `git grep -n -E "eventOnRoleSetInvitation|SpaceAdmin(User|Organization)CommunityInvitation|communityInvitationResponse|joined \\$\\{|Welcome to the Community" origin/develop -- server-api/src client-web/src`.

## Platform forum — categories, retirement, Matrix hierarchy reconcile (060 / 061)

_Searched 2026-09-28, develop @ `ea5eebe9`, with the open PRs test-suites#600/#643 and server develop @ `df7445856` (027 merged the same day). Plan: `server-api/src/functional-api/communications/forum-discussions/forum-discussions-test-plan.md`._

| Area | Status | Evidence |
|---|---|---|
| Category create/refuse matrix (GA, QA), new members active, recategorise round-trip, remove refused (non-admin; non-empty with count) | Full | `communications/forum-discussions/platform-discussions.it-spec.ts` (#628) |
| Canonical category order (D-09) | **Partial** — the live test asserts the set and length 8, not order. Order is pinned only in server `forum.discussion.category.spec.ts` | plan U-1 |
| Forum update/delete denial messages | **Red on develop since server#6322**: the privilege is now `platform-forum-manage`. Fix is in open #600 | same file |
| Remove-category success / idempotency / tombstone | Unit only, **by ruling** (060 D-06). Never automate it against shared envs | server `forum.service.spec.ts`, `forum.resolver.mutations.spec.ts` |
| Read-side drift filter (active list; discussion → OTHER) | Unit only before this plan | server `forum.resolver.fields.spec.ts`, `discussion.resolver.fields.spec.ts` |
| Forum notification silence on recategorise | **None** | — |
| Reconcile mutation, task summary, Redis lease, audit rows | **None** in test-suites on develop. Unit + Go only. #600 adds only role-matrix dry-run ALLOW/DENY cells | server `admin.communication.forum.hierarchy.reconcile.*.spec.ts`; matrix-adapter `space_service_setchildren_test.go` |
| Matrix hierarchy edges, room-directory visibility | **Observable on a local stack only**: directory visibility without a token, `m.space.child` with the dev appservice token (see harness.md). Unobservable on nightly/ACC | plan N-11, N-12a/b, N-15 (planned 2026-09-29) |
| Forum category UI (nav, pickers, edit dialog) E2E | **None** in test-suites. client-web's `e2e/specs/forum{Categories,Recategorise}.e2e.spec.ts` are `@forge-acceptance` and not executed in CI | — |
| Legacy-category dependence of the harness | PLATFORM_FUNCTIONALITIES is the harness default; OTHER is used by the remove negatives and #643's A15 fixture; `TestScenarioFactory.categoryMap` lacks NEWSLETTER/TIPS_AND_TRICKS | plan U-4 — must land before any targeted env retires a category |

**Search again with:** `git grep -n -E "forum|discussionCategor|ForumDiscussionCategory|latestReleaseDiscussion|ReconcileForumHierarchy|SyncSpaceHierarchy|platform_audit" <ref> -- server-api/src client-web/src lib/src ':!lib/src/core/generated'`.

## Activity feed and activity logs (server#6640 / #6643, server#6561)

_Searched 2026-10-15, test-suites `origin/develop` @ `663c61d9`, server `origin/develop` @ `a9ba1ea50`, client-web `origin/develop` @ `b1311f688`. Plan: `server-api/src/functional-api/activity-logs/activity-logs-test-plan.md` (one section per story)._

| Area | Status | Evidence |
|---|---|---|
| `activityFeed` / `activityFeedGrouped` (platform-level feeds), any actor | **Proven absent** before 2026-10-15: 0 hits in `server-api/src`, `client-web/src` and `lib/src` (generated excluded). There is no `.graphql` document and no wrapper. server#6640 AF-01 planned. server#6561 AF-11/AF-12 planned | — |
| `activityLogOnCollaboration` per collaboration: entry counts, MEMBER_JOINED, private/public read matrix (NON_SPACE_MEMBER → `Authorization`) | Full (API). The CALLOUT_PUBLISHED/POST/WHITEBOARD cases are `test.skip` "to be updated" in all three level specs | `activity-logs/{space,challenge,opportunity}-activity-logs.it-spec.ts` |
| Activity follows callout transfer / L1→L0 promotion / move into a private subspace | Full (API) | `activity-logs/activity-log-on-transfer-conversion.it-spec.ts`. Its `generateCalloutActivity` (publish a callout, add a post) is the proven way to seed visible, uniquely named activity |
| Empty-scope guard in `ActivityService.getGroupedActivity` | Unit only (mocks) | server `activity.service.spec.ts` › `should return no activity without querying when the collaboration scope is empty`. `activity.feed.service.spec.ts` mocks `ActivityService` and passes `[]` through, so it is **not** a boundary test |
| Other `ActivityService` readers on an empty scope (error-guessed for the #6640 pattern) | Not vulnerable to that pattern. `getActivityForCollaborations`, `getPaginatedActivity` and `getLatestActivitiesPerSpaceMembership` use ORM `In(...)` (empty → `0=1`). `getMySpacesActivity` is scoped by `triggeredBy` = self. Only `getGroupedActivity` builds raw SQL. None has a system test for the empty case | server `src/platform/activity/activity.service.ts` |
| `excludeMyActivity` / `myActivity` on `activityFeed` (and inherited by `activityFeedGrouped`) | Unit only, against a mocked query builder and mocked SQL: server `activity.feed.service.spec.ts`, `activity.service.spec.ts` (PR #6639). No system test before 2026-10-15; AF-11 (exclusion + full pages + cursor walk) and AF-12 (the `myActivity` × `excludeMyActivity` table) are planned | server unit specs |
| Relay paginator `getRelayStylePaginationResults` (all `first`/`after` paginated queries) under a narrowing predicate, and on an **empty** result | Unit only, fully mocked (`relay.style.pagination.fn.spec.ts`). The empty-page `getPageInfo` path has no real-DB test anywhere; AF-12 D5 would be the first | server `src/core/pagination/` |
| client-web dashboard consumer of `activityFeed` (`LatestContributions`: spaces feed with `excludeMyActivity`, "My activity" with `myActivity`) | Unit full: client-web `DashboardWithMemberships.activityView.test.tsx` (initial query, `fetchMore`, My activity unchanged). E2E touches the surface only: `home-menus.spec.ts` opens the dialogs, and `classifications-templates.spec.ts` › TL-07 asserts a page-wide absence | client-web `src/main/crdPages/dashboard/` |
| client-web consumer of `activityFeedGrouped` | The `LatestContributionsGrouped.graphql` document exists, but nothing calls its generated hook on develop. Exposure is via the API only | client-web `src/main/topLevelPages/myDashboard/latestContributions/` |

**Search again with:** `git grep -n -E "activityFeed|ActivityFeed(Grouped)?QueryArgs|activityLogOnCollaboration|getGroupedActivity|LatestContributions|excludeMyActivity|myActivity" <ref> -- server-api/src client-web/src lib/src ':!lib/src/core/generated'`.

## Template file repair — `adminRepairTemplateFiles` (server#6596 / server#6656)

_Searched 2026-10-15, test-suites `origin/develop` @ `663c61d9` + working tree, server `origin/develop` @ `a9ba1ea50` (contains #6656 merge `8e1d7c35`). Plan: `server-api/src/functional-api/templates/templates-test-plan.md` (Draft; scope = gate + dry run only, by user ruling)._

| Area | Status | Evidence |
|---|---|---|
| Any test-suites reference to the mutation or its types | **None — proven absent.** Not in the lib generated schema either | `rg -n 'adminRepairTemplateFiles\|AdminTemplateFileRepair\|TemplateFileRepair'` over `server-api/src client-web/src lib/src` |
| Gate: `PLATFORM_OPERATIONS_ADMIN` only (A11), role matrix | **None** — missing from `platform-roles/capabilities.data.ts` (the server census lists it) | planned PR-1 |
| Gate for anonymous / registered-without-role / template-owning space admin | **None** | planned TF-1 |
| Refused call never reaches the service; audit per run | Unit (mocked) | server `admin.template.file.repair.resolver.mutations.spec.ts` |
| Dry run copies nothing; empty list = none vs omitted = all; scanned count; missing files; owner credentials; edit race | Unit, **mocked SQL** | server `admin.template.file.repair.service.spec.ts` |
| Dry run on a real DB: shape, default, idempotency, template text unchanged | **None** | planned TF-2 (seeds a foreign reference via a verbatim `updatePostTemplate` description) |
| Real run (copy, ownerCanRead=false left as written, whiteboard/memo/office slots) | Unit only; **out of scope** for the plan | service spec |
| `createSpace` from a template whose whiteboard references an unreadable file (the story's user-facing bug) | **None** in test-suites (the issue says so itself); not assessed in this plan | — |

**Search again with:** `git grep -n -E "adminRepairTemplateFiles|AdminTemplateFileRepair|spaceTemplateID|rehomeSnapshotAssets" <ref> -- server-api/src client-web/src lib/src ':!lib/src/core/generated'`.

## Space membership control — Apply / Join / pending / invitation button (client-web#10401 / #10419)

_Searched 2026-10-15, test-suites `origin/develop` @ `663c61d9` (client-web, server-api, lib), client-web `develop` @ `7a37d4c4b` (contains `f7f44c43`). Plan: the #10419 section appended to `client-web/src/functional-e2e/applications/test-plan-applications-v2.md` (Draft)._

The control is one CRD component, `SpaceAboutApplyButton`, rendered on four surfaces: L0 Space sidebar (`SpaceTabSidebarConnector`, widget `applicationButton`), Space About (`CrdSpaceAbout`), subspace banner above the flow tabs (`SpaceApplyButtonConnector`), and Subspace About (`CrdSubspaceAbout`). The subspace sidebar has **no** apply widget.

| Area | Status | Evidence |
|---|---|---|
| An **invitation-only** (`CommunityMembershipPolicy.Invitations`) fixture anywhere in test-suites | **None, proven absent** in all three packages | `rg -n "CommunityMembershipPolicy\.(Invitations\|Open)"`. Only `Open` and `Applications` occur |
| Server privilege matrix under the INVITATIONS policy (no APPLY/JOIN for a non-member) | **None.** `roleset/user/user.authorization.it-spec.ts` only uses APPLICATIONS | — |
| "Apply" shown to a signed-in non-member, applications enabled | Full on the L0 sidebar, Space About and Subspace About. **None on the subspace banner** | `applications/space-applications-level-0.spec.ts › 1.0`, `› 1.1`; `explore-platform/explore-platform-authenticated.spec.ts › 2`; `applications/space-applications-level-1*.spec.ts › 1.2` |
| Subspace banner apply control (any state) | **None.** `public-space/non-member-subspace-navigation.spec.ts › 5.4` checks it inside an `if` and can never fail | — |
| "Application pending" label renders | **None** before #10419's plan. The three applications `beforeEach` blocks accept `/^(Apply\|Application pending)$/` and assert neither | planned IO-4 / IO-5 |
| "Sign in to apply" for anonymous visitors | Full (Space About, applications-policy spaces) | `explore-platform/explore-platform-anonymous.spec.ts`; `public-space/anonymous-user-access-public-space.spec.ts` |
| "Accept invitation" on the space control for a **user** invitee | **None at E2E.** The only "Accept invitation" hit is the organization Invitations tab (`organization-space-invitations/us3-org-accepts-declines.spec.ts`) | client-web unit only |
| Hide predicate decision table (`isApplyUnavailable`) and pending predicate (`isApplicationPending`, `{new, approving}`) | Unit | client-web `src/main/crdPages/space/isApplyUnavailable.test.ts`, `src/domain/community/applicationButton/isApplicationPending.test.ts`. No connector or component test exists |
| `approving` / `archived` / `rejected` application states in this UI | **Unreachable.** The button reads `me.communityApplications(states: ["new"])` (`UserPendingMemberships.graphql`); `approving` is transient inside the approval transaction | stays unit |

**Search again with:** `git grep -n -E "Apply not available|Application pending|Accept invitation|Sign in to apply|CommunityMembershipPolicy\.Invitations|applyForEntryRole" <ref> -- client-web/src server-api/src lib/src ':!lib/src/core/generated'`.

## Public profile resource tabs — user and organisation (client-web#10179 / #10424)

_Searched 2026-10-15, test-suites local `develop` @ `b451c329` (no relevant file differs from `origin/develop` @ `663c61d9`): client-web, server-api, lib, `client-web/tests`. client-web read at merge `b1311f68` (= its `origin/develop`; the sibling clone's local `develop` was behind it). Plan: the #10179 section of `client-web/src/functional-e2e/user-profile-test-plan.md` (Draft)._

Both `/user/<nameID>` and `/organization/<nameID>` render the shared `ProfileResourceTabStrip` (tablist `Resource sections`). Each page builds its own tab list inline: Leading if the profile leads a Space, then Member of (always), then Other Resources if the account owns a VC, pack or hub. The user page counts **Lead or Admin** as leading; the org page counts Lead only.

| Area | Status | Evidence |
|---|---|---|
| Tab order, landing tab, hidden-when-empty, "Other Resources" copy, Other Resources content, on either profile type | **None, proven absent** before #10179's plan | planned PT-1…PT-6 in `user-profile/profile-resource-tabs.spec.ts` |
| Signed-in visitor sees the Spaces an org leads (`Lead Spaces` tab → Space listed) | Full | `memberships/view-organization-profile-public.spec.ts` › Authenticated Non-Admin; `memberships/view-organization-profile-as-admin.spec.ts` |
| Anonymous visitor on an org profile | **Asserts the `Lead Spaces` tab** — predicted red after #10424 (anonymous never loads org roles, so the tab is hidden) | `view-organization-profile-public.spec.ts` › Unauthenticated, step 5 |
| User's own profile, `Member Of` tab lists the Space | Full | `memberships/view-own-user-profile-public-information.spec.ts` |
| Another user's profile memberships | Skipped (pending a product decision) | `memberships/view-another-user-profile-public-view.spec.ts` |
| `user-profile/*.spec.ts` (6 files) | **Settings pages only**, not the public profile | — |
| Landing tab / kept pick / not carried across profiles; Other Resources mapper (VC, pack, hub) | Unit (client-web) | `useResourceTabs.test.ts`; `publicProfileMapper.test.ts › mapAccountHostedResources` |
| Six-locale `otherResources` key | Checked by hand at `b1311f68`, no test | standing locale gap |

**Search again with:** `rg -n -i "Resource sections|Lead Spaces|All Memberships|Member Of|Other Resources|Resources Hosted" client-web/src client-web/tests`, then open every `memberships/view-*-profile-*.spec.ts`.

## Group conversations — member removal, leave, last-member auto-delete (server#6329 / #6573, matrix-adapter#82)

_Searched 2026-10-15, test-suites `origin/develop` @ `663c61d9`, server `origin/develop` @ `a9ba1ea50`, matrix-adapter `origin/develop` @ `97d58a8`. Plan: `server-api/src/functional-api/communications/conversations/conversations-test-plan.md`._

| Area | Status | Evidence |
|---|---|---|
| Create / update / query / send in DIRECT and GROUP conversations; non-member remove/update refused; removal from a non-existent conversation | Full (API), active | `communications/conversations/conversations.it-spec.ts` |
| Remove a member, leave, last-member auto-delete (lists + `MEMBER_REMOVED` / `CONVERSATION_DELETED` events) | **Skipped**: 8 tests across `conversations`, `conversation-subscriptions` and `delete-conversation`, all `test.skip` on client-web#9543 (open). The subscription ones used `delay(3000)` and at-least-once `find`. Plan U-1…U-5 re-enables and re-aligns them | same directory |
| Removed member's Alkemio privileges (read, API send, re-add self, update, remove others) | **Proven absent** before 2026-10-15. Plan N-2 | — |
| Matrix side of removal (membership `leave` by self, send `M_FORBIDDEN`, history cut at the leave) | **Proven absent**; local stack + appservice token only. Plan M-1…M-3 | — |
| Policy reset drops a removed member's READ; resets are idempotent | Unit | server `conversation.service.authorization.spec.ts` › A1 |
| `handleConversationMemberLeft` re-applies the policy before publishing | **Not unit-pinned**. Only plan N-2 guards the wiring | — |
| Late leave after a local removal is a no-op; a leave for a deleted room is ignored; local removal always completes | Unit | server `message.inbox.service.spec.ts`, `conversation.service.spec.ts`; adapter `TestKickUser_Room_*`, `TestHandleBatchRemoveMember_RemovalRejected` |
| Removal in the browser UI (chat list, timeline, composer) | **None**. The net audit proposes `NEW-F-group-membership-edit` | — |

**Search again with:** `git grep -n -E "removeConversationMember|leaveConversation|MEMBER_REMOVED|CONVERSATION_DELETED|conversationEvents|memberRemoved|conversation\(ID|room\(ID" <ref> -- server-api/src client-web/src lib/src ':!lib/src/core/generated'`.

## How to search this area again

`rg -n 'innovationFlow|minimumNumberOfStates|maximumNumberOfStates|L0_FIXED_INNOVATION|L0_MIN_INNOVATION' server-api/src/functional-api` — the conversion/callout-transfer/templates directories are the load-bearing ones; also check the server repo's own `*.spec.ts` unit suites before proposing a new system-level case, several risk-relevant assertions live there only.

---

## Sidebar search widget (055) — designer notes, 2026-09-03

> Written independently by the 055 design session and merged in as-is when the plan was committed as a record; entries may overlap with the sections above.

What is covered by area, and what was **proven absent**. A documented empty result is a finding:
it saves the next run the search. Every row carries the date and the branch it was established on.

A row tells you where to look and what to expect. It never replaces opening the file when a
verdict depends on it.

| Area | State | Where | Established (date / branch) |
|---|---|---|---|
| Global search — categories, filters, location, term limit, space filter, archived spaces, public/private space+subspace visibility matrices | **Covered, strong** (844 lines) | `server-api/src/functional-api/search/search.it-spec.ts` + `search.request.params.ts` | 2026-09-03 · `qa/055-sidebar-search-widget` off `develop` @ `7cdd17c9` |
| Flow-state-scoped / folded-callout search (`searchInFlowStateFilter`, `foldCalloutResources`, category `cursor`) | **None.** 0 hits outside generated types. `lib/…/queries/search/search.graphql` selects `calloutResults` but no `cursor` | — | 2026-09-03 · same |
| Sidebar widget lists (`InnovationFlowState.settings.sidebar`) at any level | **Covered (API).** The four L0 FR-009 defaults and the subspace generic default. Save-as-template and apply carry lists verbatim on L1 and on L0 (wholesale since server#6418), including the empty list. Mutation responses serialize the list. Member write → `FORBIDDEN_POLICY`; duplicate/unknown → `BAD_USER_INPUT`. A concurrent sidebar save plus rename loses the sidebar (server#6571; the pinning test US2-AS6 is skipped until the fix ships). L1→L0 promotion carry-over is in the conversion spec. *Was "None" on 2026-09-03; corrected 2026-10-01* | `templates/space/space-templates.it-spec.ts` › `innovation flow state sidebar round-trip`; `journey/conversion/convert-L1-to-L0-flow-states.it-spec.ts`; `sidebar-widgets/us2-admin-config.spec.ts` AS5–AS7 | 2026-10-01 · test-suites#615 |
| `calloutsSet.tags` — the tag list, and its per-callout read authorization | **None.** 0 hits in either suite | — | 2026-09-03 · same |
| Space sidebar contents, E2E | **Covered for L0 tabs.** Every default tab plus an added tab renders its FR-009 list in DOM order for a plain member. Action widgets are gated (admin sees, member does not). The Layout editor shows the vocabulary and selection and persists remove/add/reorder/empty; the member view reflects it on the next page load. Fetch parity holds for Events. Subspace settings and the hidden-section round-trip are **not** covered. *Was "Blind" on 2026-09-03; corrected 2026-10-01* | `sidebar-widgets/us1-default-rendering.spec.ts`, `sidebar-widgets/us2-admin-config.spec.ts` | 2026-10-01 · test-suites#615 |
| Search UI, E2E | **None.** Every `search` hit under `functional-e2e` is incidental (`research`, `searchVisibility`, member/user pickers) | — | 2026-09-03 · same |
| Banners / visuals / aspect ratios, any level | **None** before 10178; a first floor added by that plan | `client-web/src/functional-e2e/space-banner/`, `server-api/…/visual/` | 2026-09-02 · 10178 |
| Innovation-flow state transitions, callout transfer between states | Covered | `server-api/…/callout/transfer/*.it-spec.ts`, `…/journey/conversion/` | 2026-09-03 · same |
| Migrations — any behavioural claim about pre-existing rows | **None anywhere, structurally.** Owning-repo migration specs are static analysis of the SQL *string* | see `deferred.md` | 2026-09-03 · same |

### Owning-repo unit coverage worth knowing about

Often the right verdict is "covered at unit level, no system case needed". These were opened and
are load-bearing:

| Subject | Owning-repo test | Note |
|---|---|---|
| Sidebar widget placement rule + the four default lists | `server` › `innovation.flow.state.sidebar.defaults.spec.ts` (10-row truth table), `normalize.state.settings.spec.ts`, `innovation.flow.state.service.spec.ts`, `bootstrap.template.space.content.space.l0.sidebar.spec.ts` | pins the **TypeScript** path only — the migration SQL is a second, unbound implementation |
| Migration shape (one UPDATE, null-safe guard, throwing residual, no-op `down()`) | `server` › `src/migrations/__tests__/*.spec.ts` | **static source analysis** — never touches a database |
| Search summary label: sentences, plural forms, literal rendering of user terms and tag names | `client-web` › `SearchMatchSummary.test.tsx` | |
| Debounce incl. clear-then-retype value resurrection | `client-web` › `useDebouncedValue.test.ts` | |
| Search request term construction (one joined term, tags never dropped) | `client-web` › `flowStateSearchDataMapper.test.ts` | |
| Sidebar widget id ↔ wire enum mapping | `client-web` › `sidebarWidgetPlan.test.ts` | |

### Specs that look like coverage but are not

| Thing | Why it is not coverage | Established |
|---|---|---|
| `client-web` repo's own `e2e/specs/*.e2e.spec.ts` tagged **`@forge-acceptance`** | Absent from `ci-test.yml`, **never executed**, and driven by hand-seeded `E2E_*` env fixtures no seeder produces. Read them for locator and copy evidence — they are written from the real DOM — but never cite them as proof | 2026-09-03 · 055 (`sidebarSearchWidget`, `sidebarSearchDefaults`) |
| A migration spec under `src/migrations/__tests__/` | Asserts the text of its own SQL | 2026-09-02 · 10178, reconfirmed 055 |
| client-web `messaging-notifications/us2-group-message-notifications.spec.ts` › US2-AS4, and server-api `notifications/messaging/conversation-messages-negative.it-spec.ts` › US2-AS4 | They prove that a removed member stops being **notified**, not that their **access** is revoked. The client spec says so in its own scope warning | 2026-10-15 · server#6329 |
