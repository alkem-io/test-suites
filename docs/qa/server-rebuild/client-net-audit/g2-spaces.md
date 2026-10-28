# G2 spaces, public access, memberships, navigation

Repo: `~/repos/qa/test-suites` @ `develop` b451c329. Read-only review; nothing run.
Counting convention: S/U/V counts are per `expect`/`toPass`/`waitForURL`-free assertion, including assertions inside page-object/helper methods the case calls. "Seed read-back" is scored S **only** where the point of the read is an authorization/visibility decision the server makes (e.g. a non-member can/cannot see a lib-seeded space); a pure echo of seeded copy with no access semantics is V. Server-generated defaults (default tagline/description, default sidebar lists, default callouts) count as S.

## Files reviewed
- `space/space-create.spec.ts`, `space/organization-space-create.spec.ts`, `space/space-crud.spec.md` (header only), `space/pages/{CreateSpaceDialog,SpacePage,SpaceSettingsPage,MyAccountPage,OrganizationAccountPage,HomePage,LoginPage,index}.ts`
- `public-space/{anonymous-user-access-public-space,non-member-tab-navigation,non-member-subspace-navigation,non-member-edge-cases,non-member-lead-profile-access,non-member-whiteboard-access}.spec.ts`, `public-space-non-member-navigation-test-plan.md` (status lines)
- `memberships/*.spec.ts` — **21** files (brief said 20): access-own-membership-settings, access-private-subspace-in-private-space-non-member, access-private-subsubspace-as-member, access-private-subsubspace-as-non-member, access-space-settings-as-space-admin, access-space-settings-as-space-member, access-subspace-settings-as-space-admin, access-subspace-settings-as-subspace-admin, cannot-access-organization-account-settings-non-admin, cannot-access-other-user-account-settings, cannot-access-other-user-membership-settings, removed-member-cannot-access-previous-space, view-another-user-profile-public-view, view-home-dashboard-authenticated-user, view-home-dashboard-multiple-memberships, view-organization-account-settings-as-admin, view-organization-profile-as-admin, view-organization-profile-public, view-own-account-settings, view-own-user-profile-public-information, view-unauthenticated-user-profile
- `explore-platform/{explore-platform-anonymous,explore-platform-authenticated}.spec.ts`
- `support-navigation/{support-navigation,support-navigation-additional}.spec.ts`
- `my-dashboard/my-dashboard-page-objects.ts`
- `sidebar-search/sidebar-search-test-plan.md`, `sidebar-search-manual-verification.md`
- `sidebar-widgets/{us1-default-rendering,us2-admin-config}.spec.ts`, `sidebar-widgets.helpers.ts`, `sidebar-widgets-test-plan.md`
- `space-banner/{banner-crop-default-shape,bannerless-space-gradient}.spec.ts`, `space-banner-test-plan.md`
- `helpers/space-navigation.helper.ts`, `helpers/space-cleanup.helper.ts`, `fixtures/authenticated-session.fixture.ts`, `config/playwright.config.nightly.ts`, `playwright.config.ts`
- lib (to see what the seed really does): `lib/src/scenario/TestScenarioFactory.ts` (createRootSpace, createSubspace, populateSpace)

Totals: **37 spec files, 107 cases, 5 skipped.**

## Per-spec table
| spec | nightly? | cases (skipped) | journeys | write path | S/U/V counts | verdict | one-line reason |
|---|---|---|---|---|---|---|---|
| space/space-create.spec.ts | yes (Space) | 10 (0) | C1, C6, G3 | mixed: 1.4/1.14 UI-write create + UI-write delete; other 8 no write | 6/46/0 | STRONG | Only real create-space UI net (1.4, 1.14: title + tutorial callouts + `deleteSpace` mutation error-free); 8/10 cases are client-only dialog validation (U) |
| space/organization-space-create.spec.ts | yes (Space) | 10 (0) | C1 (org account), H4, C6 | mixed: as above; org seeded via lib | 6/46/0 | STRONG | Same shape for org-account hosting; same caveat (8/10 U) |
| public-space/anonymous-user-access-public-space.spec.ts | yes | 2 (0) | A5, C3 (public privacy read) | lib-write | 2/7/0 | USABLE | Proves anonymous can read a lib-seeded public space (h1 + server default tagline); community case is static copy |
| public-space/non-member-tab-navigation.spec.ts | yes | 6 (0) | B3/B4-adjacent space tabs, C3 | lib-write | 3/16/0 | WEAK | Tab visibility, `aria-selected`, `?tab=N` URLs; only h1 + server default description are server-truth |
| public-space/non-member-subspace-navigation.spec.ts | yes | 4 (0) | C3, C4 (read), D (visibility of private L2) | lib-write | 11/6/2 | USABLE | Pins subspace listing + privacy marker of private L2 for a non-member; 5.2's L2 gate is an either/or branch |
| public-space/non-member-edge-cases.spec.ts | yes | 3 (0) | C3, E5 (comment gating), A5 | lib-write | 6/9/1 | USABLE | Comment-permission gating copy is privilege-driven; "session expiry" is cookie clearing, regex accepts both `Sign in to apply` and `Apply` |
| public-space/non-member-lead-profile-access.spec.ts | yes | 3 (0) | G1, D6 (lead display) | lib-write | 2/6/3 | WEAK | Clicks "first `/user/` link" in sidebar; asserts URL `/user/`, `img.first()`, `heading.first()`; scenario configures **no leads** |
| public-space/non-member-whiteboard-access.spec.ts | yes | 4 (0) | E8 (read-only), E5 gating | lib-write | 10/0/3 | USABLE | Lib-seeded whiteboard visible + non-member gating; canvas/zoom checks optional; "Anonymous" case 3.4 is actually authenticated |
| memberships/access-own-membership-settings.spec.ts | **no** | 1 (0) | G4, D7 | UI-write (leave) | 1/3/1 | NOT-A-NET | Unregistered. Intrinsically WEAK: post-leave oracle is a bare negative after reload guarded by `isVisible().catch` |
| memberships/access-private-subspace-in-private-space-non-member.spec.ts | **no** | 2 (0) | A5, C3, D (private L1 gate) | lib-write | 3/5/0 | NOT-A-NET | Unregistered. Intrinsically USABLE: "We are redirecting you" + anonymous "Access Restricted" are server-gated |
| memberships/access-private-subsubspace-as-member.spec.ts | **no** | 1 (0) | C3, D (member access to private L2) | lib-write | 1/1/2 | NOT-A-NET | Unregistered. URL regex and heading also match the non-member `/about` preview; only `Community` button discriminates |
| memberships/access-private-subsubspace-as-non-member.spec.ts | **no** | 1 (0) | A5, C3, D2 entry | lib-write | 4/1/0 | NOT-A-NET | Unregistered. Intrinsically STRONG read-auth: `/about` redirect + no-access img + no Community view |
| memberships/access-space-settings-as-space-admin.spec.ts | **no** | 1 (0) | C3 (admin entry), D6 | lib-write | 1/2/0 | NOT-A-NET | Unregistered. Settings link visible for admin (S), rest U |
| memberships/access-space-settings-as-space-member.spec.ts | **no** | 1 (0) | C3 (member denied) | lib-write | 0/0/1 | NOT-A-NET | Unregistered; single `not.toBeVisible` with no positive control (author's own "todo: not enough") |
| memberships/access-subspace-settings-as-space-admin.spec.ts | **no** | 1 (0) | C3, D6 (inherited admin) | lib-write | 2/3/0 | NOT-A-NET | Unregistered. Settings link `.first()` + settings tab |
| memberships/access-subspace-settings-as-subspace-admin.spec.ts | **no** | 1 (0) | C3, D6 | lib-write | 2/3/0 | NOT-A-NET | Unregistered; duplicate of the above with another persona |
| memberships/cannot-access-organization-account-settings-non-admin.spec.ts | **no** | 1 (0) | H6, A5 | lib-write | 1/1/0 | NOT-A-NET | Unregistered. Exact redirect URL to org profile is server-privilege-driven (S) |
| memberships/cannot-access-other-user-account-settings.spec.ts | **no** | 1 (1) | G3, A5 | — | 0/0/0 | NOT-A-NET | `test.skip` "[BUG]", no issue link |
| memberships/cannot-access-other-user-membership-settings.spec.ts | **no** | 1 (1) | G4, A5 | — | 0/0/0 | NOT-A-NET | `test.skip` "[BUG]", no issue link |
| memberships/removed-member-cannot-access-previous-space.spec.ts | **no** | 1 (0) | D7, D8 | UI-write (self-leave) | 4/4/2 | NOT-A-NET | Unregistered. Intrinsically STRONG: before/after access delta on a private L2 after a UI leave |
| memberships/view-another-user-profile-public-view.spec.ts | **no** | 1 (1) | G1 | — | 0/0/0 | NOT-A-NET | `test.skip` pending product decision, no issue link |
| memberships/view-home-dashboard-authenticated-user.spec.ts | **no** | 1 (0) | B1 | lib-write | 2/2/0 | NOT-A-NET | Unregistered. Membership space card on dashboard (unique L0 name) |
| memberships/view-home-dashboard-multiple-memberships.spec.ts | **no** | 1 (0) | B1 | lib-write | 1/1/2 | NOT-A-NET | Unregistered. Subspace name is a non-unique literal; 2 s timeouts; last assert duplicates the first |
| memberships/view-organization-account-settings-as-admin.spec.ts | **no** | 1 (0) | H4, G3 | lib-write | 2/5/0 | NOT-A-NET | Unregistered. Hosted space listed + "1/3" usage (`.first()` regex) |
| memberships/view-organization-profile-as-admin.spec.ts | **no** | 1 (0) | H2 (read), H6 entry | lib-write | 3/5/0 | NOT-A-NET | Unregistered. Org h1, lead space listed, admin settings link |
| memberships/view-organization-profile-public.spec.ts | **no** | 2 (0) | H2 (read), A5 | lib-write | 3/6/0 | NOT-A-NET | Unregistered. Anonymous case drops the space assertion ("[BUG] no spaces available") |
| memberships/view-own-account-settings.spec.ts | **no** | 1 (1) | G3 | — | 0/0/0 | NOT-A-NET | `test.skip` ("todo: the user should be a host") |
| memberships/view-own-user-profile-public-information.spec.ts | **no** | 1 (0) | G1, G4 | lib-write | 3/5/0 | NOT-A-NET | Unregistered. Own h1, Member Of space, own settings link |
| memberships/view-unauthenticated-user-profile.spec.ts | **no** | 1 (0) | A5, G1 | lib-write | 1/0/0 | NOT-A-NET | Unregistered. Anonymous → "Access Restricted" |
| explore-platform/explore-platform-anonymous.spec.ts | yes | 11 (0) | B2, B3, B6-adj, J1, K1, A1 (form only) | lib-write (heavy, unused) | 2/40/1 | WEAK | Static headings/menus/filters; seeded verified org + innovation pack + forum discussion are never asserted |
| explore-platform/explore-platform-authenticated.spec.ts | yes | 11 (0) | B1, B2, B3, J1, K1 | lib-write (heavy, unused) | 3/35/1 | WEAK | Same walk signed in; "Please log in…" negative asserts stale copy (always passes) |
| support-navigation/support-navigation.spec.ts | yes | 1 (0) | B2, B6 | lib-write (unused scenario) | 2/1/0 | WEAK | Support dialog → docs iframe heading; creates an org+space it never uses |
| support-navigation/support-navigation-additional.spec.ts | yes | 3 (0) | B2, B6 | none | 3/4/0 | WEAK | Dialog close + docs iframe + Home link; server only via signed-in header and docs config |
| sidebar-widgets/us1-default-rendering.spec.ts | yes (Sidebar widgets) | 6 (0) | C11, C7 (add tab), D6 (gating) | mixed: UI-write add tab (beforeAll); rest lib-seed reads of server defaults | 35/2/0 | STRONG | Exact per-tab default lists + order + data, absence lists with positive controls, API read-back of UI-added tab |
| sidebar-widgets/us2-admin-config.spec.ts | yes (Sidebar widgets) | 7 (1) | C11 | UI-write (Layout dialog ×3) + API-only writes (AS5, AS7) | 30/4/0 | STRONG | Every UI save read back via `GetInnovationFlowStatesWithIds` AND member rendering AND request trace; AS6 skipped with issue link |
| space-banner/banner-crop-default-shape.spec.ts | yes (Space banner) | 1 (0) | C2, N1 | UI-write (banner upload + crop) | 4/11/0 | STRONG | Uploaded banner comes back as `<img>` at ~10:1 on the space page; most asserts are crop-dialog UI |
| space-banner/bannerless-space-gradient.spec.ts | yes (Space banner) | 2 (0) | C2 (render) | lib-write | 4/8/0 | WEAK | Pins a client layout rule (no-image → 10:1); server only contributes "no uri" + names |

Verdict distribution (37 files): **STRONG 5** · **USABLE 4** · **WEAK 7** · **NOT-A-NET 21** (all memberships — not registered in the nightly or any runner config; 4 of them also skipped).

## Per-spec notes

### space/space-create.spec.ts
- Journeys: C1 (user account), C6 (UI delete), G3 (My Account › Hosted Spaces entry).
- Writes through UI: create Space (1.4, 1.14), delete Space via Settings › Account › Delete (1.4, 1.14). Seeded via lib: nothing (`createBaseScenarioEmpty` only populates the user map + global roles).
- Lib helpers: `TestScenarioFactory.createBaseScenarioEmpty`, `TestScenarioNoPreCreationConfig`, `TestUserManager.users.globalAdmin`; cleanup `deleteSpaceByNameId` → `getGraphqlClient().getSpaceIdByNameId`, `graphqlErrorWrapper`, `deleteSpace` (`@alkemio/tests-lib/scenario/baseFunctions`), `TestUser.GLOBAL_ADMIN`; fixture → `registerInKratosOrFail`, `verifyInKratosOrFail`.
- Personas: globalAdmin.
- Weakest: `1.1 … Happy Path (Valid Data)` → never creates; only Create-button enabled/disabled (U). `1.5`, `1.6`, `1.8`, `1.11`, `1.12`, `1.13`, `1.10` → client form validation / dialog chrome only (U). `1.6` URL-length rule: CRD dropped the counter, only "button disabled" remains.
- Strongest: `1.14 Create Space - Successfully Creates New Space` → server created the Space and resolves it by nameID (URL + `heading {name: spaceName}`), and `deleteSpace` mutation returns no `errors`. `1.4 … With Tutorials Enabled` → server honoured `addTutorialCallouts` (≥2 emoji-prefixed callout headings via `toPass`).
- Tolerance: `waitForSpaceReady` / `dismissSuccessDialog` / `clickCancel` / `clickClose` use `isVisible({timeout}).catch(() => false)` optional branches; `closeButton = dialog.getByRole('button').last()`.
- Risks: `verifySpaceTitle` is a non-exact heading-name match; nothing reads the new Space back in Hosted Spaces or over GraphQL; after delete only the mutation response is checked (no "space gone" read-back, and `afterEach` sweep is skipped because `createdSpaceNameId` is cleared). `Date.now().slice(-6)` nameIDs (not `UniqueIDGenerator`). Depends on globalAdmin's free-allowance capacity (3 Spaces) — leaks from other suites turn creates into "Capacity reached". Shared `page` across cases (`createAuthenticatedSessionFixture`), not serial-declared. Both space files write the same `.auth/my-feature-test.json` copy.

### space/organization-space-create.spec.ts
- Journeys: C1 (organization account), H4, C6.
- Writes through UI: create Space on org account (1.4, 1.14), delete Space. Seeded via lib: organization (`createBaseScenarioOrganization`).
- Lib helpers: `TestScenarioFactory.createBaseScenarioOrganization`, `TestScenarioFactory.cleanUpBaseScenario`, `OrganizationWithSpaceModel`, `TestScenarioNoPreCreationConfig`, `TestUserManager.users.organizationAdmin`; `deleteSpaceByNameId` chain as above.
- Personas: organizationAdmin.
- Weakest/strongest/skips/risks: identical to space-create (same 10 titles prefixed "from Organization"). Extra: the org page object's comment records that an earlier `.first()` "Add" matcher opened the VC dialog — now `Create Space` exact.

### public-space/anonymous-user-access-public-space.spec.ts
- Journeys: A5 (anonymous on public space), C3 (privacy = Public honoured).
- Writes: none through UI; lib seeds org + public L0 (members/admin, policy Applications).
- Lib helpers: `TestScenarioFactory.createBaseScenario`, `cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`; `CommunityMembershipPolicy`, `SpacePrivacyMode` (client-lib generated).
- Personas: anonymous (plain `@playwright/test`).
- Weakest: `4.4 Anonymous User Can Access Community Tab in Public Space` → static intro copy + header "Log in" (U).
- Strongest: `1.2 Anonymous User Can Access Public Space via Direct URL` → h1 contains server-generated name, server default tagline (S); tabs + "Sign in to apply" are U.
- Risks: config `displayName: 'Public Space for E2E Tests'` is silently ignored by the lib for L0 (root name is always `l0-<name>-<id>`) — the spec asserts on `'seed-public-space'` substring instead.

### public-space/non-member-tab-navigation.spec.ts
- Journeys: C3 read (public to non-member), space tab navigation.
- Writes: lib-seeded only.
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager.users.nonSpaceMember`, `CommunityMembershipPolicy`, `SpacePrivacyMode`.
- Personas: nonSpaceMember.
- Weakest: `2.3 … Subspaces Tab` and `2.4 … Knowledge Base Tab` → only `toHaveURL(/tab=3/)` / `/tab=4/` (U). `2.1 … View All Space Tabs` → 7 chrome affordances + `aria-selected` (U).
- Strongest: `1.1 Non-Member Can Navigate to Public Space from Home` → h1 by nameId + server default description visible (S); `dialog not.toBeVisible` is U.
- Risks: serial mode with shared page; `1.1` title says "from Home" but navigates by URL.

### public-space/non-member-subspace-navigation.spec.ts
- Journeys: C4 read (L1 public / L2 private listing), C3, D (non-member gate).
- Writes: lib (L0 public, L1 public with lead, L2 private).
- Lib helpers: as above + `TestUserManager.users.subspaceAdmin.displayName`.
- Personas: nonSpaceMember.
- Weakest: `5.3 … View Subspace Community and Leads` → only `toHaveURL(/.*user.*/)` after clicking a regex `.first()` link (S-weak: the link must exist). `5.4` ends with an optional Apply/Join check (V).
- Strongest: `5.1 Non-Member Can Navigate into Public Subspace` → subspace card in Subspaces grid by exact name, URL `/challenges/<nameId>`, h1 (S). `5.2` → private L2 shown with "Private" marker in L1 sidebar (S).
- Tolerance: `5.2` gate is `waitFor(...).then(() => true, () => false)` → if no dialog, falls back to `not.toHaveURL(/\/opportunities\//)` (V — passes if nothing happened). Tagline check commented out in `5.1`; `console.log` debugging left in.
- Risks: breadcrumb asserted with `getByRole('link', {name: space.nameId}).first()`.

### public-space/non-member-edge-cases.spec.ts
- Journeys: C3, E5 (comment permission gating), A5 (session loss on public space).
- Writes: lib (L0 + L1 public).
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager.users.nonSpaceMember`, `CommunityMembershipPolicy`, `SpacePrivacyMode`.
- Personas: nonSpaceMember (cookies cleared mid-test in 6.3).
- Weakest: `6.3 Session Expiry Does Not Block Public Space Access` → final check `/Sign in to apply|Apply/i .first()` accepts the signed-in variant, so it does not prove the session was dropped (V); rest are tab/URL U.
- Strongest: `6.1 … Default Callout` → server default "👋 Welcome to your space!" callout + "You don't have permission to comment, reply or react here." (privilege-driven, S).
- Risks: `6.3` clears cookies on the shared context — any later test in the file would be anonymous (it is last today). Subspace heading matched by `/seed-public-space/ .first()`.

### public-space/non-member-lead-profile-access.spec.ts
- Journeys: G1 (view another user's profile), D6 read (leads display).
- Writes: lib only.
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager.users.nonSpaceMember`, `CommunityMembershipPolicy`, `SpacePrivacyMode`.
- Personas: nonSpaceMember.
- Weakest: `4.3 Non-Member Can View Lead's Profile Details` → `img.first()` + `heading.first()` (V). `4.2` → `getByText(/access denied/i).not.toBeVisible()` (V).
- Strongest: none really; `4.2` needs *some* `/user/` link in the sidebar (S-weak).
- Risks: scenario config sets **no `leads`**, yet the cases are about "the lead's profile" — `firstLeadUserLink` takes whatever `a[href*="/user/"]` is first in the sidebar. Whose profile opens is never checked. `waitForURL(..., {timeout: 3000})`.

### public-space/non-member-whiteboard-access.spec.ts
- Journeys: E8 (read-only whiteboard), E5 gating.
- Writes: lib (`addWhiteboardCallout: true` → `createWhiteboardCalloutOnSpace`).
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager.users.nonSpaceMember`, `CommunityMembershipPolicy`, `SpacePrivacyMode`.
- Personas: nonSpaceMember (all 4 cases, including the "anonymous" one).
- Weakest: `3.2 … Open and View Whiteboard Content` → canvas and zoom checks run only `if (count > 0)` (V), after `.catch(() => undefined)` wait. `3.3 … Cannot Edit Whiteboard` → `editButtons` CSS selector `toHaveCount(0)` with no positive control (V).
- Strongest: `3.1` → seeded whiteboard callout heading + description + privilege gating copy visible to a non-member (S).
- Defect: `3.4 Anonymous User Can View Whiteboard Callout in Public Space` uses the shared **authenticated** page — it never runs anonymously.

### memberships/* (common to all 21 files)
- **Not in `playwright.config.nightly.ts`, not in any `config/playwright.config.*.ts`.** They only run via the interactive `playwright.config.ts`. None of them is a migration net today.
- Every file creates a full `createBaseScenario` with `name: 'memberships'`. Root names are unique (`l0-memberships-<id>`), but **L1/L2 display names are fixed literals** (`'Subspace for Membership Tests'`, `'Subsubspace for Membership Tests'`, `'Private Subspace in Private Space'`) — the lib uses config displayName for subspaces. Any leaked subspace from an earlier run satisfies `getByText(...).first()`.
- Plan header points to `plans/memberships-test-plan.md` (exists).
- Common lib helpers: `TestScenarioFactory.createBaseScenario`, `TestScenarioFactory.cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `TestUserManager.users.{spaceAdmin,spaceMember,subspaceAdmin,subspaceMember,subsubspaceMember,nonSpaceMember,organizationAdmin}.{email,nameId,displayName}`, `CommunityMembershipPolicy`, `SpacePrivacyMode` (`@alkemio/client-lib`); fixture `createAuthenticatedSessionFixture` → `registerInKratosOrFail`/`verifyInKratosOrFail`. Seed path inside the factory: `ensureSpaceMembers` (self-join), `assignRoleToUser`, `updateSpaceSettings`, `createSubspace`, `createPostCollectionCalloutOnSpace`.

### memberships/access-own-membership-settings.spec.ts
- Journeys: G4, D7. Writes through UI: **leave space** (More actions › Leave › confirm). Seeded: space + membership of spaceMember.
- Personas: spaceMember.
- Case `Access Own Membership Settings`: S = card link by space name before leave; post-leave oracle = `getByRole('link',{name}).not.toBeVisible()` after reload, where the search fill is skipped via `isVisible({timeout:5000}).catch(() => false)` — `isVisible` ignores its timeout (noted in `HomePage.ts`), so the negative can run before the list renders (V). No read-back over GraphQL.
- Risk: `More actions .first()` — fine after search narrowing, unsafe if search was skipped.

### memberships/access-private-subspace-in-private-space-non-member.spec.ts
- Journeys: A5, C3, D (private L1 in private L0). Writes: lib.
- Personas: nonSpaceMember; second case clears cookies (anonymous).
- Strongest: `… - As Non-Member` → "We are redirecting you" + Go now → parent URL (S on the gate); `… - Unauthenticated` → "Access Restricted" + Sign in / guest links.
- Weak: heading `{name: space.nameId}.first()`; `Close` button presence (U). Tag typo `@regrerssion`.

### memberships/access-private-subsubspace-as-member.spec.ts
- Journeys: C3, D (member access to private L2). Writes: lib.
- Personas: subsubspaceMember.
- Weak: `toHaveURL(/<nameId>/)` and `heading .first()` also pass on the non-member `/about` preview (V); real discriminator is `button 'Community' exact .first()` (S). `Settings` link negative is U.

### memberships/access-private-subsubspace-as-non-member.spec.ts
- Journeys: A5, C3, D2 entry. Writes: lib. Personas: spaceMember (member of L0, not of L1/L2).
- Strongest in the folder for read-auth: `toHaveURL(/about/)` + `img {name: /don't have access to this space/}` + `Community` button absent (paired with positive heading).
- Weak: Apply button regex `/Apply|Join|Sign in/i`.

### memberships/access-space-settings-as-space-admin.spec.ts / access-subspace-settings-as-space-admin.spec.ts / access-subspace-settings-as-subspace-admin.spec.ts
- Journeys: C3 entry, D6 (admin privilege, incl. inherited L0 admin on L1). Writes: lib. Personas: spaceAdmin / spaceAdmin / subspaceAdmin.
- S: `Settings` link visible (privilege-driven). U: URL `/settings`, `About`/`Layout` tab, `Space Name` heading.
- Risk: subspace variants use `getByRole('link', {name: 'Settings'}).first()` — would also pass on a parent-space Settings link. Comments say "same as … test" (duplicates).

### memberships/access-space-settings-as-space-member.spec.ts
- Journeys: C3 (member denied). Personas: spaceMember.
- Single `not.toBeVisible()` immediately after `goto` with no positive control (V) — passes on a blank page. Author comment "todo: not enught".

### memberships/cannot-access-organization-account-settings-non-admin.spec.ts
- Journeys: H6, A5. Writes: lib (org with members/admin). Personas: spaceMember.
- S: exact redirect `toHaveURL(<org profile>)`. U: `tab 'Account'` absent.

### memberships/cannot-access-other-user-account-settings.spec.ts · cannot-access-other-user-membership-settings.spec.ts · view-own-account-settings.spec.ts · view-another-user-profile-public-view.spec.ts
- All `test.skip`, comments "[BUG] in the client/server to be fixed" / "todo: the user should be a host" / "pending product decision". **No issue links** (convention §4 violation). The two "other user settings" skips mean nothing guards cross-user settings access (G3/G4 authorization).

### memberships/removed-member-cannot-access-previous-space.spec.ts
- Journeys: D7 (self-leave via UI), D8 (access lost). Title says "removed"; it is a self-leave, not an admin removal.
- Writes through UI: leave L2 membership. Seeded: L0/L1 public, L2 private with subsubspaceMember.
- Personas: subsubspaceMember.
- Strongest: post-leave reload of the private L2 → `toHaveURL(/about/)` + no-access image (S: server privilege recomputed after the UI write).
- Weak: pre-leave URL regex and heading (also match the preview, V); post-leave card negative without reload (U); Apply/Join assertion commented out "[BUG]?".

### memberships/view-home-dashboard-authenticated-user.spec.ts
- Journeys: B1. Personas: spaceMember. S: unique L0 name on /home + card link regex `.first()`; U: URL, "Recent Spaces".
- Risk: the shared persona's other memberships decide whether the seeded space is in "Recent Spaces".

### memberships/view-home-dashboard-multiple-memberships.spec.ts
- Journeys: B1. Personas: spaceAdmin (admin L0, lead L1).
- Weak: subspace asserted by non-unique literal `.first()` with a 2 s timeout (V); final `locator('text=…').first()` repeats the first check (V). Admin/Lead badges promised by comments are not asserted.

### memberships/view-organization-account-settings-as-admin.spec.ts
- Journeys: H4, G3. Personas: organizationAdmin. S: hosted space name; `getByText(/1\/3/).first()` usage (loose regex, env-dependent quota). U: 4 section labels `.first()`.

### memberships/view-organization-profile-as-admin.spec.ts · view-organization-profile-public.spec.ts
- Journeys: H2 read, H6 entry, A5. Personas: organizationAdmin / nonSpaceMember (+ anonymous via cookie clear).
- S: org h1 (regex of displayName), "Lead Spaces" contains the seeded space, admin settings link present / absent. Anonymous case's space check is commented out ("[BUG] no spaces available even the public ones") — a known product defect with no skip/issue.

### memberships/view-own-user-profile-public-information.spec.ts
- Journeys: G1, G4. Personas: spaceMember. S: own h1, Member Of lists seeded space, own settings link. U: About heading `.first()`, Profile tab.

### memberships/view-unauthenticated-user-profile.spec.ts
- Journeys: A5, G1. Personas: anonymous. S: "Access Restricted" text (3 s timeout). Scenario seeded but irrelevant to the assertion.

### explore-platform/explore-platform-anonymous.spec.ts
- Journeys: B2 (Platform navigation menu), B3 (Explore Spaces page chrome), J1 (forum landing), K1 (template library landing), A1 (sign-up form presence only).
- Writes: lib only — verified org, public L0, **innovation pack with 3 templates, platform forum discussion** — none of which any case asserts.
- Lib helpers: `TestScenarioFactory.createBaseScenario` (incl. `setupInnovationPack`, `setupPlatformDiscussion`, org verification), `cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUser`, `CommunityMembershipPolicy`, `SpacePrivacyMode`; `beforeAll` asserts `scenarioSetupSucceeded` `toBeTruthy()`.
- Personas: anonymous.
- Weakest: `7. Click on public space from Explore page` (never clicks a space; asserts Filters button + search box), `12`, `14` (opens "All" filter and asserts it is still visible), `15. Navigate to Sign Up page` (field presence), `5`, `6`, `10` — all U.
- Strongest: `1. Home page loads for anonymous user` → some public space card exists (S-weak, any env space); `4` → "No subspaces found" for the seeded space (S-weak).
- Risk: comments state the seeded space is "not reliably surfaced on page 1", so explorer listing (M3/B3) is consciously not tested.

### explore-platform/explore-platform-authenticated.spec.ts
- Journeys: B1, B2, B3, J1, K1. Writes: lib only (same heavy, unasserted seed).
- Lib helpers: as anonymous + `TestUserManager.users.organizationAdmin`; `expectOnDashboard`, `userMenuAvatar`.
- Personas: organizationAdmin.
- Weakest: `3. Click on Community tab` → `heading 'Please log in to see all contributing users' not.toBeVisible()` — stale MUI copy, can never appear (V). `1` keeps only `expectOnDashboard`; its real checks are commented out "[BUG] todo".
- Strongest: `15. Verify user profile is accessible` / `1` → `expectSignedIn` (Notifications button + no Log in + avatar) proves a valid session (S-weak).

### support-navigation/support-navigation.spec.ts
- Journeys: B2 (footer Support dialog), B6 (docs in new tab).
- Writes: lib creates org + space (`createBaseScenario({name})`) that no step uses.
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUserManager.users.nonSpaceMember`; `expectOnDashboard`.
- Personas: nonSpaceMember.
- Case `Complete Support Journey - Dashboard to Documentation to Inviting Tutorial and Back`: S = docs iframe "Welcome to Alkemio Docs" (needs server-configured docs path + docs deploy), `expectOnDashboard`. The "Inviting Tutorial" part was removed — title over-claims.
- Risk: `page.getByText('Support')` unscoped.

### support-navigation/support-navigation-additional.spec.ts
- Journeys: B2, B6. Writes: none.
- Lib helpers: `TestUserManager.users.nonSpaceMember` (fallback `globalAdmin`, then literal `'admin@alkem.io'`).
- Weakest: `Close Support Dialog` → dialog shown/hidden (U) + `expectSignedIn`.
- Strongest: `Direct Documentation Access` → iframe content heading.
- Risk: `getByRole('link', {name: 'Home'}).first()`.

### my-dashboard/my-dashboard-page-objects.ts (page objects only)
- `expectSignedIn` waits for the authenticated-only `Notifications` banner button **before** asserting `Log in` count 0 (correctly ordered; the comment cites a 6/6 false-green reproduction of the reverse order). `expectOnDashboard` adds the `Tips & Tricks` button. `verifyMyDashboardWelcomeElement` is a deprecated alias. These are session/route signals (S only for "a session exists"), not membership data.

### sidebar-search (plan + manual verification only)
- **Automated: nothing.** TC-01…TC-10 (API TC-01–05, E2E TC-06–10) are all "planned — see build sheet"; status "automation deferred" because the shared test env has no Elasticsearch. No spec file exists in the folder.
- **Covered elsewhere (claimed):** unit tests in owning repos (placement truth table, label plurals, debounce, request shaping) and the existing `server-api/…/search/search.it-spec.ts` (10-term limit). Those die with the server rewrite for the server-side parts.
- **Manual:** `sidebar-search-manual-verification.md` — SV-1…SV-15 executed on ACC 2026-09-03 by the QA lead: 14 PASS (burst ≤2 `FlowStateSearch`, `N+`→`N` convergence, literal `{{matches}}`, search on every tab, sidebar positions, draft-callout tag hidden from anonymous/non-member, `CalloutsSetTags` 194–251 ms, emptied sidebar, chips/clear, 12-word+10 tags, no cross-Space leak, new tab default, mobile drawer, live region); SV-15 FAIL (whiteboard text not searchable, server#6457, pre-existing). Migration (R1/R2) has no execution evidence beyond MAN-2/SV-5.
- Indirect automated cover: `sidebar-widgets/us1` asserts the `Search posts` searchbox is present and positioned on every tab (presence/placement only, no query).
- Migration consequence: M1/B4 (search) has **zero** Playwright protection.

### sidebar-widgets/us1-default-rendering.spec.ts
- Journeys: C11 (default per-tab sidebar), C7 (add tab via Settings › Layout), D6 (privilege gating of action widgets).
- Writes through UI: add tab "Extra" (in `beforeAll`). Seeded via lib: space + subspace + calendar event + community update + guidelines.
- Lib helpers: `TestScenarioFactory.createBaseScenario`, `UniqueIDGenerator.getID`, `getGraphqlClient` (`GetSpaceCalendarId`, `CreateCalendarEventOnCalendar`, `SendMessageToRoom`, `GetInnovationFlowStatesWithIds`), `graphqlErrorWrapper`, `testConfiguration.endPoints.graphql.private` (raw `GraphQLClient` for `SidebarGuidelinesId` query + `updateCommunityGuidelines` mutation — hand-written GraphQL strings), `deleteSpace`, `deleteOrganization`, `SidebarWidget`, `CalendarEventType` (`@alkemio/tests-lib/core/generated/alkemio-schema`), `TestUser.GLOBAL_ADMIN`, `TestUserManager.users.{spaceAdmin,spaceMember}`; local `deleteFixtureTree` (subspaces-callout helpers), `ensurePersonaState`.
- Personas: spaceAdmin (admin + lead), spaceMember.
- Strongest: `US1-AS1` (6 widgets in document order + each widget shows its seeded data + 3 absences), `US4-AS2 — a tab added through Settings > Layout stores the generic default` (API read-back of a UI write, exact `toEqual`), `FR-012 …` (admin positive controls vs member `toHaveCount(0)`).
- Weakest: `US1-AS4` Post Index dialog open/close (U part).
- Risks: serial; a failed `beforeAll` add-tab fails all 6. `trace/video: off` per file. Oracle `L0_DEFAULT_SIDEBARS` is a hard-coded copy of the server default — must be re-confirmed against the rewritten server (that is the point, but expect deliberate churn).

### sidebar-widgets/us2-admin-config.spec.ts
- Journeys: C11. Writes through UI: Layout dialog uncheck (AS2), check + keyboard reorder (AS3), uncheck-all (AS4). API-only writes: `UpdateInnovationFlowState` as member (AS5, expect `FORBIDDEN_POLICY`) and as admin with duplicate / unknown ids (AS7, expect `BAD_USER_INPUT`).
- Lib helpers: as us1 + `getGraphqlClient().UpdateInnovationFlowState`.
- Personas: spaceAdmin, spaceMember, globalAdmin (AS6).
- Strongest: `US2-AS2 — removing Upcoming Events from Home persists, stops its data request, and leaves every other tab unchanged` (API read-back + other tabs unchanged + member rendering + `SpaceCalendarEvents` operation absent, with positive control). `US2-AS3` (stored order == dialog order == rendered order). `US2-AS4` (empty list persisted, tab content still renders).
- Weakest: `US2-AS1` toggle vocabulary list comes from the client's own label map (U); selected order is S.
- Skips: `US2-AS6` `test.skip` with server#6571 link, last in file (convention-compliant).
- Risks: AS5/AS7 assert exact server error codes/messages (`FORBIDDEN_POLICY`, `"unable to grant 'update' privilege"`, `arrayUnique`, `Invalid value supplied for a GraphQL variable`) — high-value but will need rebaselining against the rewritten server's error contract. Serial: AS2→AS3→AS4 mutate the same Space; one red hides the rest. `expectInDocumentOrder` uses `elementHandle` + `compareDocumentPosition`.

### space-banner/banner-crop-default-shape.spec.ts
- Journeys: C2 (page banner), N1 (visual upload).
- Writes through UI: upload a 2000×200 PNG to Page Banner, crop, Save. Seeded: space (`space: {}`).
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUserManager.users.globalAdmin`, `createPngFixture`.
- Personas: globalAdmin.
- Case `TC-05 — first crop opens at 10:1 and saves that shape`: S = banner on the space page is an `<img>` (persisted upload) with width/height ratio 9.7–10.3; U = slider value/min/max/aria-valuetext, hint copy, Save enabled, computed `aspect-ratio` starts with `auto`.
- Risks: `pageBannerUploadButton` uses `xpath=..` from the heading. No GraphQL read-back of the visual (uri/dimensions); a client-only preview could not satisfy it though, because it navigates to the space page afresh.

### space-banner/bannerless-space-gradient.spec.ts
- Journeys: C2 (render only).
- Writes: lib (space + subspace, no banner).
- Lib helpers: `TestScenarioFactory.createBaseScenario`/`cleanUpBaseScenario`, `TestScenarioConfig`, `OrganizationWithSpaceModel`, `TestUserManager.users.globalAdmin`.
- Personas: globalAdmin.
- Cases `TC-04 …`, `TC-06 …`: S = banner element named after the server's display name, tag `DIV` (server gave no uri); U = bounding-box ratio and inline `aspect-ratio` — a client mapper rule (`resolveBannerAspectRatio`), which the server rewrite cannot break unless it starts returning a uri.

## Group summary
- **Journeys with STRONG coverage in this group:** C1 create space (user account + org account, 2 cases each), C6 delete space (mutation-level only), C11 sidebar widget configuration (default lists, admin edits with API read-back, member gating, server validation/authorization), C2/N1 page-banner upload (one case).
- **Journeys only USABLE/WEAK:** A5 anonymous/restricted access to public spaces; C3 public-privacy reads; C4 subspace listing/visibility of private L2 to non-members; E5 comment-permission gating (copy only); E8 read-only whiteboard; B2 support/help + platform navigation menu; B6 docs iframe; B3 Explore Spaces (chrome only — no listing/filter result asserted); J1/K1 landing pages (headings only); G1 lead profile (wrong/unknown user).
- **Journeys this group touches but does not really cover (in a nightly sense):** D7 leave space and D8 lost access (good spec, not registered); B1 home dashboard memberships (not registered); G1/G3/G4 profile + settings authorization (not registered, cross-user cases skipped); H2/H4/H6 org profile/account/settings access (not registered); D6 admin settings entry (not registered); M1/B4 sidebar & global search (zero automation; manual ACC run only); M3 explorer filters (not exercised); J1 seeded forum discussion and K1 seeded innovation pack (seeded, never asserted).
- **Lib helper union (deduplicated, exact names):**
  - Scenario: `TestScenarioFactory.createBaseScenario`, `TestScenarioFactory.createBaseScenarioEmpty`, `TestScenarioFactory.createBaseScenarioOrganization`, `TestScenarioFactory.cleanUpBaseScenario`, `TestScenarioConfig`, `TestScenarioNoPreCreationConfig`, `OrganizationWithSpaceModel` (`.space/.subspace/.subsubspace.{id,nameId,about.profile.{displayName,tagline}}`, `.space.communication.updatesId`, `.organization.{id,nameId,profile.displayName}`, `.scenarioSetupSucceeded`). Factory internals exercised by these configs: `ensureSpaceMembers` (self-join), `assignRoleToUser`, `updateSpaceSettings` (privacy, membership policy), `createSubspace` (L1 + L2), `createSpaceAndGetData`, `createWhiteboardCalloutOnSpace`, `createPostCollectionCalloutOnSpace`, `setupInnovationPack`, `setupPlatformDiscussion`, organization verification (`verification.setVerified`), organization `community.addMembers/addAdmin`.
  - Users/auth: `TestUserManager.users.{globalAdmin,organizationAdmin,spaceAdmin,spaceMember,subspaceAdmin,subspaceMember,subsubspaceMember,nonSpaceMember}` (`.email`, `.nameId`, `.displayName`), `TestUser` enum (`GLOBAL_ADMIN`, `SPACE_ADMIN`, `SPACE_MEMBER`, `SUBSPACE_ADMIN`, `SUBSPACE_MEMBER`, `SUBSUBSPACE_ADMIN`, `SUBSUBSPACE_MEMBER`, `ORGANIZATION_ADMIN`), `registerInKratosOrFail`, `verifyInKratosOrFail` (via `ensurePersonaState`).
  - GraphQL: `getGraphqlClient()` SDK ops `getSpaceIdByNameId`, `GetSpaceCalendarId`, `CreateCalendarEventOnCalendar`, `SendMessageToRoom`, `GetInnovationFlowStatesWithIds`, `UpdateInnovationFlowState`; `graphqlErrorWrapper` (`@alkemio/tests-lib/utils/graphql.wrapper`); `testConfiguration.endPoints.graphql.private` + raw `graphql-request` strings (`SidebarGuidelinesId` query, `updateCommunityGuidelines` mutation).
  - Deletes: `deleteSpace` (both `@alkemio/tests-lib` root and `@alkemio/tests-lib/scenario/baseFunctions`), `deleteOrganization`.
  - Utils: `UniqueIDGenerator.getID`, `createPngFixture`.
  - Generated types: `SidebarWidget`, `CalendarEventType` (`@alkemio/tests-lib/core/generated/alkemio-schema`); `CommunityMembershipPolicy`, `SpacePrivacyMode` (`@alkemio/client-lib` and `@alkemio/client-lib/dist/generated/graphql`).
  - Test-suites-local (not lib, but cross-area): `deleteFixtureTree` (subspaces-callout helpers), `ensurePersonaState` / `createAuthenticatedSessionFixture`, `deleteSpaceByNameId`, `aboutThisSpaceButton`, `expectSignedIn` / `expectOnDashboard`, `userMenuAvatar`, `signInSignUpLink`.
- **Proposed NEW journey IDs:**
  - `NEW-space-tab-navigation` — L0/L1 tab bar, About dialog, breadcrumbs as a non-member (public-space walks).
  - `NEW-private-space-preview-gate` — non-member/anonymous hitting a private L1/L2 URL gets the `/about` preview or "We are redirecting you" (currently folded under A5/C3; worth its own ID for the rewrite since it is a pure server-authorization outcome).
  - `NEW-sidebar-search-widget` — per-tab flow-state search (B4 is global search; this is distinct and has zero automation).

## Cross-cutting risks for the migration
1. **21 membership specs are not in any runner config.** They contain the group's only D7/D8 UI-write cover (`removed-member-cannot-access-previous-space`, `access-own-membership-settings`) and the private-L2 preview gate (`access-private-subsubspace-as-non-member`). Registering them (after fixing the leak-prone literal subspace names and the `isVisible().catch` negative) is the cheapest gain here.
2. **Explore/support/tab-navigation walks are ~85% U.** They will stay green on a broken server so long as the shell renders; seeded innovation pack and forum discussion are never read.
3. **Silent mis-persona:** `non-member-whiteboard-access › 3.4 Anonymous …` runs authenticated; `non-member-lead-profile-access` has no lead configured and opens an arbitrary `/user/` link.
4. **Create-space S-checks are thin:** non-exact heading match, no Hosted Spaces / GraphQL read-back, and the delete is only checked at mutation-response level.
5. **Sidebar-widgets hard-codes server defaults and error strings** — the strongest net in the group, and the one that will need deliberate rebaselining when the rewritten server's defaults or error codes change.
