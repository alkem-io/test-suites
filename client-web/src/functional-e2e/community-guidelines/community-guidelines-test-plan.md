# Test plan — edit a Space's community guidelines (W2 extras, SP-10)

> **Status:** Built 2026-11-12, 2 of 2 cases live · **Depth:** Light (one write path, one viewer; the guidelines profile is a shape the rebuild replaces) · **Source:** test-suites#722 (W2 handover "Extras"); `docs/qa/server-rebuild/catalogue/README.md` row SP-10 (verdict **absent**: "no write proven anywhere")

The plan has no diff behind it. It comes from the catalogue. Product source read at client-web `develop` @ `25ded1467` and server `develop` @ `e120d25a1`. Before this work the guidelines were written only through the lib (seeding) or by applying a template. This suite edits them by hand in Space Settings › Community › "Community Guidelines" › "Edit Guidelines", checks the reloaded page and the new lib read-back `readSpaceCommunityGuidelines`, and checks what a member is shown on the Community tab.

## How to run
```bash
cd client-web && pnpm exec playwright test src/functional-e2e/community-guidelines/
pnpm run test:nightly --project="Community guidelines"          # tier extended
```
- Harness personas only (`space.admin`, `space.member`); none is mutated. The file seeds its own private, application-only L0 Space (`w2-cg-<id>`) and deletes it in `afterAll`.
- Serial: CG-2 removes the link CG-1 adds (CG-2 skips, naming the reason, if CG-1 did not add it).

## Model
The guidelines are a profile on the Space's About: title = `displayName`, body = markdown `description`, related links = `references`. The editor saves in up to three steps (`useCommunityGuidelinesData` › `onSave`): `createReferenceOnProfile` for each new link, `deleteReference` for each removed one, then `updateCommunityGuidelines` with the text and the kept links (that mutation upserts links by id; it never creates or deletes one).

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | An admin edits the guidelines; it looks saved, but members still read the old text, or the title or body is lost | Medium (the profile shape is rebuilt) | Medium (what new members are asked to follow) | Medium | CG-1 |
| R2 | A link added in the editor is silently dropped (the bulk update ignores rows without an id) | Medium (already a known trap, handled client-side) | Medium | Medium | CG-1 |
| R3 | A removed link comes back after a reload | Medium (deletion is a separate mutation) | Low–Medium | Medium | CG-2 |
| R4 | A member is offered to edit the guidelines | Low | Medium | Low | CG-1 (negative with the admin as control) |

## Existing coverage before this work
Searched test-suites `origin/develop` @ `ef405cc0`: `rg -n -i "communityGuidelines|community guidelines|updateCommunityGuidelines|readSpaceGuidelinesId" client-web/src server-api/src lib/src --glob '!**/generated/**'`.
- **`templates-CRD/template-types/community-guidelines-template.spec.ts`** (#715): creates, edits and deletes a community-guidelines **template**; 1.4 applies it to the Space and checks the settings preview (title, body, links); 1.5 checks the applied guidelines survive the template's delete. That is the **apply-a-template** write (`onSelectCommunityGuidelinesTemplate`). It does not edit the guidelines by hand, does not reload, has no lib read-back of the Space's guidelines, and has no second viewer. This suite builds on it: it reuses its locator lessons (the settings section is collapsed; the guidelines Title shares its name with a reference row's Title) and covers the hand-edit path it does not.
- **`sidebar-widgets/*`**: seeds guidelines through the lib (`updateCommunityGuidelines`) and asserts only that the block's heading renders on the Community tab.
- **server-api:** `orphan-free-deletion/*` deletes Spaces that own guidelines; no case writes or reads them back.
- **lib:** `readSpaceGuidelinesId` returned only the id. Added `readSpaceCommunityGuidelines(spaceId, actor)` (`lib/src/scenario/functions/space/space.request.params.ts`): title, body, links.

## Scenario → test mapping
Techniques: **UC** use-case walk · **ST** state transition (link list [] → [l] → []) · **EP** viewer partition (admin / member) · **NC** negative with a positive control.

| ID | Scenario | Technique | Oracle (reload + lib read-back + viewer) | Automated by | Layer |
|---|---|---|---|---|---|
| CG-1 | `space.admin` replaces the seeded title and body and adds one link in the editor | UC, ST, EP, NC | the old text is seeded through the lib and read back first; `createReferenceOnProfile` and `updateCommunityGuidelines` answered, dialog closed; `readSpaceCommunityGuidelines`: title and body exactly the new text (old gone), links exactly `[{name, uri}]`; the reloaded preview shows the new title, body and link (href), not the old title; the member's read-back equals the admin's; on the Community tab the member sees the new title and body, not the old title, and "Read more" shows the link (href); **no "Edit"** for the member, with the admin's sidebar showing exactly one "Edit" as the control | `us1-edit-guidelines.spec.ts` › CG-1 the admin replaces the title and body and adds a link; the server keeps exactly those and a member is shown them | UI + lib |
| CG-2 | The admin removes that link (confirmed in "Remove this reference?") | ST | `deleteReference` and `updateCommunityGuidelines` answered; links `[]`; title and body unchanged; the reloaded preview has no link | `us1-edit-guidelines.spec.ts` › CG-2 the admin removes the link; the server drops it and keeps the text | UI + lib |
| — | Apply a community-guidelines template to the Space | — | — | `templates-CRD/template-types/community-guidelines-template.spec.ts` › 1.4, 1.5 | covered |
| — | The guidelines block renders in the Community tab's sidebar order | — | — | `sidebar-widgets/us1-default-rendering.spec.ts` › US1-AS2 | covered |

### Regression guards
- **CG-1:** `updateCommunityGuidelines` not storing (or appending to) title or body; a new link dropped because it has no id yet; a member served stale guidelines; the edit control offered without UPDATE.
- **CG-2:** a removed link not deleted (the bulk update never deletes), or the delete wiping the text.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| `removeCommunityGuidelinesContent` (empty the guidelines) | **No UI calls it**: `useCommunityGuidelines` exposes `onDeleteCommunityGuidelinesContent`, but no CRD component uses it (client-web `25ded1467`). API only | server-api, if the mutation is kept in the rebuild |
| A member cannot change the guidelines through the API | No it-spec exists; a pure-API case in Playwright is out (audit § 2.8) | server-api backlog (W1) |
| Editing a link in place (name/URL of an existing row) | Out of this cut; same `updateCommunityGuidelines` upsert | follow-up |
| Attaching a file as a link (paperclip) | Upload path | J11 |
| Subspace guidelines (different placeholder, own profile) | Same editor | follow-up |
| "Save as a template" from the editor | Template path | templates suite |

**Non-functional.** *Accessibility:* finding F1 below, manual. *Compatibility:* desktop Chrome only.

## Findings (code read + this build, not filed)
- **F1 (a11y, admins only):** a Space whose guidelines have an empty title renders the sidebar block's heading empty: an unnamed `h2` (seen on the admin's Community tab of a fresh Space). `CommunityGuidelinesBlock` falls back with `displayName ?? t('about.guidelines')`, and the server stores `""`, not null, so the fallback never applies. Members do not see the block until there is content. Draft in the build report.

## Rebaseline register
- A new Space's guidelines exist with an empty title, empty body and no links (`""`, not null).
- Copy: "Community Guidelines" (section and dialog), "Edit Guidelines", "Name your community guidelines", "Describe your space's code of conduct…", "Add another reference", "Reference title", "Remove reference", "Remove this reference?", "Read more", "Edit" (sidebar block).

## Build notes (2026-11-12, local stack, client-web `develop` @ `25ded1467`, server `develop` @ `e120d25a1`)

**Runs.** `--project="Community guidelines"` (with "Task boards"): 2 passed twice in a row. No `w2-cg-*` Space or organisation left behind. Gates as in the task-boards plan.

**Red-proofs** (each sabotage run once, red at the intended line, file restored byte-identical):

| Case | Sabotage | Result |
|---|---|---|
| CG-1 | after the save, the lib stores the old body followed by the new | red at the exact body read-back |
| CG-1 | the "member" view opened as `space.admin` | red at "Edit" absent: count 1 |
| CG-2 | cancel the remove confirmation (and change the title so Save is enabled) | red at links `[]`: the link is still stored |

**What this proves, and what it does not.** It proves that an admin's hand edit of the guidelines' title, body and links is stored exactly, survives a reload, is shown to a member (who is not offered to edit), and that a removed link is deleted. It does not prove that the server refuses a member's write, nor anything about emptying the guidelines (`removeCommunityGuidelinesContent` has no UI).
