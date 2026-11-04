# Feature Specification: CRD Remaining Surfaces — Test Suite Alignment

**Feature Branch**: `008-crd-remaining-ui-tests`
**Created**: 2026-06-23
**Status**: Draft
**Input**: Continue the CRD (shadcn/Radix) migration of the client-web functional-E2E suites, covering the remaining areas not handled by 005 (auth), 006 (callouts), or 007 (memberships): public-space, user-profile, space create, applications, explore-platform, support-navigation, default-template, and the home-menus root spec.

## Context

The Alkemio web client is migrating from the legacy MUI design to the new CRD
design system. The functional-E2E suites (`@alkemio/test-suite-client-web`)
were written against MUI surfaces. As with 005/006/007, this migration is
**UI-only**: URLs, GraphQL operations, permissions, validation, and behavior
are unchanged. The **test scenarios and behavioral assertions stay identical**;
only **element selectors and (where the CRD flow shape changed) interaction
steps** are re-aligned to the CRD layout, verified against a live local CRD
build at `http://localhost:3000`.

This feature covers eight remaining areas:
`public-space/`, `user-profile/`, `space/`, `applications/`,
`explore-platform/`, `support-navigation/`, `default-template/`, and the
root `home-menus.spec.ts`. It explicitly excludes the already-migrated areas
(authentication, callouts/006, memberships/007, templates-CRD) and the legacy
`templates/` suite.

The guiding principle (per the 005/006/007 precedent): preserve the 1:N
business-scenario → automation-test mapping. No covered scenario loses
coverage; no green test is silently disabled; assertions are never weakened to
force a pass. Where the CRD redesign genuinely changed a flow's shape (e.g. the
profile-settings page became an inline-edit surface, the create-space dialog
fields were renamed, space settings moved behind a banner link), interaction
steps adapt — scenarios and assertions do not.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public-space non-member navigation coverage survives (Priority: P1)

A non-member (and anonymous user) browses a public space: tabs, community,
subspaces, lead profiles, and a read-only whiteboard callout. Every MUI
scenario passes again against CRD selectors.

**Independent Test**: Run `src/functional-e2e/public-space`. The six specs
(anonymous access, edge cases, lead-profile access, subspace navigation, tab
navigation, whiteboard access) pass against CRD selectors.

**Acceptance Scenarios**:

1. **Given** a public space, **When** a non-member views the space, **Then**
   the four CRD navigation tabs (Home, Community, Subspaces, Knowledge) and the
   header affordances (Activity, Video Call, Share) are asserted via role+name.
2. **Given** the Community tab, **When** the contributors load, **Then** the
   "Community members grid" region and its member profile links are reachable.
3. **Given** the Subspaces tab, **When** a non-member opens a public subspace,
   **Then** the subspace card (an unnamed CRD link wrapping a heading) is found
   via its heading and navigation succeeds.
4. **Given** a read-only whiteboard callout, **When** a non-member expands the
   comments, **Then** the CRD permission-gating copy is asserted.

---

### User Story 2 - User-profile view/edit coverage survives (Priority: P1)

A user logs in (via the CRD header "Log in" link), views their profile-settings
page, and edits identity fields. Every MUI scenario passes against the
redesigned CRD inline-edit settings surface.

**Independent Test**: Run `src/functional-e2e/user-profile`. Access-from-
dashboard, direct-URL access, view-profile-information, and update-basic-
information pass against CRD selectors.

**Acceptance Scenarios**:

1. **Given** the login screen, **When** the suite signs in, **Then** it uses
   the CRD header `link "Log in"` (not the MUI PersonIcon menu) and dismisses
   the one-time "new design" dialog.
2. **Given** the profile settings page, **When** the suite verifies the form,
   **Then** identity fields are inline-edit buttons, social links / city / bio
   are textboxes, and the settings tabs read Profile/Account/.../Security.
3. **Given** an identity field, **When** the suite updates it, **Then** the
   inline editor commits on Enter and the new value is asserted on the field.

---

### User Story 3 - Space creation coverage survives (Priority: P1)

A platform/org admin creates a Space from the account "Hosted Spaces" section
via the CRD "Create new Space" dialog, and deletes it via the CRD Account-tab
"Danger Zone" → alertdialog. Every MUI scenario passes.

**Independent Test**: Run `src/functional-e2e/space`. The user-account and
organization-account create suites pass against CRD selectors.

**Acceptance Scenarios**:

1. **Given** the account page, **When** the suite opens the create dialog,
   **Then** it clicks the CRD "Create Space" button (not the old generic
   "Add"), avoiding the "Add Contributor" control.
2. **Given** the create dialog, **When** the suite fills fields, **Then** it
   targets CRD names (Name */URL */Tagline, "Create Space" submit, terms and
   tutorials checkboxes with their CRD copy).
3. **Given** a created Space, **When** the suite cleans up, **Then** it deletes
   via the Account tab "Delete this Space" → Radix alertdialog "Delete Space".

---

### User Story 4 - Applications, explore, support, default-template, home-menus coverage survives (Priority: P2)

The remaining smaller areas — applying to a space, exploring the platform,
support navigation, the default template flow, and the home menus — pass
against CRD selectors with unchanged scenarios.

**Independent Test**: Run each of `applications/`, `explore-platform/`,
`support-navigation/`, `default-template/`, and `home-menus.spec.ts`.

**Acceptance Scenarios**:

1. **Given** each area, **When** its specs run against CRD, **Then** the MUI
   selectors are re-expressed as CRD role+name/label strategies and the
   scenarios pass (or, where a real product defect blocks a scenario, the test
   is left failing and the defect recorded).

---

### Edge Cases

- **A MUI selector has no direct CRD equivalent** (e.g. `PersonIcon`,
  `LockOutlinedIcon`, `Card banner:` link names, the URL "N / 25" counter): the
  selector is re-expressed via a CRD-valid strategy without dropping the
  assertion; if no stable hook exists, the gap is recorded in the contract gap
  log rather than masked.
- **A flow's shape changed**: profile settings became inline-edit (no bottom
  Save); the create-space success modal was removed (routes straight to the
  Space); space settings moved behind a banner `link "Settings"`; deletion
  confirmation is a Radix `alertdialog` with no checkbox. Steps adapt;
  scenarios/assertions do not.
- **Hrefs are absolute** (`http://localhost:3000/user/...`): CSS prefix
  matchers (`[href^="/user/"]`) must use substring (`[href*="/user/"]`).
- **Transient toasts** (e.g. "User updated successfully"): assert the
  deterministic committed state alongside, since the toast auto-dismisses.
- **Shared-stack capacity**: account "Spaces capacity" (N/3) can fill from
  prior create tests whose delete step failed under the old MUI flow; left-over
  orphans block the create dialog until cleared.
- **Kratos login flake**: a transient "Preparing secure sign-in…" stall is
  absorbed by `--retries=2` (flaky-but-passed ≠ failure).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The active functional-E2E suites in the eight target areas MUST
  continue to pass against a CRD client build, with no reduction in the set of
  automated scenarios.
- **FR-002**: Every selector used by the active suites MUST resolve against the
  CRD layout, replacing MUI-only hooks (`PersonIcon`, `LockOutlinedIcon`,
  `Card banner:`/`Avatar X` link names, `[data-testid]` icons, `tab "Settings"`
  on the space page) with CRD-valid strategies (ARIA role + accessible name,
  label, `data-slot`, or stable test id).
- **FR-003**: Page objects and helpers (the `space/pages/*` objects:
  HomePage, MyAccountPage, OrganizationAccountPage, CreateSpaceDialog,
  SpacePage, SpaceSettingsPage) MUST reflect the CRD flow and step model.
- **FR-004**: The suite MUST preserve the existing 1:N scenario→test mapping —
  no covered scenario loses its test; no green test is disabled or skipped.
- **FR-005**: Behavioral assertions MUST remain identical to the pre-migration
  assertions; the underlying behavior is unchanged.
- **FR-006**: Selectors MUST prefer language-stable, accessibility-aligned
  strategies and replace positional selectors where a stable role/name exists.
- **FR-007**: Page objects and area docs MUST be updated to reflect the CRD UI.
- **FR-008**: Any selector gap (a CRD surface lacking a stable accessible hook
  needed for an existing scenario) MUST be recorded in the contract gap log.
- **FR-009**: Where the CRD flow shape changed, tests MAY adapt interaction
  steps but MUST NOT alter the scenario, coverage, or behavioral assertions.
- **FR-010**: When a scenario fails against correct CRD selectors due to a real
  product defect, the test MUST be left failing and the defect recorded as a
  probable product bug — never weakened to force a pass.
- **FR-011**: `test.skip`/`@bug` tests keep their selectors migrated but are not
  re-activated.
- **FR-012**: The suites MUST run via the existing client-web Playwright path
  (Chrome branded channel), runnable both per-file and per-directory.

### Key Entities

- **Target suites**: `public-space/` (6), `user-profile/` (4), `space/` (2 +
  page objects), `applications/` (2), `explore-platform/` (2),
  `support-navigation/` (2), `default-template/` (1), and `home-menus.spec.ts`.
- **Space page objects**: `space/pages/{HomePage,MyAccountPage,
  OrganizationAccountPage,CreateSpaceDialog,SpacePage,SpaceSettingsPage}.ts`
  (the locus of most space-area selector changes). `space/pages/LoginPage.ts`
  is already hardened and out of scope.
- **CRD surfaces**: the space page (tabs/sidebar/banner), the community members
  grid, the subspaces grid, the profile inline-edit settings page, the
  create-space dialog, and the space settings (Danger Zone) surface.
- **Test data**: `TestScenarioFactory` scenarios and test users — unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the active scenarios across the eight areas pass against a
  CRD build, except those left failing for a recorded probable product bug.
- **SC-002**: Zero active scenarios are removed, skipped, or disabled relative
  to the pre-migration suite.
- **SC-003**: Every page-object getter/helper used by an active suite resolves
  to exactly one element on its CRD surface.
- **SC-004**: All MUI-only selectors in the eight areas are removed.
- **SC-005**: Behavioral assertions produce the same pass/fail outcomes for the
  same inputs as against MUI.
- **SC-006**: Position-based and broad-regex selectors are reduced; remaining
  ones are annotated.
- **SC-007**: Every CRD selector gap and every probable product bug is captured
  in the contract gap log; the counts are reported at verification.

## Assumptions

- The CRD migration preserves URLs, GraphQL operations, permissions,
  validation, and behavior; only the rendered UI changes.
- A live CRD build serves at `http://localhost:3000` for verification.
- The default test-environment language is English.
- CRD surfaces follow the design system's accessibility commitments, providing
  accessible names/roles to target.

## Out of Scope

- Any change to the Alkemio client application itself.
- New scenarios beyond what the current suites automate.
- Authentication, callouts (006), memberships (007), templates-CRD, and the
  legacy `templates/` suite; `space/pages/LoginPage.ts` (already hardened).
- Server-api suites and the shared `@alkemio/tests-lib` package.
- Accessibility, performance, and visual-regression testing.
