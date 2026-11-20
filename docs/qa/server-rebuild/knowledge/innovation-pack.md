# Innovation packs: behaviour rules

_What the platform does today for an innovation pack in the library: how it is created and owned, who sees it, how it is listed, moved and deleted, and what is still to answer. The templates inside a pack are in `templates.md`; the pack allowance is in `entitlements.md`. The layout is that of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**. Product has not reviewed this file yet._

_Open questions per owner: Product Lead 7 · Technical Lead 3 · Quality Lead 6 · Security Lead 1. By state: 14 open · 3 with a suggested answer. Proof of the 15 rules: 5 proven by a test · 10 untested (Appendix A)._

_Whys of the 15 rules: 11 rest on a source · 3 carry a draft for product to decide (IPK-04, IPK-08, IPK-14) · 1 has none, and it already carries an open question (IPK-03: Q-IPK-03, F3)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit, a pull request or an issue. "Not decided: exists in the code" means the behaviour is in the code and no source shows that anybody chose it.
- A marker in bold at the end of a rule points at section 3: **(open: F2)** means a question on this rule is still open, **(defect: F2)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F2)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Creating and owning a pack

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| IPK-01 | A pack belongs to exactly one account. The account's admins create it (a user on their own account, an organisation admin on the organisation's), within the account's pack allowance: 3 on the Plus plan. Platform Content Full Access can create one on any account. **(open: F1)** | Packs are account-hosted resources like spaces and VCs, so one entitlement model covers all (027 rows 2/8; ENT-01/16). | — | — | Spec 027 rows 2/8; `entitlements.md` ENT-01/16 |
| IPK-02 | A pack's name id (the short name in its link) is unique among all packs on the platform and is stored in lower case. A name id that is taken is refused. When none is given, one is made from the pack's name. **(open: Q-IPK-02, OQ3)** | — | — | The name id is the whole path of the pack's web address (`/innovation-packs/<nameID>`, `url.generator.service.ts:481`, `:1239`); with no parent in the path it has to be unique on the whole platform. No source states why it is lower case. | Not decided: exists in the code |
| IPK-03 | A new pack always starts listed in the store and visible inside its account only; the creator cannot choose this when creating it. It starts with no templates, a profile with avatar and card images, and a default tag set. **(open: Q-IPK-03, F3)** | — | — | — (the bootstrap comment records the consequence: the seeded pack must be re-saved public after every create) | Not decided: exists in the code |
| IPK-04 | A pack's provider is the host of its account, a user or an organisation. When the pack moves to another account, the provider changes with it. | The library shows who stands behind a pack; the account, not the creator, is the owner. _(draft)_ | — | — | Not decided: exists in the code |
| IPK-05 | The account's admins can update a pack: its profile, name id, store listing and visibility. Platform Support can update a pack owned by an organisation, never one owned by a user. Platform Content Full Access can update any pack. | Support assists organisations with their own resources only (027 A7, FR-008(b)); user-hosted accounts are out of scope (spec-server-14 fix). | — | — | Spec 027 A7, FR-008(b) |
| IPK-06 | Deleting a pack deletes its templates and its profile with it. The account's admins and Platform Content Full Access can delete a pack; Platform Support cannot. Only a deletion by a platform role is written to the audit trail. **(open: F6)** | Pack deletion stays out of support's reach (027 A8); audit on the platform branch only (027 T058 / FR-018a). | — | — | Spec 027 A8, FR-018a (T058) |
| IPK-07 | Only the Platform Resource Admin can move a pack to another account; its owner and Platform Support cannot. The target account's pack allowance is not checked. Access to the pack and its templates is worked out again under the new account, and the move is audited. **(open: F5, F6)** | Resource transfer is its own platform family (027 A9); the audit covers the platform path only. | — | — | Spec 027 A9 |
| IPK-08 | A user cannot delete their own account while it still hosts a pack. The pack must be deleted or moved first. | Owned records are never dropped silently (orphan-free deletion). _(draft)_ | — | — | Not decided: exists in the code |

### Visibility and listing

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| IPK-09 | Visibility decides where a pack is listed, not who can read it: hidden packs show only when opened directly, account packs only inside their account, public packs everywhere. Which packs a viewer sees on a profile depends on who the viewer is (section 2, W6). **(open: F2)** | A profile shows what the viewer is entitled to see (017 "existing platform visibility rules") | — | the enum comments define the three scopes. | Spec 017 ("existing platform visibility rules") |
| IPK-10 | Anyone, signed in or not, can read any pack directly. The list of an account's packs returns all of them, hidden ones included. **(open: F2, OQ2)** | — | — | "By default it is world visible. TODO: work through the logic on this" (account policy comment). | Not decided: exists in the code (the code comment says "TODO") |
| IPK-11 | The Innovation Library shows only packs that are listed in the store and public, most templates first. Its paged lists show the newest first, at most 100 per page, with a text search on title, description and tags. Everyone can read it, visitors included. **(defect in part: F4)** **(open: F7, OQ4)** | Pagination for a library that outgrew one page (101 FR-001–FR-015) | — | search without the provider join because it would slow every page (101 FR-022); the library has always been world-visible (authorization comment). | Server spec 101 FR-001–FR-015, FR-022 |
| IPK-12 | The platform keeps one pack of its own, "Classifications", on the host organisation's account. At every start it is set to listed and public, so the classification picker always finds its vocabulary. | — | — | The seed targets one dedicated platform pack; the picker reads every publicly listed pack (024 FR-005a/b, ruling D3). | Spec 024 FR-005a/b, ruling D3 |

### Templates in a pack

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| IPK-13 | A pack holds templates of every kind. The account's admins create, update and delete them; so can Platform Support on an organisation's pack, and Platform Content Full Access on any pack. Everyone can read the templates of a pack. **(open: F1, W9)** | A pack is a publishing vehicle: its templates are meant to be found and used from any space (DT-4 "toolbox route", 085). | — | — | Spec 085 (DT-4); client-web#8804 |
| IPK-14 | A pack has no access rules of its own: it copies those of its account. They are worked out again when the account is reset and when the pack moves. Packs count towards the account's usage. | — | — | One policy source per account tree (account cascade); the pack adds nothing. _(draft)_ | Not decided: exists in the code |
| IPK-15 | An innovation hub can show a hand-picked list of packs on its start page. The list starts empty, and a visitor sees in it only what they could already see in the library. | Hubs showcase; they never widen visibility (017 clarifications). | — | — | Spec 017 clarifications |

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. The row ids are new; the cells are those of the former who-may table and product has not reviewed them yet. Evidence is in Appendix B._

### Packs

| ID | Action | Platform roles | Platform License Manager | Platform Support | Account holder | Organisation associate | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Create a pack on an account | Y¹ | N² | N | Y³ | N | N | N |
| W2 | Update a pack (profile, name id, listing, visibility) | Y⁴ | N | Y⁵ | Y | N | N | N |
| W3 | Delete a pack | Y⁶ | N | N | Y | N | N | N |
| W4 | Move a pack to another account | Y⁷ | N | N | N | N | N | N |
| W5 | Read a pack directly, by id or name id | Y | Y | Y | Y | Y⁸ | Y⁸ | Y⁸ |
| W6 | List the packs on a profile | Y⁹ | Y | Y | Y¹⁰ | Y¹¹ | Y¹² | –¹³ |
| W7 | List the packs of an account | Y¹⁰ | Y | Y | Y | Y¹⁴ | Y¹⁴ | Y¹⁴ |
| W8 | See a pack in the Innovation Library | Y¹⁵ | Y | Y | Y | Y | Y | Y |

"Account holder" is the user whose account it is, or an admin of the organisation that owns it. ¹ Platform Content Full Access only, on any account. ² Unless also the account holder; may then go over the allowance. ³ On their own account, within the allowance. ⁴ Platform Content Full Access only. ⁵ On packs owned by an organisation; refused on packs owned by a user. ⁶ Platform Content Full Access only; audited. ⁷ Platform Resource Admin only, who offers the pack from the source account and accepts it on the target. ⁸ Readable by the whole world, hidden packs included; question F2. ⁹ All packs, through a platform right on the account. ¹⁰ All packs. ¹¹ Public and account packs. ¹² Public packs only. ¹³ A visitor gets no list. ¹⁴ All packs, hidden ones included; question F2. ¹⁵ Only packs that are listed in the store and public; this holds for every column.

### Templates in a pack

| ID | Action | Platform roles | Platform License Manager | Platform Support | Account holder | Organisation associate | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W9 | Create, update or delete templates in a pack | Y¹⁶ | Y¹⁷ | –¹⁷ | Y | N | N | N |
| W10 | Read the templates of a pack | Y | Y | Y | Y | Y | Y | Y |

¹⁶ Platform Content Full Access only. ¹⁷ On packs owned by an organisation. These two cells are copied from the former table as they stood. Rule IPK-13 and its evidence give this right to Platform Support, not to the Platform License Manager, so the two cells look swapped; question W9.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding and question, with code lines and data, is in Appendix C under the same id; GAPS is Appendix D and CONST is Appendix E._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 7 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Visibility | decision | A hidden or account-only pack is kept out of lists, but anyone who holds its id can read it, visitors included, and the list of an account's packs returns hidden packs to anyone. Is visibility only a help for discovery, or must such a pack be unreadable to outsiders? In the second case this is a defect, like finding 5 in `entitlements.md`. | Product Lead (Security Lead rates the exposure) | — | open |
| F3 | Ownership | decision | A pack cannot be created with the visibility its creator wants: it always starts listed and account-only and is changed in a second step. Accept the store listing and the visibility at creation, or keep the two steps as the rule? | Product Lead | — | open |
| F5 | Ownership | decision | Moving a pack ignores the target account's pack allowance, and a test enshrines that. Intended, because a move is not a creation, or a gap in the limit? | Product Lead | — | open |
| OQ3 | Ownership | decision | Is it intended that a pack's name id is unique across the whole platform? Spaces and templates keep theirs unique within a smaller scope. Which does the new alias rule follow? | Product Lead (Architecture Lead writes the alias rule) | — | open |
| OQ4 | Visibility | decision | Does the web client rely on the library's default order, most templates first? The paged lists use the order of creation instead. Which does the new core keep? | Product Lead (Technical Lead checks what the client uses) | — | open |
| Q-IPK-03 | Ownership | decision | Why does this rule exist? No source says why a new pack always starts listed in the store and visible to its account only. (F3 asks whether to change it.) | Product Lead | — | open |
| CONST | All | decision | 9 of the 15 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rest) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 3 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Visibility | defect | The library's "number of templates" leaves out classification templates, so a pack that holds only those (the platform's own pack) sorts last with 0. Count all six kinds? | Technical Lead | Count all six kinds. | suggested |
| F7 | Visibility | tidy-up | A stale log line says the library ignores its query options, while it honours them. Delete the line? | Technical Lead | Delete the log, so operators do not read the wrong contract. | suggested |
| Q-IPK-02 | Ownership | decision | Why does this rule exist? No source says why a pack's name id must be unique across all packs and lower case. (OQ3 asks whether it is intended.) | Technical Lead | The name id is the whole path of the pack's web address (`/innovation-packs/<nameID>`, `url.generator.service.ts:481`), so it is unique on the platform. Lower case is still unexplained. The why is on IPK-02. | suggested |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ4 | Visibility | decision | Does the web client rely on the library's default order, most templates first? The paged lists use the order of creation instead. Which does the new core keep? | Product Lead (Technical Lead checks what the client uses) | — | open |
| CONST | All | decision | 9 of the 15 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rest) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 6 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Templates | test | The only test of this area checks nothing, is not in the nightly, leaves an organisation and a pack behind on every run, and passes an organisation id where an account id is needed. Retire it and let the entitlements, account and platform-roles suites carry the proof, or rewrite it as a real create, read back and delete case? | Quality Lead | — | open |
| OQ1 | All | test | Which credentials does the harness admin hold? The transfer suite and the smoke case run as that persona, so the answer decides what their green rows prove. | Quality Lead | — | open |
| OQ2 | Visibility | check | On a live stack, can a visitor read a hidden pack by its id, and can an unrelated user list the hidden packs of an account? F2 is so far a reading of the policy only. | Quality Lead | — | open |
| OQ5 | All | test | Has the smoke case ever been green? Check the last run of the `innovation` test project. | Quality Lead | — | open |
| W9 | Templates | check | The former who-may table gives "create, update or delete templates in a pack" to the Platform License Manager on organisation-owned packs and marks Platform Support as "does not apply". Rule IPK-13 says Platform Support. Are the two cells swapped? | Quality Lead | — | open |
| GAPS | All | test | 10 rules have no test that proves them and 7 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Ownership | risk | When an owner deletes a pack, nothing is written to the audit trail and its templates vanish with it; only actions by platform roles are audited. Keep that, or extend the audit to owners before the cutover's activity model? | Security Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Visibility | decision | A hidden or account-only pack is kept out of lists, but anyone who holds its id can read it, visitors included, and the list of an account's packs returns hidden packs to anyone. Is visibility only a help for discovery, or must such a pack be unreadable to outsiders? In the second case this is a defect, like finding 5 in `entitlements.md`. | Product Lead (Security Lead rates the exposure) | — | open |
| CONST | All | decision | 9 of the 15 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the rest) | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Ownership | decision | Is it intended that a pack's name id is unique across the whole platform? Spaces and templates keep theirs unique within a smaller scope. Which does the new alias rule follow? | Product Lead (Architecture Lead writes the alias rule) | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. Actors and evidence keep the shorthands of the former table; the legend is in Appendix B._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| IPK-01 | An innovation pack is created on exactly one account by that account's admin (a user on their own account, an organisation admin on the organisation's) or by platform content-full-access on any account; the right is checked first, then the account's pack allowance (cross-reference ENT-02: 3 under plus, "Entitlement limit of 3 of type account-innovation-pack reached"; ENT-40/41: privilege before limit, PLM bypass). | account holder, PCFA, PLM | code › `src/domain/space/account/account.resolver.mutations.ts:246-292, 674-725` · `account.service.ts:525-554` · `account.service.authorization.ts:321-336, 495-502` · test › `entitlements/innovation-packs-functional-entitlements` › `Create a innovation pack over the license limit`; `entitlements/organization-entitlements` › plus case (org admin creates a pack); `innovation-pack/innovation-pack` › `Create` (exercised, not asserted) | proven (through the entitlements suite) |
| IPK-02 | A pack's name id is unique across every pack on the platform and stored in lower case: a taken id is refused on create ("InnovationPack: the provided nameID is already taken: <id>") and on rename ("Unable to update InnovationPack nameID: the provided nameID is already taken: <id>"); an omitted id is derived from the display name avoiding every existing pack's id. | account holder | code › `src/library/innovation-pack/innovation.pack.service.ts:51-60, 67-76, 133-147` · `innovation.pack.defaults/innovation.pack.defaults.service.ts:117-128` · `src/services/infrastructure/naming/naming.service.ts:115-122` | untested |
| IPK-03 | A new pack starts listed in the store with search visibility "account", whatever the caller intends (the create input has no visibility fields), with an empty templates set, a profile with avatar and card images and a default tag set. | account holder | code › `innovation.pack.service.ts:85-104` · `dto/innovation.pack.dto.create.ts:9-14` · `src/core/bootstrap/bootstrap.service.ts:751-755, 823-831` | untested (see F3) |
| IPK-04 | The pack's provider is the host of its account — the user, or the organisation — and follows the pack when it moves. | all | code › `innovation.pack.service.ts:314-337` · `innovation.pack.resolver.fields.ts:46-52` · `schema.graphql:3984-3985` · test › `account/transfer-innovation-pack-to-account` › `Global Admin transfer innovation pack from Organization account to User account…` (provider becomes the target user) | proven (elsewhere) |
| IPK-05 | The account's admins may update a pack (profile, name id, store listing, search visibility); platform support may update a pack owned by an organisation (never one owned by a user); platform content-full-access may update any. | account holder, support, PCFA | code › `innovation.pack.resolver.mutations.ts:27-63` · `account.service.authorization.ts:437-459, 462-474` · matrix › `access-matrix.md:949-985` (support `pf:support-org-resources` dropped on `user-hosted`) · crosscheck › `access-matrix-crosscheck.md:112` (A7.updateInnovationPack agree) | untested in this area (`platform-roles/_support/groups/a7.ts`; `account/hosted-resources` updates visibility as GA) |
| IPK-06 | Deleting a pack deletes its templates set with every template, its profile and its policy; the account's admins and platform content-full-access may delete, platform support may not; a platform-side delete writes a platform resource audit entry, an owner's does not. | account holder, PCFA | code › `innovation.pack.resolver.mutations.ts:69-113` · `innovation.pack.service.ts:167-195` · crosscheck › `access-matrix-crosscheck.md:124` (A8 agree) | untested in this area (`platform-roles/_support/groups/a8.ts`; `orphan-free-deletion/group-a` › GA-7) |
| IPK-07 | A pack can be moved to another account by whoever may offer resources from the source account and accept them on the target (the platform resource admin; neither the owner nor support); the target's pack allowance is not checked; the pack's and its templates' policies are recomputed under the new account; a platform-side move is audited. | PRA | code › `account.resolver.mutations.ts:507-566, 645-672` · test › `account/transfer-innovation-pack-to-account` › all 5 cases ("without valid entitlements" passes for the platform actor; support, beta tester, registered user refused and the pack stays) | proven (elsewhere; see F5) |
| IPK-08 | Deleting an account (a user deleting their own) is refused while it still hosts a pack; the pack must be deleted or moved first. | account holder | test › `contributor-management/user/delete-own-account` › blocker `ACCOUNT_INNOVATION_PACK` | proven (elsewhere) |
| IPK-09 | Search visibility governs where a pack is listed, not who may read it: "hidden" shows up only when reached directly, "account" only inside its account's scope, "public" everywhere. On a user's or organisation's profile, the owner, the organisation's admins and privileged platform roles see every pack; an organisation associate sees public and account-scoped ones; any other registered user sees public ones only; anonymous visitors get no list. | all | code › `src/common/enums/search.visibility.ts:3-7` · `src/domain/space/account.lookup/account.lookup.service.ts:124-175` · `src/domain/community/user/user.resolver.fields.ts:187-235` · test › `account/hosted-resources` › the 6 viewer-scope cases · spec › `agents-hq/specs/017-innovation-hub-resources/spec.md:25` | proven (hosted lists); the "read by anyone when reached directly" clause is disputed (see F2) |
| IPK-10 | Any pack can be read directly by anyone, signed in or not — the pack inherits its account's policy, which grants read to the world (cross-reference ENT-44, entitlements finding 5); `Account.innovationPacks` returns every pack of the account, hidden ones included, unless the caller filters by visibility. | anonymous, registered | code › `innovation.pack.service.authorization.ts:47-57, 80-96` · `account.service.authorization.ts:306-310` · `account.resolver.fields.ts:143-165` · `src/services/api/lookup/lookup.resolver.fields.ts:365-380` · matrix › `access-matrix.md:949-985` (anonymous / registered READ CT) | untested (see F2) |
| IPK-11 | The platform Innovation Library lists only packs that are both listed in the store and public; by default ordered by number of templates, most first (fewest first and random are offered), with an optional limit; its template list shows the templates of those packs alphabetically, filterable by kind; the paginated variants page newest-first with at most 100 per page and a free-text filter on title, description and tags — never on the provider; the library is readable by everyone, including anonymous visitors. | anonymous, registered | code › `src/library/library/library.service.ts:35, 82-129, 131-183, 190-249, 308-349` · `library.resolver.fields.ts:27-104` · `library.service.authorization.ts:11-32` · `src/common/enums/innovation.packs.orderBy.ts:3-7` · spec › `server/specs/101-innovation-library-pagination/spec.md:211-273` | untested (see F4: ordering counts five kinds) |
| IPK-12 | The platform seeds one pack, "Classifications" (`platform-classifications`), on the host organisation's account and forces it listed and public on every start, so the classification picker always finds the SDGs vocabulary (cross-reference TPL-31). | platform | code › `bootstrap.service.ts:739-831` · spec › `agents-hq@origin/main:specs/024-classifications/spec.md` (FR-005a/b, D3) · client › `classifications/classifications-templates` › TL-01, TL-02 | untested in server-api |
| IPK-13 | A pack holds a templates set like a space library: every template kind can be created, updated and deleted there by the account's admins (and platform support on an organisation's pack, platform content-full-access anywhere); the set is read through the pack's read right and its templates are readable by everyone (cross-reference TPL-33, TPL-34; client-web#8804). | account holder, support, PCFA | code › `innovation.pack.resolver.fields.ts:32-44` · `innovation.pack.service.authorization.ts:70-75` · `src/domain/template/templates-set/templates.set.service.authorization.ts:39-51` · test › `innovation-pack/innovation-pack` › `Create` (six whiteboard templates created, nothing asserted); client `templates-CRD/template-types/document-template-content` › DT-4 · crosscheck › `access-matrix-crosscheck.md:114-120` | untested (the only legacy case asserts nothing, see F1) |
| IPK-14 | A pack's policy is a copy of its account's child-entity policy (no rules of its own), recomputed when the account is reset and when the pack moves; packs count against the account's usage (ENT-11), and a pack template's owner for the file repair is the account's admin (TPL-35). | server | code › `innovation.pack.service.authorization.ts:25-96` · `account.service.authorization.ts:224-238` · `account.resolver.mutations.ts:278-287, 537-547` | untested |
| IPK-15 | An innovation hub may curate a list of packs to show on its start page; the list starts empty, is filled by hand, and shows only what the visitor may already see in the library (cross-reference the innovation-hub area). | hub admin, visitor | code › `src/domain/innovation-hub/innovation.hub.service.ts:186-190, 341` · spec › `agents-hq/specs/017-innovation-hub-resources/spec.md:25-30, 63-66` | untested (hub area) |

### B. Rights: evidence

Legend of the former who-may table. Its shorthands are still used in the evidence below and in Appendix A:

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `account.resolver.mutations.ts:246-292, 507-566, 645-672, 674-725`; `account.service.authorization.ts:306-310, 321-336, 437-474, 495-502`; `innovation.pack.resolver.mutations.ts:40-58, 80-98`; `innovation.pack.resolver.fields.ts:32-44`; `account.lookup.service.ts:124-175`; `user.resolver.fields.ts:187-235`; `library.service.authorization.ts:24-29`; `lookup.resolver.fields.ts:365-380`; access matrix `innovation-pack` (`access-matrix.md:949-985`), `library` (`:216-246`), `innovation-pack/template` (`:276`); crosscheck A7 / A8 / A9 (`access-matrix-crosscheck.md:112-124`), row `:47` (account child-entity CRUD+GRANT + anonymous READ — agreed). Bold cells are the world-readable ones that finding 2 asks about. The legacy case and the transfer suite run as the harness `GLOBAL_ADMIN` persona, whose credential set was not verified here.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. Where the old text says "finding 2" it means F2, and "open question 3" means OQ3. Q-IPK-02, Q-IPK-03 and W9 are new in section 3 and have no older text._

#### Findings

- **F1 — The area's only legacy case asserts nothing and does not run (IPK-01, IPK-13).** Test: `innovation-pack.it-spec.ts` creates an organisation, a pack and six whiteboard templates and ends with `expect(200).toBe(200)`; its `afterAll` delete is commented out, so every run leaks an organisation and a pack; it passes the **organisation id** as the pack's `accountID`, which the server would refuse; and the `innovation` vitest project is not in the nightly glob. Ruling: retire the case and let the entitlements, account and platform-roles suites carry the proof — or rewrite it as a real create/read-back/delete case on the organisation's account.
- **F2 — "Hidden" hides a pack from lists, not from readers (IPK-09, IPK-10).** Code: the pack policy inherits the account's, which grants READ to anonymous and registered (`account.service.authorization.ts:306-310`, "TODO: work through the logic"); `hostedResources` filters by viewer scope but says "authorization policies are deliberately not consulted"; `Account.innovationPacks` on the world-readable `lookup.account` returns hidden packs to anyone; `lookup.innovationPack(ID)` answers for anyone. Test: `hosted-resources` proves the filtered list only. Spec: the enum says hidden "only shows up when directly accessed e.g. by provider" — the "e.g. by provider" implies the provider, not the world. Ruling: is a hidden or account-scoped pack meant to be unreadable to outsiders who hold its id (then this is a defect, kin to entitlements finding 5), or is visibility purely a discovery hint?
- **F3 — A pack cannot be created with its intended visibility (IPK-03).** Code: `createInnovationPack` hard-codes listed + account-scoped and the input carries no visibility fields; the bootstrap comment records that the seed must re-save the pack public after creating it (`bootstrap.service.ts:751-755`). Test: none. Spec: none. Ruling: accept `listedInStore` / `searchVisibility` on create, or keep the two-step as the rule.
- **F4 — The library's "number of templates" and the pack count exclude classification templates (IPK-11).** Code: `getTemplatesCount` sums five kinds (`templates.set.service.ts:238-276`); a pack holding only classification templates (the seeded one) sorts last with 0. Shared with `templates.md` finding 1. Ruling: count all six kinds.
- **F5 — A transfer ignores the target account's pack allowance (IPK-07).** Code: `validateTransferOfAccountResource` checks offer/accept only; `validateSoftLicenseLimitOrFail` is not called. Test: `transfer-innovation-pack-to-account` › the first case is titled "…without valid entitlements" and passes — the suite enshrines it. Spec 027 A9: silent on limits. Ruling: intended (a move is not a creation), or a gap in the cap?
- **F6 — Owner deletes and moves leave no audit trail (IPK-06, IPK-07).** Code: the platform branch audits (027 T058 / FR-018a "audit ONLY on the PLATFORM branch"); an account admin deleting their own pack writes nothing; a deleted pack's templates vanish with it. Ruling: by design today — record, or extend the audit to owners before the cutover's activity model.
- **F7 — A stale log says the library ignores its query options (IPK-11).** Code: `library.resolver.fields.ts:37-40` logs "Ignoring query data … for now; to be added back in later" and then passes `limit` and `orderBy` to the service, which honours them. Cosmetic; ruling: delete the log so operators do not read the wrong contract.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Which credentials the harness admin holds.** The transfer suite and the smoke case run as `GLOBAL_ADMIN`; whether the persona is PRA / PCFA by fixture decides what those green rows prove (same question as every other table).
- **OQ2 — Live read of a hidden pack by an outsider.** Finding 2 is a policy reading (`access-matrix.md:949-985` agrees: anonymous READ). Confirm on a stack: `lookup.innovationPack(ID)` of a `hidden` pack as anonymous, and `lookup.account(ID).innovationPacks` as an unrelated user.
- **OQ3 — Is global pack name-id uniqueness intended?** Spaces and templates scope their name ids; packs do not (IPK-02). No spec states either; product should say which the new alias rule follows.
- **OQ4 — Does the client rely on the library's default ordering?** IPK-11's "most templates first" is a code default; the paginated fields use insertion order instead (101 FR-015). Decide which the new core keeps.
- **OQ5 — Has the smoke case ever been green?** It passes an organisation id where an account id is required (finding 1); either the harness's `createOrganization` once returned an account-shaped id, or the case has been red/unrun since the account model landed. Check the last `innovation` project run.

### D. Test gaps

_For the Quality Lead. The GAPS row in section 3 asks which of these get a case._

Untested rules by id: IPK-02, IPK-03, IPK-05, IPK-06, IPK-11, IPK-12, IPK-13, IPK-14, IPK-15; plus the untested clauses of IPK-09/10 (direct read of a hidden pack by an outsider; `Account.innovationPacks` filter), IPK-07 (policy recomputation after a move — a template in the moved pack read by the new owner), IPK-01 (PCFA creating on someone else's account; PLM bypass — see ENT-41).

Behaviours the area has that neither reading nor tests pinned down:
- Updating a pack: rename (name-id collision refusal), un-listing, switching visibility and reading the library before/after — no API case; `hosted-resources` flips visibility only as setup.
- Deleting a pack that holds templates in use as a flow-state default elsewhere (TPL-17) or whose templates were applied to spaces (nothing links back — expected no effect).
- Deleting an organisation that hosts a pack (the organisation-side blocker; only the user self-delete blocker is proven).
- The library pages themselves: ordering by template count, the 100 cap, the search term, pagination consistency (101 FR-007/008) — unit specs only.
- Name-id derivation when two packs with the same display name are created concurrently (W4 C2 class of defect).
- An innovation hub's curated pack list respecting visibility (IPK-15).
- Authorization reset of a pack after its account's host changes (organisation admin removed; user deleted — pack cascades with the account row, `onDelete: CASCADE`).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column is unchanged: product ticks the rows it must rule on (the CONST row in section 3)._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Search visibilities (3) | `hidden`, `account`, `public` | `search.visibility.ts:3-7`; `schema.graphql:961` | | Product Lead |
| Library orderings (3) | `random`, `innovationPacks.numberOfTemplates_ASC`, `_DESC` (default DESC) | `innovation.packs.orderBy.ts:3-7`; `library.service.ts:84, 106` | | Product Lead |
| New-pack defaults | `listedInStore = true`, `searchVisibility = account`; not settable at create | `innovation.pack.service.ts:91-92`; `dto/innovation.pack.dto.create.ts` | finding 3 | Product Lead |
| Library eligibility | `listedInStore && searchVisibility = public` (packs and their templates alike) | `library.service.ts:86-90, 135-139, 199-202, 227-230, 266-271` | | Product Lead |
| Library page cap | 100 (`first`/`last` clamped) | `library.service.ts:35, 337-349` | | Technical Lead |
| Library search fields | profile `displayName`, `description`, tags (ILIKE substring); provider excluded | `library.service.ts:308-334` | | Product Lead |
| "Number of templates" | post + whiteboard + space + callout + community-guidelines (classification excluded) | `innovation.pack.service.ts:295-312` → `templates.set.service.ts:238-276` | finding 4 | Technical Lead |
| Hosted-resources scopes | `FULL` → all; `ORGANIZATION_ASSOCIATE` → public + account; `REGISTERED` → public; anonymous → null | `account.lookup.service.ts:139-146`; `user.resolver.fields.ts:187-235` | finding 2 | Product Lead |
| Name-id rules | global uniqueness across packs; lower-cased; derived from display name when omitted | `innovation.pack.service.ts:51-76, 133-147` | open question 3 | Product Lead |
| Pack cap | account entitlement `account-innovation-pack` (3 under `ACCOUNT_LICENSE_PLUS`; 0 on a plain account) — cross-reference `entitlements.md` | `entitlements.md` ENT-02, ENT-15, ENT-16 | | Product Lead |
| Transfer privileges | `TRANSFER_RESOURCE_OFFER` on the source account, `TRANSFER_RESOURCE_ACCEPT` on the target; no entitlement check | `account.resolver.mutations.ts:645-672` | finding 5 | Security Lead |
| Audit entries | kind `innovation-pack`, outcome `deleted` (PCFA delete) / `moved` (platform transfer); owner actions unaudited | `innovation.pack.resolver.mutations.ts:101-111`; `account.resolver.mutations.ts:549-561` | finding 6 | Security Lead |
| Seeded pack | `platform-classifications` / "Classifications" / "Platform default Classification Templates." on the host organisation's account; forced listed + public every start | `bootstrap.service.ts:739-831` | | Product Lead |
| Error texts | `InnovationPack: the provided nameID is already taken: <id>`; `Unable to update InnovationPack nameID: the provided nameID is already taken: <id>`; `Unable to find InnovationPack with ID: <id>`; `Unable to find InnovationPack using NameID: <n>`; `Unable to create account-innovation-pack on account: <accountId>. Entitlement limit of <n> of type account-innovation-pack reached` (ENT-02, finding 7 there) | `innovation.pack.service.ts:57, 141, 226, 243`; `account.resolver.mutations.ts:721` | | Technical Lead |
| GraphQL surface | `InnovationPack{listedInStore, nameID, profile, provider, searchVisibility, templatesSet}`, `Account.innovationPacks(searchVisibility)`, `Library{innovationPacks(queryData), innovationPacksPaginated, templates(filter), templatesPaginated}`, `TemplateResult{template, innovationPack}`, `hostedResources.innovationPacks`; mutations `createInnovationPack`, `updateInnovationPack`, `deleteInnovationPack`, `transferInnovationPackToAccount`; lookups `innovationPack(ID)`, by-name `innovationPack(NAMEID)` | `schema.graphql:3970-3993, 4123-4160, 4341, 4457, 5012, 5082, 5316, 5402, 5744, 7617-7622, 9203, 10866` | | Technical Lead |

### F. Where this lands in the new core

The briefing folds packs and hubs into the space document — "space.kind hub / pack" (catalogue CT-15, slices 10–12, marked **partial**: "API thin (1 + few cases); no UI; W2 journey 12") — so a pack becomes a space-like container whose scope is an account and whose content is a set of blueprints (templates). Every rule above survives as a behaviour: account ownership and the single-entitlement model (IPK-01), the provider as the account host (IPK-04), the support/PCFA/PRA split on update, delete and move (IPK-05–07), the three visibilities and the viewer-scoped lists (IPK-09), and the library's eligibility, ordering and search (IPK-11). What should change shape: (1) visibility today is a listing filter layered over a world-readable policy (IPK-10, finding 2) — in a core without stored policies the scope rule must decide read access, not only list membership, or the "hidden" visibility stays decorative; (2) the pack's policy is a clone of the account's (IPK-14) — a scope on the account suffices; (3) the global pack name-id and the per-set template name-id (TPL-03) become one alias rule under `resolve(url)`; (4) the "number of templates" used for ordering (IPK-11) must count every blueprint kind. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/innovation-pack/`, 1 file, 1 case — a smoke case with no assertion, outside the nightly); the specs, issues and docs listed in § Sources. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. Covers the pack in the library: creation, ownership, visibility, provider, transfer, deletion and listing. The templates inside a pack are in `templates.md`; the creation cap, bypass and usage count are in `entitlements.md` (ENT-02, ENT-11, ENT-16, ENT-39–41) and are cross-referenced, not re-derived. Proof for this area comes from other suites (entitlements, account, platform-roles), listed per row.

2026-11-19 converted to the three-section layout: the single why was split in three, the who-may table was rebuilt with footnotes, and every finding, open question and rule without a stated reason was routed to an organisation role. The old status legend was dropped; proof is in Appendix A.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. IPK-02 takes its why from the pack's web address (suggested answer to Q-IPK-02). IPK-03 keeps no why; Q-IPK-03 asks for one.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/common/enums/search.visibility.ts`, `innovation.packs.orderBy.ts`
- `src/library/innovation-pack/innovation.pack.entity.ts`, `innovation.pack.service.ts`, `innovation.pack.resolver.mutations.ts`, `innovation.pack.resolver.fields.ts`, `innovation.pack.service.authorization.ts`, `innovation.pack.defaults/innovation.pack.defaults.service.ts`, `dto/*.ts`
- `src/library/library/library.service.ts`, `library.resolver.fields.ts`, `library.service.authorization.ts`
- `src/domain/space/account/account.resolver.mutations.ts`, `account.service.ts`, `account.service.authorization.ts`, `account.resolver.fields.ts`; `src/domain/space/account.lookup/account.lookup.service.ts`; `src/domain/community/user/user.resolver.fields.ts`
- `src/domain/template/templates-set/templates.set.service.ts`, `templates.set.service.authorization.ts`; `src/domain/innovation-hub/innovation.hub.service.ts`
- `src/services/api/lookup/lookup.resolver.fields.ts`, `src/services/api/lookup-by-name/lookup.by.name.resolver.fields.ts`; `src/services/infrastructure/naming/naming.service.ts`
- `src/core/bootstrap/bootstrap.service.ts`; `src/platform-admin/domain/template-file-repair/admin.template.file.repair.service.ts`
- `schema.graphql`
- git: `e7386fa5a`, `f03636804` (store listing), `b9917fdab` (#6115), `f67ae0feb` (#6118), `df7445856` (027 Slice A), `0d6de9235` (#6380)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/innovation-pack/innovation-pack.it-spec.ts`, `innovation_pack.request.params.ts`, `innovation-pack-with-templates.ts` (script); `server-api/vitest.config.ts` (project `innovation`, nightly glob)
- Other suites touching the area (list only): see dossier § 3
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ innovation-pack, library, template), `access-matrix-crosscheck.md` (rows 47, A7, A8, A9), `entitlements.md` (ENT-02, ENT-11, ENT-15/16, ENT-39–41, ENT-44, finding 5), `catalogue/README.md` (CT-15)

Specs / issues:
- server `specs/101-innovation-library-pagination/spec.md`; `specs/062-ut-library` (unit scope)
- `agents-hq/specs/017-innovation-hub-resources/spec.md`; `agents-hq@origin/main:specs/024-classifications/spec.md` (FR-005a/b, D3); `agents-hq/worktrees/qa-pr-challenge/specs/027-platform-role-redesign/spec.md` A7/A8/A9 (through the crosscheck and code comments)
- alkem-io/client-web#8804 (pack templates readable); alkem-io/server#6380 (seeded pack)
- server `src/services/infrastructure/url-generator/url.generator.service.ts:481`, `:1239` (pack web address, IPK-02)
