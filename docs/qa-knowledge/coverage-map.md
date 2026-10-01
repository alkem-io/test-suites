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
