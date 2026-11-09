# Test plan — edit a Space's About, your own profile, and an organisation you create (W2 journey 7)

> **Status:** Approved (rulings R-1 to R-6 provisional, approved by the operator Carlos on 2026-11-09 to build; QA lead Comoque1 to confirm) · **Built:** 2026-11-09, 8 of 9 cases live, H1-3 skipped on a reproduced product defect · **Amended 2026-11-09 after the first test-alkem.io run:** H1-2 skipped on a second reproduced product defect (R-7), H2-1 skipped because it edits H1-2's organisation; 6 of 9 live · **Depth:** Deep (two triggers: authorization/visibility, because who may create an organisation is a server privilege; and a cross-repo contract, because the profile, tagset and about writes are shapes the rebuild replaces), capped at the journey: 9 cases · **Source:** `docs/qa/server-rebuild/plan.md` § W2, journey 7; client-net audit rows C2, G2, H1, H2 and § 4 items 15 and 23

This journey has no diff. It comes from the plan. The basis is the audit, the plan, and product source read at client-web `907103f5f` and server `51eb90878` (both `develop`, 2026-11-09). The audit (2026-10-14) predates `contributors-crud/` (2026-11-04), which already covers the platform admin creating an organisation, an organisation admin editing name, tagline and website, and a user editing display name and tagline. This suite does **not** repeat those. It adds the writes nobody makes through the browser yet: a Space's About (name, tagline, What, Why, Tags), the rest of a user's own profile (first and last name, bio, location, skills, keywords), creating an organisation as a non-admin user, and editing that organisation's description, location, keywords and capabilities. Each case is checked three ways: the page after a reload, one read-back through a named `@alkemio/tests-lib` function, and what a **different** viewer is shown. Tier 1 item 15 is fixed here: `user-profile/update-basic-information.spec.ts` moves into this directory as G2-1, runs on a disposable identity, and stops renaming `admin`.

## How to run
```bash
cd client-web && pnpm exec playwright test src/functional-e2e/profile-editing/
pnpm run test:nightly --project="Profile editing"          # tier extended
```
- Where branded Chrome is not installed, set `PW_BROWSER=chromium`.
- The disposable users are registered through public Kratos and verified by **their own** mail (`registerVerifiedUser`, as in Contributors CRUD). The mail sink must be reachable. `KRATOS_ADMIN_URL` is not needed.
- The organisation file is `mode: 'serial'`: H1-1 (grant) → H1-2 (create) → H2-1 (edit the created organisation). H1-3 needs only H1-1. The Space and profile files have no order; each case reads its starting state from the server.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | An admin edits the Space's name, tagline or description. It looks saved, but visitors still see the old text, or one field is lost | High under the rebuild (one new `space` document) | High (the Space's public face) | **High** | C2-1 |
| R2 | Space tags are not replaced: a removed tag stays, or nothing is written | High (tagsets become vocabulary + label) | Medium | **High** | C2-2 |
| R3 | A user's first or last name edit is lost (these are user fields, not profile fields) | Medium | Medium | Medium | G2-1 |
| R4 | Bio or location is saved half-way (city without country), or other people don't see it | Medium | Medium | Medium | G2-2 |
| R5 | Skills land in Keywords (or the reverse), or a removed skill survives | High (vocabulary rebuild) | Medium | **High** | G2-3 |
| R6 | Anyone can create an organisation, or the Organisation Creator role grants nothing | Medium (the authorization verdict is rewritten) | High | **High** | H1-1 |
| R7 | A user creates an organisation but fields are dropped, or the creator cannot administer it | Medium | High | **High** | H1-2 |
| R8 | An organisation's description, location, keywords or capabilities edit is lost or cross-wired | Medium | Medium | Medium | H2-1 |
| R9 | References typed into the create dialog are silently discarded | High (**predicted by code read**: the server replaces them with the default social links, `organization.service.ts` › `createOrganization`) | Low–Medium | Medium | H1-3 |
| R10 | A member, or another user, can edit an About or a profile they do not own | Low | High | Medium | see gaps |
| R11 | The suite leaks a UI-created organisation or a user onto a shared environment | Medium | Medium | Medium | teardown design |

Elevated-risk triggers present: [x] authorization/visibility · [x] cross-repo contract · [ ] migration · [ ] breaking contract · [ ] infra/config · [ ] data-destructive · [ ] performance-sensitive.

## Existing coverage before this work
Searched test-suites `origin/develop` @ `afbefaf2` (commands are in `docs/qa-knowledge/coverage-map.md` › Profile editing). Every row below comes from an opened file.
- **Space About (C2).** `space/space-settings-about-limit` (AL-1/AL-2) types into What/Why/Who but **never saves a valid value**. AL-1b/AL-2b are skipped on client-web#10452. `classifications/*` seeds the Space Tags through the lib (`updateTagsetTags`) and only proves them unchanged. `space-banner/*` covers the banner. **No case saves name, tagline, What, Why or Tags through the UI.** At the API level, only subspace `why`/`who` updates (`journey/subspace/*`).
- **Own profile (G2).** `contributors-crud/user-crud` 1.2 is **full** for Display Name and Tagline (disposable user, reload, `getUserData`, a second viewer). 1.8 and `user-profile/view-profile-information` cover rendering only. `user-profile/update-basic-information` edits First and Last Name on the **shared `admin`**, with no read-back (item 15). Bio, location, skills, keywords and references: **none** through the UI. At the API level, `contributor-management/user/update-user` covers phone and location. `callout/contributors-collection/contributor-cards*` seeds tagsets over the API.
- **Organisation (H1/H2).** `contributors-crud/organization-crud` 2.1 is **full** for the platform admin's create in Administration (name ID and name only), and its delete. 2.2 is **full** for an organisation admin's name, tagline and website, including anonymous and signed-in viewers. 2.6 covers a settings switch. Who may create an organisation is **full at API level** (`platform-roles` A6, `feature-organization-creator.it-spec.ts`), but that project runs in no nightly. **Nobody creates an organisation from the user-settings dialog**, and no case writes organisation tagsets, description or location through the UI.
- **Reuse.** 7 of 22 scenarios needed no new test (user name and tagline, profile rendering, admin create, admin delete, organisation name/tagline/website, organisation settings, Space banner). 10 are covered by the 9 new cases. 5 stay gaps (below).
- **Tests needing update.**
  - `user-profile/update-basic-information.spec.ts` is moved and rewritten (G2-1).
  - `user-profile/user-profile-settings.page.ts` › `field('City')` and `countryCombobox` are stale: since client-web#10499 (2026-10-29), City is a `combobox` named "City", so the tab has two comboboxes. As a result, **`user-profile/view-profile-information.spec.ts` step 3 is predicted red.** This is a code read and has not been run. The fix re-aligns the page object; it does not weaken the assertion.
  - Confirmed unaffected: `contributors-crud/*` 1.2, 1.8, 2.1, 2.2; `classifications/*`; `space-settings-about-limit`.

## Scenario → test mapping
Techniques: **UC** use-case walk · **ST** state transition (tag sets, privilege grant) · **EP** viewer partition (editor / another user / anonymous) · **NC** negative with a positive control · **EG** error guess.

| ID | Scenario | Technique | Oracle (reload + one lib read-back + viewer) | Automated by | Layer |
|---|---|---|---|---|---|
| C2-1 | `space.admin` changes Space Name, Tagline, What and Why in one save | UC, EP, NC | "4 unsaved changes"; the reloaded About tab shows all four; `readSpaceAbout` returns exact name/tagline, What and Why paragraphs; `non.space` gets the About dialog under the **new** name with all four texts; no dialog under the old name | `us1-space-about.spec.ts` › C2-1 the admin changes the Space name, tagline, What and Why; the server keeps them and a non-member is shown them | UI + lib |
| C2-2 | Tags [] → [t1, t2] → [t1, t3] | ST, EP, NC | `readSpaceAbout` tagset = {t1,t2}, then {t1,t3}; chips after reload; the viewer's About "Tags" list is exactly t1, t3; t2 absent | `us1-space-about.spec.ts` › C2-2 Space tags are replaced, not merged, and the viewer sees exactly the stored set | UI + lib |
| G2-1 | First and Last Name (moved, item 15) | UC | "1 unsaved change" → "2 unsaved changes"; reload; `getUserData` firstName/lastName exact | `us2-own-profile.spec.ts` › G2-1 Update Basic Information: first and last name are saved, survive a reload and read back | UI + lib |
| G2-2 | Bio + Location (city typed, country picked) | UC, EP | reload; `getUserData` description holds the bio paragraph, location = {Utrecht, NL}; `space.member` sees the bio and "Utrecht, NL" on `/user/<nameID>` | `us2-own-profile.spec.ts` › G2-2 bio and location are saved, and another signed-in user sees them on the public profile | UI + lib |
| G2-3 | Skills [s1,s2] + Keywords [k1], then Skills → [s1,s3] | ST, EP, NC | `getUserData` tagsets skills={s1,s3}, keywords={k1}; chips after reload; viewer's Skills group is exactly s1, s3 | `us2-own-profile.spec.ts` › G2-3 skills and keywords go to their own tagsets and are replaced, not merged | UI + lib |
| H1-1 | The Organisations tab offers "Create Organisation" only with Feature Organization Creator | ST, NC | before: empty state shown, no section; grant via lib → `readMyPlatformRoles` has it → reload → section shown | `us3-organisation-create-edit.spec.ts` › H1-1 only a user holding Feature Organization Creator is offered "Create Organisation" | UI + lib |
| H1-2 | That user creates an organisation in the dialog (name ID, name, tagline, description, website) | UC | `createOrganization` answered; lands on `/organization/<nameID>` (h1 + "Open organisation settings"); `readOrganization` exact fields; creator in Admin and Associate; Organisations tab "Showing 1 of 1" | `us3-organisation-create-edit.spec.ts` › H1-2 the user creates an organisation in the dialog; every field is stored and the creator administers it (**`test.skip`**: reproduced product defect R-7, see Build notes) | UI + lib |
| H2-1 | The creator edits Description, Location, Keywords [k1,k2], Capabilities [c1] | UC, ST, EP | reload; `readOrganization` fields and both tagsets exact; anonymous visitor sees the description and both tag groups | `us3-organisation-create-edit.spec.ts` › H2-1 the creator edits description, location, keywords and capabilities; stored, reloaded, seen anonymously (**`test.skip`**: needs H1-2's organisation) | UI + lib |
| H1-3 | References typed into the create dialog are kept | EG | `readOrganization` profile.references contains the row. **Predicted red** (ruling R-3) | `us3-organisation-create-edit.spec.ts` › H1-3 a reference entered in the create dialog is kept (**`test.skip`**: reproduced product defect, see Build notes) | UI + lib |
| — | User Display Name + Tagline, seen by others | — | — | `contributors-crud/user-crud.spec.ts` › 1.2 | covered |
| — | Platform admin creates and deletes an organisation in Administration | — | — | `contributors-crud/organization-crud.spec.ts` › 2.1 | covered |
| — | Organisation name, tagline and website, seen anonymously | — | — | `organization-crud.spec.ts` › 2.2 | covered |
| — | Who may create an organisation (server refusal) | — | — | server-api `platform-roles/roles/feature-organization-creator.it-spec.ts` (A6) | covered (API, not nightly) |
| — | Space banner | — | — | `space-banner/banner-crop-default-shape.spec.ts` | covered |

### Regression guards
- **C2-1:** the `updateSpace` About patch drops or misroutes one field. What is `about.profile.description`, Why is `about.why`: two write paths in one mutation. Also guards a viewer being served a stale About.
- **C2-2 / G2-3 / H2-1:** a tagset update that **merges** instead of **replaces**, or that writes to the wrong reserved tagset. Also the client's silent no-op: `useAboutTabData` sends tags only `if (tagsChanged && current.tagsetId)`.
- **G2-1:** `updateUser`'s top-level `firstName`/`lastName` lost (they are not `profileData`). Also guards the harness: no shared persona is renamed.
- **H1-1:** `CREATE_ORGANIZATION` derived for every registered user (the pre-027 behaviour), or not for the role.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| A reference typed into the "New organisation" dialog is kept (H1-3) | **Built and skipped**: reproduced product defect (server replaces it with the default social links, `organization.service.ts` lines 120-121). Not filed yet | Server fix or a dialog without References; then drop the `test.skip` |
| A member (or another user) cannot edit a Space About / someone's profile | **Deferred to other suites.** The UI denials exist in unregistered `memberships/access-space-settings-as-space-member` and `cannot-access-other-user-*-settings` (Tier 0 item 1). **No API it-spec found** for `updateSpace` About by a member. A pure-API case in Playwright is out (audit § 2.8) | Register Tier 0; server-api backlog (W1) |
| Space Location and References; user Social Links and References; organisation references edited after create | Out of this cut (P3). References are a separate create/delete mutation path | J7b, or J11 (references) |
| Avatar / logo upload | Upload path | J11 |
| Subspace (L1/L2) About | Same view, `_subspace` copy; inheritance differs | follow-up |
| Partial save (`updateSpace` succeeds, a reference create fails) | **Deferred**: no fault-injection lever | deferred.md |
| Two admins saving the same About at once | Exploratory (charter E-2) | — |
| Keyboard and screen-reader path of tags, editor, city and country pickers; Dutch copy | **Manual.** Code-read findings: the tag **remove** button is named after the tag, the same as its edit button; a description editor with no placeholder is named "Formatting toolbar"; the country picker nests a "Clear country" button inside the combobox button | release-verification-checklist row; ruling R-6 |

**Non-functional.**
- *Performance:* one entity per write, no lists at volume, so no case.
- *Security:* the creation privilege is H1-1 (UI) plus A6 (API). Edit-rights negatives are the first gap row. Every read-back runs as a named actor, and viewers use their own sessions.
- *Reliability:* the save-bar retry and partial failure are client-unit territory, so deferred.
- *Compatibility:* desktop Chrome only. The tags input and comboboxes are not walked on mobile.
- *Accessibility:* see the manual row. Charter E-1.

**Charters.**
- E-1 (45 min): every edit in this journey done keyboard-only with a screen reader. Do tags, editors, city, country and the save bar announce what they are?
- E-2 (30 min): concurrent About saves by two admins. Which write wins, and is anything lost silently?

## Rulings (provisional: operator Carlos approved building on these defaults on 2026-11-09; QA lead Comoque1 to confirm)
| Ruling | Provisional default |
|---|---|
| R-1 Item 15: move `update-basic-information` into this directory (renames its nightly row), or rework in place | **Move** (one owner for the profile write path, one disposable-user fixture). The case title keeps "Update Basic Information" |
| R-2 Non-admin creation: a disposable user granted Feature Organization Creator, or the seeded `feature.orgcreator` persona | Disposable user plus a lib grant. The shared persona would gain and lose an Admin role every run |
| R-3 References entered in the create dialog are replaced by the server's defaults: defect, or intended? | Defect. H1-3 ran once and **reproduced red** on 2026-11-09 (see Build notes); it is `test.skip`ped. **Not filed yet** (the operator reserved filing); the issue number goes into the skip title when it exists |
| R-4 "Another user sees it" for a private Space: the non-member's About dialog | Yes (strictest public read). A member's Space page adds nothing |
| R-5 Is tag order part of the contract? | No. API set equality; UI order taken from the read-back |
| R-6 File the three accessibility findings as one client-web issue? | Yes, one issue; manual checklist row until fixed |
| R-7 The create dialog drops the description when Create is clicked before the editor's async markdown conversion resolves: client defect, or a test-only race? | Client defect: a user who submits quickly, typically on a slow network, silently loses the description. Reproduced (see Build notes). H1-2 and H2-1 are `test.skip`; **not filed yet**, the issue number goes into both skip titles when it exists |

## Rebaseline register
- Stored reserved tagset names are lowercase (`skills`, `keywords`, `capabilities`, `default`), while the GraphQL enum is uppercase.
- The creator gets Associate + Admin.
- The default organisation references (linkedin, bsky, github).
- Location renders as "City, CC".
- Phone is in **Social Links**, not Identity, since client-web#10499 (spec 097 FR-021a). `view-profile-information` asserted it in Identity.
- A "Changes saved" toast under a resting pointer is never dismissed (sonner pauses on hover) and covers the save bar's Save button. A second save in the same page must wait for the toast to leave, after parking the pointer (`saveWith`).
- The organisation create dialog has **no Location fields** (edit mode only), so City/Country are edited in H2-1 only.
- The Space About tab, user profile tab and organisation profile tab counters were as predicted: 4, 1+1, 3, 2+1, 5.
- Copy: "N unsaved changes", "Changes saved", "Organisation created.", "Create Organisation" / "New Organisation" / "New organisation".

## Build notes (2026-11-09, local stack, client-web `develop` @ `907103f5f`, server `develop` @ `51eb90878`)

**Run.** `pnpm run test:nightly --project="Profile editing"` on the local stack (`PW_BROWSER=chromium`): 8 passed, 1 skipped, twice in a row (2.3 min each). C2-2, G2-2 and G2-3 also pass alone (`-g`). H2-1 depends on H1-2 by design (serial file). `pnpm -C client-web run lint` 0 errors, lib build and lint 0 errors, `vitest run --project contract` 24 passed.

**Red-proofs** (each oracle broken once, seen red, restored):

| Case | Mutation | Result |
|---|---|---|
| C2-1 | expect `about.why` to contain `WHY <id>-x` | red at the `readSpaceAbout` assertion, received `WHY <id>` |
| C2-2 | assert the second read-back against [t1, t2, t3] | red: expected `tag-b` was missing (a merge would have been caught) |
| G2-1 | discard instead of saving | red at First Name after reload (received the registration default) |
| G2-3 | read `keywords` in the second skills assertion | red: received `kw-a`, expected the skills pair |
| H1-1 | assert the section absent after the grant | red: the heading is present (count 1) |
| H2-1 | assert keywords against the capabilities tagset | red: received `ocap-a`, expected the keyword pair |

**Product defect, H1-3 (R-3), reproduced.** Driving the "New organisation" dialog as a Feature Organization Creator, with one reference (Title and URL) added under References, `createOrganization` answers without errors, but `readOrganization(...).profile.references` holds only the three default social links with empty URIs (`linkedin`, `github`, `bsky`); the typed reference is gone. Cause (code read, confirmed by the run): server `src/domain/community/organization/organization.service.ts` lines 120-121 at `51eb90878`, `organizationData.profileData.referencesData = this.getDefaultContributorProfileReferences();`. The create dialog's References section (`OrganizationForm.tsx`) is offered in create mode. Redacted record: no run-unique id, e-mail or token is kept here. Not filed (operator); the case is `test.skip`, never `test.fail`.

**Product defect, H1-2 (R-7), reproduced.** On test-alkem.io (2026-11-09, first run) H1-2 created the organisation with the right name ID, name, tagline and website, but `readOrganization(...).profile.description` was `""`. Cause (code read): the create dialog's `MarkdownEditor` (`src/crd/forms/markdown/useMarkdownEditorState.ts`, client-web `develop` @ `907103f5f`) passes its value to the form only after `htmlToMarkdown(editor.getHTML())` resolves, and `htmlToMarkdown` (`markdownConverter.ts`) builds its pipeline on first use with dynamic imports of `unified`, `rehype-parse`, `rehype-remark` and `remark-stringify`. Submitting before that promise settles sends the stale (empty) description, with no error. Reproduced on the local stack by delaying only those chunks by 3 s in the browser (a temporary `page.route`, not committed): H1-2 red with the same `""`; without the delay, green. A real user who types the description and submits within that window, typically on a slow connection, loses it silently. H1-2 is `test.skip` and H2-1, which edits H1-2's organisation, is skipped with it. Not filed (operator); `test.skip`, never `test.fail`. Redacted record.

**Deviations from the build sheet.**
- `view-profile-information.spec.ts` was red for **two** reasons, not one. City is a combobox (predicted) **and** Phone moved from Identity to Social Links (not predicted). Both were re-aligned without removing an assertion: Phone is asserted in Social Links, City through `cityCombobox`.
- `saveWith` also parks the pointer and waits for the toast to leave (see Rebaseline register).
- The tag-chip and tagset assertions on the viewer's page read the real `listitem`s of the chip list (the hidden mirror is `aria-hidden`), so no `{ visible: true }` filter was needed.
- `createSectionTrigger` is the exact heading "Create Organisation" (the section has no description, so no regular expression was needed).
- Teardown checked after the runs: no `crud-` user, no `W2 Org` organisation and no `w2-about` Space left on the local stack.
- R-6 (one client-web issue for the three accessibility findings) is not filed; the manual checklist row in the build sheet is not added to `docs/release-verification-checklist.md` either, because that file is outside this change set.

**What this will prove, and what it will not.** When green, the suite proves that every About, profile and organisation field it edits is stored by the server, survives a reload, and is shown to someone else. It also proves that the right to create an organisation follows the Feature Organization Creator role. **It does not prove that anyone is prevented from editing a Space or profile they do not own.** That stays with unregistered UI specs and an API case nobody has written. References and social links stay unproven, and R-3 is a reproduced defect: references entered at creation are lost today (H1-3, skipped).
