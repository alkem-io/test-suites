# Account: behaviour rules

_What the platform does today for accounts: the account every user and organisation has, who administers it, what it hosts (spaces, virtual contributors, innovation packs, innovation hubs), how those are shown on a profile, transfers between accounts, and the account's part in deletion: what it does, why, who may, and what is still to answer. The file follows the three-section layout of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**. Plans, limits and subscriptions are in `entitlements.md` and are only referred to here as `ENT-nn`._

_Open questions per owner: Product Lead 0 · Technical Lead 6 · Quality Lead 3 · Security Lead 1 · Service Operations Lead 1. By state: 10 open · 1 with a suggested answer · 5 decided. Proof of the 19 rules: 11 proven by a test · 8 untested (Appendix A)._

_Whys of the 19 rules: 15 rest on a source or a product decision · 0 carry a draft · 3 have none, and each points to a question or defect in section 3 (ACC-02, ACC-12, ACC-15) · 1 only points to another file (ACC-16)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Code comment (no spec)" means only a comment in the code gives the reason. "Not decided" means the behaviour exists in the code and nobody chose it.
- A marker in bold at the end of a rule points at section 3: **(open: F4)** means a question on this rule is still open, **(defect: F3)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### The account and its host

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACC-01 | Every user and every organisation gets exactly one account, created together with them. It starts with a generated name, its own storage, and a licence with all seven account allowances at zero. | The account is the unit that hosts and pays for resources (ENT-15). | — | One transaction "to prevent orphans" (code comment). | Code comment (no spec); Product, 2026-11-20 (business why) |
| ACC-02 | An account's host is the one user or organisation it belongs to. An account with no host shows no host instead of failing. **(open: Q-ACC-02)** | — | — | — | Not decided: exists in the code |
| ACC-03 | The account admin is the user for a user account. For an organisation account it is every admin and owner of the organisation; a person stops being account admin only when they hold neither role any more. | "Allow hosts (users = self mgmt, org = org admin) to manage resources in their account" (code comment). | — | — | Code comment (no spec) |

### What admins may do

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACC-04 | On their own account the account admin may create spaces, virtual contributors and innovation packs (within the licence), read, edit and delete everything the account hosts, and offer or accept a transfer of its resources. The account admin may never create an innovation hub. | Hosts manage their own resources; hubs are the commercial, platform-curated offering (027 QA C1-12 (a)). | — | — | Spec 027 QA C1-12 (a) |
| ACC-05 | Platform roles on any account: Platform Content Full Access creates spaces, hubs, packs and virtual contributors; the License Manager creates hubs and manages the baseline plan; the Operations Admin resets; the Resource Admin reads and transfers; Platform Support manages packs, hubs and templates of organisation accounts only. | Each platform family owns one capability on the account (027 rows 2, 7, 8, 9; A3/A7/A9/A12); support's org-resources right was scoped to organisations because no artifact declared user accounts in scope (spec-server-14). | — | — | Spec 027 (A3, A7, A9, A12; spec-server-14) |

### Who sees the account and what it hosts

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACC-06 | An account can be read by anyone, signed in or not. Looked up directly or reached through a space, virtual contributor or innovation hub, it shows its full lists of spaces, virtual contributors, packs and hubs. **(open: F1)** | — | — | "By default it is world visible. TODO: work through the logic on this" (code comment); 089 records the reach-through as a known gap for a separate ticket (KG-1, linked to #6129). | Not decided: exists in the code (spec 089 KG-1 records it as a known gap) |
| ACC-07 | A profile gives out its account only to a few. For a user: the user, those who may read the user's personal data, and the Platform License Manager and Resource Admin. For an organisation: its admins and owners and the same two platform roles. Everyone else gets nothing, without an error. **(open: F1)** | — | — | The profile's account field is the only place the licence and transfer consoles learn the account id; plain READ is deliberately not used because accounts grant it to everyone (code comment; 089 R3 "no regression"). | Spec 089 R3; Product, 2026-11-20 (F6): stays as today, narrowing the full view is a wish |
| ACC-08 | A signed-in viewer of a profile sees what its account hosts, filtered by visibility: public items for everyone; account-level ones for the user or the organisation's own people; hidden ones for the user or the organisation's admins and owners. Hubs are always listed. A signed-out viewer gets nothing. | A public profile shows what its host chose to publish; the account tier exists for an organisation's own people; hidden is owner-side only (089 FR-001…006, operator rulings R1/R3). | — | "the only place that decides this visibility" so the client never re-filters (089 FR-002). | Spec 089 FR-001…006, operator rulings R1/R3; Product, 2026-11-20 (F6): stays as today, narrowing the full view is a wish |
| ACC-09 | A hosted virtual contributor or hub is shown as a closed card: name, picture and link. The card shows for anyone allowed to see it, even without access to the item itself, and gives no way back to the account or to anything else about the item. | The card must render for anyone entitled to see it (089 FR-007), while exposing nothing beyond the public profile (FR-013) and no route to the account's unfiltered lists (code invariant comments). | — | — | Spec 089 FR-007, FR-013 |
| ACC-10 | A new virtual contributor, innovation pack or innovation hub starts with visibility "account" and listed in the library. The host can change both afterwards. | — | As an account host, I want a new virtual contributor, pack or hub to be visible only to my own people at first, so that I can prepare it before I make it public. | — | Product, 2026-11-20 (Q-ACC-10) |

### Transfers between accounts

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACC-11 | A space, virtual contributor, pack or hub moves to another account only when the person may offer it on the current account and accept it on the target: the Platform Resource Admin for any two accounts, or someone who is admin of both. Anyone else is refused and the resource stays where it was. | A transfer is two-sided consent — the giver's and the receiver's ("Double authorization check", code comment); moves of resources are the resource admin's family (027 A9). | — | — | Spec 027 A9 |
| ACC-12 | After a transfer the resource belongs to the target account and its access rules are recomputed from it. The target's licence limits are not checked, so a resource can land on an account that could not have created it. | — | — | — | Product, 2026-11-20 (F7): a transferred space does not get the new host organisation as member and lead, as today; hosting a Space (paying for it, being legally responsible) is not membership or leadership, so no wish |
| ACC-13 | Only a top-level space is meant to change account; subspaces follow their top-level space. The server does not check this today and accepts a subspace too. **(defect in part: F2, OQ2)** | "Top-level spaces are transferred between accounts, not moved" (030 spec:157, 222); one account pays for the whole tree (083 FR-021b). | — | — | Spec 030; spec 083 FR-021b |
| ACC-14 | A transfer made by the Platform Resource Admin is recorded in the audit trail ("moved", with the target account). A transfer by an ordinary account admin is not recorded. | — | — | Every account admin holds offer/accept on their own account, so the audit branch is decided from the actor's own platform credential, not from the shared privilege (corr-server-8). | Spec 027 review item corr-server-8 |
| ACC-15 | The transfer of a virtual contributor is declared to return an innovation pack. **(defect: F3)** | — | — | — | Not decided: a defect |

### Licence and billing

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACC-16 | The account's licence, plans, limits, and who may read or change them, are described in `entitlements.md`. Nothing is repeated here. | — | — | Cross-reference only. | See `entitlements.md` |
| ACC-17 | An account can be linked to an external billing subscription. The link is shown to the account holder before they delete their account and is kept in the deletion audit record. It never blocks anything. **(open: OQ3)** | A paying customer's deletion is never blocked; finance reconciles from the audit record (054 FR-008, operator ruling D-7/D-8). | — | — | Spec 054 FR-008, operator rulings D-7/D-8 |

### Reset and deletion

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ACC-18 | Resetting an account's authorization recomputes the access rules of the account and everything under it and re-applies the licence. A broken item is skipped and logged, so the rest is still rewritten; the skipped part keeps its old rules. **(defect in part: F5)** | — | — | One broken child used to abort the whole account reset and leave dozens of unrelated entities with empty rules (server#6094). | Server issue #6094 |
| ACC-19 | An account is never deleted on its own. It goes with its user or organisation, and only once it hosts no space, virtual contributor, pack or hub. | Resources must be deleted or transferred first; nothing is deleted that was not asked for (code comment on the deletion saga). | — | — | Code comment (no spec); see DEL-02/04/12 |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W15 are new: the former who-may table had none. No cell changed meaning, and nobody outside QA has confirmed the cells yet. Evidence is in Appendix B. "Account admin or owner" is the user whose account it is, or an admin or owner of the organisation that owns it._

### Hosting, transfers and administration

| ID | Action | Platform admin roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Create a space, virtual contributor or innovation pack on an account | Y¹ | N² | Y³ | – | – | N | N |
| W2 | Create an innovation hub on an account | Y⁴ | Y | N | – | – | N | N |
| W3 | Offer a transfer out of an account | Y⁵ | N | Y⁶ | N | N | N | N |
| W4 | Accept a transfer into an account | Y⁵ | N | Y⁶ | N | N | N | N |
| W5 | Move a resource between two accounts in one step | Y⁵ | N | Y⁷ | N | N | N | N |
| W6 | Update the baseline plan or assign plans | N | Y | N | – | – | N | N |
| W7 | Reset authorization or licence on an account | Y⁸ | N | N | – | – | N | N |
| W8 | Manage packs, hubs and templates of an organisation's account (not delete or move them) | Y⁹ | N | Y | – | – | N | N |
| W15 | Delete an account | Y¹⁰ | N | Y¹¹ | – | – | N | N |

¹ Platform Content Full Access, on any account. ² Unless also account admin. ³ On their own account, within its limits. ⁴ Platform Content Full Access. ⁵ Platform Resource Admin only. ⁶ On their own account. ⁷ Only when admin of both accounts. ⁸ Platform Operations Admin only. ⁹ Platform Support, on accounts of organisations only. ¹⁰ Only together with its host: the Platform Users Admin for a user, Platform Support for an organisation. ¹¹ By deleting themselves; for an organisation, the organisation owner.

### Reading an account and what it hosts

| ID | Action | Platform admin roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W9 | Read an account directly, or through a space, virtual contributor, hub or host, with its full lists | Y | Y | Y | Y | Y | Y¹² | Y¹² |
| W10 | Read a user's account through the user's profile | Y¹³ | Y | Y¹⁴ | Y¹⁵ | N | N | N |
| W11 | Read an organisation's account through its profile | Y¹⁶ | Y | Y¹⁷ | N | N | N | N |
| W12 | Read the full list of what a profile's account hosts | Y¹⁸ | Y | Y | Y¹⁹ | N | N | – |
| W13 | Read the public part of what a profile's account hosts, and its hubs | Y | Y | Y | Y | Y | Y | N²⁰ |
| W14 | Read the account-level part of what an organisation's account hosts | – | – | Y | – | – | Y²¹ | N |

¹² Whether this is intended is question F1. ¹³ The Platform Users Admin; the Platform License Manager and Platform Resource Admin through their rights on the account. An admin of an organisation the user belongs to may also read it. ¹⁴ Their own. ¹⁵ Of a member of a space they administer. ¹⁶ Platform Content Full Access, through its right to edit the organisation; the Platform License Manager and Platform Resource Admin through their rights on the account. ¹⁷ An admin or owner of the organisation. ¹⁸ The Platform Users Admin for users, Platform Content Full Access for organisations, the Platform License Manager and the Platform Resource Admin. ¹⁹ A space admin for a member of their space, on user accounts only (see F6). ²⁰ Gets nothing, without an error. ²¹ Only an associate of the organisation.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). Ids: F is a finding, OQ an open question, Q-… a question on one rule, GAPS the test gaps, CONST the constants. The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).


### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 6 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Transfers | defect | The server accepts a subspace in a space transfer, although only top-level spaces are meant to change account. Refuse subspaces on the server, as the moves do, or leave the web app's panel as the only gate? | Technical Lead | — | open |
| F3 | Transfers | defect | The virtual contributor transfer is declared to return an innovation pack, but returns a virtual contributor. | Technical Lead | Fix the schema contract. It breaks only someone who selects pack fields, and nobody can today. | suggested |
| F5 | Reset | defect | An account reset skips broken items and leaves their old access rules in place. On acceptance 1,018 files, 872 storage buckets and 2,000 tagsets still name retired credentials. Accept it (harmless while nobody holds those credentials), or make the reset report what it skipped so operators can repair it? | Technical Lead (Security Lead accepts the risk if it stays) | — | open |
| F8 | Reset | tidy-up | The account authorization reset refuses with a message that says "Space" (copy-paste). Fix the text now, or let it go with the rebuild? | Technical Lead | — | open |
| OQ4 | Transfers | check | Does any screen in the web app let an account admin transfer a resource, or only the Platform Resource Admin? It decides whether customers can reach F4. | Technical Lead | — | open |
| Q-ACC-02 | Host | decision | Why does this rule exist? No source states the reason. An account with no host shows no host and logs a warning instead of failing. | Technical Lead | — | open |


### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 3 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Transfers | check | Which credential let the harness admin transfer the pack in the positive case: Platform Resource Admin, or account admin of both accounts? Check the persona's credentials. | Quality Lead | — | open |
| OQ2 | Transfers | test | Nobody has transferred a subspace between accounts on a running stack to see what breaks (links, licence, the top-level space's account). F2 is a code reading only. | Quality Lead | — | open |
| GAPS | All | test | 9 rules have no test, 1 more has untested clauses and 9 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Visibility | risk | Any visitor can read another host's account: its id, spaces, virtual contributors, packs, hubs, plan and usage. The profile hides the account, but every other route gives it out. Is that intended? One decision closes this and F5 in `entitlements.md`. | Security Lead (Product Lead decides what a visitor may see) | Product, 2026-11-20: stays as today; the Security Lead weighs the risk, together with F5 in entitlements.md. | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Reset | defect | An account reset skips broken items and leaves their old access rules in place. On acceptance 1,018 files, 872 storage buckets and 2,000 tagsets still name retired credentials. Accept it (harmless while nobody holds those credentials), or make the reset report what it skipped so operators can repair it? | Technical Lead (Security Lead accepts the risk if it stays) | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Licence and billing | check | Who writes the billing link on an account, and is it ever set on acceptance? The caller is outside the files read here (the billing adapter). | Service Operations Lead | — | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| F7 | Stays as today: a space transferred to an organisation's account does not get that organisation as member and lead, and the previous host keeps its seat. Intended: hosting a Space means paying for it or being legally responsible for it, not being a member or lead. No wish. | Product, 2026-11-20 (amended 2026-11-23) | ACC-12 |
| Q-ACC-10 | The draft story stands: a new virtual contributor, pack or hub starts visible to the host's own people, so the host can prepare it before making it public. | Product, 2026-11-20 | ACC-10 |
| CONST | Product rules on the new-account licence, the three visibility levels, the visibility defaults at creation and the hosted-resources tiers, ticked "yes" in Appendix E. Error texts, shapes, credentials and the GraphQL surface go to the Technical Lead or the Security Lead. | Product, 2026-11-20 | Appendix E |
| F4 | Stays as today: a transfer does not check the target account's licence limits. Checking them, as create does, is a wish on the product issues list. | Product, 2026-11-20 | ACC-12; PRODUCT-ISSUES F4 |
| F6 | Stays as today: the right to read a user's personal data decides who sees the full hosted list (spec 089 KG-3). Limiting it to the user and the Platform Users Admin, Platform License Manager and Platform Resource Admin is a wish on the product issues list (DPO Lead consulted). | Product, 2026-11-20 | ACC-07, ACC-08; PRODUCT-ISSUES F6 |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `knowledge ›`. The role shorthands in the Actors column are spelled out in Appendix B._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| ACC-01 | Every user and every organisation gets exactly one account, created in the same transaction as the actor: typed user or organisation, with a generated name (`account-` + 8 hex characters), a minimal profile named after it, its own storage aggregator, a licence of seven account entitlements all at 0 / disabled and a baseline plan of zeros. | registered user, organisation creator | code › `src/domain/space/account.host/account.host.service.ts:38-129` · `src/domain/community/user/user.service.ts:193-245` · `src/domain/community/organization/organization.service.ts:166-170` · `src/domain/space/account/constants.ts:3-10` | untested (licence half proven under ENT-15) |
| ACC-02 | An account's host is the one user or organisation whose account it is; the host is resolved user-first, then organisation, and an account with no host answers null and logs a warning rather than failing. | all readers | code › `src/domain/space/account.lookup/account.lookup.service.ts:76-109` · `src/domain/space/account/account.resolver.fields.ts:70-76` · `schema.graphql:1294-1295` (`host: Actor` nullable) | untested |
| ACC-03 | The account admin is the user for a user account and, for an organisation account, every admin and owner of the organisation: the credential is granted at registration / when the organisation role is given, and for organisations it is revoked only once the person holds neither admin nor owner. | user, organisation admin/owner | code › `src/domain/community/user/user.service.authorization.ts:167-170` · `src/domain/access/role-set/role.set.service.ts:831-847, 1617-1636` + `removeActorFromAccountAdminImplicitRole` · test › `transfer-innovation-pack-to-account` › `BetaTester FAILS … to another user account` (offer passes on the own account); `hosted-resources` › `an organization admin gets the full view` | proven for the user and the organisation-admin cases; the revoke-only-when-neither clause is untested |
| ACC-04 | The account admin may create spaces, virtual contributors and innovation packs on the account (within its licence, ENT-02/03/04), read, update and delete everything the account hosts, and offer or accept a transfer of its resources — but may never create an innovation hub (ENT-39). | account admin | code › `src/domain/space/account/account.service.authorization.ts:338-354, 404-424, 464-502, 510-540` · matrix › `access-matrix.md:936` (`account-admin` row) · test › `entitlements/*` (ENT-02/03/04/15), `journey/space` › `should create space`, `should remove space` | proven (via the entitlements and journey suites; the transfer half under ACC-13) |
| ACC-05 | Platform roles on any account: content-full-access creates spaces, hubs, packs and VCs; the licence manager creates hubs and manages the baseline plan; the operations admin resets authorization and licence; the resource admin reads the account and offers/accepts transfers; spaces-reader reads the account tree; platform support manages the packs, hubs and templates of organisation-hosted accounts only (never a user's). | PCFA, PLM, POA, PRA, spaces-reader, support | code › `account.service.authorization.ts:324-462` · matrix › `access-matrix.md:914-947` · crosscheck › rows A3, A7, A9, A12 | untested here (covered elsewhere: `platform-roles/_support/groups/a3.ts`, `a7.ts`, `a9.ts`, `a12.ts`) |
| ACC-06 | An account itself is readable by anyone, signed in or not: the direct account lookup and every reach-through (`Space.account`, `VirtualContributor.account`, `InnovationHub.account`, `Account.host`) hand out the account with its unfiltered lists of spaces, VCs, packs and hubs to whoever can read the parent. | anonymous, registered | code › `account.service.authorization.ts:100-103, 307-312` · `src/domain/space/space/space.resolver.fields.ts:225` · `src/domain/community/virtual-contributor/virtual.contributor.resolver.fields.ts:120-128` · `src/domain/innovation-hub/innovation.hub.resolver.fields.ts:169-181` · `account.resolver.fields.ts:90-166` · spec › `agents-hq origin/main:specs/089-profile-other-resources/spec.md` KG-1 | untested (see F1; same defect as ENT-44 / entitlements F5) |
| ACC-07 | A user's profile hands out their account only to the user, to holders of personal-data read on that user (platform users admin, space admins of a space they are in, admins of an organisation they belong to) and to the platform licence manager / resource admin through their own account privileges; an organisation's profile hands out its account only to the organisation's admins and owners and those two platform roles. Everyone else gets nothing (null, no error). | account holder, PUA, PLM, PRA | code › `src/domain/community/user/user.resolver.fields.ts:162-179, 217-266` · `src/domain/community/organization/organization.resolver.fields.ts:242-252, 300-357` · test › `hosted-resources` › `the full account stays closed to an unrelated registered user`; `a Platform Users Admin … still resolves the account`; `a PLATFORM_LICENSE_MANAGER … still resolves the account`; `a PLATFORM_RESOURCE_ADMIN …` | proven |
| ACC-08 | Every signed-in viewer of a user or organisation profile gets the account's hosted resources filtered in one place by each resource's visibility and the viewer's relationship: *public* VCs and packs to every registered viewer; *account* ones on a user account to that user only, on an organisation account also to its associates, admins and owners; *hidden* ones only to the user / the organisation's admins and owners; viewers who can see the account itself (ACC-07) get the full list; innovation hubs are listed to every signed-in viewer whatever their visibility; the library-listing flag plays no part; the filter follows the viewer's current roles; a signed-out viewer gets null, never an empty list and never an error. | registered, organisation associate, account holder, PUA/PLM/PRA | code › `account.lookup.service.ts:111-156` · `user.resolver.fields.ts:187-215` · `organization.resolver.fields.ts:262-330` · test › `hosted-resources` › 9 cases: associate / organization admin / unrelated on org / anonymous null / unrelated on user / owner / Platform Users Admin / PLM / PRA / `once the associate role is removed…` · spec › 089 FR-001…006 | proven |
| ACC-09 | A hosted VC is shown as a closed card (identity + profile) and a hosted hub as a closed card (identity, name, profile); the VC card renders its name, avatar and link under the profile's own public read rule, so a viewer without access to the VC still sees the card, and reading a card never opens a path back to the account or any other field of the resource. | registered | code › `src/domain/space/account/account.hosted.resources.resolver.fields.ts:10-39` · `account.hosted.innovation.hub.resolver.fields.ts:48-75` · `schema.graphql:1355-1380` · test › `hosted-resources` › `a hosted VC and a hosted hub are closed card types…`; `a hosted hub offers no way into its account…`; `an associate's ACCOUNT VC card still renders…` (2 orderings); `an unrelated registered user sees only a user account's PUBLIC pack and PUBLIC VC card…` (name, url, avatar) | proven |
| ACC-10 | A new virtual contributor, innovation pack or innovation hub starts with visibility *account* and listed in the library; the host changes both afterwards. | account admin | code › `src/library/innovation-pack/innovation.pack.service.ts:91-92` · `src/domain/community/virtual-contributor/virtual.contributor.service.ts:106-107` · `src/domain/innovation-hub/innovation.hub.service.ts:99-100` · test › `hosted-resources` › setup read-back `'a new pack must default to ACCOUNT'` | proven (pack default); the virtual contributor and hub defaults are untested |
| ACC-11 | A space, virtual contributor, innovation pack or innovation hub is moved to another account only by an actor who may *offer* it on the current account and *accept* it on the target: the platform resource admin for any pair, or an account admin of both accounts. The offer is checked first; an account admin moving a resource out of their own account into someone else's is refused on the target ("unable to grant 'transfer-resource-accept' privilege: transfer <Resource> to target Account"), a stranger is refused on the source ("… 'transfer-resource-offer' privilege: transfer <Resource> to another Account"), platform support is refused, and a refused resource stays where it was. | PRA, account admin | code › `src/domain/space/account/account.resolver.mutations.ts:645-672, 389-630` · `account.service.authorization.ts:404-424` · test › `transfer-innovation-pack-to-account` › all 5 cases · crosscheck › A9 rows (`access-matrix-crosscheck.md:136-139`) | proven (the PRA path is covered elsewhere: `platform-roles/_support/groups/a9.ts`) |
| ACC-12 | After a transfer the resource belongs to the target: its access rules are recomputed from the new account (a space's whole tree, and its cached URLs are refreshed), a pack's provider reads as the new host — and the target's licence limits are not consulted, so a resource lands on an account that could not have created it. | PRA, account admin | code › `account.resolver.mutations.ts:478-486, 535-547, 598-609, 416-429` · test › `transfer-innovation-pack-to-account` › `Global Admin transfer innovation pack from Organization account to User account without valid entitlements` (pack present in the target with `provider` = the user) | proven (a pack lands on a target without entitlements; see F4) |
| ACC-13 | Only the top-level space of a tree can change account; subspaces follow their top-level space (JRN-15). | PRA, account admin | spec › `agents-hq/specs/030-move-subspace-parent/spec.md:157, 222` · code › no level check in `transferSpaceToAccount` (`account.resolver.mutations.ts:457-505`), `space.entity.ts:52-62` | untested (see F2) |
| ACC-14 | A transfer carried out under a platform credential (the resource admin) writes a platform resource audit row ("moved", with the target account); a transfer by an ordinary account admin writes none. | PRA | code › `account.resolver.mutations.ts:53-55, 431-446, 632-643` | untested |
| ACC-15 | The virtual-contributor transfer is declared to return an innovation pack. | — | code › `account.resolver.mutations.ts:569-571` · `schema.graphql:5320` | untested (see F3) |
| ACC-16 | The account's licence, baseline plan, subscriptions, creation limits, the licence manager's and operations admin's actions on it, and who may read them are the entitlements area: ENT-02/03/04 (limits and refusals), ENT-15/16/17/19 (plans, baseline, subscriptions), ENT-39/40/41 (hubs, privilege-before-limit, PLM bypass), ENT-43/44 (reads), ENT-47/49 (assign/revoke, reset). | — | knowledge › `entitlements.md` | proven / untested per the referenced rows |
| ACC-17 | An account can carry an external billing linkage; it is surfaced to the holder in the deletion pre-flight and captured in the deletion audit, and never blocks anything. | account holder | code › `account.service.ts:355-367, 400-443` · `src/services/api/me/me.resolver.fields.ts:364-405` · `schema.graphql:1292` · spec › `agents-hq origin/main:specs/054-delete-own-account/spec.md` FR-008 · test › `contributor-management/user/delete-own-account` › `an active Wingback subscription does not block deletion…` | proven (covered elsewhere) |
| ACC-18 | Resetting an account's authorization recomputes the account policy and every child (spaces, licence, storage, profile, VCs, packs, hubs) and re-applies the licence; a child whose data is broken is skipped with an error log so the rest of the account is still rewritten. | POA | code › `account.service.authorization.ts:61-124, 146-292` · `account.resolver.mutations.ts:297-319` | untested (see F5: the skipped subtree keeps stale rules — crosscheck F2) |
| ACC-19 | An account is never deleted on its own: it goes with its host (user or organisation) and only once it hosts no space, VC, pack or hub — see DEL-02/04/12. | account holder, PUA, support | code › `account.service.ts:240-353` · `account.lookup.service.ts:158-244` · knowledge › `orphan-free-deletion` DEL-02/04/12 | proven (under DEL) |

### B. Rights: evidence

_The legend and the evidence line of the former who-may table, as written. The table itself is rebuilt in section 2; no cell changed meaning._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `account.service.authorization.ts:324-502` (every rule on the account policy); `account.resolver.mutations.ts:645-672` (transfer offer + accept), `:674-725` (privilege before limit, PLM bypass); `user.resolver.fields.ts:162-266`, `organization.resolver.fields.ts:242-357` (profile account field and hosted-resources scope); `account.lookup.service.ts:124-156` (tier filter); `space.resolver.fields.ts:225`, `virtual.contributor.resolver.fields.ts:120-128`, `innovation.hub.resolver.fields.ts:169-181` (reach-through); `registration.resolver.mutations.ts:138-312` (deletion gates); access matrix `account` (`access-matrix.md:914-947`), `user` (`:1174-1205`); crosscheck rows A3, A5, A7, A9, A12, F6. "Space admin of a member" and "admin of an organisation the user belongs to" come from the `read-user-pii` cells of the `user` resource (`D?` — data-dependent). The legacy account suite runs the positive transfer as the harness admin whose credential set was not verified here (open question 1).

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. The text writes "F-1" for F1 and so on; "entitlements F-5" is a finding in `entitlements.md`._

#### Findings

- **F1 — The account is world-readable while the profile pretends it is closed (ACC-06 vs ACC-07).** Code: the account policy grants READ to anonymous and registered (twice), and `Space.account`, `VirtualContributor.account`, `InnovationHub.account` and `lookup.account` return the account with unfiltered lists to anyone who can read the parent. Test: `the full account stays closed to an unrelated registered user` proves only that `Organization.account` is null. Spec: 089 KG-1 calls the null "obscurity, not enforcement" and leaves it to a separate ticket (#6129); entitlements F-5 is the same defect seen from the licence side. Ruling: is another host's account (its id, spaces, VCs, packs, hubs, plan, usage) meant to be visible to any visitor? One decision closes F-1 here and F-5 there. **Product, 2026-11-20:** for the product part, stays as today; the Security Lead weighs the risk.
- **F2 — A subspace can be transferred to another account (ACC-13).** Code: `transferSpaceToAccount` accepts any space id, sets `space.account` on it and re-applies its policy; subspaces otherwise derive their account from the top-level space (JRN-15) and `Space.account` is a nullable, SET-NULL relation set only on L0 at creation. Test: none. Spec 030: top-level spaces are transferred, subspaces are moved. Ruling: refuse non-L0 targets server-side (as the moves do, JRN-14), or document the client panel as the only gate.
- **F3 — The VC transfer is declared to return an innovation pack (ACC-15).** Code: `@Mutation(() => IInnovationPack)` on `transferVirtualContributorToAccount`; schema `transferVirtualContributorToAccount(...): InnovationPack!`; the method returns a VC. Test: the A9 group calls it through the generated SDK and reads only `id`. Ruling: schema contract fix (breaking for anyone selecting pack fields; nobody can today).
- **F4 — Transfers ignore the target's licence (ACC-12).** Code: no entitlement check and no licence recompute on any of the four transfers, while creation refuses over the limit (ENT-02/03/04). Test: the positive case is titled "without valid entitlements" and asserts success, enshrining it. Spec: none. Ruling: is a transfer a way around the allowance (and is the resulting over-limit account meant to be read-only, archived or merely unable to create — the same open behaviour as entitlements gap 1)? **Product, 2026-11-20:** stays as today; a transfer checking the target's licence limits is a wish on the product issues list. What an over-limit account may do stays with entitlements gap 1.
- **F5 — Reset skips broken children and leaves their stale rules (ACC-18).** Code: `resilientCascade` logs and returns `[]` for a child that throws a relationship/not-found error, so that subtree keeps whatever rules it had. Data: crosscheck F2 — 1,018 files, 872 buckets, 2,000 tagsets … on ACC still name retired credentials under fresh parents. Test: none. Ruling: accept (inert while nobody holds the retired credentials) or add a "skipped subtree" report to the reset so operators can repair.
- **F6 — Personal-data read decides who sees the full hosted list (ACC-07/08).** Code: the full view keys on `READ_USER_PII`, which space admins of a member and organisation admins of an associate hold. Spec 089 KG-3 records it as "the wrong concept, kept for no-regression". Test: only the platform-role holders are exercised. Ruling: keep for parity, or narrow the full view to self + platform roles when hosted spaces (#6695) land. **Product, 2026-11-20:** stays as today; limiting the full view to the user and the Platform Users Admin, Platform License Manager and Platform Resource Admin is a wish on the product issues list (DPO Lead consulted).
- **F7 — Transfer-in of a space does not seat the organisation host (ACC-12 vs JRN-07).** Code: creation on an organisation account adds the organisation as member and lead of the space; a transfer sets the account and re-applies policy only. Test/spec: none. Ruling: should a space transferred to an organisation account acquire the organisation as member/lead (and lose the previous host organisation)? **Product, 2026-11-20 (amended 2026-11-23):** stays as today and is intended: hosting a Space (paying, legal responsibility) does not make the organisation a member or lead. No wish.
- **F8 — Copy-paste error text on the account reset.** `authorizationPolicyResetOnAccount` refuses with "reset authorization definition on Space". Cosmetic; rebaseline row, not a behaviour.

#### Open questions

- **OQ1 — Which credential let the harness admin transfer the pack.** The positive case runs as `GLOBAL_ADMIN`; the gate is resource admin, or account admin of both accounts. Either the persona holds `platform-resource-admin` on the test stack or it is account admin of the qaUser account (it is not). Check the persona's credentials.
- **OQ2 — Live behaviour of transferring a subspace (F-2).** Code reading only; nobody has moved an L1 between accounts on a running stack to see what breaks (URLs, licence, `levelZeroSpace` account).
- **OQ3 — Who writes the billing linkage.** `updateExternalSubscriptionId` has a caller outside the files read here (billing adapter); whether it is ever set on acceptance was not checked.
- **OQ4 — Is the transfer panel exposed to account admins.** The code admits an admin of both accounts; whether any client surface offers a non-PRA transfer (and therefore whether F-4 is reachable by customers) is a client question.

### D. Test gaps

_For the Quality Lead: the GAPS row in section 3 asks which of these get a case._

Untested rules by id: ACC-01 (creation shape beyond the licence), ACC-02 (host resolution, null host), ACC-03 (revoke only when neither admin nor owner), ACC-05 (platform roles on an account — only via the platform-roles suite), ACC-10 (VC and hub defaults), ACC-13 (L0-only transfer), ACC-14 (transfer audit), ACC-15 (schema type), ACC-18 (reset cascade); plus the untested clauses of ACC-12 (space URL refresh after transfer, VC/hub/space transfers in this suite — only packs are moved here).

Behaviours the area has that neither reading nor tests pinned down:
- A transfer by an account admin of both accounts (the only non-PRA path that can succeed) — never exercised; the positive case runs as the harness admin.
- Transfer of a space with members: do their memberships, the Matrix space and the space's own licence credentials survive unchanged (code says yes; nothing proves it).
- Transfer-out leaving the source account below its usage, and transfer-in pushing the target over its limit (F-4).
- `Account.innovationPacks(searchVisibility:)` / `innovationHubs(searchVisibility:)` filtering.
- An organisation admin who is also owner losing one of the two roles keeps account-admin (ACC-03).
- Hub creation refusals (taken subdomain, reserved nameID) and the PLM/PCFA-only creation path with the entitlement present (ENT-39).
- The organisation host added as member + lead on space creation (JRN-07 covers the space side; nothing checks it is the account's host organisation specifically).
- Hosted resources on the deleted-user sentinel (null) and for a VC/organisation actor as viewer.
- The account profile (`Account.profile`) — created, never read by any case.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits and access rules. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Account types (2) | `USER='user'`, `ORGANIZATION='organization'` | `src/common/enums/account.type.ts:3-6`; `schema.graphql:43-46` | no | Technical Lead |
| Account roles (1) | `HOST='host'` (enum exists; no role assignment uses it) | `src/common/enums/account.role.ts:3-5` | no | Technical Lead |
| Account nameID shape | `account-` + first 8 characters of a UUID; profile displayName = the nameID | `account.host.service.ts:50, 63-67` | no | Technical Lead |
| New-account licence | 7 entitlements (`ACCOUNT_SPACE_FREE/PLUS/PREMIUM`, `ACCOUNT_VIRTUAL_CONTRIBUTOR`, `ACCOUNT_INNOVATION_HUB`, `ACCOUNT_INNOVATION_PACK`, `ACCOUNT_AI_ASSISTANT_TOKENS_MONTH`) at limit 0 / disabled; baseline plan all zeros | `account.host.service.ts:69-118`; `constants.ts:3-10` (ENT-15) | yes | Product Lead |
| Resource visibility (3) | `HIDDEN='hidden'` (direct access only), `ACCOUNT='account'`, `PUBLIC='public'` | `src/common/enums/search.visibility.ts:3-7`; `schema.graphql:961-965` | yes | Product Lead |
| Visibility defaults at creation | VC, pack, hub: `searchVisibility = ACCOUNT`, `listedInStore = true` | `innovation.pack.service.ts:91-92`; `virtual.contributor.service.ts:106-107`; `innovation.hub.service.ts:99-100` | yes | Product Lead |
| Hosted-resources tiers | REGISTERED → PUBLIC; ORGANIZATION_ASSOCIATE → PUBLIC + ACCOUNT; FULL → all; hubs → always; anonymous → null | `account.lookup.service.ts:138-155`; 089 R1/R3 | yes | Product Lead |
| Full-view gate | self · `READ_USER_PII` on the user · organisation `UPDATE` · `ACCOUNT_LICENSE_MANAGE` or `TRANSFER_RESOURCE_ACCEPT` on the account | `user.resolver.fields.ts:217-266`; `organization.resolver.fields.ts:300-357` | no (F-6) | Security Lead |
| Closed card shapes | `AccountHostedVirtualContributor {id, profile}`; `AccountHostedInnovationHub {id, nameID, profile}` | `schema.graphql:1355-1380` | no | Technical Lead |
| Account-admin credential | `account-admin` scoped to the account id; users at registration; organisation ADMIN and OWNER implicitly | `user.service.authorization.ts:167-170`; `role.set.service.ts:831-847` | no | Security Lead |
| Privileges on the account policy | `CREATE_SPACE`, `CREATE_VIRTUAL`, `CREATE_INNOVATION_PACK`, `CREATE_INNOVATION_HUB`, `TRANSFER_RESOURCE_OFFER`, `TRANSFER_RESOURCE_ACCEPT`, `ACCOUNT_LICENSE_MANAGE`, `AUTHORIZATION_RESET`, `LICENSE_RESET`, `PLATFORM_SUPPORT_ORG_RESOURCES`, `CREATE/READ/UPDATE/DELETE` (+ `GRANT` on child packs/hubs) | `account.service.authorization.ts:324-540` | no | Security Lead |
| Transfer audit owner | `A9_TRANSFER_INTENDED_OWNERS = [platform-resource-admin]`; resource kinds `space`, `innovation-hub`, `innovation-pack`, `virtual-contributor`; outcome `moved` | `account.resolver.mutations.ts:53-55, 431-446` | no | Security Lead |
| Error text — transfer refused (source) | `Authorization: unable to grant 'transfer-resource-offer' privilege: transfer <Resource> to another Account: <actorID>` | `account.resolver.mutations.ts:660-665` | no | Technical Lead |
| Error text — transfer refused (target) | `… 'transfer-resource-accept' privilege: transfer <Resource> to target Account: <actorID>` | `account.resolver.mutations.ts:666-671` | no | Technical Lead |
| Resource names in transfer texts | `InnovationHub`, `Space`, `Innovation Pack`, `VirtualContributor` | `account.resolver.mutations.ts:412, 474, 531, 594` | no | Technical Lead |
| Error text — account not found | `Unable to find Account with ID: <id>` / `Unable to find Account on Host with ID: <id>` / `Unable to find Host for account with ID: <id>` | `account.service.ts:376-378`; `account.lookup.service.ts:50-53, 79-82` | no | Technical Lead |
| Error text — hub subdomain | `Unable to create Innovation Hub: the provided subdomain is already taken: <subdomain>` | `innovation.hub.service.ts` (createInnovationHub) | no | Technical Lead |
| GraphQL surface | `Account{…}` (`schema.graphql:1276-1330`), `User.account`, `User.hostedResources` (`:7785`), `Organization.account`, `Organization.hostedResources` (`:5542`), `AccountHostedResources` (`:1365-1373`), `Account.innovationHubs/innovationPacks(searchVisibility)`, mutations `transferInnovationHubToAccount`, `transferInnovationPackToAccount`, `transferSpaceToAccount`, `transferVirtualContributorToAccount` (`:5314-5320`; the last typed `InnovationPack!`), `createSpace/createInnovationHub/createVirtualContributor/createInnovationPack`, `authorizationPolicyResetOnAccount`, `licenseResetOnAccount`, `updateBaselineLicensePlanOnAccount` | `schema.graphql` | no (F-3) | Technical Lead |

### F. Where this lands in the new core

The account becomes the owning `actor` row's host record: `account(id, host_actor, type, billing_ref)` with resources (`space`, `virtual_contributor`, `innovation_pack`, `innovation_hub`) carrying an `account_id` foreign key, and the account-admin relation derived at read time from "host = me" or "I am admin/owner of the host organisation" rather than a stored `account-admin` credential (catalogue: credentials become derived; `plan_assignment` replaces the licence snapshot — see entitlements § Where this lands). Three facts found here should shape it: (1) the reach-through to the account (ACC-06, F-1) is a stored-policy artefact — in the new core the account's read rule must be the same whichever edge you arrive by, and the profile's hosted-resources tiers (ACC-08) should be the one read model for "what does this host show"; (2) transfers (ACC-11/12) must be an L0-only, two-consent operation that re-derives entitlement usage on the target (today limits are silent, F-4); (3) the implicit organisation account-admin (ACC-03) is exactly the kind of derived credential the new core computes instead of storing, so its revoke-only-when-neither rule becomes a join, not bookkeeping. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/account/`, 2 files, 20 cases); the specs, issues and docs listed in § Sources. Scope: the account as the host of resources — user and organisation accounts, who administers them, what they host (spaces, virtual contributors, innovation packs, innovation hubs), how those resources are shown on a profile, transfers between accounts, and the account's part in deletion. Licence rules (plans, limits, baseline plan, subscriptions) are the entitlements area and are cross-referenced as `ENT-nn`, never redone. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout. The single why of each rule was sorted into business and technical without rewording, each rule got a short plain version (the exact text is in Appendix A), and every finding, open question and gap was routed to an organisation role. Product reviewed section 3 on 2026-11-20.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue, pull request or code comment states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains. No source was found for ACC-02, ACC-10 or ACC-12; ACC-16 only points to `entitlements.md`.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/space/account/account.entity.ts`, `account.interface.ts`, `account.service.ts`, `account.service.authorization.ts`, `account.resolver.mutations.ts`, `account.resolver.fields.ts`, `account.hosted.resources.resolver.fields.ts`, `account.hosted.innovation.hub.resolver.fields.ts`, `dto/account.hosted.resources.ts`, `constants.ts`, `README.md`
- `src/domain/space/account.host/account.host.service.ts`; `src/domain/space/account.lookup/account.lookup.service.ts`; `src/domain/space/account.license.plan/*`
- `src/domain/community/user/user.service.ts`, `user.service.authorization.ts`, `user.resolver.fields.ts`; `src/domain/community/organization/organization.service.ts`, `organization.resolver.fields.ts`
- `src/domain/access/role-set/role.set.service.ts` (implicit account admin)
- `src/domain/space/space/space.entity.ts`, `space.resolver.fields.ts`; `src/domain/community/virtual-contributor/virtual.contributor.service.ts`, `virtual.contributor.resolver.fields.ts`; `src/library/innovation-pack/innovation.pack.service.ts`, `innovation.pack.resolver.fields.ts`; `src/domain/innovation-hub/innovation.hub.service.ts`, `innovation.hub.resolver.fields.ts`
- `src/common/enums/account.type.ts`, `account.role.ts`, `account.deletion.blocker.kind.ts`, `search.visibility.ts`
- `src/services/api/me/me.resolver.fields.ts`; `src/services/api/registration/registration.resolver.mutations.ts`
- `schema.graphql`
- git: `c44532f77` (#4369), `6525d34e1` (#6702), `fc00fd19c` (#6094), `df7445856` (#6322), `656bec3df` (#6416)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/account/hosted-resources.it-spec.ts`, `transfer-innovation-pack-to-account.it-spec.ts`, `account.params.request.ts`
- `docs/qa/server-rebuild/knowledge/_inventory.md` § account; `access-matrix.md` (§ account, § user); `access-matrix-crosscheck.md` (A3, A5, A7, A9, A12, F6)
- Other suites touching the area (list only): see dossier § 3

Specs / issues:
- `agents-hq origin/main:specs/089-profile-other-resources/spec.md` + `design/operator-rulings.md` (not in the local clone)
- `agents-hq/specs/030-move-subspace-parent/spec.md` (:157, :222)
- `agents-hq/specs/017-innovation-hub-resources/spec.md` (hub curated lists; boundary only)
- `agents-hq origin/main:specs/054-delete-own-account/spec.md` FR-004/FR-008 (account as blocker; billing linkage)
- 027 platform-role redesign via code comments and the crosscheck (A9, A12, C1-1, C1-12, F5, corr-server-8, spec-server-14)
- `knowledge/entitlements.md` (ENT-02/03/04/15/16/17/19/39/40/41/43/44/47/49, finding F-5)
