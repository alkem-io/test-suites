---
feature: Client web — authentication, identity flows, session & access control
slug: ui-authentication
---

<!--
  Covers client-web/src/functional-e2e/authentication/ — Playwright tests
  against the Ory Kratos-backed identity flow (register, sign-in, verify,
  recovery, cookie consent, restricted-area access control, session).

  Case IDs TC-1601 and TC-1603 are referenced by the R31 release plan; keep
  them stable.
-->

## TC-1600 — Identity pages render their expected elements

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Navigate anonymously to `/registration`, `/identity/sign-up`, `/identity/sign-in`, `/identity/verification`, and the resend-code verification variant.
2. For each, verify the expected form fields, primary CTA, and link to the sibling flow (e.g. "Already have an account? Sign in").

### Expected

- All five identity pages render without console errors.
- Each page exposes every field documented in the common-authentication-page-elements helper.

## TC-1601 — User can sign in with admin and regular-user accounts

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in at `/identity/sign-in` with an admin account; confirm post-login redirect and session cookie.
2. Sign out and repeat with a regular-user account.

### Expected

- Both roles reach `/home` within 2 seconds.
- Session cookie is set; reloading the page keeps the user signed in.

## TC-1602 — Invalid credentials surface a clear error without user-enumeration

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Attempt sign-in with an unknown email and with a known email + wrong password.
2. Observe the rendered error.

### Expected

- Both cases show the same generic "credentials invalid" message.
- The form remains usable for retry; no hard lockout on first failure.

## TC-1603 — Password recovery email flow succeeds end-to-end

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Request a recovery from `/identity/recovery` for a known email.
2. Extract the recovery link from MailSlurper, follow it, set a new password.
3. Sign in with the new password.

### Expected

- The recovery email arrives within 30 seconds.
- The reset link verifies a valid session and presents the password form.
- Sign-in with the new password succeeds on the first attempt.

## TC-1604 — New-user registration completes through email verification

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Register with a fresh email; wait for the verification email.
2. Follow the verification link; complete the profile setup.
3. Sign in.

### Expected

- The newly-registered account lands on `/home` with the first-run onboarding.

## TC-1605 — Sign-out clears the session and a subsequent sign-in succeeds

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; sign out.
2. Attempt to navigate to a protected route — confirm redirect to sign-in.
3. Sign in again with the same credentials.

### Expected

- Sign-out clears the session cookie and local state.
- Second sign-in succeeds and restores the dashboard.

## TC-1606 — Cookie-consent banner appears on first visit and persists across navigation and reload

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the app in a clean browser context; confirm the cookie banner is visible.
2. Accept the banner.
3. Reload, navigate across several pages, close and reopen the same browser context.

### Expected

- The banner is absent after acceptance across reload, navigation, and re-open within the same session.

## TC-1607 — Unauthenticated user hitting an admin URL sees the restricted-access page, can navigate to sign-in, and returns to the requested URL post-login

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As an anonymous visitor, deep-link to an admin-only URL.
2. Click the "sign in" CTA on the restricted page.
3. Complete sign-in.

### Expected

- The restricted page renders with an appropriate message and a sign-in link.
- After successful sign-in, the user is redirected back to the originally-requested admin URL.

## TC-1608 — Regular user hitting an admin URL sees the restricted-access page with a "back to dashboard" path

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as a regular (non-admin) user.
2. Deep-link to an admin-only URL.
3. Click the "back to dashboard" CTA.

### Expected

- Restricted page appears and clearly signals the user is authenticated but lacks authorization.
- Returning to the dashboard is one click; no further error states.
