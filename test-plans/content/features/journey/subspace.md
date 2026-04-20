---
feature: Subspaces — L1 and L2 journey entities
slug: journey-subspace
---

<!--
  Covers server-api/src/functional-api/journey/ subspace and subsubspace
  tests: creation, flows, sorting/pinning, query shape, authorization.
-->

## TC-1200 — A Space admin can create a Subspace (L1)

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As the Space admin, call `createSubspace` with a display name and description.
2. Query the parent Space's subspace list.

### Expected

- The subspace appears in the list with the correct parent reference and default template applied.
- The creator is assigned the default admin role.

## TC-1201 — Subspace lifecycle flows (Inception → Active → Completed) transition correctly

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Walk a subspace through each lifecycle state using the defined transition mutations.
2. Attempt an invalid transition.

### Expected

- Each valid transition is recorded with a timestamp and the initiating user.
- Invalid transitions return a clear error.

## TC-1202 — Subspaces can be sorted and pinned within a Space

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Reorder subspaces via the sort mutation; query the parent's list to confirm.
2. Pin a subspace to the top; unpin it.

### Expected

- Sorted order is stable across sessions and reflected in the query response.
- Pinned subspaces appear before unpinned regardless of sort.

## TC-1203 — Subsubspaces (L2) inherit the parent subspace's visibility policy

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Given a Private subspace, create an L2 inside it.
2. Query the L2 as: Space member, subspace member, non-member, anonymous.

### Expected

- L2 visibility does NOT exceed the parent subspace's.
- Non-member and anonymous callers are denied.

## TC-1204 — Subsubspace admin-role authorization is scoped to that L2

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Assign user A the L2 admin role.
2. A attempts admin-only operations on the L2, on a sibling L2, and on the parent L1.

### Expected

- Operations on the target L2 succeed.
- Operations on the sibling L2 and on the parent L1 return authorization errors.
