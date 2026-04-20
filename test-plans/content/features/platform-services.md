---
feature: Platform services — subscriptions, GraphQL guard, configuration, pagination
slug: platform-services
---

<!--
  Cross-cutting server-api areas that don't map cleanly to a single domain:
  real-time subscriptions, GraphQL authorization boundaries, platform
  configuration, and pagination helpers.
-->

## TC-1000 — Real-time subscriptions deliver subspace and subsubspace creation events

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Open a WebSocket subscription to `subspaceCreated(spaceId)`.
2. Create a Subspace on the target Space.
3. Repeat for `subsubspaceCreated`.

### Expected

- The subscriber receives an event containing the new entity's ID and display name within 2 seconds.
- Subscriptions from users without read access to the parent do not receive events.

## TC-1001 — Post-comment subscriptions deliver incremental message events

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Subscribe to `postCommentsAdded(postId)` as a community member.
2. Add comments from two different users.
3. Unsubscribe and confirm no further events arrive.

### Expected

- Each new comment triggers a corresponding event with author and timestamp.
- Unsubscribe terminates the stream cleanly.

## TC-1002 — GraphQL guard enforces public/private Space access consistently

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As an anonymous caller, attempt deep nested queries against a public Space and a private Space.
2. Repeat as an authenticated non-member.

### Expected

- Private-Space queries consistently return minimal data or "not found" across every GraphQL entry point.
- No leakage via nested fields, embedded relations, or alias chaining.

## TC-1003 — Nested query data integrity: a single query cannot escalate privileges

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Construct a deeply nested query that reaches from a public resource into private siblings (e.g. via organizations → members → private spaces).
2. Execute as a non-privileged user.

### Expected

- Unauthorized nested fields are elided or return null/auth errors; the rest of the query still returns.
- No 500 error, no partial private data.

## TC-1004 — Synchronous authorization decisions are deterministic and performant

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Warm a user's authorization cache; run 100 repeat queries for the same resource.
2. Measure latency distribution.

### Expected

- P50 and P95 latencies stay within the documented budgets (see plan.md performance targets).
- Zero cases of an authorization flip (allow → deny or vice versa) on unchanged state.

## TC-1005 — Platform configuration query returns the expected feature flags and endpoints

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Query `platformConfiguration` as an anonymous user.
2. Repeat as an authenticated admin.

### Expected

- Core configuration (branding, public endpoints, feature flags) is returned to both callers.
- Admin-only keys (if any) appear only for admins.

## TC-1006 — Paginated queries on users and organizations return stable slices

```yaml
priority: P3
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Query users with a page size of 20 and walk through all pages.
2. Mutate (create a new user) mid-walk.
3. Repeat for organizations.

### Expected

- Pages have consistent ordering and no duplicates under a stable snapshot.
- Mid-walk mutation policy matches the documented semantics (new entity is either fully in or fully out of the walk, not duplicated).
