---
description: "Task list for CRD Authentication Pages — Test Suite Alignment"
---

# Tasks: CRD Authentication Pages — Test Suite Alignment

**Input**: Design documents from `/specs/005-crd-auth-ui-tests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This feature *is* a test suite. No separate TDD test tasks are generated; each user story's verification task runs the relevant Playwright suite against a CRD build (the natural acceptance test). Assertions inside the specs are frozen (FR-005) — only selectors/navigation change.

**Organization**: Tasks grouped by user story. All paths are under `client-web/src/functional-e2e/` unless noted, and absolute from repo root `/home/como/repos/qa/test-suites/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3/US4 — maps to spec.md user stories
- File paths are exact

## Path Conventions

All work is in the `client-web` package. Base path: `/home/como/repos/qa/test-suites/client-web/src/functional-e2e/`. Spec dir: `/home/como/repos/qa/test-suites/specs/005-crd-auth-ui-tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a CRD build to validate against and capture the pre-alignment baseline.

- [x] T001 Confirm/point `client-web/.env` `ALKEMIO_BASE_URL` at an Alkemio client build serving the **CRD** authentication screens, with Kratos + MailSlurper reachable (per `specs/005-crd-auth-ui-tests/quickstart.md` Precondition). If unavailable, record the gate in `quickstart.md` and proceed through edits, deferring verification tasks.
- [x] T002 Install browsers: `pnpm --filter @alkemio/test-suite-client-web exec playwright install` (Chrome branded channel).
- [x] T003 Capture the pre-alignment baseline. The SC-002 invariant is the **active-test count**, not a green set — pre-alignment the suite is expected to be largely red on a CRD build because selectors are MUI-bound. Record: (a) the count of active (non-`.skip`) tests in `src/functional-e2e/authentication`, (b) the single `test.skip` (#8317), and (c) the scenarios marked "Implemented" in `AUTHENTICATION_TEST_PLAN.md` (the SC-001 target set). Save the current report for reference.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Re-align the shared selector module that every authentication suite imports. Until this is done, no story suite can pass against CRD.

**⚠️ CRITICAL**: `common-authentication-page-elements.ts` is imported by all six active specs and all `identity-flows/*` page objects — it must be aligned first. All edits to this single file are grouped here to avoid cross-phase same-file conflicts.

- [x] T004 Build the empirical selector reference: against the running CRD sign-in/sign-up/registration/recovery/verify screens, inspect each element listed in `specs/005-crd-auth-ui-tests/data-model.md` (Selector Inventory) via `pnpm exec playwright codegen` / accessibility snapshot, and fill in the **Status** column of `specs/005-crd-auth-ui-tests/contracts/crd-auth-selector-contract.md` (OK/ALT/GAP).
- [x] T005 In `authentication/common-authentication-page-elements.ts`, replace the MUI required-field label selectors (drop the `" *"` suffix): `emailField`, `passwordField`, `firstNameField`, `lastNameField`, `recoveryCodeField` → confirmed CRD strategy (role+name or asterisk-free label) per the inventory.
- [x] T006 In `authentication/common-authentication-page-elements.ts`, replace the provider-button selectors `githubButton`/`microsoftButton`/`linkedinButton` (currently `button[value="…"]`) with role+accessible-name locators (e.g. `/connect with linkedin/i`), and de-genericise `termsCheckbox` (currently `input[type="checkbox"]`) to a `getByRole('checkbox', { name: /terms/i })`-style locator.
- [x] T007 In `authentication/common-authentication-page-elements.ts`, re-anchor `cookieConsentBanner` away from the brittle full-sentence text onto a stable hook (prefer the accept button / banner role), and unify `acceptAllCookiesButton` casing so it matches what the CRD shell renders (reconcile `Accept All Cookies` vs the fixture's `Accept all cookies`).
- [x] T008 In `authentication/common-authentication-page-elements.ts`, confirm/adjust the remaining shared locators against the inventory: buttons (`signInButton`, `signUpButton`, `saveButton`, `continueButton`, `nextButton`), links (`signInLink`, `signUpLink`, `privacyLink`, `termsLink`, `forgotPasswordLink`), headings (`signInHeading`, `accessRestrictedHeading`, `welcomeHeading`), and shell items (`logoutMenuItem`, `userMenuAvatar`, `signInSignUpLink`, `returnToDashboardLink`). Leave any that already pass unchanged.
- [x] T009 Verify the foundational module compiles and type-checks: `pnpm --filter @alkemio/test-suite-client-web run lint` (or `tsc --noEmit`) passes with the updated `common-authentication-page-elements.ts`.

**Checkpoint**: Shared selectors aligned and type-clean — user stories can now proceed.

---

## Phase 3: User Story 1 — Sign-in coverage survives (Priority: P1) 🎯 MVP

**Goal**: Every sign-in scenario (admin/regular login, invalid-creds error, logout, re-auth, sign-in page elements) passes against the CRD sign-in screen, and downstream auth via `LoginPage` still works.

**Independent Test**: Run `authentication-login.spec.ts` + `authentication-page-verification.spec.ts` (sign-in elements) and the downstream smoke (`memberships/...`) against the CRD build — all green; `.auth/` storage state regenerates.

- [x] T010 [US1] In `identity-flows/signin-page-objects.ts`, align `verifySignInPageElements` to the CRD sign-in card (heading, email/password fields via shared helpers, sign-in button, provider buttons in backend-advertised order, forgot-password + sign-up cross-link); keep `fillUpSignInPageElements`/`pressSignInButtonSignInPage` behavior identical.
- [x] T011 [US1] Consolidate the duplicate sign-in page object: fold the working CRD selectors from `identity-flows/signin-page-objects-fixed.ts` (`'No account?'`, `Connect with LinkedIn/Microsoft`) into `identity-flows/signin-page-objects.ts`. (Deletion of the `-fixed` file is T029 in US4 once no import references it.)
- [x] T012 [US1] In `space/pages/LoginPage.ts`, align the sign-in field locators (`getByRole('textbox', { name: 'E-Mail' })` / `'Password'`) and `acceptCookies` to the same confirmed CRD strategy used in the shared module, and verify the entry-menu steps (`PersonIcon` → `Log In | Sign Up`) still resolve. **(SC-004 — highest blast radius.)**
- [x] T013 [US1] In `authentication/authentication-login.spec.ts`, update only the inline locators (invalid-credential error regex `/email address or password.*invalid/i`; logout sign-in option `name: /sign up|sign in/i`) to match CRD copy; leave all assertions and flow unchanged.
- [x] T014 [US1] Run `cd client-web && pnpm exec playwright test src/functional-e2e/authentication/authentication-login.spec.ts src/functional-e2e/authentication/authentication-page-verification.spec.ts -g "login page elements"` against the CRD build; confirm all sign-in scenarios pass.
- [x] T015 [US1] Run the downstream smoke `cd client-web && pnpm exec playwright test src/functional-e2e/memberships/access-private-subspace-in-private-space-non-member.spec.ts` to confirm `LoginPage`-based storage-state login still authenticates (SC-004).

**Checkpoint**: Sign-in and downstream auth fully functional on CRD — MVP complete.

---

## Phase 4: User Story 2 — Registration, sign-up & email-verification coverage survives (Priority: P2)

**Goal**: Sign-up terms gating, full registration → verify-email → sign-in → dashboard, and the related page-element checks pass against the CRD screens.

**Independent Test**: Run `authentication-registration.spec.ts` + `authentication-page-verification.spec.ts` (sign-up/registration/verify elements) against the CRD build — all green; the `#8317` test stays skipped.

- [x] T016 [P] [US2] In `identity-flows/signup-page-objects.ts`, align `verifySignUpPageElements` to the CRD sign-up card: heading, terms checkbox unchecked, `nextButton` disabled until terms accepted, terms/privacy links, sign-in cross-link.
- [x] T017 [P] [US2] In `identity-flows/registration-page-objects.ts`, align `verifyRegistrationPageElements`, `fillUpSignUpPageElements` (email/first/last name — unify on the asterisk-free shared field helpers; drop the local `input[type="email"]`/`getByLabel('First Name')` inconsistency), `fillUpSignUpPasswordElements`, and `verifyRegistrationSuccessPageElements` (`'Nearly there…'`, `'The last step is to verify'`, `'…or continue to the platform'`, `'Sign in here'`) to confirmed CRD copy.
- [x] T018 [P] [US2] In `identity-flows/verify-page-objects.ts`, align `verifyVerificationPageElements` and `verifyVerificationPageWithSendAgainButtonElements` (heading `Email verification`, resend email field, `Continue` button) to CRD; remove the dead no-op `page.getByRole('button', { name: 'Sign in' })` line.
- [x] T019 [US2] In `authentication/login-page-objects.ts`, verify/align the registration navigation helpers (`navigateToSignUpFromSignIn`, `navigateToRegistrationFromAcceptTerms`, `navigateToRegistrationFromSignUpFillFormAndContinue`) against the CRD step model — same-page checkbox→form→password→verify; update the inline checkbox/field locators to the shared helpers.
- [x] T020 [US2] In `authentication/authentication-registration.spec.ts`, update only inline locators (verification-pending copy, `link 'Continue'`, heading `'Sign in'`, `text 'You successfully verified'`) to CRD copy; keep flow/assertions unchanged and the `#8317` case `test.skip`. Update the skipped case's locators just enough to compile.
- [x] T021 [US2] Run `cd client-web && pnpm exec playwright test src/functional-e2e/authentication/authentication-registration.spec.ts src/functional-e2e/authentication/authentication-page-verification.spec.ts` against the CRD build; confirm registration + verify + all page-element checks pass.

**Checkpoint**: Sign-up/registration/verification coverage green on CRD.

---

## Phase 5: User Story 3 — Recovery, restricted-access & cookie-consent coverage survives (Priority: P3)

**Goal**: Password recovery (code + link flows), restricted-access redirects, and cookie-consent accept/persist pass against the CRD screens/shell.

**Independent Test**: Run `authentication-password-recovery.spec.ts`, `authentication-restricted-access.spec.ts`, `authentication-cookie-consent.spec.ts` against the CRD build — all currently-automated scenarios pass.

- [x] T022 [US3] In `authentication/authentication-password-recovery.spec.ts`, update inline locators (`link 'Forgot password?'`, recovery email/code via shared helpers, set-new-password field, `'User Settings'` heading, dashboard links `Invitations`/`My Account`/`Create my own Space`) to confirmed CRD copy; preserve the idempotent same-password reset and the local-vs-remote code/link branching.
- [x] T023 [P] [US3] Verify `authentication/authentication-restricted-access.spec.ts` against the CRD build — these are shell-level (`accessRestrictedHeading`, `signInSignUpLink`, `returnToDashboardLink`, `signInHeading`) and likely unchanged; update any locator that drifted via the shared module only.
- [x] T024 [P] [US3] Verify `authentication/authentication-cookie-consent.spec.ts` against the CRD build using the re-anchored `cookieConsentBanner`/`acceptAllCookiesButton` from T007; confirm appear/accept/persist-across-nav/persist-on-reload all pass.
- [x] T025 [US3] Run `cd client-web && pnpm exec playwright test src/functional-e2e/authentication/authentication-password-recovery.spec.ts src/functional-e2e/authentication/authentication-restricted-access.spec.ts src/functional-e2e/authentication/authentication-cookie-consent.spec.ts` against the CRD build; confirm all pass.

**Checkpoint**: All P3 journeys green on CRD.

---

## Phase 6: User Story 4 — Page objects & test plan reflect CRD reality (Priority: P3)

**Goal**: Shared helpers and `AUTHENTICATION_TEST_PLAN.md` show the current CRD truth; no stale duplicate; selector gaps logged.

**Independent Test**: Review — every active selector helper resolves to exactly one CRD element (SC-003); the test plan reflects CRD with the full scenario list intact (SC-005); gap log finalized (SC-007).

- [x] T026 [P] [US4] Update `authentication/AUTHENTICATION_TEST_PLAN.md`: state that the suites target the CRD authentication UI, retain the complete scenario list, note each scenario whose selector/navigation strategy changed, and set a new "Last Updated" date (2026-06-01). Reconcile the stale "Automated" references to the deprecated `authentication-flows.spec.ts` / `authentication-critical-flows.spec.ts` (absent from the active dir per research R6) so each scenario points at the active independent suite that now carries it.
- [x] T027 [P] [US4] Finalize `specs/005-crd-auth-ui-tests/contracts/crd-auth-selector-contract.md` Gap Log: every `GAP` row has a proposed follow-up (e.g. a client-web issue requesting a `data-testid`/accessible name); record the total gap count for the SC-007 report.
- [x] T028 [US4] Audit that no active suite imports `identity-flows/signin-page-objects-fixed.ts` (`grep -rn "signin-page-objects-fixed" client-web/src | grep -v node_modules`), then delete the file now that T011 consolidated it.
- [x] T029 [US4] Sweep for residual MUI-only locators across the auth suite (`grep -rn "value=\\\"github\\\"\|value=\\\"microsoft\\\"\|value=\\\"linkedin\\\"\| \*'\|input\[type=\\\"checkbox\\\"\]" client-web/src/functional-e2e`); confirm none remain in active files. Also confirm (FR-009) no deprecated suite has been re-imported or un-skipped: the only intended `test.skip` is the `#8317` case in `authentication-registration.spec.ts`, and no active spec imports a deprecated `*-flows.spec.ts` helper.

**Checkpoint**: Helpers and documentation are CRD-accurate and duplicate-free.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite confirmation and acceptance evidence.

- [x] T030 Run the full authentication suite `cd client-web && pnpm exec playwright test src/functional-e2e/authentication` against the CRD build; confirm 100% of the T003 "Implemented" target set passes (SC-001) and the active-test **count** matches the T003 baseline (SC-002).
- [x] T031 [P] Lint/format: `pnpm --filter @alkemio/test-suite-client-web run lint` clean on all changed files (Prettier: single quotes, es5 trailing commas, 2-space, arrow parens avoid).
- [ ] T032 Walk `specs/005-crd-auth-ui-tests/quickstart.md` Acceptance Checklist (SC-001…SC-007); attach the Playwright HTML report path (`client-web/playwright-report/`) and the gap count as PR evidence (Constitution IV), referencing the `FR-###` IDs.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup; **BLOCKS all user stories** (shared `common-authentication-page-elements.ts`).
- **US1 (Phase 3)**: depends on Foundational. MVP.
- **US2 (Phase 4)**: depends on Foundational; independently testable (uses US1's consolidated sign-in only for the final sign-in step of the registration journey — already covered by Foundational + T010).
- **US3 (Phase 5)**: depends on Foundational; independently testable.
- **US4 (Phase 6)**: documentation/consolidation; T028 depends on T011 (consolidation done). Otherwise independent — but best run after US1–US3 so the test-plan notes reflect actual changes.
- **Polish (Phase 7)**: depends on all desired stories complete.

### Within Each User Story

- Page-object selector edits → spec inline-locator edits → run/verify.
- Verification task is last in each story.

### Parallel Opportunities

- T002 ∥ (after T001).
- Within Foundational, T005–T008 all touch the **same file** (`common-authentication-page-elements.ts`) → **NOT parallel**; do sequentially. T004 (inspection) precedes them.
- US2: T016, T017, T018 touch different `identity-flows/*` files → **[P]**.
- US3: T023, T024 are independent verification of different specs → **[P]** (after T007/Foundational).
- US4: T026 (doc) ∥ T027 (gap log) → **[P]**.
- Across stories: once Foundational completes, US1/US2/US3 can be staffed in parallel (different files), with US4 documentation trailing.

---

## Parallel Example: User Story 2

```bash
# Different identity-flows files — run together:
Task: "Align signup-page-objects.ts (T016)"
Task: "Align registration-page-objects.ts (T017)"
Task: "Align verify-page-objects.ts (T018)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational (shared selectors) → Phase 3 US1.
2. **STOP and VALIDATE**: login suite + downstream smoke green (T014, T015).
3. This is the highest-value slice: sign-in gates the wider client-web suite via storage state.

### Incremental Delivery

1. Setup + Foundational → shared selectors aligned.
2. US1 → sign-in + downstream auth green (MVP).
3. US2 → registration/verification green.
4. US3 → recovery/restricted/cookie green.
5. US4 → docs + consolidation + gap log.
6. Polish → full-suite parity evidence.

### Parallel Team Strategy

After Foundational: Dev A → US1 (incl. `LoginPage`), Dev B → US2 (`identity-flows/*`), Dev C → US3 (recovery/restricted/cookie). US4 documentation consolidates everyone's notes at the end.

---

## Notes

- **Traceability (Constitution I)**: This repo uses Spec Kit `FR-###` as the governing requirement IDs; treat `FR-### ≡ R-###`. The task→requirement mapping is maintained in [`data-model.md`](./data-model.md) §"Traceability Matrix" and the [`plan.md`](./plan.md) Constitution Check — every task above traces to ≥1 `FR-###`/`SC-###` via its phase/story. PR descriptions MUST link the relevant `FR-###` and `T###` IDs.
- [P] = different files, no incomplete dependencies.
- Assertions are **frozen** (FR-005): tasks change selectors/navigation only, never expected outcomes.
- `common-authentication-page-elements.ts` edits are deliberately serialized in Foundational (one shared file).
- The `#8317` `test.skip` stays skipped (FR-009); update its locators only enough to compile.
- Verification tasks require a CRD build (R7/T001); if none is reachable, stage edits and gate T014/T015/T021/T025/T030 with a recorded note — do not silently skip.
- Commit per task or logical group; reference `FR-###`/`T###` in the PR (Constitution I).
