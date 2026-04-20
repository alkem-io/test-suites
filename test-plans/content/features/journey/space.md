---
feature: Spaces — top-level journey (L0)
slug: journey-space
---

<!--
  Covers server-api/src/functional-api/journey/space.it-spec.ts and
  space-platform-settings.it-spec.ts. An L0 Space is the root collaboration
  container in Alkemio.
-->

## TC-1100 — A host can create a Space with required metadata

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As a user with `SPACE_CREATE` entitlement, call `createSpace` with a display name, tagline, and description.
2. Query the resulting Space's canonical URL.

### Expected

- The Space is returned with a server-assigned ID and the creator as the default host.
- The canonical URL resolves to the Space dashboard within 2 seconds.
- Duplicate display names on the same account yield a clear validation error.

## TC-1101 — Space platform settings can be updated by admins only

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As the Space host, update platform settings (privacy, default role, feature toggles).
2. As a regular community member, attempt the same update.

### Expected

- Host-initiated updates persist and are visible on subsequent reads.
- Non-host updates return an authorization error.

## TC-1102 — Deleting a Space cascades to all contained content

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Create a Space with at least one callout, one post, one subspace, and some membership.
2. Delete the Space.
3. Query each child resource by ID.

### Expected

- All child resources are deleted or marked tombstoned per policy.
- Queries for them return "not found".

## TC-1103 — Space visibility (public / private) governs anonymous and non-member reads

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Query a public space as an anonymous user.
2. Query a private space as an anonymous user and as a non-member authenticated user.

### Expected

- Public space returns its public fields to anyone.
- Private space returns only minimal metadata (name, tagline) or nothing at all, per the configured policy.
