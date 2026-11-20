# Orphan-free deletion: behaviour rules

_What the platform does today when a user, an organisation, a space, an account or one of their owned records is deleted: what is removed with it (profile, files, access policies, roles, rooms, sign-in identity, sessions), what is kept, what is refused, what is audited, and where left-overs ("orphans") are known to stay behind. It says what the server does, why, who may, and what is still to answer. The file has three sections, **1. Rules**, **2. Rights** and **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 0 · Technical Lead 7 · Quality Lead 3 · Security Lead 1 · Incident Lead 2 · Service Operations Lead 1. By state: 10 open · 4 with a suggested answer · 4 decided. Proof of the 21 rules: 13 proven by a test · 8 untested (Appendix A)._

_Whys of the 21 rules: 20 rest on a source or a product decision · 1 technical why is still a QA draft, for the Technical Lead (DEL-10) · 0 have none._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Not decided" means the behaviour exists in the code and nobody chose it. Product reviewed section 3 on 2026-11-20.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: …)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: …)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Deleting a user

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| DEL-01 | A user is deleted only by themself or by a platform users admin. No other role can delete a user, Platform Content Full Access included. | Self-service deletion is a user right (054 FR-001/015) | — | Administrative deletion is the users-admin family's alone (027 A5), so no second admin path may hand it to a role that must not hold it (code comment). | Spec 054 FR-001/015; spec 027 A5 |
| DEL-02 | A user cannot be deleted while their account still hosts a space, a virtual contributor, an innovation pack or an innovation hub, and users cannot delete themselves while they are the only owner of an organisation. They are shown what blocks them (up to 25 items). Content they wrote never blocks. **(open: OQ1)** | Resources must be transferred or deleted first, so nothing is deleted that was not asked for; an organisation must always have an owner, and only the admin path (support's route) can delete a sole owner on their behalf (054 FR-004…007, US4; code comment in the blocker service). | — | — | Spec 054 FR-004…007, US4 |
| DEL-03 | Users can delete their own account only from a session started in the last 15 minutes; otherwise they are asked to sign in again. An admin who deletes a user has no such limit. **(open: OQ1)** | Deletion is irreversible; a typed name defends against mis-clicks, not against a hijacked or long-idle session (054 US3). | — | A session-AGE gate (not re-authentication — 054 FR-013 amendment, server#6417); matches the identity provider's privileged window (FR-009…FR-014). | Spec 054 FR-009…FR-014; server#6417 |
| DEL-04 | Deleting a user removes, all at once, their profile, settings, pending invitations and applications, every role they held and their account. Afterwards their sessions are ended and their sign-in identity and files are removed; these later steps are recorded and cannot make the deletion fail. **(open: OQ5)** | Invitations to the address are personal data that must not outlive the account (code comment); sessions die with the account (server#6315). | — | Erasure must be atomic in the primary store (interrupted = fully intact) while slow external systems run afterwards and can never fail the user-visible operation (054 FR-018/019); credentials cascade with the actor (026 FR-009) | Spec 054 FR-018/019; spec 026 FR-009; server#6315 |
| DEL-05 | When users delete themselves, their sign-in identity is always deleted too. An admin can choose to keep it; the default is to delete it. | A surviving identity would mint a fresh, empty account at the departed user's next sign-in (054 FR-016, decision D-1). | — | — | Spec 054 FR-016, decision D-1 |
| DEL-06 | Nothing a user wrote is deleted with them: posts, comments, whiteboards and reactions stay. Where activity names the departed user, it shows "Former member". | Contributions belong to the space, not the person. | — | Feeds must keep rendering without a lookup storm or a crash (054 FR-004/FR-022; the sentinel string is a recorded, untranslated v1 limitation). | Spec 054 FR-004, FR-022; Product, 2026-11-20 (business why) |
| DEL-07 | Every user deletion is recorded in the audit log, with who started it and what was checked, but never a name or an e-mail. Each later clean-up step adds its own record. The operators are told that a profile was removed, without personal data. **(open: OQ1)** | Erasure must be provable afterwards and reconcilable by finance, without re-storing the data that was erased (054 FR-020/021, FR-008; T063/FR-018a: self-service is not an administrative action). | — | — | Spec 054 FR-008, FR-018a, FR-020/021 |
| DEL-08 | A deleted user's chat identity stays: their Matrix account is not closed, they stay in their rooms, and their name and messages remain. | Deliberately out of v1 scope — sibling story (054 decision D-5/D-6, Out of Scope); the register files it as a live personal-data residue (W4 P4, server#6728). | — | — | Spec 054 decisions D-5/D-6 (out of scope for v1); Product, 2026-11-20 (F1, OQ2): stays as today, the help page keeps saying it (054 FR-024); closing the chat account is a wish (server#6728) |

### Deleting an organisation

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| DEL-09 | An organisation is deleted by one of its owners or by Platform Support, and only when its account hosts no space, virtual contributor, pack or hub. Its profile, files, groups, verification, roles and account go with it, and invitations addressed to it are removed. **(open: F3, F9)** | — | — | Owner keeps ordinary DELETE; support reaches the same action through its own privilege (027 A6, FR-007(e)) | Spec 027 A6, FR-007(e) |
| DEL-10 | The last owner of an organisation cannot be removed through role management, but an admin can delete that owner's account. That is why users cannot delete themselves while they are the only owner, and why the admin route is the way to unblock them. | An admin acting for support must still be able to remove a sole owner (054 US4; blocker-service comment). | — | The role set's "minimum one owner" guard is bypassed by the credential cascade, so the blocker is what enforces the invariant on deletion. _(draft)_ | Spec 054 US4 |

### Deleting a space and an account

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| DEL-11 | A space that has subspaces cannot be deleted; its subspaces are deleted first. **(open: F9)** | — | As a space admin, I want deleting a space that still has subspaces to be refused, so that I cannot wipe subspaces other people lead by accident. | — | Product, 2026-11-20 (Q-DEL-11) |
| DEL-12 | Deleting a space removes everything it owns, step by step: its profile and files first, then its Matrix space, its content and callouts, its community with all roles, applications and invitations, and its licence. If the first step is refused, the space stays whole and the delete can be tried again. **(open: F3)** | — | — | The actor profile is not reached by the row cascade (`actor.profileId` is SET NULL), so it is deleted explicitly and first (server#6614 fix); Matrix mirrors the hierarchy and must never block Alkemio (082 US5, FR-004/FR-008). | Spec 082 US5, FR-004, FR-008; server#6614 |
| DEL-13 | A space whose creation stopped half-way cannot be deleted at all, so it stays for ever. **(defect: F4)** | — | — | Creation is not atomic (JRN-11); the delete loads every child and throws when one is missing — known defect server#6648 (14 live half-created spaces on acceptance). | Not decided: a defect (server#6648) |
| DEL-14 | An account is deleted only together with the user or organisation that holds it, and only when it holds no space, virtual contributor, pack or hub. Its files, licence and profile go with it. | — | — | Every caller already refused deletion for a non-empty account, so a non-empty one here means the invariant broke upstream — the saga refuses loudly rather than deleting resources it was never asked to delete (code comment). | Not decided: exists in the code |

### Owned records

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| DEL-15 | Deleting a record also deletes what it owns, so nothing is left behind: a callout takes its comments and contributions with it, a template its content, a forum discussion its comments, an innovation pack its templates, a space its guidelines, innovation flow and updates channel. **(open: F7)** | — | — | An owner holds the foreign key to its child, so the database never cascades to the child and only explicit service code removes it; the leaks produced ~9,400 orphan policies on acceptance and blocked resets (server#6614; fixes #6637, #6678). | Server #6614; fixes #6637, #6678 |
| DEL-16 | Deleting a room removes it in Alkemio first and then asks the chat server to delete it. When the chat server refuses or is down, the Matrix room stays alive. **(defect: F2)** | — | — | The adapter must never block the primary operation (082 FR-008) — but the result is ignored, leaving orphan rooms (W4 P1: 427 on acceptance; server#6727). | Not decided: a defect (server#6727). Spec 082 FR-008 only says Matrix must not block |
| DEL-17 | A file is deleted in the file store first, then its records in Alkemio. A file held by a signing attempt cannot be deleted, and neither can the profile, space, user or account above it, until the attempt ends. | A document mid-signing must stay until the attempt resolves (server#6468). | — | The file bytes live in file-service, which is an HTTP call outside any database transaction (085 migration; code comments) | Spec 085 (migration); server#6468 |
| DEL-18 | Deleting a virtual contributor removes its profile, pending invitations, AI persona, roles and knowledge base in one go. The spaces that had invited it are updated afterwards. **(open: F3)** | — | — | A VC is an actor like a user: credentials cascade (026 FR-009); invitations are cleaned so the inviting space's access is recomputed. | Spec 026 FR-009 |
| DEL-19 | Deleting an innovation pack removes its templates and its profile; deleting an innovation hub removes its profile. **(open: Q-DEL-19)** | — | — | Same as DEL-15: an owner holds the key to its children, so only service code removes them, or they are left behind (server#6614). | Not decided: exists in the code |
| DEL-20 | Internal files (collaboration snapshots, document previews, signing previews) have no access policy, by design. They do not count as left-overs. | — | — | By design (W4 G3: 3,129 on acceptance, 2,901 in one month); the "every row owns a policy" oracle does not apply to them. | Not decided: exists in the code (the data-integrity register records it as by design, G3) |
| DEL-21 | An authorization reset never removes left-over policies. When it meets a broken record it skips that part and carries on. Existing left-overs stay until a separate clean-up runs. **(open: F5, OQ3)** | — | — | One broken child used to abort a whole account reset and leave unrelated entities with empty rules (server#6094); the orphan sweep is a separate migration (#6655, deferred). | Server #6094; the clean-up is deferred (#6655) |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W11 follow the order of the former who-may table. "Platform roles" are the platform admin roles other than the Platform License Manager, which has its own column; the footnotes say which. Evidence is in Appendix B. Who may delete a space, a callout or a template is set out in the journey, callout and templates files; users and organisations are here because their deletion has its own gates._

### Users and organisations

| ID | Action | Platform roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Delete another person's user | Y¹ | N | N | N | N | N | N |
| W2 | Delete my own user | – | – | Y² | – | – | Y² | – |
| W3 | Read what blocks my own deletion | Y³ | Y³ | Y | Y | Y | Y | –⁴ |
| W4 | Delete a user's sign-in account only, keeping the profile | Y¹ | N | N | N | N | N | N |
| W5 | Delete an organisation | Y⁵ | N | Y⁶ | N | N | N | N |

¹ Platform users admin only; Platform Content Full Access and Platform Support are refused. ² Their own user only, from a fresh session and with nothing blocking (DEL-02, DEL-03). ³ For themselves, like any user. ⁴ A visitor gets an empty status. ⁵ Platform Support, through its own delete-organisation right; Platform Content Full Access through the delete right it holds on every organisation. ⁶ An owner of that organisation.

### Spaces, accounts and owned records

| ID | Action | Platform roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W6 | Delete a top-level space or a subspace | Y⁷ | N | Y⁸ | Y | N | N | N |
| W7 | Delete a virtual contributor, innovation pack or innovation hub | Y⁹ | N | Y | – | – | N | N |
| W8 | Delete an account on its own | N¹⁰ | N | N | – | – | N | N |
| W9 | Delete a callout, template, forum discussion or flow state | see ¹¹ | – | – | Y | see ¹² | N | N |

⁷ Platform Content Full Access, through the delete right it holds on every space. ⁸ The account admin's rights reach down to the spaces of the account. ⁹ Platform Content Full Access; Platform Support is refused. ¹⁰ No such action exists: an account goes only with its user or organisation (DEL-14). ¹¹ As set out in the callout, templates and platform files. ¹² Depends on the settings of the space or callout.

### Operator tools

| ID | Action | Platform roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W10 | Look up a policy row by id (the check for left-overs) | Y¹³ | N | N | N | N | N¹⁴ | N |
| W11 | Reset authorization (left-overs are not touched) | Y¹³ | N | N | N | N | N | N |

¹³ Platform Operations Admin only. ¹⁴ Refused, but the refusal differs for an id that exists and one that does not, so a caller can tell them apart; question F6.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). F ids are findings, OQ ids are open questions of the extraction, Q ids ask why a rule exists. The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).


### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 7 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Spaces | decision | Deleting an organisation, a space or a virtual contributor is not all-or-nothing: a failure half-way leaves part of it deleted. Only the user deletion was made safe. Accept partial deletes that can be retried, or give these three the same treatment? | Technical Lead (Architecture Lead for the new core) | — | open |
| F5 | Owned records | decision | About 9,400 left-over policies sit on acceptance; a reset skips them and no clean-up has run. Run the deferred clean-up (server#6655) before the baseline for the migration dry run, or classify them as "vanishes in the new core" and stop? | Technical Lead | — | open |
| F7 | Owned records | defect | Three owned policies cannot be read back through the API (a template's callout framing, the community guidelines profile, a poll), so three cases cannot assert that they are deleted. Reported on server#6614. | Technical Lead (Quality Lead extends the cases) | Fix the resolvers, then extend the cases. | suggested |
| F9 | Spaces | tidy-up | The refusal text for deleting a space contains the space id, against the repository rule, and the organisation refusal has a grammar slip ("account contain"). | Technical Lead | Treat them as rebaseline rows when cleaned; they are not behaviour changes. | suggested |
| OQ1 | Users | check | Is the old way of deleting a user (before the current all-at-once deletion) still reachable? The old service method still exists and no caller was found, but the search was not exhaustive. If something calls it, DEL-02, DEL-03 and DEL-07 do not hold on that path. | Technical Lead | — | open |
| OQ5 | Users | check | What removes a deleted user's chats, notifications and MCP API keys? A code comment says they go "via cascade"; the database schema was not read. | Technical Lead | — | open |
| Q-DEL-19 | Owned records | decision | Why does this rule exist? Deleting an innovation pack or hub removes what it owns; no source states the reason. | Technical Lead | The same reason as DEL-15, which already lists "an innovation pack its templates": the database never cascades to an owned child, so service code must remove it (server#6614). The why is on DEL-19. | suggested |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Owned records | defect | A room is removed in Alkemio before the chat server confirms, and a failed Matrix deletion is ignored: 427 left-over Matrix rooms on acceptance, and the cause is still live (server#6727). Incident or backlog defect? Then: record the failed deletion so an operator can finish it, or accept the leak. (The same defect is F2a in `communications.md`.) | Incident Lead, then Technical Lead | — | open |
| F4 | Spaces | defect | A space whose creation stopped half-way cannot be deleted: 14 such spaces live on acceptance, and creation can still stop half-way (server#6648). Incident or backlog defect? Then: a delete that tolerates broken spaces, or a repair path for operators only. | Incident Lead, then Technical Lead | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 3 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F8 | Owned records | test | A create that fails half-way can leave policies without an owner; only the callout create rolls its children back. No API test can see this. Cover it by unit tests only, or by an operations SQL probe? | Quality Lead | — | open |
| OQ4 | Users | check | Does the case `me-degradation-anonymous` prove what a visitor gets when reading the deletion status? The case was not read, so cell W3 for a visitor is unproven. | Quality Lead | — | open |
| GAPS | All | test | 8 of the 21 rules have no test, several proven rules have untested parts, and 9 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Owned records | defect | Three owned policies cannot be read back through the API (a template's callout framing, the community guidelines profile, a poll), so three cases cannot assert that they are deleted. Reported on server#6614. | Technical Lead (Quality Lead extends the cases) | Fix the resolvers, then extend the cases. | suggested |
| OQ3 | Owned records | check | Has the clean-up of left-over policies (server#6655, #6657) shipped, and are the acceptance counts still current? Needs a database run. | Service Operations Lead (Quality Lead reruns the counts) | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Owned records | risk | The policy lookup tells any caller whether an id exists (a different refusal for a real id and a missing one), and the licence lookup has no access check at all. | Security Lead | Route as a security finding: attach it to the server#6663 family (leaks through the shape of an error) rather than a new issue. | suggested |


### Incident Lead

[Incident Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Enablement/Sub-circles/Incident%20Response/Roles/Incident%20Lead.md) · Enablement › Incident Response (Neil, Simone) · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Owned records | defect | A room is removed in Alkemio before the chat server confirms, and a failed Matrix deletion is ignored: 427 left-over Matrix rooms on acceptance, and the cause is still live (server#6727). Incident or backlog defect? Then: record the failed deletion so an operator can finish it, or accept the leak. (The same defect is F2a in `communications.md`.) | Incident Lead, then Technical Lead | — | open |
| F4 | Spaces | defect | A space whose creation stopped half-way cannot be deleted: 14 such spaces live on acceptance, and creation can still stop half-way (server#6648). Incident or backlog defect? Then: a delete that tolerates broken spaces, or a repair path for operators only. | Incident Lead, then Technical Lead | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Owned records | check | Has the clean-up of left-over policies (server#6655, #6657) shipped, and are the acceptance counts still current? Needs a database run. | Service Operations Lead (Quality Lead reruns the counts) | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Spaces | decision | Deleting an organisation, a space or a virtual contributor is not all-or-nothing: a failure half-way leaves part of it deleted. Only the user deletion was made safe. Accept partial deletes that can be retried, or give these three the same treatment? | Technical Lead (Architecture Lead for the new core) | — | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| Q-DEL-11 | The draft story stands: deleting a space with subspaces is refused, so nobody wipes subspaces other people lead by accident. | Product, 2026-11-20 | DEL-11 |
| CONST | Product rules on the deletion blocker kinds, the blocker list cap and the deleted-user sentinel, ticked "yes" in Appendix E. Error texts go to the Technical Lead. | Product, 2026-11-20 | Appendix E |
| F1 | Stays as today: a deleted user's chat (Matrix) account, room memberships and messages stay, and the help page keeps saying so (054 FR-024). Closing the chat account is a wish on the product issues list, linked to server#6728. | Product, 2026-11-20 | DEL-08; PRODUCT-ISSUES F1 |
| OQ2 | server#6728 is the record that tracks the follow-up; the wish on the product issues list links to it. | Product, 2026-11-20 | DEL-08 |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `register ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| DEL-01 | A user is deleted either by themself (self branch, derived server-side from "the caller is the target") or by a platform users admin; no other role — not even content-full-access, whose DELETE cascades onto user records — can delete a user. | user, PUA | code › `src/services/api/registration/registration.resolver.mutations.ts:42-45, 62-67, 138-190` · crosscheck › A5 (`access-matrix-crosscheck.md:107`) · test › `contributor-management/user/delete-own-account` › US1; `platform-roles/_support/groups/a5.ts` › `A5.deleteUser`; client-web `account-deletion/account-deletion-visibility` › `TC-16 — the Delete-account card is owner-only` | proven (covered elsewhere) |
| DEL-02 | Deletion is refused while the user's account still hosts a space, a virtual contributor, an innovation pack or an innovation hub; a self-deletion is additionally refused while the user is the only owner of any organisation. The pre-flight read and the refusal use one predicate, the list is capped at 25 items with exact per-kind totals and a truncation flag, and the self refusal carries its own code and the blocker kinds while the admin refusal keeps the old "account contains one or more resources". Authored content never blocks. | user, PUA | code › `src/domain/community/user/account-deletion/account.deletion.blocker.service.ts:9, 32-37, 58-165` · `src/domain/community/user/user.service.ts:698-720` · `src/services/api/me/me.resolver.fields.ts:364-405` · `src/domain/space/account.lookup/account.lookup.service.ts:158-244` · spec › `agents-hq origin/main:specs/054-delete-own-account/spec.md` FR-004…FR-007 · test › `delete-own-account` › US2 (4 kinds + truncation), US4 (sole owner); `vc` › `should not delete user who hosts an account`; client-web `us2-blocked-resources` › US2-AS1…AS5 | proven (covered elsewhere) |
| DEL-03 | A self-deletion is accepted only from a session established within the last 15 minutes; a missing, zero, negative or unparseable session age is refused; the refusal carries its own "session refresh required" code; the admin branch is not gated. | user | code › `registration.resolver.mutations.ts:148-172` · `src/common/constants/session.constants.ts:11` · test › `delete-own-account` › US3 (4 cases); client-web `us3-reauth-freshness` › US3-AS1/AS2/AS3 | proven (covered elsewhere) |
| DEL-04 | A user deletion removes, in one database transaction: the user's pending invitations and applications, every platform invitation addressed to their e-mail, the user's profile with its tagsets, references, visuals, location and storage bucket (document rows and their policies), the user policy, the user's storage aggregator, the user settings with their policy, the actor row — which cascades every credential the user held (space, organisation and platform roles, account admin) — and then the account (ACC-19). After the commit, each best-effort and separately audited: all sessions are revoked (OIDC and Kratos), the Kratos actor metadata cleared, the sign-in identity deleted, every document's bytes removed through the file service, and the emptied bucket rows dropped. | user, PUA | code › `src/services/api/registration/registration.service.ts:394-481, 497-636` · `user.service.ts:680-757, 766-857` · `src/domain/space/account/account.service.ts:251-308` · `src/domain/storage/storage-bucket/storage.bucket.service.ts:122-170` · test › `group-a-delete-owned-records` › `GA-8 - deleting a user deletes its settings policy, and its pending application with its policy (control)`; `delete-user` › `should delete created user`, `should not get result for quering deleted user`; `delete-own-account` › US1, US5 `post-commit legs are recorded…`; client-web `us1-delete-own-account` › `US1-AS4: the deleted account can never sign in again`; `session-revocation` › SRB-G1…E4 | proven |
| DEL-05 | On the self branch the sign-in identity is always deleted, whatever the caller asked; an admin chooses (default: delete). | user, PUA | code › `registration.resolver.mutations.ts:204-209` · `schema.graphql:9710-9713` (`deleteIdentity: Boolean = true`) · test › `a5.ts` › `A5.deleteUser` (admin, `deleteIdentity: true`) | untested (the override itself) |
| DEL-06 | Nothing a user authored is deleted or blocks deletion — posts, comments, whiteboards, reactions, activity stay; wherever an activity entry names the departed user it shows a fixed "Former member" with a closed (always-deny) policy and an empty bucket, with no lookup per entry. | all readers | code › `src/domain/community/user/account-deletion/deleted.user.sentinel.ts:12-60` · `src/domain/community/user/user.resolver.fields.ts:147, 171-175, 199-201` · spec › 054 FR-022 · test › client-web `account-deletion/former-member-activity` › `TC-15 — the activity feed shows Former member and still loads` | proven (covered elsewhere) |
| DEL-07 | Every deletion writes one primary account-deletion audit row in the same transaction (initiator self or platform admin, account id, blocker check, billing linkage, document count — never a name or e-mail) and one appended row per post-commit leg with its own outcome; an administrative deletion also writes the users-admin record audit; a self-deletion writes no administrative audit. The operator "profile removed" notification is sent best-effort and carries no personal data. | user, PUA, platform audit readers | code › `src/domain/community/user/account-deletion/account.deletion.audit.service.ts` · `registration.service.ts:463-471, 497-566` · `registration.resolver.mutations.ts:226-273` · test › `delete-own-account` › US1 (`…leaves one surviving self-initiated audit row`), US5; client-web `us1-delete-own-account` › `US1-AS5`; `profile-removed-notification` › TC-14 (×2) | proven (covered elsewhere) |
| DEL-08 | A deleted user's chat identity survives: the Matrix account is not deactivated, the user is not removed from the rooms they were in, and their display name and messages remain. | — | code › no Matrix call on the deletion path (`registration.service.ts:394-636`, `user.service.ts:680-857`); the only room-leave is on explicit role removal (`src/domain/access/role-set/role.set.service.ts:1341-1356`) · register › `acc-defect-register.md:189` (P4) · spec › 054 Edge cases "Chat (Matrix) identity: NOT removed in v1" | untested (see F1) |
| DEL-09 | An organisation is deleted by one of its owners or by platform support, and only while its account hosts no space, VC, pack or hub ("account contain one or more resources"). The deletion removes the invitations addressed to the organisation (and tells the spaces concerned to drop the visibility those gave), its profile, storage, user groups, policy, verification, its role set — revoking every member's, admin's and owner's credential, including the implicit account-admin — then the actor row and the account with everything the account owns. | organisation owner, support | code › `registration.resolver.mutations.ts:277-312` · `registration.service.ts:614-640` · `src/domain/community/organization/organization.service.ts` (deleteOrganization) · `role.set.service.ts` (removeRoleSetOrFail, removeAllRoleAssignments) · `account.service.ts:310-353` · test › `contributor-management/organization/organization` › `Organization > delete` › `should delete`, `should FAIL on unknown id`; `hosted-resources` teardown proves the organisation is gone | proven (the refusal and the owned-records half are untested) |
| DEL-10 | Removing the last owner of an organisation through role management is refused, but deleting that owner's account through the admin path is not — which is why the self path blocks on sole ownership and the admin path is the documented way to unblock it. | organisation owner, PUA | code › `account.deletion.blocker.service.ts:39-49, 112-165` · test › `organization-owner` › `should not remove the only owner of an organization`; `delete-own-account` › US4 (both cases) | proven (covered elsewhere) |
| DEL-11 | A space with subspaces cannot be deleted; each subspace is deleted first ("Unable to remove Space (<id>), with level <n>, as it contains <k> subspaces"). | space admin | code › `src/domain/space/space/space.service.ts` (deleteSpaceOrFail, subspaces guard) | untested |
| DEL-12 | Deleting a space removes, in order and not atomically: the space's own actor profile and bucket first (so a refusal — a document held by a signing attempt — or a file-service failure leaves the space whole and the delete retryable), the Matrix space with everything under it (a failure is logged, never blocks), the about, the collaboration and every callout under it, the community — its role set (every member credential, application, invitation, platform invitation, form, licence), groups and communication with its updates room — the licence, the policy, the templates manager (top-level spaces only), the storage aggregator and the actor row. | space admin | code › `space.service.ts` (deleteSpaceOrFail) · `src/domain/community/community/community.service.ts` (removeCommunityOrFail) · `src/domain/communication/communication/communication.service.ts:84-105` · test › `space-delete-owned-records` › SD-1, SD-2; `group-a-delete-owned-records` › GA-4; `journey/space` › `should remove space` · spec › `server/specs/082-matrix-space-lifecycle/spec.md` US5, FR-004, FR-008 | proven (Matrix half untested) |
| DEL-13 | A half-created space (no collaboration or community) cannot be deleted at all: the delete refuses with a relationship error, so such spaces stay forever. | space admin, POA | code › `space.service.ts` (deleteSpaceOrFail relations guard) · issue › server#6648 · knowledge › `journey.md` JRN-11 (F-6) | untested (see F4) |
| DEL-14 | An account is deleted only through its host's deletion and asserts, inside the host's transaction, that it holds no space, VC, pack or hub ("Account still holds resources at deletion time"); it then removes its storage aggregator and bucket, its licence, its profile, its policy and its actor row with the credentials on it. | server | code › `account.service.ts:240-308` · test › `GA-8` (user with an empty account deleted; the account's own rows are not asserted) | untested (the account rows after a user deletion) |
| DEL-15 | Deleting a record deletes its own authorization policy and those of the records it owns: a callout its classification and tagsets, comments room, poll, and every contribution with its room; an innovation-flow state its policy; a template its profile and content (callout or community guidelines); a forum discussion its profile and comments room; an innovation pack its profile, templates set and templates; a space its guidelines, innovation flow and states, communication and updates room, templates manager, defaults, set and templates; a user their settings and pending applications; a promoted subspace its replaced licence. Nothing owned by a deleted record resolves afterwards. | all deleters | code › the thirteen delete sites of #6678 + `src/domain/collaboration/callout/callout.service.ts`, `space.service.ts`, `conversion.service.ts` (#6637) · `src/domain/common/authorization-policy/authorization.policy.service.ts:218-238` · test › CD-1, CD-2, GA-1…GA-8; `journey/conversion/convert-L1-to-L0-basic` › `replaced subspace license and its policy are deleted (server#6614)` · issue › server#6614 · register › G1 | proven |
| DEL-16 | Deleting a room deletes its policy and its row, then asks the chat server to delete the room; when the chat server refuses or is down the Alkemio row is already gone and the Matrix room survives. | server | code › `src/domain/communication/room/room.service.ts:94-119` · `src/services/adapters/communication-adapter/communication.adapter.ts:513-537` · register › `acc-defect-register.md:186` · test › GA-3, GA-6 (row side only) | untested (see F2; GA-3 and GA-6 assert the row side only) |
| DEL-17 | A document is deleted through the file service first; the server-side policy and tagset are removed after it answers (a failure there is logged, not retried). A storage bucket — and therefore the profile, space, user or account above it — cannot be deleted while any of its documents is held by a signing attempt ("Storage contains a document retained by a signing attempt"). | all deleters | code › `src/domain/storage/document/document.service.ts:47-98` · `storage.bucket.service.ts:172-209` · test › SD-2 (policy gone, file 404) | proven (the signing refusal is untested: no harness lever) |
| DEL-18 | Deleting a virtual contributor removes, in one transaction, its profile, policy, its pending space invitations, its AI persona (a failure is logged), its actor row with every role credential, and its knowledge base; the spaces that had invited it are told afterwards so their invitee visibility drops. | account admin | code › `src/domain/community/virtual-contributor/virtual.contributor.service.ts` (deleteVirtualContributor) · test › `vc` › `should return invitations after virtual contributor is removed` | proven (owned records untested) |
| DEL-19 | Deleting an innovation pack removes its templates set with every template, its profile and its policy; deleting an innovation hub removes its profile and policy. | account admin, PCFA | code › `src/library/innovation-pack/innovation.pack.service.ts` (deleteInnovationPack) · `src/domain/innovation-hub/innovation.hub.service.ts` (delete) · test › GA-7 (pack) | proven (pack; hub untested) |
| DEL-20 | Internal files — collaboration snapshots, Collabora previews, memo-signing previews — are created without an authorization policy and are not an orphan. | server | register › `acc-defect-register.md:96` (G3) | untested |
| DEL-21 | Resets never remove orphan policies, and a reset that meets a broken child skips that subtree (logging an error) rather than aborting; existing orphans and stale leaves stay until a cleanup migration runs. | POA | code › `src/domain/space/space/space.service.authorization.ts:244-283` · `src/domain/space/account/account.service.authorization.ts:257-292` · `src/migrations/1771000026000-FixNotificationAndAuthPolicyStaleData.ts:71-79` (the only orphan sweep, 'agent'-typed rows) · crosscheck › F2 · register › G1 | untested (see F5) |

### B. Rights: evidence

The evidence text below uses the shorthands of the former table. Its legend:

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `registration.resolver.mutations.ts:42-67, 138-190, 277-312` (user and organisation gates); `admin.users.resolver.mutations.ts` (adminUserAccountDelete, PUA); `me.resolver.fields.ts:364-378`; `account.service.authorization.ts:464-502, 510-540` (account admin CRUD cascading to spaces/VCs/packs/hubs); `src/services/api/lookup/lookup.resolver.fields.ts:292-306`; access matrix `user` (`access-matrix.md:1174-1205`: `delete` = user-self D, PCFA CT, PUA via `pf:users-admin`), `account` (`:914-947`), `organization` (`:1240-`); crosscheck rows A5, A6, A8 (`access-matrix-crosscheck.md:107-113`), F6 (synthetic admin-user-account-delete). "PCFA via cascaded DELETE" cells are the stored-policy derivation; the user-deletion resolver explicitly refuses that path (DEL-01).

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. Where this text says "finding 3" or "F-3", section 3 says F3._

#### Findings

- **F1 — Deleting an actor leaves its chat identity (DEL-08).** Code: no Matrix call on the user, organisation or VC deletion path; room membership is only dropped on explicit role removal. Spec 054: out of scope for v1, "sibling story filed immediately after v1". Data: W4 P4 — 84 orphan Matrix accounts, 65 still joined, 1,780 messages by deleted senders; filed server#6728. Ruling: confirm the sibling story exists and is scheduled; until then the help page must keep saying the chat identity persists (054 FR-024). **Product, 2026-11-20:** stays as today and the help page keeps saying the chat identity persists (054 FR-024); closing a deleted user's chat account is a wish on the product issues list, linked to server#6728.
- **F2 — A room row is deleted before the chat server confirms (DEL-16).** Code: `deleteRoom` removes the row, then calls the adapter, which returns `false` on failure, which nobody reads. Spec 082 FR-008: adapter failures log, never block. Data: W4 P1 — 427 orphan Matrix rooms; filed server#6727. Ruling: record the failed Matrix delete (outbox/audit) so an operator can finish it, or accept the leak.
- **F3 — Organisation, space and VC deletions are not atomic (DEL-09/12/18).** Code: the organisation path runs with no transaction; `deleteSpaceOrFail` runs step by step; the VC and organisation-account wrappers open a transaction whose manager the steps ignore — 054 "Assumptions" says the same of the old user path ("the wrapper propagates nothing and is not actually transactional"), which the saga fixed for users only. Test: none forces a mid-way failure outside the user saga. Ruling: accept retryable partial deletes (the space path is designed to be retryable) or extend the saga pattern.
- **F4 — Half-created spaces cannot be deleted (DEL-13).** Code: the delete loads collaboration/community/about/storage/licence and throws `RelationshipNotFoundException` when any is missing — the same anomaly the reset learned to skip (DEL-21). Issue server#6648 (14 live on ACC). Test: none. Ruling: a tolerant delete for broken spaces, or an ops-only repair path.
- **F5 — Orphans are skipped, never swept (DEL-21).** Code: the only sweep ever run targeted 'agent'-typed rows; `resilientCascade` skips a broken subtree and leaves its stale rules (crosscheck F2). Data: G1 ~9,400 orphans, inert while nobody holds retired credentials. Spec: #6655 cleanup migration deferred. Ruling: run #6655 before the dry-run baseline, or classify G1 as V and stop.
- **F6 — The orphan oracle is an existence oracle for everyone.** Code: `lookup.authorizationPolicy` loads the row before checking `PLATFORM_OPERATIONS_ADMIN`, so a non-POA caller gets `ENTITY_NOT_FOUND` for a missing id and `FORBIDDEN` for a real one; `lookup.license(ID)` has no privilege check at all. Test plan § Security lists both as open questions to the reviewer. Ruling: route as a security finding (attach to the server#6663 "leaks through error shape" family rather than a new issue, per the register convention).
- **F7 — Three owned policies cannot be observed (DEL-15).** `Template.callout.framing.authorization`, `CommunityGuidelines.profile.authorization` and `framing.poll.authorization` resolve null, so GA-2/GA-4/GA-5 cannot assert them (GA-2 reads the poll policy from another answer). Reported on server#6614; resolver gap, not a known leak. Ruling: fix the resolvers, then extend the cases.
- **F8 — Failed creates can leave owner-less policies.** Only the callout create path rolls its children back (#6679); other create paths are unfixed (test-plan D-3). Test: none possible over the API (rolled-back children return no id). Ruling: unit-level only, or an ops SQL probe (W4 register class V).
- **F9 — The space-deletion refusal text embeds the id; the organisation refusal has a grammar slip.** `Unable to remove Space (<id>) …` contradicts the repo rule against dynamic data in exception messages; "account contain one or more resources". Rebaseline rows when cleaned; not behaviour changes.

#### Open questions

- **OQ1 — Is the legacy non-saga `deleteUser` still reachable.** `UserService.deleteUser` (boolean refusal, plain transaction wrapper) still exists beside the saga; no resolver calling it was found, but the search was not exhaustive. If anything calls it, DEL-02/03/07 do not hold on that path.
- **OQ2 — Whether the sibling Matrix-deprovisioning story (054 Fork 3) exists on the board.** The register links server#6728; whether that is the story or only the defect is a board check. **Product, 2026-11-20:** server#6728 is the record the wish links to.
- **OQ3 — Live state of #6655 / #6657.** Whether the orphan-cleanup migration has shipped or the counts in G1 are still current on acceptance needs a DB run (standing constraint: no DB access from test-suites).
- **OQ4 — The `me-degradation-anonymous` case for `accountDeletion`.** The file references the field; the case title was not read, so it is not counted as proof for the anonymous row of the who-may table.
- **OQ5 — What cascades delete for a deleted user's conversations, notifications and MCP keys.** The code comment claims a cascade; the schema was not read. A W4 probe ("MCP keys → actors", "in-app notification refs") covers the data side, not the behaviour.

### D. Test gaps

_For the Quality Lead. The GAPS row in section 3 asks which of these get a case._

Untested rules by id: DEL-05 (self-branch identity override), DEL-11 (subspaces guard), DEL-14 (account rows gone after a user deletion), DEL-20 (internal files), plus the untested clauses of DEL-09 (organisation refusal while resources exist; owned records of an organisation — role credentials revoked, groups, verification), DEL-12 (Matrix space deleted; delete with a signing-held document refused — D-4), DEL-17 (signing refusal), DEL-18 (VC owned records: profile, knowledge base, persona), DEL-19 (hub owned records).

Behaviours the area has that neither reading nor tests pinned down:
- A user's space, organisation and platform-role memberships disappearing with the credential cascade (observable as "no longer a member" the next time a member list is read) and the organisation they were a non-sole owner of keeping its other owners (054 US4-AS3).
- Platform invitations addressed to the deleted e-mail being erased (consumed ones included) — the language suite's teardown observes they are still deletable after registration, not that account deletion removes them.
- In-app notifications, MCP API keys and conversation memberships of a deleted user ("cleaned up via cascade" comment only).
- The forum and licence-policy singletons (unit-only in #6678).
- `authorizationPolicyResetAll` leaving every remaining policy reachable (whole-table SQL property; false until #6655 and fix areas 1 and 3 ship).
- Deleting a space whose Matrix space is already gone completes without error (082 US5-AS3).
- Deletion of an organisation that is member/lead of spaces: whether those memberships are removed (the role-set cascade only covers the organisation's own role set; the organisation's credentials cascade with its actor row).
- Orphan counts on acceptance stop growing after #6637/#6678 (plan M-3; needs DB access — standing constraint).
- A retry of a space delete after a first attempt failed at the profile step finishes the job (unit-pinned only).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Deletion blocker kinds (5) | `ACCOUNT_SPACE`, `ACCOUNT_VIRTUAL_CONTRIBUTOR`, `ACCOUNT_INNOVATION_PACK`, `ACCOUNT_INNOVATION_HUB` (self-resolvable), `SOLE_ORGANIZATION_OWNER` (self branch only, not self-resolvable) | `src/common/enums/account.deletion.blocker.kind.ts:10-16`; `account.deletion.blocker.service.ts:32-37, 80-105` | yes | Product Lead |
| Blocker list cap | 25 items; `totals` exact per kind; `truncated` flag | `account.deletion.blocker.service.ts:9`; `schema.graphql:4552-4568` | yes | Product Lead |
| Privileged session window | 15 minutes (`PRIVILEGED_SESSION_WINDOW_MS = 15 * 60 * 1000`); fail closed on missing/zero/negative | `src/common/constants/session.constants.ts:11`; `registration.resolver.mutations.ts:148-172` | no | Security Lead |
| Initiator branches | `self` (actor == target) / `admin`; audit initiator roles `SELF` / `PLATFORM_ADMIN` | `account.deletion.blocker.service.ts:30`; `registration.service.ts:400-403` | no | Technical Lead |
| `deleteIdentity` default | `true`; forced `true` on the self branch | `schema.graphql:9710-9713`; `registration.resolver.mutations.ts:204-209` | no | Security Lead |
| Deleted-user sentinel | id `00000000-0000-0000-0000-000000000000`, display name `Former member` (English only), always-deny policy, empty bucket | `deleted.user.sentinel.ts:12-46` | yes | Product Lead |
| Audit outcomes (account deletion) | `ACCOUNT_DELETED` (primary), `SESSION_REVOCATION_COMPLETED` / `SESSION_INVALIDATION_FAILED`, `IDENTITY_DELETION_COMPLETED` / `IDENTITY_DELETION_FAILED`, `FILE_BYTES_CLEANUP_COMPLETED` / `FILE_BYTES_CLEANUP_FAILED` (+ `fileExternalIDs`, error ≤ 250 chars) | `registration.service.ts:497-566`; `account.deletion.audit.service.ts` | no | Security Lead |
| Audit detail allowlist | `accountID`, `blockerCheck`, `externalSubscriptionID`, `documentCount`, `error`, `fileExternalIDs` — never name or e-mail | `account.deletion.audit.service.ts:19-33` | no | Security Lead |
| Error text — self blocked | `Unable to delete User: account is blocked from deletion` + code `ACCOUNT_DELETION_BLOCKED` with `blockers: [kinds]` | `user.service.ts:707-713`; `src/common/exceptions/error.status.metadata.ts` | no | Technical Lead |
| Error text — admin blocked | `Unable to delete User: account contains one or more resources` | `user.service.ts:714-717, 657-662` | no | Technical Lead |
| Error text — stale session | `Deleting your own account requires a recently established session` (SessionRefreshRequired) | `registration.resolver.mutations.ts:166-171` | no | Technical Lead |
| Error text — organisation blocked | `Unable to delete Organization: account contain one or more resources` (sic) | `organization.service.ts` (deleteOrganization) | no | Technical Lead |
| Error text — space has subspaces | `Unable to remove Space (<id>), with level <n>, as it contains <k> subspaces` | `space.service.ts` (deleteSpaceOrFail) | no | Technical Lead |
| Error text — signing hold | `Storage contains a document retained by a signing attempt` | `storage.bucket.service.ts:201-205` | no | Technical Lead |
| Error text — account not empty | `Account still holds resources at deletion time` | `account.service.ts:262-273` | no | Technical Lead |
| Error text — identity reset | `Failed to delete user account` (adminUserAccountDelete) | `admin.users.resolver.mutations.ts` | no | Technical Lead |
| Not-found shapes | `ENTITY_NOT_FOUND` for policy / profile / document / space / callout / room / template / user; `storageBucket` answered `UNSPECIFIED` "Could not find any entity of type StorageBucket" before #6678 | `_support/owned-records.ts:96-118` | no | Technical Lead |
| Database cascades | `credential.actorID → actor.id ON DELETE CASCADE`; `user/organization/space/account/virtual_contributor.id → actor.id CASCADE`; `actor.profileId` SET NULL; `space.account` SET NULL; everything else explicit | `user.service.ts:742-744`; `space.service.ts` (profile comment); `space.entity.ts:52-62` | no | Technical Lead |
| Group-A delete sites (13) | innovation-flow state, room, user settings, community guidelines, innovation flow, communication, template, template default, poll, discussion, innovation pack, forum, license policy | `orphan-free-deletion-test-plan.md`; server#6678 | no | Technical Lead |
| Exceptions a reset swallows | `RelationshipNotFoundException`, `EntityNotFoundException` (skip subtree + error log); all others propagate | `space.service.authorization.ts:258-283`; `account.service.authorization.ts:270-292` | no | Technical Lead |
| GraphQL surface | `deleteUser(DeleteUserInput{ID, deleteIdentity})`, `deleteOrganization`, `deleteSpace`, `deleteVirtualContributor`, `deleteInnovationPack`, `deleteInnovationHub`, `adminUserAccountDelete(userID)`, `me.accountDeletion: MeAccountDeletionStatus{canDelete, sessionFresh, blockers[], totals[], truncated, externalSubscriptionLinked}`, `AccountDeletionBlocker{kind, resourceID, displayName, selfResolvable, url}`, `lookup.authorizationPolicy(ID)` | `schema.graphql:35-41, 1334-1353, 4548-4568, 4647, 5092, 5110, 9710-9713` | no | Technical Lead |

### F. Where this lands in the new core

The new core stores no authorization policies, no derived credentials and no per-entity licence snapshot, so DEL-15, DEL-21 and the whole G1 class vanish by construction (register class **V**): there is no policy row to orphan, and "every remaining policy is reachable from a live record" stops being a property anyone has to prove. What remains are the real ownership cascades — actor → profile/storage/settings/credentials, space → about/collaboration/community/licence, account → resources — which should be declared as foreign keys with `ON DELETE` behaviour (catalogue: one actor table, resources keyed by `account_id`) instead of ordered service code, so that DEL-04/09/12/14 become single transactional deletes and DEL-13 (#6648) cannot recur. Three things the ETL must carry: (1) the W4 register's **Q** rule — orphan policies, buckets, files, Matrix rooms and accounts (G1, F6, P1, P4) are reported, never dropped silently, and the counts go on the expected-loss list; (2) the sentinel (DEL-06) becomes a nullable author reference rendered as "former member", not a magic id; (3) the external legs — file bytes, Kratos identity, sessions, and the Matrix deprovisioning that DEL-08 says is still missing — stay post-commit, idempotent and audited (DEL-07), because they are not in the database at all. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/orphan-free-deletion/`, 3 files, 12 cases, plus `_support/owned-records.ts`); the specs, issues and docs listed in § Sources. Scope: what deleting a user, an organisation, a space, an account or one of their owned records removes, reassigns or refuses — profile, storage, authorization policies, roles and credentials, rooms, sign-in identity, sessions, audit — and where orphans are known to be left. Who may delete a space, callout or template is the journey / callout / templates area; who may delete a user or organisation is stated here because the two paths carry their own gates. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. DEL-03 now cites 054 US3; DEL-09's restating why was dropped; Q-DEL-19 has a suggested answer from DEL-15.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/services/api/registration/registration.resolver.mutations.ts`, `registration.service.ts`; `src/services/api/me/me.resolver.fields.ts`; `src/services/api/lookup/lookup.resolver.fields.ts`; `src/platform-admin/domain/user/admin.users.resolver.mutations.ts`
- `src/domain/community/user/user.service.ts`, `user.resolver.fields.ts`, `account-deletion/account.deletion.blocker.service.ts`, `account.deletion.audit.service.ts`, `deleted.user.sentinel.ts`; `src/domain/community/organization/organization.service.ts`; `src/domain/community/virtual-contributor/virtual.contributor.service.ts`; `src/domain/community/community/community.service.ts`; `src/domain/community/community-communication/community.communication.service.ts`
- `src/domain/space/space/space.service.ts`, `space.service.authorization.ts`, `space.entity.ts`; `src/domain/space/account/account.service.ts`, `account.service.authorization.ts`; `src/domain/space/account.lookup/account.lookup.service.ts`
- `src/domain/access/role-set/role.set.service.ts`; `src/domain/communication/communication/communication.service.ts`, `src/domain/communication/room/room.service.ts`; `src/services/adapters/communication-adapter/communication.adapter.ts`
- `src/domain/common/authorization-policy/authorization.policy.service.ts`; `src/domain/common/profile/profile.service.ts`; `src/domain/storage/storage-aggregator/storage.aggregator.service.ts`, `storage-bucket/storage.bucket.service.ts`, `document/document.service.ts`; `src/library/innovation-pack/innovation.pack.service.ts`; `src/domain/innovation-hub/innovation.hub.service.ts`
- `src/common/enums/account.deletion.blocker.kind.ts`; `src/common/constants/session.constants.ts`, `authorization/audit.intended.owners.ts`; `src/migrations/1771000026000-FixNotificationAndAuthPolicyStaleData.ts`
- `schema.graphql`; `CLAUDE.md` (107 session revocation)
- git: `3451c824d` (#3122), `656bec3df` (#6416), `08f088eaa` (#6637), `fc00fd19c` (#6094), `f66a9183f` (#6468)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/orphan-free-deletion/callout-delete-owned-records.it-spec.ts`, `space-delete-owned-records.it-spec.ts`, `group-a-delete-owned-records.it-spec.ts`, `_support/owned-records.ts`, `orphan-free-deletion-test-plan.md` (Approved)
- `docs/qa/server-rebuild/knowledge/_inventory.md` § orphan-free-deletion; `access-matrix.md` (§ user, § account, § organization); `access-matrix-crosscheck.md` (A5, A6, A8, F2, F6)
- `docs/qa/server-rebuild/data-integrity/acc-defect-register.md` (G1, G3, P1, P4, E1, I1, I3, F6; class legend)
- Other suites touching the area (list only): see dossier § 3

Specs / issues:
- `agents-hq origin/main:specs/054-delete-own-account/spec.md` (FR-001…FR-026, US4, Edge cases, Decision log, Out of Scope; not in the local clone)
- server `specs/026-actor-transformation/spec.md` (FR-009); server `specs/082-matrix-space-lifecycle/spec.md` (US5, FR-004, FR-008)
- alkem-io/server #6614 (story), #6637, #6678 (fixes), #6679, #6655, #6657 (deferred), #6648 (half-created spaces), #6727 (rooms), #6728 (Matrix accounts), #6315 (session revocation), #6417 (session-age gate), #6094 (resilient cascade), #6468 (signing hold)
