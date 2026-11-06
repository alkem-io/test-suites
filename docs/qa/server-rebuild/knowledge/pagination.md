# Pagination — behaviour knowledge

_Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/pagination/`, 2 files, 42 cases — 31 run, 11 skipped); the specs, issues and docs listed in § Sources. Scope: the one cursor-pagination contract every paginated list shares (page size, cursors, ordering, page info, validation) and the per-list facts of the paginated queries — users, organisations, spaces, platform-admin lists, in-app notifications, role-set candidates, the Innovation Library, the activity feed, form responses. What a list contains (who is a user, which space is visible) belongs to that resource's own area; only the listing contract is here. WHAT and WHY only — no mutations, fixtures or request params. Status legend: **proven** = a green legacy case asserts it; **untested** = code and/or spec only, no case; **disputed** = sources disagree, see § Findings; **unknown-why** = the rule holds but no source states the reason — the reviewer fills the why or writes "unknown, ask product". Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The fact base with every file:line is `pagination-dossier.md` beside this file._

_Review load: 9 findings · 1 unknown-why row · 10 untested rows (gaps) · 16 constants to tick · 3 open questions. Manual points sit in five places: the Findings, the `unknown-why` rows, the `untested` rows (repeated under Gaps), the "product must rule?" column of the constants, and the Open questions._

## Behaviour rules

| ID | Rule the platform guarantees | Why (business reason, origin) | Actors | Sources (code › file:line · test › spec › case · spec › path) | Status |
|---|---|---|---|---|---|
| **### the shared contract** | | | | | |
| PAG-01 | Every paginated list takes `first` (page size forward) with an optional `after` cursor, or `last` with an optional `before` cursor, and answers with the page of items under a per-type field name, the `total` number of items matching the filter, and `pageInfo` (start cursor, end cursor, has-next, has-previous); a cursor is the id of an item in the list. | A list can be unbounded; cursor paging keeps responses small and stable (`docs/Pagination.md` Motivation). | all callers | code › `src/core/pagination/pagination.args.ts:4-29` · `paginated.type.ts:11-56` · `pagination.fn.ts:10-29` · `schema.graphql:5662-5669, 6354-6366, 6397-6407, 6430-6442` · test › `pagination/user` and `pagination/organization` › every row reads `users`/`organization` and the page length | proven (`total` and `pageInfo` never asserted outside the skipped block) |
| PAG-02 | A request is refused before any data is read when it combines `first` and `last` ("Using both "first" and "last" parameters is discouraged."), gives `after` without `first` ("Cursor "after" requires having "first" parameter."), `before` without `last` ("Cursor "before" requires having "last" parameter."), or a `first`/`last` of zero or less ("Parameter "first" needs to be positive." / `"last"`). | Relay-style direction is one-way per request; ambiguous requests are rejected rather than guessed. | all callers | code › `src/core/pagination/validate.pagination.args.ts:7-47` · `src/common/exceptions/pagination/*.ts` · test › `pagination/organization` and `pagination/user` › `Invalid pagination queries` (4 rows each) | proven (the "needs to be positive" refusals are untested) |
| PAG-03 | When neither `first` nor `last` is given a page holds 25 items; the Innovation Library caps a requested page at 100 and form responses at 50. | A default page instead of the whole collection; caps bound the per-request cost (spec 101 FR-005/FR-006). | all callers | code › `relay.style.pagination.fn.ts:24, 107-108` · `src/library/library/library.service.ts:35, 337-348` · `src/domain/collaboration/callout-form-response/callout.form.response.service.ts:33, 344-350` · spec › `server/specs/101-innovation-library-pagination/spec.md` FR-005, FR-006 | untested |
| PAG-04 | Items come in insertion order (the sequential row id) unless the list declares its own order, in which case the row id is the tiebreak; the Innovation Library and in-app notifications are newest first. | Sorting on UUIDs was slow on large tables, so a sequential `rowId` column is the sort and cursor key (`docs/Pagination.md` Decisions; 101 FR-015/FR-016). | all callers | code › `relay.style.pagination.fn.ts:87-102` · `library.service.ts:206, 238-242` · `src/platform/in-app-notification/in.app.notification.service.ts:169-177` · test › `pagination/organization` › `first: 2` without filter (the pre-existing org then org1) | proven (weakly: containment, not order) |
| PAG-05 | With `first` and `after`, the page starts right after the cursor item; the cursor must be an item of the same filtered list, otherwise "Unable to find entity with ID: <cursor>". | Cursor = pointer to a record ("linked list", `docs/Pagination.md`). | all callers | code › `relay.style.pagination.fn.ts:103-105, 120-149, 165-170` · test › `Pagination with cursors` (5 + 6 rows, all skipped "bug #3571") | untested (F-4) |
| PAG-06 | With `last` and no `before` the engine returns the **first** `last` items of the list, not the last ones. | — the no-cursor branch leaves the query untouched (`enforceCursor` returns early); Relay says the last N. | all callers | code › `relay.style.pagination.fn.ts:158-160, 107-108` · test › `Pagination without filter` › `first: undefined, last: 17` (passes only because 17 ≥ the whole list) | disputed (F-1) |
| PAG-07 | With `last` and `before` the page is the rows whose row id lies in `[cursorRow − last, cursorRow)` of the filtered list — a window of row-id arithmetic, which under a filter or after deletions holds fewer than `last` items. | — | all callers | code › `relay.style.pagination.fn.ts:172-185` | disputed (F-2) |
| PAG-08 | `hasPreviousPage`/`hasNextPage` say whether filtered items exist before the first / after the last item of the page; `startCursor`/`endCursor` are the ids of those items; `total` is the count of the whole filtered list. | Clients need to know whether to fetch more without a second query. | all callers | code › `relay.style.pagination.fn.ts:190-234` · `pagination.fn.ts:17-28` · test › skipped cursor rows (`hasNextPage: false` on the last page) | untested (F-4, F-6) |
| PAG-09 | A filter is a set of named fields; each given value matches as a case-insensitive substring of that field, the fields are combined with OR, and an empty string matches every item. Users filter on first name, last name, display name, email; organisations on display name, nameID, contact email, domain, website. | A single search box over several fields. | all callers | code › `src/core/filtering/filter.fn.where.expression.ts:10-31` · `filters/userFilter.ts`, `organizationFilter.ts` · `input-types/*.ts` · test › `Pagination with filter` (6 org rows: displayName, contactEmail substring 'email@test.io' → 2, website 'org' → 5, nameID OR website → 2, three empty strings → all 6; 7 user rows: email 'admin@alkem.io' → 2 incl. `community.admin`, firstName OR email → 2, four fields → 4, empties → 12) | proven |
| PAG-19 | An item on a page is the same object the single-item query returns. | One entity representation. | all callers | test › `pagination/user` › `query filtered user and verify data`; `pagination/organization` › `query filtered organization and verify data` | proven |
| **### the lists** | | | | | |
| PAG-10 | The platform user list (`usersPaginated`) is readable by every signed-in user and refused to visitors; `withTags` keeps only users whose profile has (or lacks) tags; service-profile accounts are included — unlike the unpaginated `users` query, which hides them. | "Allow all registered users to query non-protected user information" (code comment); personal fields keep their own per-field gate. | registered | code › `src/domain/community/user/user.resolver.queries.ts:41-62` · `src/domain/community/user/user.service.ts:949-995` · `src/platform/platform/platform.service.authorization.ts:484-491` · test › every `pagination/user` row (as the harness admin) | disputed (F-3; anonymous refusal untested) |
| PAG-11 | The organisation list (`organizationsPaginated`) is readable by anyone, signed in or not, optionally narrowed to one verification status. | — organisation profiles are public. | anonymous, registered | code › `src/domain/community/organization/organization.resolver.queries.ts:37-56` · `organization.service.ts:476-496` · test › every `pagination/organization` row (harness admin only) | unknown-why |
| PAG-12 | The space list (`spacesPaginated`) is readable by anyone and holds top-level spaces only, of the requested visibilities (default: active), with no per-space read check. | Space abouts are world-readable (journey area); the default hides archived/demo/inactive spaces. | anonymous, registered | code › `src/domain/space/space/space.resolver.queries.ts:43-53` · `space.service.ts:753-770` · `src/services/infrastructure/space-filter/space.filter.service.ts:13-25` | untested (F-7) |
| PAG-13 | The platform-admin user and organisation lists are the same pages behind admin gates: users for the users admin and the licence manager; organisations for content-full-access, support and the licence manager. | Support and the licence manager need the lists their actions target (027 R-F.2/R-F.3 code comments). | PUA, PLM, PCFA, support | code › `src/platform-admin/admin/platform.admin.resolver.fields.ts:178-245` | untested (covered elsewhere: `platform-roles/_support/groups/*`) |
| PAG-14 | A user's own in-app notifications page newest-first by trigger time, exclude archived ones, can be narrowed by type, page with a cursor made of trigger time + id, and a visitor gets an empty page; notifications whose space the reader cannot see are dropped after the page is cut, so a page can be shorter than asked. | Ordering by when the event happened, not when it was saved (code comment); anonymous `me` degrades to empty values (107/6315). | self | code › `src/services/api/me/me.resolver.fields.ts:54-85` · `src/platform/in-app-notification/in.app.notification.service.ts:150-325` · test › `graphql-guard/me-degradation-anonymous` (empty page) | untested here (F-8) |
| PAG-15 | A role set's candidate lists are paginated: users not yet in the entry role (restricted to the parent community's members unless the caller may invite into the parent), virtual contributors likewise, and entry-role holders not yet in an elevated role (refused with "Role <role> does not require an entry role." for a role that needs no entry role). | Inviting a non-member into a subspace also pulls them into the parent, so the pool widens only for those allowed to do that (code comment). | role-set readers | code › `src/domain/access/role-set/role.set.resolver.fields.ts:125-268` · `user.service.ts:997-1071` · `virtual.contributor.lookup.service.ts:169-206` | untested here (covered by the roleset / contributor-management suites) |
| PAG-16 | The Innovation Library pages listed, publicly visible innovation packs and their templates newest-first, up to 100 per page, narrowed by a case-insensitive substring and (templates) by type; eligibility is the same as the unpaginated lists. | Library grew past one request (spec 101 Context; FR-005/006/012/015/019). | registered | code › `src/library/library/library.resolver.fields.ts:66-109` · `library.service.ts:183-249` · spec › `server/specs/101-innovation-library-pagination/spec.md` | untested |
| PAG-17 | The activity feed pages the caller's activity with the caller's own ordering; it needs the platform read-users right. | — | registered | code › `src/domain/activity-feed/activity.feed.resolver.queries.ts:24-45` · `src/platform/activity/activity.service.ts:168-197` | untested here (covered by `activity-logs/activity-feed`) |
| PAG-18 | Form responses page forward only (`first`, `after`), 1–50 per page (default 25), over the responses the viewer may read: all, only their own, or none. | Response visibility is a form setting; the cap bounds the page. | callout readers | code › `callout.form.response.service.ts:344-390` · `src/common/constants/entity.field.length.constants.ts:24` | untested here (covered by `callout/form/*`) |

Numbering note: PAG-19 sits in the shared-contract block; ids are stable, not ordered.

## Who may (role × action)

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

| action | platform admin roles (which) | platform-license-manager | space admin | space member | registered | anonymous |
|---|---|---|---|---|---|---|
| page the platform user list (`usersPaginated`) | Y | Y | Y | Y | Y | N |
| page the platform-admin user list (`platformAdmin.users`) | Y — platform-users-admin only | Y | N | N | N | N |
| page the organisation list (`organizationsPaginated`) | Y | Y | Y | Y | Y | **Y** |
| page the platform-admin organisation list | Y — PCFA, support | Y | N | N | N | N |
| page the top-level space list (`spacesPaginated`) | Y | Y | Y | Y | Y | **Y** |
| page own in-app notifications (`me.notifications`) | Y | Y | Y | Y | Y | – (empty page) |
| page a role set's candidate users / VCs | Y where the role reads the role set | – | Y (own space) | Y where members read the role set | N | N |
| page the Innovation Library | Y | Y | Y | Y | Y | per library READ (unverified) |
| page the activity feed | Y | Y | Y | Y | Y | N |
| page a callout's form responses | per callout READ + response scope | – | Y | ALL / OWN per form setting | per callout READ | per callout READ |

Evidence: `user.resolver.queries.ts:54-59` + `platform.service.authorization.ts:484-491` (READ_USERS to every registered user); `platform.admin.resolver.fields.ts:184-192, 221-237` (admin list gates incl. R-F.2/R-F.3); `organization.resolver.queries.ts:37-56` and `space.resolver.queries.ts:43-53` (no gate); `me.resolver.fields.ts:62-73` (anonymous → empty); `role.set.resolver.fields.ts:125-126, 190-192, 228-229` (READ on the role set); `library.resolver.fields.ts:66-67, 88-89` (READ on the library — the library policy itself was not read here); `activity.feed.resolver.queries.ts:35-40`; `callout.form.response.service.ts:357-370`. The legacy suite runs every row as the harness admin, so no cell is proven by it.

## Constants the rules depend on (rebaseline candidates)

| Constant | Value today | Source | product must rule? |
|---|---|---|---|
| Default page size | 25 (`DEFAULT_PAGE_ITEMS`); form responses `DEFAULT_PAGE_SIZE` 25 | `relay.style.pagination.fn.ts:24`; `callout.form.response.service.ts:33` | |
| Page caps | Innovation Library 100 (`MAX_LIBRARY_PAGE_SIZE`); form responses 50 (`FORM_RESPONSES_PAGE_MAX`); every other list uncapped | `library.service.ts:35`; `entity.field.length.constants.ts:24` | |
| Cursor | the item's `id` (UUID); sort/cursor key `rowId` (sequential, per table) | `relay.style.pagination.fn.ts:25-26` | |
| Default order | `rowId ASC`; library `DESC`; in-app notifications `triggeredAt DESC, id DESC` | `relay.style.pagination.fn.ts:70, 97-102`; `library.service.ts:206`; `in.app.notification.service.ts:171-177` | |
| Backward window | `[cursorRow − last, cursorRow)` | `relay.style.pagination.fn.ts:172-185` | F-2 |
| No-cursor `last` | first `last` rows | `relay.style.pagination.fn.ts:158-160` | F-1 |
| Validation texts | `Using both "first" and "last" parameters is discouraged.`; `Cursor "after" requires having "first" parameter.`; `Cursor "before" requires having "last" parameter.`; `Parameter "first" needs to be positive.`; `Parameter "last" needs to be positive.` | `validate.pagination.args.ts:12-44` | F-5 |
| Validation codes | `PAGINATION_PARAM_NOT_FOUND`, `PAGINATION_INPUT_OUT_OF_BOUND` | `src/common/exceptions/pagination/*.ts:6` | |
| Cursor-not-found text | `Unable to find entity with ID: <cursor>` (entity-not-found) | `relay.style.pagination.fn.ts:141-146` | |
| Filter semantics | `ILIKE '%value%'` per field, OR across fields; `''` matches all; displayName via profile join | `filter.fn.where.expression.ts:25-31`; `filters/*.ts` | |
| User filter fields | `firstName`, `lastName`, `displayName`, `email` | `input-types/user.filter.input.ts` | |
| Organisation filter fields | `displayName`, `nameID`, `contactEmail`, `domain`, `website`; plus `status: OrganizationVerificationEnum` | `input-types/organization.filter.input.ts`; `organization.resolver.queries.ts:43-48` | |
| Space filter | `visibilities: [ACTIVE \| ARCHIVED \| DEMO \| INACTIVE]`, default `[ACTIVE]`, L0 only | `space.filter.dto.input.ts`; `space.filter.service.ts:16-18`; `space.visibility.ts` | |
| Page field names | `users`, `organization`, `spaces`, `inAppNotifications`, `virtualContributors`, `innovationPacks`, `templates` (+ `total`, `pageInfo`) | `src/core/pagination/paginated.*.ts`; library types | |
| Platform-admin list gates | users: `PLATFORM_USERS_ADMIN` ∨ `PLATFORM_LICENSING_LISTS_READ`; organisations: `PLATFORM_CONTENT_FULL_ACCESS` ∨ `PLATFORM_SUPPORT_LISTS_READ` ∨ `PLATFORM_LICENSING_LISTS_READ` | `platform.admin.resolver.fields.ts:184-192, 221-237` | |
| GraphQL surface | `usersPaginated(after, before, filter, first, last, withTags)`, `organizationsPaginated(…, status)`, `spacesPaginated(…, filter)`, `platformAdmin.users/organizations`, `me.notifications`, `RoleSet.availableUsersForEntryRole/availableVirtualContributorsForEntryRole/availableUsersForElevatedRole`, `Library.innovationPacksPaginated/templatesPaginated`, `activityFeed`, `PageInfo{startCursor, endCursor, hasNextPage, hasPreviousPage}` | `schema.graphql:5662-5669, 6354-6366, 6397-6407, 6430-6442` | |

## Where this lands in the new core

Per the rebuild briefing (`plan.md` § 1, catalogue), lists in the new core are read-time queries over the viewer's slice, so the contract above (PAG-01/02/08/09) is the public API shape to preserve while the engine is replaced. Three facts here should shape the port: (1) the `rowId` tiebreak is an implementation decision from a slow-UUID-sort finding (PAG-04) — the new core can keep a sequential key but must not expose it; (2) backward paging is broken in two ways today (PAG-06/07, F-1/F-2) and the cursor contract has no green case (F-4) — write the new net's cursor cases from this table, not from the legacy skipped block; (3) visibility is applied inside the query for some lists and after the page cut for others (PAG-12 none, PAG-14 after) — the new core should filter before cutting so `total` and page length stay truthful. Error texts are rebaseline rows, not rules.

## Findings (sources disagree, or likely defect)

1. **`last` without `before` returns the first N (PAG-06).** Code: with no cursor the query is left as-is, ordered ascending, `take(last)`. Relay spec (cited in the code) and `docs/Pagination.md` ("Amount of items before the 'before' cursor"): the last N. Test: the only `last`-only rows ask for 17 of 6/12 items, so they cannot tell. Ruling: defect to fix in the new core; add a backward case to the net.
2. **Backward window is row-id arithmetic (PAG-07).** `[cursorRow − last, cursorRow)` assumes contiguous row ids in the filtered set; with a filter or deleted rows a page holds fewer than `last`. Test/spec: none. Ruling: defect (same fix as 1).
3. **Service-profile users leak into `usersPaginated` (PAG-10).** Code: `users` filters `serviceProfile: false`; `getPaginatedUsers` does not. Test: the user file's oracles count 12 including `notifications@alkem.io`; whether that account is a service profile on the test cluster was not checked. Spec: none. Ruling: align the two queries.
4. **The cursor and pageInfo contract is unproven (PAG-05/08).** 11 cases are skipped with "bug #3571" (issue not read — cited only in tests). Nothing green asserts `startCursor`, `endCursor`, `hasNextPage`, `hasPreviousPage` or `total`. Ruling: un-skip against the current engine or rewrite; decide whether #3571 is still real.
5. **"Discouraged" is a refusal (PAG-02).** The message says discouraged; the request is rejected. Ruling: rebaseline the text when it changes; not a behaviour change.
6. **Empty page info (PAG-08).** With no items `startCursorRowId` is undefined and the counts run `rowId < undefined` / `> undefined`; the outcome (0 or an error) was not verified. Ruling: verify live; define `hasNextPage=false` for an empty page.
7. **Unauthenticated full listings (PAG-11/12).** Organisations and active L0 spaces page with no gate and no per-row read check, while `spaces`/`exploreSpaces` apply an authoritative READ (journey JRN-64). Consistent with public abouts today; a private L0 still appears in `spacesPaginated`. Ruling: confirm that listing private spaces' existence is intended (cross-ref journey).
8. **`me.notifications` pages are cut before the visibility drop (PAG-14).** Rows of unreadable spaces are removed after `take`, so a page can be short while `total` counts them; backward `hasPreviousPage` is `!!after || !!before`, not a count. Ruling: filter before paging in the new core.
9. **Legacy oracles are containment-only (PAG-01/04/09).** Every green row asserts "contains X and Y, length N"; order is never pinned, and `email 'admin@alkem.io' → 2` passes only because of substring matching. The net must pin order and exact sets.

## Gaps (no legacy case)

Untested rules by id: PAG-03, PAG-05, PAG-08, PAG-12, PAG-13, PAG-14, PAG-15, PAG-16, PAG-17, PAG-18; plus the untested clauses of PAG-02 (`first`/`last` ≤ 0), PAG-10 (visitor refused; `withTags`), PAG-11 (status filter; visitor allowed) and the whole of PAG-06, PAG-07.

Behaviours the area has that neither reading nor tests pinned down:
- Forward paging with `after` across more than one page (continuity, no repeats, `hasNextPage` flips on the last page).
- Backward paging with `before` + `last`.
- Default page of 25 when no size is given; the library and form-response caps.
- A cursor that is not in the filtered list (refusal text).
- Ordering under a filter (row-id ascending; library newest-first).
- `withTags` on the user list; `status` on the organisation list; `visibilities` on the space list.
- Anonymous access: refused for users, allowed for organisations and spaces.
- `total` under a filter.
- In-app notification paging with the composite cursor and the post-page visibility drop.

## Open questions (could not be determined from the three sources)

1. **Issue #3571.** Cited only by the skipped cursor cases; per the brief it was not read. Someone must say whether it is open and whether the skips still apply to the row-id engine (findings 1, 2, 4).
2. **Service-profile accounts on the test cluster.** Whether `notifications@alkem.io` (or any of the 12) is a service profile decides whether finding 3 changes the user oracles.
3. **`RelayStylePaginatedSpace`.** The edges/node variant is defined (`paginated.space.ts:5-12`) but no resolver returning it was found; dead type or an unread consumer?

## Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/core/pagination/pagination.args.ts`, `pagination.fn.ts`, `relay.style.pagination.fn.ts`, `relay.style.paginated.type.ts`, `paginated.type.ts`, `validate.pagination.args.ts`, `paginated.user.ts`, `paginated.organization.ts`, `paginated.space.ts`, `paginated.in-app-notification.ts`, `paginated.virtual.contributor.ts`
- `src/core/filtering/filter.fn.where.expression.ts`, `filters/userFilter.ts`, `filters/organizationFilter.ts`, `input-types/*.ts`; `src/services/infrastructure/space-filter/space.filter.service.ts`, `dto/space.filter.dto.input.ts`
- `src/common/exceptions/pagination/pagination.parameter.not.found.exception.ts`, `pagination.input.out.of.bounds.exception.ts`; `src/common/constants/entity.field.length.constants.ts`
- `src/domain/community/user/user.resolver.queries.ts`, `user.service.ts`; `src/domain/community/organization/organization.resolver.queries.ts`, `organization.service.ts`; `src/domain/space/space/space.resolver.queries.ts`, `space.service.ts`; `src/domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service.ts`; `src/domain/access/role-set/role.set.resolver.fields.ts`; `src/domain/collaboration/callout-form-response/callout.form.response.service.ts`; `src/library/library/library.resolver.fields.ts`, `library.service.ts`; `src/platform/activity/activity.service.ts`; `src/domain/activity-feed/activity.feed.resolver.queries.ts`; `src/platform/in-app-notification/in.app.notification.service.ts`; `src/services/api/me/me.resolver.fields.ts`; `src/platform-admin/admin/platform.admin.resolver.fields.ts`; `src/platform/platform/platform.service.authorization.ts`
- `docs/Pagination.md`; `schema.graphql`
- git: `75c3f0a59`, `bf3ba1a0a`, `cc22a7f07`, `0776a92a9`, `2f7feca0f` (#5918)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/pagination/organization.it-spec.ts`, `user.it-spec.ts`, `pagination.request.params.ts`
- Other suites touching the area (list only): see dossier § 2

Specs / issues:
- server `specs/101-innovation-library-pagination/spec.md`
- server#3571 (cited by the skipped cases; not read), server#5918 (PR)
