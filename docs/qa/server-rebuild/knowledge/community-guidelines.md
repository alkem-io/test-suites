# Community guidelines: behaviour rules

_What the platform does today for a Space's community guidelines: one record per Space with a title, a text, links and an image; who edits it, who sees it, how it is emptied, how templates feed it, and what happens to it with the Space: what it does, why, who may, and what is still to answer. Guidelines templates as templates are in `templates.md`. The layout is the three-section one of `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 5 · Technical Lead 3 · Quality Lead 2 · Service Operations Lead 1. By state: 9 open · 2 with a suggested answer. Proof of the 13 rules: 5 proven by a test · 8 untested (Appendix A)._

_Whys of the 13 rules: 12 rest on a source · none carries a draft · 1 has none, and it already carries an open question (CGL-12: Q-CGL-12)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit, a pull request or an issue. "Not decided: exists in the code" means the behaviour is in the code and nobody chose it in a source we could find.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: F2)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F5)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- A decided question leaves section 3 and moves onto its rule; **Decided by** then keeps the trail.

## 1. Rules

### One record per Space

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| CGL-01 | Every Space and Subspace has exactly one set of community guidelines, created with it: a copy of its template's guidelines, or empty when the template has none. It cannot be deleted on its own, only with the Space. **(open: F2)** | — | As a space admin, I want all members to know the agreements on how we work together in this Space (server#3674). | "We cannot really delete the entity" — the record is a fixed part of the space's About (resolver comment); the empty default is a placeholder pending a defaults service (service TODO). | server#3674 (one record per community); the copy from the template is not decided (F2) |
| CGL-02 | Guidelines have a title, a text, a list of links, a card image and tags. Files linked from the text or the links are copied into the guidelines' own storage when they are created; if that fails, nothing is created. | — | — | Two-phase creation after #6004/#6005 so no half-built record survives. | Server #6004, #6005; server PR #6014 |

### Editing and emptying

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| CGL-03 | A Space's admins can change the title, text and links, and members see the change. The title must be 3 to 128 characters; the text can be up to 65,568 characters. | — | — | Profile validation is shared with every other profile (DTO); the 3-character floor is what makes a separate "empty" action necessary (CGL-04). | Not decided: exists in the code |
| CGL-04 | Emptying the guidelines is a separate action: it clears the title and the text and deletes every link, while the image and tags stay. It needs the same right as editing. | — | As a space admin, I want to remove guidelines I no longer want by clearing their title and text (client-web#7011). | "Update mutation doesn't allow empty values. And we cannot really delete the entity, but this will leave it empty." (resolver comment, PR #4740). | client-web#7011; server PR #4740 |

### Who sees them

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| CGL-05 | The guidelines of any Space, a private one included, can be read by everyone, signed in or not. Only a guest viewer of a private Space cannot. **(open: F1, OQ3)** | — | — | "All content on community guidelines is public" (code comment). No product statement found. | Not decided: exists in the code |
| CGL-06 | Someone with a pending invitation to a Space, or a pending application for it, sees its guidelines together with its About before deciding. | "The set of information that a user that is invited / had an application for a Space needs to see to be able to make a decision" (DTO comment). | — | — | server#3674 ("shown to users when they join a community"); DTO comment |
| CGL-07 | On a top-level Space the guidelines show in the sidebar of the Community tab by default. A Subspace shows them only if an admin adds them to its sidebar. | — | — | Per-tab sidebar defaults reproduce the pre-feature tabs (040 FR-009); the subspace default list has no guidelines widget (086 FR-008). | server#3674 ("visible on the community page"); spec 040 FR-009; spec 086 FR-008 |

### Templates and copies

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| CGL-08 | A guidelines template can be applied to a Space: the Space's title, text and links are replaced with the template's. The template itself does not change. | Templates let admins start from consistent standards (templates plan; #3905). | — | — | Server #3905; templates test plan |
| CGL-09 | Saving a Space as a template keeps its guidelines; a Space created from that template starts with a copy of them. | — | — | Space templates capture the whole About (#5165; TPL-18). | Server #5165 |

### Lifecycle and addressing

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| CGL-10 | Deleting a Space deletes its guidelines completely. **(open: F3)** | — | — | Policies are never cascade-removed, so every owned record is deleted explicitly (server#6614, DEL-15). | Server #6614 |
| CGL-11 | The link to a Space's guidelines leads to that Space's community page; a template's guidelines lead to the template's page. After a move or conversion the link follows the Space. **(open: Q-CGL-11)** | — | — | Guidelines have no page of their own: they are shown on the community page (server#3674, "visible on the community page"). | Not decided: exists in the code |
| CGL-12 | Anyone who may read guidelines can look them up directly, and a user can see which rights they hold on them. **(open: Q-CGL-12)** | — | — | — | Not decided: exists in the code |
| CGL-13 | Editing and emptying are ordinary Space-admin actions, never platform-admin ones. Platform Support may do them only where the Space allows support to act as admin. **(open: Q-CGL-13)** | Space-content administration stays with the space; support's reach is bounded by the space setting (027 A7). | — | — | Spec 027 A7 (covers the family of actions, not guidelines by name) |

Numbering note: ids are contiguous; none folded.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under each table. Row ids W1–W7 follow the order of the former who-may table. Product has not reviewed these cells yet. No test checks a refused cell (Appendix D). Evidence is in Appendix B._

### Reading

| ID | Action | Platform roles | Space admin | Admin of an ancestor Space | Space lead | Space member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Read the guidelines of a public Space | Y | Y | Y | Y | Y | Y | Y |
| W2 | Read the guidelines of a private Space | Y | Y | Y | Y | Y | Y¹ | Y¹ |
| W3 | See the guidelines on a pending invitation or application | – | – | – | – | – | Y² | – |
| W7 | Look the guidelines up directly, or read your own rights on them | Y | Y | Y | Y | Y | Y | Y³ |

"Platform roles" means every platform role here. ¹ Also without being a member; whether that is intended is F1. Only a guest viewer of a private Space is refused. ² The person invited or applying only. ³ Through the public read right of W1 and W2.

### Editing

| ID | Action | Platform roles | Space admin | Admin of an ancestor Space | Space lead | Space member | Registered user, not a member | Visitor |
|---|---|---|---|---|---|---|---|---|
| W4 | Edit the title, text and links | Y⁴ | Y | Y⁵ | N | N | N | N |
| W5 | Empty the guidelines | Y⁴ | Y | Y⁵ | N | N | N | N |
| W6 | Apply a guidelines template to the Space | Y⁴ ⁶ | Y | Y⁵ | N | N | N | N |

⁴ Platform Content Full Access; Platform Support only where the Space allows support to act as admin. ⁵ An admin of the top-level Space on its Subspaces; an admin of a Subspace on the Subspaces under it. ⁶ Also needs the right to read the template's guidelines.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 5 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Who sees them | decision | The guidelines of a private Space can be read by everyone, also by people who are not signed in. Is that intended, or should only the people who can read the Space, plus those with a pending invitation or application, see them? | Product Lead (Security Lead accepts the risk if they stay public) | — | open |
| F2 | One record | decision | A new Subspace does not always start with empty guidelines: when the parent Space's template for Subspaces carries guidelines, every new Subspace gets a copy. Is that intended? | Product Lead | — | open |
| OQ3 | Who sees them | check | Is there a product source that says guidelines are public? No spec, issue or decision record states it; server PR #3716 was not read and may carry the reason. | Product Lead (Technical Lead reads server PR #3716) | PR #3716 gives no reason. Its story, server#3674, says guidelines are "shown to users when they join a community" and "visible on the community page": a reason for people who are not members yet to read them, not for anyone to read those of a private Space. Decide F1 on that basis. | suggested |
| Q-CGL-13 | Editing | decision | Why does this rule exist? Spec 027 covers the family of Space-admin actions, not guidelines by name. Does its reason apply here? | Product Lead | — | open |
| CONST | All | decision | 11 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the engineering and access values) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 3 to answer, 3 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ1 | Templates | check | Which operation does the web client run for "Use a template" on guidelines? The server has no apply action of its own for guidelines. Confirm in client-web before a library function is written for it. | Technical Lead | — | open |
| Q-CGL-11 | Lifecycle | decision | Why does this rule exist? No source says why the link to the guidelines leads to the Space's community page. | Technical Lead | server#3674: guidelines are "visible on the community page"; they have no page of their own. The why is on CGL-11. | suggested |
| Q-CGL-12 | Lifecycle | decision | Why does this rule exist? No source says why guidelines can be looked up on their own, apart from their Space. | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Lifecycle | test | The deletion case proves that the guidelines' own access policy is removed, but it cannot see the policy of their profile (reported on server#6614). Is that limit accepted, or does the server make it observable? | Quality Lead (Technical Lead owns server#6614) | — | open |
| OQ3 | Who sees them | check | Is there a product source that says guidelines are public? No spec, issue or decision record states it; server PR #3716 was not read and may carry the reason. | Product Lead (Technical Lead reads server PR #3716) | PR #3716 gives no reason. Its story, server#3674, says guidelines are "shown to users when they join a community" and "visible on the community page": a reason for people who are not members yet to read them, not for anyone to read those of a private Space. Decide F1 on that basis. | suggested |
| CONST | All | decision | 11 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the engineering and access values) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Lifecycle | test | The deletion case proves that the guidelines' own access policy is removed, but it cannot see the policy of their profile (reported on server#6614). Is that limit accepted, or does the server make it observable? | Quality Lead (Technical Lead owns server#6614) | — | open |
| GAPS | All | test | 9 rules have no test or only part of one, no case checks that anyone is refused, and 7 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 2 also involved

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Who sees them | decision | The guidelines of a private Space can be read by everyone, also by people who are not signed in. Is that intended, or should only the people who can read the Space, plus those with a pending invitation or application, see them? | Product Lead (Security Lead accepts the risk if they stay public) | — | open |
| CONST | All | decision | 11 constants are blank in "product must rule?" (Appendix E). Which of them must product rule on? | Product Lead (Technical Lead and Security Lead rule on the engineering and access values) | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ2 | One record | check | On acceptance, do the templates that Spaces use for new Subspaces carry guidelines text? This decides whether F2 happens in practice. | Service Operations Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›`, `matrix ›` or `client ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| CGL-01 | Every space at every level has exactly one community guidelines record, created with the space: a copy of the guidelines of the template the space was built from, or — when the template carries none, as the platform defaults do not — an empty one (no title, no text). It cannot be deleted on its own; it is deleted with the space. | server | code › `src/domain/space/space.about/space.about.service.ts:80-92, 358-380` · `src/domain/community/community-guidelines/community.guidelines.resolver.mutations.ts:47` · `src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts`, `…subspace.ts` (no guidelines) · test › `orphan-free-deletion/group-a-delete-owned-records` › `GA-4 - deleting a space deletes the policies of its guidelines, …` | proven (goes with the space); "starts empty" untested |
| CGL-02 | Guidelines are a profile: a title, a markdown text, a list of links (references), a card image and a free tag list; any internal file link in the text or references is copied into the guidelines' own storage area when the record is created, and a failure to do so undoes the creation. | server | code › `community.guidelines.service.ts:41-101` · `community.guidelines.entity.ts:6-18` · `space.about.service.ts:140-176` · git `3468a3b18` (#6014) | untested |
| CGL-03 | A space's admins (and platform content-full-access) can change the guidelines' title, text and links; the change is read back on the space and shown to members. A title shorter than 3 characters or longer than 128 is refused; a text may be up to 65,568 characters. | space admin, PCFA | code › `community.guidelines.resolver.mutations.ts:20-44` · `community.guidelines.service.ts:109-119` · `src/domain/common/profile/dto/profile.dto.update.ts:16-33` · test › client-web `sidebar-widgets/us1-default-rendering` › `US1-AS2 — Community tab renders … Guidelines in order` (title seeded through the guidelines update, read back as the sidebar heading by a member) | proven (title); text and links untested |
| CGL-04 | Emptying the guidelines is its own action: it sets the title and the text to empty strings and deletes every link, while the record, its image and tags remain; it needs the same right as editing. | space admin, PCFA | code › `community.guidelines.resolver.mutations.ts:46-69` · `community.guidelines.service.ts:121-138` · git `2cfa6f9ae` (#4740) | untested |
| CGL-05 | The guidelines of any space — including a private one — are readable by every visitor, signed in or not; only a guest viewer of a private space is left out. | anonymous, registered, members | code › `community.guidelines.service.authorization.ts:30-35` · matrix › `access-matrix.md:2442-2519` (`priv-applications`: − read for guest only) | untested (see F1) |
| CGL-06 | A user with a pending invitation to, or application for, a space is shown that space's guidelines together with its About, before deciding. | invitee, applicant | code › `src/services/api/me/me.service.ts:75-83, 113-121` · `src/services/api/me/dto/me.space.pending.membership.info.ts:7-30` | untested |
| CGL-07 | On a top-level space the guidelines are shown on the Community tab's sidebar by default (the `guidelines` widget, last on tab 2); a subspace shows them only if an admin adds the widget. | members, visitors | code › `src/domain/collaboration/innovation-flow-state/innovation.flow.state.sidebar.defaults.ts:68-79, 109-122` · test › client-web `sidebar-widgets/us1-default-rendering` › `US1-AS2` · spec › `agents-hq/specs/040-sidebar-widget-config/spec.md` FR-009; `086-subspace-sidebar-config/spec.md` FR-008 | proven (L0 tab 2) |
| CGL-08 | A community guidelines template carries a guidelines profile; applying one to a space replaces the space's guidelines title, text and links with the template's (the server offers, to anyone who may read the template's guidelines, an input built from them; the write is the ordinary edit); the template is unchanged. | space admin | code › `src/services/api/input-creator/input.creator.resolver.fields.ts:34-63` · `input.creator.service.ts:477-486` · `src/domain/template/template/template.service.ts:148-165` · test › client-web `templates-CRD/template-types/community-guidelines-template` › `1.4 Use Community Guidelines Template` (title, body and every reference link read back from the inline preview) · spec › `client-web/src/functional-e2e/plans/templates-test-plan.md` § 3 | proven (cross-ref TPL-01/08) |
| CGL-09 | Saving a space as a template captures its guidelines (title, text, links, tags); a space created from a space template starts with a copy of them. | space admin | code › `space.about.service.ts:358-380` · `input.creator.service.ts:477-486, 539-542` | untested (cross-ref TPL-18) |
| CGL-10 | Deleting a space deletes its guidelines with their profile and policy; nothing of them remains. | space admin | code › `space.about.service.ts:270-296` · `community.guidelines.service.ts:140-162` · test › `group-a-delete-owned-records` › `GA-4` | proven (policy; the profile policy cannot be observed — see `orphan-free-deletion.md` finding 7) |
| CGL-11 | The guidelines' address is their space's community page (a template's guidelines resolve to the template's page); after a move or conversion the cached address is dropped and follows the space. | server | code › `src/services/infrastructure/url-generator/url.generator.service.ts:191-196, 582-640` · `src/domain/space/space/space.service.ts:1119-1124, 1155-1166` | untested (cross-ref JRN-04) |
| CGL-12 | Guidelines can be looked up by id by anyone who may read them, and a user can read which rights they hold on a given guidelines record. | all | code › `src/services/api/lookup/lookup.resolver.fields.ts:856-872` · `lookup.resolver.my.privileges.fields.ts:486-500` | untested |
| CGL-13 | Both guidelines actions (edit, empty) are ordinary space-admin actions, never platform-admin ones: whoever may update the guidelines may do both; platform support may do so only where the space allows support to act as admin. | space admin, support | code › `src/platform/platform-role/verification/non.admin.surfaces.ts:160, 198` · matrix › `access-matrix.md:2483-2486` (`pub-open+support` delta) | untested (027 covers the family, not this entity) |

### B. Rights: evidence

_The legend and the evidence line of the former who-may table, as they were. The shorthands in the legend are those of the evidence line; section 2 spells the roles out._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `community.guidelines.service.authorization.ts:21-35` (inherit from About, then anonymous + registered READ); `community.guidelines.resolver.mutations.ts:33-38, 59-64` (UPDATE for both actions); `input.creator.resolver.fields.ts:53-60` (READ on the source guidelines); `me.service.ts:75-83, 113-121`; access matrix `community-guidelines` (`access-matrix.md:2442-2519`): read `CTS` for every role under `pub-open`, `priv-applications` removes read for guest only; update/create/delete/grant `C` for `space-admin@L0` on L0/L1/L2, `space-admin@L1` on L1/L2, `space-admin@L2` on L2, `CT` for PCFA, `+support` variants add platform-support; no cell for lead or member. Non-admin surface classification `non.admin.surfaces.ts:160, 198`. "–" = not applicable to the role. No legacy case exercises a negative cell.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and the ruling it asks for._

#### Findings

- **F1 — Private-space guidelines are world-readable (CGL-05).** Code: `appendCredentialRuleAnonymousRegisteredAccess(READ)` on every guidelines record, parent-independent; the matrix shows anonymous and registered read under `priv-applications` (only guest loses it). Test: none (no private-space guidelines read exists in any suite). Spec: none; the only statement is the code comment "All content on community guidelines is public". The invitee/applicant need (CGL-06) is a narrower audience than "everyone". Compare crosscheck F11 (About documents of a private L0 are world-readable "by design"). Ruling: by design (record it) or restrict to the space's readers plus pending members.
- **F2 — "Starts empty" is a fallback, not a guarantee (CGL-01).** Code: the request's guidelines, else the template's, else empty; the platform default templates seed none, but a top-level space's own subspace-default template may carry text, so a new subspace can start with its parent's guidelines. Test: none. Spec: none. Ruling: is copying a parent's template guidelines into every new subspace intended?
- **F3 — The guidelines profile policy cannot be observed (CGL-10).** `CommunityGuidelines.profile.authorization` resolves null, so GA-4 proves the guidelines policy is deleted but not the profile's (`orphan-free-deletion.md` finding 7, reported on server#6614). Not re-filed; listed so the proven status of CGL-10 is read with that limit.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Which operation the client's "Use a template" runs.** The templates-CRD walk says "the picker runs the select-template mutation"; the server has no guidelines-specific apply, so it must be the ordinary edit fed from `inputCreator.communityGuidelines` — confirm in client-web before W2 writes a lib function for it.
- **OQ2 — ACC data: do subspace-default templates carry guidelines text?** Decides whether finding 2 is theoretical.
- **OQ3 — Product source for CGL-05.** No spec, issue or ADR states that guidelines are public; PR #3716 (entity) was not read — it may carry the reason.

### D. Test gaps

_For the Quality Lead._

Untested rules by id: CGL-01 (empty start), CGL-02, CGL-03 (text and links; the refusal of a 1–2 character title), CGL-04, CGL-06, CGL-09, CGL-11, CGL-12, CGL-13; and the negative half of every who-may cell (a member or non-member refused on edit and empty).

Behaviours the area has that neither reading nor tests pinned down:
- A member, a lead and a non-member refused on edit and on empty (no negative case anywhere; only the matrix says so).
- An anonymous read of a **private** space's guidelines (finding 1) — the one probe that would settle the privacy question.
- Emptying then editing again (the title floor of 3 means a 1–2 character title can never be set; an empty one can only come from the erase action).
- Links with internal file URLs on a template applied to a space — whether the files are copied into the space's bucket or left pointing at the template's.
- The guidelines of a template's content space (`TemplateContentSpace.about.guidelines`) — editable through the template's about? Not read.
- Conversions and moves: the guidelines travel with the About; no case reads them after an L1→L0 promotion or a cross-L0 move.
- The harness has `updateCommunityGuidelines` and `readSpaceGuidelinesId` but no erase, no read-back of the content, and no template-apply function.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, limits a user notices and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for access and security values. The "product must rule?" column is unchanged: the reviewer ticks the rows product must rule on._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Profile type / policy type / template type | `community-guidelines` (all three) | `profile.type.ts:20`; `authorization.policy.type.ts:34`; `template.type.ts:7` |  | Technical Lead |
| Default content on creation | title `''`, text `''`, no links; a `default` free-form tagset; one `CARD` visual slot | `space.about.service.ts:80-86`; `community.guidelines.service.ts:50-59, 93-99` |  | Product Lead |
| Title length | 3..128 characters on update (no floor on create) | `profile.dto.update.ts:16-20`; `entity.field.length.constants.ts:4` |  | Product Lead |
| Text length | ≤ 65,568 (`HUGE_TEXT_LENGTH`) | `profile.dto.update.ts:30-33`; `entity.field.length.constants.ts:9` |  | Product Lead |
| Read posture | anonymous + registered READ appended on every guidelines record (cascades to the profile) | `community.guidelines.service.authorization.ts:30-35` | F-1 | Security Lead |
| Write privilege | `update` on the guidelines (edit and empty) | `community.guidelines.resolver.mutations.ts:36, 62` |  | Security Lead |
| Admin-surface class | `NON_ADMIN` for both mutations | `non.admin.surfaces.ts:160, 198` |  | Security Lead |
| Sidebar widget | `guidelines` (`SidebarWidget.GUIDELINES`), default on L0 tab 2 (last), absent from subspace defaults | `sidebar.widget.ts:135`; `innovation.flow.state.sidebar.defaults.ts:68-79, 109-122` |  | Product Lead |
| Address | the owning space's community page; a template's guidelines → the template page; null when orphaned | `url.generator.service.ts:582-640` |  | Technical Lead |
| Error text — not found | `Unable to find CommunityGuidelines with ID: <id>` | `community.guidelines.service.ts:175-177` |  | Technical Lead |
| Error text — template kind | `Community Guidelines Template requires guidelines input` | `template.service.ts:150-154` |  | Technical Lead |
| GraphQL surface | `SpaceAbout.guidelines: CommunityGuidelines!`, `CommunityGuidelines{profile}`, `lookup.communityGuidelines(ID)`, `lookupMyPrivileges.communityGuidelines(ID)`, `inputCreator.communityGuidelines(ID)`, `SpacePendingMembershipInfo.communityGuidelines`, `Template.communityGuidelines`, `TemplatesSet.communityGuidelinesTemplates(+Count)`, `CreateSpaceAboutInput.guidelines`, `CreateTemplateInput.communityGuidelinesData`; mutations `updateCommunityGuidelines`, `removeCommunityGuidelinesContent` | `schema.graphql:2764-2775, 3253-3255, 4001, 4372, 4445, 5209-5210, 5377-5378, 7187, 7240, 7556, 7650-7653, 9094, 9338-9339, 9497, 10079-10081, 10710-10714` |  | Technical Lead |

### F. Where this lands in the new core

Catalogue SP-10 lands as a **space document field**: the guidelines become a field (title, text, links, image) of the one `space` document rather than an entity with its own policy, profile, storage bucket and two mutations. Every rule above stays a behaviour except the mechanics of CGL-01/CGL-04 — "cannot be deleted, can only be emptied" becomes "the field may be empty", and the 3-character title floor that forced a second mutation disappears with the shared profile validator. Three facts found here should shape the model: (1) the read posture is wider than the space's (CGL-05, F-1) — the new core must decide explicitly whether guidelines are a public field of a private space or inherit the space's privacy, because today's answer is a code comment; (2) invitees and applicants read the guidelines before membership (CGL-06), so if the field inherits privacy the membership-request read path must carry it; (3) templates copy guidelines **by value** (CGL-08/09), never by reference — a template edit never reaches a space.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy test suites (no `server-api/src/functional-api/community-guidelines/` folder exists — catalogue SP-10 is **absent**; the proof below comes from two orphan-free-deletion cases and two client-web walks that happen to exercise guidelines); the specs, issues and docs listed in § Sources. Scope: a space's community guidelines — one record per space with a title, a text, links and an image; who edits it, who sees it, how it is emptied, how templates feed it, and what happens to it with the space. Guidelines *templates* as templates are `templates.md` (TPL-01/07/08) and are only cross-referenced. WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The extraction notes with every file:line are in `community-guidelines-dossier.md`.

History: 2026-11-19 converted to the three-section layout: the single why was split in three, the who-may table became section 2, and every finding, open question and unexplained rule became a question row routed to an organisation role. Nothing in this file has been reviewed by product yet.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it. The stories behind server PRs #3716 and #4740 (server#3674, client-web#7011) give the user stories of CGL-01 and CGL-04 and the reason for CGL-11, and suggest answers for OQ3 and Q-CGL-11. One restating why with no source was dropped (CGL-02, business).

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/domain/community/community-guidelines/community.guidelines.entity.ts`, `community.guidelines.interface.ts`, `community.guidelines.service.ts`, `community.guidelines.service.authorization.ts`, `community.guidelines.resolver.mutations.ts`, `dto/*`
- `src/domain/space/space.about/space.about.service.ts`, `space.about.service.authorization.ts`, `space.about.resolver.fields.ts`, `dto/space.about.dto.create.ts`; `src/domain/space/space/space.service.ts` (URL cache)
- `src/services/api/me/me.service.ts`, `dto/me.space.pending.membership.info.ts`; `src/services/api/lookup/lookup.resolver.fields.ts`, `lookup.resolver.my.privileges.fields.ts`; `src/services/api/input-creator/input.creator.service.ts`, `input.creator.resolver.fields.ts`; `src/services/infrastructure/url-generator/url.generator.service.ts`
- `src/domain/template/template/template.service.ts`; `src/domain/template/templates-set/templates.set.service.ts`
- `src/domain/common/profile/dto/profile.dto.update.ts`; `src/common/constants/entity.field.length.constants.ts`; `src/common/enums/profile.type.ts`, `authorization.policy.type.ts`, `template.type.ts`, `sidebar.widget.ts`; `src/domain/collaboration/innovation-flow-state/innovation.flow.state.sidebar.defaults.ts`
- `src/platform/platform-role/verification/non.admin.surfaces.ts`
- `src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts`, `…subspace.ts`
- `schema.graphql`
- git: `69a9beba4` (#3716), `767675422` (#3905), `2cfa6f9ae` (#4740), `3468a3b18` (#6014)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/orphan-free-deletion/group-a-delete-owned-records.it-spec.ts` (GA-4, GA-5); `server-api/src/contract/lib-contract.it-spec.ts`
- `client-web/src/functional-e2e/sidebar-widgets/us1-default-rendering.spec.ts`, `sidebar-widgets.helpers.ts`; `client-web/src/functional-e2e/templates-CRD/template-types/community-guidelines-template.spec.ts`; `client-web/src/functional-e2e/space/space-crud.spec.md` § 3.18 (manual); `client-web/src/functional-e2e/plans/templates-test-plan.md` § 3
- `lib/src/scenario/functions/space/space.request.params.ts:119-130`, `lib/src/scenario/graphql/mutations/space/updateCommunityGuidelinesData.graphql`, `queries/space/readSpaceGuidelinesId.graphql`
- `docs/qa/server-rebuild/knowledge/templates.md` (TPL-01/07/08/18), `orphan-free-deletion.md` (DEL-15, finding 7), `journey.md` (JRN-04), `access-matrix.md` (§ community-guidelines), `access-matrix-crosscheck.md` (F11), `catalogue/README.md` (SP-10), `catalogue/root-fields.md:265-266`
- Other suites touching the area (list only): `explore-platform/*`, `seed-*.spec.ts` (guidelines templates as fixtures)

Specs / issues:
- `agents-hq/specs/040-sidebar-widget-config/spec.md` FR-009 (origin/main); `086-subspace-sidebar-config/spec.md` FR-008 (origin/main)
- No workspace or server spec has community guidelines as its subject (grep 2026-11-06)
- alkem-io/server PRs #3716, #3905, #4740 (titles from git; bodies not read)
- server#3674 "Member Guidelines" (the story behind PR #3716; parent alkem-io/alkemio#554); client-web#7011 (the story behind PR #4740: emptying guidelines)
