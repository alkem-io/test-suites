---
feature: Journey conversion — moving and converting between L0/L1/L2
slug: journey-conversion
---

<!--
  Covers server-api/src/functional-api/journey/ move-L1-to-L0,
  move-L1-to-L2, convert-L2-to-L1, convert-L1-to-L0, and
  move-vs-convert-comparison specs. These operations restructure the
  platform's Space hierarchy and are high-risk.
-->

## TC-1300 — Convert L1 Subspace to L0 (promoting it to a Space)

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
links:
  stories: [alkem-io/product#1301]
```

### Steps

1. Create an L1 Subspace with members, callouts, and posts.
2. Execute the L1→L0 conversion.
3. Query the resulting L0 Space and the original parent Space.

### Expected

- The former L1 is now an L0 with its content intact.
- It is removed from the former parent's subspace list.
- Members and their roles are preserved across after conversion.

## TC-1301 — Moving L1 to another L0 doesn't preserve community membership and role assignments

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
links:
  bugs: [alkem-io/server#4702]
```

### Steps

1. Given an L1 with host, community manager, active stakeholder, and regular member roles, move it to L0.
2. Query the resulting L0's roleset.

### Expected

- All roles are removed.
- Host of the moved subspace becomes the new L0 space host.
- No member receives a transient "removed" notification during the move.

## TC-1302 — L1→L0 move auto-invite

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. With auto-invite disabled, move an L1 that has pending invitations.
2. Repeat with auto-invite enabled.

### Expected

- Disabled: pending invitations are cleared.
- Enabled: invitations are re-scoped to the new L0.

## TC-1303 — L1→L2 move relocates a Subspace under another parent Subspace

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Move an L1 into a target L1 (becoming its L2 child).
2. Verify membership, callouts, and community state.

### Expected

- The former L1 is now an L2 under the target parent.
- Roles are not moved.
- Callouts remain as they were before the move.

## TC-1304 — L2→L1 conversion demotes an L2 to an independent L1

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Convert an L2 to L1 within its current Space (same-L0 demotion).
2. Convert an L2 to L1 under a different L0 (cross-L0 demotion).
3. Same-L0 vs cross-L0: observe the differences in community reconciliation.

### Expected

- Same-L0 demotion keeps role mappings stable.
- Cross-L0 demotion reassigns roles against the new parent's role model with clear messages.

## TC-1305 — L1→L0 authorization: only hosts/admins can initiate the move

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Attempt the move as: host, admin, community manager, regular member, non-member.
2. Attempt on a Space the caller is not a member of at all.

### Expected

- Only host/admin succeed.
- All other roles return authorization errors with no partial state changes.

## TC-1306 — Rooms / messaging history is preserved across move and convert

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Populate chat rooms on an L1 with N messages.
2. Move or convert the L1.
3. Query the post-move entity's rooms.

### Expected

- All prior messages remain attached to the same logical rooms.
- No orphaned rooms remain on the source entity.

## TC-1307 — Validation errors: circular moves and invalid targets are rejected

```yaml
priority: P3
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Attempt to move an L1 into its own child L2 (would create a cycle).
2. Attempt to move an L1 to a target that is already at the maximum depth.

### Expected

- Each attempt returns a clear validation error identifying the constraint violated.
- No state changes on the source or target.
