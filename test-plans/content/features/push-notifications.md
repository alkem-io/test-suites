---
feature: Push notifications
slug: push-notifications
---

<!--
  Covers server-api/src/functional-api/push-notifications/.
  Sourced from docs/test-plan-2026-03-30-pwa-push-notifications.md and the
  upstream PRs (alkem-io/server#5884, alkem-io/client-web#9433). Automated
  coverage tracked in PR #533 / test-suites.
-->

## TC-0700 — An authenticated user can retrieve the VAPID public key

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
links:
  stories: [alkem-io/server#5884, alkem-io/client-web#9433]
  prs: [alkem-io/test-suites#533]
```

### Steps

1. As any authenticated user, query `vapidPublicKey`.
2. Repeat as a second authenticated user.

### Expected

- Both queries return the same non-empty Base64URL string.
- Unauthenticated queries return an auth-required error.

## TC-0701 — A user can subscribe a push endpoint and receive the subscription back

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
links:
  stories: [alkem-io/server#5884]
```

### Steps

1. Call `subscribeToPushNotifications` with a valid endpoint, p256dh, auth, and userAgent.
2. Call it again with the same endpoint (upsert).
3. Call it with an empty endpoint.

### Expected

- First call returns a `PushSubscription` with status `ACTIVE` and the submitted userAgent.
- Repeated call returns the same subscription ID (no duplicate).
- Empty endpoint yields a validation error.

## TC-0702 — A user can unsubscribe their own subscription but not another user's

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. User A unsubscribes an existing subscription by ID.
2. User A attempts to unsubscribe a non-existent ID.
3. User A attempts to unsubscribe user B's subscription.

### Expected

- Own-subscription unsubscribe succeeds and removes the entry from the list.
- Non-existent ID returns a clear error.
- Cross-user unsubscribe returns an authorization error.

## TC-0703 — `myPushSubscriptions` lists only the caller's subscriptions

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Query `myPushSubscriptions` as a user with zero subscriptions.
2. Subscribe twice and re-query.
3. As a different user, subscribe once and query from user A again.

### Expected

- Empty result for zero-subscription user.
- Two entries with id, createdDate, status, userAgent for the two-subscription user.
- User A's list never contains user B's subscriptions.

## TC-0704 — The 10-subscription per-user cap is enforced

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Subscribe 10 distinct endpoints for one user.
2. Attempt to subscribe an 11th.
3. Unsubscribe one and retry.

### Expected

- 10 succeed; 11th is rejected with a cap-exceeded error.
- After dropping one, a new subscribe succeeds.

## TC-0705 — Push notification settings cover all 28 supported event types

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. For each of the 28 event types defined in the spec, toggle the user's preference off, then on.
2. Query the user's settings after each toggle.

### Expected

- Each event type can be independently disabled and re-enabled.
- The returned settings reflect the most recent toggle.

## TC-0706 — VAPID key security — key rotation behavior is documented and testable

```yaml
priority: P3
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Simulate a VAPID key rotation on the server (admin action).
2. Attempt to deliver a push notification using an old subscription.

### Expected

- Old subscriptions bound to the previous key are invalidated gracefully; the user is prompted to re-subscribe.
- New subscriptions issued after rotation use the new key.

## TC-0707 — Authorization edge cases: expired tokens, role changes, and tenant boundaries

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Attempt push-subscription mutations with an expired session token.
2. Attempt to subscribe a user across tenant boundaries.

### Expected

- Expired-token requests return an auth error (not a 500).
- Cross-tenant attempts are rejected cleanly with a scoped authorization error.
