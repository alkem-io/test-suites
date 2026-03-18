# Authentication Test Plan

## Overview

Purpose: Provide a clear, area-based view of authentication testing with explicit scenario lists, automation status, file locations, and next priorities.

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
- Third-party OAuth: Availability only automated; full flows manual
- Accessibility: Plan for axe-core + keyboard checks
- Last Updated: December 12, 2025
- Next Review: After major authentication changes
