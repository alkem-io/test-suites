# CRD Remaining-Surfaces Selector Contract & Gap Log

For a UI-test feature there is no API contract. The analogous "contract" is the
set of **stable, accessible hooks the CRD surfaces must expose** so the suite can
target them without brittle selectors. This file is both the target contract and
the running **gap log** (FR-008 / SC-007): any required hook the CRD build does
not provide, and any probable product bug found during alignment, is recorded
here rather than worked around silently.

Selector priority: `getByRole(role, { name })` → `getByLabel`/`getByPlaceholder`
→ `data-slot` → `data-testid` (last resort). All names below were **confirmed
against the live local CRD build** (`http://localhost:3000`).

---

## Confirmed CRD selectors per area

### Cross-cutting (space page + login)

| Surface / element | CRD selector | Note |
|---|---|---|
| Space navigation tabs | `tab` "Home" / "Community" / "Subspaces" / "Knowledge" | only four tabs |
| Activity (header) | `button "Activity"` (space) / `button "Recent activity"` exact (subspace) | not a tab |
| Video call (header) | `link "Video Call"` (space) / `link "Start video call"` (subspace) | not a tab |
| Share (header) | `button "Share"` | not a tab |
| Space tagline | `paragraph` / `getByText(tagline)` | was a heading |
| Space sidebar | `navigation "Space sidebar"` (space) / `complementary "SubSpace sidebar"` | |
| Space Leads section | `getByText('Space Leads')` in sidebar | |
| Contact Leads | `button "Contact Leads"` | was "Contact the Leads" |
| Community members | `region "Community members grid"`; member links via `a[href*="/user/"]` | hrefs absolute |
| Subspaces grid | `region "Subspaces grid"`; card = unnamed `link` filtered by its `heading` | |
| Nested sub-subspace (subspace sidebar) | `link` name `/<displayName>.*Private/` | |
| Subspace About | `button "About this Subspace"` (sidebar) | |
| Subspace community/contributors | `button "Community"` (Quick Actions) | was "Contributors" |
| Innovation flow phases | `button "Switch to phase <Name>"` in `navigation "Innovation flow phases"` | was "Current Phase: X" |
| Space settings entry | `link "Settings"` in the space banner | was `tab "Settings"` |
| Space settings tabs | `tab` About/Layout/Community/Updates/Subspaces/Templates/Storage/Settings/Account | |
| Login (header) | `link "Log in"` (exact) | was MUI PersonIcon + "Log In \| Sign Up" menuitem |
| Post-login design dialog | `button /take me to the new design/i` (dismiss if present) | one-time |
| Comment thread (collapsed) | `button /Expand comments/i` then read gating copy | 020 callout-collapse |
| Non-member comment gating copy | `getByText("You don't have permission to comment, reply or react here.")` | reworded |
| Whiteboard callout open | `link /Open .*whiteboard callout/` | heading click no longer opens it |

### user-profile (settings/profile page)

| Element | CRD selector | Note |
|---|---|---|
| Settings tabs | `tab` Profile / Account / Membership / Organisations / Notifications / Settings / Security | "My profile"→"Profile"; "organizations"→"Organisations" |
| Avatar editor | `heading "Profile Picture"` + `button "Change Avatar"` | was `img "Not yet set"` + `button "Edit"` |
| Identity fields | `button "Display Name"` / `"First Name"` / `"Last Name"` / `"Phone"` / `"Tagline"` | inline-edit buttons (not textboxes) |
| Inline edit | click the field button → `textbox` (same name) appears → fill → Enter commits | no bottom "Save" |
| City | `textbox "City"` | |
| Country | unnamed `combobox` under `getByText('Country')` | **GAP**: no accessible name |
| Bio | `textbox "Formatting toolbar"` | was "Markdown editor" |
| Skills | `textbox "e.g. UX research, TypeScript, facilitation"` | |
| Social links | `textbox "LinkedIn"` / `"Bluesky"` / `"GitHub"` | was Linkedin/BlueSky/Github |
| Email | `textbox "Email"` | was "Mail" |
| References | `button "Add another reference"`; `getByText('No references yet')` | was "Add Reference" |
| Account menu (dashboard) | `link "My Account"` | unchanged |
| Save toast | `getByText('User updated successfully')` | transient — assert committed value too |

### space (create + delete, via page objects)

| Element | CRD selector | Note |
|---|---|---|
| Hosted Spaces section | `getByText('Hosted Spaces').first()` | heading name unreliable (nests "Create Space"/"Create New Space") |
| Open create dialog | `button "Create Space"` | was generic `button "Add"` (which hit "Add Contributor"→VC dialog) |
| Create dialog | `dialog "Create new Space"` | was "Create a new Space" |
| Template | `button "Choose a template"` | was "Change Template" |
| Name | `textbox "Name *"` | was "Title *" |
| URL | `textbox "URL *"` | |
| Tagline | `textbox "Tagline"` | |
| Description | `textbox "Formatting toolbar"` | rich text |
| Tags | `textbox "Add a tag and press Enter"` | was `combobox "Tags"` |
| Upload | `button /Upload .* banner/` (page banner / card banner) | was generic "Upload" |
| Tutorials | `checkbox "Add Tutorials and example posts to this Space"` | reworded |
| Terms | `checkbox "I accept the terms and conditions for creating a Space."` | reworded |
| Submit | `button "Create Space"` (scoped to dialog) | was "Create" |
| Cancel | `button "Cancel"` (+ Escape fallback) | |
| Close (X) | last `button` in dialog (unnamed icon) | **GAP**: no accessible name |
| Post-create success modal | none (routes straight to Space) | was "Your Space is Ready" / "Get Started" |
| Space delete | banner `link "Settings"` → `tab "Account"` → Danger Zone `button "Delete this Space"` | |
| Delete confirm | `alertdialog "Delete Space"` → `button "Delete Space"` | was checkbox + "Yes, delete" |

### public-space

Covered by the cross-cutting table above (tabs, members grid, subspaces grid,
Space Leads, whiteboard open + comment expand, subspace phase/affordance names).

### applications (community settings + apply flow)

| Element | CRD selector | Note |
|---|---|---|
| Login (multi-user) | `loginViaCrd()` helper (in-SPA "Log in" link) | direct `/login` does not init Kratos |
| Apply | `button "Apply"`; pending → disabled `button "Application pending"` | |
| Questionnaire dialog | `heading "Apply to"` (level 2); answer textbox by its question label | |
| Apply success | `dialog "Application submitted"` / `heading "Application submitted"` | was "Thanks for applying to our community!" |
| Space settings entry | banner `link "Settings"` (→ `/<space>/settings`) | was `SettingsOutlinedIcon` |
| Settings container | (none needed) | was `data-testid="space-settings"`/`subspace-settings` |
| Community settings tab | `tab "Community"` | |
| Pending section | `heading "Pending Memberships"` | was text "Pending applications & invitations" |
| Applications list | semantic `table` / `row` | was `data-testid="communityMemberships"` + `.MuiDataGrid-root` |
| Application row | `getByRole('row').filter({ hasText: '<applicant>' })` | was `.MuiDataGrid-root role=row .last()` |
| Row status | text "Application received" / "approved" / "rejected" | was capitalised "Application Received" etc. |
| Row actions | `button "Approve"` / `"Reject"` / `"View application"` / `"Delete"` | was `Reject application`/`VisibilityOutlinedIcon`/`CheckCircleOutlineIcon`/`Delete` |
| Confirmation | `alertdialog` (reject/archive) | was `dialog` |
| Notifications bell | `button "Notifications"` | was "Notifications Button" |

### explore-platform

| Element | CRD selector | Note |
|---|---|---|
| Anon home | routes to `/spaces` explorer (`heading "Explore Spaces"`) | legacy "Explore Spaces of Your Interest" dashboard gone for anon |
| Spaces list | `list "spaces"`; card = unnamed `link` wrapping article + level-3 heading | |
| Spaces search | `textbox "Search spaces..."` | not a `searchbox` role |
| Spaces filter | `button "Filters"` | was "All Spaces"/"Public Spaces" toggle buttons |
| Empty subspaces | `heading "No subspaces found"` | was text "No Subspace found." |
| Anon community | `region "Community members grid"` + header `link "Log in"` | was heading "Please log in to see all contributing users" |
| Tools menu | `button "Platform navigation"` → `menu` with `link` items | was `button "Tools Menu"` + `menuitem`s |
| Template library | `heading "Innovation Library"`; `region "Templates"` + dropdown filter `getByText('All')` | was "Alkemio's Template Library" + per-type filter buttons |
| Sign up page | `heading "Sign up"` (no "Welcome to Alkemio!"); terms checkbox `/I accept the.*Terms of Use/i`; fields enabled (not disabled-until-terms) | |

### support-navigation / default-template / home-menus

- `support-navigation`: requires a running documentation service (iframe at
  `/documentation`); doc-flow assertions depend on it being available.
- `default-template`: uses MUI sortable flow-state cards
  (`.MuiPaper-root[aria-roledescription="sortable"]`) + `menuitem "Set Default
  Post Template"` — a CRD-redesigned settings surface needing per-flow probing.
- `home-menus.spec.ts`: `test.describe.skip` — login preamble selectors
  migrated only (PersonIcon → `link "Log in"`); suite not re-activated.

---

## Gap Log (missing accessible hooks)

| # | Area | Gap | Impact / workaround |
|---|---|---|---|
| G1 | user-profile | Country field is an unnamed `combobox` (no `aria-label`/accessible name) | Asserted via the adjacent `getByText('Country')` label instead of the control. Request an accessible name. |
| G2 | space create | Create-dialog Close (X) is an unnamed icon button | Targeted as the dialog's last `button`; Escape used as the reliable dismiss. Request `aria-label="Close"`. |
| G3 | space create | No "N / 25" URL character-count indicator on the CRD dialog | The URL-length rule is verified via the Create button staying disabled (the behavioral outcome); the visual counter assertion was dropped. |
| G4 | public-space (whiteboard) | Non-member gating copy only appears after expanding the (collapsed) comment thread | Tests expand comments first; this is the 020 callout-collapse behavior, not a gap per se. |
| G5 | explore-platform (contributors) | The authenticated `/contributors` page did not render the legacy headings ("Find talent and expertise!", "Users", "Virtual Contributors", "Organizations"); a reliable CRD DOM could not be captured (page content was empty/slow in the a11y snapshot). | Auth test 8 left failing pending the CRD contributors-page selectors; not migrated to avoid guessing. |
| G6 | applications (admin) | The "View application" dialog's internal Approve/Reject buttons and the admin notification-navigation panel could not be reliably mapped. | Admin tests 2.3/2.4/2.5 (both levels) left failing; row-level Approve/Reject/Delete (2.1/2.2) ARE migrated and green. |
| G7 | support-navigation | Requires a running documentation service (iframe); the 3 doc-flow tests fail when it is absent/partial in the local stack. | Environment dependency, not a selector gap. |
| G8 | default-template | Flow-state cards remain MUI sortable (`.MuiPaper-root[aria-roledescription="sortable"]`) + `menuitem "Set Default Post Template"`; the CRD redesign of this settings surface was not mapped. | 1 spec left failing pending the CRD flow-state-menu selectors. |

## Probable Product Bugs (left failing per FR-010)

| # | Area / test | Symptom | Notes |
|---|---|---|---|
| B1 | public-space `non-member-subspace-navigation.spec.ts` 5.2 (private sub-subspace) | Clicking a **private** sub-subspace card as a non-member navigates to a **malformed, doubled** URL (`.../opportunities/<id>/http://localhost:3000/.../about`) and lands on a "Page not found" 404 — instead of showing the gated About view. | The card href is absolute; the private-space About redirect concatenates it against the current path. Selector migration is correct; the failure is a CRD routing defect. Test left failing. |
