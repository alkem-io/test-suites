# Memos: behaviour rules

_What the platform does today for memos: creating them, editing and who may edit, memos in collections, signing through Cleverbase, PDF download, and memos in templates: what it does, why, who may, and what is still to answer. Licensing rules are in `entitlements.md` (ENT-06, ENT-31) and callout-level rules in `callout.md`. The layout is that of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 0 · Technical Lead 7 · Quality Lead 3 · Security Lead 1 · Architecture Lead 1. By state: 7 open · 5 with a suggested answer · 6 decided. Proof of the 35 rules: 14 proven by a test · 21 untested (Appendix A)._

_Whys of the 35 rules: 33 rest on a source or a product decision · 0 carry a draft · 2 have none, and each carries an open question (MEM-05, MEM-06)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Not decided" means the behaviour exists in the code and nobody chose it. Product reviewed section 3 on 2026-11-20.
- A marker in bold at the end of a rule points at section 3: **(open: F2)** means a question on this rule is still open, **(defect in part: F1)** means part of today's behaviour is a fault and must not be copied as intended. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A decided question leaves section 3 and moves onto its rule. Nothing is decided in this file yet.

## 1. Rules

### Creation and identity

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MEM-01 | A new memo gets its own name (default "Memo"), a tag set, a readable identifier taken from its title and unique within its callout, an image slot for its card, and its creator recorded as owner when the creating path passes one. | Memos are first-class content next to posts and whiteboards (server spec 016 FR-001/FR-004/FR-006). | — | — | Server spec 016 FR-001, FR-004, FR-006 |
| MEM-02 | Every new memo can be edited by contributors. This cannot be chosen when it is created. | — | As a space member, I want a new memo to be open to the other contributors straight away, so that we can start writing together without setting anything up. | — | Product, 2026-11-20 (Q-MEM-02) |
| MEM-03 | The text given when a memo is created becomes its first saved version in the memo's own storage; its images are copied in when the person may read them. If any step fails, the memo is removed again. | — | — | Content unification: the room, not the API, owns later edits; a half-created memo is never returned (code comments R2/R4/FR-005, server spec `006-collab-content-unification`, not in this checkout). | Server spec 006-collab-content-unification (per code comments) |
| MEM-04 | After creation a memo's text is never written through the API. The API only shows the last saved version; edits happen in the live editing session. | — | — | Memos are updated through the collaboration service only (DTO comment; `docs/Memo-Conversion.md`). | docs/Memo-Conversion.md |

### Editing and the edit setting

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MEM-05 | Who may change a memo's text follows its edit setting: only the creator, the space admins, or the space members. The creator can always edit and delete their own memo, but only when an owner was recorded; a memo created inside a callout template never has one. **(defect in part: F1)** **(open: F6)** | — | — | — (the owner rule mirrors whiteboards; the template gap is server#6682) | Not decided: exists in the code; the template gap is a defect (server#6682) |
| MEM-06 | Changing the edit setting takes effect at once for a memo in a callout. **(open: Q-MEM-06)** | — | — | — | Not decided: exists in the code |
| MEM-07 | Changing a memo's title, description, tags or edit setting needs the update right on it. The text cannot be changed this way. | — | — | Edits go through the collaboration service only (DTO comment). | Not decided: exists in the code (a code comment gives the reason) |
| MEM-08 | When the server replaces a memo's text (a template's memo on update), it does so through the live session in the name of the person who asked, so open editors see it and the next save cannot undo it. For a memo that frames a live callout, text sent with a callout update is ignored. | — | — | A direct snapshot write would be clobbered by the room's next save (code comment, 006 write-path fix). | Not decided: exists in the code (a code comment cites the 006 write-path fix) |
| MEM-09 | Live edits are saved by the editing session, not by the server. The server only keeps the version number and a pointer to the latest snapshot. | — | — | The room owns version and snapshot (code comments; same contract as whiteboards WBD-13). | Not decided: exists in the code (a code comment gives the reason) |
| MEM-10 | Several people can edit a memo at once only when its space has the multi-user memo feature. A template or standalone memo is never multi-user (see ENT-31, ENT-06). **(open: F6)** | Multi-user editing is a paid space feature (server spec 083; `entitlements.md`). | — | — | Server spec 083 |
| MEM-11 | Each time a memo is saved, the people who contributed are reported to analytics. A failure there never affects editing. | Alkemio measures who contributes to memos to understand engagement; the report must never get in the way of editing. | — | — | Product, 2026-11-20 (Q-MEM-11) |

### Collections, deletion and reading

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MEM-12 | A memo can be a contribution in a collection, like a post or a whiteboard: allowed through the callout's allowed types, counted and ordered like the others, and reached at the callout's link, then "memos", then its identifier. Adding one needs the general contribute right; there is no memo-specific right. | Memos usable in collections like posts and whiteboards (server spec 016 FR-002/003/005/007/008/009/013). | — | — | Server spec 016 FR-002..009, FR-013; Product, 2026-11-20 (F4, as callout F1): one contribute right for every type, as today |
| MEM-13 | Adding a memo to a published collection is recorded as activity and sends the contribution notification, unless the contributor chose not to notify (see CAL-30). Nothing is recorded when a memo is updated or deleted. | Members are told about input they can see (CAL-30 / 070). | — | 016 FR-011 asked for created/updated/deleted events. | Server spec 016 FR-011, FR-012; CAL-30 in `callout.md`; Product, 2026-11-20 (F2): stays as today, only creation is reported; spec 016 FR-011/012 is amended |
| MEM-14 | Deleting a memo needs the delete right. The live editing session is closed first; then its signing attempts, its files (signed copies and previews included), its rights and the memo itself are removed. When a platform role deletes or edits a memo directly, no audit record is written. **(defect in part: F5)** | Platform-role actions must be audited (server CLAUDE.md). | — | Deletion must not leave a live room editing a vanished memo (code comment). | Server CLAUDE.md (audit rule); the deletion order is not decided: it exists in the code |
| MEM-15 | A memo goes with its parent: deleting its callout or contribution, or changing the callout to another kind, deletes the memo (see CAL-73, CAL-32). | — | — | Framing content is owned by the callout; no orphans (016 FR-014). | Server spec 016 FR-014 |
| MEM-16 | Only a Platform Operations Admin may run the migration of old memo content. It can be run again safely and is audited. | Operations-only, audited platform actions (027). | — | — | Spec 027 |
| MEM-17 | When a user is deleted, their memos stay and the creator shows as empty. A copy they signed shows a "deleted user" placeholder. | Content belongs to the community, so a memo stays when its creator's account is deleted (as WBD-31); a signed copy stays attributed to its signer, shown with the deleted-user placeholder (spec 031 US3, FR-008). | — | — | Product, 2026-11-20 (Q-MEM-17; W4 register M5): stays as today, the creator shows as empty; the signed-copy attribution: spec 031 (agents-hq branch `031-cleverbase-memo-signing`) US3, FR-008 |

### Signing (Cleverbase)

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MEM-18 | Preparing a memo for signing needs, in this order: the contribute right on the memo, the memo-signing feature on its space, and a linked Cleverbase identity. A memo outside a space can never be signed. The web app offers Sign only when all three hold. **(open: OQ1)** | Signing is a paid space feature and a qualified identity is required (server PR #6478, alkemio#2025; `entitlements.md` ENT-06). | — | — | Server PR #6478; alkemio#2025; spec 031 (agents-hq branch `031-cleverbase-memo-signing`) FR-011 |
| MEM-19 | Preparing makes an exact PDF of the memo's current text, stores it as a private preview, and opens a signing attempt tied to that preview. | What is signed is exactly what was previewed (087 FR-016, D-1; signing feature #6468). | — | — | Spec 087 FR-016; server PR #6468 |
| MEM-20 | The signing preview can be viewed only by the person who prepared it, while they still have the contribute right, and only once it is ready. | — | — | Every step of a signing attempt checks the attempt's own actor and the current memo right (spec 031 FR-004). | spec 031 (agents-hq branch `031-cleverbase-memo-signing`) FR-004 |
| MEM-21 | Signing can be started only on your own attempt, within 60 minutes of preparing, while the conditions of MEM-18 still hold and the preview is unchanged. An attempt is started once: after a second start or a failure, a fresh preparation is needed. | — | — | One attempt per deliberate signing action: a double start is prevented, a returned attempt is consumed once, and nothing is restarted (spec 031 FR-001, US3, edge cases). | spec 031 (agents-hq branch `031-cleverbase-memo-signing`) FR-001, US3 |
| MEM-22 | On return from the signing service the user must be signed in and the return must match their own attempt. A declined signature is recorded as cancelled, an expired session as expired, another failure as failed. A completed signature stores the signed PDF with the memo, deletes the preview and sends the user back to the memo. | Signed PDFs attach to the content item, "so it is always unambiguous which memo a signature attests to" (alkemio#2025). | — | The terminal status is fetched server to server and never trusted from the browser return (spec 031 FR-006, US2). | spec 031 (agents-hq branch `031-cleverbase-memo-signing`) FR-006, US2; alkemio#2025 |
| MEM-23 | Anyone who may read a memo sees its signed copies, newest first, each with its signer and its PDF. Any reader can have a signed copy checked: verified, invalid, or unavailable when the signing service cannot be reached. | Readers of a memo may see and check what was signed (CT-5 "signing = attribute rows"). | — | — | Catalogue CT-5; spec 031 (agents-hq branch `031-cleverbase-memo-signing`) FR-005, FR-010 |
| MEM-24 | A signing attempt expires 60 minutes after preparation if signing never started, or one minute after the signing service's own expiry. Every hour, 25 at a time, expired attempts are marked and their previews deleted. Signed copies are kept. | — | — | A prepared attempt expires at the shared preparation deadline, a started one at the gateway's expiry plus a margin; neither is restarted, and a signed copy is never deleted (spec 031 edge cases, FR-005). | spec 031 (agents-hq branch `031-cleverbase-memo-signing`) edge cases, FR-005; the hourly batch of 25 is not decided: exists in the code |

### PDF download

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MEM-25 | Any signed-in user who may read a memo may download its current text as a PDF. Without signing in the download is refused; without the read right it is forbidden. The read right, not space membership, decides. | Download is for readers (087 FR-001, FR-002; story server#6660 AC1, AC5). | — | — | Spec 087 FR-001, FR-002; server#6660 AC1, AC5 |
| MEM-26 | The PDF is made from the live text at the moment of the request, body only, with every font embedded. A download stores and signs nothing. | — | — | Same renderer and live read as the signing preview; no records (087 FR-003, FR-004, FR-005; AC2, AC3). | Spec 087 FR-003, FR-004, FR-005 |
| MEM-27 | The file is named after the memo's title and the date: lowercase, at most 80 characters, "memo" when nothing is left. It is never cached. | — | — | Predictable, header-safe filenames (087 FR-006, FR-007; AC4). | Spec 087 FR-006, FR-007 |
| MEM-28 | A memo that cannot be exported is refused with a clear reason: text above 1,000,000 bytes, more than 20 images, an image not stored with the memo or that the reader may not read, an image above 16,777,216 pixels, or images above 16 MiB in total. An external image becomes a labelled link. | — | — | Renderer bounds measured for the worker; neutral wording (087 FR-011, FR-013, FR-015, FR-017). | Spec 087 FR-011, FR-013, FR-015, FR-017 |
| MEM-29 | PDFs are made outside the request, with limits per server instance: at most 3 at once, 1 per person, 30 seconds each. A second download by the same person at the same time is answered "busy"; a full or failing instance "unavailable". Both come with a hint to retry. | — | — | A 10-second synchronous render once froze the server (Release 75 risk R-5, 087 FR-009..012, FR-018). | Spec 087 FR-009..012, FR-018 |
| MEM-30 | The download is available whether or not the space has the signing feature. | Download is unsigned and open to every reader (087 FR-019 "independent of signing availability"; story AC1). | — | — | Spec 087 FR-019 |
| MEM-31 | An anonymous visitor of a public space may read a memo but may not download it. **(open: F3)** | Product ruling 2026-10-21: signed-in readers only (test plan § Open product questions; 087 FR-002/FR-019). | — | — | Product ruling of 2026-10-21 (memo PDF download test plan); spec 087 FR-002, FR-019 |
| MEM-32 | The web app shows "Download PDF" to every signed-in viewer of a memo, next to Share. It is disabled while a download runs, closing the dialog cancels it, and failures show as "busy, try again", "cannot be exported" or "download failed". | — | — | 087 FR-019, FR-020 (client contract recorded here because the walks prove it). | Spec 087 FR-019, FR-020 |

### Templates and standalone memos

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| MEM-33 | A memo that frames a callout template keeps its text with the template and can be replaced when the template is updated. A memo created that way has no owner today (see MEM-05). **(defect in part: F1)** | Templates carry default content (plan `templates-test-plan.md` 1.5/1.6). | — | — | plans/templates-test-plan.md 1.5/1.6 |
| MEM-34 | A memo outside any space can be read and downloaded, but never signed and never multi-user. **(open: OQ5)** | — | — | Standalone memos have no collaboration licence (code comments). | Not decided: exists in the code (a code comment gives the reason) |
| MEM-35 | Memo text is stored as a collaboration document and shown as Markdown. Lists, tables, empty lines, images and embedded frames survive the conversion. | — | — | `docs/Memo-Conversion.md`. | docs/Memo-Conversion.md |

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W13 are new; the rows and cells are those of the former who-may table, in the same order. Product has not confirmed the cells yet. Evidence is in Appendix B. "Edit setting" is the memo's content policy (MEM-05). Memos have no guest access._

### Reading and editing

| ID | Action | Platform admin roles | Platform Content Full Access | Platform Support | Space admin | Space member | Memo creator | Registered user, not a member | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|---|
| W1 | Read a memo and its files in a public space | Y¹ | Y | Y | Y | Y | Y | Y | Y |
| W2 | Read a memo in a private space | N² | Y | Y³ | Y | Y | Y | N | N |
| W3 | Edit the text, edit setting "contributors" (the default) | N | N⁴ | Y³ | Y | Y | Y | N | N |
| W4 | Edit the text, edit setting "admins" | N | Y | Y³ | Y | N | Y | N | N |
| W5 | Edit the text, edit setting "owner" | N | N | N | N | N | Y⁵ | N | N |
| W6 | Update the title or the edit setting | N | Y | Y³ | Y | N | Y | N | N |
| W7 | Delete a memo | N | Y⁶ | Y³ | Y | N | Y | N | N |
| W8 | Add a memo to a collection (callout open, type allowed) | N | Y | Y³ | Y | Y | – | N | N |

"Space admin" is an admin of the space itself or of a parent space. ¹ Every platform admin role, read only. ² Except Platform Resource Admin and the spaces reader, who may. ³ Only where the space lets Platform Support act as admin. ⁴ It holds no contribute right on a memo. ⁵ Only if a creator was recorded; see F1. ⁶ No audit record is written; see F5.

### Signing and PDF download

| ID | Action | Platform admin roles | Platform Content Full Access | Platform Support | Space admin | Space member | Memo creator | Registered user, not a member | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|---|
| W9 | Prepare or start signing | N | N⁴ | Y³ | Y | Y | Y | N | N |
| W10 | View the signing preview or continue an attempt | – | – | Y⁷ | Y⁷ | Y⁷ | Y⁷ | N | N |
| W11 | List signed copies or check a signature | Y⁸ | Y | Y | Y | Y | Y | Y⁹ | Y⁹ |
| W12 | Download the PDF | Y⁸ | Y | Y | Y | Y | Y | Y⁹ | N¹⁰ |

W9 needs the memo-signing feature on the space and a linked Cleverbase identity (MEM-18). No test account has such an identity, so only the refusals are proven; see OQ1. ³ ⁴ As above. ⁷ Their own attempt only. ⁸ Where the role can read the memo. ⁹ In a public space only. ¹⁰ Refused as not signed in (MEM-31).

### Migration

| ID | Action | Platform Operations Admin | Every other role |
|---|---|---|---|
| W13 | Run the migration of old memo content | Y | N |

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 7 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Editing | defect | A memo created inside a callout template has no owner, so under the default edit setting nobody can edit it. Whiteboard templates do record the creator. No spec says who owns template content. | Technical Lead | Fix: record the creator. The issue is open (server#6682). | suggested |
| F3 | PDF download | spec | Spec 087 still says "authenticated", written before product ruled on 2026-10-21 that only signed-in readers download. The ruling is written down only in the test plan. | Technical Lead | Editorial: update spec 087 FR-002 and FR-019 to the ruling. | suggested |
| F6 | Editing | follow-up | The web app explains a read-only memo with the wrong reason and leaves its toolbar active. The server facts are right; both are client defects filed on 2026-10-21. | Technical Lead | Track them on client-web#10455 and client-web#10457. The rules stay as written. | suggested |
| OQ4 | Collections | check | Where are memos indexed for search, as server spec 016 FR-012 asks? It was not found in this area. | Technical Lead | — | open |
| OQ5 | Templates | check | Can a memo exist outside a space today? Server#6686 says such memos can be downloaded, but no screen and no test tool creates one, so MEM-34 is read from the code only. | Technical Lead | — | open |
| OQ6 | PDF download | spec | Spec 087 exists only on the main branch of agents-hq and its FR-002 predates the ruling on anonymous visitors. | Technical Lead | The same fix as F3. | suggested |
| Q-MEM-06 | Editing | decision | Why does this rule exist? No source states a reason. The whiteboard twin is Q-WBD-10. | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Collections | spec | Server spec 016 promises events when a memo is updated or deleted, and search indexing. Only creation is reported. Amend the spec, or file the gap? (Posts behave the same.) | Product Lead, then Technical Lead | Product, 2026-11-20: stays as today; the Technical Lead amends spec 016 FR-011/012 to what the server does. | open |
| F5 | Deletion | risk | When a platform role edits or deletes a memo directly, no audit record is written, although the server's own rule asks for one. File the gap, or accept it? (The same as whiteboards F5.) | Security Lead (Technical Lead fixes it if filed) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 3 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Signing | test | No test account has a Cleverbase identity, so every signing rule after MEM-18 is read from the code only. Who walks MEM-19 to MEM-24 once with a sandbox identity? | Quality Lead | Someone with a sandbox Cleverbase identity walks MEM-19 to MEM-24 once. | suggested |
| OQ3 | Collections | check | Does adding a memo to a collection email the members and admins? The code includes memos; no test sends one. The notifications file should confirm. | Quality Lead | — | open |
| GAPS | All | test | 21 rules have no test, 4 more are tested only in part, and 7 groups of behaviour were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Deletion | risk | When a platform role edits or deletes a memo directly, no audit record is written, although the server's own rule asks for one. File the gap, or accept it? (The same as whiteboards F5.) | Security Lead (Technical Lead fixes it if filed) | — | open |


### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ2 | Editing | contract | What does the collaboration service do with the multi-user flag and the rights id: the read-only second editor, who may write, how many may connect? Its contract is written down nowhere in this workspace. | Architecture Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Collections | decision | Adding a memo to a collection has no right of its own: the general contribute right decides. Should each kind of contribution have its own right? The same question is finding F1 in `callout.md`. | Product Lead (Architecture Lead models the answer in the new core) | Product, 2026-11-20: one contribute right for every type, as today (callout.md F1). The Architecture Lead models it in the new core. | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| F2 | Stays as today: only adding a memo is reported. The Technical Lead amends spec 016 FR-011/012 to match; no wish is listed. | Product, 2026-11-20 | MEM-13 |
| F4 | One contribute right for every contribution type, as today; the callout ruling (callout.md F1) carries here. | Product, 2026-11-20 | MEM-12 |
| Q-MEM-02 | A new memo is open to contributors straight away, so people can start writing together, as for whiteboards (WBD-02). | Product, 2026-11-20 | MEM-02 |
| Q-MEM-11 | The contributor report measures engagement and never gets in the way of editing, as for whiteboards (WBD-17). | Product, 2026-11-20 | MEM-11 |
| Q-MEM-17 | Stays as today: a memo stays when its creator's account is deleted and the creator shows as empty, as for whiteboards (WBD-31). | Product, 2026-11-20 | MEM-17 |
| CONST | Product rules on the edit settings and the default names, ticked "yes" in Appendix E. Signing, PDF, storage, rights, error texts and the GraphQL surface go to the Technical Lead or the Security Lead; the entitlements are ruled in `entitlements.md`. | Product, 2026-11-20 | Appendix E |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›` or `matrix ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| MEM-01 | A new memo has its own profile (name defaults to "Memo"), a default free-form tagset, a readable identifier derived from its title and unique among its callout's contributions ("Unable to create Memo: the provided nameID is already taken: …"), a card image slot (plus a banner slot when it frames a callout), and — when the creating path passes one — the creating user as owner. | creator | code › `src/domain/common/memo/memo.service.ts:63-104` · `src/domain/collaboration/callout/callout.service.ts:1101-1118` · `callout-framing/callout.framing.service.ts:423-445` · test › `callouts/0.5callout-creation.spec` › 1.4, 1.7; `templates-CRD/…/callout-tests.spec` › 25–32 (Add memo, default title) · spec › server `specs/016-memo-collection-contribution/spec.md` FR-001, FR-004, FR-006 | proven |
| MEM-02 | Every new memo starts with the content policy "contributors"; it cannot be chosen at creation. | creator | code › `memo.service.ts:78` · `dto/memo.dto.create.ts` | untested |
| MEM-03 | The text given at creation (Markdown) becomes the memo's first stored snapshot in the memo's own bucket; images it references are copied into that bucket when they come from the source bucket or the actor may read them; an empty creation stores an empty document; if any step fails the memo is removed again. | creator, server | code › `memo.service.ts:106-217` · test › `templates-CRD/…/callout-template.use.memos.ts` (the default body appears in the new memo) | proven |
| MEM-04 | After creation the memo's text is never written through the API: the "markdown" field is a read-only rendering of the last saved snapshot (empty until something was saved); edits happen in the live editing session. | all readers | code › `memo.resolver.fields.ts:218-249` · `dto/memo.dto.update.ts:22-23` · `schema.graphql:4594-4617` | untested |
| MEM-05 | Who may change a memo's text follows its content policy: "owner" — only the creator; "admins" — whoever may update the memo (the space's admins); "contributors" — whoever may contribute to it (the space's members); the creator may always edit, contribute to and delete their own memo — but only when an owner was recorded, which a memo created inside a callout template never has. | creator, space admin, space member | code › `memo.service.authorization.ts:617-687` · matrix › `access-matrix.md:2000-2065` (`[contributors]`, `[admins]`, `[owner]`) · test › `templates-CRD/…/callout-template.use.memos.ts` (admin edits own contribution memo); `collaboration-tool-template-roundtrip.spec` › MT-1, MT-2 (**skipped**, server#6682) | proven (see F1; only an admin editing their own contribution memo is asserted) |
| MEM-06 | Changing the content policy re-derives who may edit at once for a memo inside a callout. | space admin, creator | code › `memo.resolver.mutations.ts:75-118` | untested |
| MEM-07 | Updating a memo's title, description, tags or content policy needs the update right on it; the text cannot be changed this way. | space admin, creator | code › `memo.resolver.mutations.ts:62-73` · `memo.service.ts:400-423` | untested |
| MEM-08 | A server-side replacement of a memo's text (a template's framing memo on update) is applied through the live editing session as the initiating actor — never as a direct write — so open editors see it and the next autosave cannot undo it; a live callout's framing memo ignores text sent with a framing update; an anonymous initiator is refused ("Cannot replace memo content without an initiating actor"). | space admin | code › `memo.service.ts:425-490` · `callout.framing.service.ts:684-720` · `src/services/collaboration-client/collaboration-document.service.ts:85-120` | untested |
| MEM-09 | Live edits are saved by the collaboration room: the server records only the room-owned version and the snapshot pointer, a save without a pointer keeps the stored one, an unknown memo answers "not found" without an error. | server | code › `memo.service.ts:290-398` · `src/services/collaboration-integration/collaboration-integration.service.ts:59-162` | untested |
| MEM-10 | A memo is multi-user (several people editing at once) only when the collaboration of its space holds the memo multi-user entitlement; a memo without a space (template, standalone) never is; the flag is handed to the room when it loads the memo (cross-reference ENT-31, ENT-06). | space members | code › `memo.service.ts:492-512` · `collaboration-integration.service.ts:120-135` · issue › client-web#10455 (single-editor footer) | untested |
| MEM-11 | Every save window's contributing users are reported to analytics as memo contributors; a failure there never affects the room. | server | code › `collaboration-integration.service.ts:164-213` · `contribution.reporter.service.ts:352-365` | untested |
| MEM-12 | A memo is a first-class collection contribution: allowed through the callout's allowed types, counted per type, ordered like other contributions, reached at the callout's URL + "memos" + its identifier (a framing memo at the callout's URL + identifier), and governed by the generic contribute right — no memo-specific right exists (cross-reference CAL-37, CAL-27, crosscheck F10). | contributor | code › `callout-contribution/callout.contribution.service.ts:228-234` · `callout.service.ts:1405-1407, 1459-1473` · `callout.service.authorization.ts:383-406` · `src/services/infrastructure/url-generator/url.generator.service.ts:1057-1075, 1172-1210` · test › `callouts/0.5callout-creation.spec` › 1.7; `templates-CRD/…/callout-tests.spec` › 25, 25b, 25c, 26–32 (member/admin add gating by `adminsCanAdd`) · spec › 016 FR-002..009, FR-013 | proven |
| MEM-13 | Adding a memo to a published collection writes a "memo created" activity entry, reports it to analytics, and sends the contribution notification unless the contributor opted out (cross-reference CAL-30); no event is written for a memo update or deletion. | contributor, space members | code › `callout.resolver.mutations.ts:737-745, 772` · `src/common/enums/activity.event.type.ts:10` · spec › 016 FR-011, FR-012 | untested (see F2) |
| MEM-14 | Deleting a memo needs the delete right; the collaboration room is told first (it evicts the live session) and the deletion fails cleanly if the message bus is unavailable; then its signing attempts, its profile with its files (including signed copies and previews), its policy and the memo itself are removed. A platform role deleting or editing a memo directly leaves no audit record. | space admin, creator, PCFA | code › `memo.resolver.mutations.ts:125-138` · `memo.service.ts:236-272` · `src/domain/common/content-signing/signing.attempt.service.ts:82-84` | untested (see F5) |
| MEM-15 | A memo disappears with its parent: deleting its callout or contribution, or changing a framing to another kind, deletes the memo (cross-reference CAL-73, CAL-32). | space admin | code › `callout.framing.service.ts:510-516` · `callout.contribution.service.ts:68-70, 376-378` · spec › 016 FR-014 | untested |
| MEM-16 | Only a platform operations admin may run the legacy-content migration of memos, which is idempotent and audited. | POA | code › `src/services/collaboration-integration/migration/collaboration-migration.resolver.mutations.ts` · test › `platform-roles` › A11.migrateLegacyMemoContent · matrix › `access-matrix-crosscheck.md:152` | proven |
| MEM-17 | A deleted user stays recorded as the memo's creator; the creator field then reads as empty; a signed copy by a deleted user shows the "deleted user" placeholder. | all readers | code › `memo.resolver.fields.ts:259-277` · `memo.signature.resolver.fields.ts:532-542` · data › `acc-defect-register.md:153` (M5: 31 memos) | untested |
| MEM-18 | Preparing a memo for signing needs, in this order, the contribute right on the memo, the memo-signing entitlement on the memo's space ("Entitlement space-flag-memo-signing is not available for License: …"), and a Cleverbase-linked identity ("Link a Cleverbase identity before signing this memo"); a memo without a space can never be signed; the client offers the Sign action only when all three hold (disabled with a "Link Cleverbase" hint when only the identity is missing). | space member with contribute | code › `memo.signing.service.ts:50-54, 291-326, 469-478` · test › `entitlements/memo-signing-entitlement` › 7 cases; `authz-admin-guard/memo-sign-action-gate.spec` › 13.1, 14.1 · spec › `entitlements.md` ENT-06; git `4d074eb72 (#6478)`, `f66a9183f (#6468)` | proven |
| MEM-19 | Preparation renders an exact PDF of the memo's live text as the signer (the live session is joined only once a render slot is granted), stores it as an internal preview in the memo's bucket, opens a pending attempt carrying the preview's fingerprint, and returns the attempt and a preview link; if the memo was deleted meanwhile the preview is discarded ("The memo was deleted while preparing the signing copy"). | signer | code › `memo.signing.service.ts:55-106` · `memo.pdf.renderer.ts` · `signing.attempt.service.ts:21-47` · spec › 087 FR-016 | untested |
| MEM-20 | The preview can be viewed only by the actor who prepared it ("Signing preview belongs to another actor"), who must still hold contribute on the memo, and only once it is ready ("Signing preview is not ready"); without a session the preview is refused. | signer | code › `memo.signing.service.ts:108-128` · `src/services/api-rest/content-signing/content.signing.controller.ts:26-46, 93-99` | untested |
| MEM-21 | Signing can be started only on the actor's own pending attempt, within 60 minutes of preparation ("Signing preview has expired"), while the gates of MEM-18 still hold and the preview bytes are unchanged ("The signing preview bytes have changed"); an attempt is started once — a second start, or any gateway failure after the start was claimed, requires a fresh preparation ("Signing was already started; prepare a fresh signing attempt"); the user is then sent to the signing gateway. | signer | code › `memo.signing.service.ts:130-205` · `signing.attempt.service.ts:13, 49-80, 86-97` | untested |
| MEM-22 | On return from the gateway the user must be signed in and the return must match their own started attempt ("Signing return does not match this actor"); an attempt already finished just sends them back to the memo; while the gateway is still working they are told to retry ("Signing is still in progress; retry this page"); a declined signature becomes "cancelled", an expired session "expired", another failure "failed"; a completed signature stores the signed PDF in the memo's bucket (attributed to the attempt, granting no extra rights), marks the attempt "signed" with the gateway's evidence, deletes the preview, and sends the user to the memo with the attempt referenced. | signer | code › `memo.signing.service.ts:207-289, 328-357, 446-467` · `content.signing.controller.ts:48-99` · `content.signing.return.filter.ts` | untested |
| MEM-23 | Signed copies of a memo are visible to anyone who may read the memo, newest first, each with its signer and its PDF; an attempt can be looked up only by its own actor ("Signing attempt is not available for this actor"); a signed copy's integrity can be re-verified by any reader of the memo — "verified", "invalid" (logged) or "unavailable" when the gateway cannot be reached ("Signed Memo copy is not available" for anything not signed). | all readers | code › `memo.resolver.fields.ts:182-216` · `memo.signing.service.ts:382-423` · `memo.signature.resolver.fields.ts` · `schema.graphql:4619-4632, 584-588, 989-995` | untested |
| MEM-24 | A pending attempt expires — 60 minutes after preparation when signing was never started, or one minute after the gateway's own expiry otherwise; an hourly sweep (25 at a time) marks such attempts expired and deletes their preview files; a stored preview or signed copy is never deleted by storage cleanup while an attempt references it. | server | code › `signing.attempt.service.ts:159-207` · `memo.signing.sweep.service.ts` · `memo.signing.service.ts:378-380` | untested |
| MEM-25 | Any signed-in user who may read a memo may download its current text as a PDF; without a session the download is refused (401), without the read right forbidden (403), an unknown memo is not found (404), a malformed identifier rejected (400); the read right — not space membership — is the gate; authorization is checked before any render capacity is taken. | signed-in readers | code › `memo.pdf.download.service.ts:329-337` · `src/services/api-rest/memo-pdf/memo.pdf.controller.ts:143-173, 175-199` · test › `memo-pdf-download/us2-download-access.spec` › AS1, AS3, AS5; `us1-download-memo-pdf.spec` › US1-AS2 · spec › `agents-hq origin/main:specs/087-memo-pdf-download/spec.md` FR-001, FR-002 | proven |
| MEM-26 | The PDF is rendered from the live text at request time (what another collaborator just typed is in it), body only — no header, no signing wording — with every font embedded; nothing is stored or signed by a download. | signed-in readers | code › `memo.pdf.download.service.ts:339-365` · `memo.pdf.renderer.ts` · test › `us1-download-memo-pdf.spec` › US1-AS3, US1-AS4; `us2-download-access.spec` › AS6 · spec › 087 FR-003, FR-004, FR-005 | proven |
| MEM-27 | The file is delivered as an attachment named `<title-slug>-<UTC date>.pdf` — lowercase, runs of other characters replaced by "-", trimmed, at most 80 characters, "memo" when nothing is left — with private no-store caching and no content sniffing; the whole PDF is produced before any success header is sent. | signed-in readers | code › `memo.pdf.filename.ts` · `memo.pdf.controller.ts:162-168` · test › `us1-download-memo-pdf.spec` › US1-AS1, US1-AS5; `us2-download-access.spec` › AS5 · spec › 087 FR-006, FR-007 | proven |
| MEM-28 | A memo that cannot be exported is refused with a clear reason (422): text above 1,000,000 bytes, more than 20 images, an image not stored in the memo's own bucket ("Memo PDF image does not belong to the memo bucket"), an image the reader may not read ("Memo PDF contains content that cannot be exported"), an image above 16,777,216 source pixels, or images above 16 MiB after normalisation; an external image becomes a labelled link, an undecodable one too. | signed-in readers | code › `memo.pdf.renderer.ts:39-46` · `memo.pdf.image.resolver.ts:98-147` · `memo.pdf.limits.ts` · `memo.pdf.download.service.ts:366-381` · test › `us2-download-access.spec` › AS4 (bucket case); `us1` › US1-AS3 (external image as link) · spec › 087 FR-011, FR-013, FR-015, FR-017 | proven |
| MEM-29 | Rendering never runs in the request process: each render is a forked worker bounded per server instance — at most 3 at once (downloads may use all but one so a signing preview always finds a slot; 0 switches rendering off), 1 per actor, 512 MB heap, 30 s from admission including the live read; a second concurrent download by the same actor answers "busy" (429), a full instance, deadline, crash, launch failure or unreadable source answers "unavailable" (503), both with a retry hint; a reader who disconnects cancels the render. | server | code › `memo.pdf.executor.ts:23-120` · `alkemio.yml:651-672` · `memo.pdf.controller.ts:151-173, 186-189` · `src/common/exceptions/memo.pdf.unavailable.exception.ts` · spec › 087 FR-009, FR-010, FR-011, FR-012, FR-018; `memo-pdf-download-test-plan.md` § Not covered | untested |
| MEM-30 | The download is available whether or not the space holds the signing entitlement. | signed-in readers | test › `us1-download-memo-pdf.spec` › US1-AS6 · spec › 087 FR-019 | proven |
| MEM-31 | An anonymous visitor of a public space may read a memo but may not download it (no button, 401 on the direct request). | anonymous | test › `us2-download-access.spec` › AS2 · spec › 087 FR-002, FR-019; `client-web/src/functional-e2e/memo-pdf-download/memo-pdf-download-test-plan.md` | proven |
| MEM-32 | The client shows "Download PDF" to every signed-in viewer of the memo dialog, next to Share, disabled and busy while a download is in flight; closing the dialog aborts the download; failures surface as "busy, try again" (429/503), "cannot be exported" (422) or "download failed". | signed-in readers | test › `us1-download-memo-pdf.spec` › US1-AS1 (busy state), `us2-download-access.spec` › AS4 (422 toast, nothing downloaded) · spec › 087 FR-019, FR-020 | proven |
| MEM-33 | A memo framing inside a callout template stores its text statically and can be replaced on template update (through the live session); a memo created that way has no owner today (see MEM-05, F1). | space admin | code › `callout.framing.service.ts:684-702` · test › `templates-CRD/…/callout-tests.spec` › 5, 6, 13, 14, 21, 22, 29, 30, 37, 38 (framing memo created from the template) | proven |
| MEM-34 | A memo outside any space (standalone) can be read and downloaded but never signed and never multi-user. | — | code › `memo.signing.service.ts:316-326` · `memo.service.ts:501-505` · `memo-pdf-download-test-plan.md` § Not covered (no UI route, no harness lever) | untested |
| MEM-35 | Memo text is stored as a collaboration document and rendered to Markdown on read; lists, tables, empty lines, images and iframes round-trip through a documented conversion. | server | code › `src/domain/common/memo/conversion/*` · `docs/Memo-Conversion.md` | untested |

### B. Rights: evidence

The legend of the former who-may table, kept because the evidence below uses its shorthands:

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `memo.resolver.mutations.ts:68-73, 130-135`; `memo.service.authorization.ts:627-687`; `memo.signing.service.ts:291-307, 382-389`; `memo.resolver.fields.ts:182-216`; `memo.pdf.download.service.ts:332-337`; `memo.pdf.controller.ts:150`; `content.signing.controller.ts:33, 57-61`; `callout.resolver.mutations.ts:565-600`; `collaboration-migration.resolver.mutations.ts`; access matrix § memo (`access-matrix.md:2000-2065`: canonical table, `priv-applications`, `pub-open+support` deltas, `[admins]`/`[owner]` resources; `pub-open+guests` identical to `pub-open` — no guest rule on memos), § callouts-set (`:1665-1730`); crosscheck `:43`, `:69` (F10), `:152` (A11); test › `memo-pdf-download/us2` AS1/AS2/AS5. PCFA reaches update/delete through the root content cascade but holds no `contribute` on a memo, so it cannot edit a "contributors" memo or sign it. "flag" = the space's `allowPlatformSupportAsAdmin`. The signing cells assume the entitlement and a Cleverbase identity — no harness persona has one, so nothing beyond the refusals is proven. GLOBAL_ADMIN-style catch-alls are retired (027 Slice B); the legacy cases run as the harness admin whose credential set was not verified here.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. "Finding 2" or "Open question 1" inside a text is F2 or OQ1 here._

#### Findings

- **F1 — A memo created inside a callout template has no owner (MEM-05, MEM-33).** Code: template callouts are created without a user id, so `memo.createdBy` is empty, the creator rule is never appended, and under the default "contributors" policy nobody holds edit on the template's memo; whiteboard templates pass the actor and are editable. Test: `collaboration-tool-template-roundtrip` MT-1/MT-2 pinned red and skipped on server#6682. Spec: none says who owns template content. Ruling: fix (record the creator) — the issue is open.
- **F2 — Spec 016 promises memo update/delete events and search indexing; only creation is reported (MEM-13).** Code: `CALLOUT_MEMO_CREATED` activity + analytics on contribution creation; no event on update or delete; search indexing of memos not traced in this area. Spec 016 FR-011/FR-012. Test: none. Ruling: amend the spec or file the gap (posts behave the same — check CAL before filing). **Product, 2026-11-20:** stays as today; amend spec 016 FR-011/012.
- **F3 — Spec 087 still says "authenticated" where product ruled "signed-in readers only" against the story's "visitors of public spaces".** Resolved by product on 2026-10-21 (test plan); the spec text on `origin/main` was not updated and the spec is not on the local branch. Ruling: editorial — update 087 FR-002/FR-019; MEM-31 records the ruling.
- **F4 — Memo contributions have no per-type right (MEM-12).** Cross-reference callout F1 / crosscheck F10 — not re-derived; the ruling there carries here. **Product, 2026-11-20:** as callout F1: one contribute right for every type, as today.
- **F5 — Direct memo edits and deletions by a platform role are not audited (MEM-14).** Code: `updateMemo` / `deleteMemo` have no platform-audit call; the server CLAUDE.md requires one. Ruling: file or accept (same as whiteboards F5).
- **F6 — The client explains a read-only memo with the wrong reason and leaves its toolbar live (MEM-10, MEM-05).** Server facts are right (`isMultiUser` false → the room makes the second join read-only; `UPDATE_CONTENT` absent for a non-member); client-web#10455 (single-editor footer blames the owner) and client-web#10457 (toolbar buttons still run commands, "Saving…" shown, nothing persisted) are client defects filed on 2026-10-21. Ruling: track there; the rule rows stay as the server guarantees.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Who can sign, really.** No harness identity has a Cleverbase login method, so every signing rule past MEM-18 is a code reading; the gateway's status/reason vocabulary (`completed`, `declined`, `failed`, `authorization_expired`, `session_expired`) is known only from the server's client, the trust-gateway repo is not in the workspace, and `docs/sandbox-content-signing-acceptance.md` was not read. Someone with a sandbox Cleverbase identity must walk MEM-19..24 once.
- **OQ2 — What the collaboration service does with `isMultiUser` and the policy id.** The read-only second join, write admission and `MaxConnsPerRoom` are outside the server (old collaborative-document-service archived 2026-10-01; successor contract undocumented here); client-web#10455/#10457 sit on top of it.
- **OQ3 — Does a memo contribution e-mail members and admins?** `callout.resolver.mutations.ts:772` includes memos in the notification branch, but no legacy case sends one; the notifications area table should confirm or deny.
- **OQ4 — Where are memos indexed for search (016 FR-012)?** Not traced in this area.
- **OQ5 — Standalone memos.** server#6686 states "standalone memos work too" for the download; no UI route or harness lever creates one, so MEM-34 is a code reading.
- **OQ6 — Spec 087 is only on `origin/main`** (the local branch is behind) and its FR-002 wording predates the anonymous-visitor ruling (Finding 3); the test plan is the only place the ruling is written down.

### D. Test gaps

_For the Quality Lead: row GAPS in section 3._

Rules no legacy case covers (untested, plus the disputed and unknown-why rows without a case): MEM-02, MEM-04, MEM-06, MEM-07, MEM-08, MEM-09, MEM-10, MEM-11, MEM-13, MEM-14, MEM-15, MEM-17, MEM-19, MEM-20, MEM-21, MEM-22, MEM-23, MEM-24, MEM-29, MEM-34, MEM-35; plus the untested clauses of MEM-05 (admins / owner policies; a member refused), MEM-12 (a member adding a memo — only admins do in the walks), MEM-28 (every limit but the bucket case), MEM-18 (the success path: nobody has a Cleverbase identity).

Behaviours the area has that neither reading nor tests pinned down:
- The whole signing flow past the identity gate: preview, start, gateway return in each outcome, the signed copy listed and verified, attempt expiry and the sweep (catalogue CT-5: "nothing is ever signed end to end"; `docs/local-content-signing.md` is a manual fixture).
- The live-editing loop for memos: type, autosave, reopen, a second session sees it (W2 journey 5); the single-editor refusal without the multi-user entitlement; multi-user with it.
- A member editing a "contributors" memo; a member refused on an "admins" memo; the owner-only policy; the creator after leaving the space.
- A memo's identifier collision; a framing memo replaced on template update; the framing-type change deleting the memo; deleting a memo while someone edits it.
- PDF: 429 for a concurrent own download, 503 when the instance is full / deadline / off switch, the editor-size limit, image pixel and budget limits, an uploaded image embedded (not just linked), nothing stored anywhere (only the memo's own bucket is checked), cancellation on disconnect, a standalone memo (test plan § Not covered).
- The memo "contribution created" notification to members and admins (CAL-30 says the gate is uniform; no memo case).
- Markdown ↔ document round-trip fidelity (tables, lists, empty lines, images).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits and access rules. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Content update policies (3) | `OWNER`, `ADMINS`, `CONTRIBUTORS`; default `CONTRIBUTORS`, not settable at creation | `src/common/enums/content.update.policy.ts`; `memo.service.ts:78` | yes | Technical Lead |
| Creator rights | `UPDATE_CONTENT`, `CONTRIBUTE`, `DELETE` via `USER_SELF_MANAGEMENT(createdBy)`, rule `credentialRule-memoCreatedBy`; absent when `createdBy` is unset | `memo.service.authorization.ts:627-644`; `credential.rule.constants.ts:53` | no (F1) | Security Lead |
| Content-policy privilege rules | `policyRule-memoContentUpdate`: ADMINS → `UPDATE ⇒ UPDATE_CONTENT`, CONTRIBUTORS → `CONTRIBUTE ⇒ UPDATE_CONTENT`, OWNER → none; no guest or public-share rules on memos | `memo.service.authorization.ts:652-687`; `policy.rule.constants.ts:7` | no | Security Lead |
| Signing attempt statuses (5) | `PENDING`, `SIGNED`, `CANCELLED`, `FAILED`, `EXPIRED` (wire lowercase) | `src/domain/common/content-signing/signing.attempt.status.ts`; `schema.graphql:989-995` | no | Technical Lead |
| Verification statuses (3) | `VERIFIED`, `INVALID`, `UNAVAILABLE` | `memo.signature.verification.status.ts`; `schema.graphql:584-588` | no | Technical Lead |
| Gateway outcome mapping | `declined` → CANCELLED; `failed` + `authorization_expired` / `session_expired` → EXPIRED; other `failed` → FAILED; no correlation → EXPIRED; `completed` without result → EXPIRED; result `null` → still pending | `memo.signing.service.ts:446-460, 258-261` | no | Technical Lead |
| Signing windows | preparation window 60 min; gateway expiry margin 60 s; sweep hourly, batch 25 | `signing.attempt.service.ts:13-14`; `memo.signing.sweep.service.ts` | no | Security Lead |
| Signing file names | preview `memo-signing-preview.pdf` (internal document, no dedup, NULL per-file authorization — W4 G3), signed copy `memo-signed.pdf` (document with bucket policy, no creator) | `memo.signing.service.ts:74-81, 262-274`; `acc-defect-register.md:96` | no | Technical Lead (Security Lead for the missing per-file access rule) |
| Signing REST + redirect | `rest/content-signing/<snapshot>/:attemptId` (inline PDF, `private, no-store`, `nosniff`), `rest/content-signing/<complete>?correlationId&clientState` → `302 <memo url>?signingAttemptId=<id>`; 401 → public return URL; Forbidden → 403; Validation → 409 | `content.signing.controller.ts`; `content.signing.return.filter.ts`; `url.generator.service.ts:1298` | no | Technical Lead |
| Hash formats | client state 32 random bytes base64url; stored hashes 64 lowercase hex (`'<label> must be 64 lowercase hexadecimal characters'`); unique `correlationId` and `clientStateHash` | `memo.signing.service.ts:166-169`; `signing.attempt.service.ts:9, 209-215`; `signing.attempt.entity.ts:238-241` | no | Security Lead |
| Entitlements | `SPACE_FLAG_MEMO_SIGNING` (prepare/continue), `SPACE_FLAG_MEMO_MULTI_USER` (`isMultiUser`); standalone memos fail closed / `false` (see `entitlements.md`) | `memo.signing.service.ts:316-326`; `memo.service.ts:492-512` | no ((ENT)) | Product Lead |
| Error text — signing | `Link a Cleverbase identity before signing this memo`; `Entitlement space-flag-memo-signing is not available for License: <id>`; `Memo storage is unavailable`; `The memo was deleted while preparing the signing copy`; `Signing preview belongs to another actor`; `Signing preview is not ready`; `Signing preview has expired`; `The signing preview bytes have changed`; `Signing was already started; prepare a fresh signing attempt`; `Signing return does not match this actor`; `Signing return parameters are invalid`; `Signing is still in progress; retry this page`; `Signing attempt is not available for this actor`; `Signed Memo copy is not available` | `memo.signing.service.ts`; `signing.attempt.service.ts:91-96, 112-115, 153-156`; `content.signing.controller.ts:71-74`; `license.service.ts:202` (via `entitlements.md`) | no | Technical Lead |
| PDF REST | `GET rest/memo/:memoId/pdf`; statuses 401 / 403 / 404 / 400 / 422 `{ message }` / 429 (`busy-actor`) / 503 (`busy-global`, `deadline`, `crashed`, `launch-failed`, `source-unavailable`) with `Retry-After: 5` / 500 | `src/common/enums/rest.endpoint.ts:9`; `memo.pdf.controller.ts:175-199`; `memo.pdf.unavailable.exception.ts` | no | Technical Lead |
| PDF headers | `Content-Type: application/pdf`; `Content-Disposition: attachment; filename="<slug>-<YYYY-MM-DD>.pdf"`; `Cache-Control: private, no-store`; `X-Content-Type-Options: nosniff` | `memo.pdf.controller.ts:162-167` | no | Technical Lead |
| Filename slug | lowercase, `[^a-z0-9]+` → `-`, trimmed, ≤ 80 then re-trimmed, fallback `memo`, UTC date | `memo.pdf.filename.ts` | no | Technical Lead |
| Render capacity | `max_concurrent_renders` 3 (downloads ≤ cap−1; 0 = off), `max_concurrent_renders_per_actor` 1 (min 1), `heap_mb` 512, `deadline_ms` 30,000 — env `MEMO_PDF_EXPORT_MAX_CONCURRENT_RENDERS`, `…_PER_ACTOR`, `…_HEAP_MB`, `…_DEADLINE_MS` | `alkemio.yml:651-672`; `memo.pdf.executor.ts:35-72` | no | Technical Lead |
| Render content limits | editor content ≤ 1,000,000 bytes; `MAX_IMAGES` 20; `MAX_SOURCE_IMAGE_PIXELS` 16,777,216; rendered edge ≤ 1,200 px, JPEG quality 80; normalized images ≤ 16 MiB total | `conversion/yjs.state.to.tiptap.html.ts:13`; `memo.pdf.limits.ts`; `memo.pdf.image.resolver.ts:73-74, 118-132` | no | Technical Lead |
| Error text — PDF | `Memo PDF supports at most 1,000,000 bytes of memo editor content`; `Memo PDF image does not belong to the memo bucket`; `Memo PDF image supports at most 16,777,216 source pixels`; `Memo PDF images exceed the 16 MiB normalized size limit`; `Memo PDF contains content that cannot be exported`; `Memo PDF rendering is unavailable (<reason>)` | `memo.pdf.renderer.ts:42-45`; `memo.pdf.image.resolver.ts:107, 132, 143`; `memo.pdf.download.service.ts:376-379`; `memo.pdf.unavailable.exception.ts` | no | Technical Lead |
| Error code | 14122 `MEMO_PDF_UNAVAILABLE` ("PDF export temporarily unavailable — try again later") | `docs/error-codes.md:160`; `alkemio.error.status.ts:91` | no | Technical Lead |
| Render log line | one per job: memo id, actor id, purpose (`download` / `signing`), outcome, duration, bytes, image count; never title or content; no DB audit row | spec › 087 FR-018; `memo.pdf.executor.ts` | no | Security Lead |
| Default names | "Memo" (memo), "Callout Framing Memo" (framing replacement); identifier derived from the name; visuals `CARD` (+ `BANNER` for framing); profile type `memo`; policy type `memo` | `memo.service.ts:80-86`; `callout.framing.service.ts:435-445, 703-710`; `profile.type.ts:11`; `authorization.policy.type.ts:19` | yes | Product Lead |
| Error text — create | `Unable to create Memo: the provided nameID is already taken: <id>`; `Callout Framing of type MEMO requires memo data.`; `Cannot replace memo content without an initiating actor`; `Not able to locate Memo with the specified ID: <id>` (id embedded — repo rule) | `callout.service.ts:1109`; `callout.framing.service.ts:182`; `memo.service.ts:229-231, 446-450` | no | Technical Lead |
| Activity / analytics kinds | `memo-created` (`CALLOUT_MEMO_CREATED`); analytics `CALLOUT_MEMO_CREATED`, `memoContribution`; no update/delete events | `activity.event.type.ts:10`; `contribution.reporter.service.ts:202-215, 352-365` | no (F2) | Technical Lead |
| URL path element | `memos` (contribution memos); framing memos use the callout URL + identifier | `url.generator.service.ts:1057-1075, 1172-1210` | no | Technical Lead |
| Collaboration client | connect timeout 15,000 ms, durability timeout 20,000 ms, 2 idempotent resends (shared with whiteboards) | `alkemio.yml:640-642`; `collaboration-document.service.ts` | no | Technical Lead |
| Legacy migration gate | `platform-operations-admin`, audited | `collaboration-migration.resolver.mutations.ts` | no | Security Lead |
| GraphQL surface | `Memo{contentUpdatePolicy, createdBy, isMultiUser, markdown, nameID, profile, signatures, authorization}`; `MemoSignature{actor, document, status, createdDate}`; `CreateMemoData{profile, markdown}`; mutations `updateMemo`, `deleteMemo`, `prepareMemoSigning` → `{attemptId, previewUrl}`, `continueMemoSigning` → `{authorizeUrl}`, `migrateLegacyMemoContent`; queries `signingAttempt(ID)`, `verifyMemoSignature`; `UrlResolverQueryResultCalloutsSet.memoId`; no PDF field (fixed client path, 087 FR-021) | `schema.graphql:4594-4641, 7715-7723`; `catalogue/root-fields.md:130-136` | no | Technical Lead |

### F. Where this lands in the new core

The catalogue puts CT-5 in slice 4–5 as a `document` of engine `yjs` whose signing becomes attribute rows (`catalogue/README.md:80`); the briefing drops stored authorization policies and every reset mutation, uploads files straight to the file container, and gives the harness's REST dependencies no stated successor (`plan.md` § 1). Every rule above survives as a behaviour. (1) The content policy (MEM-05/06) becomes a read-time rule — and the missing-owner defect of F1 cannot recur if ownership is a column the create path must fill. (2) Signing (MEM-18..24) is a state machine on attempt rows: the gate order, the one-shot start, the 60-minute window, the hash binding and the gateway outcome mapping are invariants; the preview/signed files move to the file container with the same two lifetimes (short-lived personal preview, permanent signed copy). (3) The PDF download and the signing return are REST paths (`rest/memo/:id/pdf`, `rest/content-signing/*`) — like the harness's two REST calls they have no successor named in the briefing; the new core must say where a non-GraphQL byte stream and an OAuth-style return land. (4) The render capacity (MEM-29) is an instance-local limit; with a Go core it is a different number — a rebaseline, not a rule. (5) Memo-specific contribution rights do not exist today (MEM-12, F10): the new core's `post_kind` should either gate per kind or keep the single contribute right explicitly. Error texts and HTTP statuses are rebaseline rows.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy suites — there is **no** `server-api/src/functional-api/memo*/` folder, so the proof is `entitlements/memo-signing-entitlement` (7 cases), the `platform-roles` A11 row, and the client-web walks `memo-pdf-download/us1`, `us2` (12 cases), `authz-admin-guard/memo-sign-action-gate` (2), `templates-CRD/…/callout-tests` memo rows, `callouts/0.5callout-creation` (2), `templates-CRD/…/collaboration-tool-template-roundtrip` MT-1/MT-2 (skipped on server#6682); the specs, issues and docs listed in § Sources. Scope (catalogue CT-5): memo framing and contributions, editing, multi-user, signing via Cleverbase, PDF download, collection contributions. Licensing rules are cross-referenced to `entitlements.md` (ENT-06, ENT-31), callout-level rules to `callout.md` (CAL-27, CAL-30, CAL-37, CAL-73, CAL-76). WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The extraction notes with every file:line are in `memos-dossier.md`.

2026-11-19 converted to the three-section layout. The status legend and the review-load line of the old header were dropped; the counts line at the top replaces them.


2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains (MEM-20, MEM-24). The memo-signing spec 031 (agents-hq branch `031-cleverbase-memo-signing`, linked from alkemio#2025) was added as a source; it replaces the unsourced whys of the signing rules and answers Q-MEM-17 in part.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/common/memo/memo.service.ts`, `memo.service.authorization.ts`, `memo.resolver.mutations.ts`, `memo.resolver.fields.ts`, `memo.signing.service.ts`, `memo.signing.sweep.service.ts`, `memo.signature.resolver.fields.ts`, `memo.signature.verification.status.ts`, `memo.pdf.download.service.ts`, `memo.pdf.renderer.ts`, `memo.pdf.image.resolver.ts`, `memo.pdf.executor.ts`, `memo.pdf.limits.ts`, `memo.pdf.filename.ts`, `memo.entity.ts`, `memo.interface.ts`, `dto/*`, `conversion/yjs.state.to.tiptap.html.ts`
- `src/domain/common/content-signing/signing.attempt.service.ts`, `signing.attempt.entity.ts`, `signing.attempt.status.ts`, `signing.attempt.interface.ts`
- `src/services/api-rest/memo-pdf/memo.pdf.controller.ts`; `src/services/api-rest/content-signing/content.signing.controller.ts`, `content.signing.return.filter.ts`; `src/common/exceptions/memo.pdf.unavailable.exception.ts`; `src/common/enums/rest.endpoint.ts`, `alkemio.error.status.ts`, `activity.event.type.ts`, `content.update.policy.ts`, `profile.type.ts`, `authorization.policy.type.ts`
- `src/domain/collaboration/callout-framing/callout.framing.service.ts`; `callout-contribution/callout.contribution.service.ts`; `callout/callout.service.ts`, `callout.service.authorization.ts`, `callout.resolver.mutations.ts`
- `src/services/collaboration-integration/collaboration-integration.service.ts`, `migration/collaboration-migration.resolver.mutations.ts`; `src/services/collaboration-client/collaboration-document.service.ts`; `src/services/infrastructure/url-generator/url.generator.service.ts`; `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`
- `alkemio.yml` (`collaboration.memo.pdf_export`, collaboration client timeouts); `schema.graphql`; `docs/Memo-Conversion.md`; `docs/local-content-signing.md`; `docs/error-codes.md`; `CLAUDE.md` (audit rule)
- git: `fb938ca26` (#5298 Memo), `f66a9183f` (#6468 Cleverbase signing), `4d074eb72` (#6478 signing entitlement), `afa1d00e4` (#6686 PDF download)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/entitlements/memo-signing-entitlement.it-spec.ts`; `platform-roles/_support/groups/a11.ts`; `callout/form/form-never-appears.it-spec.ts` (count shape); `configuration/configuration.it-spec.ts`
- `client-web/src/functional-e2e/memo-pdf-download/us1-download-memo-pdf.spec.ts`, `us2-download-access.spec.ts`, `memo-pdf-download-test-plan.md`; `authz-admin-guard/memo-sign-action-gate.spec.ts` (+ `authz-admin-guard-test-plan.md`); `templates-CRD/template-types/callout-tests.spec.ts`, `usage/contributions/callout-template.use.memos.ts`, `collaboration-tool-template-roundtrip.spec.ts`; `callouts/0.5callout-creation.spec.ts`; `plans/templates-test-plan.md`, `plans/callouts-test-plan.md`
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ memo, § callouts-set), `access-matrix-crosscheck.md` (`:43, 69, 152, 258, 283`), `callout.md` (CAL-27/30/37/73/76), `entitlements.md` (ENT-06/31), `data-integrity/acc-defect-register.md` (G3, M4, M5), `catalogue/README.md` (CT-5), `catalogue/root-fields.md`
- Other suites touching the area (list only): dossier § 2.3

Specs / issues:
- `agents-hq origin/main:specs/087-memo-pdf-download/spec.md` (read with `git show`; not on the local branch)
- server `specs/016-memo-collection-contribution/spec.md`; `specs/083-collab-entitlement/spec.md` (via `entitlements.md`)
- alkem-io/server#6660 (story), #6682 (template memo owner), #6686 (PR), #6478 (PR), #6468 (PR), #6510; alkem-io/alkemio#1721, #2025, #2117 (R-5); alkem-io/client-web#10445 (PR), #10455, #10457
- `agents-hq/specs/031-cleverbase-memo-signing/spec.md` on branch `031-cleverbase-memo-signing` (FR-001…FR-011, US1–US3, edge cases); alkemio#2025 (memo signing story)
