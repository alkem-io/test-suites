# Entitlements and licences: behaviour rules

_What the platform does today for entitlements and licences: how allowances are worked out, account plans, space plans, space features, feature roles, limits, and who reads and manages licences: what it does, why, who may, and what is still to answer. The layout is that of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 0 · Technical Lead 6 · Quality Lead 5 · Security Lead 1 · Architecture Lead 3. By state: 8 open · 7 with a suggested answer · 14 decided. Proof of the 44 rules: 18 proven by a test · 26 untested (Appendix A)._

_Whys of the 44 rules: 39 rest on a source or a product decision · 5 rest only on a technical QA draft for the Technical Lead (ENT-02, ENT-03, ENT-04, ENT-07, ENT-18)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why, or the part of a why, ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A user story always ends in its "so that"; where no source gives one, QA wrote it. A rule with no why at all carries an open question or a defect marker in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Not decided" means the behaviour exists in the code and nobody chose it. Product reviewed section 3 on 2026-11-20.
- A marker in bold at the end of a rule points at section 3: **(open: F5)** means a question on this rule is still open. A marker **(defect: …)** would mean today's behaviour is a fault and must not be copied as intended; no rule in this file carries one yet. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A decided question leaves section 3 and moves onto its rule. Nothing is decided in this file yet.

## 1. Rules

### How allowances work

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ENT-09 | Every licence is worked out from zero: everything starts switched off, the account's baseline plan is applied, then every plan held adds its allowance. A feature is on when its limit is above 0. | — | — | Credential-based licensing: a plan is a credential, so revoking the credential removes the grant without bookkeeping (server#4593 origin). | Server #4593 |
| ENT-10 | A counted allowance is available while current use is below its limit. A feature is available when it is switched on. The "available" list shows only those. | — | — | An entitlement reports both its current usage and whether it is available (server#4593 design); limits are enforced server-side on real counts, not on a one-time grant. | Server #4593 (design) |
| ENT-11 | Use is the account's current number of spaces, virtual contributors, innovation hubs and innovation packs. Deleting one frees its place at once. | — | — | Allowance is a live count: an entitlement carries its current usage (server#4593 design). | Server #4593 (design) |
| ENT-12 | A space counts against one account tier only: the highest it has (premium, then plus, then free). | A space has one tier, so counting it against several tiers would charge it twice. | — | — | Product, 2026-11-20 (Q-ENT-12) |
| ENT-13 | The AI assistant allowance is a monthly token budget on the account (10,000,000 under the plus plan). The server always reports its use as 0; the count is kept in the assistant service. | Tiers signed off 2026-06-17: free 1M, plus 10M, premium 50M. | — | Budget (how much) is a licence entitlement, access (who) is a privilege — two orthogonal gates (004 FR-027). | Spec 004 FR-027; tiers signed off 2026-06-17; Product, 2026-11-20 (F1) (amended 2026-11-25): stays as today; the free tier is for the pricing discussion with Neil |
| ENT-14 | A licence is a stored result. It changes only when a plan is given or taken away, a baseline plan is updated, a feature role is granted or removed, a space is created, or an operations admin runs a licence reset. It never changes on a timer. **(open: Q-ENT-14)** | — | — | Licences are a separate tree of services built like the authorization tree, with an admin mutation to reset them all (server#4593 design: "authorization is per user, entitlements are per entity"). | Server #4593 (design) |

### Account plans

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ENT-15 | A new account, of a user or of an organisation, starts with every allowance at 0 and no plan, so it can create nothing. | Nothing is given away by default: an account creates only what a plan or a feature role grants it. | — | — | Not decided: exists in the code; Product, 2026-11-20 (F1) (amended 2026-11-25): stays as today; the free tier is for the pricing discussion with Neil |
| ENT-16 | The account plus plan gives an account 3 free spaces, 3 virtual contributors, 1 innovation hub, 3 innovation packs and 10,000,000 AI tokens a month. | The beta/trial allowance of the feature roles (027 rows 11/14); hub limit 1 because hubs are the commercial, platform-curated offering (027 QA ruling C1-12). | — | — | Spec 027 rows 11/14; 027 QA ruling C1-12; Product, 2026-11-20 (F6): accepted, hubs stay platform-curated |
| ENT-17 | Each account has a baseline plan of six counters that sets the minimum for its counted allowances; plans add on top of it. Only the Platform License Manager can change it. | — | — | "Additional entitlements may be added via other means" (schema description of `baselineLicensePlan`). | Not decided: exists in the code (the schema description gives the reason) |
| ENT-18 | A plan is accepted only on its own kind: account plans on accounts, space plans and space features on spaces. A mismatch is refused. **(open: Q-ENT-18)** | — | — | Account plans and space plans switch on different entitlements, so a plan on the wrong kind of target would grant nothing. _(draft)_ | Not decided: exists in the code |
| ENT-19 | An account's subscriptions are the plans it holds, each with its end date (none when permanent). | The holder (and the licence manager console) can see which plans are active. | — | — | Product, 2026-11-20 |
| ENT-07 | An organisation's account works like a user's. An organisation admin sees its allowances and, with the plus plan, can create a space, a virtual contributor and an innovation pack under it. | — | — | Organisation and user accounts share one entitlement model. _(draft)_ | Not decided: exists in the code |

### Space plans

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ENT-21 | Every new top-level space automatically gets the free space plan, virtual contributor access and save-as-template. Plus, premium and multi-user whiteboards are off. | — | — | These three plans are marked "assign to new user/organisation accounts". | Plan definitions (`license-plans.json`) |
| ENT-05 | Giving a top-level space the plus plan switches on the plus tier and multi-user whiteboards. Taking it away returns the space to the free set at once. The account holder sees the space's licence in their own account view. | The plus plan bundles multi-user whiteboards and templates (seed rule). | — | — | Plan definitions (seed rule) |
| ENT-23 | The premium space plan switches on the premium tier, multi-user whiteboards and save-as-template: the same features as plus, with the premium marker. | Premium is a commercial marker for spaces on the premium price; today it gives the same features as plus. | — | — | Product, 2026-11-20 (Q-ENT-23) |
| ENT-24 | An enterprise space plan exists (contact support, no price) but gives nothing. | Enterprise is sold through support; the plan is listed so people can ask for it, not to switch anything on. | — | — | Product, 2026-11-20 (F4): stays as today, a contact-support entry in the plan list that gives nothing |
| ENT-25 | A plan with a trial (today only the plus space plan) gets an end date one month out. The date is shown but never checked: the plan keeps working after it. **(open: OQ4)** | Trial month per plan definition. | — | — | Plan definition (`license-plans.json`); Product, 2026-11-20 (F2): stays as today, a person ends a trial by taking the plan away; checking the end date is a wish on the product issues list |
| ENT-26 | A space's features always come from its top-level space. A plan given to a subspace is accepted and listed there but has no effect. **(open: F3)** | — | — | 083: plans are assigned to L0 only; the License Issuer UI restricts the target. | Server spec 083 |
| ENT-27 | Giving or taking away a plan on a top-level space updates the whole tree at once: the space, its community roles, its collaboration tools and every subspace. | — | 083 US1: "immediately afterwards … the contained Collaboration and every descendant" reports the new state. | — | Server spec 083 US1 |

### Space features

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ENT-28 | Six free feature plans each switch on one feature on a top-level space: virtual contributors, multi-user whiteboards, multi-user memos, save-as-template, office documents, memo signing. All are arranged through support; none is paid. | Per-space feature control "by assigning or revoking a license plan — no code changes, no feature flags, no deploys" (083). | — | — | Server spec 083 |
| ENT-29 | A subspace has the same features as its top-level space. | — | — | One licence per Space hierarchy; subspace inheritance reused rather than a new mechanism (server#6478, 083 FR-003a). | Server #6478; server spec 083 FR-003a |
| ENT-06 | Memo signing is off on a new space and its subspaces. Giving the top-level space the memo-signing feature switches it on for both; taking it away closes it. While it is closed, preparing a memo for signing is refused. Reading, downloading and checking signed copies stay available. | Signing is a paid, space-scoped feature enforced before Prepare and Continue side effects; the two refusals are distinct so the client can route the user (buy vs link) (server#6478, alkemio#2025). | — | — | Server PR #6478; alkemio#2025 |
| ENT-30 | A virtual contributor can be given a role in a space, or invited to it, only while the space has virtual contributor access. Otherwise it is refused. | Virtual contributors are a space feature (virtual contributor access is one of the six feature plans, ENT-28), so a space without it cannot take one in. | — | — | Product, 2026-11-20 (Q-ENT-30) |
| ENT-31 | Multi-user whiteboards and multi-user memos are switched on per space by their features. Template and standalone whiteboards and memos are never multi-user. | Multi-user editing is a space feature; a template or a standalone whiteboard or memo belongs to no space that could hold it. | — | — | Product, 2026-11-20 (Q-ENT-31) |
| ENT-32 | Adding an office document (Collabora) to a space whose office-documents feature is off is refused, for every role, platform admins included. Existing documents stay. | Subscription boundary for office docs (002). | — | One message so callers cannot tell "no licence" from "licence unreadable"; the gate holds for every role, administrators included (002 FR-007, FR-009). | Server spec 002 FR-007, FR-009 |
| ENT-33 | The save-as-template feature is calculated for every space, but nothing on the server refuses an action when it is off. | Saving a space as a template is open to every space today; the flag is kept without a gate. | — | — | Product, 2026-11-20 (F8): stays as today, the flag is computed but gates nothing |
| ENT-34 | Organisations never have virtual contributor access, so a virtual contributor cannot be given a role in an organisation. The platform itself always has it. | — | — | "Hard coded org entitlements for now" — no product statement. | Product, 2026-11-20 (F13): stays as today, virtual contributors are not members of organisations |

### Feature roles

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ENT-01 | Granting a user the feature role VC Campaign or Beta Tester gives their account the account plus plan at once. Both roles give the same allowance (ENT-16). **(open: F12)** | Feature roles are temporary by default — beta access, a trial; VC Campaign is the targeting half of the dashboard VC offer and carries the same trial allowance (027 rows 11/14). | — | — | Spec 027 rows 11/14 |
| ENT-08 | Removing the role takes the plus plan away, but only when the user holds neither of the two roles. What was created under the allowance stays. | — | — | Reconcile against current membership across both roles, so revoking one does not strip the other's allowance (027 QA C1-note fix). | Spec 027 (QA C1-note fix) |
| ENT-36 | The feature roles Virtual Assistant and Organization Creator give no allowance. The first gives access to the assistant; the second gives the right to create organisations. | — | — | Access to the assistant is a privilege; its budget is the account entitlement (004 FR-027); org creation split out of beta tester (027). | Spec 004 FR-027; spec 027 |
| ENT-37 | VC Campaign is the only feature role that a platform invitation can carry. The others must be granted directly. **(open: F12)** | Invitation = targeting path of the VC offer. | — | Feature grants through invitations would bypass the six assignment rules and the fail-closed audit (027). | Spec 027 |

### Limits and refusals

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ENT-02 | Innovation packs per account are limited (3 under plus). The fourth is refused with a message that names the limit, and packs leave the "available" list while the limit is reached. **(open: F7)** | — | — | Limits are enforced server-side; the message is what the client shows. _(draft)_ | Not decided: exists in the code |
| ENT-03 | Free spaces per account are limited (3 under plus); the fourth is refused. Deleting a space makes room again. **(open: F7)** | — | — | Same mechanism; allowance is a live count. _(draft)_ | Not decided: exists in the code |
| ENT-04 | Virtual contributors per account are limited (3 under plus); the fourth is refused. **(open: F7)** | — | — | Same mechanism for agents. _(draft)_ | Not decided: exists in the code |
| ENT-39 | Innovation hubs per account are limited (1 under plus), but an account admin can never create one. Only the Platform License Manager or Platform Content Full Access may, on any account. | Hubs are the commercial offering, kept platform-curated (027 QA ruling C1-12 (a)). | — | — | Spec 027 QA ruling C1-12 (a); Product, 2026-11-20 (F6): accepted, hubs stay platform-curated |
| ENT-40 | The right to create is checked before the limit: someone without it is refused for lack of rights, not for the limit. The limit applies to whoever creates on the account, Platform Content Full Access included. **(open: Q-ENT-40)** | — | — | Authorization (who may act) and entitlement (what the entity has) are separate and "simply overlay each other but have to be independent" (server#4593 design), so the limit belongs to the account whoever acts. | Server #4593 (design) |
| ENT-41 | The Platform License Manager may go over any account limit when creating on an account. Nobody else can. | The bypass is a licensing decision, so it belongs to the licence manager, not to support or content roles (027 T074). | — | — | Spec 027 T074 |

### Reading and managing licences

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| ENT-43 | A user reads their own account's licence: each allowance with its limit, use and availability, the plans held, and the licence of each space. | The account page is the holder's source of truth for what it may create. | — | — | Product, 2026-11-20 |
| ENT-44 | Any account's licence, limits, use and plans can be read by anyone who can read the account. Today that is every visitor, signed in or not. | — | — | "By default it is world visible. TODO: work through the logic on this" (code comment). | Not decided: exists in the code (a code comment marks it "TODO"); Product, 2026-11-20 (F5): stays as today; restricting who reads it is a priority security/privacy wish on the product issues list |
| ENT-45 | A space's licence can be read by anyone who may read the space (members, and everyone for a public space), by the account admin, and by the platform roles the space gives access to. | A space's licence says which features the space offers, so whoever may read the space may read it. | — | — | Product, 2026-11-20 (Q-ENT-45) |
| ENT-46 | The list of plans, and what each plan gives, can be read by every registered user. | — | As a registered user, I want to see the plans and what each one gives, so that I can choose the plan that fits. | "For now allow all registered users to see the license plans + policy" (code comment); the client needs the catalogue to render plan pages. _(draft)_ | Product, 2026-11-20 (Q-ENT-46); the "for now" in the code comment stays as today |
| ENT-47 | Giving or taking away a plan on a space or an account, and changing an account's baseline plan, is for the Platform License Manager only. Every such action is audited. **(open: OQ1)** | Licensing *usage* is one role's family (027 row 8 / A12), separated from support and from plan definition. | — | — | Spec 027 row 8, A12 |
| ENT-48 | Defining plans and what they give (creating, changing, deleting) is for the Platform Settings Admin only. Every such action is audited. | Definition (settings) and usage (licence manager) are disjoint families. | — | The in-memory gate exists because the stored licensing policy inherits the root rule and would otherwise admit content-full-access (027 A13, corr-server-7/10). | Spec 027 A13 |
| ENT-49 | Recalculating licences, for one account or for all, is for the Platform Operations Admin only. | Licence-entitlement reset belongs to the operational/maintenance family (032 FR-002). | — | — | Spec 032 FR-002 |

Numbering note: ENT-20, 22, 35, 38 and 42 were folded into neighbours during drafting and are intentionally unused. The ids keep the numbers of the 2026-10-27 template, so they do not run in order inside a sub-area.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W13 are new; the rows and cells are those of the former who-may table, in the same order. Product has not confirmed the cells yet. Evidence is in Appendix B. "Account admin" is the user whose account it is, or an admin of the organisation that owns it._

### Managing plans

| ID | Action | Platform License Manager | Other platform admin roles | Account admin | Space admin | Space member | Registered user | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Give or take away a plan on a space | Y | N¹ | N | N | N | N | N |
| W2 | Give or take away a plan on an account | Y | N | N | N | N | N | N |
| W3 | Update an account's baseline plan | Y | N | N | – | – | N | N |
| W4 | Go over an account limit when creating | Y | N | N | – | – | N | N |
| W5 | Create, change or delete plan definitions and what they give | N | Y² | N | N | N | N | N |
| W6 | Reset licences, for one account or all | N | Y³ | N | – | – | N | N |

¹ Platform Settings Admin, Platform Content Full Access, Platform Operations Admin and Platform Support included. ² Platform Settings Admin only. ³ Platform Operations Admin only.

### Reading licences

| ID | Action | Platform License Manager | Other platform admin roles | Account admin | Space admin | Space member | Registered user | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|
| W7 | Read your own account's licence | Y | Y | Y | – | – | Y | – |
| W8 | Read another account's licence | Y | Y | Y | Y | Y | Y⁴ | Y⁴ |
| W9 | Read a space's licence | Y⁵ | Y⁶ | Y⁷ | Y | Y | Y⁸ | Y⁸ |
| W10 | Read the list of plans and what they give | Y | Y | Y | Y | Y | Y | N |

⁴ Every visitor can; whether that is intended is F5. ⁵ On top-level spaces. ⁶ Where the role may read the space or its licence: the spaces reader and Platform Resource Admin everywhere. ⁷ Their own spaces. ⁸ On public spaces.

### Creating under an allowance

| ID | Action | Platform License Manager | Other platform admin roles | Account admin | Space admin | Space member | Registered user | Anonymous visitor |
|---|---|---|---|---|---|---|---|---|
| W11 | Create an innovation hub on an account | Y | Y⁹ | N¹⁰ | – | – | N | N |
| W12 | Create a space, a virtual contributor or an innovation pack on an account | N¹¹ | Y¹² | Y¹³ | – | – | N | N |
| W13 | Give a virtual contributor a role in a space, or invite one | – | Y¹⁴ | – | Y | N | N | N |

W13 needs virtual contributor access on the space (ENT-30). ⁹ Platform Content Full Access only. ¹⁰ Although the plus plan gives the account one hub; see F6. ¹¹ Unless also the account admin. ¹² Platform Content Full Access only, on any account. ¹³ On their own account. ¹⁴ Only a role that holds the grant right on the space's community roles.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 0 to answer

Nothing to answer: every Product Lead question is decided (see Decided).

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 6 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Space plans | decision | A plan given to a subspace is accepted but does nothing. Must the server refuse it, or is the web app the gate, as spec 083 describes? | Technical Lead | — | open |
| F7 | Limits | tidy-up | The "limit reached" message contains the account id, against the server's own rule for error messages. Three tests pin the exact text. | Technical Lead (Quality Lead rebaselines the three cases) | When the message is cleaned, rebaseline the three cases; the red is not a change in behaviour. | suggested |
| F11 | How allowances work | tidy-up | A code comment calls the AI token values placeholders; the migration says they were signed off on 2026-06-17. | Technical Lead | Trust the migration; fix the comment. | suggested |
| Q-ENT-14 | How allowances work | decision | Why does this rule exist? No source states a reason. Why is a licence stored and recalculated on events, not read fresh? | Technical Lead | server#4593 (the PR that introduced licences): a separate tree of licence services "similar to authorization services", with an admin mutation to reset all licences. The why is on ENT-14. | suggested |
| Q-ENT-18 | Account plans | decision | Why does this rule exist? No source states a reason. Why is a plan refused on the other kind of target? | Technical Lead | — | open |
| Q-ENT-40 | Limits | decision | Why does this rule exist? No source states a reason. Why does the limit also apply to Platform Content Full Access? | Technical Lead | server#4593: authorization and entitlement logic are "fully separate", "they simply overlay each other but have to be independent" — the limit belongs to the account, whoever creates. The why is on ENT-40. | suggested |


### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 5 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F12 | Feature roles | check | Does accepting a platform invitation that carries VC Campaign also give the account plus plan? Only the direct grant was read. | Quality Lead | Verify live, then extend ENT-01 to the invitation path. | suggested |
| OQ1 | Reading | test | The tests give plans as the harness admin and pass, but only the Platform License Manager may do that (ENT-47). Does the harness admin hold that role on the test cluster? | Quality Lead | Check the roles of the harness admin on the test cluster. | suggested |
| OQ2 | Feature roles | check | Do other paths also give the account plus plan: a feature role granted to an organisation, or an accepted invitation that carries VC Campaign? (See F12.) | Quality Lead | — | open |
| OQ4 | Space plans | test | Nobody has watched a trial pass its end date on a running stack; that it keeps working is read from the code (F2). | Quality Lead | — | open |
| GAPS | All | test | 26 rules have no test, 3 more are tested only in part, and 10 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F7 | Limits | tidy-up | The "limit reached" message contains the account id, against the server's own rule for error messages. Three tests pin the exact text. | Technical Lead (Quality Lead rebaselines the three cases) | When the message is cleaned, rebaseline the three cases; the red is not a change in behaviour. | suggested |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Reading | risk | Any visitor, signed in or not, can read any account's licence, limits, use and plans. Should another account's plan and use be visible? | Security Lead (Product Lead rules on what is shown; DPO Lead consulted) | Product, 2026-11-20: stays as today; restricting it is listed as a priority (security/privacy) wish on the product issues list: only the account's own admins and the licence managers read an account's licence, limits, usage and plans. The Security Lead and the DPO Lead are to assess it. | open |


### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 3 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F9 | How allowances work | contract | A new space and its collaboration tools start with different default values for three features. It is harmless today because the licence is recalculated at once. | Architecture Lead | One default in the new core. | suggested |
| F10 | How allowances work | contract | Feature rules ignore their limit, account rules add limits up, and only the first matching rule counts. It does not matter until a second account plan exists. What does "limit" mean in the new core? | Architecture Lead | — | open |
| OQ3 | Reading | contract | Is the order of the "available" list something clients may rely on? The tests sort before comparing; the code promises no order. | Architecture Lead | — | open |

### Decided

| Was | Decision | Decided by | Now |
|---|---|---|---|
| F2 | Behaviour stays: a trial plan's end date is shown but never checked; a person ends a trial by taking the plan away. Wanted: a trial plan stops working on its end date, but only after trials have been reviewed as a whole; nobody fixes this before that review. | Product, 2026-11-20 (amended 2026-11-25) | ENT-25; PRODUCT-ISSUES F2 (entitlements) |
| F4 | Stays as today: the enterprise space plan is a contact-support entry that gives nothing. No wish is listed. | Product, 2026-11-20 | ENT-24 |
| F6 | Accepted: the plus plan counts one innovation hub, but hubs stay platform-curated; the web app should not offer "create hub" on the strength of the available list. | Product, 2026-11-20 | ENT-16, ENT-39 |
| F8 | Stays as today: the save-as-template flag is computed but gates nothing. No wish is listed; the Technical Lead may record it as unused. | Product, 2026-11-20 | ENT-33 |
| F13 | Stays as today: virtual contributors are not members of organisations. | Product, 2026-11-20 | ENT-34 |
| Q-ENT-12 | The draft why stands: a space has one tier, so counting it against several would charge it twice. | Product, 2026-11-20 | ENT-12 |
| Q-ENT-23 | Premium is a commercial marker; today it gives the same features as plus. No wish is listed. | Product, 2026-11-20 | ENT-23 |
| Q-ENT-30 | The draft why stands: virtual contributors are a space feature, so a space without it cannot take one in. | Product, 2026-11-20 | ENT-30 |
| Q-ENT-31 | The draft why stands: a template or standalone whiteboard or memo belongs to no space that could hold the feature (as WBD-16). | Product, 2026-11-20 | ENT-31 |
| Q-ENT-45 | Whoever may read a space may read its licence, because the licence says which features the space offers. | Product, 2026-11-20 | ENT-45 |
| Q-ENT-46 | Every registered user sees the plans and what they give, so they can choose one; it stays as today. | Product, 2026-11-20 | ENT-46 |
| CONST | Product rules on the plan names, prices, defaults, trial length, limits, grants, tier priority, baseline, organisation VC access and feature roles (the rows pre-filled for the Product Lead), ticked "yes" in Appendix E. Error texts and wire values go to the Technical Lead. | Product, 2026-11-20 | Appendix E |
| F1 | Behaviour stays: a new account starts with every allowance at 0 and no plan, so it creates nothing and gets no AI budget. Discuss (Neil, pricing): whether every account gets the approved free tier (1 free space, 1,000,000 AI tokens; spec 004 FR-027). Not to be taken forward before that, because it would let anyone open a space without us. Same decision as web-assistant F4b. | Product, 2026-11-20 (amended 2026-11-25) | ENT-13, ENT-15; PRODUCT-ISSUES F1 (entitlements) |
| F5 | Behaviour stays: every visitor, signed in or not, can read any account's licence, limits, usage and plans (today `account.service.authorization.ts` grants world READ, with a TODO). Wanted, priority (security/privacy): only the account's own admin and owner, the Platform License Manager and the Platform Resource Admin can read them; the Security Lead and the DPO Lead are to assess it. Discuss (Neil): whether Platform Support may read them too. | Product, 2026-11-20 (amended 2026-11-25) | ENT-44; PRODUCT-ISSUES F5 (entitlements) |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›` or `matrix ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| ENT-09 | Every licence is recomputed from zero: all entitlements reset to limit 0 / disabled, the account baseline plan is applied, then every credential the actor holds adds its granted limits; an entitlement is enabled when its limit is above 0. | server | code › `src/domain/space/account/account.service.license.ts:55-65, 112-113, 157-158` · `src/domain/common/license-entitlement/license.entitlement.service.ts:81-85` | untested |
| ENT-10 | A counted entitlement (data type LIMIT) is available while the live usage is below the limit; a feature flag (FLAG) is available exactly when it is enabled. `availableEntitlements` lists only the available ones. | server | code › `license.entitlement.service.ts:153-189` · `src/domain/common/license/license.service.ts:119-146` · test › `innovation-packs-functional-entitlements` › `Create a innovation pack over the license limit` | proven |
| ENT-11 | Usage is the account's current number of spaces, virtual contributors, innovation hubs and innovation packs; deleting a resource immediately frees the slot. | account holder | code › `src/services/infrastructure/license-entitlement-usage/license.entitlement.usage.service.ts:32-108` · test › `space-functional-entitlements` › `Create a space after third over the license limit was removed` | proven |
| ENT-12 | A space counts against exactly one account tier — the highest tier flag it has enabled (premium, then plus, then free). | server | code › `license.entitlement.usage.service.ts:18-22, 115-152` | untested |
| ENT-13 | The AI-assistant token entitlement is a monthly weighted-token allowance on the account; the server always reports its usage as 0 — the meter lives in assistant-service. | account holder | code › `license.entitlement.usage.service.ts:96-101` · `src/migrations/1780700000000-AddAiAssistantTokensEntitlement.ts:3-28` · spec › `agents-hq/specs/004-web-ai-assistant/spec.md:238-241` · test › `user-entitlements` › `VC campaign licenses assigned` (present in the available list) | proven (see F1; only that the type is in the available list; the free tier is untested) |
| ENT-14 | Licence state is a stored snapshot. It changes only when a plan is assigned or revoked, a baseline plan is updated, a feature role is granted or removed, a space is created, or an operations admin runs a licence reset — never on a timer. | server | code › `src/platform-admin/licensing/admin.licensing.resolver.mutations.ts:78-81, 129-132, 179-182, 228-231` · `src/domain/space/account/account.resolver.mutations.ts:119, 325-342, 370-372` · `src/platform/platform-role/platform.role.resolver.mutations.ts:911-918` | untested |
| ENT-15 | A new account (user or organisation) starts with every account entitlement at 0, a baseline plan of all zeros, no plan credential and therefore an empty available list. | registered user, organisation admin | code › `src/domain/space/account.host/account.host.service.ts:69-125, 131-133` · `src/domain/space/account/constants.ts:3-10` · `license-plans.json` (no account plan has assignToNew*) · test › `user-entitlements` › `No licenses assigned`; `organization-entitlements` › `No licenses assigned` | proven |
| ENT-16 | The plan `ACCOUNT_LICENSE_PLUS` grants an account: 3 free spaces, 3 virtual contributors, 1 innovation hub, 3 innovation packs and 10,000,000 AI tokens per month; the available list is exactly those five types. | account holder, PLM | code › `src/migrations/1764590884533-seed.ts:570-577` + AI migration `:50-51` · test › `user-entitlements` › `VC campaign licenses assigned`; `organization-entitlements` › `User admin of Organization with accountLicensesPlus assigned` | proven |
| ENT-17 | Each account carries a baseline plan of six counters (free/plus/premium spaces, VCs, packs, starting pages) that sets the floor for the countable entitlements; credential grants add on top of it. Only the platform licence manager can change it. | PLM | code › `account.service.license.ts:117-161` · `account.resolver.mutations.ts:349-390` · `schema.graphql:1382-1395` | untested |
| ENT-18 | A plan is only accepted on its own family: account plans on accounts, space plans and space feature flags on spaces; a mismatch is refused with "License Plan is not for Spaces/Accounts". | PLM | code › `src/platform-admin/licensing/admin.licensing.service.ts:41-50, 117-126` | untested |
| ENT-19 | An account's `subscriptions` are the licence-plan credentials it holds, each with its expiry (null when permanent). | account holder | code › `src/domain/space/account/account.service.ts:573-600` · test › `user-entitlements` › `VC campaign licenses assigned` (`[{name: ACCOUNT_LICENSE_PLUS, expires: null}]`) | proven |
| ENT-07 | An organisation's account follows the same model as a user's: an organisation admin reads it through the organisation, sees the empty set with no plan, the plus set once `ACCOUNT_LICENSE_PLUS` is assigned, and can create a space, a VC and a pack under it. | organisation admin | test › `organization-entitlements` › all 3 cases | proven |
| ENT-21 | Every new L0 space on a user or organisation account automatically receives the plans `SPACE_LICENSE_FREE`, `SPACE_FEATURE_VIRTUAL_CONTRIBUTORS` and `SPACE_FEATURE_SAVE_AS_TEMPLATE`, so its licence shows free tier, VC access and save-as-template enabled and plus, premium and whiteboard multi-user disabled. | account holder | code › `account.host.service.ts:138-182` · `license-plans.json:13-14, 111-112, 125-126` · test › `user-entitlements` › `User with VC campaign licenses assigned and created Space, VC and Innovation Pack`; `licenses-functional-entitlements` › `Add License Plus to space` (before) | proven |
| ENT-05 | Assigning `SPACE_LICENSE_PLUS` to an L0 space turns on the plus tier and multi-user whiteboards (save-as-template is already on); revoking it returns the space to the free set, with no reset step. The holder reads the space licence from their own account view. | account holder (reads), PLM (assigns/revokes) | code › seed `:544-556` · `src/domain/space/space/space.service.license.ts:126-137, 174-185` · test › `licenses-functional-entitlements` › `Add License Plus to space` | proven |
| ENT-23 | `SPACE_LICENSE_PREMIUM` turns on the premium tier, multi-user whiteboards and save-as-template — the same flags as plus plus the premium tier marker. | PLM | code › seed `:557-569` | untested |
| ENT-24 | `SPACE_LICENSE_ENTERPRISE` exists as a plan (contact support, no price) but grants no entitlement at all. | PLM | code › `license-plans.json:46-58` · `src/common/enums/licensing.credential.based.credential.type.ts:8` | untested (see F4) |
| ENT-25 | A plan with trial enabled (today only `SPACE_LICENSE_PLUS`) is issued with an expiry one month out; the expiry is shown in `subscriptions` but is never evaluated — the grant stays effective after it. | PLM, account holder | code › `src/platform/licensing/credential-based/license-credential-issuer/license.issuer.service.ts:24-36` · `licensing.credential.based.service.ts:57-63` · `src/domain/actor/actor/actor.service.ts:277-290` | untested (see F2) |
| ENT-26 | A space's entitlements are always computed from the credentials of its L0 space; a plan assigned to a subspace is accepted and listed in that subspace's subscriptions but has no effect. | PLM | code › `space.service.license.ts:63, 91-97` · `admin.licensing.service.ts:32-68` · spec › `server/specs/083-collab-entitlement/spec.md:58` | untested (see F3) |
| ENT-27 | Assigning or revoking a plan on an L0 space recomputes the whole tree at once: the space, its role set, its collaboration and every subspace. | PLM | code › `admin.licensing.resolver.mutations.ts:129-132, 228-231` · `space.service.license.ts:78-97` · test › `memo-signing-entitlement` › `granting the memo-signing plan to the L0 space enables it there and on the subspace` | proven |
| ENT-28 | Six free feature-flag plans each turn on exactly one flag on an L0 space: virtual contributors, multi-user whiteboards, multi-user memos, save-as-template, office documents, memo signing. All require contacting support; none is paid. | PLM | code › `license-plans.json:73-156` · seed `:494-535` · office migration `:84-89` · memo-signing migration `:82-87` · spec › `083-collab-entitlement/spec.md:12` | untested (memo signing proven under ENT-06) |
| ENT-29 | A subspace carries the same feature flags as its L0 space; the collaboration of every space copies the five content flags from its space; the space role set copies the VC-access flag. | server | code › `space.service.license.ts:91-97` · `src/domain/collaboration/collaboration/collaboration.service.license.ts:94-105` · `src/domain/access/role-set/role.set.service.license.ts:64-71` · test › `memo-signing-entitlement` › `a new space and its subspace carry the entitlement, disabled` + granting case | proven |
| ENT-06 | A new space and its subspace carry memo signing disabled. Granting `SPACE_FEATURE_MEMO_SIGNING` to the L0 enables it on L0 and subspace; revoking closes it. While closed, preparing a memo for signing is refused with "Entitlement space-flag-memo-signing is not available"; with it open but no linked signing identity, with "Link a Cleverbase identity before signing this memo". The entitlement gate always fires before the identity gate; reads, downloads, signed-copy history and verification stay available. | space admin, space member, subspace admin, PLM | code › `src/domain/common/memo/memo.signing.service.ts:51-53, 154-156, 316-325, 469-477` · `src/domain/space/space/space.service.ts:495-500` · test › `memo-signing-entitlement` › all 5 blocks · spec › server PR #6478 body | proven (the "reads stay available" clause is untested) |
| ENT-30 | A virtual contributor can be given a role in, or invited to, a space only while the space's VC-access flag is enabled; otherwise "Entitlement space-flag-virtual-contributor-access is not available". | space admin / lead | code › `src/domain/access/role-set/role.set.resolver.mutations.ts:660-663` · `role.set.resolver.mutations.membership.ts:489-498` · `license.service.ts:195-206` | untested (covered elsewhere: `contributor-management/virtual-contributor/vc-access.it-spec.ts`) |
| ENT-31 | Multi-user whiteboards and multi-user memos are enabled per collaboration by their flags; standalone or template whiteboards and memos (no collaboration) are never multi-user. | space members | code › `src/domain/common/whiteboard/whiteboard.service.ts:1270-1288` · `src/domain/common/memo/memo.service.ts:495-511` | untested |
| ENT-32 | Introducing an office document (Collabora) callout or contribution — create, move-in, template apply — into a collaboration whose office-documents flag is off is refused with "Office Docs is not enabled for this Collaboration.", for every role including platform admins; the check fails closed, is atomic for multi-callout operations, and for moves looks only at the target collaboration. Existing documents stay. | space members, admins | code › `collaboration.service.license.ts:20-24, 118-219` · spec › `server/specs/002-office-docs-gating/spec.md:64-91` | untested (covered elsewhere: `collabora/*.it-spec.ts`) |
| ENT-33 | The save-as-template flag is computed on spaces and collaborations but nothing on the server refuses an action when it is off. | — | code › grep: no reader of `SPACE_FLAG_SAVE_AS_TEMPLATE` outside the licence services | untested (see F8) |
| ENT-34 | Organisations never have VC access: the organisation role-set flag is hard-coded off, so a VC cannot be given an organisation role. The platform role set is hard-coded on. | organisation admin | code › `src/domain/community/organization/organization.service.license.ts:42-66` · `src/platform/platform/platform.service.license.ts:26-52` | untested |
| ENT-01 | Granting the feature role *VC Campaign* or *Beta Tester* to a user makes the server issue the `ACCOUNT_LICENSE_PLUS` plan credential to the user's account at once, so the account reports the five plus entitlements (ENT-16) and the subscription `ACCOUNT_LICENSE_PLUS`. Both roles give the identical set. | user, platform-roles-admin | code › `platform.role.resolver.mutations.ts:63-75, 183-197, 874-918` · test › `user-entitlements` › `VC campaign licenses assigned`, `Beta tester licenses assigned`; `innovation-packs` / `space` / `vc-functional-entitlements` › table rows | proven |
| ENT-08 | Removing the role revokes the plus credential and the account returns to the empty set — but only when the user holds neither of the two roles. Resources created under the allowance are not touched by the removal. | user, platform-roles-admin | code › `platform.role.resolver.mutations.ts:874-910` · test › `user-entitlements` › `No licenses assigned` (removal then `[]`) | proven for the single-role case; the "neither role" and "resources untouched" clauses are untested |
| ENT-36 | *Feature Virtual Assistant* and *Feature Organization Creator* grant no licence entitlement: the first holds the `ACCESS_VIRTUAL_ASSISTANT` privilege, the second `CREATE_ORGANIZATION` (shared with platform support). | users with those roles | code › `src/platform/platform/platform.service.authorization.ts:243-262, 497-508` · `src/platform/platform-role/verification/privilege.grants.ts:230-236, 250` | untested (covered elsewhere: `platform-roles/rules/feature-roles.it-spec.ts`) |
| ENT-37 | VC Campaign is the only feature role that can be carried by a platform invitation; the others must be granted directly so the assignment rules and audit run. | platform-roles-admin | code › `src/domain/access/invitation.platform/platform.invitation.service.ts:24-38` | untested |
| ENT-02 | Innovation packs per account are capped by the account limit (3 under plus). The fourth creation is refused with "Unable to create account-innovation-pack on account: <id>. Entitlement limit of 3 of type account-innovation-pack reached", and the pack type leaves the available list while the cap is reached. | account holder | code › `account.resolver.mutations.ts:265, 674-725` · test › `innovation-packs-functional-entitlements` › `Create a innovation pack over the license limit` | proven |
| ENT-03 | Free spaces per account are capped (3 under plus); the fourth is refused with the same message shape for `account-space-free`; deleting a space restores the type to the available list. | account holder | code › `account.resolver.mutations.ts:101` · `license.entitlement.usage.service.ts:74-79` · test › `space-functional-entitlements` › `Create a space over the license limit`, `Create a space after third over the license limit was removed` | proven |
| ENT-04 | Virtual contributors per account are capped (3 under plus); the fourth is refused with "Entitlement limit of 3 of type account-virtual-contributor reached". | account holder | code › `account.resolver.mutations.ts:212` · test › `vc-functional-entitlements` › `Create a vc over the license limit` | proven |
| ENT-39 | Innovation hubs per account are capped (1 under plus), but an account admin can never create one: only the platform licence manager or content-full-access may, on any account. | PLM, PCFA | code › `account.resolver.mutations.ts:169` · `src/domain/space/account/account.service.authorization.ts:322-353` · matrix › `access-matrix.md:914-931` | untested |
| ENT-40 | The privilege check comes first: an actor without the create privilege on the account gets an authorization refusal, not a limit refusal. The limit applies to whoever creates on the account, including platform content-full-access. | all | code › `account.resolver.mutations.ts:694-699` | untested |
| ENT-41 | The platform licence manager may exceed any account limit when creating on an account (soft-limit bypass); nobody else can. | PLM | code › `account.resolver.mutations.ts:704-715` · `account.service.authorization.ts:427-432` | untested |
| ENT-43 | A user reads their own account's licence (entitlements with limit, usage, availability; the available list; subscriptions; each space's licence) through `me`. | account holder | code › `src/domain/space/account/account.resolver.fields.ts:59-68, 180-186` · `src/domain/common/license/license.resolver.fields.ts:11-30` · test › every `getMyEntitlementsQuery` case | proven |
| ENT-44 | Any account's licence, limits, usage and subscriptions are readable by anyone who can read the account — which today is every visitor, signed in or not. | anonymous, registered | code › `account.service.authorization.ts:306-310` · `account.resolver.fields.ts:63` · matrix › `access-matrix.md:916-918` | untested (see F5) |
| ENT-45 | A space's licence is readable by anyone who may read the space (members, and the public for public spaces), by the account admin, and by the platform roles the space's platform-roles access lists. | space members, account admin, platform roles | code › `src/domain/space/space/space.resolver.fields.ts:147-156` · `src/domain/space/space/space.service.authorization.ts:208-216, 963-991` | untested |
| ENT-46 | The platform's plan catalogue and the licence policy (credential rules with their granted limits) are readable by every registered user. | registered | code › `src/platform/licensing/credential-based/licensing-framework/licensing.framework.service.authorization.ts:64-69` · `licensing.framework.resolver.fields.ts:15-35` · matrix › `access-matrix.md:682` | untested |
| ENT-47 | Assigning or revoking a plan on a space or an account, and updating an account's baseline plan, is reserved to the platform licence manager; every such action writes a platform audit row. | PLM | code › `admin.licensing.resolver.mutations.ts:66-71, 117-122, 166-171, 216-221` · `licensing.framework.service.authorization.ts:129-142` · `account.resolver.mutations.ts:357-362, 377-386` · matrix › `access-matrix-crosscheck.md:161-165` | untested (covered elsewhere: `platform-roles/_support/groups/a12.ts`) |
| ENT-48 | Defining plans and entitlement mappings — create/update/delete a plan, create/update/delete a policy credential rule — is reserved to the platform settings admin through a resolver-local gate that the root content cascade cannot reach; every action writes a configuration audit row. | PSA | code › `src/common/constants/authorization/license.definition.policy.ts:10-62` · `license.plan.resolver.mutations.ts:62-67, 106-111` · `license.policy.resolver.mutations.ts:49-54, 78-83, 105-110` · `licensing.framework.resolver.mutations.ts:50-55` · matrix › `access-matrix-crosscheck.md:65, 166-171` | untested (covered elsewhere: `platform-roles/_support/groups/a13.ts`) |
| ENT-49 | Recomputing licences for one account or for all accounts is an operations action reserved to the platform operations admin. | POA | code › `admin.licensing.resolver.mutations.ts:251-286` · `account.resolver.mutations.ts:325-342` · `licensing.framework.service.authorization.ts:144-155` · spec › `agents-hq/specs/032-platform-ops-admin-role/spec.md:151` | untested (covered elsewhere: `platform-roles/_support/groups/a3.ts`) |

### B. Rights: evidence

The legend of the former who-may table, kept because the evidence below uses its shorthands:

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `admin.licensing.resolver.mutations.ts:66-71, 117-122, 166-171, 216-221, 257-262`; `licensing.framework.service.authorization.ts:64-69, 115-155`; `license.definition.policy.ts:31-62`; `account.resolver.mutations.ts:325-336, 357-362, 710-715`; `account.service.authorization.ts:306-310, 322-353, 427-432, 479-500`; `account.resolver.fields.ts:59-68`; `space.resolver.fields.ts:147-156`; `space.service.authorization.ts:208-216, 963-991`; `platform.service.authorization.ts:400-404`; access matrix `licensing` (`access-matrix.md:678-699`), `license-policy` (`:703-724`), `account` (`:914-937`), `license` leaf (`:2266-2290`); crosscheck rows A3, A12, A13, F6 (`access-matrix-crosscheck.md:65, 97-101, 161-171`). "–" = not applicable to the role. GLOBAL_ADMIN-style catch-alls are retired (027 Slice B); the legacy entitlement suite assigns plans as the harness admin, whose credential set was not verified here.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. "Finding 2" or "Open question 1" inside a text is F2 or OQ1 here._

#### Findings

- **F1 — Free tier never issued (ENT-13/15).** Code: the policy carries an `account-license-free` rule (1 free space, 1,000,000 AI tokens) but no plan issues that credential and the credential enum omits it — a plain account has zero of everything. Test: `No licenses assigned` cases pin `availableEntitlements: []`, enshrining it. Spec: 004 FR-027 expects a free-tier budget "or the configured platform default"; the AI migration records a signed-off 1M free allowance. Ruling: is a plan-less account meant to be able to create nothing, and where does the free AI budget come from? **Product, 2026-11-20 (amended 2026-11-25):** stays as today; the free tier is for the pricing discussion with Neil, not taken forward now (same as web-assistant F4b).
- **F2 — Trial expiry is decorative (ENT-25).** Code: `SPACE_LICENSE_PLUS` is issued with `expires = +1 month`, but the engine matches credential types only and nothing prunes or filters expired credentials. Test: none. Spec: none. Ruling: defect to fix, or trial expiry is handled by a human revoke? **Product, 2026-11-20 (amended 2026-11-25):** stays as today; a trial stopping on its end date is a wish, after trials are reviewed as a whole.
- **F3 — Subspace plan assignment silently inert (ENT-26).** Code: no L0 check on `assignLicensePlanToSpace`; entitlements are computed from the L0 agent. Test: none. Spec 083: L0-only, enforced by the client's License Issuer. Ruling: server must refuse non-L0 targets, or document the client as the gate.
- **F4 — `SPACE_LICENSE_ENTERPRISE` grants nothing (ENT-24).** Code: plan exists, no rule, enum comment "todo: remove". Test/spec: none. Ruling: remove or define. **Product, 2026-11-20:** stays as today; no wish.
- **F5 — Any visitor can read any account's licence, limits, usage and subscriptions (ENT-44).** Code: account policy grants READ to anonymous + registered with a TODO. Test: only own-account reads. Spec: none. Ruling: privacy — should another account's plan and usage be visible? **Product, 2026-11-20 (amended 2026-11-25):** stays as today; restricting it to the account admin and owner, Platform License Manager and Platform Resource Admin is a priority security/privacy wish; Platform Support is for discussion with Neil.
- **F6 — Hub entitlement available but unusable by its holder (ENT-16/39).** Code: plus grants 1 hub; the account admin never holds `CREATE_INNOVATION_HUB`. Test: asserts the hub type is in the available list; never creates one. Spec 027 QA C1-12: hubs platform-curated. Old ENT-01 implied the user could create a hub. Ruling: accepted; the knowledge row now says so — but the client should not offer a "create hub" button on the strength of `availableEntitlements`. **Product, 2026-11-20:** accepted; hubs stay platform-curated.
- **F7 — Limit error text embeds the account id (ENT-02/03/04).** Code: `account.resolver.mutations.ts:721` contradicts the repo rule against dynamic data in exception messages. Test: three cases pin the exact string with the id. Ruling: when the message is cleaned, rebaseline the three cases; do not treat the red as a behaviour change.
- **F8 — Save-as-template flag is never enforced (ENT-33).** Code: computed on space + collaboration, no reader. Test/spec: none. Ruling: dead flag or missing gate? **Product, 2026-11-20:** stays as today: the flag gates nothing; no wish.
- **F9 — Create-time defaults differ between space and collaboration (three flags `enabled:true/limit:0` on the space, `false` on the collaboration).** Harmless today because `createSpace` recomputes at once; spec 083 documents gating on `limit`. Ruling: single default in the new core.
- **F10 — FLAG rules ignore their `limit`; account rules sum it; only the first matching rule counts.** Code: `space.service.license.ts:120-123` vs `account.service.license.ts:112`; `licensing.credential.based.service.ts:86-99`. Latent until a second account plan exists. Ruling: define `limit` semantics for the new core.
- **F11 — Stale comment vs signed-off numbers.** `license.entitlement.type.ts:19-23` says the AI-token values are placeholders; the migration says signed off 2026-06-17. Ruling: trust the migration; fix the comment.
- **F12 — Invitation path for VC Campaign unverified (ENT-37).** Code read only covers the direct `assignPlatformRoleToUser` sync; whether accepting a platform invitation carrying `feature-vc-campaign` also issues the plus credential was not confirmed. Ruling: verify live, then mark ENT-01 for the invitation path.
- **F13 — Organisation VC access hard-off "for now" (ENT-34).** No product statement. Ruling: are VCs ever organisation members? **Product, 2026-11-20:** stays as today: virtual contributors are not organisation members.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Which credential lets the harness assign plans.** The legacy cases assign plans as the `GLOBAL_ADMIN` persona and are green, but the gate is platform-license-manager only (ENT-47). Either the persona holds that role on the test stack or the gate is not what the code says. Check the persona's roles on the test cluster.
- **OQ2 — Other grant paths for the plus credential.** Only the direct `assignPlatformRoleToUser` path was read (ENT-01). Whether granting a feature role to an organisation, or accepting a platform invitation that carries VC Campaign (ENT-37), also issues `ACCOUNT_LICENSE_PLUS` is unread — see finding 12.
- **OQ3 — Is the order of `availableEntitlements` a contract?** The tests sort before comparing; the code gives no ordering guarantee. Decide whether the new core must preserve an order.
- **OQ4 — Live confirmation of finding 2.** That an expired plus trial keeps granting is a code reading; nobody has watched a trial cross its expiry on a running stack.

### D. Test gaps

_For the Quality Lead: row GAPS in section 3._

Untested rules by id: ENT-09, ENT-12, ENT-14, ENT-17, ENT-18, ENT-23, ENT-24, ENT-25, ENT-26, ENT-28 (five of six flags), ENT-30, ENT-31, ENT-32, ENT-33, ENT-34, ENT-36, ENT-37, ENT-39, ENT-40, ENT-41, ENT-44, ENT-45, ENT-46, ENT-47, ENT-48, ENT-49; plus the untested clauses of ENT-06 (reads/downloads/verify stay available), ENT-08 (both roles held; resources untouched) and ENT-13 (free tier).

Behaviours the area has that neither reading nor tests pinned down:
- What happens to spaces, VCs and packs already created when `ACCOUNT_LICENSE_PLUS` is revoked (count above limit: read-only? archived? just no new creations?). Code only refuses new creations; nothing touches existing resources.
- What a space loses when `SPACE_LICENSE_PLUS` is revoked while multi-user whiteboards are in use (session behaviour).
- Plan assignment by a non-PLM actor being refused (the gate exists; only the platform-roles suite covers it).
- The account-plan / space-plan family mismatch refusal (ENT-18).
- A second account plan (premium) — none exists; summing across credentials is unexercised.
- Baseline plan raise/lower and its interaction with a plan credential on the same account.
- `licenseResetOnAccount` / `resetLicenseOnAccounts` leaving state unchanged (idempotence).
- Organisation-hosted spaces inheriting anything from the organisation's account plan (they do not — the space's own L0 credentials decide; still worth one case).
- The L1→L0 conversion path (`journey/conversion/convert-L1-to-L0-basic.it-spec.ts` touches it) — which plans a converted space receives.
- Audit rows for assign/revoke/baseline/definition actions.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits and access rules. The "product must rule?" column was ticked by Product, 2026-11-20 (CONST): "yes" rows wait for a product ruling before the rebuild._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Entitlement types (16) | `ACCOUNT_SPACE_FREE`, `ACCOUNT_SPACE_PLUS`, `ACCOUNT_SPACE_PREMIUM`, `ACCOUNT_VIRTUAL_CONTRIBUTOR`, `ACCOUNT_INNOVATION_PACK`, `ACCOUNT_INNOVATION_HUB`, `ACCOUNT_AI_ASSISTANT_TOKENS_MONTH` (LIMIT, account); `SPACE_FREE`, `SPACE_PLUS`, `SPACE_PREMIUM`, `SPACE_FLAG_SAVE_AS_TEMPLATE`, `SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS`, `SPACE_FLAG_WHITEBOARD_MULTI_USER`, `SPACE_FLAG_MEMO_MULTI_USER`, `SPACE_FLAG_OFFICE_DOCUMENTS`, `SPACE_FLAG_MEMO_SIGNING` (FLAG, space / collaboration / role-set) | `license.entitlement.type.ts:3-25`; `schema.graphql:520-537` | no | Technical Lead |
| Wire values | lower-kebab of the names, e.g. `account-space-free`, `space-flag-memo-signing` (used in error texts) | `license.entitlement.type.ts` | no | Technical Lead |
| Data types | `LIMIT`, `FLAG` | `license.entitlement.data.type.ts:3-6` | no | Technical Lead |
| Licence types | `ACCOUNT`, `COLLABORATION`, `ROLESET`, `SPACE`, `TEMPLATE_CONTENT_SPACE`, `WHITEBOARD` | `schema.graphql:539-546` | no | Technical Lead |
| Plan types | `ACCOUNT_FEATURE_FLAG` (no plan), `ACCOUNT_PLAN`, `SPACE_PLAN`, `SPACE_FEATURE_FLAG` | `licensing.credential.based.plan.type.ts:3-8` | no | Technical Lead |
| Plan names (11) | `SPACE_LICENSE_FREE`, `SPACE_LICENSE_PLUS`, `SPACE_LICENSE_PREMIUM`, `SPACE_LICENSE_ENTERPRISE`, `ACCOUNT_LICENSE_PLUS`, `SPACE_FEATURE_WHITEBOARD_MULTI_USER`, `SPACE_FEATURE_MEMO_MULTI_USER`, `SPACE_FEATURE_VIRTUAL_CONTRIBUTORS`, `SPACE_FEATURE_SAVE_AS_TEMPLATE`, `SPACE_FEATURE_OFFICE_DOCUMENTS`, `SPACE_FEATURE_MEMO_SIGNING` | `license-plans.json` | yes | Product Lead |
| Plan credentials (11 in enum) | `space-license-free`, `space-license-plus`, `space-license-premium`, `space-license-enterprise`, `space-feature-save-as-template`, `space-feature-virtual-contributors`, `space-feature-whiteboard-multi-user`, `space-feature-memo-multi-user`, `space-feature-office-documents`, `space-feature-memo-signing`, `account-license-plus` (+ `account-license-free`, `account-license-premium` present only in policy rules / migration) | `licensing.credential.based.credential.type.ts:4-16`; seed `:493-577` | no (F-1) | Technical Lead |
| Plan prices / flags | FREE 0.00 free; PLUS 249.00 trial; PREMIUM 749.00 contact support; ENTERPRISE null contact support; ACCOUNT_PLUS 0.00 contact support; all six feature plans 0.00, isFree, contact support | `license-plans.json` | yes | Product Lead |
| Auto-assigned to new L0 spaces | `SPACE_LICENSE_FREE`, `SPACE_FEATURE_VIRTUAL_CONTRIBUTORS`, `SPACE_FEATURE_SAVE_AS_TEMPLATE` (user and organisation accounts alike) | `license-plans.json:13-14, 111-112, 125-126`; `account.host.service.ts:145-160` | yes | Product Lead |
| Trial length | 1 month (calendar) from assignment, only when `trialEnabled` | `license.issuer.service.ts:24-36` | yes (F-2) | Product Lead |
| `ACCOUNT_LICENSE_PLUS` limits | free spaces 3, VCs 3, hubs 1, packs 3, AI tokens 10,000,000 | seed `:570-577`; AI migration `:50-51` | yes | Product Lead |
| `account-license-free` rule (orphan) | free spaces 1, AI tokens 1,000,000 | seed; AI migration `:45, 50` | yes (F-1) | Product Lead |
| `account-license-premium` | AI tokens 50,000,000 recorded, tier not created | AI migration `:44-53` | yes | Product Lead |
| Space-plan grants | FREE → SPACE_FREE; PLUS → SPACE_PLUS + WHITEBOARD_MULTI_USER + SAVE_AS_TEMPLATE; PREMIUM → SPACE_PREMIUM + same two; ENTERPRISE → none | seed `:536-569` | yes (F-4) | Product Lead |
| Feature-flag plan grants | one flag each, limit 1 | seed `:494-535`; migrations | yes | Product Lead |
| Space tier priority for usage | premium > plus > free | `license.entitlement.usage.service.ts:18-22` | yes | Product Lead |
| Default baseline plan | all six counters 0 | `constants.ts:3-10` | yes | Product Lead |
| Organisation role-set VC access | hard-coded off; platform role-set hard-coded on, limit 999 | `organization.service.license.ts:54-66`; `platform.service.license.ts:38-52` | yes | Product Lead |
| Feature roles | `feature-beta-tester`, `feature-virtual-assistant`, `feature-organization-creator`, `feature-vc-campaign`; plus-granting pair = beta-tester + vc-campaign; invitation-carriable = vc-campaign | `platform.roles.access.service.ts:58-63`; `platform.role.resolver.mutations.ts:73-75`; `platform.invitation.service.ts:38` | yes | Product Lead |
| Licensing roles | `platform-license-manager` (usage, bypass, hubs, console lists), `platform-settings-admin` (definition), `platform-operations-admin` (reset), `platform-content-full-access` (create on any account) | `account.service.authorization.ts`; `licensing.framework.service.authorization.ts`; `license.definition.policy.ts` | no | Security Lead |
| Error text — limit reached | `Unable to create <wire-type> on account: <accountId>. Entitlement limit of <limit> of type <wire-type> reached` | `account.resolver.mutations.ts:721` | no (F-7) | Technical Lead |
| Error text — flag off | `Entitlement <wire-type> is not available for License: <licenseId>` | `license.service.ts:202` | no | Technical Lead |
| Error text — memo identity | `Link a Cleverbase identity before signing this memo` | `memo.signing.service.ts:475` | no | Technical Lead |
| Error text — office docs | `Office Docs is not enabled for this Collaboration.` | `collaboration.service.license.ts:20-21` | no | Technical Lead |
| Error text — wrong plan family | `License Plan is not for Spaces: <type>` / `License Plan is not for Accounts: <type>` | `admin.licensing.service.ts:46-49, 122-125` | no | Technical Lead |
| Error text — invitation role | `Unable to create invitation for platform role: <role>, not in allowed invitation roles: feature-vc-campaign` | `platform.invitation.service.ts:55-58` | no | Technical Lead |
| GraphQL surface | `Account.license`, `Account.baselineLicensePlan`, `Account.subscriptions`, `Space.license`, `Collaboration.license`, `RoleSet.license`, `Platform.licensingFramework{plans, policy}`, `License{entitlements, availableEntitlements}`, `LicenseEntitlement{dataType, enabled, limit, usage, isAvailable}`, `LicensePlan{…}`, `LicensePolicy.credentialRules`, mutations `assignLicensePlanToAccount/ToSpace`, `revokeLicensePlanFromAccount/FromSpace`, `updateBaselineLicensePlanOnAccount`, `licenseResetOnAccount`, `resetLicenseOnAccounts`, `createLicensePlan`, `updateLicensePlan`, `deleteLicensePlan`, `adminLicensePolicy{Create,Update,Delete}CredentialRule` | `schema.graphql:1276-1395, 2614-2628, 4179-4293, 4883-4888, 4933-4936, 5013-5014, 5085-5086, 5272-5278, 5340, 5403-5404, 5745-5746, 6697-6698, 7128-7129` | no | Technical Lead |

### F. Where this lands in the new core

`license_plan`, `plan_entitlement`, `plan_assignment`, resolved at read time; no per-entity licence cache and no reset mutations. Platform feature roles become credentials scoped by target type. Every rule above stays valid as a behaviour; what changes is that ENT-05/06/27 no longer need a reset step (today they already recompute inline, but through a stored snapshot — ENT-14), and that the entitlement read moves from the account query to the `viewer` slice. Three facts found here should shape the model: (1) the plus-granting feature roles are not policy rules but a credential issued on role change (ENT-01/08) — in the new core they should become ordinary plan assignments with a role-derived source; (2) space flags are evaluated from the L0 agent only, so `plan_assignment.target` must be constrained to L0 (ENT-26, F-3); (3) trial expiry must be part of the read-time resolution (ENT-25, F-2). Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/entitlements/`, 7 files, 16 cases = 20 test blocks); the specs, issues and docs listed in § Sources. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. Supersedes the 2026-10-27 template.

2026-11-19 converted to the three-section layout. The status legend and the review-load line of the old header were dropped; the counts line at the top replaces them.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. Restating whys with no source were dropped where a sourced one remains on the row. The description of server PR #4593, which introduced licences, gives the design reasons behind ENT-10, ENT-11, ENT-14 and ENT-40 and suggests answers to Q-ENT-14 and Q-ENT-40; spec 002 FR-007 and FR-009 source ENT-32.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/common/enums/license.entitlement.type.ts`, `license.entitlement.data.type.ts`, `licensing.credential.based.credential.type.ts`, `licensing.credential.based.plan.type.ts`, `authorization.credential.global.ts`
- `src/core/bootstrap/platform-template-definitions/license-plan/license-plans.json`; `src/core/bootstrap/bootstrap.service.ts`
- `src/migrations/1764590884533-seed.ts`, `1776692645254-AddOfficeDocumentsEntitlement.ts`, `1780700000000-AddAiAssistantTokensEntitlement.ts`, `1788947200000-AddMemoSigningEntitlement.ts`
- `src/platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.service.ts`, `…/license-credential-issuer/license.issuer.service.ts`, `…/licensing-framework/licensing.framework.service.authorization.ts`, `licensing.framework.resolver.fields.ts`, `licensing.framework.resolver.mutations.ts`, `…/license-plan/license.plan.resolver.mutations.ts`, `…/license-policy/license.policy.resolver.mutations.ts`, `license.policy.service.authorization.ts`
- `src/platform-admin/licensing/admin.licensing.resolver.mutations.ts`, `admin.licensing.service.ts`
- `src/common/constants/authorization/license.definition.policy.ts`
- `src/domain/space/account/account.service.license.ts`, `account.resolver.mutations.ts`, `account.resolver.fields.ts`, `account.service.authorization.ts`, `account.service.ts`, `constants.ts`; `src/domain/space/account.host/account.host.service.ts`; `src/domain/space/account.license.plan/*`
- `src/domain/space/space/space.service.license.ts`, `space.service.ts`, `space.resolver.fields.ts`, `space.service.authorization.ts`
- `src/domain/access/role-set/role.set.service.license.ts`, `role.set.service.ts`, `role.set.resolver.mutations.ts`, `role.set.resolver.mutations.membership.ts`
- `src/domain/collaboration/collaboration/collaboration.service.license.ts`, `collaboration.service.ts`
- `src/domain/community/organization/organization.service.license.ts`; `src/platform/platform/platform.service.license.ts`, `platform.service.authorization.ts`, `platform.resolver.fields.ts`
- `src/domain/common/license/license.service.ts`, `license.resolver.fields.ts`; `src/domain/common/license-entitlement/license.entitlement.service.ts`, `license.entitlement.entity.ts`, `license.entitlement.resolver.fields.ts`; `src/services/infrastructure/license-entitlement-usage/license.entitlement.usage.service.ts`
- `src/domain/common/memo/memo.signing.service.ts`, `memo.service.ts`; `src/domain/common/whiteboard/whiteboard.service.ts`
- `src/domain/access/platform-roles-access/platform.roles.access.service.ts`; `src/domain/access/invitation.platform/platform.invitation.service.ts`; `src/platform/platform-role/platform.role.resolver.mutations.ts`; `src/platform/platform-role/verification/privilege.grants.ts`
- `src/domain/actor/actor/actor.service.ts`; `src/domain/actor/credential/credential.resolver.fields.ts`
- `schema.graphql`
- `CLAUDE.md` (exception and platform-audit rules); `docs/credential-based-authorization.md`; `docs/authorization-forest.md`; `docs/evidence/027-platform-role-redesign.md`
- git: `c3a8314c5` (#4593), `b78193419` (#5967), `09a16f484` (#6140), `4d074eb72` (#6478)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/entitlements/innovation-packs-functional-entitlements.it-spec.ts`, `licenses-functional-entitlements.it-spec.ts`, `memo-signing-entitlement.it-spec.ts`, `organization-entitlements.it-spec.ts`, `space-functional-entitlements.it-spec.ts`, `user-entitlements.it-spec.ts`, `vc-functional-entitlements.it-spec.ts`, `entitlements-data.ts`, `organization-entitlements-data.ts`, `entitlements-request.params.ts`
- `docs/qa/server-rebuild/knowledge/entitlements.md` (superseded template), `access-matrix.md` (§ licensing, license-policy, account, license), `access-matrix-crosscheck.md` (A3, A12, A13, F6)
- Other suites touching the area (list only): see dossier § 7

Specs / issues:
- `agents-hq/specs/004-web-ai-assistant/spec.md` (FR-027, SC-011)
- `agents-hq/specs/032-platform-ops-admin-role/spec.md` (FR-002, FR-015)
- `agents-hq/worktrees/qa-pr-challenge/specs/027-platform-role-redesign/spec.md` (role model rows 4, 8, 11, 14; A6, A12, A13) and `licensing-section-design.md`
- server `specs/083-collab-entitlement/spec.md`; server `specs/002-office-docs-gating/spec.md`
- alkem-io/server PR #6478 "feat(signing): gate memo signing by space entitlement" (relates to alkem-io/alkemio#2025)
- server `specs/016-memo-collection-contribution`, `021-toggle-whiteboard-guest`, `022/023-guest-contributions*`: checked, not licence-related
- 2026-11-20 whys pass: alkem-io/server PR #4593 description ("Entitlements + license services": design choice and rationale); server `specs/002-office-docs-gating/spec.md` FR-007, FR-009
