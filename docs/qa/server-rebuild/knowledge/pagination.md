# Pagination: behaviour rules

_What the platform does today when a long list is served in pages: the one paging contract every such list shares (page size, markers, order, page info, refusals) and the facts per list: users, organisations, spaces, the platform-admin lists, in-app notifications, role-set candidates, the Innovation Library, the activity feed and form responses. What a list contains belongs to the file of that resource; only the paging is here. The file follows the three-section layout accepted in the product review of `communications.md` (alkem-io/test-suites#717): **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 2 · Technical Lead 7 · Quality Lead 5 · Architecture Lead 1. By state: 8 open · 7 with a suggested answer. Proof of the 19 rules: 7 proven by a test · 12 untested (Appendix A)._

_Whys of the 19 rules: 11 rest on a source · 6 carry a draft for product to decide · 2 have none, and both carry a defect marker (PAG-06, PAG-07)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A rule with no why at all carries an open question or a defect marker in section 3.
- **Decided by** names the source of the decision: a spec with its requirement, a pull request or commit, an issue or a document. "Not decided: exists in the code" means the behaviour exists in the code and nobody chose it. "Not decided: a defect" means today's behaviour is a fault.
- A marker in bold at the end of a rule points at section 3: **(open: F4)** means a question on this rule is still open, **(defect: F1)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F3)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A decided question leaves section 3 and moves onto its rule; "was F4" in **Decided by** keeps the trail. Nothing is decided in this file yet.
- A "marker" is what the appendix calls a cursor: the id of an item, used to say where the next page starts.

## 1. Rules

### The shared contract

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PAG-01 | Every long list is served in pages. A caller asks for a page size, going forward or backward from a marker, and gets the page, the total number of matching items, and whether more items exist before or after it. **(open: F9)** | — | — | A list can be unbounded; cursor paging keeps responses small and stable (`docs/Pagination.md` Motivation). | docs/Pagination.md |
| PAG-02 | A request that mixes forward and backward paging, gives a marker without a page size, or asks for a page of zero or fewer items is refused before any data is read. **(open: F5)** | — | — | Relay-style direction is one-way per request; ambiguous requests are rejected rather than guessed. _(draft)_ | Not decided: exists in the code |
| PAG-03 | A page holds 25 items when no size is asked. The Innovation Library gives at most 100 per page and form responses at most 50. | — | — | A default page instead of the whole collection; caps bound the per-request cost (spec 101 FR-005/FR-006). | Server spec 101 FR-005, FR-006 |
| PAG-04 | Items come in the order they were created, unless the list sets its own order. The Innovation Library and in-app notifications show the newest first. **(open: F9)** | — | — | Sorting on UUIDs was slow on large tables, so a sequential `rowId` column is the sort and cursor key (`docs/Pagination.md` Decisions; 101 FR-015/FR-016). | docs/Pagination.md; server spec 101 FR-015/FR-016 |
| PAG-05 | Paging forward from a marker starts right after that item. The marker must be an item of the same filtered list; otherwise the request is refused. **(open: F4, OQ1)** | — | — | Cursor = pointer to a record ("linked list", `docs/Pagination.md`). | docs/Pagination.md |
| PAG-06 | Asking for the last N items without a marker returns the first N items of the list, not the last ones. **(defect: F1)** | — | — | — the no-cursor branch leaves the query untouched (`enforceCursor` returns early); Relay says the last N. | Not decided: a defect |
| PAG-07 | Paging backward from a marker can return fewer items than asked when a filter is on or items were deleted. **(defect: F2)** | — | — | — | Not decided: a defect |
| PAG-08 | Each page says whether items exist before and after it, gives the markers of its first and last item, and gives the total of the whole filtered list. **(open: F4, F6)** | — | — | The pagination function "look[s] around if data is available before or after the paged section", so a client knows whether to fetch more without a second query (`docs/Pagination.md` Technical design). | docs/Pagination.md (Technical design) |
| PAG-09 | A filter keeps every item that contains the typed text in one of its fields, ignoring capitals. An empty text keeps everything. Users are filtered on first name, last name, display name and email; organisations on display name, name id, contact email, domain and website. **(open: F9)** | A single search box over several fields. _(draft)_ | — | — | Not decided: exists in the code |
| PAG-19 | An item on a page is the same object as the one returned when it is asked for on its own. | — | — | One object per item, so the client cache keeps one copy of each item whether it came from a page or on its own. _(draft)_ | Not decided: exists in the code |

### The lists

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PAG-10 | Every signed-in user can page through the platform user list; visitors are refused. Service accounts are included, unlike in the unpaged user list, which hides them. **(defect in part: F3, OQ2)** | — | — | "Allow all registered users to query non-protected user information" (code comment); personal fields keep their own per-field gate. | Not decided: exists in the code (code comment) |
| PAG-11 | Anyone, signed in or not, can page through the organisation list, optionally narrowed to one verification status. **(open: Q-PAG-01, F7)** | Organisation profiles are public, so their list is public too. _(draft)_ | — | — | Not decided: exists in the code |
| PAG-12 | Anyone can page through the list of top-level spaces. It shows active spaces unless other visibilities are asked for, and it does not check whether the reader may see each space. **(open: F7)** | The default hides archived, demo and inactive spaces. _(draft)_ | — | Space abouts are world-readable (journey area). _(draft)_ | Not decided: exists in the code |
| PAG-13 | The platform-admin lists of users and organisations are the same pages behind admin gates: users for the Platform Users Admin and the Platform License Manager; organisations for Platform Content Full Access, Platform Support and the Platform License Manager. | Support and the licence manager need the lists their actions target (027 R-F.2/R-F.3 code comments). | — | — | Spec 027 R-F.2/R-F.3 (code comments) |
| PAG-14 | A user's own in-app notifications come newest first, leave out archived ones and can be narrowed by type. A visitor gets an empty page. A page can be shorter than asked, because notifications from spaces the reader cannot see are dropped after the page is cut. **(defect in part: F8)** | — | — | Ordering by when the event happened, not when it was saved (code comment); anonymous `me` degrades to empty values (107/6315). | Code comment; 107/6315 as cited in the extraction |
| PAG-15 | A role set's candidate lists are paged: users and virtual contributors who are not yet members (only the parent community's members, unless the caller may invite into the parent), and members who do not yet hold a higher role. | — | — | Inviting a non-member into a subspace also pulls them into the parent, so the pool widens only for those allowed to do that (code comment). | Not decided: exists in the code (code comment); see RS-11 in `roleset.md` |
| PAG-16 | The Innovation Library pages its listed, publicly visible innovation packs and their templates newest first, up to 100 per page, narrowed by text and, for templates, by type. | — | — | Library grew past one request (spec 101 Context; FR-005/006/012/015/019). | Server spec 101 FR-005/006/012/015/019 |
| PAG-17 | The activity feed pages the caller's own activity in the order the caller asks for. It is for signed-in users only. | — | As a signed-in user, I want to page back through my own activity, so that I can find what I did earlier. _(draft)_ | — | Not decided: exists in the code |
| PAG-18 | Form responses page forward only, 1 to 50 per page (25 by default), over the responses the viewer may read: all, only their own, or none. | — | — | Relay paging keyed on `rowId`, `first` clamped to 50, total scoped to the viewer (080 D-15); the cap of 50 is one of the form's count caps (080 D-16). | Spec 080 D-15, D-16 |

Numbering note: PAG-19 sits in the shared-contract block; ids are stable, not ordered.

## 2. Rights

_Y = may · N = refused · – = does not apply · ? = not verified. Conditions are footnotes under each table. Role names are written out. Product has not reviewed these cells yet. Evidence is in Appendix B._

### Paged lists

| ID | Action | Platform admin roles | Platform License Manager | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|
| W1 | Page the platform user list | Y | Y | Y | Y | Y | N |
| W2 | Page the platform-admin user list | Y¹ | Y | N | N | N | N |
| W3 | Page the organisation list | Y | Y | Y | Y | Y | Y |
| W4 | Page the platform-admin organisation list | Y² | Y | N | N | N | N |
| W5 | Page the list of top-level spaces | Y | Y | Y | Y | Y | Y |
| W6 | Page my own in-app notifications | Y | Y | Y | Y | Y | –³ |
| W7 | Page a role set's candidate users or virtual contributors | Y⁴ | – | Y⁵ | Y⁶ | N | N |
| W8 | Page the Innovation Library | Y | Y | Y | Y | Y | ?⁷ |
| W9 | Page the activity feed | Y | Y | Y | Y | Y | N |
| W10 | Page a callout's form responses | Y⁸ | – | Y | Y⁹ | Y⁸ | Y⁸ |

¹ Platform Users Admin only. ² Platform Content Full Access and Platform Support. ³ A visitor gets an empty page, not a refusal. ⁴ Where the role can read the role set. ⁵ In their own space. ⁶ Where members can read the role set. ⁷ Depends on read access to the library, which was not verified. ⁸ Only with read access to the callout, and within the form's response setting. ⁹ All responses or only their own, as the form is set.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 2 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Lists | decision | Organisations and active top-level spaces can be listed by anyone, with no check per item, so a private top-level space still appears in the list. Is it intended that the existence of private spaces is visible? | Product Lead (Security Lead owns the risk if it stays) | — | open |
| CONST | All | decision | 13 of the 16 constants are still blank in "product must rule?" (Appendix E). Which must product rule on? | Product Lead (Technical Lead for engineering limits and wire shapes) | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Lists | defect | Service accounts show in the paged user list but are hidden in the unpaged one (PAG-10). Should the two lists agree? | Technical Lead (Product Lead confirms that service accounts stay hidden) | Align the two queries. | suggested |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 7 to answer, 3 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Contract | defect | Asking for the last N items without a marker returns the first N (PAG-06). Fix it in the new core? | Technical Lead (Quality Lead adds the backward case) | A defect to fix in the new core; add a backward case to the test net. | suggested |
| F2 | Contract | defect | Backward paging counts on row numbers without holes, so with a filter or deleted rows a page holds fewer items than asked (PAG-07). Fix it with F1? | Technical Lead | A defect; same fix as F1. | suggested |
| F3 | Lists | defect | Service accounts show in the paged user list but are hidden in the unpaged one (PAG-10). Should the two lists agree? | Technical Lead (Product Lead confirms that service accounts stay hidden) | Align the two queries. | suggested |
| F5 | Contract | tidy-up | The message says that mixing forward and backward paging is "discouraged", but the request is refused. Is the wording to be corrected? | Technical Lead | Rebaseline the text when it changes; not a change in behaviour. | suggested |
| OQ1 | Contract | check | Is server#3571 still open, and do the 11 skipped marker cases still apply to today's engine? (Feeds F1, F2 and F4.) | Technical Lead | — | open |
| OQ3 | Contract | tidy-up | The type `RelayStylePaginatedSpace` is defined, but nothing that returns it was found. A dead type, or a consumer that was not read? | Technical Lead | — | open |
| Q-PAG-01 | Lists | decision | Why does this rule exist? The only note is "organisation profiles are public"; no source states that visitors are meant to page through all organisations (PAG-11). | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Contract | test | The marker and page-info contract has no green test: 11 cases are skipped with "bug #3571". Run them again against today's engine or rewrite them, and decide whether #3571 is still real. | Quality Lead (Technical Lead answers OQ1 first) | — | open |
| F6 | Contract | check | What does the page info say for an empty page: nothing more to fetch, or an error? It was not verified. | Quality Lead (Technical Lead defines the answer) | Verify live; define "has next page" as false for an empty page. | suggested |
| CONST | All | decision | 13 of the 16 constants are still blank in "product must rule?" (Appendix E). Which must product rule on? | Product Lead (Technical Lead for engineering limits and wire shapes) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 5 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Contract | test | The marker and page-info contract has no green test: 11 cases are skipped with "bug #3571". Run them again against today's engine or rewrite them, and decide whether #3571 is still real. | Quality Lead (Technical Lead answers OQ1 first) | — | open |
| F6 | Contract | check | What does the page info say for an empty page: nothing more to fetch, or an error? It was not verified. | Quality Lead (Technical Lead defines the answer) | Verify live; define "has next page" as false for an empty page. | suggested |
| F9 | Contract | test | The legacy tests only check that a page contains certain items and has a certain length; order and exact sets are never checked. | Quality Lead | The new test net must pin order and exact sets. | suggested |
| OQ2 | Lists | check | Is notifications@alkem.io, or any other of the 12 test users, a service account on the test cluster? That decides whether F3 changes what the user tests expect. | Quality Lead | — | open |
| GAPS | All | test | 12 rules have no test, 3 more have untested parts and 9 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Contract | defect | Asking for the last N items without a marker returns the first N (PAG-06). Fix it in the new core? | Technical Lead (Quality Lead adds the backward case) | A defect to fix in the new core; add a backward case to the test net. | suggested |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Lists | decision | Organisations and active top-level spaces can be listed by anyone, with no check per item, so a private top-level space still appears in the list. Is it intended that the existence of private spaces is visible? | Product Lead (Security Lead owns the risk if it stays) | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F8 | Lists | defect | A notifications page can be short while the total still counts the dropped items, because hidden items are removed after the page is cut (PAG-14). How must the new core do it? | Architecture Lead | Filter before paging in the new core. | suggested |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them. The appendix keeps the original wording of the extraction._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The fact base with every file and line is `pagination-dossier.md` beside this file._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| PAG-01 | Every paginated list takes `first` (page size forward) with an optional `after` cursor, or `last` with an optional `before` cursor, and answers with the page of items under a per-type field name, the `total` number of items matching the filter, and `pageInfo` (start cursor, end cursor, has-next, has-previous); a cursor is the id of an item in the list. | all callers | code › `src/core/pagination/pagination.args.ts:4-29` · `paginated.type.ts:11-56` · `pagination.fn.ts:10-29` · `schema.graphql:5662-5669, 6354-6366, 6397-6407, 6430-6442` · test › `pagination/user` and `pagination/organization` › every row reads `users`/`organization` and the page length | proven (`total` and `pageInfo` never asserted outside the skipped block) |
| PAG-02 | A request is refused before any data is read when it combines `first` and `last` ("Using both "first" and "last" parameters is discouraged."), gives `after` without `first` ("Cursor "after" requires having "first" parameter."), `before` without `last` ("Cursor "before" requires having "last" parameter."), or a `first`/`last` of zero or less ("Parameter "first" needs to be positive." / `"last"`). | all callers | code › `src/core/pagination/validate.pagination.args.ts:7-47` · `src/common/exceptions/pagination/*.ts` · test › `pagination/organization` and `pagination/user` › `Invalid pagination queries` (4 rows each) | proven (the "needs to be positive" refusals are untested) |
| PAG-03 | When neither `first` nor `last` is given a page holds 25 items; the Innovation Library caps a requested page at 100 and form responses at 50. | all callers | code › `relay.style.pagination.fn.ts:24, 107-108` · `src/library/library/library.service.ts:35, 337-348` · `src/domain/collaboration/callout-form-response/callout.form.response.service.ts:33, 344-350` · spec › `server/specs/101-innovation-library-pagination/spec.md` FR-005, FR-006 | untested |
| PAG-04 | Items come in insertion order (the sequential row id) unless the list declares its own order, in which case the row id is the tiebreak; the Innovation Library and in-app notifications are newest first. | all callers | code › `relay.style.pagination.fn.ts:87-102` · `library.service.ts:206, 238-242` · `src/platform/in-app-notification/in.app.notification.service.ts:169-177` · test › `pagination/organization` › `first: 2` without filter (the pre-existing org then org1) | proven (weakly: containment, not order) |
| PAG-05 | With `first` and `after`, the page starts right after the cursor item; the cursor must be an item of the same filtered list, otherwise "Unable to find entity with ID: <cursor>". | all callers | code › `relay.style.pagination.fn.ts:103-105, 120-149, 165-170` · test › `Pagination with cursors` (5 + 6 rows, all skipped "bug #3571") | untested (F4) |
| PAG-06 | With `last` and no `before` the engine returns the **first** `last` items of the list, not the last ones. | all callers | code › `relay.style.pagination.fn.ts:158-160, 107-108` · test › `Pagination without filter` › `first: undefined, last: 17` (passes only because 17 ≥ the whole list) | untested (see F1: the only case cannot tell first from last) |
| PAG-07 | With `last` and `before` the page is the rows whose row id lies in `[cursorRow − last, cursorRow)` of the filtered list — a window of row-id arithmetic, which under a filter or after deletions holds fewer than `last` items. | all callers | code › `relay.style.pagination.fn.ts:172-185` | untested (see F2) |
| PAG-08 | `hasPreviousPage`/`hasNextPage` say whether filtered items exist before the first / after the last item of the page; `startCursor`/`endCursor` are the ids of those items; `total` is the count of the whole filtered list. | all callers | code › `relay.style.pagination.fn.ts:190-234` · `pagination.fn.ts:17-28` · test › skipped cursor rows (`hasNextPage: false` on the last page) | untested (F4, F6) |
| PAG-09 | A filter is a set of named fields; each given value matches as a case-insensitive substring of that field, the fields are combined with OR, and an empty string matches every item. Users filter on first name, last name, display name, email; organisations on display name, nameID, contact email, domain, website. | all callers | code › `src/core/filtering/filter.fn.where.expression.ts:10-31` · `filters/userFilter.ts`, `organizationFilter.ts` · `input-types/*.ts` · test › `Pagination with filter` (6 org rows: displayName, contactEmail substring 'email@test.io' → 2, website 'org' → 5, nameID OR website → 2, three empty strings → all 6; 7 user rows: email 'admin@alkem.io' → 2 incl. `community.admin`, firstName OR email → 2, four fields → 4, empties → 12) | proven |
| PAG-19 | An item on a page is the same object the single-item query returns. | all callers | test › `pagination/user` › `query filtered user and verify data`; `pagination/organization` › `query filtered organization and verify data` | proven |
| PAG-10 | The platform user list (`usersPaginated`) is readable by every signed-in user and refused to visitors; `withTags` keeps only users whose profile has (or lacks) tags; service-profile accounts are included — unlike the unpaginated `users` query, which hides them. | registered | code › `src/domain/community/user/user.resolver.queries.ts:41-62` · `src/domain/community/user/user.service.ts:949-995` · `src/platform/platform/platform.service.authorization.ts:484-491` · test › every `pagination/user` row (as the harness admin) | proven (as the harness admin only; see F3; the refusal of a visitor is untested) |
| PAG-11 | The organisation list (`organizationsPaginated`) is readable by anyone, signed in or not, optionally narrowed to one verification status. | anonymous, registered | code › `src/domain/community/organization/organization.resolver.queries.ts:37-56` · `organization.service.ts:476-496` · test › every `pagination/organization` row (harness admin only) | proven (as the harness admin only; visitor access and the status filter are untested) |
| PAG-12 | The space list (`spacesPaginated`) is readable by anyone and holds top-level spaces only, of the requested visibilities (default: active), with no per-space read check. | anonymous, registered | code › `src/domain/space/space/space.resolver.queries.ts:43-53` · `space.service.ts:753-770` · `src/services/infrastructure/space-filter/space.filter.service.ts:13-25` | untested (F7) |
| PAG-13 | The platform-admin user and organisation lists are the same pages behind admin gates: users for the users admin and the licence manager; organisations for content-full-access, support and the licence manager. | PUA, PLM, PCFA, support | code › `src/platform-admin/admin/platform.admin.resolver.fields.ts:178-245` | untested (covered elsewhere: `platform-roles/_support/groups/*`) |
| PAG-14 | A user's own in-app notifications page newest-first by trigger time, exclude archived ones, can be narrowed by type, page with a cursor made of trigger time + id, and a visitor gets an empty page; notifications whose space the reader cannot see are dropped after the page is cut, so a page can be shorter than asked. | self | code › `src/services/api/me/me.resolver.fields.ts:54-85` · `src/platform/in-app-notification/in.app.notification.service.ts:150-325` · test › `graphql-guard/me-degradation-anonymous` (empty page) | untested here (F8) |
| PAG-15 | A role set's candidate lists are paginated: users not yet in the entry role (restricted to the parent community's members unless the caller may invite into the parent), virtual contributors likewise, and entry-role holders not yet in an elevated role (refused with "Role <role> does not require an entry role." for a role that needs no entry role). | role-set readers | code › `src/domain/access/role-set/role.set.resolver.fields.ts:125-268` · `user.service.ts:997-1071` · `virtual.contributor.lookup.service.ts:169-206` | untested here (covered by the roleset / contributor-management suites) |
| PAG-16 | The Innovation Library pages listed, publicly visible innovation packs and their templates newest-first, up to 100 per page, narrowed by a case-insensitive substring and (templates) by type; eligibility is the same as the unpaginated lists. | registered | code › `src/library/library/library.resolver.fields.ts:66-109` · `library.service.ts:183-249` · spec › `server/specs/101-innovation-library-pagination/spec.md` | untested |
| PAG-17 | The activity feed pages the caller's activity with the caller's own ordering; it needs the platform read-users right. | registered | code › `src/domain/activity-feed/activity.feed.resolver.queries.ts:24-45` · `src/platform/activity/activity.service.ts:168-197` | untested here (covered by `activity-logs/activity-feed`) |
| PAG-18 | Form responses page forward only (`first`, `after`), 1–50 per page (default 25), over the responses the viewer may read: all, only their own, or none. | callout readers | code › `callout.form.response.service.ts:344-390` · `src/common/constants/entity.field.length.constants.ts:24` | untested here (covered by `callout/form/*`) |

### B. Rights: evidence

_The evidence line as extracted. It uses the short role names of the legend below; PUA = Platform Users Admin._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `user.resolver.queries.ts:54-59` + `platform.service.authorization.ts:484-491` (READ_USERS to every registered user); `platform.admin.resolver.fields.ts:184-192, 221-237` (admin list gates incl. R-F.2/R-F.3); `organization.resolver.queries.ts:37-56` and `space.resolver.queries.ts:43-53` (no gate); `me.resolver.fields.ts:62-73` (anonymous → empty); `role.set.resolver.fields.ts:125-126, 190-192, 228-229` (READ on the role set); `library.resolver.fields.ts:66-67, 88-89` (READ on the library — the library policy itself was not read here); `activity.feed.resolver.queries.ts:35-40`; `callout.form.response.service.ts:357-370`. The legacy suite runs every row as the harness admin, so no cell is proven by it.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and the ruling it asks for. The text writes "F-1" or "finding 1" for F1 and "open question 2" for OQ2. The rule-level questions (Q-…) were added in the conversion and have no longer text._

#### Findings

- **F1 — `last` without `before` returns the first N (PAG-06).** Code: with no cursor the query is left as-is, ordered ascending, `take(last)`. Relay spec (cited in the code) and `docs/Pagination.md` ("Amount of items before the 'before' cursor"): the last N. Test: the only `last`-only rows ask for 17 of 6/12 items, so they cannot tell. Ruling: defect to fix in the new core; add a backward case to the net.
- **F2 — Backward window is row-id arithmetic (PAG-07).** `[cursorRow − last, cursorRow)` assumes contiguous row ids in the filtered set; with a filter or deleted rows a page holds fewer than `last`. Test/spec: none. Ruling: defect (same fix as 1).
- **F3 — Service-profile users leak into `usersPaginated` (PAG-10).** Code: `users` filters `serviceProfile: false`; `getPaginatedUsers` does not. Test: the user file's oracles count 12 including `notifications@alkem.io`; whether that account is a service profile on the test cluster was not checked. Spec: none. Ruling: align the two queries.
- **F4 — The cursor and pageInfo contract is unproven (PAG-05/08).** 11 cases are skipped with "bug #3571" (issue not read — cited only in tests). Nothing green asserts `startCursor`, `endCursor`, `hasNextPage`, `hasPreviousPage` or `total`. Ruling: un-skip against the current engine or rewrite; decide whether #3571 is still real.
- **F5 — "Discouraged" is a refusal (PAG-02).** The message says discouraged; the request is rejected. Ruling: rebaseline the text when it changes; not a behaviour change.
- **F6 — Empty page info (PAG-08).** With no items `startCursorRowId` is undefined and the counts run `rowId < undefined` / `> undefined`; the outcome (0 or an error) was not verified. Ruling: verify live; define `hasNextPage=false` for an empty page.
- **F7 — Unauthenticated full listings (PAG-11/12).** Organisations and active L0 spaces page with no gate and no per-row read check, while `spaces`/`exploreSpaces` apply an authoritative READ (journey JRN-64). Consistent with public abouts today; a private L0 still appears in `spacesPaginated`. Ruling: confirm that listing private spaces' existence is intended (cross-ref journey).
- **F8 — `me.notifications` pages are cut before the visibility drop (PAG-14).** Rows of unreadable spaces are removed after `take`, so a page can be short while `total` counts them; backward `hasPreviousPage` is `!!after || !!before`, not a count. Ruling: filter before paging in the new core.
- **F9 — Legacy oracles are containment-only (PAG-01/04/09).** Every green row asserts "contains X and Y, length N"; order is never pinned, and `email 'admin@alkem.io' → 2` passes only because of substring matching. The net must pin order and exact sets.

#### Open questions

- **OQ1 — Issue #3571.** Cited only by the skipped cursor cases; per the brief it was not read. Someone must say whether it is open and whether the skips still apply to the row-id engine (findings 1, 2, 4).
- **OQ2 — Service-profile accounts on the test cluster.** Whether `notifications@alkem.io` (or any of the 12) is a service profile decides whether finding 3 changes the user oracles.
- **OQ3 — `RelayStylePaginatedSpace`.** The edges/node variant is defined (`paginated.space.ts:5-12`) but no resolver returning it was found; dead type or an unread consumer?

### D. Test gaps

_For the Quality Lead (row GAPS in section 3)._

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

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column is as extracted: a finding id where a finding covers the value, blank where nobody has ticked it yet (row CONST in section 3)._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Default page size | 25 (`DEFAULT_PAGE_ITEMS`); form responses `DEFAULT_PAGE_SIZE` 25 | `relay.style.pagination.fn.ts:24`; `callout.form.response.service.ts:33` | | Product Lead (Technical Lead for the engine default) |
| Page caps | Innovation Library 100 (`MAX_LIBRARY_PAGE_SIZE`); form responses 50 (`FORM_RESPONSES_PAGE_MAX`); every other list uncapped | `library.service.ts:35`; `entity.field.length.constants.ts:24` | | Product Lead (Technical Lead for the engine default) |
| Cursor | the item's `id` (UUID); sort/cursor key `rowId` (sequential, per table) | `relay.style.pagination.fn.ts:25-26` | | Technical Lead |
| Default order | `rowId ASC`; library `DESC`; in-app notifications `triggeredAt DESC, id DESC` | `relay.style.pagination.fn.ts:70, 97-102`; `library.service.ts:206`; `in.app.notification.service.ts:171-177` | | Technical Lead |
| Backward window | `[cursorRow − last, cursorRow)` | `relay.style.pagination.fn.ts:172-185` | F-2 | Technical Lead |
| No-cursor `last` | first `last` rows | `relay.style.pagination.fn.ts:158-160` | F-1 | Technical Lead |
| Validation texts | `Using both "first" and "last" parameters is discouraged.`; `Cursor "after" requires having "first" parameter.`; `Cursor "before" requires having "last" parameter.`; `Parameter "first" needs to be positive.`; `Parameter "last" needs to be positive.` | `validate.pagination.args.ts:12-44` | F-5 | Technical Lead |
| Validation codes | `PAGINATION_PARAM_NOT_FOUND`, `PAGINATION_INPUT_OUT_OF_BOUND` | `src/common/exceptions/pagination/*.ts:6` | | Technical Lead |
| Cursor-not-found text | `Unable to find entity with ID: <cursor>` (entity-not-found) | `relay.style.pagination.fn.ts:141-146` | | Technical Lead |
| Filter semantics | `ILIKE '%value%'` per field, OR across fields; `''` matches all; displayName via profile join | `filter.fn.where.expression.ts:25-31`; `filters/*.ts` | | Technical Lead |
| User filter fields | `firstName`, `lastName`, `displayName`, `email` | `input-types/user.filter.input.ts` | | Product Lead |
| Organisation filter fields | `displayName`, `nameID`, `contactEmail`, `domain`, `website`; plus `status: OrganizationVerificationEnum` | `input-types/organization.filter.input.ts`; `organization.resolver.queries.ts:43-48` | | Product Lead |
| Space filter | `visibilities: [ACTIVE \| ARCHIVED \| DEMO \| INACTIVE]`, default `[ACTIVE]`, L0 only | `space.filter.dto.input.ts`; `space.filter.service.ts:16-18`; `space.visibility.ts` | | Product Lead |
| Page field names | `users`, `organization`, `spaces`, `inAppNotifications`, `virtualContributors`, `innovationPacks`, `templates` (+ `total`, `pageInfo`) | `src/core/pagination/paginated.*.ts`; library types | | Technical Lead |
| Platform-admin list gates | users: `PLATFORM_USERS_ADMIN` ∨ `PLATFORM_LICENSING_LISTS_READ`; organisations: `PLATFORM_CONTENT_FULL_ACCESS` ∨ `PLATFORM_SUPPORT_LISTS_READ` ∨ `PLATFORM_LICENSING_LISTS_READ` | `platform.admin.resolver.fields.ts:184-192, 221-237` | | Security Lead |
| GraphQL surface | `usersPaginated(after, before, filter, first, last, withTags)`, `organizationsPaginated(…, status)`, `spacesPaginated(…, filter)`, `platformAdmin.users/organizations`, `me.notifications`, `RoleSet.availableUsersForEntryRole/availableVirtualContributorsForEntryRole/availableUsersForElevatedRole`, `Library.innovationPacksPaginated/templatesPaginated`, `activityFeed`, `PageInfo{startCursor, endCursor, hasNextPage, hasPreviousPage}` | `schema.graphql:5662-5669, 6354-6366, 6397-6407, 6430-6442` | | Technical Lead |

### F. Where this lands in the new core

Per the rebuild briefing (`plan.md` § 1, catalogue), lists in the new core are read-time queries over the viewer's slice, so the contract above (PAG-01/02/08/09) is the public API shape to preserve while the engine is replaced. Three facts here should shape the port: (1) the `rowId` tiebreak is an implementation decision from a slow-UUID-sort finding (PAG-04) — the new core can keep a sequential key but must not expose it; (2) backward paging is broken in two ways today (PAG-06/07, F-1/F-2) and the cursor contract has no green case (F-4) — write the new net's cursor cases from this table, not from the legacy skipped block; (3) visibility is applied inside the query for some lists and after the page cut for others (PAG-12 none, PAG-14 after) — the new core should filter before cutting so `total` and page length stay truthful. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/pagination/`, 2 files, 42 cases — 31 run, 11 skipped); the specs, issues and docs listed in § Sources. Scope: the one cursor-pagination contract every paginated list shares (page size, cursors, ordering, page info, validation) and the per-list facts of the paginated queries — users, organisations, spaces, platform-admin lists, in-app notifications, role-set candidates, the Innovation Library, the activity feed, form responses. What a list contains (who is a user, which space is visible) belongs to that resource's own area; only the listing contract is here. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The fact base with every file:line is `pagination-dossier.md` beside this file.

2026-11-19 converted to the three-section layout. The status legend of the extraction was replaced by the Proof column of Appendix A and the markers in section 1; the single why was split in three without rewording; every finding, open question and gap was routed to an organisation role.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains on the row. PAG-08 now cites the technical design in `docs/Pagination.md`; PAG-18 cites the form callout spec 080 (D-15, D-16), which decided its paging and its cap.

#### Sources

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
- 2026-11-20 whys pass: `agents-hq/specs/080-form-callout-framing/spec.md` (D-15, D-16); `docs/Pagination.md` § Technical design
