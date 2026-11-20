# Activity logs: behaviour rules

_What the platform does today for activity: which actions write an activity entry and what it carries, the log of one space, the two platform feeds (paginated and grouped), "my spaces" and the membership ordering driven by the same entries, and what happens to entries on transfers, moves and deletions: what it does, why, who may, and what is still to answer. The file follows the three-section layout of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 9 · Technical Lead 6 · Quality Lead 6 · Service Operations Lead 1 · Architecture Lead 2. By state: 18 open · 6 with a suggested answer. Proof of the 49 rules: 21 proven by a test · 28 untested (Appendix A)._

_Whys of the 49 rules: 26 rest on a source · 17 carry a draft for product to decide · 6 have none, and each carries an open question (ACT-04, ACT-13, ACT-15, ACT-58, ACT-62, ACT-72)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a doc. "Not decided" means the behaviour exists in the code and nobody chose it.
- A marker in bold at the end of a rule points at section 3: **(open: F8)** means a question on this rule is still open, **(defect: …)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: …)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### What writes an entry

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACT-01 | Publishing a callout on a space writes a "callout published" entry with the callout's name and description. This happens every time the callout turns published, with or without a notification. | The log is the space's timeline of what became visible; publication, not creation, is the visible moment (CAL-20, spec 008 FR-004e). | — | — | Not decided: exists in the code (see CAL-20) |
| ACT-02 | A callout created as a draft writes nothing to the log. | Drafts are not visible to the community, so they are not activity (follows CAL-20, spec 008 FR-004e). | — | — | Not decided: exists in the code (see CAL-20) |
| ACT-03 | Every post, link, whiteboard or memo added to a published space callout writes its own entry naming it, even when the contributor switched the notification off. | Contributions are the core activity of a space; the notification switch is about mail, not history (callout table CAL-30; `callout.resolver.mutations.ts:770-773` "a notification failure can never drop the activity entry"). | — | — | Not decided: exists in the code (a code comment; see CAL-30) |
| ACT-04 | An office document (Collabora) added to a published callout writes no activity entry. **(open: F1)** | — | — | — | Not decided: exists in the code |
| ACT-05 | Contributions to a draft callout, contributions on a virtual contributor's knowledge base, and Form responses write nothing. | Drafts are invisible; the knowledge base is not a space ("toDo - rework activities also for KNOWLEDGE_BASE"); a Form response is never a contribution (callout table CAL-49). | — | — | Not decided: exists in the code (see CAL-49) |
| ACT-06 | A comment on a post writes a "post comment" entry with the comment text, once the chat server has confirmed the message. **(open: F8)** | — | — | The Matrix echo is the source of truth for messages (communications table COM-11). | Not decided: exists in the code |
| ACT-07 | A comment in a callout's own discussion writes a "discussion comment" entry only while the callout is published and belongs to a space. **(open: F8)** | Same visibility rule as publication: discussion on a draft is not community activity. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-08 | A message in the space's updates channel writes an "update sent" entry with the message text. | Updates are the lead's broadcast and belong on the timeline. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-09 | Creating a calendar event writes a "calendar event created" entry with the event's name and the start of its description. **(defect in part: F2)** | Events are space activity (calendar area). _(draft)_ | — | — | Not decided: exists in the code |
| ACT-10 | Every grant of the member role on a space (joining, added by an admin, accepted invitation, approved application) writes a "member joined" entry naming the joiner and who acted. Lead and admin grants, and organisation memberships, write nothing. **(open: F9)** | The community's growth is activity; who acted is kept for attribution. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-11 | Creating a subspace writes a "subspace created" entry on the parent's log, naming the new subspace. | — | — | Clients refresh lists live and the parent's timeline shows growth (journey table JRN-12; 082). | Spec 082 (through JRN-12) |
| ACT-12 | The "whiteboard content modified" entry type still exists in the API, but nothing on the server writes it any more. **(open: F3)** | — | — | The producer went with the Excalidraw backend removal (`1650462ec`, #4973); the type stayed. | Server PR #4973 (commit 1650462ec) removed the producer; keeping the type was not decided |
| ACT-13 | Deleting a comment hides the entry that was written for it. No "comment removed" entry is written and nothing is pushed to live subscribers. **(open: Q-ACT-13)** | — | — | — ("todo" comments in the code) | Not decided: exists in the code |
| ACT-14 | Only people write activity: a comment, reply or update by a virtual contributor or an organisation writes no entry. **(open: F9)** | — | — | The activity row and the feed types require a user as actor; non-user actors arrive with an empty actor id, so the producers skip rather than fail (file-level FIXME). | Not decided: exists in the code (a FIXME) |
| ACT-15 | An entry's text is cut to 128 characters, ending in "…". **(open: Q-ACT-15)** | — | — | — | Not decided: exists in the code |
| ACT-16 | Entries are written in the background after the action succeeds. The action never fails because of the entry, and the entry shows shortly after. | — | — | Activity is a side effect, never a precondition of the user's action. _(draft)_ | Not decided: arrived with server PR #5692 (the Postgres migration), which states no reason |
| ACT-17 | Entries are never deleted when the thing they describe is deleted; the reader just never sees them. An entry by a deleted author stays, attributed to "Former member". **(open: F10)** | — | — | Append-only history; the author tombstone is a recorded v1 limitation (054 FR-022). | Spec 054 FR-022 for the author; the rest is not decided |

### Reading a space's log

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACT-20 | A signed-in user who may read a space's content may read its log: members and admins on any space, every signed-in user on a public space. | The log shows the names and texts of what happened, so it follows the collaboration's own read rule. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-21 | A signed-in user who is not a member of a private space is refused its log, and the refusal reveals nothing of it. | Private means private for history too. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-22 | A public subspace of a private space stays private to outsiders: the parent's members and admins read its log, a non-member is refused. | Privacy is inherited down the hierarchy (journey area). _(draft)_ | — | — | Not decided: exists in the code |
| ACT-23 | The log returns at most the number of entries asked for, or all of them when no number is given. It can be narrowed to chosen types. Hidden entries are never returned. | — | — | The client paginates the timeline by count. _(draft)_ | Not decided: exists in the code |
| ACT-24 | Entries come newest first. **(open: Q-ACT-24)** | A timeline. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-25 | Asking for child activity adds the entries of every subspace below that the reader may read, each flagged as a child entry. Subspaces the reader may not read are left out silently. **(defect in part: F4)** | The top-level dashboard shows the whole hierarchy's activity without leaking private subspaces (`f7d315d70` #2741). | — | — | Server PR #2741 (commit f7d315d70) |
| ACT-26 | An entry whose subject no longer exists is left out of the result instead of failing the query. **(open: F10)** | A deleted resource must not break the timeline (client-web#7947). | — | — | client-web#7947 |
| ACT-27 | An entry whose author's account was deleted is shown as written by "Former member". **(open: OQ4)** | Account deletion must not erase or break others' history (054 FR-022, `656bec3df`). | — | — | Spec 054 FR-022; commit 656bec3df |
| ACT-28 | Every entry carries its type, time, text, actor and the space it happened in. Typed entries add their subject: the callout, post, whiteboard, memo, link, subspace, joiner, update or event. | — | — | The client renders each entry kind from its payload. _(draft)_ | Not decided: exists in the code |
| ACT-29 | A freshly created space's log holds one "member joined" entry per seeded member, the creator included, and nothing else. **(open: OQ1)** | Space creation itself is not activity; memberships are. _(draft)_ | — | — | Not decided: exists in the code |

### Transfers, moves and deletions

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACT-40 | When a callout is transferred to another space, every entry about it moves with it: the destination's log shows them and the source's no longer does. | Members of the destination can read the callout's history; source members no longer reference an entity they cannot reach (server#6023, #4971, client-web#7947; `f26856ab0`). | — | — | server#6023, #4971; client-web#7947; commit f26856ab0 |
| ACT-41 | A subspace promoted to a top-level space keeps its own history. | — | — | The collaboration travels with the space (server#6023). | server#6023 |
| ACT-42 | After a callout is transferred into a private subspace of the same space, space members who are not in that subspace no longer see its entries in the space's log. | Privacy of the destination wins over the source's history (server#4971). | — | — | server#4971 |
| ACT-43 | Every move or conversion of a subspace deletes the old parent's "subspace created" entry for it. Nothing is written on the new parent, and the moved space keeps its own log. | — | — | No audit surface for moves beyond server logs; the stale entry is the only thing to clean (030 clarification; 083 Q "no dedicated activity log entry"; `f26856ab0`, `a59321a43`). | Spec 030 clarification; server spec 083; commits f26856ab0, a59321a43 |

### The platform feeds

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACT-50 | The two feeds show only activity from spaces where the caller holds a membership role, and from their readable subspaces. A caller who can read no space gets an empty feed. | A registered user with no memberships was receiving private-space names, texts and actors platform-wide (server#6640, fix #6643). | — | — | server#6640; server PR #6643 |
| ACT-51 | A space filter narrows the feed to the named spaces the caller belongs to. Other or unknown spaces give nothing, without an error. | — | — | The dashboard filters by my spaces; unknown ids are a stale client, not an attack. _(draft)_ | Not decided: exists in the code |
| ACT-52 | Without filters the paginated feed is everything the caller may see, their own entries and everyone else's, newest first. | "Latest activity in my spaces" (client-web dashboard). _(draft)_ | — | — | Not decided: exists in the code |
| ACT-53 | "Exclude my activity" removes the caller's own entries: every page stays full, the total counts only others, and paging returns each of the others' entries once and in order. | A space admin wanted the dashboard's "latest activity in my spaces" without their own posts. | — | An in-memory filter would give short pages (server#6561, #6639; client-web#10403). | server#6561; server PR #6639; client-web#10403 |
| ACT-54 | The paginated feed pages forward or backward with cursors, never both at once. Without a page size it returns 25 entries. It reports the total and whether more pages exist. | — | — | Pagination contract (`docs/Pagination.md`). | docs/Pagination.md |
| ACT-55 | "My activity" returns exactly the caller's own entries, and the total counts only those. | The dashboard's "My activity" view (server#6561 "myActivity unchanged"). | — | — | server#6561 |
| ACT-56 | "My activity" together with "exclude my activity" is accepted and gives an empty page, not an error. | — | — | Documented composition rule (`activity.feed.query.args.ts:24`). | Not decided: exists in the code (documented in the query arguments) |
| ACT-57 | The grouped feed shows one entry per person, subject and type (the latest of each), newest first, 10 by default, with the same "my activity" and "exclude my activity" switches. **(open: OQ6)** | The dashboard's compact "latest contributions" block must not show the same person's ten comments on one post as ten rows (`9f17a5e54` #3718; `5f5687454` #3720). | — | — | Server PRs #3718, #3720 |
| ACT-58 | The grouped feed accepts a list of types to exclude but does not apply it. **(defect: F5)** | — | — | — | Not decided: a defect |
| ACT-59 | A role filter keeps only the spaces where the caller is a member, an admin or a lead, as chosen. | Dashboard filter by my role. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-60 | A list of types to include and a list to exclude narrow the paginated feed. A type in both is excluded. | The dashboard hides whiteboard-content-modified entries (024 clarification `:37`). | — | — | Spec 024 clarification |
| ACT-61 | A page of the paginated feed may hold fewer entries than asked, with a misleading total, when some entries cannot be shown because their subject was deleted. **(open: Q-ACT-61, F10)** | — | — | Known limitation ("todo solve issue below" — `activity.feed.service.ts:197-200`). | Not decided: exists in the code (a todo) |
| ACT-62 | Neither feed limits the size asked for: any grouped limit or page size is run as asked. **(open: F6)** | — | — | — (named in #6640/#6643 as a pre-existing, unticketed issue) | Not decided: exists in the code |
| ACT-63 | Both feeds are for signed-in users only; a visitor is refused. | The feed is "related to the current user" (schema description of the feed queries). | — | — | Not decided: exists in the code |

### My spaces and membership ordering

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACT-70 | "My spaces" lists, newest first, the spaces where the caller is a direct member and has acted themselves, each with their latest entry there; 20 by default. Spaces reached only through a virtual contributor are left out. | "Recent Spaces" on the dashboard = the member's own activity (024 clarification `:26`). | — | VC memberships must not appear in the user's own list (`me.service.ts:386-388`). | Spec 024 clarification |
| ACT-71 | The caller's space memberships are ordered by activity in the top-level space: first where the caller acted most recently, then where others did, then the rest. **(open: Q-ACT-71)** | The membership list doubles as a recency list. _(draft)_ | — | — | Not decided: exists in the code |
| ACT-72 | Hidden entries (deleted comments) still count for "my spaces" and for the membership ordering, although the log and the feeds no longer show them. **(defect: F7)** | — | — | — | Not decided: a defect |
| ACT-73 | The MCP "community activity summary" tool reads the same entries for the caller's member spaces and readable subspaces: visible entries only, at most 100 (default 20), from the last 1 to 365 days (default 30). | Assistant-side view of the member's communities. _(draft)_ | — | — | Not decided: exists in the code |

Numbering note: ACT-30…39, 44…49, 64…69 are intentionally unused.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W11 follow the order of the former who-may table. Product has not reviewed these cells yet. Evidence is in Appendix B._

### Reading

| ID | Action | Space admin | Space member | Registered user, not a member | Visitor | Platform admin roles | Platform License Manager | Account admin or owner |
|---|---|---|---|---|---|---|---|---|
| W1 | Read a public space's log | Y | Y | Y | N¹ | Y | Y | Y |
| W2 | Read a private space's log | Y | Y | N | N | Y² | N³ | N³ |
| W3 | Read the log of a public subspace of a private space | Y | Y | N | N | Y² | N³ | N³ |
| W4 | Read child activity through a parent's log | Y | Y | Y⁴ | N | Y⁵ | Y⁵ | Y⁵ |
| W5 | Read the paginated or grouped feed | Y | Y | Y | N | Y⁶ | Y⁶ | Y |
| W6 | Read another user's feed or "my spaces" | – | – | – | – | – | – | – |
| W7 | Read "my spaces" and the membership ordering | Y | Y | Y | –⁷ | Y | Y | Y |
| W11 | Use the MCP community activity summary | Y | Y | Y | N | Y⁸ | Y | Y |

¹ A visitor lacks the "read users" right. ² Platform Content Full Access and the platform spaces reader; the other platform roles only through a space role. ³ Unless they hold a space role. ⁴ On public subspaces only. ⁵ For each subspace they may read; subspaces they may not read are left out silently. ⁶ With their own space roles; a platform role alone gives an empty feed. ⁷ A visitor gets an empty "me". ⁸ Own spaces only. W6: no such query exists; every feed is the caller's own.

### Writing and moving

| ID | Action | Space admin | Space member | Registered user, not a member | Visitor | Platform admin roles | Platform License Manager | Account admin or owner |
|---|---|---|---|---|---|---|---|---|
| W8 | Write an entry (publish, contribute, comment, update, join, create a subspace or an event) | Y | Y⁹ | N | N | –¹⁰ | –¹⁰ | –¹⁰ |
| W9 | Transfer a callout (moves its entries) | N | N | N | N | Y¹¹ | N | N |
| W10 | Move or convert a subspace (deletes the old parent's entry) | N | N | N | N | Y¹² | N | N |

⁹ By contributing, commenting or joining. ¹⁰ Decided by the action's own rule (callout, room, role set, space and calendar areas), not by this area. ¹¹ Platform Resource Admin only (callout rule CAL-70). ¹² Platform Resource Admin (journey rules JRN-4x).

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding (F) and open question (OQ), with code lines and data, is in Appendix C under the same id. A question "Why does this rule exist?" (Q-…) means the rule holds but no source states its reason._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 9 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Writing | decision | Office documents added to a callout write no activity entry, although the callout rules (CAL-30) list "document created" among the entries. Add the entry kind, or correct CAL-30 and accept that documents do not show in the timeline? | Product Lead (Technical Lead implements) | — | open |
| F3 | Writing | decision | The "whiteboard content modified" entry kind has had no producer since server PR #4973, but the API, the schema and the client's filter still carry it. Retire the kind, or restore a producer from the collaboration service? | Product Lead, then Technical Lead | — | open |
| F8 | Writing | decision | A comment on a post is recorded whatever the state of its callout; a comment in the callout's own discussion only when the callout is published and on a space. One rule ("comments count only on published callouts"), or keep the difference and document it? | Product Lead | — | open |
| F9 | Writing | decision | Should activity by virtual contributors and organisations appear in the timeline, and under whose name? Today it is skipped, and a virtual contributor joining a space is recorded with the admin as the actor. | Product Lead (Technical Lead: a virtual contributor's own contribution would fail on the empty actor id) | — | open |
| Q-ACT-13 | Writing | decision | Why does this rule exist? No source states the reason. Deleting a comment hides its entry, writes no "comment removed" entry and pushes nothing live (the code carries "todo" comments). | Product Lead | — | open |
| Q-ACT-15 | Writing | decision | Why does this rule exist? No source states the reason. Entry text is cut to 128 characters. | Product Lead | — | open |
| Q-ACT-24 | Reading | decision | Why does this rule exist? No source states the reason. Entries come newest first; the only stated reason is "a timeline". | Product Lead | — | open |
| Q-ACT-71 | My spaces | decision | Why does this rule exist? No source states the reason. The membership list is ordered by recent activity: own first, then others', then the rest. | Product Lead | — | open |
| CONST | All | decision | 16 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead rules on the rows pre-filled with that role) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 6 to answer, 4 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Writing | defect | The calendar entry text loses the first character of the event description. | Technical Lead | A defect: start the text at the first character, and rebaseline the text shape when fixed. | suggested |
| F4 | Reading | defect | With child activity on, a top-level space's own entries come back flagged as child entries, so the client shows them as "happened in a subspace". | Technical Lead | A defect: the flag is wrong for the parent's own entries. | suggested |
| F5 | Feeds | defect | The grouped feed accepts a list of types to exclude but ignores it. Implement it, or remove it from the grouped input? | Technical Lead | — | open |
| F6 | Feeds | risk | Neither feed limits the size a caller may ask for. Cap it? | Technical Lead (Security Lead sets the limit) | Cap it and make the cap a rebaseline constant; a 100-row cap already exists for the refetch loop. | suggested |
| F7 | My spaces | defect | Entries hidden after a comment was deleted still drive "my spaces" and the membership ordering, while the log, both feeds and the MCP tool leave them out. | Technical Lead | One visibility rule for every reader. | suggested |
| Q-ACT-61 | Feeds | decision | Why does this rule exist? No source states the reason. Is a short page with a misleading total acceptable when some entries cannot be shown? | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Writing | decision | Office documents added to a callout write no activity entry, although the callout rules (CAL-30) list "document created" among the entries. Add the entry kind, or correct CAL-30 and accept that documents do not show in the timeline? | Product Lead (Technical Lead implements) | — | open |
| F3 | Writing | decision | The "whiteboard content modified" entry kind has had no producer since server PR #4973, but the API, the schema and the client's filter still carry it. Retire the kind, or restore a producer from the collaboration service? | Product Lead, then Technical Lead | — | open |
| F9 | Writing | decision | Should activity by virtual contributors and organisations appear in the timeline, and under whose name? Today it is skipped, and a virtual contributor joining a space is recorded with the admin as the actor. | Product Lead (Technical Lead: a virtual contributor's own contribution would fail on the empty actor id) | — | open |
| CONST | All | decision | 16 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead rules on the rows pre-filled with that role) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 6 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Reading | check | What are the four entries in a fresh space's log? Two cases pin the count without saying which members they are. Check the scenario factory on the test stack before the count is used as a rule. | Quality Lead | — | open |
| OQ2 | Writing | check | Is the "added by an admin" path ever exercised on a top-level space, or does the helper make the person join as themself? Confirm per level on the test stack. | Quality Lead | — | open |
| OQ3 | All | test | Two legacy files have set-up slips: a space id passed where a role-set id is expected, and an assertion that is always true. Repair or retire them when the area moves to the new net? | Quality Lead | — | open |
| OQ4 | Reading | spec | Spec 054 (account deletion, "Former member") is cited by the code but was not found locally. Locate it to confirm the why of ACT-27. | Quality Lead | Found: `agents-hq/specs/054-delete-own-account/spec.md` FR-022: activity feeds that reference a deleted user "MUST resolve to a static neutral “former member” attribution without per-entry lookups" (v1 limitation: the string is not localised). It confirms the why of ACT-27. | suggested |
| OQ5 | Reading | check | Findings F4 and F7 are readings of the code. Nobody has watched either on a running stack. Confirm both live. | Quality Lead | — | open |
| GAPS | All | test | 28 rules have no test, and Appendix D lists more untested clauses and behaviours that were never pinned down. Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ7 | Writing | check | Can comment entries be exercised on the test environment at all? They arrive through Matrix, and matrix.test-alkem.io had no DNS on 2026-10-28, so the skipped cases may be red for environment reasons. | Service Operations Lead (Quality Lead decides on the skipped cases) | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Feeds | risk | Neither feed limits the size a caller may ask for. Cap it? | Technical Lead (Security Lead sets the limit) | Cap it and make the cap a rebaseline constant; a 100-row cap already exists for the refetch loop. | suggested |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ7 | Writing | check | Can comment entries be exercised on the test environment at all? They arrive through Matrix, and matrix.test-alkem.io had no DNS on 2026-10-28, so the skipped cases may be red for environment reasons. | Service Operations Lead (Quality Lead decides on the skipped cases) | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F10 | Moves | contract | Entries are never deleted and have no link to what they describe (about 8,100 dangling rows on acceptance). Readers drop them one by one, so pages can be short and totals wrong. Does the new core delete entries with their subject, or keep a tombstone when the subject is deleted? | Architecture Lead | Decide at write time in the new core (decision 8 of the defect register); the register proposes to drop the dangling rows, counted. | suggested |
| OQ6 | Feeds | contract | What replaces "one entry per person, subject and type" in the new core? The catalogue names activity grouping as a rebaseline candidate without saying. Needed before ACT-57 is used as an oracle. | Architecture Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›`, `register ›` or `journey ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| ACT-01 | Publishing a callout on a space — created already published, or a draft turned published — writes a "callout published" entry on the space's log, carrying the callout name and description, every time the callout turns published and whether or not a notification was asked for. | space admin / editor | code › `src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts:351-373` · `src/domain/collaboration/callout/callout.resolver.mutations.ts:450-480` · `src/services/adapters/activity-adapter/activity.adapter.ts:102-124` · test › `activity-log-on-transfer-conversion` › `the callout activity exists in the source space before transfer (precondition)`, `… exists before promotion (precondition)` | proven (the "every time it turns published again" clause is untested) |
| ACT-02 | Creating a callout as a draft writes nothing to the log. | space admin / editor | code › `callouts.set.resolver.mutations.ts:351-352` (gated on PUBLISHED) · test › `space-activity-logs` › `should NOT return CALLOUT_PUBLISHED, when created`; `opportunity-activity-logs` › same | proven |
| ACT-03 | Every post, link, whiteboard or memo contributed to a published space callout writes its own typed entry (post created / link added / whiteboard created / memo created) naming the contribution — even when the contributor switched the notification off. | space member | code › `callout.resolver.mutations.ts:693-749, 933-1038` · `activity.adapter.ts:126-167, 169-193, 249-274, 276-300` · test › `activity-log-on-transfer-conversion` › both precondition cases (post); `notifications/space/collaboration/post-contribution` › `the activity log entry for the contribution is written even though sendNotification is false` | proven for posts; link, whiteboard and memo entries are untested |
| ACT-04 | Contributing an office document (Collabora) to a published callout writes no activity entry — only the analytics report. | space member | code › `callout.resolver.mutations.ts:753-763, 1040-1054` (no adapter call) | untested (see F1) |
| ACT-05 | Contributions to a draft callout and contributions on a knowledge-base (virtual-contributor) callout write nothing; the Form response of a Form callout writes nothing either. | space member, VC account admin | code › `callout.resolver.mutations.ts:691-693, 701, 714, 726, 738, 753` · test › `callout/form/form-never-appears` › `the control POST wrote exactly one new activity entry and the response none` (Form only) | proven for the Form response; draft and knowledge-base clauses untested |
| ACT-06 | A comment on a post writes a "post comment" entry carrying the comment text, once the message has come back from the chat server; the entry remembers the message id. | space member | code › `src/services/event-handlers/internal/message-inbox/message.notification.service.ts:114-134` · `src/domain/communication/room/room.service.events.ts:262-276` · `activity.adapter.ts:224-247` · test › (only the skipped multi-type cases) | untested |
| ACT-07 | A comment in a callout's own discussion writes a "discussion comment" entry only while the callout is published and belongs to a space (not a knowledge base). | space member | code › `message.notification.service.ts:177-203` · `room.service.events.ts:410-424` · `activity.adapter.ts:335-359` | untested |
| ACT-08 | A message sent in the space's updates channel writes an "update sent" entry carrying the message text. | space lead / admin | code › `message.notification.service.ts:163-175` · `room.service.events.ts:339-353` · `activity.adapter.ts:426-451` | untested |
| ACT-09 | Creating a calendar event writes a "calendar event created" entry carrying the event name and the start of its description. | space member | code › `src/domain/timeline/calendar/calendar.service.ts:257-268` · `activity.adapter.ts:195-222` | untested (see F2: the description loses its first character) |
| ACT-10 | Every grant of the member role on a space — joining, being added by an admin, an accepted invitation or an approved application, for a user, an organisation or a virtual contributor — writes a "member joined" entry on that space, naming the joiner as the subject and the person who acted (the joiner on a join, the admin on an assignment) as the actor. Lead and admin grants, and organisation memberships, write nothing. | space member, space admin, server | code › `src/domain/access/role-set/role.set.service.ts:1046-1090` · `role.set.service.events.ts:36-49` · `activity.adapter.ts:361-385` · test › `space-activity-logs` › `should return MEMBER_JOINED, when user assigned from Admin or individually joined`; `challenge-activity-logs` › same; `opportunity-activity-logs` › `should return MEMBER_JOINED, when user assigned from Admin` | proven for users (join and admin-assign); organisation and VC joiners untested |
| ACT-11 | Creating a subspace writes a "subspace created" entry on the **parent's** log, naming the new subspace. | space admin | code › `src/domain/space/space/space.resolver.mutations.ts:274-277` · `activity.adapter.ts:53-100` | untested (JRN-12 lists it as untested too) |
| ACT-12 | The "whiteboard content modified" entry type exists in the vocabulary and the API, but nothing on the server writes it any more. | — | code › `src/common/enums/activity.event.type.ts:8` · `activity.adapter.ts:302-333` (no caller) · `schema.graphql:55` | untested (see F3) |
| ACT-13 | Deleting a comment hides the entry that was written for it (log and feeds stop showing it); no "comment removed" entry is written and nothing is pushed to live subscribers. | space member, server | code › `message.inbox.service.ts:274-300` · `room.service.events.ts:320-337` · `activity.adapter.ts:407-424` · `src/platform/activity/activity.service.ts:64-70` | untested |
| ACT-14 | Only people write activity: when a virtual contributor or an organisation comments, replies or posts an update, no entry is written. | VC, organisation | code › `room.service.events.ts:31-60, 267-275, 327-336, 344-352, 415-423` | untested |
| ACT-15 | An entry's text is cut to 128 characters with a trailing "…". | server | code › `activity.service.ts:33-41` · `src/common/utils/string.util.ts:1-9` · `src/common/constants/entity.field.length.constants.ts:4` | untested |
| ACT-16 | Entries are written in the background after the action succeeds: the action never fails because the entry could not be written, the entry becomes visible shortly after (comments only once the chat server echoes the message), and a post deleted before its entry was written simply gets no entry. | server | code › `callout.resolver.mutations.ts:702, 715, 727, 739` (no await) · `activity.adapter.ts:135-152` (`63b6b3ed6`) · test › every case that polls (`activity-feed` › `beforeAll`; `post-contribution` › `… even though sendNotification is false`) | untested as a rule (the polls are harness behaviour) |
| ACT-17 | Entries are never deleted when the thing they describe is deleted: a deleted callout, post, whiteboard, memo, link, event, subspace or space leaves its rows behind and the reader simply never sees them; a deleted author leaves the entry visible and attributed to "Former member". | server | code › `activity.entity.ts:13-41` (no relations) · `src/services/api/activity-log/activity.log.service.ts:146-164, 229-235` · `src/domain/community/user/account-deletion/deleted.user.sentinel.ts:7-18, 48-60` · register › W4 F8 (~8,100 dangling rows on ACC) | untested |
| ACT-20 | A signed-in user who may read a space's collaboration may read its log: members, admins and the platform admin on any space; everybody signed in on a public space. | space member, space admin, registered | code › `src/services/api/activity-log/activity.log.resolver.queries.ts:276-293` · `src/platform/platform/platform.service.authorization.ts:484-492` · matrix › `access-matrix.md:1600-1665` · test › `space-activity-logs` › `DDT user privileges to Private Space activity logs` (3 rows), `… Public Space activity logs` (4 rows); `challenge-activity-logs` / `opportunity-activity-logs` › public-of-public DDT (4 rows each); `activity-log-on-transfer-conversion` › `the space member sees the callout activity before transfer (precondition)` | proven |
| ACT-21 | A signed-in user who is not a member of a private space is refused its log with an authorization error; the log never leaks through the refusal. | registered | code › `activity.log.resolver.queries.ts:288-293` · test › `space-activity-logs` › `User: "non.space" get Error message: "Authorization", when intend to access Private space activity logs` | proven |
| ACT-22 | A public subspace of a private space is still private to outsiders: the parent's members and admins read the subspace's log, a non-member is refused. | space member, registered | code › (inherited collaboration policy) · test › `challenge-activity-logs` › `DDT user privileges to Public Subspace activity logs of Private Space` (4 rows); `opportunity-activity-logs` › `… Public Subsubspace activity logs of Private Space` (4 rows) | proven |
| ACT-23 | The log returns at most the requested number of entries; without a number it returns everything; a list of types narrows it to those types; hidden (removed-comment) entries are never returned. | all readers | code › `activity.log.service.ts:58-89` · `activity.service.ts:121-144` · `schema.graphql:8486-8495` · test › `space-activity-logs` › `should return MEMBER_JOINED …` (limit 6 → 6), `should return only memberJoined` (limit 5 → 4) | proven for the count; types filter and hidden entries untested |
| ACT-24 | Entries come newest first. | all readers | code › `activity.service.ts:139-141` | untested |
| ACT-25 | Asking for child activity adds the entries of every descendant collaboration the reader may read (whole tree under a top-level space; the L2s under an L1; nothing under an L2), each flagged as a child entry; descendants the reader may not read are silently left out. | all readers | code › `activity.log.resolver.queries.ts:295-326` · `src/domain/collaboration/collaboration/collaboration.service.ts:256-320` · `activity.log.service.ts:69-73` | untested (see F4: a top-level space's own entries come back flagged as children); the private-descendant exclusion is untested |
| ACT-26 | An entry whose subject no longer exists (deleted callout, post, whiteboard, memo, link, subspace, event, room, community) is dropped from the result rather than failing the query; a legacy "member joined" entry without its community is dropped too. | server | code › `activity.log.service.ts:173-178, 229-235` · `activity.log.builder.service.ts:50-325` | untested |
| ACT-27 | An entry whose author's account was deleted is shown attributed to "Former member". | all readers | code › `activity.log.service.ts:146-164` · `deleted.user.sentinel.ts:12, 18, 48-60` | untested |
| ACT-28 | Every entry carries its type, time, text, the actor, the collaboration, the display name of the space it happened in and the space itself; typed entries add their subject (callout, post, whiteboard, memo, link, subspace, community + joining actor, updates room + message + space link, calendar + event). | all readers | code › `activity.log.service.ts:200-228` · `activity.log.builder.service.ts:274-298` · `schema.graphql:1209-1230, 1415-1740` | untested (fields are read by every case but never asserted beyond `collaborationID`, `description`, `triggeredBy`, `type`) |
| ACT-29 | A freshly created space's log holds one "member joined" entry per seeded member (including the creator's own) and nothing else. | space admin | code › `space.resolver.mutations.ts` (no adapter call on `createSpace`; only `createSubspace` `:274`) · test › `space-activity-logs` › `should return only memberJoined` (4); `opportunity-activity-logs` › `should return empty arrays` (4) | proven as a count; the composition of the 4 is unverified (open question 1) |
| ACT-40 | When a callout is transferred to another space, every entry about it — the publication and every contribution and comment on it — moves with it: the destination's log shows them, the source's no longer does, and both logs keep working. | PRA (transfers), all readers | code › `src/domain/collaboration/callout-transfer/callout.transfer.service.ts:120-146` · `activity.service.ts:72-101` · test › `activity-log-on-transfer-conversion` › `activity log queries for source and destination do not error`, `the transferred callout activity appears in the destination space`, `… no longer appears in the source space` | proven |
| ACT-41 | A subspace promoted to a top-level space keeps its own history, readable on the promoted space. | PRA, all readers | code › `src/services/api/conversion/conversion.service.ts:254-258` (only the parent's stale entry is removed) · test › `activity-log-on-transfer-conversion` › `activity log query does not error after promotion`, `the activity remains readable on the promoted L0 collaboration` | proven |
| ACT-42 | After a callout is transferred into a private subspace of the same space, a member of the space who is not a member of that subspace no longer sees the callout's entries in the space's log, and reading the log does not error. | space member | code › `activity.service.ts:72-101` (entries re-stamped onto the private collaboration) · test › `activity-log-on-transfer-conversion` › `reading the activity log as the space member does not error after transfer`, `the moved callout activity is no longer shown to the space member` | proven |
| ACT-43 | Every move or conversion of a subspace (L1→L0, L1→L2, and the three cross-top-level moves) deletes the old parent's "subspace created" entry for it; nothing is written on the new parent, and the moved space keeps its own log. | PRA | code › `conversion.service.ts:254-258, 471-475, 701-705, 864-868, 1050-1054` · `activity.service.ts:103-119` · spec › `agents-hq/specs/030-move-subspace-parent/spec.md:27, 194` · `server/specs/083-cross-space-moves/spec.md:216` · journey › JRN-47 (the three cross-L0 moves) | proven for the cross-L0 moves (JRN-47); the two same-L0 conversions and the "nothing on the new parent" clause are untested |
| ACT-50 | The two feeds show only activity from spaces the caller holds a membership credential in (member, lead, admin or subspace-admin) and their readable descendants; a caller who may read no collaboration gets an empty feed — never the platform's latest activity. | registered | code › `src/domain/activity-feed/activity.feed.service.ts:118-135, 257-337` · `activity.service.ts:218-220` · test › `activity-feed` › `AF-01 — a user with no space memberships gets no grouped activity, even though private activity exists`, `AF-15 — the paginated feed is empty for a user who can read no collaboration` | proven |
| ACT-51 | A space filter narrows the feed to the named spaces the caller is credentialed in; naming spaces the caller does not hold, or that do not exist, yields nothing for them (no error). | registered | code › `activity.feed.service.ts:143-171` · test › `activity-feed` › `AF-02 — a member whose spaceIds filter excludes every space they hold gets no grouped activity` | proven |
| ACT-52 | Without filters the paginated feed is the whole readable scope — the caller's own entries and everyone else's — newest first. | registered | code › `activity.feed.service.ts:52-84` · `activity.service.ts:146-198` · test › `activity-feed` › `AF-12 D1 (control) — neither flag: the whole scope, caller rows and others' rows` | proven |
| ACT-53 | "Exclude my activity" removes the caller's own entries inside the query: every page stays full, the total counts only others, and paging forward with the cursor returns all of the others' entries once and in order; "false" behaves as not set. | registered | code › `activity.service.ts:179-181` · `activity.feed.query.args.ts:21-26` · test › `activity-feed` › `AF-11 — excludeMyActivity: no caller rows, page 1 full at the limit, paging continues without them`, `AF-12 D2 — excludeMyActivity: false behaves as unset` | proven |
| ACT-54 | The paginated feed pages with relay cursors: a page size and an "after" cursor forward (or a page size and a "before" cursor backward), never both; a page size must be positive; without a page size 25 entries come back; the result carries the total and whether more pages exist. | registered | code › `src/core/pagination/validate.pagination.args.ts:12-44` · `relay.style.pagination.fn.ts:24, 107` · `pagination.fn.ts:9-29` · `schema.graphql:6291-6303` | untested (the default page size and the validation errors; AF-11 walks forward with `first`/`after` only) |
| ACT-55 | "My activity" returns exactly the caller's own entries in the scope, with the total counting only those. | registered | code › `activity.service.ts:175-177` · test › `activity-feed` › `AF-12 D4 — myActivity: true returns exactly the caller's rows` | proven |
| ACT-56 | "My activity" together with "exclude my activity" is accepted and yields an empty page (total 0, no next page), not an error. | registered | code › `activity.feed.query.args.ts:21-26` · test › `activity-feed` › `AF-12 D5 — myActivity: true with excludeMyActivity: true composes to an empty result, not an error` | proven |
| ACT-57 | The grouped feed collapses the scope to one entry per actor × subject × type — the latest of each — newest first, 10 by default, honouring "my activity" and "exclude my activity" in the same way; a request is topped up (up to 100 rows fetched) when entries fail to render. | registered | code › `activity.service.ts:200-299` · `activity.feed.service.ts:208-255` · test › `activity-feed` › `AF-14 — the grouped feed honours excludeMyActivity` | proven for the two flags; the grouping itself and the default of 10 are untested |
| ACT-58 | The grouped feed accepts a list of types to exclude but does not apply it. | registered | code › `activity.feed.grouped.query.args.ts:5-11` (inherits `excludeTypes`) · `activity.feed.service.ts:86-116` (never passed) · `activity.service.ts:200-209` | untested (see F5) |
| ACT-59 | A role filter keeps only the spaces where the caller is a member, an admin or a lead as named; the derived subspace-admin standing cannot be selected. | registered | code › `activity.feed.service.ts:347-362` · `activity.feed.roles.enum.ts:3-7` · `group.credentials.by.entity.ts:74-98` | untested (test plan: shared personas' roles drift, so "holds no LEAD anywhere" cannot be fixed) |
| ACT-60 | A list of types to include and a list to exclude narrow the paginated feed; a type in both is excluded. | registered | code › `activity.service.ts:183-195` · spec › `agents-hq/specs/024-non-activity-home/spec.md:37` | untested (every AF case sends the exclusion but none asserts it) |
| ACT-61 | A page of the paginated feed may come back with fewer entries than asked and a misleading "total" when some of its rows cannot be rendered (deleted subject). | registered | code › `activity.feed.service.ts:191-205` | untested (whether this is acceptable is a product call) |
| ACT-62 | Neither feed caps the requested size: a grouped limit above 100 or a page size of any magnitude is executed as asked. | registered | code › `activity.feed.service.ts:219-252` (cap only stops the refetch loop) · `validate.pagination.args.ts` (no upper bound) · test plan › `activity-logs-test-plan.md` "Uncapped / non-integer limit … no ticket found" | untested (see F6) |
| ACT-63 | Both feeds are for signed-in users only; an anonymous caller is refused. | anonymous | code › `activity.feed.resolver.queries.ts:36-41, 60-65` · `platform.service.authorization.ts:484-492` | untested |
| ACT-70 | "My spaces" lists, newest first, the spaces where the caller holds a direct space membership and has themselves acted, each with the caller's latest entry there; spaces reached only through a virtual contributor are left out; 20 by default. | registered | code › `src/services/api/me/me.service.ts:365-409` · `activity.service.ts:320-389` · `schema.graphql:4672, 5495-5498` | untested |
| ACT-71 | The caller's space memberships (flat or hierarchical) are ordered by activity attributed to the top-level space: spaces where the caller acted most recently first, then spaces where others acted most recently, then the rest. | registered | code › `me.service.ts:203-218, 343-363` · `activity.service.ts:391-427` · `src/domain/space/space/sort.spaces.by.activity.ts:4-50` · `src/platform/activity/create.latest.activity.per.space.ts:7-62` | untested |
| ACT-72 | Hidden entries (deleted comments) still count for "my spaces" and for the membership ordering, although the log and the feeds no longer show them. | registered | code › `activity.service.ts:320-341, 400-416` (no visibility predicate) vs `:130-135, 170-173, 234-236` | untested (see F7) |
| ACT-73 | The MCP "community activity summary" tool reads the same rows for the caller's member spaces and readable descendants: visible entries only, at most 100 (default 20), within the last 1–365 days (default 30). | registered via MCP | code › `src/services/mcp-server/tools/community-activity-summary.tool.ts:75-79, 134-146, 360-388` | untested (MCP not routed on the test env) |

### B. Rights: evidence

Evidence: `activity.log.resolver.queries.ts:276-293`; `activity.feed.resolver.queries.ts:36-41, 60-65`; `platform.service.authorization.ts:484-492` (READ_USERS = `GLOBAL_REGISTERED`); `activity.feed.service.ts:118-135, 257-337` (scope = own space credentials); `me.service.ts:365-409`; access matrix `collaboration` (`access-matrix.md:1600-1665`: read CTS for every role incl. anonymous on the public canonical; `priv-applications` / `t-pub-priv` / `combined-apply` variants remove read for anonymous, guest, registered and 18–22 platform roles); crosscheck row 42 (`access-matrix-crosscheck.md:42`); legacy DDT rows (12 private/public × role cases across the three log files). "–" = not applicable to the role. The legacy suite reads as the harness admin by default; the DDT rows are the only role-attributed reads.

The legend of the former who-may table, kept for the record (section 2 spells the roles out):

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. The old file numbered the findings F-1 to F-10; they are F1 to F10 here, and "finding 4" or "open question 1" in the old text is F4 or OQ1._

#### Findings

- **F1 — Office-document contributions write no activity (ACT-04).** Code: `processActivityCollaboraDocumentCreated` only reports to Elasticsearch; no adapter method, no entry type. Test: none. Spec/knowledge: callout table CAL-30 lists "document created" among the typed entries; `docs/how-to-add-activity.md` expects every contribution kind in log, feed and grouped. Ruling: add the entry kind, or correct CAL-30 and accept that documents are invisible in the timeline.
- **F2 — Calendar entry text loses its first character (ACT-09).** Code: `profile.description?.substring(1, 100)` (`activity.adapter.ts:202-204`). Test/spec: none. Ruling: defect (should be `substring(0, 100)`); rebaseline the text shape when fixed.
- **F3 — "Whiteboard content modified" is a dead kind (ACT-12).** Code: no producer since `1650462ec` (#4973); enum, schema, builder and the client's exclusion filter remain. Test: the AF cases send the exclusion. Spec 024 `:37` still names it. Ruling: retire the kind (expected-loss list) or restore a producer from the collaboration service.
- **F4 — A top-level space's own entries come back as children (ACT-25).** Code: the L0 branch of `getChildCollaborationsOrFail` selects every space whose `levelZeroSpaceID` is the L0 — the L0 itself included (`space.service.ts:279-281`) — and `activityLog` flags any entry whose collaboration is in that list; the feed path dedups (`activity.feed.service.ts:321-324`), the log path does not. Test: no case uses `includeChild`. Ruling: defect; the client's "happened in a subspace" rendering is wrong for the parent's own entries.
- **F5 — Grouped feed ignores `excludeTypes` (ACT-58).** Code: the grouped input inherits the field; the service never passes it. Test: AF-14 sends it (via `baseArgs`) and asserts nothing about it. Ruling: implement or remove from the grouped input.
- **F6 — Uncapped feed sizes (ACT-62).** Code: grouped `limit` runs raw on the first query; `first` has no maximum. Test plan: pre-existing, "no ticket found". Ruling: cap (and make it a rebaseline constant) — the 100-row cap already exists for the refetch loop.
- **F7 — Hidden entries still drive "my spaces" and membership ordering (ACT-72).** Code: `getMySpacesActivity` and `getLatestActivitiesPerSpaceMembership` have no `visibility` predicate; the log, both feeds and the MCP tool filter it. Test/spec: none. Ruling: one visibility rule for every reader.
- **F8 — Post comments vs callout comments differ on draft callouts (ACT-06/07).** Code: a comment on a post is recorded whatever the callout's visibility; a comment in the callout's own discussion only when published and on a space. Test/spec: none. Ruling: one rule ("comments count only on published callouts") or document the asymmetry.
- **F9 — Non-user actors (ACT-14, ACT-10).** Code: VC and organisation comments/updates are skipped (FIXME); a VC joining a space is recorded with the admin as actor; a VC's own contribution via a resolver would reach `createActivity` with an empty actor id and fail the uuid constraint. Test: none. Spec: none. Ruling: should VC activity appear in the timeline, and as whose?
- **F10 — Append-only rows with no foreign keys (ACT-17, ACT-26, ACT-61).** Code: deletions leave rows behind; readers drop them one by one, so `limit` counts rendered entries and feed pages can be short with a wrong total. Register: W4 F8 counts ~8,100 dangling rows on ACC and proposes "drop dangling, counted". Ruling: cascade or tombstone at write time in the new core (decision 8 of the register).

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — What the four seeded entries are.** `space-activity-logs › should return only memberJoined` pins 4 entries on an L0 created with no community config, and `opportunity-activity-logs › should return empty arrays` pins 4 on a fresh L2; neither says which members (the L2's L1 config seeds 4 members, the L0 seeds none visibly). Check the scenario factory on the test stack before treating the count as a rule.
- **OQ2 — Whether the admin-assign path is ever exercised at L0.** The L0 case's own comment says the Slice B helper makes the assignee join as themself; the L1/L2 cases show a real admin assignment (`triggeredBy` = the admin). Confirm which path `assignRoleToUser(MEMBER)` takes per level on the test stack.
- **OQ3 — Two set-up slips in the legacy files.** `challenge-activity-logs:316-320` and `opportunity-activity-logs:329-333` pass a space id where a role-set id is expected, and `challenge-activity-logs:91-116` asserts `expect.arrayContaining([])` (always true). Decide whether to repair or retire these when the area moves to the new net.
- **OQ4 — Spec 054 (self-service account deletion, FR-022 "Former member").** The sentinel cites it; neither the server `specs/` nor agents-hq `specs/` holds it locally. Locate it (likely `origin/main` of agents-hq or a later server branch) to sign ACT-27's why.
- **OQ5 — Live confirmation of findings 4 and 7.** The child flag on a top-level space's own entries and the hidden-row leak into "my spaces" are code readings; nobody has watched either on a running stack.
- **OQ6 — The new core's grouping semantics.** The catalogue names "activity grouping (CT-12)" as a rebaseline candidate without saying what replaces actor × subject × type — ask the rebuild architect before ACT-57 is used as an oracle.
- **OQ7 — Whether comment entries can be exercised on the test env at all.** They arrive through the Matrix echo; the test env had no DNS for `matrix.test-alkem.io` on 2026-10-28 (memory) — the skipped multi-type cases may be red for environment reasons, not product ones.

### D. Test gaps

_For the Quality Lead (row GAPS in section 3)._

Untested rules by id: ACT-06, ACT-07, ACT-08, ACT-11, ACT-14, ACT-16, ACT-17, ACT-26, ACT-27, ACT-28, ACT-54, ACT-59, ACT-60, ACT-63, ACT-70, ACT-73; the unknown-why rows ACT-13, ACT-15, ACT-24, ACT-61, ACT-71; the disputed rows ACT-04, ACT-09, ACT-12, ACT-25, ACT-58, ACT-62, ACT-72; plus the untested clauses of ACT-01 (re-publication writes again), ACT-03 (link, whiteboard, memo entries), ACT-05 (draft and knowledge-base contributions), ACT-10 (organisation and VC joiners), ACT-23 (types filter; hidden entries), ACT-43 (same-L0 conversions; nothing on the new parent), ACT-57 (the grouping itself; default 10).

Behaviours the area has that neither reading nor tests pinned down:
- The three skipped multi-type cases (callout published + post + post comment + discussion comment + whiteboard created in one log) — the only cases that would read comment entries at all; they also pass the callouts-set id as the collaboration id at L0.
- An anonymous caller refused the log and both feeds (every DDT row is a signed-in persona).
- `includeChild` on a top-level space with a private subspace: the private subspace's entries excluded for a non-member, included for a member, and the `child` flag on each.
- A removed comment disappearing from the log and from both feeds (ACT-13) — and the stale live row in a subscribed client (SUB-21).
- A deleted callout / post / subspace / user and what the log then shows (ACT-26/27).
- "My spaces" content and order, and the membership ordering after activity in a subspace (attributed to the top-level space).
- The grouped collapse (two comments by one user on one post → one row) and the default of 10.
- The role filter and the types/excludeTypes filters on the paginated feed; paging backwards (`last`/`before`) — the test plan notes the DESC window is empty.
- A subspace created → entry on the parent (ACT-11) with its name; a calendar event → entry (ACT-09); an update sent → entry (ACT-08).
- The MCP tool (needs `/rest/mcp` routed on the test env).
- Audit: none of the activity reads or writes record a platform audit row (reads are not platform-role actions) — nothing to pin.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values and user-facing copy, Technical Lead for engineering limits and wire shapes, Security Lead for security limits. The "product must rule?" column is unchanged: the reviewer ticks the rows product must rule on. "F-3" in the tick column is finding F3._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Entry types (12) | `CALLOUT_PUBLISHED`, `CALLOUT_POST_CREATED`, `CALLOUT_POST_COMMENT`, `CALLOUT_WHITEBOARD_CREATED`, `CALLOUT_WHITEBOARD_CONTENT_MODIFIED` (dead), `CALLOUT_LINK_CREATED`, `CALLOUT_MEMO_CREATED`, `DISCUSSION_COMMENT`, `UPDATE_SENT`, `MEMBER_JOINED`, `SUBSPACE_CREATED`, `CALENDAR_EVENT_CREATED` | `activity.event.type.ts:3-16`; `schema.graphql:48-61` | F-3 | Technical Lead |
| Wire values | `callout-published`, `post-created`, `post-comment`, `whiteboard-created`, `whiteboard-content-modified`, `callout-link-added`, `memo-created`, `discussion-comment`, `update-sent`, `member-joined`, `subspace-created`, `calendar-event-created` | `activity.event.type.ts:4-15` | | Technical Lead |
| Actions with no entry | space created, callout created as draft, draft/knowledge-base/Form contributions, office-document contribution, lead/admin grants, organisation memberships, VC/organisation comments and updates, callout/post/whiteboard edits, reactions, deletions, moves (destination side) | § rules ACT-02/04/05/10/14/29/43 | F-1, F-9 | Product Lead |
| Description shapes | published `[<callout name>] - <callout description>`; post `[<post name>] - <post description>`; link `[<callout name>] - <link name>`; whiteboard `[<name>]`; memo `[<name>]`; comment / discussion / update = the message text; member joined = the joiner's id; subspace = its display name; calendar `[<event name>] - <description from 2nd char, ≤100>` | `activity.adapter.ts:85, 110, 133, 176, 202-204, 238, 260, 286, 316, 350, 371, 445` | F-2 | Product Lead |
| Text truncation | 128 chars with `...` (column allows 512) | `activity.service.ts:34-37`; `entity.field.length.constants.ts:4-5` | | Product Lead |
| Message id length | 44 | `entity.field.length.constants.ts:12` | | Technical Lead |
| Actor type | user id only (`triggeredBy` uuid NOT NULL) | `activity.entity.ts:19-20`; `room.service.events.ts:31-60` | F-9 | Technical Lead |
| Deleted-author tombstone | display name `Former member`, id `00000000-0000-0000-0000-000000000000` | `deleted.user.sentinel.ts:12, 18` | | Product Lead |
| Hidden entries | `visibility = false` on comment removal; readers filter `visibility = true` (log, feeds, MCP); `me.*` paths do not | `activity.service.ts:64-70, 130-135, 170-173, 234-236, 320-341, 400-416` | F-7 | Technical Lead |
| Child scope | L0 → every space with the same top-level id (self included); L1 → direct subspaces; L2 → none | `collaboration.service.ts:256-320`; `space.service.ts:279-281` | F-4 | Technical Lead |
| Feed credential kinds | `space-admin`, `space-lead`, `space-member`, `space-subspace-admin` → roles `admin`, `lead`, `member`, `subspace-admin`; filterable roles `MEMBER`, `ADMIN`, `LEAD` | `group.credentials.by.entity.ts:29-35, 77-82`; `activity.feed.roles.enum.ts:3-7` | | Technical Lead |
| Paginated page | default 25; `first`/`last` > 0; `after` needs `first`, `before` needs `last`; not both | `relay.style.pagination.fn.ts:24, 107`; `validate.pagination.args.ts:12-44` | F-6 | Technical Lead |
| Grouped defaults | default 10; refetch cap 100; grouping key actor × subject × type, latest by row id | `activity.feed.service.ts:219-220`; `activity.service.ts:280-282` | F-6 | Product Lead (default, grouping) · Technical Lead (cap) |
| "My spaces" | default 20, raw fetch 2 × limit, direct space credentials only | `me.service.ts:367, 371-372, 385-390` | | Product Lead |
| Membership ordering | own latest → others' latest → none; attributed to the top-level space | `sort.spaces.by.activity.ts:4-50`; `me.service.ts:357-360` | | Product Lead |
| MCP tool bounds | limit 1–100 (default 20), daysBack 1–365 (default 30) | `community-activity-summary.tool.ts:134-146` | | Technical Lead |
| Client-side exclusion | `CALLOUT_WHITEBOARD_CONTENT_MODIFIED` excluded by the dashboard feed | test › `activity-feed.it-spec.ts:289-290`; spec › 024 `:37` | F-3 | Product Lead |
| Activity score window (explore / 024) | 7 days (most active), 30 days (last active in) | spec › 024 `:25`; journey › JRN-64 | | Product Lead |
| Error text — log, not a member | `Authorization: unable to grant 'read' privilege: Collaboration activity query: <actorID> user: <actorID> on authorization <id> of type 'collaboration'` (test pins `Authorization`) | `activity.log.resolver.queries.ts:288-293`; `authorization.service.ts:44` | | Technical Lead |
| Error text — anonymous | `Authorization: unable to grant 'read-users' privilege: Collaboration activity query READ_USERS: …` / `Activity feed query: …` | `activity.log.resolver.queries.ts:276-281`; `activity.feed.resolver.queries.ts:36-41` | | Technical Lead |
| Error text — pagination | `Parameter "first" needs to be positive.`, `Cursor "after" requires having "first" parameter.`, `Using both "first" and "last" parameters is discouraged.` | `validate.pagination.args.ts:13-43` | | Technical Lead |
| Render failure | entry dropped, `Unable to process activity entry <id>: <error>` (warn) | `activity.log.service.ts:231-234` | | Technical Lead |
| Unknown type | `Unable to determine activity log entry type for <id>: <type>` | `activity.log.entry.interface.ts:51-54` | | Technical Lead |
| Dangling rows (ACC) | collaboration gone 911, resource gone ~2,800, author deleted 4,405 | register › W4 F8 | | Technical Lead |
| GraphQL surface | queries `activityLogOnCollaboration(queryData: ActivityLogInput!)`, `activityFeed(first, after, last, before, args: ActivityFeedQueryArgs)`, `activityFeedGrouped(args: ActivityFeedGroupedQueryArgs)`, `me.mySpaces(limit)`, `me.spaceMembershipsFlat`, `me.spaceMembershipsHierarchical(limit)`; interface `ActivityLogEntry` + 12 concrete types; `ActivityFeed{activityFeed, pageInfo, total}`; `MySpaceResults{latestActivity, space}`; subscription `activityCreated` (SUB-10) | `schema.graphql:48-67, 1209-1230, 1404-1413, 1415-1740, 4672-4720, 5495-5498, 6291-6307, 7423, 8435-8495` | | Technical Lead |

### F. Where this lands in the new core

The catalogue's CT-12 row ("Activity log and activity feed") says: append-only activity, partitioned; counts at read; `activityCreated` unreached; API coverage full, the UI feed absent from the nightly; grouping semantics are a named rebaseline candidate. Every rule above stays valid as a behaviour (what writes an entry, who may read it, scope of the feeds, what moves with a callout) and only the storage changes: the twelve entry kinds become one typed row keyed by the recursive `post` document (callout / contribution / comment collapse into post kinds, so ACT-03/06/07 become one rule with a kind), membership entries hang off the credential on the space, and the per-collaboration log becomes a query on the space document with the SQL authorization verdict deciding visibility — which closes F-4 (child flag) and F-7 (hidden rows) for free if visibility is a column the verdict reads. Four facts found here should shape the model: (1) the row has no foreign keys and ~8,100 dangling rows on ACC (ACT-17, W4 F8) — the new core must decide between cascading deletes and tombstones at write time, not drop at read time (ACT-26/61); (2) the grouped feed's actor × subject × type collapse (ACT-57) and the uncapped limits (ACT-62) are the rebaseline; (3) only user actors are recorded (ACT-14) — the actor model of the new core makes a VC author a first-class actor, so product must say whether VC activity appears; (4) the dead `CALLOUT_WHITEBOARD_CONTENT_MODIFIED` kind (ACT-12) and the missing office-document kind (ACT-04) go to the expected-loss / rebaseline list. The live push (SUB-10) is dropped with the rest of the subscriptions.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/activity-logs/`, 5 files, 55 cases, 3 skipped); the specs, issues and docs listed in § Sources. Scope: which actions write an activity entry and what it carries, the per-collaboration log, the two platform feeds (paginated and grouped), the "my spaces" / membership ordering that the same rows drive, and what happens to entries on transfers, moves and deletions. The live push of new entries (`activityCreated`) is in the subscriptions table (SUB-10). WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout. The single why was split over three columns without rewording, the who-may table was rebuilt as section 2, and every finding, open question and rule without a stated reason became a row in section 3 with an owner.


2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. A restating why with no source was dropped where a sourced one remains (ACT-06). ACT-01 and ACT-02 now name the spec behind CAL-20. ACT-16 no longer counts server PR #5692 as its decision: that PR is the Postgres migration and states no reason. Spec 054 was found in agents-hq and answers OQ4.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/common/enums/activity.event.type.ts`; `src/common/constants/entity.field.length.constants.ts`; `src/common/utils/string.util.ts`
- `src/platform/activity/activity.entity.ts`, `activity.interface.ts`, `activity.service.ts`, `create.latest.activity.per.space.ts`
- `src/services/adapters/activity-adapter/activity.adapter.ts` + `dto/*`
- `src/services/api/activity-log/activity.log.service.ts`, `activity.log.builder.service.ts`, `activity.log.resolver.queries.ts`, `activity.log.resolver.subscriptions.ts`, `dto/activity.log.dto.collaboration.input.ts`, `dto/activity.log.entry.interface.ts`, `dto/activity.log.dto.entry.*.ts`
- `src/domain/activity-feed/activity.feed.service.ts`, `activity.feed.resolver.queries.ts`, `activity.feed.query.args.ts`, `activity.feed.grouped.query.args.ts`, `activity.feed.roles.enum.ts`, `activity.feed.interface.ts`
- `src/services/api/roles/util/group.credentials.by.entity.ts`; `src/services/api/me/me.service.ts`, `me.resolver.fields.ts`, `space.membership.type.ts`; `src/domain/space/space/sort.spaces.by.activity.ts`, `space.service.ts`
- `src/domain/collaboration/callout/callout.resolver.mutations.ts`; `src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts`; `src/domain/collaboration/callout-transfer/callout.transfer.service.ts`; `src/domain/collaboration/collaboration/collaboration.service.ts`
- `src/domain/communication/room/room.service.events.ts`; `src/services/event-handlers/internal/message-inbox/message.notification.service.ts`, `message.inbox.service.ts`
- `src/domain/access/role-set/role.set.service.ts`, `role.set.service.events.ts`; `src/domain/space/space/space.resolver.mutations.ts`; `src/domain/timeline/calendar/calendar.service.ts`; `src/services/api/conversion/conversion.service.ts`
- `src/domain/community/user/account-deletion/deleted.user.sentinel.ts`; `src/platform/platform/platform.service.authorization.ts`; `src/core/authorization/authorization.service.ts`
- `src/core/pagination/pagination.fn.ts`, `relay.style.pagination.fn.ts`, `validate.pagination.args.ts`
- `src/services/mcp-server/tools/community-activity-summary.tool.ts`
- `schema.graphql`; `docs/how-to-add-activity.md`
- git: `f26856ab0` (#6049), `a59321a43` (#6292), `656bec3df` (#6416), `3c88578cc` (#6643), `6f68dbc83` (#6639), `1650462ec` (#4973), `a5bb5985b` (#3694), `76be14378` (#5592), `63b6b3ed6` (#5692), `9f17a5e54` (#3718), `5f5687454` (#3720), `f7d315d70` (#2741)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/activity-logs/space-activity-logs.it-spec.ts`, `challenge-activity-logs.it-spec.ts`, `opportunity-activity-logs.it-spec.ts`, `activity-log-on-transfer-conversion.it-spec.ts`, `activity-feed.it-spec.ts`, `activity-log-params.ts`, `activity-logs-test-plan.md`
- `server-api/vitest.config.ts:54-56, 235` (project + nightly)
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ collaboration), `access-matrix-crosscheck.md` (row 42), `journey.md` (JRN-12, JRN-47, JRN-64), `callout.md` (CAL-20, CAL-25, CAL-30, CAL-49, CAL-70), `communications.md` (COM-11); `data-integrity/acc-defect-register.md` (F8, F9)
- Other suites touching the area (list only): dossier § 3

Specs / issues:
- `agents-hq/specs/024-non-activity-home/spec.md` (clarifications `:25-37`, FR-006/007/008/020)
- `agents-hq/specs/030-move-subspace-parent/spec.md` (`:27`, `:194`); server `specs/083-cross-space-moves/spec.md:216`
- server issues #6640 → PR #6643; #6561 → PR #6639; client-web#10403; server#6023, #4971, client-web#7947; server#3626 (magic number); #6292; #6416 (054)
- `server/docs/how-to-add-activity.md`; `server/specs/049-ut-domain-activity-feed/spec.md` (unit-test scope only)
- `agents-hq/specs/054-delete-own-account/spec.md` FR-022 (found in the whys pass, 2026-11-20); server PR #5692 (read: the Postgres migration, no stated reason for background writes)
