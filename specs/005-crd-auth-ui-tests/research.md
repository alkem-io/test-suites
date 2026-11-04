# Phase 0 Research: CRD Authentication Pages — Test Suite Alignment

This document resolves the open questions from the Technical Context and records the decisions that govern the selector-alignment work.

## R1 — Source of truth for the CRD selectors

**Decision**: Derive *candidate* CRD selectors from two authoritative sources, then **confirm each one empirically** against a running CRD build before committing it.

- Behavioral truth: client-web `specs/101-crd-auth-pages/spec.md` — FR-005…FR-016 (shell, fields, validation, provider set/order, password toggle, redirects) and FR-019…FR-020 (WCAG 2.1 AA: persistent visible labels, ARIA roles, accessible error associations, accessible icon-control names).
- Practical truth: the rendered CRD DOM, inspected with Playwright codegen / accessibility snapshot against a live build.

**Rationale**: The spec guarantees behavior and accessibility but does not freeze exact DOM strings. Accessible names/roles are stable enough to target and survive the multi-language rollout when combined with role-based locators; exact label text is confirmed against the build to avoid guessing.

**Alternatives considered**:
- *Guess selectors from screenshots only* — rejected: brittle, no way to validate `getByLabel` text or `data-testid` presence.
- *Wait for client-web to publish a test-id contract* — rejected as a blocker: we instead propose the contract (see `contracts/`) and fall back to accessible names where test ids are absent.

## R2 — Selector strategy priority

**Decision**: Prefer, in order: (1) `getByRole` + accessible name, (2) `getByLabel` against persistent visible labels, (3) stable `data-testid`, and only as a last resort (4) structural/CSS locators. Avoid hardcoded English body text except where the existing suite already relies on it and the default test-env language is English.

**Rationale**: Matches the existing suite's conventions and Playwright's recommended priority; aligns with the CRD accessibility commitment (FR-019), making selectors resilient to the six-language rollout (spec FR-006, SC-005-language). Role+name locators are language-sensitive only in the `name` argument — where the suite must stay multi-language-safe, role-only or `data-testid` is used.

**Concrete fragility points identified in the current code**:

| Current locator | Risk under CRD | Planned strategy |
|---|---|---|
| `getByLabel('E-Mail *')`, `getByLabel('Password *')`, `getByLabel('First Name *')`, `getByLabel('Recovery code *')` | The `" *"` suffix is a MUI required-field convention; CRD persistent labels likely omit it | Confirm CRD label text; switch to `getByRole('textbox', { name: /e-?mail/i })` / `getByLabel('Email')` style, no asterisk |
| `page.locator('button[value="github"]')` (and `microsoft`, `linkedin`) | Relies on Kratos form `value` attribute; CRD wraps providers with accessible labels (`Connect with LinkedIn`) per the `-fixed` variant | `getByRole('button', { name: /connect with linkedin/i })`, ordered as backend advertises (spec FR-010) |
| `page.locator('input[type="checkbox"]')` (terms) | Generic; may match other checkboxes in CRD shell | `getByRole('checkbox', { name: /terms/i })` or scoped within the sign-up card |
| `cookieConsentBanner` exact long sentence | Shell-level; copy may differ slightly | Confirm copy; prefer `getByRole('button', { name: /accept all cookies/i })` as the anchor |
| Headings `'Sign in'`, `'Sign up'`, `'Email verification'`, `'User Settings'`, `'Nearly there…'` | Card titles may be re-worded in CRD | Confirm against build; keep as role=heading with confirmed names |
| `getByRole('textbox', { name: 'E-Mail' })` / `'Password'` in `LoginPage.ts` | Downstream auth — different from the `getByLabel('… *')` form used elsewhere | Unify on one confirmed sign-in field strategy across `LoginPage` and `signin-page-objects` |

## R3 — Navigation / routing model

**Decision**: Re-verify each navigation helper against the CRD step model rather than assuming it changed. Current helpers use `getByTestId('PersonIcon')` → `menuitem 'Log In | Sign Up'`, and a same-page checkbox-then-form registration flow.

**Rationale**: Spec FR-001/FR-002 keep URLs identical, so `page.goto(...)`-based navigation is safe. The entry-menu (`PersonIcon`, `Log In | Sign Up`) lives in the **authenticated app shell**, not the auth screens, so it is likely unchanged — but it must be verified because the whole suite enters through it. The multi-step sign-up (terms → form → password → verify) already matches the CRD card/step pattern, so navigation helpers likely need only selector confirmation, not restructuring.

## R4 — The duplicate `signin-page-objects-fixed.ts`

**Decision**: Treat `signin-page-objects-fixed.ts` as a partial, already-CRD-aware draft. Consolidate its working selectors (`'No account?'`, `'Connect with LinkedIn'`, `'Connect with Microsoft'`) into the canonical `signin-page-objects.ts` and delete the `-fixed` file once nothing imports it.

**Rationale**: Two sign-in page objects with diverging selectors is exactly the drift this feature exists to remove (Constitution V — simplicity). The `-fixed` file is currently imported by nothing in the active suites (verified by grep), so consolidation is low-risk.

## R5 — Scope boundary: `LoginPage.ts` (downstream auth)

**Decision**: Include `space/pages/LoginPage.ts` in scope. It is the login path used by `authenticated-session.fixture.ts` and by non-auth suites (`memberships/…`, `seed.spec.ts`).

**Rationale**: SC-004 requires downstream suites to keep authenticating. `LoginPage.login()` uses sign-in selectors that the CRD migration affects; if it breaks, storage-state generation fails and cascades far beyond the authentication suite. It is the highest-blast-radius file and maps to User Story 1 (P1).

## R6 — What is explicitly NOT researched / changed

- No new scenarios, no axe-core accessibility automation, no visual-regression — frozen by spec Out of Scope.
- Deprecated `authentication-critical-flows.spec.ts` / `authentication-flows.spec.ts` are not present in the active dir listing and are not reactivated (the test plan references them historically; the active independent suites carry their scenarios).
- The `test.skip` registration alternate path (bug #8317) stays skipped; selectors in it are updated only so the file compiles, not to re-enable it.

## R7 — Precondition: availability of a CRD build

**Decision**: Producing the selector inventory and page-object edits does **not** require a CRD build; verifying them does. The quickstart documents pointing the suite at a CRD-enabled `ALKEMIO_BASE_URL`. If no CRD build is reachable at implementation time, edits are staged from the inventory and the verification step (SC-001…SC-004, SC-006) is gated until a build is available — recorded as a quickstart precondition, not a silent skip.

**Rationale**: Keeps the work unblocked while being honest that green-suite confirmation is empirical and build-dependent.
