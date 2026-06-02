# Feature Specification: CRD Authentication Pages — Test Suite Alignment

**Feature Branch**: `005-crd-auth-ui-tests`  
**Created**: 2026-06-01  
**Status**: Draft  
**Input**: User description: "UI changes to the authentication flow (CRD auth pages) while preserving existing functionality, aligned with client-web specs/101-crd-auth-pages/spec.md and authentication_test-plan.md"

## Context

The Alkemio web client is migrating its authentication screens (sign-in, sign-up, full registration, password recovery, password reset, email verification, and auth-flow error pages) from the legacy MUI design to the new CRD design system. Per the client-web feature spec (`specs/101-crd-auth-pages/spec.md`), this migration is **UI-only**: URL paths, backend flows, validation rules, supported authentication methods, redirect behavior, error messages, and analytics/observability events all remain unchanged. The CRD screens become the single, unconditional authentication interface for every visitor.

This feature concerns the **QA test suite** (`@alkemio/test-suite-client-web`), not the client application. The existing functional E2E authentication suite (`client-web/src/functional-e2e/authentication/`) and its page objects were written against the MUI screens. Because the UI is changing while behavior is preserved, the **test scenarios and coverage must remain unchanged**, but the **element selectors, page-object navigation, and any UI-shape assertions must be re-aligned** to the CRD layout so the suite keeps passing against the new screens. The authoritative coverage map is `client-web/src/functional-e2e/authentication/AUTHENTICATION_TEST_PLAN.md`.

The guiding principle (per repo convention): a 1:N mapping of business scenario → automation test must be preserved. No business scenario currently covered may lose coverage as a result of this UI change, and no previously-green test may be silently disabled.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign-in coverage survives the CRD migration (Priority: P1)

The QA engineer runs the authentication login suite against a client build serving the new CRD sign-in screen. Every login scenario that passed against the MUI screen — admin login, invalid-credentials error, logout-and-reauthenticate, third-party button availability — passes again against the CRD screen, with no scenario removed and no selector silently broken.

**Why this priority**: Sign-in is the most-exercised authentication path and gates almost every other E2E suite (auth fixtures / storage state). If the login page objects break, large portions of the wider client-web suite fail. This is the minimum viable slice of the migration alignment.

**Independent Test**: Point the suite at a CRD-enabled client build and run `authentication-login.spec.ts` and `authentication-page-verification.spec.ts`. All sign-in scenarios listed in the test plan pass; the resulting `.auth/` storage state authenticates downstream suites.

**Acceptance Scenarios**:

1. **Given** the CRD sign-in screen is served at the existing login URL, **When** the login suite locates the email field, password field, and primary sign-in control, **Then** each element is found via a selector valid against the CRD layout (label, role, or stable test id) without relying on MUI-only markup.
2. **Given** valid admin credentials, **When** the suite submits the CRD sign-in form, **Then** the user is authenticated and redirected to the same post-login destination as before, and storage state is persisted for reuse.
3. **Given** invalid credentials, **When** the suite submits the CRD sign-in form, **Then** the same error message asserted for the MUI screen is displayed and asserted successfully.
4. **Given** the CRD sign-in screen, **When** the suite checks third-party provider buttons (GitHub, Microsoft, LinkedIn), **Then** their presence is asserted via CRD-valid selectors in the order the backend advertises them.
5. **Given** an authenticated session, **When** the suite logs out and re-authenticates, **Then** the flow completes against CRD screens exactly as the test plan describes.

---

### User Story 2 - Registration, sign-up, and email-verification coverage survives (Priority: P2)

The QA engineer runs the registration and verification suites against the CRD sign-up / full-registration / verify screens. The terms-acceptance gating (Next disabled until checkbox ticked and required fields valid), the registration → verify-email → sign-in → dashboard happy path, and page-element checks all pass against the new layout.

**Why this priority**: Account creation and verification are core onboarding journeys with explicit gating behavior the suite asserts today. They depend on sign-in alignment (P1) for the final sign-in step, so they follow it.

**Independent Test**: Run `authentication-registration.spec.ts` and the page-element verification for the sign-up/registration/verify pages against a CRD build. The terms-gating assertion, field fills, and the full registration-to-dashboard journey pass.

**Acceptance Scenarios**:

1. **Given** the CRD sign-up screen, **When** the suite locates the terms-acceptance checkbox and the Next control, **Then** both are found via CRD-valid selectors and the Next control is asserted disabled until the checkbox is ticked and required fields are valid.
2. **Given** the terms accepted and the CRD registration form, **When** the suite fills email, first name, and last name and advances, **Then** the fields are located by CRD-valid labels/test ids and submission triggers the same backend account-creation flow as before.
3. **Given** a freshly registered account, **When** the suite follows the email verification link, **Then** verification completes inside the CRD shell and the user lands signed in at the same destination as the MUI flow.
4. **Given** the CRD verification-pending screen, **When** the suite asserts the resend/reminder affordance, **Then** it is located via a CRD-valid selector and behaves as the test plan describes.

---

### User Story 3 - Password recovery, restricted-access, and cookie-consent coverage survives (Priority: P3)

The QA engineer runs the recovery, restricted-access, and cookie-consent suites against the CRD screens. The "Forgot password?" → recovery-request → set-new-password journey, the unauthenticated/unauthorized redirect-to-restricted-page scenarios, and the cookie-consent accept/persist scenarios all pass against the new layout.

**Why this priority**: These are important but lower-frequency journeys, and the cookie-consent and restricted-access banners are largely shell-level rather than auth-card-level — some may be unaffected by the CRD card migration and need only verification, not re-selectoring.

**Independent Test**: Run `authentication-password-recovery.spec.ts`, `authentication-restricted-access.spec.ts`, and `authentication-cookie-consent.spec.ts` against a CRD build. All currently-automated scenarios pass; any selector that depended on MUI-only markup is updated.

**Acceptance Scenarios**:

1. **Given** the CRD sign-in screen, **When** the suite follows the "Forgot password?" link, **Then** it reaches the CRD recovery-request screen via a CRD-valid selector and submits a recovery email request that triggers the same backend flow.
2. **Given** the CRD set-new-password screen reached from a recovery link, **When** the suite submits a new password, **Then** the field is located via a CRD-valid selector and the backend update/redirect matches prior behavior.
3. **Given** an unauthenticated or unauthorized visitor, **When** they navigate to a protected route, **Then** the restricted-access page and its sign-in / return-to-dashboard links are asserted via selectors valid against the current (possibly unchanged) shell.
4. **Given** a first visit, **When** the cookie-consent banner appears and is accepted, **Then** acceptance persists across navigation and reload, asserted as in the test plan.

---

### User Story 4 - Test plan and page objects reflect the CRD reality (Priority: P3)

The QA engineer updates the shared page-object modules (`common-authentication-page-elements.ts`, `login-page-objects.ts`, identity-flow helpers) and the `AUTHENTICATION_TEST_PLAN.md` so that selectors, navigation entry points, and documented locations match the CRD screens. Anyone reading the plan or page objects sees the current truth, not stale MUI references.

**Why this priority**: Documentation and shared-helper hygiene prevent future drift and duplicate fixes, but they deliver no runnable coverage on their own, so they trail the executable stories.

**Independent Test**: Review the updated page objects and test plan; every selector helper resolves on a CRD screen, and the plan's "Last Updated" and scenario notes reflect the migration.

**Acceptance Scenarios**:

1. **Given** the shared page-object modules, **When** a CRD screen is loaded, **Then** every exported selector helper used by the active (non-deprecated) suites resolves to exactly one element on the corresponding CRD screen.
2. **Given** the test plan document, **When** it is reviewed after the migration, **Then** it records that the suites target the CRD authentication UI, retains the full scenario list, and notes any scenario whose selector strategy changed.

---

### Edge Cases

- **A scenario's MUI selector has no direct CRD equivalent** (e.g., a label was replaced by an icon-only control): the selector must be re-expressed using a CRD-valid strategy (accessible name, role, or stable test id) without dropping the assertion. If a stable hook does not exist on the CRD screen, that gap is recorded as a finding rather than silently worked around with a brittle selector.
- **A screen previously a separate page is now a card/step within a shared shell** (e.g., sign-up form appearing on the same route after terms acceptance): navigation helpers must reflect the actual CRD routing/step model rather than assuming a full page load.
- **Persistent visible labels vs. floating placeholders**: if the CRD design changes how field labels are exposed, label-based locators (`getByLabel`) must be re-checked and updated to remain valid and accessible.
- **Deprecated suites** (`authentication-critical-flows.spec.ts`, `authentication-flows.spec.ts`): these are already skipped/preserved-for-reference and are out of scope to re-align; their scenarios live in the active independent suites.
- **Screens not yet automated** (e.g., auth-flow error page, cookie-rejection path): no new automation is required by this feature, but if an existing helper references them it must not break the build.
- **Multi-language rendering**: the CRD screens ship in six languages on day one. Selectors should prefer language-stable strategies (roles, test ids) over hardcoded English text where the existing suite already does, and any English-text assertion that the suite relies on must continue to match the default test-environment language.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The authentication functional-E2E suites that are currently active and passing MUST continue to pass when run against a client build serving the CRD authentication screens, with no reduction in the set of automated scenarios documented in `AUTHENTICATION_TEST_PLAN.md`. (This is the runtime/pass-state guarantee; FR-004 is its scenario-mapping counterpart.)
- **FR-002**: Every element selector used by the active authentication suites MUST resolve correctly against the CRD layout, replacing any selector that depends on MUI-only markup with a strategy valid on the CRD screen (accessible label, ARIA role, accessible name, or stable test id).
- **FR-003**: Page-object navigation helpers (`login-page-objects.ts` and identity-flow helpers) MUST reflect the CRD routing and step model for sign-in, sign-up, full registration, recovery, set-new-password, and verification, including cases where a former standalone page is now a card or step within the shared auth shell.
- **FR-004**: The suite MUST preserve the existing 1:N business-scenario → automation-test mapping — no covered scenario may lose its automated test, and no previously-green test may be disabled or skipped to accommodate the UI change. (This is the scenario-mapping-integrity counterpart to FR-001's pass-state guarantee.)
- **FR-005**: Behavioral assertions (post-login redirect destinations, return-URL preservation, validation errors, error messages, terms-acceptance gating, third-party provider presence and order, cookie-consent persistence, restricted-access redirects) MUST remain identical to the pre-migration assertions, because the underlying behavior is unchanged.
- **FR-006**: Selectors and assertions MUST prefer language-stable and accessibility-aligned strategies (role + accessible name, persistent labels, stable test ids) consistent with the existing suite's conventions, so coverage is resilient to the CRD multi-language rollout.
- **FR-007**: `AUTHENTICATION_TEST_PLAN.md` MUST be updated to state that the suites target the CRD authentication UI, to retain the complete scenario list, and to note any scenario whose selector or navigation strategy changed as part of the migration.
- **FR-008**: Any selector gap discovered during alignment — a CRD screen lacking a stable, accessible hook needed to assert an existing scenario — MUST be recorded as an explicit finding (e.g., a documented note or follow-up item) rather than masked by a brittle or position-based selector.
- **FR-009**: Deprecated suites preserved for reference MUST remain out of scope and MUST NOT be re-activated; their scenarios are already represented in the active independent suites.
- **FR-010**: No new authentication scenarios, backend interactions, or end-to-end identity round-trips beyond those already in the test plan are introduced by this feature; scope is limited to keeping existing coverage green against the new UI and documenting the alignment.
- **FR-011**: The suite MUST run via the existing client-web execution path (Playwright, Chrome) without new infrastructure, and the aligned suites MUST be runnable both individually (single `.spec.ts` file) and as a directory-scoped run (`playwright test src/functional-e2e/authentication`). Note: the existing `test:auth-playwright` script runs the full `functional-e2e` tree, of which the authentication suite is a subset.

### Key Entities *(include if feature involves data)*

- **Authentication test suite**: The set of active `*.spec.ts` files under `client-web/src/functional-e2e/authentication/` (login, registration, password-recovery, page-verification, cookie-consent, restricted-access) that assert authentication behavior.
- **Shared page objects**: Selector and navigation helper modules (`common-authentication-page-elements.ts`, `login-page-objects.ts`, and `../identity-flows/*`) consumed by the suites; the locus of most selector changes.
- **Authentication test plan**: `AUTHENTICATION_TEST_PLAN.md` — the authoritative, area-based coverage map enumerating scenarios, automation status, file locations, and priorities; the document of record updated by this feature.
- **CRD authentication screens**: The new design-system screens under test — sign-in, sign-up (terms), full registration, recovery request, set-new-password, email verification, and auth-flow error — defined by client-web `specs/101-crd-auth-pages/spec.md`.
- **Test personas / data**: Existing test users (`admin@alkem.io`, `non.space@alkem.io`, `test+{uniqueId}@alkem.io`) and routes used by the scenarios; unchanged by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the automated scenarios listed as "Implemented" in `AUTHENTICATION_TEST_PLAN.md` pass when the active authentication suites run against a CRD-enabled client build.
- **SC-002**: Zero active authentication scenarios are removed, skipped, or disabled compared with the pre-migration suite (the count of active, non-deprecated tests does not decrease).
- **SC-003**: Every selector helper exported from the shared authentication page objects and used by an active suite resolves to exactly one element on its corresponding CRD screen (no zero-match or ambiguous-match locators).
- **SC-004**: Downstream client-web suites that depend on authenticated storage state continue to authenticate successfully, confirming the sign-in alignment did not break shared auth fixtures.
- **SC-005**: `AUTHENTICATION_TEST_PLAN.md` is updated with a new "Last Updated" date and reflects the CRD UI, with the full scenario list intact and selector-strategy changes noted.
- **SC-006**: All behavioral assertions (error messages, redirects, gating, provider presence) produce the same pass/fail outcomes for the same inputs as they did against the MUI screens.
- **SC-007**: Any CRD screen lacking a stable accessible hook required by an existing scenario is captured as an explicit, reviewable finding; the count of such findings is reported rather than hidden.

## Assumptions

- The client-web CRD authentication migration (`specs/101-crd-auth-pages/spec.md`) preserves all URLs, backend flows, validation, error copy, redirects, supported methods, and analytics events; only the rendered UI changes. The test suite therefore changes selectors/navigation, not scenarios or expected behavior.
- The default language of the test environment remains English, so existing English-text assertions continue to match unless a string was intentionally changed by the CRD migration.
- The CRD screens follow the design system's accessibility commitments (persistent visible labels, ARIA roles, keyboard operability), providing accessible names/roles the suite can target; stable test ids are added where accessible names are insufficient.
- The deprecated `authentication-critical-flows.spec.ts` and `authentication-flows.spec.ts` remain skipped and are not part of this work.
- A client build serving the CRD authentication screens is available to run the suite against during alignment and verification.
- The repository's specification-driven workflow applies; this spec feeds `/speckit.plan` next, and concrete file-level test/selector changes are produced in planning/tasks, not here.

## Out of Scope

- Any change to the Alkemio client application itself (the CRD UI implementation lives in the client-web product repo, not this QA repo).
- Adding new authentication test scenarios, new end-to-end Kratos round-trips, or coverage for the "Not Implemented" items in the test plan (cookie-rejection path, admin positive `/admin/spaces` access, private-space unauthenticated redirect, registration error validations, accessibility automation) — these remain in the plan's "Next Priorities" backlog, untouched by this feature.
- Re-activating or rewriting the deprecated authentication suites.
- Accessibility automation (axe-core), performance, or visual-regression/screenshot testing of the CRD screens.
- Migration of authenticated post-login identity/settings screens (the client spec defers these to a separate effort).
- Changes to server-api test suites or the shared `@alkemio/tests-lib` package.
