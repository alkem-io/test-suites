# CRD Membership Selector Contract & Gap Log

For a UI-test feature there is no API contract. The analogous "contract" is the set of **stable, accessible hooks the CRD membership surfaces must expose** so the inline-locator `memberships` suite can target them without brittle selectors. This file is both the target contract and the running **gap log** required by FR-008 / SC-007: any required hook the CRD build does not provide — or any scenario that fails for a genuine product reason — is recorded here as a finding rather than worked around silently.

Selector priority (per client-web `src/crd/CLAUDE.md`): `getByRole(role, { name })` → `getByLabel` / `getByPlaceholder` → `data-slot` → `data-testid` (last resort; CRD primitives expose no test ids).

This is the second area migrated under the `006-crd-callout-ui-tests` precedent (callouts, green). The shared `LoginPage` hardening and the `--workers=1 --retries=2` run profile carry over unchanged. Unlike callouts, the `memberships` suite has **no shared page object** — every spec uses inline locators, so the contract below is organised by surface and each spec was edited in place.

## MUI-era selectors eliminated (SC-004)

These legacy hooks were removed from the membership suite and replaced with CRD-valid strategies (all confirmed against the live CRD build, 2026-06-23):

| Legacy selector | Where it was | CRD replacement | Status |
|---|---|---|---|
| `[data-testid="SettingsOutlinedIcon"]` (user profile) | `view-own-user-profile-public-information`, `view-another-user-profile-public-view` | `getByRole('link', { name: /Open user settings/i })` → `/user/<id>/settings/profile` | OK |
| `[data-testid="SettingsOutlinedIcon"]` (org profile) | `view-organization-profile-as-admin`, `view-organization-profile-public` | `getByRole('link', { name: /Open organisation settings/i })` | OK |
| `[data-testid="SettingsOutlinedIcon"]` (space/subspace banner) | `access-space-settings-*`, `access-subspace-settings-*`, `access-private-subsubspace-*`, `removed-member-*` | `getByRole('link', { name: 'Settings' })` (banner link → `/<nameId>/settings`) | OK |
| `getByRole('button', { name: 'Settings', exact: true })` (subspace) | `access-subspace-settings-*` | `getByRole('link', { name: 'Settings' }).first()` (the `button "Settings"` is now a callout 3-dot menu) | OK |
| `[data-testid="CloseIcon"]` | `access-private-subspace-in-private-space-non-member` | `getByRole('button', { name: 'Close' })` (about/preview dialog) | OK |
| `[data-testid="LockOutlinedIcon"]` | `access-private-subsubspace-as-non-member`, `removed-member-*` | `getByText(/Private/i)` (Lock icon is `aria-hidden`; privacy label is the accessible hook) | UNVERIFIED — see Gap #3 |
| `page.locator(\`text=${name}\`)` / `getByText(/My Spaces\|Spaces/i)` | `view-home-dashboard-authenticated-user` | `getByRole('heading', { name: /Recent Spaces/i })` + `getByRole('link', { name: <space> })` | OK |
| `getByRole('heading', { name: /Bio/i })` (user) | `view-own-user-profile-public-information`, `view-another-user-profile-public-view` | `getByRole('heading', { name: /About/i })` (user sidebar is "About"; only the **org** sidebar is "Bio") | OK |
| `getByRole('heading', { name: /Spaces.*/i \| /Spaces we lead/i })` | profile specs | `getByRole('tab', { name: ... })` then click — spaces live under resource **tabs**, not headings | OK |
| `getByRole('button', { name: /contributors/i })` | `access-private-subsubspace-as-member`, `removed-member-*` | `getByRole('button', { name: 'Community', exact: true })` | OK |
| `getByRole('button', { name: 'Leave' })` (direct, on card) + plain `dialog` confirm | `access-own-membership-settings`, `removed-member-*` | kebab `button "More actions"` → `menuitem /Leave/i` → `alertdialog` confirm `button "Leave"` | OK |
| `getByText(/Here you can edit.*profile details/i)` (settings copy) | `view-own-user-profile-public-information`, `view-organization-profile-as-admin` | `getByRole('tab', { name: /Profile/i })` (settings page tabstrip; the MUI subtitle copy is gone) | OK |
| `getByRole('heading', { name: 'Details' })` (subspace settings) | `access-subspace-settings-*` | `getByRole('heading', { name: 'Space Name' })` (the legacy "Details" heading is gone) | OK |
| `getByText(/We are redirecting you/i)` + `button /Go now/i` (org account) | `cannot-access-organization-account-settings-non-admin` | direct `toHaveURL(/organization/<id>)` redirect assertion (CRD redirects immediately, no modal) | OK |

## Confirmed CRD hooks per surface (live build, 2026-06-23)

### User profile page (`/user/<nameId>`) — spec 096

| Element | Confirmed hook | Status |
|---|---|---|
| Name (hero) | `heading [level=1]` name = displayName | OK |
| Public "Bio" section | `heading [level=2]` `About` (sidebar) — **not** "Bio" | OK |
| Organisations section | `heading [level=2]` `Organisations` (sidebar) | OK |
| Resource sections | `role=tablist "Resource sections"` with `tab` `Resources Hosted` (default), `Leading`, `Member Of` | OK |
| Membership space | appears under the `Member Of` tab (click required) — **only for the profile owner / self** (see Gap #1) | ALT |
| Settings entry | `link` `Open user settings` → `/user/<id>/settings/profile` (absent on other users' profiles) | OK |

### Organization profile page (`/organization/<nameId>`) — spec 096

| Element | Confirmed hook | Status |
|---|---|---|
| Name (hero) | `heading [level=1]` name = displayName | OK |
| "Bio" section | `heading [level=2]` `Bio` (org sidebar; differs from user "About") | OK |
| Resource sections | `tablist "Resource sections"`: `Resources Hosted` (default), `Lead Spaces`, `All Memberships` | OK |
| Lead space | appears under the `Lead Spaces` tab (click required); org lead spaces ARE public | OK |
| Settings entry | `link` `Open organisation settings` (absent for non-admins / unauthenticated) | OK |

### Contributor settings page (`/user/<id>/settings/*`, `/organization/<id>/settings/*`) — specs 097 / 045

| Element | Confirmed hook | Status |
|---|---|---|
| Settings tabstrip | `tab` `Profile`, `Account`, `Membership`, `Organisations`, `Notifications`, `Settings`, `Security` | OK |
| "settings page is shown" proxy | `getByRole('tab', { name: /Profile/i })` | OK |
| Non-admin denied org account settings | redirect to `/organization/<id>`; the `tab "Account"` is absent | OK |

### Member-settings "Membership" tab (leave flow) — specs 094 / 084

| Element | Confirmed hook | Status |
|---|---|---|
| Section heading | `heading` `My Memberships` | OK |
| Search (narrows the card grid) | `getByPlaceholder('Search memberships...')` | OK |
| Membership card link | `link` name = space displayName | OK |
| Per-card actions | `button` `More actions` (kebab) | OK |
| Leave action | `menuitem` `/Leave/i` (label is `Leave {{type}}`, e.g. `Leave Space`) | OK |
| Leave confirmation | `role=alertdialog` `Leave this membership?`, confirm `button` `Leave` (Radix alertdialog, not `dialog`) | OK |
| Pending applications | `heading` "Pending Applications" (read-only) | OK (not exercised) |

### Space / subspace page banner — specs 045 / 103

| Element | Confirmed hook | Status |
|---|---|---|
| Settings entry | `link` `Settings` → `/<nameId>/settings` (admins only; absent for plain members) | OK |
| Full member access proxy | `button` `Community` (replaces legacy `/contributors/i`) | OK |
| Callout 3-dot menu (distractor) | `button` `Settings` — **not** the settings entry; use the `link` to disambiguate | OK |

### Home dashboard (`/home`) — spec 041

| Element | Confirmed hook | Status |
|---|---|---|
| My-spaces section | `heading [level=2]` `Recent Spaces` | OK |
| Membership space card | `link` name = space displayName (e.g. `Private l0-memberships-…`) | OK |

### Private-space access-control — specs 087 / 095 / 088

| Element | Confirmed hook | Status |
|---|---|---|
| Auto-redirect dialog (private → parent) | `dialog` `We are redirecting you...` (countdown), `button` `Go now` | OK |
| About / preview dialog (parent reached) | `dialog` titled with the space nameId, `heading [level=2]` = nameId, `button` `Close`, `button` `Apply`, `heading` `Hosted by` | OK |
| Apply / join affordance | `getByRole('button', { name: /Apply\|Join\|Sign in/i })` (preview dialog) | OK (where preview renders) |
| Unauthenticated access-restricted | `getByText(/Access Restricted/i)`, `link "Sign in / Sign up"`, `link "Return to Dashboard as guest"` | OK |

## Gap Log (FR-008 / SC-007)

A `GAP` is a CRD surface lacking a stable hook needed to assert an existing scenario, **or** a scenario that still fails because the underlying product behaviour is broken/changed (not a selector problem). No gap is hidden behind a position-based or copy-fragile selector.

| # | Surface / element | Finding | Proposed follow-up | Status in suite |
|---|---|---|---|---|
| 1 | User profile → "Member Of" tab, viewed by **another** user | A viewer sees **"No memberships yet"** on another user's profile — the membership spaces a contributor belongs to are not exposed to non-self viewers. The scenario `View Another User Profile - Public View` (`@bug`) asserts the member's space is visible; it is not. | Product decision: confirm whether another user's space memberships should be publicly visible. If yes, this is a product bug (data not surfaced); if no, the legacy scenario expectation is wrong and the test should be revised (out of scope here — `@bug`). | **FAILING — probable product bug.** Selectors fully migrated; left failing per the `@bug` rule. |
| 2 | Private subspace/subsubspace **about-preview** for a non-member (parent public, child private) | Navigating to `…/<child>` redirects to `…/<child>/about` (URL correct) but the page renders **"Page not found"** (`heading [level=1]`) instead of the about-preview dialog with Apply + privacy indicator. Affects `access-private-subsubspace-as-non-member` and `removed-member-cannot-access-previous-space` (`@bug`). The sibling case where the **parent is private** (`access-private-subspace-in-private-space-non-member`) DOES render the preview correctly — so the break is specific to the deeper private-child-under-public-parent preview. | Likely a product bug in the CRD subspace about-preview routing/authorization for nested private spaces. File against client-web (spec 087/095). | **FAILING — probable product bug.** All earlier steps (member access, full leave flow) pass; fails only on the missing preview. |
| 3 | Private-space privacy indicator (Lock) | The CRD Lock icon is `aria-hidden="true"` with an sr-only "Private space" / "Private" label; there is no role+name hook. The suite targets `getByText(/Private/i)`, which is language-sensitive. This assertion is also **unverified live** because both specs that reach it (Gap #2) 404 before getting there. | Request an accessible name on the privacy indicator (or a `data-slot`) so the check is language-stable; verify once Gap #2 is fixed. | Coded as `getByText(/Private/i)`; not reached at runtime (blocked by Gap #2). |
| 4 | Comment/preview privacy & the "Member Of" data for self | (informational) Self-profile membership data DOES render under "Member Of"; org lead-spaces DO render under "Lead Spaces". Documented to contrast with Gap #1. | — | OK |

### Position-based selectors remaining (SC-006)

`.first()` is retained only where the CRD surface genuinely renders duplicates and the role+name is otherwise unambiguous:
- membership-card `More actions` / membership-card `link` after a `Search memberships...` filter narrows the grid to one space (the filter makes `.first()` deterministic);
- `getByRole('link', { name: 'Settings' }).first()` on the subspace banner (a second `…/settings/layout` link can coexist);
- `getByRole('button', { name: 'Community', exact: true }).first()` (duplicate Community affordances in tab + content).

Each is annotated in-spec. All legacy `text=`/`.last()`/`.nth()` and the `[data-testid="*Icon"]` hooks were removed.

## Result (SC-001 / SC-002)

Full-directory run (`playwright test src/functional-e2e/memberships --workers=1 --retries=2`):

**17 passed · 3 failed · 3 skipped** (baseline was 5 / 15 / 3).

- All 3 failures are **probable product bugs** (Gap #1, #2), not selector defects — each advances past every migrated selector and fails on a genuine product behaviour. Two are `@bug`-tagged; per FR-009 they are migrated but left failing.
- The 3 skipped specs (`view-own-account-settings`, `cannot-access-other-user-account-settings`, `cannot-access-other-user-membership-settings`) remain `test.skip` — untouched, not re-activated (FR-009).
- No active scenario was removed, weakened, or disabled (SC-002 / FR-004).

**GAP count reported (SC-007): 3** (#1, #2, #3); #4 is informational/OK.
