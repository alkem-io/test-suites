# Task boards: behaviour rules

_What the platform does today for the Tasks board, a kind of posts callout: its columns, tasks and their columns, moving and reordering tasks, managing columns, counts, templates, deletion and analytics. The ordinary callout rules are in `callout.md` and are only referred to. The file follows the three-section layout: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 4 · Technical Lead 2 · Quality Lead 5 · Architecture Lead 1. By state: 11 open · 1 with a suggested answer. Proof of the 21 rules: 3 proven by a test · 18 untested (Appendix A)._

_Whys of the 21 rules: 20 rest on a source · 1 carries a draft for product to decide (TSK-17) · 0 have none._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question or a defect marker in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, or an issue. "Not decided: exists in the code" means the behaviour exists in the code and nobody chose it. "Not decided: a defect" means today's behaviour is a fault. Product has not reviewed this file yet.
- A marker in bold at the end of a rule points at section 3: **(open: F1)** means a question on this rule is still open, **(defect: F…)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F…)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Board model

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| TSK-01 | A Tasks board is an ordinary posts callout with a board marker, and a task is an ordinary post that carries its column. A callout without the marker behaves exactly as before. | — | — | No new callout type, no new service, one additive migration — "a simple implementation we can iterate on" (042 FR-001/002/008, D-01 operator ruling; PR #6391). | Spec 042 FR-001/002/008, D-01; server PR #6391 |
| TSK-02 | A board's columns are one ordered list of names. A column is known only by its name, and the first column is the default. | — | — | Column identity = display name, mirroring flow states (042 FR-004, D-11: one per-board definition shared by the marker and every task). | Spec 042 FR-004, D-11 |

### Creating a board and its tasks

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| TSK-03 | A board can only be created as a callout that accepts posts and nothing else. Whether a callout is a board is decided when it is created, also from a template, and never changes afterwards. | Tasks are posts; converting an existing callout to or from a board is out of scope (042 FR-006/007). | — | — | Spec 042 FR-006/007 |
| TSK-04 | A board created without columns starts with To Do, In Progress and Done, in that order. A board always has at least one column. | The leanest useful set — `Backlog` was dropped because most teams renamed or deleted it at once (042 FR-005 as refined 2026-08-24, refinements §1). | — | — | Spec 042 FR-005; refinements §1 |
| TSK-05 | A board can only be made through the board option at creation. A board marker slipped in any other way is removed and makes no board. **(open: F2, OQ1)** | — | — | One entry point to board mode so a template round-trip or a hand-crafted create cannot produce a half-configured board (042 FR-024, D-08). | Spec 042 FR-024, D-08 |
| TSK-06 | Every task gets exactly one column when it is created: the column asked for, or else the first column. Asking for a column the board does not have is refused and nothing is created. | — | — | An invalid column must not orphan a post (042 FR-009/010; service comment). | Spec 042 FR-009/010 |

### Moving tasks

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| TSK-07 | Moving a task changes only its column. Moving it to the column it is already in changes nothing. A move to a column the board does not have, or of something that is not a task on a board, is refused. | — | — | A dedicated operation, not the cross-callout move: it must never widen that move's right nor downgrade the classification right (042 FR-011/014). | Spec 042 FR-011, FR-014 |
| TSK-08 | A move and a column change made at the same moment never mix: a task always ends up in exactly one existing column. When two people move the same task, the last move wins. | — | — | A task validated against a stale column list must never land in a deleted column (042 FR-015, US2-AS7/AS8, US4-AS8). | Spec 042 FR-015 |
| TSK-09 | Anyone who may contribute to a board may move any task on it, also tasks created by others. This right only moves tasks: it does not allow editing another member's task or moving a post to another callout. **(open: F3)** | Member-executable move is "the single load-bearing new capability"; on today's platform every reuse path for this write is admin-only (042 US2, why this priority). | — | Every reuse path was admin-only (042 US2, FR-012/013, D-02 operator ruling; dissent DIS-3 recorded). | Spec 042 US2, FR-012/013, D-02 |
| TSK-10 | Reordering the tasks on a board needs the same right as moving a task, so any board member may reorder. On a callout that is not a board, reordering stays an admin edit. **(open: OQ4)** | — | — | Within-column drag ordering was delivered in iteration; members got a denial on in-column reorder while cross-column moves silently dropped the position write (042 refinements §2, superseding D-09). | Spec 042 refinements §2 (supersedes D-09) |

### Column administration

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| TSK-11 | A column name is not empty, is at most 128 characters, has no comma, and is unique on the board whatever the capitals. A board has at most 20 columns. **(open: F1)** | — | — | The column list is stored comma-delimited (a comma would corrupt it); case-insensitive uniqueness mirrors the flow-state rule because classification filters match case-insensitively (042 FR-017, D-04); the cap bounds the per-board counts returned on every query (constants comment). | Spec 042 FR-017, D-04. The cap of 20 is not decided: exists in the code |
| TSK-12 | A new column is added after the last one. Renaming a column keeps every task in it. Reordering columns must name every column exactly once and moves no task. | — | — | One discrete operation per action so a rename is never mistaken for delete + add, which would trigger the destructive reflow (042 FR-016/018/020, D-07). | Spec 042 FR-016/018/020, D-07 |
| TSK-13 | Deleting a column moves its tasks to the first column in the same step, so a task is never without a column. The first column cannot be deleted. | — | — | The feature's only destructive bulk write; the flow-state analogue is non-transactional at the wrong grain, so this one reimplements it in one transaction with a first-column guard (042 FR-019, D-03 council non-negotiable). | Spec 042 FR-019, D-03 |
| TSK-14 | Only people who may edit the callout add, rename, delete or reorder columns: Space admins and Platform Content Full Access. A member is refused and nothing changes. | Configuring the board's columns is an admin capability, distinct from the member-held move (042 FR-016; resolver comment). | — | — | Spec 042 FR-016 |

### Counts and reading

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| TSK-15 | Every board shows a task count per column, in board order, with zero for an empty column. A callout that is not a board has no counts. | — | — | Counters must not depend on the unpaginated card list, and N boards must not cost N queries (042 FR-022, D-01; loader comment). | Spec 042 FR-022, D-01 |
| TSK-16 | Whoever may read the callout may read the board, its columns, its counts and each task's column, also a visitor on a public Space. Reading never needs the right to move. | A board is read-only for every viewer with read access (042 US1-AS4). | — | — | Spec 042 US1-AS4 |

### Moving posts, deletion, templates

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| TSK-17 | A post moved into a board becomes a task in its first column. A task moved to an ordinary callout loses its column. A task moved to another board lands in that board's first column. **(open: Q-TSK-17)** | A moved post must still be a valid task on its new board, so it takes the default first column (TSK-06); off a board a column means nothing. _(draft)_ | — | — (service comment only: "only POST contributions can be tasks") | Not decided: exists in the code |
| TSK-18 | Deleting a board deletes its tasks, as for any posts callout, and leaves nothing behind. | — | — | Deleting a board used to fail on a foreign-key violation from the marker tagset; the column definition is a standalone row owned by the board alone (042 FR-033, refinements §7; server#6614). | Spec 042 FR-033; server#6614 |
| TSK-19 | A board saved as a callout template keeps that it is a board and its columns in order. A callout created from that template is a board with those columns and no tasks. | Parity with posts-response callout templates (042 FR-023, D-08). | — | — | Spec 042 FR-023, D-08 |

### Analytics and side effects

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| TSK-20 | Analytics count boards, tasks and comments on tasks separately from callouts, posts and comments. The activity feed still shows a task as an ordinary post. **(open: F4)** | Boards, tasks and task replies were indistinguishable from callouts, posts and comments in the analytics series, inflating those counts with no field to filter on (062 FR-001..005; no activity-feed change by decision). | — | — | Spec 062 FR-001..005 |
| TSK-21 | A board sends no notification and no live update, and needs no licence. A move or a new task shows for other people on their next load. Any admin who may create a posts callout may create a board. | MVP scope decisions (042 Assumptions). | — | — | Spec 042 Assumptions |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under the table. Row ids W1–W7 are new. No test exercises any cell. Evidence is in Appendix B. The ordinary callout and post rights are in `callout.md`._

| ID | Action | Platform roles | Space admin | Admin of a Space above | Space lead | Space member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Create a board | Y¹ | Y | Y² | Y³ | Y³ | N | N |
| W2 | Add a task to a board | Y¹ | Y | Y | Y | Y | N⁴ | N |
| W3 | Move a task between columns | Y⁵ | Y | Y | Y | Y⁶ | N | N |
| W4 | Reorder tasks on a board | Y⁵ | Y | Y | Y | Y | N | N |
| W5 | Add, rename, delete or reorder columns | Y¹ | Y | Y | N | N | N | N |
| W6 | Edit another member's task | see ⁷ | Y | Y | N | N | N | N |
| W7 | Read the board, its columns and counts | Y | Y | Y | Y | Y | Y⁸ | Y⁸ |

"Space admin" is an admin of the Space the board is in. Creating a board is creating a posts callout with the board option; adding a task is contributing a post. ¹ Platform Content Full Access only. ² The admin of the top-level Space, for a board in a Subspace or sub-subspace. ³ Only where the Space lets members create callouts. ⁴ Yes on a public Space that allows guest contributions. ⁵ Platform Content Full Access; Platform Support on a Space that allows platform support as admin. ⁶ Any task, not only their own. ⁷ As the post rules in `callout.md` say. ⁸ On a public Space only.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 4 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Columns | decision | The spec says a board has no maximum number of columns; the code stops at 20. Is 20 the product number? If so, spec 042 D-10 is amended. | Product Lead (Technical Lead amends the spec) | — | open |
| OQ3 | Creating | decision | Does a board belong in a virtual contributor's knowledge base? Nothing stops it today and no product statement exists. | Product Lead | — | open |
| OQ4 | Moving | decision | Is the order of tasks inside a column a promise? Nothing says whether a new task appears first or last in its column. | Product Lead | — | open |
| Q-TSK-17 | Templates | decision | Why does this rule exist? No source says why a post moved into a board lands in the first column and a task moved out loses its column. | Product Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 18 constants are still blank in "product must rule?" (Appendix E): storage shapes, rights and the GraphQL surface for the Technical Lead; default columns, name limits and error texts for the Product Lead. | Technical Lead, Product Lead | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 2 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Creating | check | Can a later edit remove or rewrite the board marker? The spec says no path may; the code was not followed to the end. Trace it and pin it with a case, or record that the marker goes only with the callout. | Technical Lead (Quality Lead adds the case) | — | open |
| CONST | All | decision | 18 constants are still blank in "product must rule?" (Appendix E): storage shapes, rights and the GraphQL surface for the Technical Lead; default columns, name limits and error texts for the Product Lead. | Technical Lead, Product Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Columns | decision | The spec says a board has no maximum number of columns; the code stops at 20. Is 20 the product number? If so, spec 042 D-10 is amended. | Product Lead (Technical Lead amends the spec) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 5 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Moving | test | No legacy test moves a task as a member, refuses a non-member, or deletes a column that holds tasks; the one green case only deletes a board. Does this become a W2 journey? | Quality Lead | — | open |
| OQ1 | Creating | check | Can the general classification update drop or rename the board marker? One live call settles it (feeds F2). | Quality Lead | — | open |
| OQ2 | Moving | check | Which error does a non-member get when moving a task? Expected "forbidden", as for the sidebar; never observed. | Quality Lead | — | open |
| OQ5 | All | check | Specs 042 and 062 were read from origin/main because the local agents-hq clone is behind. Update the clone before this file is signed. | Quality Lead | — | open |
| GAPS | All | test | 19 rules have no test and 8 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Creating | check | Can a later edit remove or rewrite the board marker? The spec says no path may; the code was not followed to the end. Trace it and pin it with a case, or record that the marker goes only with the callout. | Technical Lead (Quality Lead adds the case) | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Analytics | contract | A task shows as "post created" in the activity feed and as "task created" in analytics, on purpose (spec 062). Does the new core keep both as they are? | Architecture Lead | Accepted as it is. Recorded so that the new core's single event registry does not change one side without a decision. | suggested |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›` or `matrix ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| TSK-01 | A Tasks board is an ordinary posts callout carrying the reserved `task` classification; nothing else marks it, and a callout without the marker behaves and is stored exactly as before. A task is a post contribution whose own classification carries the same `task` tagset naming its column. | space admin, space member | code › `src/domain/collaboration/callout/task-board/task.board.service.ts:20-49` · `task.board.constants.ts:11-15` · `src/migrations/1787315924637-TaskBoardContributionClassification.ts:1-33` · test › `orphan-free-deletion/callout-delete-owned-records` › `CD-2 - deleting a Tasks-board callout …` (marker `task` present after create) · spec › `agents-hq/specs/042-kanban-task-board/spec.md` FR-001, FR-002, FR-008 | proven (marker); task-level marker untested |
| TSK-02 | A board's columns are one ordered list of names held on the board's own column definition; a column has no identity beyond its name; the first column is the default. | server | code › `task.board.service.ts:51-68` · `src/domain/collaboration/callout/callout.service.ts:362-370` · spec › 042 FR-004, D-11 | untested |
| TSK-03 | A board can only be created as a callout that accepts post contributions and nothing else; any other contribution configuration is refused with "A Tasks board callout must allow only POST contributions". Board-ness is decided at creation (also from a template) and never changes afterwards. | space admin | code › `callout.service.ts:336-354` · spec › 042 FR-006, FR-007 | untested |
| TSK-04 | A board created without columns starts with `To Do`, `In Progress`, `Done` in that order; a supplied list is used in its order after validation (TSK-09); a board always has at least one column ("A task board must keep at least one column"). | space admin | code › `task.board.constants.ts:1-9` · `callout.service.ts:356-360` · `task.board.service.ts:139-146` · test › `callout-delete-owned-records` › `CD-2` (≥1 column after a bare create) · spec › 042 FR-005; `refinements.md` §1 | untested (CD-2 proves only "non-empty") |
| TSK-05 | A `task`-named tagset smuggled through the generic classification input never makes a board: it is stripped before the classification is built; only the explicit board block creates board state. | space admin | code › `callout.service.ts:202-219, 310-324` · spec › 042 FR-024, FR-034 | untested — see finding 2 |
| TSK-06 | Every task gets exactly one column at creation: the column named in the request (matched case-insensitively, stored in the board's spelling) or else the first column; naming a column that is not on the board is refused with "The requested task column does not exist on this Tasks board" before any content is created; naming a column on a callout that is not a board is refused with "A task column can only be set on a Tasks board callout"; a contribution off a board carries no column. | space member | code › `src/domain/collaboration/callout-contribution/callout.contribution.service.ts:194-201, 253-295` · `callout.service.ts:1205-1218` · spec › 042 FR-009, FR-010, US3-AS2/AS3 | untested |
| TSK-07 | Moving a task changes only its column: the target is matched case-insensitively to an existing column, moving to the column it already occupies succeeds as a no-op, and a contribution that is not a task on a board ("This contribution is not a task on a Tasks board") or an unknown column ("The requested task column does not exist on this Tasks board") is refused with nothing changed. | space member | code › `task.board.move.service.ts:29-139` · `task.board.resolver.mutations.ts:22-61` · spec › 042 FR-011, FR-014, US2-AS4/AS5/AS6 | untested |
| TSK-08 | A move holds the board's column definition locked while it validates and writes, so a move and a concurrent column rename, delete or reorder never interleave, and two moves of one task end with the task in exactly one column (the last to commit wins). | server | code › `task.board.move.service.ts:85-125` · `task.board.column.service.ts:183-196` · spec › 042 FR-015 | untested |
| TSK-09 | Anyone who may contribute to the board may move any task on it — including tasks created by others — and so may anyone who may update the callout; the right exists only on boards and grants moving only: it never allows editing another member's task or moving a post to another callout. | space member, space admin, PCFA | code › `callout.service.authorization.ts:125-132, 357-377` · `src/common/constants/authorization/policy.rule.constants.ts:17-21` · `src/common/enums/authorization.privilege.ts:46` · matrix › `access-matrix.md:193, 196, 200` (`callout[task-board]@L0/L1/L2`) · spec › 042 FR-012, FR-013, D-02 | untested (server integration specs only) |
| TSK-10 | Reordering the tasks of a board (the contributions' sort order) needs the same move right as a column move, so a plain board member may reorder; on a callout that is not a board reordering stays an admin edit. | space member | code › `src/domain/collaboration/callout/callout.resolver.mutations.ts:1061-1092` · spec › 042 `refinements.md` §2 | untested (cross-ref CAL-18) |
| TSK-11 | Column names on every edit path are trimmed and non-empty ("A task board column name cannot be empty"), at most 128 characters ("A task board column name is too long"), comma-free ("A task board column name cannot contain a comma") and unique case-insensitively within the board ("A task board column with this name already exists"); a board holds at most 20 columns ("A task board cannot exceed the maximum number of columns"). | space admin | code › `task.board.service.ts:82-160` · `task.board.column.service.ts:37-54` · `task.board.constants.ts:17-22` · spec › 042 FR-017, D-04, US4-AS6 | untested (see F1) |
| TSK-12 | Adding a column appends it after the last; renaming a column keeps every task in it (its tasks follow the new spelling in the same step), renaming to the same spelling changes nothing, and a rename to a case variant of the column's own name is allowed; reordering must name every existing column exactly once ("A task board reorder must list every column exactly once", "A task board reorder cannot list a column twice", "That task board column does not exist") and moves no task. | space admin | code › `task.board.column.service.ts:37-85, 112-147, 239-276` · spec › 042 FR-016, FR-018, FR-020, US4-AS1/AS2/AS3 | untested |
| TSK-13 | Deleting a column moves every task in it to the first column and removes the column in one step — no state in which a task belongs to no column is ever visible, and a failure leaves everything as it was; the first column can never be deleted ("The first task board column is the default and cannot be deleted"). | space admin | code › `task.board.column.service.ts:87-110, 183-196, 216-231` · spec › 042 FR-019, D-03, US4-AS4/AS5 | untested |
| TSK-14 | Column administration (add, rename, delete, reorder) is reserved to whoever may update the callout — space admins and platform content-full-access; a member is refused and nothing changes. | space admin, PCFA | code › `callout.resolver.mutations.ts:341-346, 405-422` · matrix › `access-matrix.md:984-1062` (update column) · spec › 042 FR-016, US4-AS7 | untested |
| TSK-15 | Every board query carries per-column task counts: one entry per column in board order, zero for an empty column, computed server-side in one batched query across all boards on the page; a callout that is not a board reports no counts (null). | all readers | code › `src/core/dataloader/creators/loader.creators/callout/callout.task.column.counts.loader.creator.ts:175-310` · `callout.resolver.fields.ts:212-228` · test › `callout-delete-owned-records` › `CD-2` (counts non-null, ≥1 entry on a fresh board) · spec › 042 FR-022, US1-AS5 | proven (non-null on a board); order, zero-fill and the null for a non-board are untested |
| TSK-16 | Whoever may read the callout may read the board — its columns, counts and each task's column — including a non-member on a public space; reading never needs the move right. | anonymous, registered, members | code › `callout.resolver.fields.ts:212-213, 240-246` · spec › 042 US1-AS4 | untested |
| TSK-17 | A post moved into a board from another callout becomes a task in the board's first column; a task moved out to an ordinary callout loses its column; a task moved from one board to another lands in the destination's first column. | callout admin | code › `src/domain/collaboration/callout-contribution/callout.contribution.move.service.ts:150-186` | untested (cross-ref CAL-33) |
| TSK-18 | Deleting a board deletes its tasks exactly as deleting a posts callout does, and removes the board's column definition last so nothing is left behind; the classification and marker tagset of the board are gone afterwards. | space admin | code › `callout.service.ts:856-945` · test › `callout-delete-owned-records` › `CD-2 - deleting a Tasks-board callout succeeds and removes its classification, including the board marker tagset` · spec › 042 FR-033 | proven |
| TSK-19 | Saving a board as a callout template captures board-ness and its ordered columns; a callout created from that template is a board with those columns and no tasks; a template without the marker never produces a board. | space admin | code › `src/services/api/input-creator/input.creator.service.ts:135-140, 201-210, 703-710` · `task.board.dto.create.ts:6-11` · spec › 042 FR-023, US5-AS2/AS3 | untested (cross-ref TPL-18) |
| TSK-20 | Creating a board records a `TASK_BOARD_CREATED` contribution event, creating a task records `TASK_CREATED` instead of a post-created event, and commenting on a task records `TASK_COMMENT_CREATED`; the activity feed keeps showing a task as an ordinary post created, and comments on the board itself stay ordinary callout comments. | server | code › `src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts:416` · `callout.resolver.mutations.ts:626-628, 980-1013` · `src/domain/communication/room/room.service.events.ts:293-297` · `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts:537-580` · spec › `agents-hq/specs/062-task-board-analytics/spec.md` FR-001..FR-006 | untested |
| TSK-21 | A board sends no notification, publishes no live update and needs no licence or entitlement: a move or a new task becomes visible to other viewers on their next load; any admin who may create a posts callout may create a board. | server | code › absence (no reader of `task-board/*` in notifications, subscriptions or licence services) · spec › 042 Assumptions | untested |

### B. Rights: evidence

_The evidence behind section 2, as extracted. The first line is the legend of the role shorthands the extraction used._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `callout.service.authorization.ts:125-132, 357-377` (MOVE_TASK ← CONTRIBUTE and ← UPDATE, boards only); `task.board.resolver.mutations.ts:30-55` (move checked on the parent callout's policy); `callout.resolver.mutations.ts:405-422` (column edits = UPDATE), `:1071-1086` (reorder = MOVE_TASK on a board); `callout.resolver.fields.ts:212-213` (counts = READ); access matrix `callout` type (`access-matrix.md:984-1062`) and its `callout[task-board]@L0/L1/L2` resources (`:193, 196, 200`): `move-task` via `contribute→move-task` for space-member/lead/admin at and below the board's level, via `update→move-task` for PCFA, ancestor admins and `creator-former-member`; `pub-open+support` gives platform-support contribute/update on the callout (`:174`), hence the move; "members may create callouts" and guest contribution are settings variants recorded in `callout.md` § Who may. "–" = not applicable to the role. No legacy case exercises any cell; the server's own `task.board.move.service.spec.ts` / `task.board.read.integration.spec.ts` are unit-level.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. Inside these texts a finding is written "F-3" or "finding 3"; section 3 calls it F3._

#### Findings

- **F1 — Column cap: spec says none, code says 20 (TSK-11).** Code: `MAX_TASK_BOARD_COLUMNS = 20` and `@ArrayMaxSize(20)` on the create input (`task.board.constants.ts:17-22`, `task.board.dto.create.ts:21`). Test: none. Spec 042 D-10: "no hard maximum column count for MVP … recorded as accepted residual risk"; PR #6391 lists the unbounded count as residual sec-server-1, so the cap landed afterwards and the spec was not amended. Ruling: confirm 20 as the product number and amend D-10.
- **F2 — The board marker's immutability is asserted, not enforced (TSK-05).** Code: no server path removes the `task` tagset, but the generic classification update on a callout (`classification.resolver.mutations.ts:19-37`, UPDATE on the classification; `classification.service.ts:166-183` through the callout update) can rewrite the callout-level `task` tagset's value and its tagset list; whether it can drop the marker was not traced to the end. Test: none. Spec 042 FR-034: "no later mutation path — including a generic classification update or a classification delete — may add or remove the `task` marker". Ruling: trace and pin with a negative case, or document the marker as removable only with the callout.
- **F3 — Zero legacy proof for the feature's primary actor.** Code grants any board member the move (TSK-09). Test: the only green case (CD-2) deletes a board; no case moves a task as a member, denies a non-member, or reflows a column. Spec 042 US2 "Independent Test" asks for exactly those three actors. Ruling: W2 journey candidate (catalogue: "cheap UI case") — the server's own `task.board.*.spec.ts` are unit-level and do not count.
- **F4 — A task's activity-feed entry and its analytics event disagree on purpose (TSK-20).** Code: the activity log records `calloutPostCreated` for a task while the reporter records `TASK_CREATED`. Spec 062: "no activity-feed change" by decision. Test: none. Ruling: accepted; recorded so the new core's single event registry does not "fix" it one way without a decision.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Can the generic classification update drop or rename the board marker?** (finding 2) `tagsetService.updateTagsets` was not read to the end; a live probe with `updateCallout` carrying a classification without the `task` tagset would settle it.
- **OQ2 — Which error a non-member gets on a move.** By analogy with the sidebar case it is `FORBIDDEN_POLICY`; not observed.
- **OQ3 — Does a board belong in a knowledge base?** No guard and no product statement either way.
- **OQ4 — Is the within-column order a contract?** Code renumbers contribution sort orders; the board persists drag order through the generic reorder (TSK-10); nothing says whether a new task must appear first or last in its column.
- **OQ5 — Spec availability.** `agents-hq/specs/042-kanban-task-board/` and `062-task-board-analytics/` exist only on `origin/main` (fetched 2026-11-06); the local clone of agents-hq is behind and does not carry them.

### D. Test gaps

_For the Quality Lead (row GAPS in section 3)._

Untested rules by id: TSK-02, TSK-03, TSK-04 (defaults beyond "non-empty"), TSK-05, TSK-06, TSK-07, TSK-08, TSK-09, TSK-10, TSK-11, TSK-12, TSK-13, TSK-14, TSK-15 (order, zero-fill, null off a board), TSK-16, TSK-17, TSK-19, TSK-20, TSK-21; plus the task-level marker clause of TSK-01.

Behaviours the area has that neither reading nor tests pinned down:
- A member moving another member's task, a non-member refused, an admin moving — the three actors of 042 US2 (finding 3).
- Column delete with 100+ tasks and an induced mid-operation failure (042 SC-003) — the transactional guarantee has no end-to-end proof.
- A move racing a column delete (042 US4-AS8) on a real database.
- A board inside a virtual contributor's knowledge base or a template set — the create passes the board block through for every callouts-set type; no guard, no test.
- A task whose stored column value no longer exists (spec says unreachable; the counter omits it, the client shows it in the first column).
- Rename to a case variant of the column's own name (allowed by code) and the sweep when two columns differ only in trailing spaces.
- Board template round-trip across spaces (042 US5-AS2) and a non-board template never producing a board (US5-AS3).
- The harness has no task-board lib function or document at all (`lib/src/scenario`): W2 must add create-board, create-task-in-column, move, column edits and a counts read-back before any walk can exist.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, defaults and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for access and audit values. The "product must rule?" column is as extracted: the reviewer ticks the rows product must rule on._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Board marker tagset name | `task` (`TagsetReservedName.TASK`; distinct from `flow-state`) | `src/common/enums/tagset.reserved.name.ts:9`; `task.board.constants.ts:15` | | Technical Lead |
| Default columns | `To Do`, `In Progress`, `Done` (first = default and reflow target) | `task.board.constants.ts:5-9`; 042 refinements §1 | | Product Lead |
| Maximum columns | 20 | `task.board.constants.ts:17-22`; `task.board.dto.create.ts:21` | F-1 | Product Lead |
| Column name length | ≤ 128 (`SMALL_TEXT_LENGTH`), trimmed, non-empty, no comma | `task.board.service.ts:93-131`; `entity.field.length.constants.ts:4` | | Product Lead |
| Column matching | case-insensitive, stored in the board's canonical spelling | `task.board.service.ts:70-80`; `tagset.template.utils.ts:78-99` | | Technical Lead |
| Column definition storage | one standalone `TagsetTemplate` per board, type `select-one`, no template set; `allowedValues` comma-joined, `defaultSelectedValue` re-pinned to the first column on every edit | `callout.service.ts:362-370`; `task.board.column.service.ts:216-231` | | Technical Lead |
| Task column storage | nullable unique `callout_contribution.classificationId` → `classification` (ON DELETE SET NULL), one `task` tagset with exactly one tag | migration `1787315924637`; `callout.contribution.service.ts:292-294` | | Technical Lead |
| Allowed contribution types on a board | exactly `[POST]` | `callout.service.ts:345-347` | | Technical Lead |
| Privilege | `move-task` (`MOVE_TASK`), granted by privilege rules `policyRule-calloutTaskMove` (from contribute) and `policyRule-calloutTaskMoveAdmin` (from update), boards only | `authorization.privilege.ts:46`; `policy.rule.constants.ts:17-21` | | Technical Lead |
| Column-admin privilege | `update` on the callout | `callout.resolver.mutations.ts:416-420` | | Technical Lead |
| Reorder privilege | `move-task` on a board, `update` elsewhere | `callout.resolver.mutations.ts:1077-1079` | | Technical Lead |
| Concurrency guarantee | `pessimistic_write` lock on the board's template row for every move and column edit | `task.board.move.service.ts:88-91`; `task.board.column.service.ts:184-187` | | Technical Lead |
| Error text — board create | `A Tasks board callout must allow only POST contributions` | `callout.service.ts:350` | | Product Lead |
| Error text — column names | `A task board column name cannot be empty` · `A task board column name is too long` · `A task board column name cannot contain a comma` · `A task board column with this name already exists` · `A task board cannot exceed the maximum number of columns` · `A task board must keep at least one column` | `task.board.service.ts:97-153`; `task.board.column.service.ts:44-48, 221-227` | | Product Lead |
| Error text — column edits | `This callout is not a Tasks board` · `The Tasks board has no column template` · `The Tasks board column template no longer exists` · `That task board column does not exist` · `The first task board column is the default and cannot be deleted` · `A task board reorder must list every column exactly once` · `A task board reorder cannot list a column twice` | `task.board.column.service.ts:98-101, 120-138, 165-194, 268-273` | | Product Lead |
| Error text — tasks and moves | `The requested task column does not exist on this Tasks board` · `A task column can only be set on a Tasks board callout` · `This contribution is not a task on a Tasks board` · `The task has no column marker to move` · `The task has no parent Callout` | `callout.contribution.service.ts:270, 285`; `task.board.move.service.ts:57-83`; `task.board.resolver.mutations.ts:43-47` | | Product Lead |
| Analytics event types | `TASK_BOARD_CREATED`, `TASK_CREATED`, `TASK_COMMENT_CREATED` | `src/services/external/elasticsearch/types/contribution.type.ts:31` + reporter `:537-580` | | Technical Lead |
| Counts contract | one entry per column, board order, zero-filled, `null` for a non-board; one grouped query per batch | `callout.task.column.counts.loader.creator.ts:175-226` | | Technical Lead |
| GraphQL surface | `Callout.taskColumnCounts: [TaskColumnCount!]`, `CalloutContribution.classification`, `TaskColumnCount{column, count}`, `CreateCalloutInput.taskBoard{columns}`, `CreateCalloutContributionInput.taskColumn`, mutations `moveTaskToColumn`, `createTaskColumnOnCallout`, `updateTaskColumnOnCallout`, `deleteTaskColumnOnCallout`, `updateTaskColumnsSortOrderOnCallout` (+ `updateContributionsSortOrder` on boards) | `schema.graphql:2129, 2138-2140, 5028, 5106, 5196, 5446, 5448, 7539-7544, 9453-9458, 9693-9700, 9948-9954, 11170-11185` | | Technical Lead |

### F. Where this lands in the new core

Catalogue CT-8 lands as "stage values on posts": callouts, contributions and posts become one recursive `post` with a kind, and tagsets/classifications become vocabulary + label. A board is then a post of kind *board* whose child posts carry a stage label from the board's own vocabulary; the standalone per-board tagset template, the marker tagset and the nullable `classificationId` all disappear. Every rule above stays a behaviour; what changes is where it is enforced. Three facts found here should shape the model: (1) the member-executable move is a distinct capability from editing a post (TSK-09, D-02) and must survive as its own intent mutation and credential rule rather than falling out of a generic "update label" right; (2) column identity is the display name today, which is why rename must re-point every task (TSK-12) — a stage id would make rename free and make TSK-11's case-insensitive uniqueness a plain unique constraint; (3) "first column is the default and reflow target and can never be deleted" (TSK-04, TSK-13) is an invariant of the vocabulary, not of any task. The analytics event split (TSK-20) must be reproduced by the registry-driven events or it is an expected loss.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy test suites (no `server-api/src/functional-api/task-boards/` folder exists — catalogue CT-8 is **absent**; the only legacy case touching a board is `orphan-free-deletion/callout-delete-owned-records.it-spec.ts` › CD-2, and no client-web walk touches one); the specs, issues and docs listed in § Sources. Scope: the Tasks board kind of a posts callout — its marker, its columns, tasks and their columns, moving and reordering tasks, column administration, counts, templates, deletion and analytics. The ordinary callout rules (creation, visibility, contributions, moving a post between callouts, deletion) live in `callout.md` and are cross-referenced, not repeated. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The extraction notes with every file:line are in `task-boards-dossier.md`.

2026-11-19 converted to the three-section layout. The single why of every rule was split over business and technical without rewording; the product why is left for product. The status legend and the review-load line of the old layout were dropped: the counts at the top replace them.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains on the row. Almost every why already rested on spec 042; the business why of TSK-09 now cites 042 US2 and the restating business why of TSK-06 was dropped.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/collaboration/callout/task-board/task.board.constants.ts`, `task.board.service.ts`, `task.board.column.service.ts`, `task.board.move.service.ts`, `task.board.resolver.mutations.ts`, `task.board.module.ts`, `dto/*`
- `src/domain/collaboration/callout/callout.service.ts` (create, delete, contribution create), `callout.service.authorization.ts`, `callout.resolver.mutations.ts`, `callout.resolver.fields.ts`, `dto/callout.dto.create.ts`
- `src/domain/collaboration/callout-contribution/callout.contribution.service.ts`, `callout.contribution.move.service.ts`, `dto/callout.contribution.dto.create.ts`
- `src/domain/collaboration/callouts-set/callouts.set.resolver.mutations.ts`; `src/domain/communication/room/room.service.events.ts`
- `src/core/dataloader/creators/loader.creators/callout/callout.task.column.counts.loader.creator.ts`
- `src/services/api/input-creator/input.creator.service.ts`; `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`, `types/contribution.type.ts`
- `src/common/constants/authorization/policy.rule.constants.ts`; `src/common/enums/authorization.privilege.ts`, `tagset.reserved.name.ts`, `tagset.type.ts`, `callout.contribution.type.ts`; `src/common/constants/entity.field.length.constants.ts`
- `src/domain/common/tagset-template/tagset.template.utils.ts`, `tagset.template.entity.ts`; `src/migrations/1787315924637-TaskBoardContributionClassification.ts`
- `schema.graphql`
- git: `47538dce7` (#6391), `09a6a681a` (#6397)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/orphan-free-deletion/callout-delete-owned-records.it-spec.ts` (CD-2)
- `docs/qa/server-rebuild/knowledge/callout.md` (CAL-07, CAL-18, CAL-33, CAL-73), `access-matrix.md` (§ callout, § callout-contribution), `access-matrix-crosscheck.md` (F10), `catalogue/README.md` (CT-8), `catalogue/root-fields.md:154-158`
- Other suites touching the area (list only): none

Specs / issues:
- `agents-hq/specs/042-kanban-task-board/spec.md`, `refinements.md` (origin/main)
- `agents-hq/specs/062-task-board-analytics/spec.md` (origin/main)
- alkem-io/server PR #6391 (body read); story server#6390, client-web#10169, epic alkemio#2007 (cited, not read)
- server `specs/059-ut-domain-task`, `076-ut-services-task`: checked, about background tasks, not boards
- 2026-11-20 whys pass: `agents-hq/specs/042-kanban-task-board/spec.md` US2 ("why this priority"); no new source found for TSK-17
