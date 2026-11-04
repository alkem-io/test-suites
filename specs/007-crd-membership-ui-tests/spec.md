# Feature Specification: CRD Memberships — Test Suite Alignment

**Feature Branch**: `007-crd-membership-ui-tests`
**Created**: 2026-06-23
**Status**: Draft
**Input**: User description: "UI changes to the membership, dashboard, profile, and settings-access surfaces (CRD redesign) while preserving existing functionality, aligned with client-web specs/084-crd-pending-memberships-dialog/, specs/094-crd-member-settings-dialog/, specs/088-crd-space-apply-button/, specs/087-crd-space-about-dialog/, specs/096-crd-user-pages/, specs/097-crd-user-settings/, specs/041-crd-dashboard-page/"

## Context

The Alkemio web client is migrating the surfaces exercised by the `memberships` functional-E2E suite — the home dashboard membership cards, user/organization profile pages, space/subspace settings access, private-space access-control (preview, redirect, access-restricted), the leave/apply/join membership lifecycle, and account/organization settings — from the legacy MUI design to the new CRD design system. Per the relevant client-web specs, this migration is **UI-only**: URLs, GraphQL operations, the permission/authorization model, redirect behavior, and access-control outcomes are unchanged.

This feature concerns the **QA test suite** (`@alkemio/test-suite-client-web`), not the client application. The existing `client-web/src/functional-e2e/memberships/` suite (21 spec files) was written against the MUI screens. Unlike the callouts suite, it has **no central page object** — each spec uses inline locators. Because the UI is changing while behavior is preserved, the **test scenarios and coverage must remain unchanged**, but the **inline selectors and any UI-shape assertions must be re-aligned** to the CRD layout so the suite keeps passing.

This is the second area migrated under the pattern established by `006-crd-callout-ui-tests` (callouts, verified green). The shared `LoginPage` hardening and the `--workers=1 --retries=2` run profile from `006` carry over and are relied upon here.

The guiding principle (per the 005/006 precedent): a 1:N mapping of business scenario → automation test must be preserved. No covered scenario may lose coverage, and no previously-green test may be silently disabled. Tests already marked `skip`/`@bug` stay as they are (they are out of scope to re-activate). Where the CRD redesign changed the **shape of a flow**, a test may adapt its **interaction steps** — never its scenario, coverage, or behavioral assertions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Membership display coverage survives the CRD migration (Priority: P1)

The QA engineer runs the dashboard and profile membership-display suites against a CRD-enabled client. The home dashboard showing a user's space memberships (single and multi-level), and the user/organization profile pages showing the spaces a contributor belongs to or leads, all pass against the new layout via CRD-valid selectors.

**Why this priority**: These are the highest-frequency, read-only surfaces and the clearest expression of "memberships" in the UI; they gate the perception that the redesign preserves a user's affiliations.

**Independent Test**: Run `view-home-dashboard-*.spec.ts` and `view-*-user-profile-*.spec.ts` / `view-organization-profile-*.spec.ts` against a CRD build. Membership cards and profile space sections resolve and the documented names appear.

**Acceptance Scenarios**:

1. **Given** the CRD home dashboard, **When** the suite locates a user's space membership card(s), **Then** each is found via a CRD-valid selector (role + accessible name / text) without `text=`-locator or MUI-only markup, for both single and multiple memberships.
2. **Given** a CRD user or organization profile, **When** the suite asserts the profile heading and the spaces/"spaces we lead" sections, **Then** they resolve via CRD-valid selectors and the expected space names are visible.
3. **Given** an unauthenticated visitor to a profile, **When** the suite checks access, **Then** the same access-restricted outcome is asserted via a CRD-valid selector.

---

### User Story 2 - Settings & private-space access-control coverage survives (Priority: P1)

The QA engineer runs the settings-access and private-space suites. Space/subspace settings reachable by admins but not members, private subspace access for members vs. non-members vs. unauthenticated (preview, redirect-to-restricted, guest link), and the access-restricted screens all behave identically against the CRD layout.

**Why this priority**: Authorization boundaries are the core risk of the suite; a broken selector here can mask a real access-control regression, so these must remain trustworthy.

**Independent Test**: Run `access-space-settings-*.spec.ts`, `access-subspace-settings-*.spec.ts`, `access-private-sub*.spec.ts` against a CRD build. Positive and negative access assertions hold via CRD-valid selectors.

**Acceptance Scenarios**:

1. **Given** a space admin, **When** the suite opens settings, **Then** the settings entry point is located via a CRD-valid selector (replacing `[data-testid="SettingsOutlinedIcon"]`) and the settings layout/tabs resolve.
2. **Given** a space member, **When** the suite checks for the settings entry point, **Then** its absence is asserted via the same CRD-valid strategy.
3. **Given** a private subspace, **When** a member / non-member / unauthenticated visitor navigates to it, **Then** member access, the redirect-to-restricted, the preview-with-Apply, the privacy indicator (replacing `[data-testid="LockOutlinedIcon"]`), and the guest link are each asserted via CRD-valid selectors with unchanged outcomes.

---

### User Story 3 - Membership lifecycle coverage survives (Priority: P2)

The QA engineer runs the leave / removed-member / apply-join suites. Leaving a space (and nested subspace), losing access after removal, and the apply/join button states all pass against the CRD layout, adapting to any flow-shape changes (e.g. a leave confirmation, the apply/join button state machine, the pending-memberships dialog).

**Why this priority**: These are write/transition flows with the most CRD-reshaped surfaces (member settings dialog, apply button states, confirmation dialogs); they depend on display and access-control alignment (P1).

**Independent Test**: Run `access-own-membership-settings.spec.ts`, `removed-member-cannot-access-previous-space.spec.ts`, and the apply/join assertions in the private-subspace specs against a CRD build. Leave, post-removal access loss, and apply/join states pass.

**Acceptance Scenarios**:

1. **Given** a member on their memberships view, **When** the suite leaves a space/subspace, **Then** the Leave control and any confirmation are located via CRD-valid selectors and the membership is removed.
2. **Given** a removed/left member, **When** they revisit the space, **Then** access loss is asserted exactly as before via CRD-valid selectors.
3. **Given** a non-member viewing a private space, **When** the suite checks the apply/join affordance, **Then** the correct apply/join/sign-in state is asserted via a CRD-valid selector.

---

### User Story 4 - Account/organization settings & profile authorization coverage survives (Priority: P3)

The QA engineer runs the account/organization-settings and profile-authorization suites. Own and organization account-settings resource views, and the visibility of a profile's settings entry point to owner vs. non-owner, pass against the CRD layout. Tests already marked `skip`/`@bug` remain unchanged.

**Why this priority**: Lower-frequency administrative views; several are already skipped/known-bug and out of scope to re-activate, so this trails the executable stories.

**Independent Test**: Run `view-own-account-settings.spec.ts` (skipped — stays skipped), `view-organization-account-settings-as-admin.spec.ts`, `cannot-access-*` (skipped — stay skipped), and the settings-icon assertions in the profile specs against a CRD build.

**Acceptance Scenarios**:

1. **Given** an org admin on the organization account settings, **When** the suite asserts the resource sections and quota, **Then** they resolve via CRD-valid selectors.
2. **Given** a profile viewed by its owner vs. a non-owner, **When** the suite checks the settings entry point, **Then** its presence/absence is asserted via a CRD-valid selector (replacing `[data-testid="SettingsOutlinedIcon"]`).
3. **Given** a test currently `skip`/`@bug`-tagged, **When** the migration is applied, **Then** it remains skipped/tagged and is not re-activated.

---

### Edge Cases

- **MUI icon `data-testid` selectors have no CRD equivalent**: `[data-testid="SettingsOutlinedIcon"]`, `[data-testid="LockOutlinedIcon"]`, `[data-testid="CloseIcon"]` must be re-expressed via accessible name/role (CRD icon-only buttons carry `aria-label`; decorative icons are `aria-hidden`). If no stable hook exists, record a gap (FR-008).
- **`text=`-style and brittle positional locators** (`page.locator(\`text=${name}\`)`, `.first()/.last()/.nth()`) must be replaced with role + accessible name where the CRD surface provides one.
- **A flow's shape changed**: e.g. leave/remove now routes through a confirmation dialog; the apply/join button is a state machine (sign in / apply / join / accept invitation / pending); pending memberships open a CRD dialog. Interaction steps adapt; scenarios and assertions do not.
- **Redirect/access-restricted copy**: regex text assertions (`/We are redirecting you/i`, `/Access Restricted/i`, `/Go now/i`) must continue to match the CRD copy; re-express against the CRD element if the shape changed.
- **CRD enablement**: if the redesign is flag-gated in the target build, enablement must be deterministic (consistent with the callout suite).
- **Pre-existing skips/@bug**: stay out of scope; not re-activated (FR-009).
- **Multi-language**: prefer language-stable strategies (roles, test ids) where the suite already does; English-text assertions must match the default test-environment language.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The active, currently-passing membership functional-E2E specs MUST continue to pass against a CRD-enabled client build, with no reduction in the set of automated scenarios.
- **FR-002**: Every inline selector used by the active specs MUST resolve against the CRD layout, replacing MUI-only markup (`[data-testid="SettingsOutlinedIcon"]`, `[data-testid="LockOutlinedIcon"]`, `[data-testid="CloseIcon"]`, `text=` locators) with a strategy valid on the CRD surface (role + accessible name, persistent label, `data-slot`, or stable test id).
- **FR-003**: Navigation/interaction steps MUST reflect the CRD flow and step model for dashboard, profile, settings-access, leave/apply/join, and account/organization settings — including flow-shape changes (confirmation dialogs, apply/join state machine, pending-memberships dialog).
- **FR-004**: The suite MUST preserve the existing 1:N business-scenario → automation-test mapping — no covered scenario loses its automated test, and no previously-green test is disabled or skipped to accommodate the UI change.
- **FR-005**: Behavioral assertions (admin-vs-member settings access, member-vs-non-member-vs-unauthenticated private-space access, redirect targets, access-restricted outcomes, membership presence on dashboard/profile, apply/join state, account quotas) MUST remain identical to the pre-migration assertions.
- **FR-006**: Selectors MUST prefer language-stable, accessibility-aligned strategies and MUST replace position-based selectors where the CRD surface exposes a stable role/name; any unavoidable positional selector MUST be annotated.
- **FR-007**: Each migrated spec (and any membership suite documentation) MUST reflect the CRD UI and note any scenario whose selector/interaction strategy changed.
- **FR-008**: Any selector gap discovered during alignment MUST be recorded as an explicit finding in the selector contract's gap log rather than masked by a brittle selector.
- **FR-009**: Tests already marked `skip` or `@bug` MUST remain as-is and MUST NOT be re-activated by this feature; product bugs they document are out of scope.
- **FR-010**: No new membership scenarios, backend interactions, or end-to-end round-trips beyond those already in the suite are introduced.
- **FR-011**: The suite MUST run via the existing client-web execution path (Playwright, Chrome), runnable both individually and as a directory-scoped run (`playwright test src/functional-e2e/memberships`), using the `--workers=1 --retries=2` profile established by `006` (local-stack login stability).

### Key Entities *(include if feature involves data)*

- **Membership test suite**: the active `*.spec.ts` files under `client-web/src/functional-e2e/memberships/` (dashboard, profile, settings-access, private-space access, leave, account/org settings).
- **CRD surfaces under test**: home dashboard (`041`), user/org profile pages (`096`), space/subspace settings (`045`/`103`), space about + apply/join (`087`/`088`), pending memberships dialog (`084`), member settings dialog (`094`), account/contributor settings (`097`), and the access-restricted/error pages (`095`/`107`).
- **Test data / fixtures**: `TestScenarioFactory.createBaseScenario(...)` (orgs, spaces, subspaces, nested hierarchies, roles), the test users (`SPACE_ADMIN`, `SPACE_MEMBER`, `SUBSPACE_*`, `SUBSUBSPACE_*`, `ORGANIZATION_ADMIN`, `NON_SPACE_MEMBER`), the authenticated-session fixture, and the shared `LoginPage` (hardened in `006`) — unchanged here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the active membership scenarios pass when the suites run against a CRD-enabled client build (directory-scoped run, `--workers=1 --retries=2`).
- **SC-002**: Zero active membership scenarios are removed, skipped, or disabled compared with the pre-migration suite (active, non-deprecated test count does not decrease).
- **SC-003**: Every inline selector used by an active spec resolves to exactly one element on its CRD surface (no zero-match or ambiguous-match locators).
- **SC-004**: All MUI-only selectors (`[data-testid="SettingsOutlinedIcon"]`, `[data-testid="LockOutlinedIcon"]`, `[data-testid="CloseIcon"]`, `text=` locators) are removed from the membership suite.
- **SC-005**: Behavioral assertions (access boundaries, redirects, membership presence, apply/join state, quotas) produce the same pass/fail outcomes for the same inputs as against MUI.
- **SC-006**: The count of position-based selectors is reduced; any remaining instance is annotated with a justification.
- **SC-007**: Any CRD surface lacking a stable accessible hook required by an existing scenario is captured as an explicit, reviewable finding in the selector contract gap log; the count is reported rather than hidden.

## Assumptions

- The client-web CRD migration of these surfaces preserves all URLs, GraphQL operations, the authorization model, redirects, and access-control outcomes; only the rendered UI changes. The suite therefore changes selectors/steps, not scenarios or expected behavior.
- A client build serving the CRD surfaces is available to verify against (the local docker-compose stack used for `006`).
- The default test-environment language is English; existing English-text assertions continue to match unless intentionally changed by the CRD migration.
- The CRD surfaces follow the design system's accessibility commitments (semantic `<a>`/`<button>`, `aria-label` on icon-only controls, persistent labels, `data-slot` on primitives).
- The repository's specification-driven workflow applies; concrete file-level selector changes are produced in planning/tasks and confirmed empirically against the running CRD build.

## Out of Scope

- Any change to the Alkemio client application itself (the CRD UI lives in the client-web product repo).
- Re-activating or fixing tests currently marked `skip`/`@bug`, or the product bugs they document.
- Adding new membership scenarios or coverage beyond what the current suite automates.
- Other client-web functional-E2E areas (callouts is covered by `006`; public-space, user-profile-as-its-own-area, applications, etc. are separate efforts).
- Changes to server-api test suites or the shared `@alkemio/tests-lib` package.
- Accessibility automation, performance, or visual-regression testing of the CRD surfaces.
