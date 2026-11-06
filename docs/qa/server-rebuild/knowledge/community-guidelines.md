# Community guidelines — behaviour knowledge

_Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy test suites (no `server-api/src/functional-api/community-guidelines/` folder exists — catalogue SP-10 is **absent**; the proof below comes from two orphan-free-deletion cases and two client-web walks that happen to exercise guidelines); the specs, issues and docs listed in § Sources. Scope: a space's community guidelines — one record per space with a title, a text, links and an image; who edits it, who sees it, how it is emptied, how templates feed it, and what happens to it with the space. Guidelines *templates* as templates are `templates.md` (TPL-01/07/08) and are only cross-referenced. WHAT and WHY only — no mutations, fixtures or request params. Status legend: **proven** = a green legacy case asserts it; **untested** = code and/or spec only, no case; **disputed** = sources disagree, see § Findings; **unknown-why** = the rule holds but no source states the reason — the reviewer fills the why or writes "unknown, ask product". Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The extraction notes with every file:line are in `community-guidelines-dossier.md`._

_Review load: 3 findings · 3 unknown-why rows · 4 untested rows (gaps) · 12 constants to tick · 3 open questions. Manual points sit in five places: the Findings, the `unknown-why` rows, the `untested` rows (repeated under Gaps), the "product must rule?" column of the constants, and the Open questions._

## Behaviour rules

| ID | Rule the platform guarantees | Why (business reason, origin) | Actors | Sources (code › file:line · test › spec › case · spec › path) | Status |
|---|---|---|---|---|---|
| **### one record per space** | | | | | |
| CGL-01 | Every space at every level has exactly one community guidelines record, created with the space: a copy of the guidelines of the template the space was built from, or — when the template carries none, as the platform defaults do not — an empty one (no title, no text). It cannot be deleted on its own; it is deleted with the space. | "We cannot really delete the entity" — the record is a fixed part of the space's About (resolver comment); the empty default is a placeholder pending a defaults service (service TODO). | server | code › `src/domain/space/space.about/space.about.service.ts:80-92, 358-380` · `src/domain/community/community-guidelines/community.guidelines.resolver.mutations.ts:47` · `src/core/bootstrap/platform-template-definitions/default-templates/bootstrap.template.space.content.space.l0.ts`, `…subspace.ts` (no guidelines) · test › `orphan-free-deletion/group-a-delete-owned-records` › `GA-4 - deleting a space deletes the policies of its guidelines, …` | proven (goes with the space); "starts empty" untested |
| CGL-02 | Guidelines are a profile: a title, a markdown text, a list of links (references), a card image and a free tag list; any internal file link in the text or references is copied into the guidelines' own storage area when the record is created, and a failure to do so undoes the creation. | Guidelines reuse the platform profile so the same editor, links and image handling apply; two-phase creation after #6004/#6005 so no half-built record survives. | server | code › `community.guidelines.service.ts:41-101` · `community.guidelines.entity.ts:6-18` · `space.about.service.ts:140-176` · git `3468a3b18` (#6014) | untested |
| **### editing and emptying** | | | | | |
| CGL-03 | A space's admins (and platform content-full-access) can change the guidelines' title, text and links; the change is read back on the space and shown to members. A title shorter than 3 characters or longer than 128 is refused; a text may be up to 65,568 characters. | Profile validation is shared with every other profile (DTO); the 3-character floor is what makes a separate "empty" action necessary (CGL-04). | space admin, PCFA | code › `community.guidelines.resolver.mutations.ts:20-44` · `community.guidelines.service.ts:109-119` · `src/domain/common/profile/dto/profile.dto.update.ts:16-33` · test › client-web `sidebar-widgets/us1-default-rendering` › `US1-AS2 — Community tab renders … Guidelines in order` (title seeded through the guidelines update, read back as the sidebar heading by a member) | proven (title); text and links untested |
| CGL-04 | Emptying the guidelines is its own action: it sets the title and the text to empty strings and deletes every link, while the record, its image and tags remain; it needs the same right as editing. | "Update mutation doesn't allow empty values. And we cannot really delete the entity, but this will leave it empty." (resolver comment, PR #4740). | space admin, PCFA | code › `community.guidelines.resolver.mutations.ts:46-69` · `community.guidelines.service.ts:121-138` · git `2cfa6f9ae` (#4740) | untested |
| **### who sees them** | | | | | |
| CGL-05 | The guidelines of any space — including a private one — are readable by every visitor, signed in or not; only a guest viewer of a private space is left out. | "All content on community guidelines is public" (code comment). No product statement found. | anonymous, registered, members | code › `community.guidelines.service.authorization.ts:30-35` · matrix › `access-matrix.md:2442-2519` (`priv-applications`: − read for guest only) | disputed (F-1) |
| CGL-06 | A user with a pending invitation to, or application for, a space is shown that space's guidelines together with its About, before deciding. | "The set of information that a user that is invited / had an application for a Space needs to see to be able to make a decision" (DTO comment). | invitee, applicant | code › `src/services/api/me/me.service.ts:75-83, 113-121` · `src/services/api/me/dto/me.space.pending.membership.info.ts:7-30` | untested |
| CGL-07 | On a top-level space the guidelines are shown on the Community tab's sidebar by default (the `guidelines` widget, last on tab 2); a subspace shows them only if an admin adds the widget. | Per-tab sidebar defaults reproduce the pre-feature tabs (040 FR-009); the subspace default list has no guidelines widget (086 FR-008). | members, visitors | code › `src/domain/collaboration/innovation-flow-state/innovation.flow.state.sidebar.defaults.ts:68-79, 109-122` · test › client-web `sidebar-widgets/us1-default-rendering` › `US1-AS2` · spec › `agents-hq/specs/040-sidebar-widget-config/spec.md` FR-009; `086-subspace-sidebar-config/spec.md` FR-008 | proven (L0 tab 2) |
| **### templates and copies** | | | | | |
| CGL-08 | A community guidelines template carries a guidelines profile; applying one to a space replaces the space's guidelines title, text and links with the template's (the server offers, to anyone who may read the template's guidelines, an input built from them; the write is the ordinary edit); the template is unchanged. | Templates let admins start from consistent standards (templates plan; #3905). | space admin | code › `src/services/api/input-creator/input.creator.resolver.fields.ts:34-63` · `input.creator.service.ts:477-486` · `src/domain/template/template/template.service.ts:148-165` · test › client-web `templates-CRD/template-types/community-guidelines-template` › `1.4 Use Community Guidelines Template` (title, body and every reference link read back from the inline preview) · spec › `client-web/src/functional-e2e/plans/templates-test-plan.md` § 3 | proven (cross-ref TPL-01/08) |
| CGL-09 | Saving a space as a template captures its guidelines (title, text, links, tags); a space created from a space template starts with a copy of them. | Space templates capture the whole About (#5165; TPL-18). | space admin | code › `space.about.service.ts:358-380` · `input.creator.service.ts:477-486, 539-542` | untested (cross-ref TPL-18) |
| **### lifecycle and addressing** | | | | | |
| CGL-10 | Deleting a space deletes its guidelines with their profile and policy; nothing of them remains. | Policies are never cascade-removed, so every owned record is deleted explicitly (server#6614, DEL-15). | space admin | code › `space.about.service.ts:270-296` · `community.guidelines.service.ts:140-162` · test › `group-a-delete-owned-records` › `GA-4` | proven (policy; the profile policy cannot be observed — see `orphan-free-deletion.md` finding 7) |
| CGL-11 | The guidelines' address is their space's community page (a template's guidelines resolve to the template's page); after a move or conversion the cached address is dropped and follows the space. | — | server | code › `src/services/infrastructure/url-generator/url.generator.service.ts:191-196, 582-640` · `src/domain/space/space/space.service.ts:1119-1124, 1155-1166` | unknown-why (cross-ref JRN-04) |
| CGL-12 | Guidelines can be looked up by id by anyone who may read them, and a user can read which rights they hold on a given guidelines record. | — | all | code › `src/services/api/lookup/lookup.resolver.fields.ts:856-872` · `lookup.resolver.my.privileges.fields.ts:486-500` | unknown-why |
| CGL-13 | Both guidelines actions (edit, empty) are ordinary space-admin actions, never platform-admin ones: whoever may update the guidelines may do both; platform support may do so only where the space allows support to act as admin. | Space-content administration stays with the space; support's reach is bounded by the space setting (027 A7). | space admin, support | code › `src/platform/platform-role/verification/non.admin.surfaces.ts:160, 198` · matrix › `access-matrix.md:2483-2486` (`pub-open+support` delta) | unknown-why (027 covers the family, not this entity) |

Numbering note: ids are contiguous; none folded.

## Who may (role × action)

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

| action | platform admin roles (which) | space admin (own space) | admin of an ancestor space | space lead | space member | registered non-member | anonymous |
|---|---|---|---|---|---|---|---|
| read the guidelines of a public space | Y (all) | Y | Y | Y | Y | Y | Y |
| read the guidelines of a private space | Y (all) | Y | Y | Y | Y | **Y** | **Y** (guest: N) |
| see the guidelines on a pending invitation / application | – | – | – | – | – | Y (invitee / applicant) | – |
| edit title, text, links | Y — PCFA · support under the "support as admin" setting | Y | Y (L0 admin on L1/L2; L1 admin on L2) | N | N | N | N |
| empty the guidelines | same as edit | Y | Y | N | N | N | N |
| apply a guidelines template to the space | same as edit (+ read on the template) | Y | Y | N | N | N | N |
| look up by id / read own rights on them | Y | Y | Y | Y | Y | Y | Y (public) |

Evidence: `community.guidelines.service.authorization.ts:21-35` (inherit from About, then anonymous + registered READ); `community.guidelines.resolver.mutations.ts:33-38, 59-64` (UPDATE for both actions); `input.creator.resolver.fields.ts:53-60` (READ on the source guidelines); `me.service.ts:75-83, 113-121`; access matrix `community-guidelines` (`access-matrix.md:2442-2519`): read `CTS` for every role under `pub-open`, `priv-applications` removes read for guest only; update/create/delete/grant `C` for `space-admin@L0` on L0/L1/L2, `space-admin@L1` on L1/L2, `space-admin@L2` on L2, `CT` for PCFA, `+support` variants add platform-support; no cell for lead or member. Non-admin surface classification `non.admin.surfaces.ts:160, 198`. "–" = not applicable to the role. No legacy case exercises a negative cell.

## Constants the rules depend on (rebaseline candidates)

| Constant | Value today | Source | product must rule? |
|---|---|---|---|
| Profile type / policy type / template type | `community-guidelines` (all three) | `profile.type.ts:20`; `authorization.policy.type.ts:34`; `template.type.ts:7` | |
| Default content on creation | title `''`, text `''`, no links; a `default` free-form tagset; one `CARD` visual slot | `space.about.service.ts:80-86`; `community.guidelines.service.ts:50-59, 93-99` | |
| Title length | 3..128 characters on update (no floor on create) | `profile.dto.update.ts:16-20`; `entity.field.length.constants.ts:4` | |
| Text length | ≤ 65,568 (`HUGE_TEXT_LENGTH`) | `profile.dto.update.ts:30-33`; `entity.field.length.constants.ts:9` | |
| Read posture | anonymous + registered READ appended on every guidelines record (cascades to the profile) | `community.guidelines.service.authorization.ts:30-35` | F-1 |
| Write privilege | `update` on the guidelines (edit and empty) | `community.guidelines.resolver.mutations.ts:36, 62` | |
| Admin-surface class | `NON_ADMIN` for both mutations | `non.admin.surfaces.ts:160, 198` | |
| Sidebar widget | `guidelines` (`SidebarWidget.GUIDELINES`), default on L0 tab 2 (last), absent from subspace defaults | `sidebar.widget.ts:135`; `innovation.flow.state.sidebar.defaults.ts:68-79, 109-122` | |
| Address | the owning space's community page; a template's guidelines → the template page; null when orphaned | `url.generator.service.ts:582-640` | |
| Error text — not found | `Unable to find CommunityGuidelines with ID: <id>` | `community.guidelines.service.ts:175-177` | |
| Error text — template kind | `Community Guidelines Template requires guidelines input` | `template.service.ts:150-154` | |
| GraphQL surface | `SpaceAbout.guidelines: CommunityGuidelines!`, `CommunityGuidelines{profile}`, `lookup.communityGuidelines(ID)`, `lookupMyPrivileges.communityGuidelines(ID)`, `inputCreator.communityGuidelines(ID)`, `SpacePendingMembershipInfo.communityGuidelines`, `Template.communityGuidelines`, `TemplatesSet.communityGuidelinesTemplates(+Count)`, `CreateSpaceAboutInput.guidelines`, `CreateTemplateInput.communityGuidelinesData`; mutations `updateCommunityGuidelines`, `removeCommunityGuidelinesContent` | `schema.graphql:2764-2775, 3253-3255, 4001, 4372, 4445, 5209-5210, 5377-5378, 7187, 7240, 7556, 7650-7653, 9094, 9338-9339, 9497, 10079-10081, 10710-10714` | |

## Where this lands in the new core

Catalogue SP-10 lands as a **space document field**: the guidelines become a field (title, text, links, image) of the one `space` document rather than an entity with its own policy, profile, storage bucket and two mutations. Every rule above stays a behaviour except the mechanics of CGL-01/CGL-04 — "cannot be deleted, can only be emptied" becomes "the field may be empty", and the 3-character title floor that forced a second mutation disappears with the shared profile validator. Three facts found here should shape the model: (1) the read posture is wider than the space's (CGL-05, F-1) — the new core must decide explicitly whether guidelines are a public field of a private space or inherit the space's privacy, because today's answer is a code comment; (2) invitees and applicants read the guidelines before membership (CGL-06), so if the field inherits privacy the membership-request read path must carry it; (3) templates copy guidelines **by value** (CGL-08/09), never by reference — a template edit never reaches a space.

## Findings (sources disagree, or likely defect)

1. **Private-space guidelines are world-readable (CGL-05).** Code: `appendCredentialRuleAnonymousRegisteredAccess(READ)` on every guidelines record, parent-independent; the matrix shows anonymous and registered read under `priv-applications` (only guest loses it). Test: none (no private-space guidelines read exists in any suite). Spec: none; the only statement is the code comment "All content on community guidelines is public". The invitee/applicant need (CGL-06) is a narrower audience than "everyone". Compare crosscheck F11 (About documents of a private L0 are world-readable "by design"). Ruling: by design (record it) or restrict to the space's readers plus pending members.
2. **"Starts empty" is a fallback, not a guarantee (CGL-01).** Code: the request's guidelines, else the template's, else empty; the platform default templates seed none, but a top-level space's own subspace-default template may carry text, so a new subspace can start with its parent's guidelines. Test: none. Spec: none. Ruling: is copying a parent's template guidelines into every new subspace intended?
3. **The guidelines profile policy cannot be observed (CGL-10).** `CommunityGuidelines.profile.authorization` resolves null, so GA-4 proves the guidelines policy is deleted but not the profile's (`orphan-free-deletion.md` finding 7, reported on server#6614). Not re-filed; listed so the proven status of CGL-10 is read with that limit.

## Gaps (no legacy case)

Untested rules by id: CGL-01 (empty start), CGL-02, CGL-03 (text and links; the refusal of a 1–2 character title), CGL-04, CGL-06, CGL-09, CGL-11, CGL-12, CGL-13; and the negative half of every who-may cell (a member or non-member refused on edit and empty).

Behaviours the area has that neither reading nor tests pinned down:
- A member, a lead and a non-member refused on edit and on empty (no negative case anywhere; only the matrix says so).
- An anonymous read of a **private** space's guidelines (finding 1) — the one probe that would settle the privacy question.
- Emptying then editing again (the title floor of 3 means a 1–2 character title can never be set; an empty one can only come from the erase action).
- Links with internal file URLs on a template applied to a space — whether the files are copied into the space's bucket or left pointing at the template's.
- The guidelines of a template's content space (`TemplateContentSpace.about.guidelines`) — editable through the template's about? Not read.
- Conversions and moves: the guidelines travel with the About; no case reads them after an L1→L0 promotion or a cross-L0 move.
- The harness has `updateCommunityGuidelines` and `readSpaceGuidelinesId` but no erase, no read-back of the content, and no template-apply function.

## Open questions (could not be determined from the three sources)

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

1. **Which operation the client's "Use a template" runs.** The templates-CRD walk says "the picker runs the select-template mutation"; the server has no guidelines-specific apply, so it must be the ordinary edit fed from `inputCreator.communityGuidelines` — confirm in client-web before W2 writes a lib function for it.
2. **ACC data: do subspace-default templates carry guidelines text?** Decides whether finding 2 is theoretical.
3. **Product source for CGL-05.** No spec, issue or ADR states that guidelines are public; PR #3716 (entity) was not read — it may carry the reason.

## Sources

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
