# Whiteboards: behaviour rules

_What the platform does today for whiteboards: creating them, editing and who may edit, guest access, drafts, previews, deletion, and whiteboards in templates and collections: what it does, why, who may, and what is still to answer. Licensing rules are in `entitlements.md` (ENT-06, ENT-31) and callout-level rules in `callout.md`. The layout is that of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 7 · Technical Lead 10 · Quality Lead 5 · Security Lead 1 · Architecture Lead 1. By state: 20 open · 4 with a suggested answer. Proof of the 36 rules: 6 proven by a test · 30 untested (Appendix A)._

_Whys of the 36 rules: 29 rest on a source · 3 carry a draft for product to decide · 4 have none, and each already carries an open question (WBD-10, WBD-12, WBD-31, WBD-33)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Not decided" means the behaviour exists in the code and nobody chose it. Product has not reviewed this file yet.
- A marker in bold at the end of a rule points at section 3: **(open: F4)** means a question on this rule is still open, **(defect: F6)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A decided question leaves section 3 and moves onto its rule. Nothing is decided in this file yet.

## 1. Rules

### Creation and identity

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| WBD-01 | A new whiteboard gets its own name (default "Whiteboard"), a tag set, a readable identifier taken from its name, and its creator recorded as owner. | — | — | The owner field is what drafts and the owner-only edit policy key on (058 FR-003); a board without the default tagset cannot be opened in the editor (065 US1-AS4). | Spec 058 FR-003; spec 065 US1-AS4 |
| WBD-02 | Every new whiteboard can be edited by contributors and has an automatic preview. Neither can be chosen when it is created. **(open: Q-WBD-02)** | — | As a space member, I want a new whiteboard to be open to the other contributors and to show a preview straight away, so that we can start drawing together without setting anything up. _(draft)_ | — | Not decided: exists in the code |
| WBD-03 | A whiteboard's identifier is unique within its callout. A taken identifier is refused; a missing one is taken from the title. **(open: Q-WBD-03)** | — | — | The identifier is the last part of the whiteboard's web address (`url.generator.service.ts`, `getWhiteboardUrlPath`, see WBD-33), so two whiteboards in one callout cannot share it. | Not decided: exists in the code |
| WBD-04 | A whiteboard's drawing is never sent through the API. It is kept as a snapshot in the whiteboard's own storage and is read and written only through the live editing session. | — | — | Content unification: one CRDT representation, media locators safe, the room is the single writer of the snapshot (server spec `006-collab-content-unification`, cited by the code comments; not in this checkout). | Server spec 006-collab-content-unification (cited by code comments) |
| WBD-05 | Creating a whiteboard works fully or not at all. An empty one is stored as an empty board; if anything cannot be stored, the whiteboard is removed again. | — | — | A new board must open empty and editable without a first save (006-collab-content-unification FR-010, per code comment); never a half-created board. | Server spec 006-collab-content-unification FR-010 (per code comment) |
| WBD-06 | A whiteboard can be started from another one only by someone who may read that one. The drawing, its images and its preview are copied, so the copy stands on its own. Giving both a source and content is refused. | Cloning must not leak boards the actor cannot read (resolver comment; 058 FR-006/FR-007); the copy is independently owned. | — | — | Spec 058 FR-006, FR-007 |
| WBD-07 | Images in a whiteboard are copied into its own storage when the person may read them. An image they may not read stays a link that works only for people who may read the original. A deleted image stays a dead link. A whiteboard with an image whose file is missing is refused. | Bytes are never handed over by copying something the actor cannot read (code comment, `DocumentCopyAuthority`). | — | The strict guard is the prevention half of 065 US4-AS2. | Spec 065 US4-AS1/AS2 |
| WBD-08 | A whiteboard added to a collection without its own drawing starts from the callout's default whiteboard (see CAL-31). | Defaults give members a starting template, preserved through callout templates (server PR #6399; 058 FR-012). | — | — | Server PR #6399; spec 058 FR-012 |

### Editing and the edit setting

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| WBD-09 | Who may change the drawing follows the whiteboard's edit setting: only the creator, the space admins, or the space members. The creator can always edit and delete their own whiteboard, even after leaving the space. **(open: Q-WBD-09)** | — | As a whiteboard creator, I want to choose whether only I, the admins or all members can change the drawing, so that I stay in control of my work. _(draft)_ | — | Not decided: exists in the code |
| WBD-10 | Changing the edit setting takes effect at once for a whiteboard in a callout. A template or draft whiteboard keeps its old rights until its parent is next recalculated. **(open: Q-WBD-10)** | — | — | — | Not decided: exists in the code |
| WBD-11 | Changing a whiteboard's title, description, tags, edit setting or preview settings needs the update right on it. The drawing cannot be changed this way. | — | — | Boards are edited through the collaboration service only (DTO comment). | Not decided: exists in the code (a code comment gives the reason) |
| WBD-12 | A new identifier sent with a whiteboard update is accepted but ignored: the link does not change. **(defect: F6)** | — | — | — | Not decided: a defect |
| WBD-13 | Live edits are saved by the editing session, not by the server. The server only keeps the version number and a pointer to the latest snapshot. | — | — | The room owns the version and the snapshot; the server must never substitute its own counter or orphan content on a partial or redelivered save (code comments, 006-collab-content-unification FR-003/004/005). | Server spec 006-collab-content-unification FR-003/004/005 (per code comments) |
| WBD-14 | When the server itself changes a whiteboard (replacing its drawing from another one, or an MCP edit), it does so through the live session in the name of the person who asked, so people editing see it at once. Replacing needs the edit right on the target and the read right on the source. **(open: F3)** | — | — | An external write must appear live and never be clobbered by a stale autosave (workspace spec 006; code comment). | Workspace spec 006 FR-001/002/005 |
| WBD-15 | A template's whiteboard content can be written directly. For a whiteboard that frames a live callout, content sent with a callout update is ignored; only its preview settings are applied. | — | — | A direct write would be clobbered by the room's next save (code comment); templates have no live room. | Not decided: exists in the code (a code comment gives the reason) |
| WBD-16 | Several people can edit a whiteboard at once only when its space has the multi-user whiteboard feature. A template or draft whiteboard is never multi-user (see ENT-31, ENT-06). | Multi-user editing is a paid space feature (server spec 083; `entitlements.md`). | — | — | Server spec 083 |
| WBD-17 | Each time a whiteboard is saved, the people who contributed are reported to analytics. A failure there never affects editing. **(open: Q-WBD-17)** | Alkemio measures who contributes to whiteboards to understand engagement; the report must never get in the way of editing. _(draft)_ | — | — | Not decided: exists in the code |
| WBD-18 | An MCP client may edit a whiteboard only with the edit right. An import adds elements and never replaces or repairs. When MCP editing is switched off the answer is "unavailable", not "forbidden". A request above 262,144 bytes is not accepted. | — | — | Documented contract for external editors (`docs/McpWhiteboards.md`). | docs/McpWhiteboards.md; spec 066 |

### Guest access

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| WBD-19 | Guest access on a whiteboard can be switched only by someone with the share right on it, and switched on only while its space allows guest contributions. Switching it off is always allowed. | Governance: never expose a board by accident (server spec 021 FR-001, FR-006). | — | — | Server spec 021 FR-001, FR-006 |
| WBD-20 | With guest access on, a visitor who gave a name and any signed-in user may read and edit that whiteboard, also when its space is private. Switching it on twice changes nothing. **(open: F4)** | — | A member holding the share right wants to enable guest collaboration so external participants can contribute without accounts (021 US1). | Clients compose the link themselves, the server issues no tokens (021 FR-002, FR-005, FR-007). | Server spec 021 FR-002, FR-005, FR-007 |
| WBD-21 | Switching guest access off takes effect at once: a guest's next request is refused. **(open: F2)** | Revocation must be instant (021 FR-003, FR-008, SC-004). | — | — | Server spec 021 FR-003, FR-008 |
| WBD-22 | While a space allows guest contributions, a whiteboard's creator, the space admins and, where the space lets it act as admin, Platform Support may share its whiteboards with guests. After the space setting is switched off, those rights and any guest access go when the whiteboard's rights are next recalculated. **(open: F1, F2)** | Space admins and owners control sharing; secure by default (server specs 022 FR-001..005, 023 FR-001..008, FR-014; 2025-11-21 GRANT→PUBLIC_SHARE note). | — | — | Server specs 022 FR-001..005 and 023 FR-001..008, FR-014 |
| WBD-23 | A guest is a visitor without an account who gives a display name. A visitor who gives no name is anonymous. | Ephemeral guests need no account or token (`docs/Guest-Users.md`). | — | — | docs/Guest-Users.md |

### Drafts (editing while creating)

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| WBD-24 | A signed-in user who may create callouts in a space (or templates in a template library) can open a draft whiteboard before the callout or template exists: blank, or started from a whiteboard they may read or from a callout's default. Guests and anonymous visitors cannot. | — | — | Live editing while creating, without content in the API (058 FR-001, FR-002, FR-006, FR-015). | Spec 058 FR-001, FR-002, FR-006, FR-015 |
| WBD-25 | A draft is a normal whiteboard that expires after seven days. Only its creator may use it as the final whiteboard or discard it. An expired draft cannot be used. | — | — | One owner per draft, no attach-in-place (058 FR-003, FR-004, FR-005). | Spec 058 FR-003, FR-004, FR-005 |
| WBD-26 | Using a draft copies it into the final whiteboard and then deletes the draft. A draft cannot be combined with another source. Trying twice never creates a second whiteboard. | — | — | A lost response must never duplicate a board; failure before the destination is stored keeps the draft editable (058 FR-007, FR-008, FR-016). | Spec 058 FR-007, FR-008, FR-016; server PR #6410 |
| WBD-27 | Expired and used drafts are deleted every hour, 25 at a time. A normal whiteboard is never picked up by this clean-up. | — | — | Abandoned browsers leave drafts; cleanup must never touch final boards (058 FR-009, FR-010). | Spec 058 FR-009, FR-010; server PR #6437 |

### Preview

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| WBD-28 | A whiteboard has a preview image and a preview setting: automatic (refreshed when the editor closes), custom (a frame the user chose) or fixed (never refreshed). A copy starts with the source's preview. The server stores what the web app uploads and makes no preview itself. **(open: F7)** | Preview on templates and cards (server PR #5538). | — | — | Server PR #5538 |

### Deletion

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| WBD-29 | Deleting a whiteboard needs the delete right. The live editing session is closed first; then the whiteboard, its files and its rights are removed. When a platform role deletes or edits a whiteboard directly, no audit record is written. **(defect in part: F5)** | Platform-role actions must be audited (server CLAUDE.md). | — | Deletion must not leave a live room editing a vanished board (code comment). | Server CLAUDE.md (audit rule); the deletion order is not decided: it exists in the code |
| WBD-30 | A whiteboard goes with its parent: deleting its callout, contribution or template, or changing the callout to another kind, deletes the whiteboard (see CAL-32, CAL-73). | — | — | Framing content is owned by the callout; no orphans (CAL-73 origin server#6614). | Server #6614 (through CAL-73) |
| WBD-31 | When a user is deleted, their whiteboards stay and the creator shows as empty. **(open: Q-WBD-31)** | — | — | — (W4 register M5 ruling pending) | Not decided: exists in the code |

### Reading, links and template whiteboards

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| WBD-32 | A whiteboard can be read by whoever may read its callout. In a public space a signed-in non-member and an anonymous visitor can open a whiteboard and see the drawing, but not edit it. | Content follows the audience of the callout it frames or answers (CAL-38). | — | — | CAL-38 in `callout.md` |
| WBD-33 | A whiteboard that frames a callout is reached at the callout's link plus the whiteboard's identifier. A contributed whiteboard is reached at the callout's link, then "whiteboards", then its identifier. **(open: Q-WBD-33)** | — | — | — | Not decided: exists in the code |
| WBD-34 | Adding a whiteboard to a published collection is recorded as activity and emailed to the space's admins and members who have that notification on, unless the contributor chose not to notify (see CAL-30). **(open: F8)** | Members are told about input they can see (070 FR-003/007/013 via CAL-30). | — | — | Spec 070 FR-003/007/013 (through CAL-30) |
| WBD-35 | Only a Platform Operations Admin may run the migration of old whiteboard content. It can be run again safely and is audited. | Operations-only, audited platform actions (027 platform-role redesign). | — | — | Spec 027 |
| WBD-36 | A whiteboard template has its own whiteboard, with rights that follow the template. It is never multi-user and cannot be shared with guests. Space admins create, edit and delete templates in the space's template settings, and a new template can start from an existing one. | Reusable canvases in the library and in callout templates (`plans/templates-test-plan.md` § 4; 058 US3 for template drafts). | — | — | plans/templates-test-plan.md § 4; spec 058 US3 |

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W16 are new; the rows and cells are those of the former who-may table, in the same order. Product has not confirmed the cells yet. Evidence is in Appendix B. "Edit setting" is the whiteboard's content policy (WBD-09)._

### Reading and editing

| ID | Action | Platform admin roles | Platform Content Full Access | Platform Support | Space admin | Space member | Whiteboard creator | Registered user, not a member | Guest | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|---|---|
| W1 | Read a whiteboard and its files in a public space | Y¹ | Y | Y | Y | Y | Y | Y | Y | Y |
| W2 | Read a whiteboard in a private space | N² | Y | Y³ | Y | Y | Y | N | N | N |
| W3 | Edit the drawing, edit setting "contributors" (the default) | N | N⁴ | Y³ | Y | Y | Y | N | N | N |
| W4 | Edit the drawing, edit setting "admins" | N | Y | Y³ | Y | N | Y | N | N | N |
| W5 | Edit the drawing, edit setting "owner" | N | N | N | N | N | Y | N | N | N |
| W6 | Edit the drawing of a whiteboard with guest access on | Y⁵ | Y | Y | Y | Y | Y | Y | Y | N |
| W7 | Update the title, edit setting or preview settings | N | Y | Y³ | Y | N | Y | N | N | N |
| W8 | Delete a whiteboard | N | Y⁶ | Y³ | Y | N | Y | N | N | N |

"Space admin" is an admin of the space itself or of a parent space. "Guest" is a visitor who gave a name (WBD-23). A creator keeps edit, update and delete after leaving the space. ¹ Every platform admin role, read only. ² Except Platform Resource Admin and the spaces reader, who may. ³ Only where the space lets Platform Support act as admin; the setting sits on the top-level space and subspaces follow it. ⁴ It holds no contribute right on a whiteboard. ⁵ As any signed-in user. W6 needs both the space setting and the whiteboard's guest access on; see F4. ⁶ No audit record is written; see F5.

### Guest access and drafts

| ID | Action | Platform admin roles | Platform Content Full Access | Platform Support | Space admin | Space member | Whiteboard creator | Registered user, not a member | Guest | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|---|---|
| W9 | Switch guest access, while the space allows guest contributions | N | N⁷ | Y³ | Y | N | Y | N | N | N |
| W10 | Switch guest access, while the space does not allow guest contributions | N | N | N | N⁸ | N | N | N | N | N |
| W11 | Open a draft whiteboard in a space | N | Y⁹ | Y³ | Y | Y¹⁰ | – | N | N | N |
| W12 | Use or discard a draft | – | Y¹¹ | Y¹¹ | Y¹¹ | Y¹¹ | Y¹¹ | N | N | N |

³ As above. ⁷ It holds no grant right on the whiteboard. ⁸ Switching off is always allowed for someone who holds the share right, but with the space setting off nobody holds it. ⁹ Through its right to create content everywhere. ¹⁰ Only when members may create callouts. ¹¹ Their own draft only.

### Collections, templates and migration

| ID | Action | Platform admin roles | Platform Content Full Access | Platform Support | Space admin | Space member | Whiteboard creator | Registered user, not a member | Guest | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|---|---|
| W13 | Replace a whiteboard's drawing from another whiteboard | N | Y¹² | Y³ | Y | Y¹³ | Y | N | N | N |
| W14 | Add a whiteboard to a collection (callout open, type allowed) | N | Y | Y³ | Y | Y | – | N | N | N |
| W15 | Create, edit or delete a whiteboard template | N | Y | Y³ | Y | N | – | N | N | N |
| W16 | Run the migration of old whiteboard content | Y¹⁴ | N | N | N | N | N | N | N | N |

³ As above. ¹² Only where the edit setting gives it the edit right on the target (W3 to W5) and it may read the source. ¹³ With the edit setting "contributors". ¹⁴ Platform Operations Admin only.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 7 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Guest access | decision | A whiteboard with guest access on can be read and edited by any named visitor and any signed-in user, also when its space is private. Is a guest link on a whiteboard in a private space intended? Should the link be read-only, or allow editing as today? | Product Lead (Security Lead owns the risk of opening content of a private space) | — | open |
| F7 | Preview | decision | The preview setting is an instruction to the web app; the server does not enforce it. Should the preview be something the server guarantees? | Product Lead | — | open |
| CONST | All | decision | The "product must rule?" column is blank for 24 of the 27 constants (Appendix E). Which must product rule on before the rebuild? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their role) | — | open |
| Q-WBD-02 | Creation | decision | Why does this rule exist? No source states a reason. Why does every new whiteboard start open to contributors, with no choice at creation? | Product Lead | — | open |
| Q-WBD-09 | Editing | decision | Why does this rule exist? No source states a reason. Why these three edit settings, and why does the creator keep their rights after leaving the space? | Product Lead | — | open |
| Q-WBD-17 | Editing | decision | Why does this rule exist? No source states a reason. Who uses the report of whiteboard contributors? | Product Lead | — | open |
| Q-WBD-31 | Deletion | decision | Why does this rule exist? No source states a reason. A ruling on what the creator field should show for a deleted user is pending (576 whiteboards on acceptance). | Product Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ6 | Editing | check | Is there a size limit on a whiteboard? The server has none; if one exists it is in the collaboration service. Acceptance data has 2 whiteboards above 1 MB and 173 empty ones. | Technical Lead (Product Lead rules on the value if a limit is wanted) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 10 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Guest access | spec | Server spec 023 promises a rollback, metrics and an audit record when a space's guest setting changes. None of them is built. Drop them from the spec, or file the gap? | Technical Lead (Security Lead owns the audit record) | — | open |
| F2 | Guest access | check | Specs 021 and 023 promise that guest access ends at once when the space setting is switched off. The code removes it only when the whiteboard's rights are next recalculated. Does the setting change trigger that for every whiteboard? | Technical Lead (answers OQ1 first; Security Lead owns the risk if there is a delay) | Verify live. If the recalculation runs, record the delay; if not, file a defect. | suggested |
| F3 | Editing | spec | Workspace spec 006 describes a queue-based mechanism the code no longer uses. Which contract replaced it? | Technical Lead | Mark spec 006 superseded and say by what; check whether the old queue is still declared (OQ3). | suggested |
| F6 | Editing | defect | A new identifier sent with a whiteboard update is silently ignored, although the field is documented as changing the link. Implement it, or remove the field? | Technical Lead | — | open |
| OQ1 | Guest access | check | Does changing a space's guest setting recalculate the rights of every whiteboard in it? (Feeds F2.) | Technical Lead | — | open |
| OQ3 | Editing | check | Is the old live-sync queue of spec 006 still declared or consumed anywhere? (Feeds F3.) | Technical Lead (Service Operations Lead checks the environments) | — | open |
| OQ6 | Editing | check | Is there a size limit on a whiteboard? The server has none; if one exists it is in the collaboration service. Acceptance data has 2 whiteboards above 1 MB and 173 empty ones. | Technical Lead (Product Lead rules on the value if a limit is wanted) | — | open |
| Q-WBD-03 | Creation | decision | Why does this rule exist? No source states a reason. Why must the identifier be unique within the callout? | Technical Lead | The identifier is the last part of the whiteboard's web address (`url.generator.service.ts`, `getWhiteboardUrlPath`). The why is on WBD-03. | suggested |
| Q-WBD-10 | Editing | decision | Why does this rule exist? No source states a reason. Why does a template or draft whiteboard keep its old rights until later? | Technical Lead | — | open |
| Q-WBD-33 | Reading | decision | Why does this rule exist? No source states a reason. Why these two link shapes? | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Deletion | risk | When a platform role edits or deletes a whiteboard directly, no audit record is written, although the server's own rule asks for one. File the gap, or accept it? | Security Lead (Technical Lead fixes it if filed) | — | open |
| CONST | All | decision | The "product must rule?" column is blank for 24 of the 27 constants (Appendix E). Which must product rule on before the rebuild? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their role) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 5 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F8 | Reading | test | The activity-log check for whiteboards is skipped in all three activity-log files, so the activity half of WBD-34 is only read from the code. | Quality Lead | Re-enable or rewrite the case. | suggested |
| OQ4 | Editing | test | Where is the browser walk that draws on a whiteboard and reads the content back? Until one runs on this branch, every editing rule here is read from the code only. | Quality Lead | — | open |
| OQ5 | Reading | tidy-up | Three blocks in the storage suite are named "WhiteboardRt", a whiteboard kind that no longer exists. Retire or rename them. | Quality Lead | — | open |
| OQ7 | Editing | test | Nobody has checked that the "one editor at a time" footer appears exactly when a whiteboard is not multi-user, or followed up the missing preview on callout-template whiteboards (client-web#10283). | Quality Lead | — | open |
| GAPS | All | test | 29 rules have no test, 5 more are tested only in part, and 11 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 to answer, 4 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Deletion | risk | When a platform role edits or deletes a whiteboard directly, no audit record is written, although the server's own rule asks for one. File the gap, or accept it? | Security Lead (Technical Lead fixes it if filed) | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Guest access | spec | Server spec 023 promises a rollback, metrics and an audit record when a space's guest setting changes. None of them is built. Drop them from the spec, or file the gap? | Technical Lead (Security Lead owns the audit record) | — | open |
| F2 | Guest access | check | Specs 021 and 023 promise that guest access ends at once when the space setting is switched off. The code removes it only when the whiteboard's rights are next recalculated. Does the setting change trigger that for every whiteboard? | Technical Lead (answers OQ1 first; Security Lead owns the risk if there is a delay) | Verify live. If the recalculation runs, record the delay; if not, file a defect. | suggested |
| F4 | Guest access | decision | A whiteboard with guest access on can be read and edited by any named visitor and any signed-in user, also when its space is private. Is a guest link on a whiteboard in a private space intended? Should the link be read-only, or allow editing as today? | Product Lead (Security Lead owns the risk of opening content of a private space) | — | open |
| CONST | All | decision | The "product must rule?" column is blank for 24 of the 27 constants (Appendix E). Which must product rule on before the rebuild? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their role) | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Editing | check | Is the old live-sync queue of spec 006 still declared or consumed anywhere? (Feeds F3.) | Technical Lead (Service Operations Lead checks the environments) | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ2 | Editing | contract | What does the collaboration service do with the multi-user flag, the rights id and a guest whose access was withdrawn? Its contract is written down nowhere in this workspace. | Architecture Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›` or `matrix ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| WBD-01 | A new whiteboard always has its own profile (name defaults to "Whiteboard"), exactly one default free-form tagset, a readable identifier derived from its name, and the creating user recorded as its owner. | creator | code › `src/domain/common/whiteboard/whiteboard.service.ts:178-223` · test › `templates-CRD/template-types/whiteboard-template.spec` › 1.1 Create Whiteboard Template; `templates-CRD/…/callout-tests.spec` › 33–40 (Add whiteboard, title default) · spec › `agents-hq origin/main:specs/058-draft-whiteboard-flow/spec.md` FR-003; `…/065-whiteboard-correctness/spec.md` US1-AS4 | proven |
| WBD-02 | Every new board starts with the content policy "contributors" and the preview mode "auto" with no preview frame; neither can be chosen at creation. | creator | code › `whiteboard.service.ts:188, 225-228` · `dto/whiteboard.dto.create.ts` (no policy field) | untested |
| WBD-03 | A whiteboard's identifier must be unique among the contributions of its callout; a taken identifier is refused ("Unable to create Whiteboard: the provided nameID is already taken: …"), an omitted one is derived from the title. | contributor | code › `src/domain/collaboration/callout/callout.service.ts:1081-1098` · `callout-framing/callout.framing.service.ts:402-421` | untested |
| WBD-04 | A whiteboard's drawing is never carried by the API: it lives only as a collaboration snapshot in the board's own storage bucket and is read and written through the live editing session; the board's API type has no content field. | all | code › `whiteboard.interface.ts:9-14` · `whiteboard.entity.ts:12-21` · `schema.graphql:8365-8390` · `dto/whiteboard.dto.update.ts:36-37` | untested |
| WBD-05 | Creating a board is all-or-nothing and always leaves a stored snapshot: an empty create stores the canonical empty board, and if the snapshot, its media or the profile visuals cannot be written the board, its profile and bucket are removed again. | creator, server | code › `whiteboard.service.ts:230-300` | untested |
| WBD-06 | A board may be seeded from another board only by someone who may read that source; its drawing, the media in the source's own bucket and the source's preview images are copied into the new board's own bucket; a request that supplies both a source and content is refused ("A whiteboard create must supply EITHER content OR sourceWhiteboardID, not both"). | creator | code › `whiteboard.service.ts:131-175, 303-346` · `callout/callout.resolver.mutations.ts:125-141, 611-617` · `callouts-set/callouts.set.resolver.mutations.ts:132-148` · `template/templates-set/templates.set.resolver.mutations.ts:71-80` · spec › 058 FR-006, FR-007 | untested |
| WBD-07 | Images embedded in a board are re-homed into the board's own bucket: a file in the chosen source bucket, or one the actor may read, is copied; a file the actor may not read is kept as a reference that resolves only for people who may read the original; a file that no longer exists is kept as a dead reference; a live image whose file is missing from the board's file map is refused ("Whiteboard snapshot references an image asset that is missing from its file map"). | creator, server | code › `whiteboard.service.ts:734-905` · spec › `agents-hq origin/main:specs/065-whiteboard-correctness/spec.md` US4-AS1/AS2 | untested |
| WBD-08 | A whiteboard added to a collection without its own drawing starts from the callout's default board content, copied from the callout's bucket (cross-reference CAL-31). | contributor | code › `callout.service.ts:1142-1160, 787-847` · test › `templates-CRD/…/callout-tests.spec` › 33, 34 (title default only — the canvas cannot be read back) · spec › 058 FR-012; git `a0cc3a817 (#6399)` | untested |
| WBD-09 | Who may change a board's drawing follows its content policy: "owner" — only the creator; "admins" — whoever may update the board (the space's admins); "contributors" — whoever may contribute to it (the space's members); the creator may always edit, contribute to and delete their own board, even after leaving the space. | creator, space admin, space member | code › `whiteboard.service.authorization.ts:118-141, 294-318` · matrix › `access-matrix.md:1730-1805` (`[contributors]`, `[admins]`, `[owner]` resources; `creator-former-member` row); crosscheck `:43` | untested |
| WBD-10 | Changing the content policy re-derives who may edit at once for a board inside a callout; a standalone board (template, draft) keeps its previous rights until its parent is next recomputed. | space admin, creator | code › `whiteboard.resolver.mutations.ts:104-153` | untested |
| WBD-11 | Updating a board's title, description, tags, content policy or preview settings needs the update right on the board; the drawing cannot be changed this way. | space admin, creator | code › `whiteboard.resolver.mutations.ts:84-102` · `whiteboard.service.ts:965-1000` · `dto/whiteboard.dto.update.ts:36-37` | untested |
| WBD-12 | A new identifier sent with a board update is accepted but ignored — the URL does not change. | space admin, creator | code › `dto/whiteboard.dto.update.ts:16-21` vs `whiteboard.service.ts:965-1000` | untested (see F6) |
| WBD-13 | Live edits are saved by the collaboration room: the server records only the room-owned version and the snapshot pointer, a save without a pointer keeps the stored one, an unknown board answers "not found" without an error, and nothing but these index fields crosses the bus. | server | code › `whiteboard.service.ts:1158-1267` · `src/services/collaboration-integration/collaboration-integration.service.ts:59-162` | untested |
| WBD-14 | A server-originated write to an existing board (replacing its drawing from another board, an MCP edit) is applied through the live room as the initiating actor, so people editing see it at once and the room's next save cannot overwrite it; replacing needs the edit-content right on the target and the read right on the source, and copies the source's media. | space admin, creator, MCP actor | code › `whiteboard.service.ts:551-635` · `src/services/collaboration-client/collaboration-document.service.ts:22-33, 85-120` · spec › `agents-hq/specs/006-whiteboard-live-external-writes/spec.md` FR-001/002/005 | untested (see F3) |
| WBD-15 | A template's board content may be written directly (the stored snapshot is replaced, the superseded one deleted); a live callout's framing board ignores content sent with a framing update because its room is authoritative — only its preview settings are applied. | space admin | code › `callout.framing.service.ts:632-667` · `template/template.service.ts:518-540` · `whiteboard.service.ts:1002-1115` | untested |
| WBD-16 | A board is multi-user (several people editing at once) only when the collaboration of its space holds the whiteboard multi-user entitlement; a board without a space (template, draft) is never multi-user; the flag is handed to the room when it loads the board (cross-reference ENT-31, ENT-06). | space members | code › `whiteboard.service.ts:1269-1289` · `collaboration-integration.service.ts:137-150` · spec › server `specs/083-collab-entitlement/spec.md` | untested |
| WBD-17 | Every save window's contributing users are reported to analytics as whiteboard contributors; a failure there never affects the room. | server | code › `collaboration-integration.service.ts:164-231` · `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts:337-350` | untested |
| WBD-18 | An MCP client may edit a board only with the edit-content right and write admission to its room; a scene import appends elements with fresh identities and never replaces or repairs; a disabled executor answers "unavailable", not "forbidden"; a request above 262,144 bytes cannot start. | MCP actor | code › `docs/McpWhiteboards.md` · spec › `agents-hq origin/main:specs/066-mcp-whiteboard-executor` | untested |
| WBD-19 | Guest access on a board can be switched only by someone holding the public-share right on that board, and switched ON only while the board's space allows guest contributions ("Guest contributions are disabled for the space"); switching OFF is always allowed. | space admin, creator, platform support | code › `whiteboard.guest-access.service.ts:65-105` · spec › server `specs/021-toggle-whiteboard-guest/spec.md` FR-001, FR-006 | untested |
| WBD-20 | With guest access on, a visitor who gave a name (a guest) and any signed-in user may read, edit and contribute to that board; the board's "guest contributions allowed" flag always mirrors whether that rule is present; switching on twice changes nothing. | guest, registered | code › `whiteboard.guest-access.service.ts:25-47, 157-178, 213-241` · `whiteboard.resolver.fields.ts:66-82` · `docs/Guest-Users.md` · spec › 021 FR-002, FR-005, FR-007 | untested (see F4) |
| WBD-21 | Switching guest access off removes the guest rule immediately; the next request by a guest is refused. | guest | code › `whiteboard.guest-access.service.ts:243-258` · spec › 021 FR-003, FR-008 | untested |
| WBD-22 | When a space allows guest contributions, the board's creator, the space's admins (including ancestor-space admins) and — on a top-level space that also lets platform support act as admin — platform support hold the public-share right on every board of that space, and anyone holding the grant right on the board does too; when the space setting is off, those rights and any guest rule disappear the next time the board's rights are recomputed. | space admin, creator, platform support | code › `whiteboard.service.authorization.ts:143-158, 167-257, 320-333` · `src/domain/space/space/space.service.platform.roles.access.ts:146-157` · matrix › `access-matrix.md` § whiteboard `pub-open+guests`, `pub-open+support` deltas · spec › server `specs/022-guest-contributions-policy/spec.md`, `023-guest-contributions-privileges/spec.md` | untested (see F1, F2) |
| WBD-23 | A guest is a visitor without a session who sends a display name; without a name the visitor is anonymous; a signed-in user is "registered". | guest, anonymous | code › `docs/Guest-Users.md:1-60` | untested |
| WBD-24 | A signed-in user who may create callouts on a space (or templates on a templates set) may open a server-owned draft board before the callout or template exists — blank, or seeded from one board they may read or from one callout's default; supplying both sources is refused ("sourceWhiteboardID and sourceCalloutID are mutually exclusive"); guests and anonymous visitors cannot ("Whiteboard drafts require an authenticated actor"). | space admin, member (when members may create callouts) | code › `whiteboard-draft/whiteboard.draft.service.ts:52-85, 323-339` · `callouts.set.resolver.mutations.ts:83-125` · `templates.set.resolver.mutations.ts:55-100` · spec › 058 FR-001, FR-002, FR-006, FR-015 | untested |
| WBD-25 | A draft is an ordinary board with an expiry seven days ahead; only its creator may use it as the final board or discard it ("Only the actor that created a Whiteboard draft may consume/discard it"); an expired draft cannot be used ("Whiteboard draft has expired"); using a board that is not a draft is "not found", discarding one is a silent no-op. | creator | code › `whiteboard.draft.service.ts:21, 164-184, 229-255` · spec › 058 FR-003, FR-004, FR-005; data-semantics table | untested |
| WBD-26 | Using a draft on callout, template or contribution-default creation copies it into the final board through the trusted copy path, marks the draft consumed as soon as the destination is stored, then deletes it; combining a draft with another source or a clear is refused ("draftWhiteboardID and sourceWhiteboardID are mutually exclusive", "…and contribution-default source fields…", "…and clearWhiteboardContent are mutually exclusive"); concurrent uses of one draft are serialized so a retry can never create a second final board. | creator | code › `whiteboard.draft.service.ts:87-162, 257-321` · `callouts.set.resolver.mutations.ts:172-205` · `callout.resolver.mutations.ts:237-258` · `templates.set.resolver.mutations.ts:146-178` · spec › 058 FR-007, FR-008, FR-016; git `74594fd66 (#6410)` | untested |
| WBD-27 | Expired and consumed drafts are deleted by an hourly sweep, 25 at a time, through the normal board deletion (files and policy included); an ordinary board can never be selected by the sweep. | server | code › `whiteboard.draft.service.ts:186-227` · `whiteboard.draft.sweep.service.ts` · spec › 058 FR-009, FR-010; git `7887711a5 (#6437)` | untested |
| WBD-28 | A board carries preview settings — "auto" (preview regenerated when the editor closes), "custom" (a frame chosen by the user), "fixed" (never regenerated) — and a preview image stored as a profile visual; a board copied from another starts with the source's preview images; the server stores what the client uploads and generates no preview itself. | creator, space admin | code › `whiteboard.preview.settings.interface.ts` · `src/common/enums/whiteboard.preview.mode.ts` · `whiteboard.service.ts:207-213` · test › `templates-CRD/…/whiteboard-template.spec` › 1.1/1.2 + `verify/whiteboard-template-verify.ts` (a saved template renders a preview `<img>`) · git `9ff273f80 (#5538)` | proven |
| WBD-29 | Deleting a board needs the delete right; the collaboration room is told first (it evicts the live session) and the deletion fails cleanly if the message bus is unavailable; then the board's profile with its files, its policy and the board itself are removed. A platform role deleting or editing a board directly leaves no audit record. | space admin, creator, PCFA | code › `whiteboard.resolver.mutations.ts:158-171` · `whiteboard.service.ts:924-963` · test › `notifications/space/collaboration/wb-contributions` (delete used as cleanup only) | untested (see F5) |
| WBD-30 | A board disappears with its parent: deleting its callout, contribution or template, or changing a framing to another kind, deletes the board (cross-reference CAL-32, CAL-73). | space admin | code › `callout.framing.service.ts:539-548` · `callout-contribution/callout.contribution.service.ts:65-70, 365-370` · `template.service.ts:413-430` · test › `templates/whiteboard/whiteboard-templates` › Delete Whiteboard template (count only) | untested |
| WBD-31 | A deleted user stays recorded as the board's creator; the creator field then reads as empty. | all readers | code › `whiteboard.resolver.fields.ts:36-52` · data › `acc-defect-register.md:153` (M5: 576 boards) | untested |
| WBD-32 | A board is readable by whoever may read its callout, and its profile files inherit the board's rights; in a public space a signed-in non-member and an anonymous visitor can open a board and see its drawing but not edit it. | all readers | code › `whiteboard.service.authorization.ts:93-98, 107-113` · test › `storage/auth/*-document-auth` › Access to Whiteboard Callout / Call for Whiteboards visual documents (6 files, persona rows — reconciled in `access-matrix-crosscheck.md:76-78`); `public-space/non-member-whiteboard-access.spec` › 3.1–3.4 · matrix › `access-matrix.md:1730-1805` | proven |
| WBD-33 | A framing board is reached at its callout's URL followed by the board's identifier; a contribution board at the callout's URL, "whiteboards", then the identifier; resolving such a URL returns the board's id. | all readers | code › `src/services/infrastructure/url-generator/url.generator.service.ts:1172-1210` · `schema.graphql:7715-7723` | untested |
| WBD-34 | Adding a board to a published collection writes a "whiteboard created" activity entry, reports it to analytics, and e-mails the space's admins ("<space>: New whiteboard contribution created by <name>") and members ("…, have a look!") who have that notification on — unless the contributor opted out of notifying (cross-reference CAL-30). | contributor, space members | code › `callout.resolver.mutations.ts:725-735, 772, 957-975` · test › `notifications/space/collaboration/wb-contributions` › 5 cases; `post-contribution` › FR-006 whiteboard case; `activity-logs/*` › WHITEBOARD_CREATED (**skipped** in all three files) | proven |
| WBD-35 | Only a platform operations admin may run the legacy-content migration of whiteboards, which is idempotent and audited. | POA | code › `src/services/collaboration-integration/migration/collaboration-migration.resolver.mutations.ts` · test › `platform-roles` › A11.migrateLegacyWhiteboardContent · matrix › `access-matrix-crosscheck.md:153` | proven |
| WBD-36 | A whiteboard template owns a board whose rights derive from the template's, whose content is set directly or copied from a board the actor may read, which is never multi-user and never guest-shareable; creating, editing (name, description, tags, drawing) and deleting the template work from the space's template settings, and a new template board can be seeded from an existing template. | space admin, PCFA | code › `template.service.ts:216-240, 303-330, 518-540` · `template.service.authorization.ts:121-133` · `whiteboard.service.ts:1278-1282` · test › `templates/whiteboard/whiteboard-templates` › Create, Delete; `templates-CRD/…/whiteboard-template.spec` › 1.1, 1.2, 1.3 | proven |

### B. Rights: evidence

The legend of the former who-may table, kept because the evidence below uses its shorthands:

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `whiteboard.resolver.mutations.ts:95-102, 158-171`; `whiteboard.guest-access.service.ts:85-105`; `whiteboard.service.authorization.ts:118-141, 167-257, 294-345`; `whiteboard.service.ts:319-323, 563-568`; `whiteboard.draft.service.ts:164-184, 229-255, 323-330`; `callouts.set.resolver.mutations.ts:86-95`; `templates.set.resolver.mutations.ts:58-66`; `callout.resolver.mutations.ts:565-600`; `space.service.platform.roles.access.ts:146-157`; `collaboration-migration.resolver.mutations.ts`; access matrix § whiteboard (`access-matrix.md:1730-1805`: canonical table, `pub-open+guests`, `pub-open+support`, `priv-applications` deltas, `[admins]`/`[owner]` resources), § callouts-set (`:1665-1730`), § template (`:248-285`); crosscheck rows `:43`, `:69` (F10), `:153` (A11). PCFA reaches update/delete through the root content cascade but holds no `contribute` on a board, so it cannot edit a "contributors" board's drawing — the matrix `[admins]` delta is the only PCFA `update-content`. "flag" = the space's `allowPlatformSupportAsAdmin` (L0 only; subspaces inherit per `platformRolesAccess`). Guest = `x-guest-name` header, no session. A creator keeps edit/update/delete after leaving the space (`creator-former-member` row). GLOBAL_ADMIN-style catch-alls are retired (027 Slice B); the legacy cases run as the harness admin whose credential set was not verified here.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. "Finding 2" or "Open question 1" inside a text is F2 or OQ1 here._

#### Findings

- **F1 — Spec 023's rollback, metrics and audit are not implemented (WBD-22).** Code: `appendSettingsDrivenCredentialRules` writes `verbose`/`debug` log lines only; there is no transaction around the cascade, no revert of `allowGuestContributions` on failure (FR-009), no metrics (FR-011), no audit row with triggering user/action (FR-012/013); a failure to resolve admin credentials silently yields no admin rule. Test: none. Ruling: drop those requirements from the spec, or file the gap.
- **F2 — "Immediately" is "at the next recompute" (WBD-21/22).** Spec 021 (edge case) and 023 FR-005/FR-008 promise synchronous revocation when the space setting flips off. Code: the guest rule and public-share rights are only re-derived inside `applyAuthorizationPolicy` for the board; whether the space-settings mutation cascades that recompute over every callout and board was not read (Open question 1). Test: none. Ruling: verify live; if the cascade exists, record the latency; if not, file.
- **F3 — Workspace spec 006 describes a mechanism the code no longer uses (WBD-14).** Spec: server emits a versioned delta on a dedicated RabbitMQ queue, the (archived) whiteboard-collaboration-service merges it and broadcasts `SCENE_UPDATE`. Code: the server joins the room through `CollaborationDocumentService` as a Yjs collaborator and never writes the snapshot or pointer directly; the queue constant remains in `providers.ts:16-17`. Ruling: mark 006 superseded (and say by what — the excalidraw-yjs/collaboration-service contract is not in any spec on this checkout), and check whether the queue is still declared anywhere.
- **F4 — A guest-enabled board ignores the space's privacy (WBD-20).** Code: the `public-access` rule is appended to the board's own policy with cascade for `GLOBAL_GUEST` and `GLOBAL_REGISTERED`, so with the space setting on and the toggle on, a board inside a **private** space is readable and editable by any named visitor and any signed-in user; the toggle gate is the space setting, not privacy. Spec 021 FR-002 states exactly this for "guests and any authenticated user"; spec 022 only promises a "secure posture" by default and never defines a guest. Test: none; the matrix models `pub-open+guests` only. Ruling: is a guest link on a private-space board intended? Should the link be read-only, or edit as today?
- **F5 — Direct board edits and deletions by a platform role are not audited (WBD-29).** Code: `updateWhiteboard` / `deleteWhiteboard` resolvers have no platform-audit call, while the contribution deletion path audits PCFA (CAL-32) and the server CLAUDE.md requires a row for any platform-role action. Ruling: file (audit gap) or record as accepted.
- **F6 — A new identifier on a board update is silently ignored (WBD-12).** Code: `UpdateWhiteboardInput.nameID` is documented as changing the URL, but `updateWhiteboard` never copies it. Test: none. Ruling: implement or remove the field.
- **F7 — Preview "auto/custom/fixed" is a client instruction the server does not enforce (WBD-28).** Code: the server stores the mode and whatever `whiteboardPreview` visual the client uploads. Issue: client-web#10283 — a callout-template whiteboard framing never gets a preview image while a standalone template does. Ruling: product decides whether the preview is a server guarantee; the client defect is filed.
- **F8 — The activity-log proof for whiteboards is switched off.** Test: `WHITEBOARD_CREATED` is asserted only inside a `test.skip` in all three activity-log files ("To be updated with the changes related to whiteboard callouts"). Code: the activity entry is written (`callout.resolver.mutations.ts:957-968`). Ruling: re-enable or rewrite the case; until then WBD-34's activity half is a code reading.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Does changing `allowGuestContributions` cascade a rights recompute down to every board?** The space-settings mutation path is outside this area and was not read; Finding 2 depends on it.
- **OQ2 — What the collaboration service does with `isMultiUser`, `authorizationPolicyId` and a revoked guest.** Read-only vs write admission, the single-editor rule, `MaxConnsPerRoom`, and the "not found" spec 021 promises for a revoked guest all live in the Go collaboration service and excalidraw-yjs (server pins 0.5.5); the old whiteboard-collaboration-service and collaborative-document-service repos were archived 2026-10-01 and nothing in this workspace documents the successor's contract.
- **OQ3 — Is the 006 queue still consumed anywhere?** `WHITEBOARD_COLLABORATION_SERVICE` (`providers.ts:16-17`) survives; whether a consumer or a RabbitMQ declaration still exists was not checked.
- **OQ4 — Where is the W2 whiteboard walk?** PR test-suites#702 (excalidraw-yjs#13 QA) lives on another worktree; on this checkout `grep -ril excalidraw` finds only the template-form helpers. Until a walk draws and reads back content, every editing rule here is a code reading.
- **OQ5 — "WhiteboardRt" in the storage suite.** Three `Access to WhiteboardRt Callout …` blocks name a real-time whiteboard kind that no longer exists in the code; the crosscheck notes they duplicate the whiteboard-framed blocks. Retire or rename.
- **OQ6 — Where is the board size cap?** The server has none (the MCP 262,144-byte request limit is the only number); W4 M4 found 2 boards above 1 MB and 173 empty ones. The cap, if any, is in the collaboration service.
- **OQ7 — The client-side preview and `isMultiUser` footers.** client-web#10283 (no preview on callout-template framings) and the whiteboard "one editor at a time" footer are client behaviour over server facts; nobody has checked that the footer appears exactly when `isMultiUser` is false.

### D. Test gaps

_For the Quality Lead: row GAPS in section 3._

Rules no legacy case covers (untested, plus the disputed and unknown-why rows without a case): WBD-02, WBD-03, WBD-04, WBD-05, WBD-06, WBD-07, WBD-08, WBD-10, WBD-11, WBD-12, WBD-13, WBD-14, WBD-15, WBD-16, WBD-17, WBD-18, WBD-19, WBD-20, WBD-21, WBD-22, WBD-23, WBD-24, WBD-25, WBD-26, WBD-27, WBD-29, WBD-30, WBD-31, WBD-33; plus the untested clauses of WBD-01 (nameID derivation), WBD-28 (callout-template preview; `custom`/`fixed` modes), WBD-32 (private-space refusal for a named guest), WBD-34 (activity entry), WBD-36 (template content copy, never multi-user).

Behaviours the area has that neither reading nor tests pinned down:
- The whole live-editing loop: draw, autosave, reopen, a second session sees it (W2 journey 5 — the catalogue says absent; no spec on this checkout reads a canvas back).
- A member editing a "contributors" board and a member refused on an "admins" board; the owner-only policy; the creator after leaving the space.
- The guest toggle: refused without public-share, refused while the space setting is off, idempotent on, revoked on off, a named guest editing, an anonymous visitor refused.
- The space setting flipped off while guest access is on (Finding 2).
- The draft lifecycle end to end: blank and seeded drafts, non-creator refused, expiry, double-consume, discard, the sweep.
- Replace-from-source: unreadable source refused, media copied, live editors see it.
- Multi-user vs single-editor behaviour on a board with and without the entitlement (the memo twin is client-web#10455).
- Deleting a board while someone is editing it; deletion with the message bus down.
- The identifier collision refusal; a whiteboard-template content update (direct write).
- Media rules: an unreadable image kept as a reference, a dead reference, the missing-locator refusal.
- The MCP contract (`docs/McpWhiteboards.md`) — verified by hand on acc (2026-10-26), never by a suite.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits and access rules. The "product must rule?" column is as it was: the reviewer ticks the rows product must rule on (row CONST in section 3)._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Content update policies (3) | `OWNER`, `ADMINS`, `CONTRIBUTORS` (wire `owner`/`admins`/`contributors`); default on create `CONTRIBUTORS`, not settable at creation | `src/common/enums/content.update.policy.ts`; `schema.graphql:392-396`; `whiteboard.service.ts:188` | | Technical Lead |
| Preview modes (3) | `AUTO` (regenerate on close), `CUSTOM` (user frame), `FIXED` (never); default `AUTO`, coordinates `null`; coordinates = x, y, width, height | `whiteboard.preview.mode.ts`; `schema.graphql:1203-1207, 8392-8419`; `whiteboard.service.ts:225-228` | | Technical Lead |
| Creator rights | `UPDATE_CONTENT`, `CONTRIBUTE`, `DELETE` via `USER_SELF_MANAGEMENT(createdBy)`, rule `whiteboard-created-by` | `whiteboard.service.authorization.ts:118-141`; `credential.rule.constants.ts:48` | | Security Lead |
| Content-policy privilege rules | `policyRule-whiteboardContentUpdate`: ADMINS → `UPDATE ⇒ UPDATE_CONTENT`, CONTRIBUTORS → `CONTRIBUTE ⇒ UPDATE_CONTENT`, OWNER → none | `whiteboard.service.authorization.ts:294-318`; `policy.rule.constants.ts:3` | | Security Lead |
| Guest rule | name `public-access`, cascade, privileges `READ`, `UPDATE_CONTENT`, `CONTRIBUTE`, credentials `GLOBAL_GUEST('')` + `GLOBAL_REGISTERED('')` | `whiteboard.guest-access.service.ts:25-47` | F4 | Security Lead |
| Public-share rules | `whiteboard-owner-public-share` (creator), `space-admin-public-share` (admin credentials of the board's community **with parents**; fallback `SPACE_ADMIN(space)`), `policyRule-whiteboardGrantPublicShare` (`GRANT ⇒ PUBLIC_SHARE`); support: L0 + `allowPlatformSupportAsAdmin` + `allowGuestContributions`; all only while `allowGuestContributions` | `whiteboard.service.authorization.ts:167-257, 320-333`; `space.service.platform.roles.access.ts:146-157` | | Security Lead |
| Space setting | `collaboration.allowGuestContributions`, default `false` for L0 and subspaces; migration set every existing space to `false` | `access-matrix.md:107-108`; server `specs/022-…/spec.md` FR-002, US4 | | Security Lead |
| Guest identification | header `x-guest-name` (raw ASCII or UTF-8 base64) → `GLOBAL_GUEST`; no header → `GLOBAL_ANONYMOUS`; session → `GLOBAL_REGISTERED` | `docs/Guest-Users.md` | | Security Lead |
| Draft lifecycle | TTL 7 days; consumed marker = Unix epoch; per-draft advisory lock `whiteboard-draft:<id>`, lock timeout 5,000 ms; sweep every hour, batch 25; draft profile name "Whiteboard draft", identifier 8 random characters | `whiteboard.draft.service.ts:21-22, 60-68, 123-126, 275-283`; `whiteboard.draft.sweep.service.ts:347-358`; 058 data-semantics table | | Product Lead (the 7-day lifetime) · Technical Lead (the rest) |
| Default names | "Whiteboard" (board), "Callout Framing Whiteboard" (framing replacement), "Whiteboard Template" (template); identifier derived from the name | `whiteboard.service.ts:190-192`; `callout.framing.service.ts:672-678`; `template.service.ts:224-229` | | Product Lead |
| Profile / policy / visuals | profile type `whiteboard`; policy type `whiteboard`; visuals `CARD` + `WHITEBOARD_PREVIEW` (`whiteboardPreview`); the reserved `default` tagset is always created (FREEFORM) and a caller's `default` tagset dropped | `profile.type.ts:10`; `authorization.policy.type.ts:18`; `visual.type.ts:8`; `whiteboard.service.ts:199-223` | | Technical Lead |
| Multi-user entitlement | `SPACE_FLAG_WHITEBOARD_MULTI_USER` on the collaboration licence; standalone boards `false` (see `entitlements.md` ENT-31) | `whiteboard.service.ts:1269-1289` | (ENT) | Product Lead |
| Collaboration client | connect timeout 15,000 ms (`COLLABORATION_SERVICE_CONNECT_TIMEOUT`), durability timeout 20,000 ms (`COLLABORATION_SERVICE_DURABILITY_TIMEOUT`), 2 idempotent resends; a read-only join fails at once | `alkemio.yml:640-642`; `collaboration-document.service.ts:34-40, 85-120` | | Technical Lead |
| MCP editing | request limit 262,144 bytes; outcomes `durable-success`, `busy`, `indeterminate-after-go`, `unavailable`, `forbidden`; import appends, never replaces | `docs/McpWhiteboards.md` | | Technical Lead |
| Activity / analytics kinds | `whiteboard-created`, `whiteboard-content-modified`; analytics `CALLOUT_WHITEBOARD_CREATED`, `whiteboardContribution` | `activity.event.type.ts:7-8`; `contribution.reporter.service.ts:187-200, 337-350` | | Technical Lead |
| Notification subjects | `<space>: New whiteboard contribution created by <name>` (admins) / `…, have a look!` (members) | test › `wb-contributions.it-spec.ts:268-269` | | Product Lead |
| Error text — create | `A whiteboard create must supply EITHER content OR sourceWhiteboardID, not both`; `draftWhiteboardID must be claimed by the owning create mutation before Whiteboard materialization`; `Unable to create Whiteboard: the provided nameID is already taken: <id>`; `Please provide a whiteboard`; `Whiteboard framing can only be used with whiteboard framing type`; `Callout Framing of type WHITEBOARD requires whiteboard data.`; `Whiteboard Template requires whiteboard input` | `whiteboard.service.ts:136-147`; `callout.service.ts:1089, 522-534`; `callout.framing.service.ts:149-151`; `template.service.ts:218-221` | | Technical Lead |
| Error text — media | `Whiteboard snapshot references an image asset that is missing from its file map`; `Whiteboard content is not a Yjs snapshot`; `Whiteboard import image source is missing, ambiguous or invalid`; `Whiteboard asset preparation deadline exceeded` | `whiteboard.service.ts:390-401, 650-654, 898-904` | | Technical Lead |
| Error text — guest | `Guest contributions are disabled for the space` (toggle on while the space setting is off) | `whiteboard.guest-access.service.ts:98-104` | | Product Lead |
| Error text — drafts | `Whiteboard drafts require an authenticated actor`; `sourceWhiteboardID and sourceCalloutID are mutually exclusive`; `Whiteboard draft not found`; `Only the actor that created a Whiteboard draft may consume it` / `… may discard it`; `Whiteboard draft has expired`; `draftWhiteboardID and sourceWhiteboardID are mutually exclusive`; `draftWhiteboardID and contribution-default source fields are mutually exclusive`; `draftWhiteboardID, contribution-default source fields, and clearWhiteboardContent are mutually exclusive` | `whiteboard.draft.service.ts:175-179, 235-253, 325-337`; `callouts.set.resolver.mutations.ts:184-200`; `callout.resolver.mutations.ts:250-253` | | Technical Lead |
| Error text — lookups | `Not able to locate Whiteboard with the specified ID: <id>` (id embedded — contrary to the repo's exception rule, like ENT F-7) | `whiteboard.service.ts:917-920` | | Technical Lead |
| Legacy error codes | 14116 `EXCALIDRAW_AMQP_RESULT_ERROR`, 14117 `EXCALIDRAW_REDIS_INIT`, 14118 `EXCALIDRAW_SERVER_INIT` (old collaboration service) | `docs/error-codes.md:154-156` | | Technical Lead |
| URL path element | `whiteboards` (contribution boards); framing boards use the callout URL + identifier | `url.generator.service.ts:1172-1210` | | Technical Lead |
| Live-sync queue (006) | provider `alkemio-whiteboard-collaboration` (`WHITEBOARD_COLLABORATION_SERVICE`) — consumer repo archived | `providers.ts:16-17`; ws spec 006 FR-003 | F3 | Technical Lead |
| Legacy migration gate | `platform-operations-admin`, audited | `collaboration-migration.resolver.mutations.ts` | | Security Lead |
| Snapshot files | stored with NULL per-file authorization in the board's bucket (by design; W4 G3) | `whiteboard.service.ts:1053-1056`; `acc-defect-register.md:96` | | Security Lead |
| GraphQL surface | `Whiteboard{contentUpdatePolicy, createdBy, guestContributionsAllowed, isMultiUser, nameID, previewSettings, profile, authorization}`; `CreateWhiteboardInput{profile, nameID, sourceWhiteboardID, draftWhiteboardID, previewSettings}`; mutations `updateWhiteboard`, `deleteWhiteboard`, `updateWhiteboardGuestAccess`, `replaceWhiteboardContentFromSource`, `createWhiteboardDraftOnCalloutsSet`, `createWhiteboardDraftOnTemplatesSet`, `deleteWhiteboardDraft`, `migrateLegacyWhiteboardContent`; `UrlResolverQueryResultCalloutsSet.whiteboardId` | `schema.graphql:8365-8419, 9556-9580, 7691-7696, 7715-7723`; `catalogue/root-fields.md:122-129` | | Technical Lead |

### F. Where this lands in the new core

The catalogue puts CT-4 in slice 4–5 as a `document` of engine `yjs` with a `share_link` for guests (`catalogue/README.md:79`); the briefing drops stored authorization policies, every reset mutation and the matrix-adapter, and uploads files straight to the file container (`plan.md` § 1). Every rule above survives as a behaviour; what changes is the mechanism. (1) The content policy (WBD-09/10) becomes a rule evaluated at read time, so the "recomputed at the next reset" clauses — and Findings 1 and 2 — disappear by construction; the new core must still decide whether PCFA may edit a "contributors" board (today it cannot). (2) Guest access (WBD-19..22) becomes a `share_link` row: the privacy question of Finding 4 (a link on a board in a private space) must be answered before that row is modelled, and the "any signed-in user" grant should become explicit. (3) Drafts (WBD-24..27) become a document with an expiry attribute; the per-draft serialization and the "mark consumed before deleting" order are invariants to keep, the advisory locks are implementation. (4) The room contract (WBD-13/14: room-owned version, pointer, server-as-collaborator) belongs to the engine, not the core; the `migrated` flag and WBD-35 vanish at cutover. (5) Previews (WBD-28) are client-generated today — the core should say whether a preview is a stored visual or a rendered view. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy suites — there is **no** `server-api/src/functional-api/whiteboard*/` folder, so the proof is the whiteboard cases of other areas (`templates/whiteboard` 2 cases, `notifications/space/collaboration/wb-contributions` 5 + 1, `platform-roles` A11 row, the `storage/auth` whiteboard document rows already reconciled in the access matrix) and the client-web walks (`public-space/non-member-whiteboard-access` 4, `templates-CRD/template-types/whiteboard-template` 3, `templates-CRD/…/callout-tests` whiteboard rows, `callouts/0.5callout-creation` 2); the specs, issues and docs listed in § Sources. Scope (catalogue CT-4): whiteboard framing and contributions, editing and drafts, multi-user mode, guest access, content replace, preview, external writes, standalone vs template boards. Licensing rules are cross-referenced to `entitlements.md` (ENT-06, ENT-31), callout-level rules to `callout.md` (CAL-03, CAL-27, CAL-30, CAL-31, CAL-32, CAL-38, CAL-73). WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The extraction notes with every file:line are in `whiteboards-dossier.md`.

2026-11-19 converted to the three-section layout. The status legend and the review-load line of the old header were dropped; the counts line at the top replaces them.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains. Q-WBD-03 gets a suggested answer from the web-address code; the WBD-20 user story comes from server spec 021 US1.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/common/whiteboard/whiteboard.service.ts`, `whiteboard.service.authorization.ts`, `whiteboard.guest-access.service.ts`, `whiteboard.resolver.mutations.ts`, `whiteboard.resolver.fields.ts`, `whiteboard.entity.ts`, `whiteboard.interface.ts`, `whiteboard.preview.settings.interface.ts`, `dto/*`
- `src/domain/common/whiteboard-draft/whiteboard.draft.service.ts`, `whiteboard.draft.sweep.service.ts`, `whiteboard.draft.resolver.ts`
- `src/domain/collaboration/callout-framing/callout.framing.service.ts`, `callout.framing.service.authorization.ts`; `callout-contribution/callout.contribution.service.ts`, `callout.contribution.service.authorization.ts`; `callout/callout.service.ts`, `callout.service.authorization.ts`, `callout.resolver.mutations.ts`; `callouts-set/callouts.set.resolver.mutations.ts`, `callouts.set.service.authorization.ts`
- `src/domain/template/template/template.service.ts`, `template.service.authorization.ts`; `templates-set/templates.set.resolver.mutations.ts`
- `src/services/collaboration-integration/collaboration-integration.service.ts`, `migration/collaboration-migration.resolver.mutations.ts`; `src/services/collaboration-client/collaboration-document.service.ts`; `src/domain/common/collaboration-metadata/*`
- `src/domain/space/space/space.service.platform.roles.access.ts`; `src/services/infrastructure/url-generator/url.generator.service.ts`; `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`
- `src/common/enums/content.update.policy.ts`, `whiteboard.preview.mode.ts`, `visual.type.ts`, `profile.type.ts`, `authorization.policy.type.ts`, `collaboration.content.type.ts`, `activity.event.type.ts`; `src/common/constants/authorization/credential.rule.constants.ts`, `policy.rule.constants.ts`; `src/common/constants/providers.ts`; `alkemio.yml`
- `schema.graphql`; `docs/McpWhiteboards.md`; `docs/Guest-Users.md`; `docs/error-codes.md`; `CLAUDE.md` (audit rule)
- git: `c234adde6` (#5639 guest access), `04266cbd8` (#6405 drafts), `74594fd66` (#6410), `7887711a5` (#6437), `a0cc3a817` (#6399 defaults), `9ff273f80` (#5538 previews), `df7445856` (#6322)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/templates/whiteboard/whiteboard-templates.it-spec.ts`; `notifications/space/collaboration/wb-contributions.it-spec.ts`, `post-contribution.it-spec.ts` (FR-006 whiteboard case); `storage/auth/*-document-auth.it-spec.ts` (whiteboard blocks); `platform-roles/_support/groups/a11.ts`; `activity-logs/*-activity-logs.it-spec.ts` (skipped WHITEBOARD_CREATED); `callout/reactions/callout-reactions.it-spec.ts` (US1-AS5); `configuration/configuration.it-spec.ts`
- `client-web/src/functional-e2e/public-space/non-member-whiteboard-access.spec.ts` (+ `public-space-non-member-navigation-test-plan.md` § 3); `templates-CRD/template-types/whiteboard-template.spec.ts`, `verify/whiteboard-template-verify.ts`, `callout-tests.spec.ts`, `usage/contributions/callout-template.use.whiteboards.ts`, `forms/whiteboards/whiteboard-dialog.ts`; `callouts/0.5callout-creation.spec.ts`; `plans/callouts-test-plan.md`, `plans/templates-test-plan.md`
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ whiteboard, § callouts-set, § template; constants `:107-108, 114`), `access-matrix-crosscheck.md` (`:43, 69, 76-78, 153, 277, 281-283`), `callout.md` (CAL-03/27/30/31/32/38/73), `entitlements.md` (ENT-06/31), `data-integrity/acc-defect-register.md` (G3, M4, M5), `catalogue/README.md` (CT-4), `catalogue/root-fields.md`
- Other suites touching the area (list only): dossier § 2.3

Specs / issues:
- `agents-hq/specs/006-whiteboard-live-external-writes/spec.md`
- `agents-hq origin/main:specs/058-draft-whiteboard-flow/spec.md`, `065-whiteboard-correctness/spec.md` (read with `git show`; not on the local branch), `055-restore-whiteboard-tools`, `066-mcp-whiteboard-executor` (listed)
- server `specs/021-toggle-whiteboard-guest/spec.md`, `022-guest-contributions-policy/spec.md`, `023-guest-contributions-privileges/spec.md`, `078-ut-services-whiteboard/spec.md` (unit-test scope only), `083-collab-entitlement/spec.md` (via `entitlements.md`)
- Issues cited (not re-derived): client-web#10283, client-web#10206, client-web#10326, server#6523, server#6464, alkemio#2129, whiteboard-collaboration-service#238
- 2026-11-20 whys pass: server `specs/021-toggle-whiteboard-guest/spec.md` US1; `src/services/infrastructure/url-generator/url.generator.service.ts` (`getWhiteboardUrlPath`)
