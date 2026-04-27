---
feature: Activity logs
slug: activity-logs
---

<!-- Covers server-api/src/functional-api/activity-logs/. -->

## TC-1400 — Activity logs at Space, Subspace, and Subsubspace record the expected events

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Produce a curated sequence of events (callout created, post created, comment added, user joined, etc.) at each journey level.
2. Query the activity log for each level.

### Expected

- Each produced event appears in the log with the correct type, actor, timestamp, and entity reference.
- Events from one journey level do not leak into another level's log.

## TC-1401 — Activity log access is gated by journey membership and visibility

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a non-member of a Private Space, query its activity log.
2. As a member of a public Space, query another public Space's log.

### Expected

- Non-member on private: authorization error.
- Member on public: allowed, with filtering for any entries tied to private sub-journeys.

## TC-1402 — Activity log ordering is deterministic (most recent first) and paginates

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Generate 50 events; request the log with a page size of 10 and walk through pages.
2. Verify the relative ordering.

### Expected

- Returned entries are sorted by timestamp desc with stable ties.
- Cursor-based or offset pagination returns the expected slices without duplicates or gaps.
