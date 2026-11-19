# Platform root: behaviour rules

_What the platform does today at its root: the service versions, the latest release post, the platform settings, the well-known virtual contributors, the platform authorization reset, the forum root, and the containment of a leaked MCP API key: what it does, why, who may, and what is still to answer. The file follows the three-section layout of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**. The forum's own rules are in `communications.md`, the public configuration in `configuration.md`, and licensing in `entitlements.md`. The full life cycle of MCP API keys is not covered here, only the seven containment cases._

_Open questions per owner: Product Lead 1 · Technical Lead 11 · Quality Lead 5 · Security Lead 2 · Service Operations Lead 2. By state: 17 open · 4 with a suggested answer. Proof of the 22 rules: 5 proven by a test · 17 untested (Appendix A)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason, when there is one. "—" means no source states one. The whys are the reasons found in the code, the tests and the specs, sorted into the three columns without rewording. Product has not reviewed this file yet and fills in the user stories later.
- **Decided by** names the source of the decision: a spec, a commit or pull request, an issue or a document. "Code comment (no spec)" means only a comment in the code gives the reason. "Not decided" means the behaviour exists in the code and nobody chose it.
- A marker in bold at the end of a rule points at section 3: **(open: F8)** means a question on this rule is still open, **(defect: F5)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### The platform root

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PLT-01 | The platform's root information answers every caller, signed in or not. Only the list of well-known virtual contributors is refused to a visitor. The configuration, service versions, latest release post, settings (with the notification e-mail blacklist), innovation hub and assistant access go to anyone. **(open: F1, F2)** | — | — | The root is the entry point for the public document (CFG-01) and the forum; nothing in the sources says the settings were meant to be public (F-1). | Not decided: exists in the code |
| PLT-02 | The platform lists its running services with their versions. Today that is one entry: the server and its version. **(open: Q-PLT-02)** | — | — | — | Not decided: exists in the code |
| PLT-03 | The platform names the newest forum post in the Releases category, or nothing when there is none. It does not check whether the caller may read that post. **(open: F8)** | The client links the latest release notes from the forum (PR #3744; the `forumreleases` location points at the same place). | — | — | Server PR #3744 |
| PLT-04 | The platform tells the web app whether the user may use the AI assistant: yes only for holders of the Feature Virtual Assistant role, no for everyone else, never an error. The app can then hide the assistant from everyone else. | Access to the web AI assistant is a privilege, separate from the token budget (004 FR-027). | — | The sole holder is the feature role after 027 closed the legacy credentials (T076/T077). | Spec 004 FR-027; spec 027 T076/T077 |
| PLT-05 | The list of well-known virtual contributors (which virtual contributor plays a named role, such as chat guidance) can be read by every signed-in user and is refused to a visitor. | — | — | — (the read is gated by the interactive-guidance privilege, which every registered user holds; no source says why anonymous is excluded). | Not decided: exists in the code |
| PLT-06 | Only the Platform Settings Admin sets which virtual contributor plays a well-known role. Any id is accepted without checking that such a virtual contributor exists, and the change is audited. **(open: F4, OQ4)** | Definition-type setting owned by the settings-admin family (027 A10/T045). | — | The in-memory pin keeps content-full-access's root CRUD out of it (sec-server-23; crosscheck F6). | Spec 027 A10/T045 |
| PLT-07 | On an innovation hub's own web address the platform answers that hub; on the main address it answers none. A hub asked for by name or id is looked up, and the request fails if it does not exist. **(open: Q-PLT-07, OQ6)** | — | — | — | Not decided: exists in the code |
| PLT-08 | The platform publishes the list of names a space may never take: its own page addresses and reserved words. Anyone can read it. | — | — | Existing client routes and reserved paths must not be shadowed by a space URL (`restricted.space.names.ts` comments). | Code comment (no spec) |

### Platform settings

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PLT-10 | The platform has one settings object with two lists: the web addresses allowed in embedded frames, and the notification e-mail blacklist. Both always exist; a missing blacklist reads as empty. **(open: F1)** | — | — | 019 FR-001/FR-005: the blacklist follows the structural conventions of the allow-list and is published so downstream services can fetch it. | Server spec 019 FR-001/FR-005 |
| PLT-11 | Only the Platform Settings Admin may change the settings. Every successful change is recorded in the audit trail with the setting and the value added or removed. **(open: OQ4)** | One owning family for platform settings (027 A10, T045 consolidated five surfaces onto one privilege; T058 single-path audit). | — | — | Spec 027 A10, T045, T058 |
| PLT-12 | Adding an embed address that is already listed changes nothing, and removing one that is not listed succeeds without change. A bulk update replaces the list it carries and leaves the other one as it was. **(open: Q-PLT-12)** | — | — | — | Not decided: exists in the code |
| PLT-13 | A blacklist entry must be a complete e-mail address. Wildcards and duplicates are refused, the address is stored in lower case, the list holds at most 250 entries, and removing an address that is not listed is refused. **(defect in part: F5)** | 019 FR-003/FR-004/FR-006 and the clarifications (canonical lower-case, 250 to cover large deployments while staying reviewable). | — | — | Server spec 019 FR-003/FR-004/FR-006 |
| PLT-14 | The server itself never uses either list. The blacklist is published for the notifications service to filter recipients, and the embed list for the web app to follow. **(open: F3, OQ2, Q-PLT-14)** | — | — | 019 assumption: "Downstream notification microservices pull the blacklist before filtering recipients; this feature does not implement the suppression itself." | Server spec 019 (an assumption, not a requirement) |

### Operations and platform roles

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PLT-20 | Resetting the platform's authorization recomputes the access rules of the platform and everything directly under it in one action. Only the Platform Operations Admin may do it, and it is audited whether it succeeds or fails. **(open: OQ4)** | Authorization reset is an operational/maintenance action of the operations role (032 FR-002/FR-015); the reset must leave the role's own grants unchanged (032 edge case). | — | — | Spec 032 FR-002/FR-015 |
| PLT-21 | Only one platform role has broad rights: Platform Content Full Access may create, read, edit and delete across the whole platform. Nothing passes down the right to assign roles. Every other platform capability is a separate right held by its own role family. | — | — | 027 Slice B (T072/T076): the root god-mode rule and the support subtree cascade are gone; every surface names its own family's privilege. | Spec 027 Slice B (T072/T076) |

### Forum

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PLT-25 | Anyone can read the platform forum. Any signed-in user can start a discussion or take part. Only Platform Support posts in, or moves a post into, Releases and Newsletter, or retires a category. Categories show in one fixed order, and an unknown stored value is dropped instead of breaking the forum. **(open: F9)** | Releases and Newsletter are the platform's editorial voice and outbound channel (`forum.category.allowed.ts:5-9`). | — | The category vocabulary is permanent tombstones so old posts never break serialisation (`forum.discussion.category.ts` header); forum manage is Support's named privilege after the subtree cascade was deleted (027 A15). | Spec 027 A15; see `communications.md` |

### MCP API keys: containing a leaked key

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PLT-30 | Someone whose only credential is an MCP API key cannot use the main API at all: creating another key, listing keys and revoking a key are all refused, and the refused revoke leaves the key active. | Contain a leaked key: it must not mint replacements or reach the management surface (038 US3, FR-015). | — | — | Spec 038 US3, FR-015 |
| PLT-31 | The former web addresses for creating, listing and deleting MCP keys no longer exist. | 038 FR-016: the live key-chaining route had to go, not be guarded. | — | — | Spec 038 FR-016 |
| PLT-32 | A platform administrator can list a named user's keys and sees what the user sees (name, status, dates, last use), never the value of a key. A user with no keys gives an empty list. **(open: F7)** | 038 FR-017/FR-018: support and offboarding need to see and act on a user's keys. | As a platform administrator, I want to see and revoke a named user's keys during a support or offboarding case, so that a leaked key can be contained (038 US3). | The projection is an allow-list so a value can never leak; keys of system actors are structurally unreachable (the `userId IS NOT NULL` predicate, unit-tested in the server). | Spec 038 US3, FR-017/FR-018 |
| PLT-33 | A platform administrator can revoke any key of a named user. The key stops working at once, the owner still sees it in their list as revoked, and revoking a key that does not exist for that user is refused as not found. **(open: F7)** | 038 FR-017/FR-021: revocation must end the compromise immediately and be attributable to the administrator. | As a platform administrator, I want to see and revoke a named user's keys during a support or offboarding case, so that a leaked key can be contained (038 US3). | — | Spec 038 US3, FR-017/FR-021 |
| PLT-34 | A user without the administrative right cannot reach another user's keys: the administrative list is refused, and an attempt to revoke another user's key is answered "not found" while the key stays active. | 038 FR-019; answering not-found rather than forbidden keeps key ids from being an oracle. | — | — | Spec 038 FR-019 |
| PLT-35 | The administrative key actions are for the Platform Users Admin, the same role family that handles identity resets, not for platform admins in general. **(open: OQ3)** | — | — | 027 A5 (code comment); 038 FR-020 keeps the surface programmatic. | Spec 027 A5; spec 038 FR-020 |

Numbering note: PLT-09, PLT-15…19, PLT-22…24 and PLT-26…29 are intentionally unused (reserved for the sub-topics above).

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W13 are new: the former who-may table had none. That table also had columns for the Platform License Manager, account admin or owner, space admin and space member; on every row they read the same as "Registered user", so they are folded into that column. No cell changed meaning, and nobody outside QA has confirmed the cells yet. Evidence is in Appendix B. Reading the licence plan catalogue and policy (ENT-46), defining plans (ENT-48) and the licence reset (ENT-49) are in `entitlements.md`._

### Reading the platform root

| ID | Action | Platform admin roles | Registered user | Visitor |
|---|---|---|---|---|
| W1 | Read the configuration, service versions, latest release post, innovation hub and restricted space names | Y | Y | Y |
| W2 | Read the platform settings (embed allow-list, e-mail blacklist) | Y | Y | Y¹ |
| W3 | Read the well-known virtual contributors | Y | Y | N |
| W4 | Be told "yes" for assistant access | N² | N² | N³ |

¹ Whether a visitor should read the settings is question F1. ² Only a holder of the Feature Virtual Assistant role is told yes. ³ Is told no, without an error.

### Settings and operations

| ID | Action | Platform admin roles | Registered user | Visitor |
|---|---|---|---|---|
| W5 | Change the settings; add or remove an embed address or a blacklist e-mail | Y⁴ | N | N |
| W6 | Set a well-known virtual contributor | Y⁵ | N | N |
| W7 | Reset the platform authorization | Y⁶ | N | N |

⁴ Platform Settings Admin only; Platform Content Full Access, the Platform Operations Admin, Platform Support, the Platform Users Admin and the roles admin are refused. ⁵ Platform Settings Admin only. ⁶ Platform Operations Admin only.

### Forum

| ID | Action | Platform admin roles | Registered user | Visitor |
|---|---|---|---|---|
| W8 | Read the platform forum and its discussions | Y | Y | Y |
| W9 | Open a forum discussion or contribute | Y | Y | N |
| W10 | Post into or move a post into Releases or Newsletter; retire a category | Y⁷ | N | N |

⁷ Platform Support only.

### MCP API keys

| ID | Action | Platform admin roles | Registered user | Visitor |
|---|---|---|---|---|
| W11 | Create, list and revoke their own keys | Y | Y | N |
| W12 | List or revoke a named user's keys | Y⁸ | N | N |
| W13 | Use an MCP key as a credential for the main API | N | N | N |

⁸ Platform Users Admin only.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). Ids: F is a finding, OQ an open question, Q-… a question on one rule, GAPS the test gaps, CONST the constants. The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 17 of the 21 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on before the rebuild? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their role) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 11 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Root | tidy-up | The platform's role set is served without an access check; a note in the code says to add one. Harmless today because its own fields are guarded. Add the check, or document the field as open? | Technical Lead | — | open |
| F3 | Settings | check | Nothing in the server reads the e-mail blacklist or the embed allow-list, and no test proves that a blacklisted address gets no e-mail. Does the notifications service really read the blacklist? Otherwise the setting does nothing. | Technical Lead (Quality Lead confirms a case exists) | Route to the notifications file: confirm that the notifications service reads the blacklist and that a case proves it. | suggested |
| F4 | Root | decision | A well-known role can be pointed at any id, also one that is no virtual contributor; the guidance chat would then point at nothing. Check that the id is a virtual contributor, or accept the rule as it is? | Technical Lead | — | open |
| F5 | Settings | defect | The four blacklist refusals are plain errors: the web app gets an unspecified error and, outside production, a stack trace. Spec 019 asks for a clear validation error. | Technical Lead (Security Lead owns server#6663) | Make them validation errors. The stack trace part belongs to server#6663, never a new issue. | suggested |
| F8 | Root | decision | The latest release post is named to anyone without checking who may read it. Nothing leaks today because the forum is public. Accept it, or make it follow the post's access rules so a future private forum does not surprise? | Technical Lead | — | open |
| F9 | Forum | tidy-up | The forum's access rules set a cascade flag on the wrong rule. The discussion tests are green, so nothing seems to depend on it. | Technical Lead | Route to `communications.md`, which owns the forum (its F14 is the same point). | suggested |
| OQ2 | Settings | check | Does the notifications service read the blacklist? It is outside the server; spec 019 assumes it. (Same check as F3.) | Technical Lead | — | open |
| Q-PLT-02 | Root | decision | Why does this rule exist? No source states the reason. The platform publishes its service versions to anyone. | Technical Lead | — | open |
| Q-PLT-07 | Root | decision | Why does this rule exist? No source states the reason. The platform picks the innovation hub from the web address the request came in on. | Technical Lead | — | open |
| Q-PLT-12 | Settings | decision | Why does this rule exist? No source states the reason. Adding a listed embed address and removing an unlisted one both succeed without change (the e-mail blacklist refuses both). | Technical Lead | — | open |
| Q-PLT-14 | Settings | decision | Why does this rule exist? No source states the reason. The server keeps two lists it never uses itself; the spec only assumes that other services read them. | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 17 of the 21 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on before the rebuild? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their role) | — | open |
| F1 | Settings | risk | Anyone, also a visitor, can read the platform settings, including the notification e-mail blacklist: a list of real e-mail addresses. Restrict it to the Platform Settings Admin (or at least to signed-in users), or confirm it is public by design? | Security Lead (DPO Lead consulted; Technical Lead adds the check) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 5 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | MCP API keys | tidy-up | The `platform/` test folder holds only the seven MCP key cases. No rule about the platform root has a case there; those live under `platform-roles/` and `communications/`. | Quality Lead | When the areas are re-cut, move the seven cases to an MCP area and let the gaps of this file become the platform backlog. | suggested |
| F7 | MCP API keys | test | Two acceptance clauses of spec 038 are not asserted: that the record shows an administrator revoked the key, and that a system actor's key cannot be reached. Accept the server unit test for the second and add an audit read-back for the first, or mark both as known gaps? | Quality Lead | — | open |
| OQ1 | MCP API keys | test | Nothing in the `platform/` test folder runs nightly. The five proven rules mean "green when last run". When was that, against which server, and does the folder join the nightly? | Quality Lead | — | open |
| OQ3 | MCP API keys | check | Which credentials does the harness admin hold? The administrative key cases pass as that persona, so it must hold Platform Users Admin (PLT-35). | Quality Lead | — | open |
| GAPS | All | test | 12 rules have no test in this folder (8 of them are covered by suites elsewhere), 2 more have unasserted clauses and 9 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Settings | check | Nothing in the server reads the e-mail blacklist or the embed allow-list, and no test proves that a blacklisted address gets no e-mail. Does the notifications service really read the blacklist? Otherwise the setting does nothing. | Technical Lead (Quality Lead confirms a case exists) | Route to the notifications file: confirm that the notifications service reads the blacklist and that a case proves it. | suggested |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 2 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Settings | risk | Anyone, also a visitor, can read the platform settings, including the notification e-mail blacklist: a list of real e-mail addresses. Restrict it to the Platform Settings Admin (or at least to signed-in users), or confirm it is public by design? | Security Lead (DPO Lead consulted; Technical Lead adds the check) | — | open |
| OQ4 | Operations | check | Who can read the audit records written by a settings change, a well-known virtual contributor change and a platform reset (PLT-06, PLT-11, PLT-20)? The audit service was not read. | Security Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 17 of the 21 constants are still blank in "product must rule?" (Appendix E). Which of them must product rule on before the rebuild? | Product Lead (Technical Lead and Security Lead for the rows pre-filled with their role) | — | open |
| F5 | Settings | defect | The four blacklist refusals are plain errors: the web app gets an unspecified error and, outside production, a stack trace. Spec 019 asks for a clear validation error. | Technical Lead (Security Lead owns server#6663) | Make them validation errors. The stack trace part belongs to server#6663, never a new issue. | suggested |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ5 | Root | check | Is a chat-guidance well-known virtual contributor set up on every environment? The acceptance result was not re-read. | Service Operations Lead | — | open |
| OQ6 | Root | check | How are innovation hubs routed in deployment: the header name, the whitelisted subdomains and the hub subdomains on acceptance and production? PLT-07 is a code reading only. | Service Operations Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `knowledge ›`. The role shorthands in the Actors column are spelled out in Appendix B._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| PLT-01 | The `platform` root answers every caller, signed in or not; of its own fields only `wellKnownVirtualContributors` refuses anyone — `configuration`, `metadata`, `latestReleaseDiscussion`, `settings` (including the notification e-mail blacklist), `innovationHub`, `authorization` and `virtualAssistantAccess` are served to an anonymous visitor; the child entities (library, forum, role set, templates manager, storage aggregator, licensing framework, messaging) apply their own policies field by field. | anonymous, registered | code › `src/platform/platform/platform.resolver.queries.ts:174-181` · `platform.resolver.fields.ts` (no privilege decorator) · `platform.interface.ts:29-33` (`settings` is a plain field) · test › `configuration` › the anonymous read · matrix › `access-matrix.md:118-146` (anonymous has no `read` on `platform`) | untested (only the anonymous read of the configuration has a case; the anonymous read of the settings has none — see F1) |
| PLT-02 | `platform.metadata` lists the running services with their versions — today exactly one entry, `alkemio-server` with the server package version (empty when the process does not know it). | anonymous, registered | code › `src/platform/metadata/metadata.service.ts:12-33` · `schema.graphql:4789, 7084` | untested |
| PLT-03 | `platform.latestReleaseDiscussion` names the newest forum post in the Releases category (id and nameID), or is null when there is none; it is answered without checking whether the caller may read that post. | anonymous, registered | code › `platform.service.ts:272-288` · `platform.resolver.fields.ts:106-114` · `alkemio.yml:722` · git › `ab9acbcb0` | untested (F8) |
| PLT-04 | `platform.virtualAssistantAccess` is true only for a holder of the *Feature Virtual Assistant* role and false for everyone else — never an error — so the client can hide every assistant cue for an unprivileged user. | registered, feature-virtual-assistant | code › `platform.resolver.fields.ts:147-162` · `platform.service.authorization.ts:235-262` · spec › `agents-hq/specs/004-web-ai-assistant/spec.md` FR-027 · matrix › `access-matrix.md:140` | untested (covered elsewhere: `platform-roles/rules/feature-roles.it-spec.ts`) |
| PLT-05 | `platform.wellKnownVirtualContributors` (the mapping of named roles — chat guidance, steward-ownership expert — to virtual-contributor ids, possibly empty) is readable by every signed-in user and refused to an anonymous visitor with `FORBIDDEN_POLICY`. | registered | code › `platform.resolver.fields.ts:124-145` · `platform.service.authorization.ts:218-233` | untested (covered elsewhere: `platform-roles/_support/groups/a10.ts` read-back as settings admin) |
| PLT-06 | Setting a well-known mapping upserts by name, is reserved to the platform settings admin through a resolver-local gate the stored policy cannot reach, accepts any UUID without checking that a virtual contributor exists, and writes a configuration audit row naming the key and the new id. | PSA | code › `src/platform/platform.well.known.virtual.contributors/…resolver.mutations.ts:109-186` · `…service.ts:43-78` · `src/common/constants/authorization/global.policy.constants.ts` (`GLOBAL_POLICY_PLATFORM_WELL_KNOWN_VC_SET`) · matrix › `access-matrix-crosscheck.md:65` (F6) | untested (covered elsewhere: `a10.ts` › `A10.setPlatformWellKnownVirtualContributor`; F4) |
| PLT-07 | `platform.innovationHub` with no argument answers the hub matched from the request's host subdomain (null on the main domain or a whitelisted subdomain); with a subdomain or id/nameID it looks that hub up and fails if it does not exist. | anonymous, registered | code › `src/platform/platform.hub/platform.hub.resolver.fields.ts:13-34` · `src/common/interceptors/innovation.hub.interceptor.ts:29-80` | untested |
| PLT-08 | `restrictedSpaceNames` publishes the nameIDs a space may never take (the platform's own routes and reserved words), readable by anyone. | anonymous, registered | code › `src/domain/space/space/space.resolver.queries.ts:69-75` · `src/common/enums/restricted.space.names.ts` | untested |
| PLT-10 | The platform carries one settings object with two integration lists — the iframe allow-list for markdown embeds and the notification e-mail blacklist — both non-null (an absent blacklist reads as empty). | readers per PLT-01; PSA (writes) | code › `src/platform/platform-settings/platform.settings.interface.ts`, `platform.settings.integrations.interface.ts` · `platform.service.ts:55-60` · spec › `server/specs/019-notification-email-blacklist/spec.md:87, 91` | untested (covered elsewhere: `a10.ts` read-backs) |
| PLT-11 | Only the platform settings admin may change the settings — through the bulk update or the four add/remove actions — and every successful change writes a platform configuration audit row naming the setting and the value added or removed. | PSA | code › `platform.resolver.mutations.ts:119-300` · `platform.service.authorization.ts:287-308` · matrix › `access-matrix.md:118-146` (`pf:settings-admin` DT for settings-admin only) | untested (covered elsewhere: `a10.ts` the five A10 surfaces + denial cells) |
| PLT-12 | Adding an iframe URL that is already listed changes nothing; removing one that is not listed succeeds unchanged; the bulk update replaces whichever list it carries and leaves the other as it was. | PSA | code › `platform.settings.service.ts:14-73` | untested |
| PLT-13 | A blacklist entry must be a complete e-mail address: wildcards (`*`, `?`) are refused, the address is stored lower-cased, a duplicate (case-insensitive) is refused, the list holds at most 250 entries, and removing an address that is not listed is refused — each with its own message. | PSA | code › `platform.settings.service.ts:75-140` · `dto/notification-email-blacklist.input.ts` (`@IsEmail`) · spec › `019-notification-email-blacklist/spec.md:13-14, 89-92` | untested (F5 on the error shape) |
| PLT-14 | The server itself never consults either list: the blacklist is published for the notifications service to filter recipients, and the iframe allow-list for the client to honour when rendering markdown. | server, notifications service, client | code › grep for `notificationEmailBlacklist` and `iframeAllowedUrls` (no reader outside the settings module) · spec › `019-notification-email-blacklist/spec.md:113` | untested (see F3) |
| PLT-20 | Resetting the platform's authorization recomputes the platform policy and every platform-level child (library, templates manager, role set, forum, storage aggregator, licensing framework, messaging) in one action, is reserved to the platform operations admin, and is audited whether it succeeds or fails. | POA | code › `platform.resolver.mutations.ts:82-117` · `platform.service.authorization.ts:60-167, 427-434` · spec › `agents-hq/specs/032-platform-ops-admin-role/spec.md:44, 61, 144, 150-152, 164` | untested (covered elsewhere: `platform-roles/_support/groups/a3.ts` › `A3.authorizationPolicyResetOnPlatform`) |
| PLT-21 | The platform's own policy grants broad rights to one role only — content-full-access holds create/read/update/delete down the whole tree — and nothing grants role assignment by cascade; every other platform capability (operations, settings, audit read, users admin, forum manage, support lists, licensing lists, roles assign, feature-role assign, holder-list reads, service-profile marker, organisation creation, guidance access, assistant access, admin notifications) is its own non-cascading privilege held by its own family. | all platform roles | code › `src/platform/authorization/platform.authorization.policy.service.ts:56-125` · `platform.service.authorization.ts:264-598` · matrix › `access-matrix.md:118-146`; crosscheck A-rows | untested (covered elsewhere: the platform-roles suite, 2,071 rows) |
| PLT-25 | The platform forum is readable by anonymous and signed-in visitors alike; any signed-in user may open a discussion or contribute; only the forum manager (platform support) may post into, or move a post into, the Releases and Newsletter categories or retire a category; the active category list is served in the platform's canonical order, and a stored value the running build does not recognise is dropped rather than failing the whole platform query. | anonymous, registered, support | code › `src/platform/forum/forum.service.authorization.ts:40-100` · `forum.resolver.fields.ts:28-108` · `forum.resolver.mutations.ts:56-72, 137-160` · `platform.service.authorization.ts:354-367` · matrix › `access-matrix.md:375-382` | untested here (owned by `communications.md`; covered elsewhere: `communications/forum-discussions/platform-discussions.it-spec.ts`) |
| PLT-30 | A caller whose only credential is an MCP API key cannot use GraphQL at all: minting another key, listing keys and revoking a key are all refused with HTTP 401 `UNAUTHENTICATED`, and the refused revoke has no effect — the key stays active. | MCP-key holder | code › GQL-19 (`hydra-bearer.validator.ts:60-84`; `auth.interceptor.ts:150-156`) · test › `mcp-api-keys-containment` › US3-AS1, US3-AS2 · spec › `agents-hq/specs/038-mcp-api-key-management/spec.md:143-148, 299-301` | proven |
| PLT-31 | The former web routes for creating, listing and deleting MCP keys (`/rest/mcp/api-keys`) no longer exist: POST, GET and DELETE answer 404. | anyone | code › grep `@Controller(` (only `/rest/mcp` is mounted) · test › `mcp-api-keys-containment` › US3-AS3 · spec › `038 …/spec.md:149-150, 302-303` | proven |
| PLT-32 | A platform administrator can list a named user's keys and sees the same metadata the user sees (id, name, status, operations, created, expiry, last used, last-used address) and never a key value or hash; a user id that owns no keys yields an empty list. | platform users admin | code › `src/platform-admin/domain/mcp-api-key/admin.mcp.api.key.resolver.fields.ts:57-72` · test › `mcp-api-keys-containment` › US3-AS4, US3-AS6 · spec › `038 …/spec.md:151-157, 304-308` | proven (the system-actor clause is unasserted — F7) |
| PLT-33 | A platform administrator can revoke any of a named user's keys: the key stops authenticating on `/rest/mcp` at once, the owner's own list shows it as revoked with its history intact, and revoking a key that does not exist under that user is refused as not found. | platform users admin | code › `admin.mcp.api.key.resolver.mutations.ts:55-58` · test › `mcp-api-keys-containment` › US3-AS5, US3-AS6 · spec › `038 …/spec.md:154-157, 318-320` | proven (the "record shows an administrator acted" clause is unasserted — F7) |
| PLT-34 | An ordinary user cannot reach another user's keys: the administrative list is refused with `FORBIDDEN_POLICY`, and revoking another user's key by id is answered not-found — the key is simply not in the caller's own set — and the target key stays active. | registered | code › `admin.mcp.api.key.resolver.fields.ts:57-72` · `src/services/mcp-server/mcp-api-key.resolver.mutations.ts` (own keys only) · test › `mcp-api-keys-containment` › US3-AS7 · spec › `038 …/spec.md:158-160, 309-310` | proven |
| PLT-35 | The administrative key surface is gated by the platform users-admin privilege on the platform policy — a user's keys are user-credential lifecycle, the same family as identity reset — not by a generic "platform admin" notion. | platform users admin | code › `admin.mcp.api.key.resolver.fields.ts:57-72` · `platform.service.authorization.ts:333-352` | untested (the cases run as the harness `GLOBAL_ADMIN`, whose credential set is not pinned here — OQ3) |

### B. Rights: evidence

_The legend and the evidence line of the former who-may table, as written. The table itself is rebuilt in section 2; no cell changed meaning._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `platform.resolver.queries.ts:174-181`; `platform.resolver.fields.ts:33-162`; `platform.interface.ts:29-33`; `platform.resolver.mutations.ts:82-300`; `…well.known.virtual.contributors.resolver.mutations.ts:109-157`; `platform.service.authorization.ts:218-262, 278-308, 354-367, 427-434`; `platform.authorization.policy.service.ts:110-122`; `forum.service.authorization.ts:52-82`; `forum.resolver.mutations.ts:56-72, 137-160`; `admin.mcp.api.key.resolver.fields.ts:57-72`; access matrix `platform` (`access-matrix.md:118-146`), `forum` (`:375-382`); crosscheck F6 (`access-matrix-crosscheck.md:65`). "–" = not applicable to the role. The 038 cases run the administrative actions as the harness `GLOBAL_ADMIN` persona, whose credential set was not verified here.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. The text writes "F-1" for F1 and so on._

#### Findings

- **F1 — Platform settings, including the notification e-mail blacklist, are readable by anonymous (PLT-01/10).** Code: `settings` is a plain field on the `Platform` type with no privilege decorator and no `grantAccessOrFail`; the root query is unguarded. Matrix: the stored platform policy grants `read` to content-full-access only (anonymous `·`), so the matrix cell and the wire disagree. Test: `a10.ts` reads the settings as the settings admin only; no case reads them anonymously. Spec: 019 FR-005 wants the list "returned so downstream notification services can fetch the authoritative list" — it does not say to whom. Ruling: a list of real e-mail addresses served to the public is a privacy exposure — gate `settings` (settings admin, or at least registered) or confirm it is public by design.
- **F2 — `platform.roleSet` is served without a privilege check (PLT-01).** Code: resolve field with the comment "TODO: protect with privilege..."; the role set's own fields carry their guards (matrix `platform/role-set` read `CTS` for anonymous). Ruling: harmless today (the child fields gate), but the TODO should be closed or the field documented as open.
- **F3 — Nothing in the server consumes the blacklist or the iframe allow-list (PLT-14).** Code: the only reader is the initialiser. Spec 019: suppression lives in "downstream notification microservices". Test: none proves an e-mail on the list is not sent to. Ruling: route to the notifications table to confirm the notifications service reads `platform.settings.integration.notificationEmailBlacklist` and that a case exists; otherwise the setting is decorative.
- **F4 — A well-known mapping accepts any UUID (PLT-06).** Code: `setMapping` upserts whatever id it is given; `a10.ts` says "the server does not resolve it". Spec: none. Ruling: validate that the id is a virtual contributor (the guidance chat would otherwise point at nothing), or record the rule as accepted.
- **F5 — Settings refusals are plain `Error`s (PLT-13).** Code: wildcard, duplicate, cap and not-listed refusals throw `Error`, so the client receives `UNSPECIFIED` 99999 with the message — and, outside production, a stack trace. Spec 019 FR-003/FR-006 asks for "actionable feedback" / "a clear validation error". Ruling: make them `ValidationException`s (12xxx); the stack part is server#6663, never a new issue.
- **F6 — The `platform/` test folder is not about the platform.** Test: the only file is 038's US3 containment suite (plus a `.gitkeep` whose name starts with a space); none of PLT-01…25 has a case here, and the suites that do cover them live under `platform-roles/` and `communications/`. Ruling: when the areas are re-cut, move the seven cases to an MCP area and let this table's gaps become the platform area's backlog.
- **F7 — Two 038 acceptance clauses are not asserted (PLT-32/33).** Test: AS5 checks status and liveness but never reads the audit row that should show the administrator acted; AS6 uses a random UUID and says so — it does not prove that a system actor's key is unreachable. Spec 038 AS5/AS6 require both. Ruling: accept the server unit test for the predicate and add an audit read-back, or mark both clauses as known gaps.
- **F8 — `latestReleaseDiscussion` ignores the discussion's read policy (PLT-03).** Code: the newest Releases post is returned to anyone; the forum is anonymous-readable today, so nothing leaks. Ruling: record as accepted, or make it honour the policy so a future private forum does not surprise.
- **F9 — Forum policy builder sets `cascade` on the wrong rule (PLT-25).** Code: `forum.service.authorization.ts:61` sets `createRule.cascade = false`, then `:70` sets `createRule.cascade = true` again where `contributeRule.cascade` was evidently meant; `CONTRIBUTE` therefore keeps the builder's default and `CREATE_DISCUSSION` cascades. Test: the discussion suites are green, so either the default matches or nothing depends on it. Ruling: the communications table owns the forum — route there with this pointer.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Nothing in this folder runs nightly.** `platform` is an on-demand vitest project with no package script (`server-api/vitest.config.ts:114`; `nightly` lists 17 other folders); the five proven rows mean "green when last run" — when, and against which server?
- **OQ2 — Does the notifications service read the blacklist?** Outside the server; the 019 spec assumes it. Route to the notifications table / notifications repo.
- **OQ3 — Which credentials does the harness `GLOBAL_ADMIN` hold?** The administrative MCP cases pass as that persona, so it must hold `platform-users-admin` (PLT-35); the platform-roles table owns the persona's credential set.
- **OQ4 — Who can read the configuration and operations audit rows** that PLT-06/11/20 write (`platform.configuration.audit.service.ts` not read; `PLATFORM_AUDIT_READ` ← audit-reader in the policy)? Route to the platform-roles / audit table.
- **OQ5 — Is a `CHAT_GUIDANCE` well-known VC seeded on every environment?** The W4 register lists "well-known guidance VC exists" as an inventory check (`acc-defect-register.md:220`); its ACC result was not re-read here.
- **OQ6 — Innovation-hub routing in deployment.** The header name and whitelisted subdomains (`innovation_hub.*` in `alkemio.yml`) and the hub subdomains on acc/prod were not read; PLT-07 is a code reading only.

### D. Test gaps

_For the Quality Lead: the GAPS row in section 3 asks which of these get a case._

Untested rules by id: PLT-03, PLT-04, PLT-05, PLT-06, PLT-08, PLT-10, PLT-11, PLT-13, PLT-20, PLT-21, PLT-25, PLT-35 (of these, PLT-04/05/06/10/11/20/21/25 are covered by suites outside this folder — see each row); plus the unasserted clauses of PLT-32 (system-actor keys unreachable) and PLT-33 (audit row shows the administrator).

Behaviours the area has that neither reading nor tests pinned down:
- Anonymous read of `platform.settings` (the exposure in F-1) and of `platform.metadata` / `latestReleaseDiscussion` / `restrictedSpaceNames`.
- `platform.wellKnownVirtualContributors` refused to anonymous with `FORBIDDEN_POLICY` (PLT-05 negative).
- The blacklist refusals (PLT-13): wildcard, duplicate (case-insensitive), the 251st entry, removing an unlisted address; the lower-casing on write.
- Iframe idempotence and tolerant removal (PLT-12); the bulk update replacing one list and leaving the other.
- The audit row written by each settings change and by a platform reset (who can read it; which category).
- `latestReleaseDiscussion` when no Releases post exists (null) and when the newest Releases post is deleted.
- `innovationHub` resolution from the host header on a hub subdomain versus the main domain (PLT-07).
- A platform reset run twice leaving every grant unchanged (032's idempotence edge case).
- `virtualAssistantAccess` false for a platform admin without the feature role (PLT-04 negative).

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits and access rules. The "product must rule?" column is unchanged and still to be ticked (the CONST row in section 3)._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Service metadata | `services = [{ name: 'alkemio-server', version: <npm_package_version or ''> }]` | `metadata.service.ts:18-33` | | Technical Lead |
| Release discussion source | newest `Discussion` with category `releases`, by `createdDate DESC`; `{id, nameID}`; null when none | `platform.service.ts:272-288` | | Product Lead |
| Well-known VC keys (2) | `CHAT_GUIDANCE`, `STEWARD_OWNERSHIP_EXPERT` | `src/common/enums/virtual.contributor.well.known.ts` | | Product Lead |
| Well-known read privilege / holders | `ACCESS_INTERACTIVE_GUIDANCE` ← `GLOBAL_REGISTERED` | `platform.service.authorization.ts:218-233` | | Security Lead |
| Well-known set gate | resolver-local `IN_MEMORY` policy, `PLATFORM_SETTINGS_ADMIN` ← `platform-settings-admin`; rule name `GLOBAL_POLICY_PLATFORM_WELL_KNOWN_VC_SET` | `…resolver.mutations.ts:125-137` | | Security Lead |
| Assistant access | `ACCESS_VIRTUAL_ASSISTANT` ← `FEATURE_VIRTUAL_ASSISTANT` only | `platform.service.authorization.ts:243-262` | | Security Lead |
| Settings surface | `PlatformSettings.integration.{iframeAllowedUrls, notificationEmailBlacklist}`; mutations `updatePlatformSettings`, `addIframeAllowedURL`, `removeIframeAllowedURL`, `addNotificationEmailToBlacklist`, `removeNotificationEmailFromBlacklist` | `schema.graphql:5888-5895, 5991-6001`; `platform.resolver.mutations.ts` | | Technical Lead |
| Settings privilege / holders | `PLATFORM_SETTINGS_ADMIN` ← `platform-settings-admin` (stored platform policy) | `platform.service.authorization.ts:301-308` | | Security Lead |
| Blacklist cap | 250 entries | `platform.settings.service.ts:101-106`; 019 clarification | | Product Lead |
| Blacklist canonical form | lower-case; duplicates compared case-insensitively; `@IsEmail` on input | `platform.settings.service.ts:93-97`; `dto/notification-email-blacklist.input.ts` | | Technical Lead |
| Error text — wildcard | `Wildcard characters are not allowed in email addresses` | `platform.settings.service.ts:89-91` | F-5 | Technical Lead |
| Error text — duplicate | `Email <email> is already in the blacklist` | `:97-98` | F-5 | Technical Lead |
| Error text — cap | `Blacklist limit of 250 entries reached. Remove entries before adding new ones.` | `:101-105` | F-5 | Technical Lead |
| Error text — not listed | `Email <email> not found in blacklist` | `:129-131` | F-5 | Technical Lead |
| Audit setting names | `platformSettings`, `iframeAllowedUrls`, `notificationEmailBlacklist`, `wellKnownVirtualContributor:<key>`; intended owner `[PLATFORM_SETTINGS_ADMIN]`; operations audit action `authorizationPolicyResetOnPlatform` | `platform.resolver.mutations.ts:64-66, 141-151, 179-187, 215-223, 252-260, 289-297`; `…vc resolver.mutations.ts:166-174` | | Security Lead |
| Reset privilege / holders | `AUTHORIZATION_RESET` ← `platform-operations-admin` | `platform.service.authorization.ts:427-434` | | Security Lead |
| Root policy rule | `PLATFORM_CONTENT_FULL_ACCESS` ← CREATE, READ, UPDATE, DELETE, PLATFORM_CONTENT_FULL_ACCESS (cascading); no GRANT at the root | `platform.authorization.policy.service.ts:110-122` | | Security Lead |
| Forum categories (8, canonical order) | `releases`, `newsletter`, `tips-and-tricks`, `help` (label "Q&A"), `platform-functionalities`, `community-building`, `challenge-centric`, `other`; admin-only: `releases`, `newsletter` | `forum.discussion.category.ts`; `forum.category.allowed.ts:17-21` | | Product Lead |
| Forum privileges | `READ` ← anonymous + registered (cascading); `CREATE_DISCUSSION`, `CONTRIBUTE` ← registered; `PLATFORM_FORUM_MANAGE` ← `platform-support` (cascading from the platform) | `forum.service.authorization.ts:52-82`; `platform.service.authorization.ts:360-367` | | Security Lead |
| Restricted space names (30) | `home, user, admin, vc, organization, documentation, innovation-library, innovation-packs, innovation-hubs, forum, spaces, contributors, about, profile, restricted, docs, contact, create-space, landing, identity, flows, root, root-admin, root-user, dashboard, start, login, logout, register, settings` | `src/common/enums/restricted.space.names.ts` | | Product Lead |
| MCP containment surface | `me.mcpApiKeys`, `mintMcpApiKey`, `revokeMcpApiKey`, `platformAdmin.mcpApiKeys(userID)`, `adminRevokeMcpApiKey`; key statuses `ACTIVE`, `REVOKED`; admin gate `PLATFORM_USERS_ADMIN`; legacy `/rest/mcp/api-keys` → 404; MCP key on GraphQL → 401 | `admin.mcp.api.key.resolver.*`; test file; 038 | | Security Lead |

### F. Where this lands in the new core

The platform singleton dissolves into the briefing's ops namespace and the `viewer` slice: `metadata`/`configuration`/`latestReleaseDiscussion` are read-only platform facts served by the gateway (PLT-02/03 and `configuration.md`), the settings pair becomes a small `platform_setting` record whose readers and writers are decided explicitly rather than inherited from an unguarded field (PLT-10…14, F-1), the well-known-VC map becomes a typed reference that must point at an existing VC (PLT-06, F-4), and the per-family privileges of PLT-21 become capability-ledger rows with no cascade to "reset" (PLT-20 disappears with the stored policies). Three facts here should shape the core: (1) the root's fields are not gated by the platform policy today — whatever the new core publishes at its root must declare per field who may read it, because the matrix's `platform` row describes a policy nothing on the root consults; (2) the blacklist is a cross-service contract (PLT-14) — the notifications service's read of it must be a named integration, not an assumption; (3) the MCP containment rules (PLT-30…34) are the one proven slice here and belong with the 038 lifecycle, not with the platform root — keep them together when the areas are re-cut (F-6). Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/platform/`, 1 file, 7 cases — all MCP API-key containment, workspace#038 US3); the specs, issues and docs listed in § Sources. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. Licensing reads are cross-referenced to entitlements ENT-46/48/49, the role grants to the access matrix `platform` section and crosscheck F6, the forum's own rules to `communications.md`, the configuration child to `configuration.md`; the MCP key lifecycle (038) is out of scope beyond the seven containment cases that live in this folder.

2026-11-19 converted to the three-section layout. The single why of each rule was sorted into business and technical without rewording, each rule got a short plain version (the exact text is in Appendix A), and every finding, open question and gap was routed to an organisation role. Product has not reviewed this file yet.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/platform/platform/platform.resolver.queries.ts`, `platform.resolver.fields.ts`, `platform.resolver.mutations.ts`, `platform.service.ts`, `platform.service.authorization.ts`, `platform.interface.ts`, `platform.entity.ts`, `dto/release.discussion.dto.ts`
- `src/platform/authorization/platform.authorization.policy.service.ts`; `src/common/constants/authorization/global.policy.constants.ts`
- `src/platform/metadata/metadata.service.ts`, `metadata.interface.ts`, `service/service.metadata.interface.ts`
- `src/platform/platform-settings/platform.settings.service.ts`, `platform.settings.interface.ts`, `platform.settings.integrations.interface.ts`, `dto/*`
- `src/platform/platform.well.known.virtual.contributors/*.service.ts`, `*.resolver.mutations.ts`, `*.interface.ts`; `src/common/enums/virtual.contributor.well.known.ts`
- `src/platform/platform.hub/platform.hub.resolver.fields.ts`; `src/common/interceptors/innovation.hub.interceptor.ts`
- `src/platform/forum/forum.service.authorization.ts`, `forum.resolver.fields.ts`, `forum.resolver.mutations.ts`, `forum.category.allowed.ts`; `src/common/enums/forum.discussion.category.ts`
- `src/domain/space/space/space.resolver.queries.ts`; `src/common/enums/restricted.space.names.ts`; `src/services/mcp-server/capabilities/assistant.capability.resolver.queries.ts` (listed only)
- `src/platform-admin/domain/mcp-api-key/admin.mcp.api.key.resolver.fields.ts`, `admin.mcp.api.key.resolver.mutations.ts`; `src/services/mcp-server/mcp-server.controller.ts`, `auth/mcp-auth.guard.ts`, `mcp-api-key.resolver.mutations.ts` (containment only)
- `schema.graphql` (Platform, PlatformSettings, PlatformIntegrationSettings, PlatformWellKnownVirtualContributors, LatestReleaseDiscussion, Metadata, ServiceMetadata, Query.restrictedSpaceNames / platformCapabilities)
- `alkemio.yml:706-791` (platform block); git: `ab9acbcb0` (#3744)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/platform/mcp-api-keys-containment.it-spec.ts`, `authorization-platform-mutation.ts` (unused helper); `server-api/vitest.config.ts`
- `server-api/src/functional-api/platform-roles/_support/groups/a10.ts`, `a3.ts` (list only); `communications/forum-discussions/platform-discussions.it-spec.ts` (list only)
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ platform `:118-146`, § forum `:375-382`, § role-set), `access-matrix-crosscheck.md` (F6 `:65`), `entitlements.md` (ENT-46/48/49), `data-integrity/acc-defect-register.md:220`
- Other suites touching the area (list only): see dossier § 3

Specs / issues:
- agents-hq `specs/038-mcp-api-key-management/spec.md` (US3, FR-015…FR-021 — list only beyond containment); `specs/032-platform-ops-admin-role/spec.md`; `specs/004-web-ai-assistant/spec.md` (FR-027, via the entitlements pilot); `specs/027-platform-role-redesign` (A5, A10, A15, T045, T058, T072, T076 — via the pilot and the code comments)
- server `specs/019-notification-email-blacklist/spec.md`; server PR #3744; alkem-io/server#6663 (stack traces — route there)
