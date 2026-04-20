---
feature: Client web — authentication and identity flows
slug: ui-authentication
---

<!--
  Covers client-web/src/functional-e2e/authentication/ (Playwright).
  Mirrors the sign-up / sign-in / verify / recovery user journeys served by
  the Ory Kratos-backed identity flow.
-->

## TC-1600 — Registration page renders the expected fields and is submittable

```yaml
priority: P1
type: e2e
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Navigate to `/registration` as an anonymous visitor.
2. Verify the email, password, password-confirm, and marketing-consent fields are present.
3. Submit valid values.

### Expected

- All required fields are validated client-side.
- Submission transitions to the verification page with a clear success message.

## TC-1601 — Sign-in with valid credentials lands the user on their dashboard

```yaml
priority: P1
type: e2e
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Navigate to `/identity/sign-in`.
2. Submit valid email + password.
3. Observe post-login redirect.

### Expected

- The user lands on `/home` (or the configured default landing page) within 2 seconds.
- The session cookie is set and session is recognized across page reloads.

## TC-1602 — Invalid sign-in credentials surface a clear error without exposing which field is wrong

```yaml
priority: P1
type: e2e
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Attempt to sign in with: unknown email + any password, known email + wrong password.
2. Observe the error message in each case.

### Expected

- A generic "credentials invalid" error is shown in both cases (no user-enumeration signal).
- The form remains usable for a retry (no lockout on first failure unless rate-limiting policy says otherwise).

## TC-1603 — Password recovery email flow succeeds end-to-end

```yaml
priority: P1
type: e2e
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Request a password recovery from `/identity/recovery` for a known email.
2. Poll the mail server, extract the recovery link, and follow it in the browser.
3. Set a new password and sign in with the new credentials.

### Expected

- The recovery email arrives within 30 seconds.
- Following the link presents the password reset form with a valid session.
- Signing in with the new password succeeds.

## TC-1604 — Navigation tabs on the post-auth home work across Home / Community / Subspaces / Knowledge / Settings

```yaml
priority: P2
type: e2e
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Sign in.
2. Click each of the top-level navigation tabs and confirm the corresponding content loads.

### Expected

- Each tab navigates without a full reload and renders its primary heading within 2 seconds.
- Deep-linking to each tab URL (e.g. `/settings`) works after refresh.

## TC-1605 — Email verification page handles both valid and expired tokens

```yaml
priority: P2
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. Register a user; extract the verification link from the email.
2. Follow the link immediately (expect success).
3. Register a second user; wait for the link to expire; follow it.

### Expected

- A fresh link verifies the email and transitions to sign-in.
- An expired link shows a clear "resend verification" CTA.
