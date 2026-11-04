# Authentication Test Plan

## Overview

Purpose: Provide a clear, area-based view of authentication testing with explicit scenario lists, automation status, file locations, and next priorities.

> **CRD UI alignment (2026-06-01):** The authentication suites now target the new
> **CRD** authentication screens (sign-in, sign-up, registration, recovery,
> verify) — the MUI screens have been replaced. The migration is UI-only;
> scenarios and behavioral assertions are unchanged, only selectors/navigation
> were re-aligned. Key changes made during alignment:
> - **Entry point:** the old `PersonIcon` avatar menu → `Log In | Sign Up` menu
>   item no longer exists; navigation now uses the header **"Log in"** link
>   (with a direct `/login` fallback for the post-logout SPA state).
> - **Providers:** third-party buttons are now `Continue with <Provider>`
>   (GitHub is present on the test env) — not the old `button[value="…"]`.
> - **Field labels** keep the MUI-style `" *"` suffix, so those `getByLabel`
>   selectors are unchanged. The recovery/verify screens label their email field
>   `Email *` (no hyphen) vs sign-in's `E-Mail *`.
> - **New-look dialog & new design:** after sign-in a one-time "A fresh new
>   Alkemio is here" dialog overlays the page; the suite opts **into** the new
>   design via "Take me to the new design" (`dismissNewLookDialog`). The
>   authenticated shell is therefore the new CRD design, where: the user menu is
>   the avatar/name button at the end of the header banner (`userMenuAvatar`),
>   logout is **"Log out"** (was "Sign out"), and the authenticated
>   "Access Restricted" page (route `/restricted`) offers a **"Go to Home"**
>   button (was a "Return to Dashboard" link).
> - **Behavior change (flagged):** signing in from the restricted-access prompt no
>   longer returns to the requested page — CRD redirects to `/home`. The
>   restricted sign-in test now asserts authenticated home; pending confirmation
>   from the client-web team on `returnUrl` preservation.
> - **Password recovery:** runs end-to-end on environments using the recovery
>   **link** flow (e.g. the test env). The CRD set-password screen now rejects
>   reusing the current password, so the test sets a temporary password, verifies
>   the recovered session, then **restores** the shared default password (in a
>   `finally`) so `non.space@alkem.io` stays usable by other suites. The local
>   **code** flow additionally depends on `@alkemio/tests-lib` `getRecoveryCode`,
>   which has a separate pre-existing bug — that branch runs once the lib is
>   fixed. The long-standing `#8317` registration alternate path remains skipped.

## Test Locations

- `client-web/src/functional-e2e/authentication/authentication-page-verification.spec.ts` — Page element verification (independent, parallel-safe)
- `client-web/src/functional-e2e/authentication/authentication-login.spec.ts` — Login/logout flows, error handling (independent)
- `client-web/src/functional-e2e/authentication/authentication-registration.spec.ts` — Registration with email verification (independent)
- `client-web/src/functional-e2e/authentication/authentication-password-recovery.spec.ts` — Password recovery (independent)
- `client-web/src/functional-e2e/authentication/authentication-cookie-consent.spec.ts` — Cookie consent banner tests (independent)
- `client-web/src/functional-e2e/authentication/authentication-restricted-access.spec.ts` — Restricted access & redirects (independent)
- `client-web/src/functional-e2e/authentication/authentication-critical-flows.spec.ts` — **DEPRECATED** (preserved for reference, all tests skipped)
- `client-web/src/functional-e2e/authentication/authentication-flows.spec.ts` — **DEPRECATED** (preserved for reference, all tests skipped)
- Page objects: `login-page-objects.ts`, `common-authentication-page-elements.ts`, `../identity-flows/*` (registration, sign-in, verify)

---

## Areas & Scenarios

### Page Elements

- Scope: Registration, Sign-Up (terms), Sign-In, Verification pages
- Automated: Yes (authentication-flows.spec.ts)
- Scenarios:
  - Registration fields and button states
  - Sign-Up terms acceptance gating
  - Sign-In fields, third-party buttons, links
  - Verification form and resend

### Authentication Flows

- Scope: Login, Registration + Email Verify, Password Recovery
- Automated: Yes (authentication-flows.spec.ts)
- Scenarios:
  - Admin login (`admin@alkem.io`)
  - Registration → Verify email → Sign in → Dashboard
  - Password recovery for `non.space@alkem.io`
  - Alternate registration path — skipped due to bug #8317

### Cookie Consent Persistence

- Scope: Consent banner visibility and persistence
- Automated: Yes (authentication-critical-flows.spec.ts)
- Scenarios:
  - First visit banner, accept, disappearance, cross-page and reload persistence
  - Rejection path — Not automated (deferred)

### Restricted Access & Redirects

- Scope: Unauthenticated and unauthorized access behavior
- Automated: Yes (authentication-critical-flows.spec.ts)
- Scenarios:
  - Unauthenticated access to `/admin/spaces` → restricted page → sign-in link
  - Regular user (`non.space@alkem.io`) navigating to `/admin/spaces` → restricted page → return to dashboard
  - Attempt restricted page → then sign-in as regular user → restricted page → dashboard link
  - Admin access to `/admin/spaces` (positive) — Not automated yet
  - Private space unauthenticated redirect — Not automated yet

### Third-Party Authentication (Availability Only)

- Scope: Button presence for GitHub, Microsoft, LinkedIn
- Automated: Yes (authentication-flows.spec.ts)
- Manual: Full OAuth flows must be tested manually before releases
- Scenarios:
  - Buttons visible on sign-in (and registration if applicable)
  - Manual checklist for OAuth success/cancel/deny/timeout

### Logout

- Scope: Logout and re-authentication
- Automated: Yes (authentication-critical-flows.spec.ts)
- Scenarios:
  - Logout cleans session and shows restricted page on protected routes
  - Logout → Sign in again works smoothly

### Error Handling & Validation

- Scope: Invalid credentials, registration validation
- Automated: Partial (authentication-critical-flows.spec.ts)
- Scenarios:
  - Invalid credentials error — Implemented
  - Non-existent user, email already registered, invalid email format, weak password — Not automated yet
  - Form validation states for pages — Implemented in element checks

### Accessibility

- Scope: Keyboard navigation, screen reader, contrast, zoom
- Automated: Not yet (planned via axe-core + Playwright accessibility APIs)
- Scenarios: Keyboard-only flows, ARIA correctness, error announcements, visual indicators, zoom and mobile SR

---

## Automation Status Summary

- Implemented: Page elements, Admin login, Registration + Verify + Sign-in, Password recovery, Cookie consent accept/persist, Restricted redirects (unauthenticated + unauthorized regular user), Logout + re-auth, Invalid credentials, Third-party buttons availability
- Not Implemented: Cookie rejection, Admin positive access to `/admin/spaces`, Private space unauthenticated redirect, Registration error validations (existing email, invalid email, weak password), Space admin role scenarios, Accessibility automation

---

## Next Priorities

- High:
  - Admin positive access to `/admin/spaces` (2.2.3)
  - Registration error handling (7.3, 7.4, 7.5)
- Medium:
  - Private space unauthenticated redirect (2.1.2)
  - Space admin role access checks (5.3)
- Low:
  - Cookie rejection path (1.3)
  - Accessibility automation (axe-core + snapshots)

---

## Entry Points (Sign In / Sign Up)

- Home dashboard `/home`: sign up button (unauthenticated)
- User menu: avatar/menu with sign in/sign up when unauthenticated
- Collaboration callouts: prompts require authentication
- Access restricted page: sign in/sign up button
- Public whiteboard: prompt to authenticate
- Space About dialog: join space requires authentication

Automation status: Restricted page entry covered; user menu and home sign up visibility — not yet.

---

## Test Data & Execution

- Users: `admin@alkem.io`, `non.space@alkem.io`, `test+{uniqueId}@alkem.io`
- Routes: `/admin/spaces`, public/private space URLs (private TBD)
- Isolation: Clear cookies before tests; cleanup emails
- Timeouts: Standard 5s; extend to 30s for email-dependent flows
- Serial vs parallel: Serial for shared-state flows; page verifications can parallelize

---

## Notes & Maintenance

- Known issue: Registration alternate path skipped (bug #8317)
- Known issue: Password recovery local **code** flow depends on
  `@alkemio/tests-lib` `getRecoveryCode` (lib/src/utils/emails.ts) which has a
  pre-existing bug; the recovery test runs via the **link** flow on the test env
  and exercises the code branch once the lib is fixed (out of scope for feature 005)
- Note: CRD set-password rejects reusing the current password; the recovery test
  sets a temp password then restores the shared default in a `finally`
- Open question: CRD `returnUrl` preservation from the restricted-access sign-in
  (redirects to `/home` instead of the requested page) — confirm with client-web
- Note: the deprecated `authentication-flows.spec.ts` /
  `authentication-critical-flows.spec.ts` are no longer present; their scenarios
  live in the active independent suites referenced under "Test Locations"
- Third-party OAuth: Availability only automated; full flows manual
- Accessibility: Plan for axe-core + keyboard checks
- Last Updated: June 1, 2026 (CRD authentication UI alignment — feature 005)
- Next Review: After major authentication changes
