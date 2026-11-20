# Language: behaviour rules

_What the platform does today for interface languages: the languages it supports and the ones it proactively offers, each user's language setting and the one-time offer, the language an inviter can suggest and how it seeds a new account, and where the server uses the stored language. Detecting the browser language and showing the offer banner are done by the web client and are only referred to. The file follows the three-section layout accepted in the product review of `communications.md` (alkem-io/test-suites#717): **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 5 · Technical Lead 2 · Quality Lead 4 · Architecture Lead 1. By state: 9 open · 3 with a suggested answer. Proof of the 16 rules: 14 proven by a test · 2 untested (Appendix A)._

_Whys of the 16 rules: 16 rest on a source · none carries a draft · none is without a why. Spec 029 states the reason for almost every rule; LNG-13 rests on the comment in its legacy test._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec with its requirement, a pull request or commit, an issue or a document. "Not decided: exists in the code" means the behaviour exists in the code and nobody chose it. "Not decided: a defect" means today's behaviour is a fault.
- A marker in bold at the end of a rule points at section 3: **(open: F2)** means a question on this rule is still open, **(defect: F1)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F3)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A decided question leaves section 3 and moves onto its rule; "was F4" in **Decided by** keeps the trail. Nothing is decided in this file yet.
- "Offered" languages are what the appendix calls the *eligible* list: the languages the platform proactively detects, offers and accepts as a suggestion on an invitation.

## 1. Rules

### The language sets

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| LNG-01 | The platform supports six interface languages: English, Dutch, Spanish, Bulgarian, German and French. A user may store any of them as their preference; any other language is refused. **(open: F4)** | The supported set is what the interface is translated into; a user's own choice is never limited to the proactively offered subset (029 FR-008, FR-017; 054 "six product languages"). | — | — | Spec 029 FR-008, FR-017; spec 054 Assumptions |
| LNG-02 | The platform publishes, to everyone including visitors, the languages it proactively offers (today Dutch only) and a default language (English) shown when no preference is known. An empty offer list switches every proactive offer off. **(open: F3)** | — | — | Which languages are offered is configuration, not code, so a second language is a config change plus translations (029 FR-002, FR-006, SC-009). | Spec 029 FR-002, FR-006, SC-009 |

### The user's language setting

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| LNG-03 | A new account starts with no language and an unanswered offer. "Never chose" is kept apart from "chose the default". | The one-time offer to existing users depends on telling the two apart (029 Key Entities; DL-4: the migration never writes a concrete language, FR-012). | — | — | Spec 029 Key Entities, DL-4, FR-012 |
| LNG-04 | Storing a language also records that the offer was answered, so the user is never offered again on any device. | — | — | The answered flag is global, held against the account (029 FR-005/005a, FR-022). | Spec 029 FR-005/005a, FR-022 |
| LNG-05 | Declining is recorded without choosing a language: the offer counts as answered, the language stays empty and the user keeps the platform default. | A decline is a real, recorded choice; an ignored banner counts as a decline (029 FR-005, FR-020a, Assumptions). | — | — | Spec 029 FR-005, FR-020a |
| LNG-06 | Once the offer is answered it cannot be set back to unanswered, not even by an admin. **(open: F2)** | Nobody sees the offer twice (029 FR-022). | — | — | Spec 029 FR-022 |
| LNG-07 | Sending an empty language leaves the stored one untouched. A choice is never cleared, only replaced. | — | — | Explicit null behaves as "field omitted", the convention of every settings write (code comment); no product statement on clearing a choice. | Not decided: exists in the code (code comment) |
| LNG-08 | A user's stored language is read with their settings: by the user, by the Platform Users Admin, and by anyone who may update the user. | Settings are the user's; the users-admin reads them for support (027 A4/A5). | — | — | Spec 027 A4/A5 |
| LNG-09 | Only someone who may update a user can set their language: the user, and Platform Content Full Access through an inherited right. Any other registered user is refused and nothing changes. **(open: F1, F5, OQ4)** | The preference is personal (029 FR-008/011). | — | The content role's reach is the stored-policy root cascade, not a language decision (see F-1). | Spec 029 FR-008/011 for the user's own write. The admin write is not decided: it exists in the code |

### Invitations

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| LNG-10 | An inviter may attach one suggested language to a whole batch of invitations. It is optional and is recorded on every invitation the batch creates, for existing users and for new email addresses alike. | — | — | Recording per invitation keeps per-invitee granularity a UI change, not a migration (029 FR-014/014a/014b/015). | Spec 029 FR-014/014a/014b/015 |
| LNG-11 | A suggested language that the platform does not currently offer is refused when the invitation is composed, and nothing is created. With an empty offer list every suggestion is refused. | — | — | The UI only offers eligible values, so a refusal only hits crafted requests; the kill switch must hold on the API too (029 SC-008, DL-8). | Spec 029 SC-008, DL-8 |
| LNG-12 | When an invited person registers, the new account takes the language of the latest pending email invitation whose suggestion is still offered. Their first screen is in that language and no offer follows. An account that already has a language or an answer is left alone. **(open: OQ1, OQ3)** | The inviter's deliberate suggestion outranks the invitee's browser (029 FR-016, FR-019, DL-6). | — | Seeding runs synchronously inside registration (DL-12); stale suggestions fall back, never error (FR-018, DL-8); latest-created wins for determinism (DL-7). | Spec 029 FR-016, FR-018, FR-019, DL-6, DL-7, DL-8, DL-12 |
| LNG-13 | Inviting an already invited email address again returns the existing invitation with its suggested language intact. A later invite without a language cannot remove it. **(open: Q-LNG-01)** | A well-meant re-invite must not quietly remove what the invitee was given (legacy test comment, `server-api/src/functional-api/language/invitation-language-seeding.it-spec.ts:272`). | — | — | Not decided: exists in the code |
| LNG-14 | Invitation emails are sent in the platform default language. The suggested language only affects what the invitee sees after signing up. | E-mail localisation is a tracked follow-up (029 FR-016a, DL-12). | — | The e-mail is built inside the notifications service, out of scope this release. | Spec 029 FR-016a, DL-12 |

### Where the language is used

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| LNG-15 | The office-document editor always opens in a set language: the user's stored one, or the platform default for someone who never chose, a guest, an organisation or a virtual contributor. **(open: OQ2)** | — | — | Collabora's bundles resolve the browser locale inconsistently and show a mixed-language editor; a lookup failure must never block opening the document (code comment). | Not decided: exists in the code (code comment) |
| LNG-16 | Detecting the browser language, the offer banner, a visitor's choice for the session and the rule "a stored preference wins over the browser" are handled by the web client. The server stores nothing for a visitor. | — | — | 029 FR-001…004, FR-013a…e, FR-019, DL-3, DL-10 — the account record is the only server-side state. | Spec 029 FR-001…004, FR-013a…e, FR-019, DL-3, DL-10 |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Role names are written out. Product has not reviewed these cells yet. Evidence is in Appendix B._

### Language

| ID | Action | Platform admin roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Read the offered languages and the default | Y | Y | Y | Y | Y | Y | Y |
| W2 | Set or change my own language, or answer the offer | Y | Y | Y | Y | Y | Y | – |
| W3 | Set another user's language or mark their offer as answered | Y¹ | N | N | N | N | N | N |
| W4 | Set an answered offer back to unanswered | N | N | N | N | N | N | N |
| W5 | Read a user's language setting | Y² | N | Y³ | N | N | N³ | N |
| W6 | Suggest a language on an invitation | Y⁴ | – | – | Y | Y⁵ | N | N |
| W7 | Change the offered languages or the default | N⁶ | N | N | N | N | N | N |

W2 is about one's own account: every signed-in user may, whatever their role. ¹ Platform Content Full Access only, through an inherited update right (see F1). Platform Users Admin, Platform Support and Platform Operations Admin are refused. ² Platform Users Admin and Platform Content Full Access. ³ Their own setting only. ⁴ Whoever may invite into the role set (see `roleset.md`). ⁵ Depends on the space's settings. ⁶ Nobody through the API: operators change it in the deployment configuration.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 5 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Setting | decision | Platform Content Full Access can set any user's language and mark their offer as answered, through an inherited right. Is a content role meant to do that, or should only the user be able to? | Product Lead (Technical Lead then makes the rule explicit) | — | open |
| F2 | Setting | decision | An answered offer can never be shown again, by anyone. A support request to "show me the banner again", or a decline recorded by mistake, can only be fixed in the database. Accept that, or give the Platform Users Admin a reset? | Product Lead | — | open |
| OQ4 | Setting | decision | Is anyone meant to set a user's language on their behalf? Same decision as F1. | Product Lead | — | open |
| Q-LNG-01 | Invitations | decision | Why does this rule exist? No source says why a second invite keeps the first suggested language (LNG-13). | Product Lead | The reason given in the test: a well-meant second invite must not quietly remove what the invitee was given. | suggested |
| CONST | All | decision | None of the 15 constants has been ticked in "product must rule?" (Appendix E). Which must product rule on? | Product Lead (Technical Lead for engineering limits and wire shapes) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 2 to answer, 3 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Sets | tidy-up | The offered list and the default are unrelated settings: a deployment can offer its own default language, or leave the list empty without any log line. What is the intended relation? | Technical Lead (Service Operations Lead sets the values per environment) | Document the intended relation; add a startup log for the empty list. | suggested |
| F4 | Sets | decision | Regional codes such as nl-BE are reduced to the base language only in the web client; the server refuses them. Fine as it is, or accept regional variants on the server when more languages are offered? | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Setting | decision | Platform Content Full Access can set any user's language and mark their offer as answered, through an inherited right. Is a content role meant to do that, or should only the user be able to? | Product Lead (Technical Lead then makes the rule explicit) | — | open |
| OQ3 | Invitations | check | Two suggestions for one address: "the latest one wins" was left to the server unit tests of server#6299. Do those tests exist and are they green? | Quality Lead (Technical Lead confirms the unit tests) | — | open |
| CONST | All | decision | None of the 15 constants has been ticked in "product must rule?" (Appendix E). Which must product rule on? | Product Lead (Technical Lead for engineering limits and wire shapes) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 4 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Invitations | check | Does the real sign-up path seed the language the same way as the admin path the tests use? One live registration with a pending suggestion settles it. | Quality Lead | — | open |
| OQ2 | Use | check | Is the language passed to the office-document editor checked in any Collabora test? LNG-15 counts as untested until someone looks. | Quality Lead | — | open |
| OQ3 | Invitations | check | Two suggestions for one address: "the latest one wins" was left to the server unit tests of server#6299. Do those tests exist and are they green? | Quality Lead (Technical Lead confirms the unit tests) | — | open |
| GAPS | All | test | 2 rules have no test, 5 more have untested parts and 7 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Sets | tidy-up | The offered list and the default are unrelated settings: a deployment can offer its own default language, or leave the list empty without any log line. What is the intended relation? | Technical Lead (Service Operations Lead sets the values per environment) | Document the intended relation; add a startup log for the empty list. | suggested |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F5 | Setting | tidy-up | Every answer to the offer rewrites the user's whole set of access rules. It is correct, but costly at scale. | Architecture Lead | No ruling needed for this file; a note for the new core. | suggested |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them. The appendix keeps the original wording of the extraction._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›` or `matrix ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| LNG-01 | The platform supports exactly six interface languages — English, Dutch, Spanish, Bulgarian, German, French — and a user may store any of them as their preference; anything else is refused ("Language is not supported"). | registered | code › `src/common/constants/supported.languages.ts:10-28` · `src/domain/community/user-settings/user.settings.service.ts:397-411` · test › `user-language-settings` › `an unsupported language is rejected` | proven (the exact six untested) |
| LNG-02 | The platform publishes, to anyone including visitors, an *eligible* list — the subset it proactively detects, offers and accepts as an invitation suggestion (today Dutch only; an empty list switches every proactive offer off) — and a *default* language (English) shown when no preference is known; an eligible entry that is not supported is dropped with a warning, an unsupported default falls back to English with a warning. | all readers, operators | code › `src/platform/configuration/config/config.service.ts:40-67, 171-174` · `config/language/language.config.interface.ts` · `alkemio.yml:701-703` · `schema.graphql:2822-2836, 4107-4113` · test › `invitation-language-seeding` › `platform advertises an eligible language set and a default (US1/US5 precondition)`; `user-language-settings` › `the platform default language is configured` | proven (the warning/drop paths untested) |
| LNG-03 | A new account starts with no language and an unanswered offer: "never chose" is distinct from "chose the default". | registered | code › `user.settings.service.ts:48-49` · `user.settings.entity.ts:72-76` · `src/migrations/1785000000000-AddUserLanguagePreference.ts:14-15` · test › `user-language-settings` › `a new account starts with no language and an unanswered offer`; `invitation-language-seeding` › `US5-AS6 — an invitation with no suggested language seeds nothing` | proven |
| LNG-04 | Storing a language also records that the offer was answered, so the user is never offered again on any device. | registered | code › `user.settings.service.ts:397-414` · test › `US1-AS2 — accepting: writing a language latches languageOfferAnswered` (incl. independent read-back) | proven |
| LNG-05 | Declining is recorded without choosing a language: the answered flag is set, the language stays empty and the user keeps the platform default. | registered | code › `user.settings.service.ts:416-425` · test › `US1-AS3 — declining: the answer is recorded without setting a language` | proven |
| LNG-06 | The answered flag is a one-way latch: setting it back is refused ("languageOfferAnswered cannot be set back to false — it is a one-way latch"), even by an admin. | registered, PCFA | code › `user.settings.service.ts:417-421` · test › `languageOfferAnswered is a one-way latch — it cannot be set back to false` | proven |
| LNG-07 | Sending an empty language leaves the stored one untouched; a choice is never cleared, only replaced. | registered | code › `user.settings.service.ts:394-397` · test › `language: null is a no-op — a stored language is not cleared` | proven |
| LNG-08 | The stored language is read with the user's settings: by the user, by the platform users admin, and by anyone who may update the user. | registered, PUA | code › `src/domain/community/user/user.resolver.fields.ts:268-282` · `src/domain/community/user/user.service.authorization.ts:265-272, 333-341` · matrix › `access-matrix.md:1207-1238` (`read-user-settings`) · test › `a seeded persona exposes its language settings` (admin read) | proven (admin read; self read untested) |
| LNG-09 | Only someone who may update the user can set their language — the user, and platform content-full-access through its cascaded update right; any other registered user is refused and the language stays unchanged. Every settings write re-applies the user's access rules. | registered, PCFA | code › `src/domain/community/user/user.resolver.mutations.ts:101-140` · `user.service.authorization.ts:241-260` · matrix › `access-matrix.md:1174-1205` (`update`: user-self D, PCFA CT) · test › `a different user cannot write this account language` | proven (the refusal of another registered user; the admin clause is not: see F1) |
| LNG-10 | An inviter may attach one suggested language to a whole invitation batch; it is optional, and it is recorded on every invitation the batch creates — the invitation of an existing user and the platform invitation of a new e-mail alike. | inviters | code › `src/domain/access/role-set/role.set.resolver.mutations.membership.ts:472-478` · `src/domain/access/invitation/invitation.entity.ts:66-67` · `src/domain/access/invitation.platform/platform.invitation.entity.ts:51-52` · `schema.graphql:9832-9834, 4041-4043, 5921-5923` · test › `US5-AS7 — the suggestion fans out onto both Invitation and PlatformInvitation`; `US5-AS6`; `US4` (FR-014a) | proven |
| LNG-11 | A suggestion outside the current eligible list is refused when the invitation is composed ("Suggested language is not in the eligible set…") and nothing is created; with an empty eligible list every suggestion is refused. | inviters | code › `src/domain/access/role-set/role.set.eligible.language.guard.ts:10-47` · test › `SC-008 — a non-eligible language is rejected at compose time` | proven (the empty-list refusal untested) |
| LNG-12 | When the invited person registers, the new account is seeded from the latest-created pending platform invitation for that e-mail whose suggestion is still eligible — the language is stored and the offer marked answered, so their first screen is already in it and no banner follows; an account that already has a language or an answer is left alone; a stored suggestion that is no longer eligible or supported is silently skipped; nothing is seeded when no invitation carries one or the eligible list is empty. | registered (new) | code › `src/services/api/registration/registration.service.ts:245-254, 313-378` · test › `US4 — a new user invited with a suggested language registers already set to it`; `US5-AS6`; `US4 — re-inviting the same address preserves the original suggestion` (registration half) | proven (latest-created precedence and the "no longer eligible" skip are untested at API level — unit-tested in server#6299) |
| LNG-13 | Inviting an already-invited e-mail again returns the existing invitation with its suggestion intact, so a later invite without a language cannot strip a suggestion already given. | inviters | code › roleset area (`ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET`) · test › `US4 — re-inviting the same address preserves the original suggestion` | proven |
| LNG-14 | Invitation e-mails are sent in the platform default language; the suggestion colours only what the invitee sees after signing up. | server | code › no reader of the stored language in `src/` outside Collabora (grep) · spec › `agents-hq/specs/029-detect-signup-language/spec.md` FR-016a, DL-12 | untested |
| LNG-15 | When a user opens an office document, the editor is told the user's stored language, or the platform default for a user who never chose, a guest, an organisation or a virtual contributor — always explicitly, never left to the editor's own browser detection. | registered, guests | code › `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts:150-190` · `src/services/adapters/wopi-service-adapter/wopi.service.adapter.ts:85-95` | untested (the Collabora suite was not checked for a `lang` assertion — open question 2) |
| LNG-16 | Browser detection, the offer banner, the anonymous session-only choice, the "stored preference wins over the browser" rule and the legacy cached-language reconciliation are client behaviour; the server stores nothing for a visitor and treats every write as LNG-04/05. | all | spec › 029 · test › client-web `language-offer` › US1-AS5/AS6/AS7, US2-AS3/AS5, US3-* (list in dossier § 3) | proven (client-web) |

### B. Rights: evidence

_The evidence line as extracted. It uses the short role names of the legend below; PUA = Platform Users Admin._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `user.resolver.mutations.ts:101-116` (UPDATE on the user); `user.service.authorization.ts:241-272, 333-341` (self rule, PUA settings read, settings-read privilege from UPDATE); `user.settings.service.ts:416-421` (latch refusal for everyone); `role.set.resolver.mutations.membership.ts:472-478` (guard inside the invite mutation — invite rights are the roleset area); `language.config.interface.ts` ("anonymous-readable — the platform query carries no auth guard"); access matrix `user` (`access-matrix.md:1174-1205`, `update` = user-self D / PCFA CT; `read-user-settings` = user-self SR / PUA DT / PCFA SR), `user-settings` (`:1207-1238`); the legacy case `a different user cannot write this account language` proves the N for a plain registered user only.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and the ruling it asks for. The text writes "F-1" or "finding 1" for F1 and "open question 2" for OQ2. The rule-level questions (Q-…) were added in the conversion and have no longer text._

#### Findings

- **F1 — Platform content-full-access can set any user's language and latch their answer (LNG-09).** Code: the write is gated on UPDATE of the user, which the root rule cascades to content-full-access (access matrix `user`: `update` CT for PCFA). Test: only a plain registered user is proven refused. Spec 029: the setting is the user's (FR-008/011); no admin write is described. Ruling: is a content role meant to change a person's interface language (and silence their offer), or should the write be self-only like the latch suggests?
- **F2 — The latch can never be reset, by anyone (LNG-06).** Code refuses `false` for every caller. Spec: by design (FR-022). Data risk: a support request "show me the banner again" or a mis-recorded decline has no remedy but a direct database edit. Ruling: accept, or give the users-admin a reset.
- **F3 — Eligible and default are unrelated settings (LNG-02).** Nothing stops a deployment making the default eligible (then "stored = suggestion" and "showing the fallback" are indistinguishable — the suite guards for it) or leaving `LANGUAGE_ELIGIBLE` empty without any log (the kill switch warns about unsupported entries only). Ruling: document the intended relation; add a startup log for the empty list.
- **F4 — Regional codes are folded only on the client (LNG-01).** The server accepts bare codes; a stored `nl-BE` is "not supported". 029 FR-003 is client-side detection. Ruling: fine as is, or accept regional variants server-side when the eligible list grows.
- **F5 — Every answer to the banner re-applies the user's whole authorization policy (LNG-09).** "For simplicity if a setting is updated we will reapply the authorization policy" — a full policy rewrite for a one-flag change; harmless for correctness, a cost at scale. Ruling: none needed for the knowledge; note for the new core.

#### Open questions

- **OQ1 — Does the Kratos sign-up path seed identically.** The suite registers through `createUser` and relies on the same `finalizeUserRegistration → processPendingInvitations → seedLanguageFromInvitation` chain; the real sign-up path was not exercised. A live Kratos registration with a pending suggestion settles it.
- **OQ2 — Is the Collabora `lang` asserted anywhere.** `collabora/*.it-spec.ts` was not opened for a `lang`/language assertion; LNG-15 is untested until checked.
- **OQ3 — Two eligible suggestions for one address.** The "latest-created wins" rule needs two role sets and two eligible languages (the config has one); the plan's gap table defers it to server unit tests — confirm those exist in server#6299 and are green.
- **OQ4 — Is anyone meant to set a user's language on their behalf (F-1).** Product/support question; the code admits content-full-access by inheritance only.

### D. Test gaps

_For the Quality Lead (row GAPS in section 3)._

Untested rules by id: LNG-14 (e-mails stay in the default), LNG-15 (Collabora language), plus the untested clauses of LNG-01 (the exact six supported codes), LNG-02 (unsupported eligible entry dropped; unsupported default → English), LNG-08 (self read), LNG-11 (empty eligible list refuses every suggestion), LNG-12 (latest-created wins; "no longer eligible" skipped; existing language or answer not overwritten by a suggestion).

Behaviours the area has that neither reading nor tests pinned down:
- Changing a stored language to another supported one (every case writes once from null).
- A user who answered the offer anonymously and then registers (029 FR-013c — client carries it; the server sees a plain write).
- The Kratos sign-up path (not the admin `createUser`) seeding the language on a live stack.
- The organisation role-set invite path carrying `suggestedLanguage` (062 suite reads it back; seeding from an organisation invitation not asserted).
- A suggestion on an invitation to an existing user who never chose: the client offers it (DL-6); the server stores it on the Invitation only.
- `languageOfferAnswered` for a user created before the feature (migration leaves `false`; the client's DL-3 reconciliation decides) — no server case.
- A platform users admin reading, and being refused to write, another user's language.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column is as extracted: a finding id where a finding covers the value, blank where nobody has ticked it yet (row CONST in section 3)._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Supported interface languages (6) | `en`, `nl`, `es`, `bg`, `de`, `fr` | `supported.languages.ts:10-17`; 054 Assumptions | | Product Lead |
| Eligible list (default config) | `nl` (`LANGUAGE_ELIGIBLE`, comma-separated; unsupported entries dropped + warned; empty = kill switch) | `alkemio.yml:702`; `config.service.ts:40-57` | | Product Lead |
| Default language (default config) | `en` (`LANGUAGE_DEFAULT`; unsupported → `en` + warning) | `alkemio.yml:703`; `config.service.ts:58-66`; `supported.languages.ts:71-77` | | Product Lead |
| Stored shape | `user_settings.language varchar(16) NULL`; `user_settings.languageOfferAnswered boolean NOT NULL DEFAULT false` | migration `1785000000000:14-15`; `user.settings.entity.ts:72-76` | | Technical Lead |
| Latch semantics | any non-null language write → answered `true`; `true` alone = decline; `false` refused; `null` = omitted | `user.settings.service.ts:388-427` | | Technical Lead |
| Seeding guard | only when `language IS NULL AND languageOfferAnswered = false`; latest `createdDate` wins; eligible-at-registration only | `registration.service.ts:330-376` | | Technical Lead |
| Invitation columns | `invitation.suggestedLanguage`, `platform_invitation.suggestedLanguage` — `varchar(TINY_TEXT_LENGTH) NULL`; one value per batch | `invitation.entity.ts:66-67`; `platform.invitation.entity.ts:51-52` | | Technical Lead |
| Error text — unsupported | `Language is not supported` (+ `{language, supported[]}`) | `user.settings.service.ts:403-409` | | Product Lead (user-facing copy) |
| Error text — latch | `languageOfferAnswered cannot be set back to false — it is a one-way latch` | `user.settings.service.ts:418-420` | | Product Lead (user-facing copy) |
| Error text — not eligible | `Suggested language is not in the eligible set. Only eligible languages may be suggested on an invitation.` (+ `{language, eligible[]}`) | `role.set.eligible.language.guard.ts:43-46` | | Product Lead (user-facing copy) |
| Config warnings | `Configured eligible language '<x>' is not in SUPPORTED_INTERFACE_LANGUAGES and will be ignored.`; `Configured default language '<x>' is not in SUPPORTED_INTERFACE_LANGUAGES; falling back to 'en'.` | `config.service.ts:52-54, 63-65` | | Technical Lead |
| Seeding log | `Seeded language '<lang>' from platform invitation for user <id>` (verbose) | `registration.service.ts:370-373` | | Technical Lead |
| Invite outcomes touched | `INVITED_TO_PLATFORM_AND_ROLE_SET`, `ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET` (roleset area) | test › `US4 — re-inviting…` | | Technical Lead |
| Collabora fallback | guests, organisations, VCs, never-chose users → `language.default`; `lang` always sent | `collabora.document.resolver.queries.ts:168-190`; `wopi.service.adapter.ts:85-95` | | Product Lead |
| GraphQL surface | `Config.language: LanguageConfig{eligible, default}`, `UserSettings.language: String`, `UserSettings.languageOfferAnswered: Boolean!`, `UpdateUserSettingsInput.settings{language, languageOfferAnswered}`, `InviteForEntryRoleOnRoleSetInput.suggestedLanguage`, `Invitation.suggestedLanguage`, `PlatformInvitation.suggestedLanguage` | `schema.graphql:2834-2836, 4041-4043, 4107-4113, 5921-5923, 7931-7937, 9832-9834, 11288-11294` | | Technical Lead |

### F. Where this lands in the new core

The language is a two-column user preference and stays one: `user_preference.language` (nullable, one of the supported codes) and `language_offer_answered` on the `viewer`/user record, read through the `viewer` slice rather than `lookup.user.settings`; the supported set is a static enum in the core, the eligible list and the default remain deployment configuration exposed on the public config read (LNG-02). The invitation suggestion is a nullable column on the invitation row (one per invitation, LNG-10) and the seeding (LNG-12) is a registration-time step on the new core's "finalize registration" path — it must keep the three guards (fresh account only, eligible at that moment, latest-created wins) and must run before the first authenticated query. Two things found here should shape it: (1) who may write another user's preference should be an explicit rule, not an inherited cascade (F-1); (2) the only server-side consumer besides the client is the office-document editor (LNG-15) — notifications still ignore the setting (LNG-14), so e-mail localisation is a new-core capability, not a port. Error texts are rebaseline rows, not rules.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/language/`, 2 files, 15 cases); the specs, issues and docs listed in § Sources. Scope: the interface languages the platform supports and the subset it proactively offers, the per-user language setting and its one-time-offer latch, the language an inviter can suggest and how it seeds a new account, and where the server uses the stored language. Browser detection, the offer banner, the anonymous session choice and the precedence between them are client-side (029) and appear only as cross-references. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout. The status legend of the extraction was replaced by the Proof column of Appendix A and the markers in section 1; the single why was split in three without rewording; every finding, open question and gap was routed to an organisation role.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it. Three restating whys with no source were dropped where a sourced one remains (LNG-02, LNG-06, LNG-10); LNG-13 takes its why from the legacy test comment. No draft was needed.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/common/constants/supported.languages.ts`; `alkemio.yml` (`language:`); `src/platform/configuration/config/config.service.ts`, `config/language/language.config.interface.ts`
- `src/domain/community/user-settings/user.settings.entity.ts`, `user.settings.service.ts`, `user.settings.service.authorization.ts`; `src/domain/community/user/user.resolver.mutations.ts`, `user.resolver.fields.ts`, `user.service.authorization.ts`; `src/migrations/1785000000000-AddUserLanguagePreference.ts`
- `src/domain/access/role-set/role.set.eligible.language.guard.ts`, `role.set.resolver.mutations.membership.ts`; `src/domain/access/invitation/invitation.entity.ts`; `src/domain/access/invitation.platform/platform.invitation.entity.ts`
- `src/services/api/registration/registration.service.ts`
- `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts`; `src/services/adapters/wopi-service-adapter/wopi.service.adapter.ts`; `src/services/ai-server/ai-persona/ai.persona.service.ts` (checked: not a consumer of the setting)
- `schema.graphql`
- git: `8fb99d2fa` (#6299 feat(029) server)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/language/user-language-settings.it-spec.ts`, `invitation-language-seeding.it-spec.ts`, `language.request.params.ts`
- `docs/qa/server-rebuild/knowledge/_inventory.md` § language; `access-matrix.md` (§ user, § user-settings)
- `client-web/src/functional-e2e/language-offer/*.spec.ts` + `language-offer-test-plan.md` (WHY source)
- Other suites touching the area (list only): see dossier § 3

Specs / issues:
- `agents-hq/specs/029-detect-signup-language/spec.md` (FR-001…FR-023, SC-001…SC-010, Key Entities, decision log DL-3…DL-12); origin alkem-io/alkemio#2017
- `agents-hq origin/main:specs/054-delete-own-account/spec.md` Assumptions (six product languages)
- 027 platform-role redesign via code comments (A4/A5 users-admin settings read)
- test › `server-api/src/functional-api/language/invitation-language-seeding.it-spec.ts:272` (the reason behind LNG-13)
