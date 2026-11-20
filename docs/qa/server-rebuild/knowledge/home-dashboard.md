# Home dashboard: behaviour rules

_What the platform does today for the home dashboard and the top navigation: a person's own data under "me" (spaces and memberships with their ordering, pending invitations and applications, notification counts, chats), the dashboard data kept elsewhere (a space's activity score, the activity-view and home-space settings), how addresses are resolved, and the home page itself: what it does, why, who may, and what is still to answer. The file follows the three-section layout of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 0 · Technical Lead 6 · Quality Lead 6 · Architecture Lead 1. By state: 11 open · 2 with a suggested answer · 5 decided. Proof of the 28 rules: 12 proven by a test · 16 untested (Appendix A)._

_Whys of the 28 rules: 25 rest on a source or a product decision · none carries a draft · 3 have none, and each carries an open question (HOME-10, HOME-22, HOME-23)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a doc. "Not decided" means the behaviour exists in the code and nobody chose it.
- A marker in bold at the end of a rule points at section 3: **(open: F1)** means a question on this rule is still open, **(defect: …)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: …)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### A person's own data ("me")

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| HOME-01 | A visitor, or someone whose account was deleted, gets an empty "me": no user, zero counts, empty lists, and no error. **(open: OQ1)** | — | — | One failing self-scoped field must never null the whole `me` query, and a deleted account's bearer must be indistinguishable from presenting nothing (107 US2, server#6315 / PR #6324; GQL-04). | Spec 107 US2; server#6315, PR #6324 |
| HOME-02 | For a signed-in user everything under "me" is about that person only: nothing selects another person and no platform role widens it. | — | — | Admin reads of other people go through `lookup` / `platformAdmin`, never `me` (server CLAUDE.md API conventions). | Server API conventions (server CLAUDE.md) |
| HOME-03 | "My memberships" are the spaces where the person is a member, lead or admin, at every level, plus the parent of any subspace they administer. Broken or half-built spaces are left out. | — | — | Membership is credential-based (`docs/credential-based-authorization.md`); orphaned or half-built spaces must not break the home page (code comment `:223-226`). | docs/credential-based-authorization.md |
| HOME-04 | The tree view nests memberships as top-level spaces with their subspaces, and a limit caps the number of top-level spaces. The flat view lists every membership. A subspace whose parent the person is not a member of shows only in the flat view. | — | — | Hierarchical shape "with just the needed data" for the dashboard tree (`c9caef271`); the client's dashboard asks for `limit: 0` and the home redirect for `limit: 2`. | Commit c9caef271; Product, 2026-11-20 (F1, OQ6): stays as today; showing a subspace-only membership in the tree is a wish on the product issues list |
| HOME-05 | Pending space invitations and applications are listed with the key facts of the space they are for. Space rows and organisation rows are kept in separate lists. | The invitee needs enough to decide without reading the space. | — | The top-bar query 500'd on the first organisation row before the partition (062 FR-023, D-8). | Spec 062 FR-023, D-8; Product, 2026-11-20 (business why) |
| HOME-06 | Each pending count equals the length of the matching list read with the same filter. | One badge, one list (024 FR-015: "a badge equal to the total number of pending applications plus invitations"). | — | — | Spec 024 FR-015 |
| HOME-07 | A pending row leaves the person's lists when it is withdrawn or deleted, when the person's account is deleted, and when the inviting organisation is deleted. | — | — | Deletion flows remove every pending row (RS-27, RS-42; 062 US7-AS5). | Spec 062 US7-AS5 |
| HOME-08 | Without a state filter, the pending lists and their counts also include finished rows (accepted, approved, rejected, archived). With a filter, only rows in the named states come back. | Product, 2026-11-20: the client's state filter decides what counts as pending; the server does not cut the list (F6). | — | — (024 FR-014/FR-018 speak of "pending" rows; the server leaves the cut to the caller) | Product, 2026-11-20 (F6): stays as today, the client's state filter is the contract; spec 024 is amended |
| HOME-09 | The invitation lists cover everyone the person manages: themselves, the organisations they own or administer, and the virtual contributors on those accounts. Applications are the person's own only. | An organisation acts through its managers; the admins must be able to accept on its behalf from the same place (062 / RS-42; `organization.manager.credentials.ts:3-7`). | — | — | Spec 062 |
| HOME-10 | If one pending row can no longer be loaded, the whole list fails. Notifications behave differently: the bad row is hidden and the rest is shown. **(open: F4)** | — | — | — | Not decided: exists in the code |
| HOME-11 | "Recent spaces" returns at most the number asked for (20 by default), one per space or subspace the person acted in most recently, direct memberships only. It can return fewer than asked even when more qualify. **(open: F2)** | Recent Spaces = the member's own latest activity (024 clarification, FR-005). | — | VC memberships excluded (`me.service.ts:395-396`); the 2× pre-cut is a known workaround (server#3626, "magic number, should not be needed"). | Spec 024 FR-005; server#3626 |
| HOME-12 | The server puts no time limit on recent spaces. The 30-day window and the cap of four in "Last Active In" are applied by the web client. **(open: F8, OQ4)** | 024 FR-004/FR-005 ("Spaces the member has personally been active in within the last 30 days"). | — | The contract chose to reuse `mySpaces.latestActivity` rather than add a date filter (`contracts/server-graphql.md:76`). | Spec 024 FR-004/FR-005 and its server contract |
| HOME-13 | The notifications page hides rows about a space the person can no longer read, but the unread badge still counts them. Archived rows appear in neither. | — | — | Defence in depth after one unreadable row blanked the whole panel (server#6699); the count residual was accepted in that fix. | server#6699; Product, 2026-11-20 (F3): the badge keeps counting every unread row, as today |
| HOME-14 | "My conversations" is every chat the person is a member of now, direct and group, and nothing else. The list is not paged and has no fixed order. | — | — | Membership is the only credential for a conversation (COM-54; 027 FR-001, 040 FR-004/008); categorisation is the client's. | Spec 027 FR-001; server spec 040 FR-004/008 |

### Dashboard data kept elsewhere

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| HOME-15 | A space's activity score is the number of visible activity entries in the space over the last 7 days, by anyone, without whiteboard edits. Only someone who may read the space can read it; for anyone else it gives an error instead of 0. **(defect in part: F7)** **(open: OQ4, OQ5)** | Ranks "Spaces I Lead & Administer" and "Spaces I Host" (024 FR-006/007/008). | — | "activity volume for private Spaces would leak to anyone who can merely enumerate Space IDs" (loader comment; server#6326). | Spec 024 FR-006/007/008; ADR `agents-hq/docs/decisions/0001-non-activity-home-contract.md`; server#6326 |
| HOME-16 | Each user has an "activity view" preference for the dashboard, on by default and changed only by the user. **(open: OQ4)** | The home view choice must follow the account across devices and be countable for adoption (024 FR-022…FR-026, SC-003/004). | — | Null-safe update so a client cannot write null into a non-null column (code comment). | Spec 024 FR-022…FR-026; ADR 0001 (non-activity home contract) |
| HOME-17 | The home page reads the person's pinned home space and its auto-redirect switch, to send them there instead of the dashboard. The client lets them pin only a top-level space; the server accepts any space they hold a role in. **(open: F9)** | A member lands on a space of their own choosing (server#5758); the pin is "restricted to top-level (L0) Spaces, consistent with the existing home-Space picker" (024 FR-004). | — | — | server#5758; spec 024 FR-004 |
| HOME-18 | "Spaces with most activity" and "Explore Spaces" come from the explore ranking: public spaces plus the private ones the person is a member of, top-level and first-level only, ranked by 7-day activity, without spaces that had none. **(open: OQ5)** | Platform-wide discovery that must not leak private spaces (024 FR-006, FR-020; server#6326). | — | Reuses the already-shipped `exploreSpaces` ranking rather than a new resolver, made caller-dependent and widened to L0 + L1 (ADR 0001, decision 1 and scope decision). | Spec 024 FR-006, FR-020; ADR 0001 (non-activity home contract); server#6326 |

### Resolving addresses

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| HOME-20 | Resolving an address never fails: the answer is resolved, not found, or forbidden. When it is not resolved, the answer carries the closest page the person may see (the home page by default) and no partial space data. | — | — | The client needs one call to decide between page, not-found view and restricted view (`e7204814f` url resolver reimplementation; `CrdNotFoundView` / `CrdRestrictedRoute` navigate home). | Commit e7204814f |
| HOME-21 | The root address and /home resolve to the home page, /user/‹name› and /organization/‹name› to that user or organisation, and the fixed menu and sign-in pages each to their own page. | — | — | Reserved top-level routes are the client's static pages; the user menu links "Dashboard" to `/home` and "Profile" to `/user/<nameID>` (home-menus plan § 2–3). | Not decided: exists in the code (home-menus test plan) |
| HOME-22 | Six reserved words (about, profile, contact, landing, identity, flows) are recognised but cannot be resolved: an address under them is not found. **(open: F5)** | — | — | — (the enum reserves them "so they cannot be used as a space nameID"; `landing` "redirects to Welcome site", `identity` "reserved") | Not decided: exists in the code |
| HOME-23 | Any other first word in an address is treated as a space name. A mistyped address is not found, with the home page as the fallback. **(open: Q-HOME-23)** | — | — | — ("Assumption is that everything else is a Space!") | Not decided: exists in the code |
| HOME-24 | A space address resolves only for someone who may see the space's About. Otherwise it is forbidden, and the fallback is the home page for a top-level space or the readable parent for a subspace. | Private spaces must not be confirmed to strangers beyond what About already shows; the parent is what the person may see. | — | — | Product, 2026-11-20 |

### The home page and top navigation

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| HOME-30 | A signed-in member's home page shows their spaces, top-level and subspaces alike, as cards that open the space, under "Recent Spaces" in the activity view. | The dashboard is where a member reaches their spaces in two clicks (024 SC-001; memberships plan § 7). | — | — | Spec 024 SC-001 |
| HOME-31 | The top bar offers a tools menu and a user menu. The left sidebar offers Invitations, My Latest Activity, Latest Activity In My Spaces, Tips & Tricks, My Account and Create my own Space. Each opens its dialog or page. | Home-page navigation contract (home-menus plan § 1–3; support-navigation plan). | — | — | Not decided: exists in the code (home-menus and support-navigation test plans) |
| HOME-32 | The "Activity View" switch on the dashboard sidebar changes the main content between the activity feed and the spaces view. The choice is saved to the account. | 024 FR-022/023 — the control stays on the sidebar; the value lives in the user's settings. | — | — | Spec 024 FR-022/023 |
| HOME-33 | In the spaces view a member sees, in order: Last Active In, Spaces with Most Activity, Spaces I Lead & Administer and Spaces I Host, four items each with "show more". A section with no items is hidden, except the first. | 024 FR-001…FR-013, edge cases `:106-115`. | — | — | Spec 024 FR-001…FR-013 |
| HOME-34 | A signed-in user with no spaces sees their pending applications and invitations, or a welcome block when nothing is pending, and always an "Explore Spaces" block of up to eight cards. | A new user must always see a next step (024 FR-014…FR-021, SC-002). | — | — | Spec 024 FR-014…FR-021, SC-002 |

Numbering note: HOME-19 and HOME-25…29 are intentionally unused (section gaps).

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W11 follow the order of the former who-may table. "Platform roles" includes the Platform License Manager unless a footnote says otherwise. Product has not reviewed these cells yet. Evidence is in Appendix B._

### Own dashboard data

| ID | Action | Space admin | Space member | Registered user | Visitor | Platform roles | Account or organisation admin |
|---|---|---|---|---|---|---|---|
| W1 | Read own dashboard data under "me" (memberships, recent spaces, pending rows, counts, chats) | Y | Y | Y | –¹ | Y² | Y |
| W2 | See a space in "my memberships" | Y | Y | N | N | N³ | N³ |
| W3 | See a parent space in "my memberships" as admin of one of its subspaces | Y⁴ | N | N | N | – | – |
| W4 | See an organisation's space invitations in one's own list | – | – | N⁵ | N | – | Y⁶ |
| W5 | See a virtual contributor's invitations in one's own list | – | – | N | N | – | Y⁷ |
| W7 | Set one's own activity-view preference or pin a home space | Y | Y | Y | N | Y | Y |
| W8 | Change another user's dashboard settings | N | N | N | N | N⁸ | N |

¹ A visitor gets empty values and no error. ² Their own data only: no role widens "me". ³ Unless the role holder also holds a space role there. ⁴ Through the subspace-admin standing on the parent. ⁵ An associate of the organisation does not see them. ⁶ The organisation's owner or admin. ⁷ For a virtual contributor on their own account or on the account of an organisation they manage. ⁸ The platform users admin reads settings but does not write them.

### Spaces and addresses

| ID | Action | Space admin | Space member | Registered user | Visitor | Platform roles | Account or organisation admin |
|---|---|---|---|---|---|---|---|
| W6 | Read a space's activity score | Y | Y | Y⁹ | Y⁹ | Y¹⁰ | Y¹¹ |
| W9 | Resolve an address | Y | Y | Y | Y | Y | Y |
| W10 | Resolve a private space's address (resolved, not forbidden) | Y | Y | N | N | Y¹² | Y¹¹ |
| W11 | Resolve a user's or an organisation's address to their id | Y | Y | Y | Y | Y | Y |

⁹ On public spaces only. ¹⁰ Where the role may read the space: platform spaces reader, Platform Resource Admin, Platform Content Full Access; the Platform License Manager on top-level spaces. ¹¹ On their own spaces. ¹² Where the role may see the space's About: Platform Content Full Access, platform spaces reader, Platform Resource Admin; the Platform License Manager on top-level spaces; the other platform roles no.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding (F) and open question (OQ), with code lines and data, is in Appendix C under the same id. A question "Why does this rule exist?" (Q-…) means the rule holds but no source states its reason._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).


### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 6 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Me | defect | "Recent spaces" can return fewer spaces than asked, because the activity is cut at twice the limit before the membership filter (server#3626). Fix it (fetch by membership, then cut), or accept it? | Technical Lead | — | open |
| F4 | Me | defect | One pending invitation or application that cannot be loaded fails the whole list. Hide and log the bad row, as notifications do, or keep the failure? And can such rows still exist after the cascade fixes? | Technical Lead | — | open |
| F5 | Addresses | decision | Six reserved words (about, profile, contact, landing, identity, flows) cannot be resolved. Are they live routes in the client, so the resolver must answer them, or only reserved names? | Technical Lead (Quality Lead checks the client first, OQ3) | — | open |
| F7 | Other data | defect | A space's activity score gives an error for a space the caller cannot read, which blanks the object around it. Its 7-day window is fixed, while the explore ranking takes the window from the caller. The test that covered it is missing. | Technical Lead (Quality Lead writes the missing test, OQ5) | Return 0 or nothing for unreadable spaces, fix the window in one place, and write the missing test. | suggested |
| F9 | Other data | decision | The client lets a person pin only a top-level space as home (spec 024 FR-004); the server accepts any space the person holds a role in. Enforce top-level on the server, or record the client as the gate? | Technical Lead | — | open |
| Q-HOME-23 | Addresses | decision | Why does this rule exist? No source states the reason. Any unknown first word in an address is treated as a space name (the code only says "Assumption is that everything else is a Space!"). | Technical Lead (Architecture Lead writes the grammar of the new resolver) | — | open |


### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 6 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Me | check | Does a guest (a named visitor) get a "me"? Whether the guest counts as "no actor" was not determined. Check on a running stack. | Quality Lead | — | open |
| OQ2 | Me | check | Which states does the live client send to the pending lists? The local clone is stale. This decides whether F6 is visible to users. | Quality Lead | — | open |
| OQ3 | Addresses | check | Is /profile routed by the current client? Only a constant was found in a stale clone. This decides how serious F5 is. | Quality Lead | — | open |
| OQ4 | Other data | check | The decision record 0001 (non-activity home contract) is cited as the authoritative reason and was not read; the whys of HOME-12, HOME-15 and HOME-16 come from the spec and the pull request. Read it and confirm them. | Quality Lead | Read: `agents-hq/docs/decisions/0001-non-activity-home-contract.md` (accepted 2026-07-29). It confirms HOME-15 (`activityScore`, 7 days, all actors, no whiteboard edits, orders Lead/Admin and Host), HOME-16 (`dashboard.activityView`, default on) and HOME-18 (actor-scoped `exploreSpaces`, L0 + L1). It says nothing on the 30-day window of HOME-12, which stays with the spec's contract. It leaves "the exact `activityScore` READ-auth exclusion set" as a follow-up, which is F7. | suggested |
| OQ5 | Other data | test | The test file that covered the activity score and the explore ranking (dashboard-activity-authorization) is on no branch. Find it or rewrite it: it is the proof for HOME-15 and HOME-18. | Quality Lead | — | open |
| GAPS | All | test | 16 rules have no test, and Appendix D lists more untested clauses and behaviours that were never pinned down. Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Addresses | decision | Six reserved words (about, profile, contact, landing, identity, flows) cannot be resolved. Are they live routes in the client, so the resolver must answer them, or only reserved names? | Technical Lead (Quality Lead checks the client first, OQ3) | — | open |
| F7 | Other data | defect | A space's activity score gives an error for a space the caller cannot read, which blanks the object around it. Its 7-day window is fixed, while the explore ranking takes the window from the caller. The test that covered it is missing. | Technical Lead (Quality Lead writes the missing test, OQ5) | Return 0 or nothing for unreadable spaces, fix the window in one place, and write the missing test. | suggested |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F8 | Me | contract | The 30-day "Last Active In" window exists only in the client. In the new core, does the server own the window, so every API consumer gets the same list, or the client? | Architecture Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Me | decision | Without a filter, the pending lists and their counts include finished rows, while spec 024 counts "pending" rows. Should the server return only open rows by default, or is the client's filter the contract? What does the count mean in the new core's single request list? | Product Lead (Architecture Lead for the new list) | Product, 2026-11-20: without a filter the lists include finished rows, as today, and the client's filter is the contract. The Architecture Lead defines the count of the new single request list on that basis. | open |
| Q-HOME-23 | Addresses | decision | Why does this rule exist? No source states the reason. Any unknown first word in an address is treated as a space name (the code only says "Assumption is that everything else is a Space!"). | Technical Lead (Architecture Lead writes the grammar of the new resolver) | — | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| F3 | Stays as today: the unread badge counts every unread notification, also those about a space the person can no longer read; the badge means "something happened" (residual accepted in server#6699). | Product, 2026-11-20 | HOME-13 |
| F6 | Stays as today: without a state filter the pending lists and counts include finished rows; the client's filter is the contract. The Technical Lead amends spec 024 to match. | Product, 2026-11-20 | HOME-08 |
| CONST | Product rules on the recent-spaces default, the membership ordering, the notification states, the activity-score window, the dashboard and home-space defaults and the client section numbers, ticked "yes" in Appendix E. The rest goes to the Technical Lead. | Product, 2026-11-20 | Appendix E |
| F1 | Stays as today: a Subspace whose parent the person is not a member of shows only in the flat list, not in the dashboard tree. Showing it in the tree as well is a wish on the product issues list. | Product, 2026-11-20 | HOME-04; PRODUCT-ISSUES F1 |
| OQ6 | Same decision as F1: stays as today, with the tree view of subspace-only memberships as a wish. | Product, 2026-11-20 | HOME-04; PRODUCT-ISSUES F1 |


## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| HOME-01 | A request with no resolved actor (anonymous, or a still-valid bearer of a deleted account) gets `me` with every value empty — id `me-`, no user, zero counts, empty lists, an empty notifications page with no cursors, an empty conversation list — with HTTP 200 and no error. | anonymous | code › `src/services/api/me/me.resolver.fields.ts:78-88, 110-116, 160-166, 186-192, 213-219, 240-246, 271-277, 302-308` · `me.conversations.resolver.fields.ts:28-34` · test › `graphql-guard/me-degradation-anonymous` › `SRA-G1`, `SRA-G2`, `SRA-G3`, `SRA-R1`, `SRA-N2` | proven |
| HOME-02 | For a signed-in user `me.id` is `me-<their user id>` and `me.user` is their own record; every `me` field is about the caller only — no argument selects another person and no platform role widens it. | registered | code › `me.resolver.fields.ts:123-144` (every field reads `@CurrentActor()`, no privilege check) · test › `me-degradation-anonymous` › `SRA-G4 - authenticated behaviour is unchanged` | proven (the no-widening clause is a code reading) |
| HOME-03 | "My memberships" are the spaces in which the caller holds a member, lead or admin credential — plus the parent space of any subspace they administer (the derived subspace-admin credential) — at every level; a subspace with no parent or a space with no collaboration is left out; a caller with no such credential gets an empty list. | registered, subspace admin | code › `me.service.ts:204-245` · `src/services/api/roles/util/group.credentials.by.entity.ts:28-35` · test › `activity-logs/activity-feed` › `AF-01` precondition (`spaceMembershipsFlat = []` for a user with no memberships) | untested (the empty-list clause is proven as a precondition) |
| HOME-04 | The hierarchical view nests the memberships as top-level spaces with their subspaces and sub-subspaces; `limit` caps the number of top-level spaces after ordering and 0 or omitted means all; the flat view lists every membership at every level as its own item. A subspace membership whose parent is not itself one of the caller's memberships is absent from the hierarchical view and present only in the flat one. | registered | code › `me.service.ts:247-341` (`if (limit) splice`, children attached by `parentSpace.id`) · client `DashboardWithMemberships.graphql`, `HomeRedirectData.graphql` | untested (see F1) |
| HOME-05 | A person's pending space invitations and applications are listed with the row itself and the key facts of the space they are for (space id, level, About, community guidelines); the lists are partitioned — space rows on `communityInvitations`/`communityApplications`, organisation rows on `organizationInvitations`/`organizationApplications` — each exact (RS-30). | registered | code › `me.service.ts:48-124, 132-202` · `dto/me.space.pending.membership.info.ts:76-96` · test › `roleset/invitations/invitation-contributors` › second-invitation case (`state: 'invited'`, `spacePendingMembershipInfo.id`); `roleset/application/application` › `should create application`, `should create application on subspace`, `should return correct membershipUser applications`; `roleset/associates/me-pending-partition` › `US7-AS1` | proven |
| HOME-06 | Each pending count equals the length of the matching list read with the same state filter. | registered | code › `me.service.ts:37-46, 160-167` · test › `me-pending-partition` › `US7-AS1` (`communityInvitationsCount = 1`, `organizationInvitationsCount = 1`); client-web › `organization-user-associates/us7-pending-lists-integrity` (`count === list.length`) | proven |
| HOME-07 | A pending row leaves the person's lists when the invitation or application is withdrawn or deleted, when the person's account is deleted, and when the inviting organisation is deleted; the read never dangles. | registered, admins | code › `roles.service.ts:106-111` (partition above the repository "so the deletion flows still see and remove every pending row") · test › `me-pending-partition` › `US7-AS1` (rows gone after `deleteUser`), `US7-AS5 (organization side)`; `organization-associate-invitation` › `US1-AS7` | proven |
| HOME-08 | Without a state filter the pending lists — and therefore the counts — include finalized rows (accepted, approved, rejected, archived); with a filter only rows whose lifecycle state is named are returned, and an invitation that has no lifecycle never matches a filter. | registered | code › `src/domain/access/invitation/invitation.service.ts:221-252` · `src/domain/access/application/application.service.ts:167-200` · test › `roleset/application/application` › `should return correct membershipUser applications` filters `state == 'new'` client-side before matching (finalized rows present, not asserted) | untested (see F6: the one case filters on its own side and does not assert the finished rows) |
| HOME-09 | The invitation lists cover every actor the person manages: themselves, every organisation they own or administer, and every virtual contributor on their own account or on those organisations' accounts — so an organisation's admin sees the organisation's space invitations in their own list. Applications are the person's own only. | org admin / owner, VC owner | code › `roles.service.ts` `getAllInvitationsForUser` · `src/domain/actor/actor-lookup/actor.lookup.service.ts:651-696` · `src/common/constants/authorization/organization.manager.credentials.ts:8-12` · test › `roleset/invitations/invitation-organization` › `GATE 0` (`:195-210`), opting-out case (`:460-475`); `invitation-organization-subspace` (`:151-160`) | proven (the virtual-contributor clause is untested) |
| HOME-10 | If one pending row's role set or space can no longer be loaded, the whole list field fails ("Community not found for invitation …", "Missing entities on Space loaded for Invitation …", "RoleSet not found for organization invitation") — unlike the notifications page, which hides the bad row and keeps the rest. | registered | code › `me.service.ts:58-73, 96-111, 140-146, 184-190` vs `in.app.notification.service.ts:194-247` | untested (see F4) |
| HOME-11 | "Recent spaces" (ACT-70) returns at most `limit` entries (20 by default), one per collaboration the caller acted in most recently — a subspace is its own entry, not its parent's — skipping collaborations that no longer exist and spaces the caller is not a direct member of; because the raw activity list is cut at twice the limit before the membership filter, fewer than `limit` entries can come back even when more qualifying spaces exist. | registered | code › `me.service.ts:366-408` · `src/platform/activity/activity.service.ts:320-389` · `src/services/api/activity-log/activity.log.service.ts` (space of the collaboration) · client `RecentSpaces.graphql` | untested (see F2) |
| HOME-12 | The server puts no time window on recent spaces; the "Last Active In" section's 30-day cut and its cap of four is applied by the client from each entry's `latestActivity.createdDate`. | registered | code › `activity.service.ts:320-341` (no date predicate) · spec › `agents-hq/specs/024-non-activity-home/spec.md:126-127`; `contracts/client-graphql.md:10-13` | untested |
| HOME-13 | The notifications page hides rows about a space the receiver can no longer read (NTF-81), but the unread badge counts every unread row including the hidden ones; archived rows appear in neither. | receiver | code › `me.resolver.fields.ts:90-121` ("Always return the total unread count, regardless of any filtering") · `in.app.notification.service.ts:134-149, 194-247` · issue › server#6699 ("`total` and `notificationsUnreadCount` still count the hidden items") | untested (see F3) |
| HOME-14 | "My conversations" is every conversation (direct and group) the caller is currently a member of, and nothing else; leaving, being removed, or the group emptying takes it out of the list; the list is not paged and carries no ordering guarantee. | registered | code › `me.conversations.resolver.fields.ts:19-43` · `src/domain/communication/messaging/messaging.service.ts:798-815` · test › `communications/conversations/conversations` › `should include both creator and member in DIRECT conversation members`, `should leave a GROUP conversation`, `should remove a member from a GROUP conversation`; `delete-conversation` › `should remove GROUP conversation when all members leave` | proven (ordering: none — see Gaps) |
| HOME-15 | A space's `activityScore` is the number of visible activity entries on the space's own collaboration in the last 7 days by any actor, excluding whiteboard-content edits; it is readable only by someone who may read the space — a space the caller cannot read makes the field error rather than return 0. | all readers | code › `src/domain/space/space/space.resolver.fields.ts:54-68` · `src/core/dataloader/creators/loader.creators/space/space.activity-score.loader.creator.ts:21-24, 86-130` · spec › `024-non-activity-home/contracts/server-graphql.md:34-45` | untested (see F7) |
| HOME-16 | Each user carries an "activity view" dashboard preference, on by default; it is changed only through the user's own settings, an explicit null leaves it unchanged, and a settings row missing the block reads as the default. | self | code › `src/domain/community/user-settings/user.settings.entity.ts:65` · `user.settings.service.ts:42, 370-380` · `schema.graphql:7962-7967` · spec › `024 spec.md:150-154` · CM-22 (defaults) | untested |
| HOME-17 | The pinned home space (CM-20) and its auto-redirect flag are what the home page reads to send the person to their home space instead of the dashboard; the client restricts the pin to a top-level space, while the server accepts any space the person holds a credential in. | self | code › `user.settings.service.ts:347-368` · `user.settings.home.space.validation.service.ts:21-39` (credential check only — via CM-20) · client `HomeRedirectData.graphql` · spec › `024 spec.md:126, 134` | untested (see F9) |
| HOME-18 | "Spaces with most activity" and the no-Spaces "Explore Spaces" block come from the explore ranking (JRN-64): public spaces plus the private ones the person is a member of, top-level and first-level only, ranked by visible 7-day activity, zero-activity spaces excluded. | all readers | code › `src/domain/space/space/space.service.ts:865-961` (via JRN-64) · spec › `024 spec.md:128, 145` | untested |
| HOME-20 | Resolving an address never fails the query: the result's state is RESOLVED, NOT_FOUND (unknown or malformed) or FORBIDDEN (exists but unreadable), and in a failed state the result carries a closest readable ancestor — the home page by default, the resolved space or virtual contributor when one was reached — and no partial space data. | all | code › `src/services/api/url-resolver/url.resolver.service.ts:98-191` · `dto/url.resolver.result.state.ts` · test › `journey/conversion/convert-L1-to-L0-url-resolver` › `the new L0 url resolves to the promoted space` (RESOLVED), `the old L1 url no longer resolves after promotion` (NOT_FOUND) | proven (FORBIDDEN and the ancestor clauses are untested) |
| HOME-21 | The root address and `/home` resolve to the home page; `/user/<nameID>` to that user's id and `/organization/<nameID>` to that organisation's id (a missing or unknown name is NOT_FOUND, with no read check on the ids); the tools-menu and identity targets — `/spaces`, `/contributors`, `/forum`, `/innovation-library`, `/innovation-packs`, `/docs`, `/create-space`, `/admin`, `/login`, `/logout`, `/registration`, `/sign_up`, `/verify`, `/recovery`, `/required`, `/restricted`, `/error` — each resolve to their own page type without any lookup. | all | code › `url.resolver.service.ts:54-68, 193-325` · `src/common/enums/url.path.base.ts` · test › client-web `home-menus` › `Tools Menu Navigation`, `User Menu Navigation`, `Left Sidebar Menu Navigation` (hrefs `/home`, `/user/<nameID>`, `/spaces`, `/forum`, `/innovation-library`, `/contributors`; the pages load) | proven for the walked targets (UI); the id and NOT_FOUND clauses are untested |
| HOME-22 | Six reserved top-level words — `about`, `profile`, `contact`, `landing`, `identity`, `flows` — are recognised as reserved but cannot be resolved: an address under them is NOT_FOUND ("Unknown base route"). | all | code › `url.path.base.ts` (comments) · `url.resolver.service.ts:326-333` | untested (see F5) |
| HOME-23 | Any other first path element is treated as a space name: a mistyped address is NOT_FOUND with the home page as ancestor; `/<space>/challenges/<sub>/opportunities/<subsub>/…` is the only space grammar. | all | code › `url.resolver.service.ts:87-95, 545-630` · `url.resolver.utils.ts:28-30` | untested |
| HOME-24 | A space address resolves only for someone who may read-about the space; otherwise the state is FORBIDDEN — for a top-level space the ancestor is the home page, for a subspace it is the readable parent space. | all | code › `url.resolver.service.ts:1010-1030` (`READ_ABOUT`), `:133-191` | untested |
| HOME-30 | A signed-in member's home page (`/home`) shows their spaces — top-level and subspace memberships alike — as cards that open the space, under "Recent Spaces" in the activity view. | registered | test › client-web `memberships/view-home-dashboard-authenticated-user` › `View Home Dashboard - Authenticated User`; `view-home-dashboard-multiple-memberships` › `View Home Dashboard - Multiple Memberships` · spec › `client-web/src/functional-e2e/plans/memberships-test-plan.md` § 7 | proven |
| HOME-31 | The top bar offers a tools menu (Template Library, Alkemio Forum, Explore Spaces, Find contributors, Powered by Alkemio) and a user menu (Dashboard, Profile, account settings, log out); the left sidebar offers Invitations ("My Pending Memberships"), My Latest Activity, Latest Activity In My Spaces, Tips & Tricks, My Account and Create my own Space — each opening its dialog or page. | registered | test › client-web `home-menus` › all 3 cases; `support-navigation` › `Complete Support Journey…` and 3 additional · spec › `client-web/src/functional-e2e/home-menus-test-plan.md` | proven |
| HOME-32 | The "Activity View" toggle on the dashboard sidebar switches the main content between the activity feed view ("Latest Activity in my Spaces", with the Recent Spaces row) and the non-activity spaces view; the choice is saved to the account (HOME-16). | registered | test › client-web `home-menus` › `Left Sidebar Menu Navigation` (toggle → heading "Latest Activity in my Spaces") · spec › `024 spec.md:150-151` | proven for the toggle; persistence across sessions untested |
| HOME-33 | In the non-activity view a member with spaces sees, in order, Last Active In (pinned home space first or an empty pin slot, then up to four recently-active spaces), Spaces with Most Activity (up to four, platform-wide), Spaces I Lead & Administer and Spaces I Host (four visible, "show more" opening the memberships panel filtered to that section); a section with no items does not render except the first; sections are expanded by default, collapse for the visit only, include top-level and first-level spaces, and the same space may appear in several. | registered | spec › `agents-hq/specs/024-non-activity-home/spec.md:123-135` · client-web plan `memberships-test-plan.md` § 7 ("skip (to be redesigned)") | untested |
| HOME-34 | A signed-in user with no spaces sees either one "Pending Applications & Invitations" section (badge = applications + invitations; applications show the space and "Pending review", invitations show inviter and space with Accept / Decline that remove the item and lower the badge) or, with nothing pending, a welcome block with links to the welcome space and the documentation; in both cases an "Explore Spaces" block of up to eight cards, welcome space first, and an "Explore all Spaces" button. | registered | spec › `024 spec.md:139-146` · client-web plan `memberships-test-plan.md` § 7.3 (❌ not written) | untested |

### B. Rights: evidence

Evidence: `me.resolver.fields.ts` (every field `@CurrentActor()`, no `grantAccessOrFail`); `group.credentials.by.entity.ts:28-35`; `actor.lookup.service.ts:651-696`; `organization.manager.credentials.ts:8-12`; `space.activity-score.loader.creator.ts:109-130` (`checkParentPrivilege: READ`); `url.resolver.service.ts:214-227, 236-250` (no read check on user/org), `:1026-1030` (`READ_ABOUT`); access matrix `user` (`access-matrix.md:1174-1205`, `user-self` D on update; `platform-users-admin` read-user-settings only), `user-settings` (`:1207`), `space` (`:1477`, READ / READ_ABOUT columns); CM-20/22. GLOBAL_ADMIN-style catch-alls are retired (027 Slice B); the legacy `me` cases read as the persona itself, which is the only way `me` can be read.

The legend of the former who-may table, kept for the record (section 2 spells the roles out):

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. "F-7 there" and ACT ids point at `activity-logs.md`._

#### Findings

- **F1 — Hierarchical memberships drop subspace memberships whose parent the person is not in (HOME-04).** Code: children are attached only under a top-level space that is itself in the caller's list (`me.service.ts:288-341`); the flat list has the row. Test: none (both walks seed the parent membership too). Spec: none. The client's dashboard tree and the home redirect read the hierarchical view. Ruling: is an L1-only member meant to see that space on the dashboard tree? If yes, defect; if no, record the rule and say why. **Product, 2026-11-20:** stays as today; showing it in the tree is a wish on the product issues list.
- **F2 — Recent spaces can return fewer than asked (HOME-11).** Code: raw activity is cut at `limit × 2` before the membership filter — the code's own TODO (server#3626, "magic number, should not be needed"; the issue's `RecentJourneys` AC is still unticked). Test: none. Spec: 024 relies on this list for Section 1. Ruling: fix the overfetch/underfetch (fetch by membership, then cut) or accept.
- **F3 — Unread badge counts rows the person cannot see (HOME-13).** Code: raw count vs filtered page. Test: SRA cases assert shape only. Spec: server#6699 records the residual as accepted. Ruling: keep (badge = "something happened") or align (badge = visible unread) — the new core computes counts at read and needs one answer. **Product, 2026-11-20:** keep: the badge means "something happened", as today.
- **F4 — One unresolvable pending row fails the whole pending list (HOME-10).** Code: `EntityNotFoundException` thrown inside the loop. Test: none. Spec: none. Same failure shape server#6699 fixed for notifications. Ruling: hide-and-log the bad row (as notifications do) or keep the hard failure; also whether such rows can exist after the cascade fixes (W4 register has no row for orphan invitations — check).
- **F5 — Six reserved route words cannot be resolved (HOME-22).** Code: `UrlPathBase` lists `about, profile, contact, landing, identity, flows`; `resolveBaseRoute` has no case for them → NOT_FOUND "Unknown base route". Client (stale clone): `TopLevelRoutePath.Profile` exists; no consumer found. Test: none. Ruling: are these routes live in the client (then the resolver must answer them) or only name reservations (then record that)?
- **F6 — Pending lists include finalized rows unless the caller filters (HOME-08).** Code: no state predicate without `states`. Test: `application` › "should return correct membershipUser applications" filters `state == 'new'` itself, which only works because finalized rows are present. Spec: 024 FR-014/015/018 count "pending" rows. Ruling: should the server default to open rows (the badge then matches the spec without a client filter), or is the client's `states` argument the contract? Also decide the count's meaning for the `membership_request` list. **Product, 2026-11-20:** stays as today; the client's filter is the contract and spec 024 is amended.
- **F7 — `activityScore` on an unreadable space errors the field (HOME-15).** Code: the loader returns a `ForbiddenAuthorizationPolicyException` for a denied key; `activityScore` is `Int!`, so the error nulls the parent object — the same shape as #6699. Also the 7-day window is fixed in the loader while `exploreSpaces` takes a caller-supplied `daysOld` ("that alignment is the caller's, not enforced here"). Test: helpers exist (`visual.request.params.ts:128-170`), no spec imports them; the activity-logs plan cites an untracked `dashboard-activity-authorization.it-spec.ts` that is on no branch. Ruling: return 0/null for unreadable spaces, and fix the window to the registry; write the missing spec.
- **F8 — The 30-day "Last Active In" window exists only in the client (HOME-12).** Code: no date predicate. Spec: 024 FR-005 states the window; the contract deliberately left it client-side. Test: none. Ruling: in the new core, does the server own the window (so API consumers get the same list) or the client?
- **F9 — Home-space pin: client L0-only, server any credentialed space (HOME-17).** Code: `user.settings.home.space.validation.service.ts` checks the credential only (CM-20). Spec: 024 FR-004 restricts the pin to L0 "consistent with the existing home-Space picker". Test: none. Ruling: enforce L0 on the server or record the client as the gate.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Does a guest actor get a `me`?** A guest (`x-guest-name`, GQL-05) carries `GLOBAL_GUEST`; whether its `actorID` is empty (→ HOME-01 empty values) or set (→ user lookup fails) was not determined. Check on a running stack.
- **OQ2 — What `states` does the live client send** to `communityInvitations` / `communityApplications` and the organisation lists? The local `agents-hq/client-web` clone is at `7a37d4c4b` and stale; `MyMemberships.graphql` was not opened. Decides whether F6 is live-visible.
- **OQ3 — Is `/profile` routed by the current client?** Only the enum value `TopLevelRoutePath.Profile = 'profile'` was found (stale clone). Decides F5's severity.
- **OQ4 — ADR `agents-hq/docs/decisions/0001-non-activity-home-contract.md`** is cited by the 024 contract as the authoritative rationale and was not read (not under `specs/`; the local agents-hq clone's `docs/decisions/` was not listed). The whys of HOME-12/15/16 are taken from the spec and the PR body instead.
- **OQ5 — The missing `dashboard-activity-authorization.it-spec.ts`.** `activity-logs-test-plan.md:52` says it existed untracked on 2026-10-15 and covered `activityScore` / `exploreSpaces`; it is on no branch. Find or rewrite it (HOME-15/18 proof).
- **OQ6 — Is the hierarchical drop (F1) intended?** Nobody wrote the "subspace-only membership" case; the memberships plan marks § 7 "to be redesigned". Product/UX must say whether an L1-only member sees that space on the dashboard tree. **Product, 2026-11-20:** as F1: stays as today, with a wish.

### D. Test gaps

_For the Quality Lead (row GAPS in section 3)._

Untested rules by id: HOME-03 (except the empty-list clause), HOME-12, HOME-16, HOME-18, HOME-23, HOME-24, HOME-33, HOME-34; plus the untested clauses of HOME-02 (no role widens `me`), HOME-09 (virtual-contributor invitations), HOME-20 (FORBIDDEN state, closest ancestor), HOME-21 (user/organisation ids; NOT_FOUND for an unknown name), HOME-32 (persistence across sessions); and every disputed row (HOME-04, 08, 10, 11, 13, 15, 17, 22) has no case on the disputed clause.

Behaviours the area has that neither reading nor tests pinned down:
- The membership ordering itself (ACT-71 is unknown-why and untested): two spaces, own activity in one, others' in the other, the expected order.
- Hidden (deleted-comment) activity still ordering memberships and recent spaces (ACT-72, F-7 there).
- A former member's recent spaces: the space must leave `mySpaces` the moment the credential is removed, even though their activity rows remain.
- `spaceMembershipsFlat/Hierarchical/mySpaces` have no empty-actor guard (`me.resolver.fields.ts:315-356`) — harmless today (an anonymous context has no space credentials) but unproven for a guest actor (open question 1).
- `me.conversations` ordering and size: no order, no page — a user in hundreds of conversations gets them all in one list.
- The `states` filter on the organisation lists (only the space lists were read with a filter in the degradation case).
- `limit: 0` vs omitted vs negative on `spaceMembershipsHierarchical`; `limit` larger than the memberships.
- The dashboard for a member of a private space whose About they may read but whose activity they may not (activityScore vs card).
- Memberships plan § 7.3 "No Memberships" and § 7.4 "Organization Memberships" (never written); the whole non-activity view (HOME-33/34) has no walk.
- `urlResolver` for `/user/<unknown>`, `/organization/<unknown>`, a private space as a non-member (FORBIDDEN + ancestor), a subspace under the wrong parent, and the six reserved words.
- Audit: none of these reads is audited and none should be — confirm no platform-audit row is expected for `me` reads by platform roles.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values and user-facing copy, Technical Lead for engineering limits and wire shapes, Security Lead for security limits. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| `me.id` format | `me-<actorID>`; `me-` for no actor | `me.resolver.fields.ts:123-128` | no | Technical Lead |
| Credentials that make a "membership" | `space-admin`, `space-lead`, `space-member`, `space-subspace-admin` (on the parent) | `group.credentials.by.entity.ts:28-35` | no | Technical Lead |
| Credentials that make a person an organisation's manager (invitation lists) | `organization-owner`, `organization-admin` | `organization.manager.credentials.ts:8-12` | no | Technical Lead |
| Recent spaces default / pre-cut | `limit` 20; raw activity cut at `limit × 2` before the membership filter | `me.service.ts:366-372` | yes (F2) | Product Lead (default) · Technical Lead (pre-cut) |
| Hierarchical memberships `limit` | caps top-level spaces; `0` or omitted = all | `me.service.ts:276-278` | no | Technical Lead |
| Membership ordering | own latest activity desc › spaces with own activity › others' latest activity desc › rest (attributed to the L0) | `sort.spaces.by.activity.ts:222-268`; ACT-71 | yes | Product Lead |
| Pending state names | application `new, approving, approved, archived, rejected`; invitation `invited, accepting, accepted, archived, rejected` | `application.service.lifecycle.ts:43-49`; `invitation.service.lifecycle.ts:44-50` | no (F6) | Technical Lead |
| In-app notification states | `read`, `unread`, `archived`; badge = `unread` rows | `notification.event.in.app.state.ts`; `in.app.notification.service.ts:134-149` | yes (F3) | Product Lead |
| Notifications page default size | 25 (cursor path) — via PAG-14 | `in.app.notification.service.ts:252` | no | Technical Lead |
| `activityScore` window / exclusion | 7 days, `visibility = true`, excludes `CALLOUT_WHITEBOARD_CONTENT_MODIFIED`; counted on the space's own collaboration | `space.activity-score.loader.creator.ts:21-24, 86-100` | yes (F7) | Product Lead |
| Dashboard preference default | `activityView: true` (activity feed view) | `user.settings.entity.ts:65` | yes | Product Lead |
| Home space defaults | `spaceID: null`, `autoRedirect: false`; clearing the space turns auto-redirect off | `user.settings.service.ts:347-368`; CM-20 | yes (F9) | Product Lead |
| Non-activity view numbers (client) | sections cap 4; "show more" from the 5th; Last Active In window 30 days; Most Activity window 7 days; no-Spaces Explore block 8 cards | `agents-hq/specs/024-non-activity-home/spec.md:126-128, 135, 145` | yes | Product Lead |
| Reserved top-level route words (29) | `home, user, admin, vc, organization, documentation, innovation-library, innovation-packs, hub, forum, spaces, contributors, about, profile, restricted, docs, contact, create-space, login, logout, registration, sign_up, verify, recovery, required, error, landing, identity, flows` | `src/common/enums/url.path.base.ts` | no (F5) | Technical Lead |
| Resolved page types (31) | `UrlType`: `home, space, callout, callouts-set, post, organization, user, vc, whiteboard, memo, forum, discussion, spaces, contributors, innovation-hub, innovation-library, innovation-pack, admin, documentation, unknown, not-authorized, flow, login, logout, registration, sign_up, verify, recovery, required, error, restricted` (`not-authorized` and `unknown` are never produced by the resolver except `unknown` as the initial value) | `src/common/enums/url.type.ts` | no | Technical Lead |
| Resolver states | `RESOLVED`, `NOT_FOUND`, `FORBIDDEN` | `dto/url.resolver.result.state.ts` | no | Technical Lead |
| Space URL grammar | `/:space{/challenges/:subspace}{/opportunities/:subsubspace}{/*internal}` | `url.resolver.utils.ts:28-30` | no | Technical Lead |
| Error texts — pending rows | `Community not found for invitation <id>` · `Missing entities on Space loaded for Invitation <id>` (and `Application`) · `RoleSet not found for organization invitation` / `… application` | `me.service.ts:59-60, 69-70, 97-98, 107-108, 142, 186` | no (F4) | Technical Lead |
| Error texts — resolver | `Invalid URL: <url>` · `Unknown base route` · `Unable to resolve URL` (real error) | `url.resolver.service.ts:122, 217, 239, 327` | no | Technical Lead |
| GraphQL surface | `Query.me{id, user, mySpaces(limit), spaceMembershipsFlat, spaceMembershipsHierarchical(limit), communityInvitations(states), communityInvitationsCount(states), communityApplications(states), organizationInvitations(states), organizationInvitationsCount(states), organizationApplications(states), notifications(after,before,first,last,filter), notificationsUnreadCount, conversations{conversations}}`, `MySpaceResults{space, latestActivity}`, `CommunityMembershipResult{id, space, childMemberships}`, `CommunityInvitationResult`/`CommunityApplicationResult{id, invitation\|application, spacePendingMembershipInfo{id, level, about, communityGuidelines}}`, `OrganizationInvitationResult`/`OrganizationApplicationResult{id, invitation\|application, organization}`, `Space.activityScore: Int!`, `UserSettingsDashboard{activityView}`, `UserSettingsHomeSpace{spaceID, autoRedirect}`, `Query.urlResolver(url){state, type, closestAncestor{type, url, …}, space{id, level, levelZeroSpaceID, parentSpaces, collaboration, calendar, templatesSet}, userId, organizationId, discussionId, innovationHubId, innovationPack, virtualContributor}` | `schema.graphql:4643-4723, 5495-5498, 2753-2811, 5574-5610, 7698-7746, 7962-7974` | no | Technical Lead |

### F. Where this lands in the new core

The catalogue puts SP-12 on the **`viewer` document** (slice 4–5): the `me` root becomes `viewer`, and the pieces it aggregates today are reshaped around it — community/roleSet become credentials on the space, so "my memberships" (HOME-03/04) is a credential read on the viewer with the hierarchy derived from the space document; applications and invitations become one `membership_request`, so the four partitioned lists and their counts (HOME-05…10) collapse into one typed list with a state filter — F6 (finalized rows) and F4 (one bad row fails the field) should be settled before that list is designed; notification kinds become registry rows and counts are computed at read (HOME-13 — the badge/list asymmetry must be decided, not carried over); chat goes browser → Synapse, so `me.conversations` (HOME-14) has no stated successor on the server; activity stays append-only and partitioned with counts at read, which is where `activityScore` and the recent-spaces ordering (HOME-11/12/15, ACT-70…72) move — the new core should own the 30-day and 7-day windows rather than leave one to the client (F8, F7); preferences become `user_settings` attribute rows (HOME-16/17). `urlResolver` becomes `resolve(url)` with IDs and URLs preserved through aliases — the reserved-but-unresolvable words (HOME-22, F5) and the "everything else is a space" assumption (HOME-23) are the two rules to make explicit in that grammar. The UI is kept, so HOME-30…34 stay as written and are the acceptance walks for the rewritten client.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy suites — this catalogue feature (SP-12, "REST / UI only") has no `server-api/src/functional-api/<area>/` folder, so the proof is the 0 own + 31 cases of other server-api areas (`graphql-guard` 6, `roleset` 16, `communications` 8, `journey` 3 — counted in the dossier § 2) and 6 client-web Playwright walks (`memberships/view-home-dashboard-*` 2, `home-menus` 3, `support-navigation` 1) that exercise it; the specs, issues and docs listed in § Sources. Scope: the `me` surface the dashboard and top navigation read (my spaces and memberships with their ordering, my pending invitations and applications, my notification counts, my conversations), the dashboard fields on other roots (`Space.activityScore`, the activity-view and home-space settings), the non-activity home, and the url-resolver branches for the "my" pages and the navigation targets. `me.user`, `me.mcpApiKeys`, `me.accountDeletion` belong to ID-3, 038 and account deletion. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout. The single why was split over three columns without rewording, the who-may table was rebuilt as section 2, and every finding, open question and rule without a stated reason became a row in section 3 with an owner.


2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. A restating why with no source was dropped where a sourced one remains (HOME-02). Decision record 0001 (non-activity home contract) was read and added as a source; it answers OQ4.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/services/api/me/me.resolver.queries.ts`, `me.resolver.fields.ts`, `me.conversations.resolver.fields.ts`, `me.service.ts`, `space.membership.type.ts`, `dto/*` (`me.query.results`, `me.membership.result`, `me.space.pending.membership.info`, `me.invitation.result`, `me.application.result`, `me.organization.*`, `me.notification.event.filter.dto.input`, `my.journeys.results`)
- `src/services/api/roles/roles.service.ts`, `roles/util/group.credentials.by.entity.ts`
- `src/domain/access/application/application.service.ts`, `application.service.lifecycle.ts`; `src/domain/access/invitation/invitation.service.ts`, `invitation.service.lifecycle.ts`
- `src/domain/actor/actor-lookup/actor.lookup.service.ts`; `src/common/constants/authorization/organization.manager.credentials.ts`
- `src/platform/activity/activity.service.ts`, `create.latest.activity.per.space.ts`; `src/domain/space/space/sort.spaces.by.activity.ts`; `src/services/api/activity-log/activity.log.service.ts`
- `src/platform/in-app-notification/in.app.notification.service.ts`; `src/common/enums/notification.event.in.app.state.ts`
- `src/domain/communication/messaging/messaging.service.ts`
- `src/domain/space/space/space.resolver.fields.ts`; `src/core/dataloader/creators/loader.creators/space/space.activity-score.loader.creator.ts`; `src/migrations/1785600000100-AddActivityCollaborationDateIndex.ts`
- `src/domain/community/user-settings/user.settings.entity.ts`, `user.settings.service.ts`, `user.settings.dashboard.interface.ts`
- `src/services/api/url-resolver/url.resolver.service.ts`, `url.resolver.utils.ts`, `url.resolver.exception.ts`, `dto/url.resolver.result.state.ts`; `src/common/enums/url.path.base.ts`, `url.type.ts`
- `schema.graphql`; server `CLAUDE.md` (API conventions: "New queries about the current user go under the `me` root query")
- git: `c9caef271`, `507c0745f` (hierarchical memberships), `fb50392f6` (#5831 recent spaces), `b83820352` (#6699), `8a15aee5b` (#6324), `583e10cda` (#6502), `e7204814f` (url resolver)

Tests (worktree `w1-access-matrix/test-suites`):
- server-api: `graphql-guard/me-degradation-anonymous.it-spec.ts` (+ `me-degradation.request.params.ts`), `roleset/associates/me-pending-partition.it-spec.ts`, `roleset/invitations/invitation-contributors.it-spec.ts`, `invitation-organization.it-spec.ts`, `invitation-organization-subspace.it-spec.ts`, `roleset/application/application.it-spec.ts`, `roleset/associates/organization-associate-invitation.it-spec.ts`, `organization-email-invitation-registration.it-spec.ts`, `communications/conversations/conversations.it-spec.ts`, `delete-conversation.it-spec.ts`, `conversation-member-removal.it-spec.ts`, `activity-logs/activity-feed.it-spec.ts` (precondition), `journey/conversion/convert-L1-to-L0-url-resolver.it-spec.ts`; helpers `url-resolver/url-resolver.request.params.ts`, `visual/visual.request.params.ts:128-170`
- client-web: `memberships/view-home-dashboard-authenticated-user.spec.ts`, `view-home-dashboard-multiple-memberships.spec.ts`, `home-menus.spec.ts`, `support-navigation/*.spec.ts`, `organization-user-associates/us7-pending-lists-integrity.spec.ts`; plans `home-menus-test-plan.md`, `plans/memberships-test-plan.md` § 7, `plans/explore-discovery-areas-from-dashboard.md`, `my-dashboard/my-dashboard-page-objects.ts`
- lib: `scenario/graphql/queries/user/meQuery.graphql`, `meOrganizationPending.graphql`, `queries/me/readMyNotificationsUnreadCount.graphql`, `queries/url-resolver/urlResolver.graphql`
- `docs/qa/server-rebuild/knowledge/`: `activity-logs.md` (ACT-50…53, ACT-70…72), `roleset.md` (RS-27, RS-30, RS-40, RS-42), `notifications.md` (NTF-80…82), `pagination.md` (PAG-04, PAG-14), `graphql-guard.md` (GQL-01, GQL-04, GQL-05), `communications.md` (COM-50…55), `journey.md` (JRN-64), `contributor-management.md` (CM-20, CM-22), `access-matrix.md` § user, user-settings, space; `catalogue/README.md` SP-12, SP-11, ID-2; `catalogue/root-fields.md:169, 269`

Specs / issues:
- `agents-hq/specs/024-non-activity-home/spec.md` (clarifications, FR-001…FR-026, SC-001…004), `contracts/server-graphql.md`, `contracts/client-graphql.md`, `tasks/server.md`
- alkem-io/server #6326 (024 backend slice), #3626 (overfetching activities), #6699 (hide unreadable notification), #6315 / PR #6324 (session revocation, `me` degradation); PR #5831 (recent spaces optimisation)
- server `specs/106-mcp-space-slug-resolution/spec.md` (checked: MCP nameID lookup, not `urlResolver`), `specs/035-optimize-explore-spaces/spec.md` (FR-006/008 via JRN-64)
- `agents-hq/specs/017-innovation-hub-resources/spec.md` (checked, no dashboard content)
- `agents-hq/docs/decisions/0001-non-activity-home-contract.md` (read in the whys pass, 2026-11-20)
