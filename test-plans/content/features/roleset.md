---
feature: Roleset — applications, invitations, roles
slug: roleset
---

<!--
  Covers server-api/src/functional-api/roleset/.
  Roleset is the community-membership entitlement model: users apply to or
  are invited into a community with a specific role.
-->

## TC-0400 — A user can apply to join a community and admins can approve / reject

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
links:
  stories: [alkem-io/product#1520]
```

### Steps

1. As a non-member, call `applyForCommunityMembership` on a Space roleset with an application message.
2. As a community manager, query pending applications, approve one, and reject another.

### Expected

- The approved applicant becomes a community member with the configured default role.
- The rejected applicant receives no role assignment and no error.
- Non-managers cannot approve / reject (`AuthorizationPrivilegeError`).

## TC-0401 — An admin can invite an existing user or an external email to a community

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As a community manager, call `inviteContributorsForCommunityMembership` with a registered user's ID.
2. As the same manager, call `inviteExternalUserForCommunityMembership` with an email address not yet in the platform.
3. The internal invitee accepts; the external invitee registers and accepts.

### Expected

- Both paths produce membership with the expected role.
- The invitation lifecycle transitions correctly (pending → accepted/declined).

## TC-0402 — Users with the appropriate role can assign / remove other users to a community

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As a community manager, assign a user the `MEMBER` role.
2. Remove the user from the community.
3. As a regular member, attempt both operations.

### Expected

- Manager-initiated changes succeed; member-initiated changes fail with an authorization error.

## TC-0403 — Organizations can be assigned community roles and removed

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Assign an organization to the community's `LEAD` role.
2. Query the roleset's leads.
3. Remove the organization from the role.

### Expected

- The organization appears in the leads list after assignment and is absent after removal.

## TC-0404 — Invitation and application lifecycles expose correct states and transitions

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Create an application; query its lifecycle events (`PENDING` → `APPROVED`/`REJECTED`).
2. Create an invitation; transition through `PENDING` → `ACCEPTED`/`DECLINED`.
3. Attempt an invalid transition (e.g. `APPROVED` → `PENDING`).

### Expected

- Each valid transition is recorded with a timestamp.
- Invalid transitions return a clear error.

## TC-0405 — User roles across spaces are reported correctly

```yaml
priority: P3
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Given a user with roles across multiple spaces, subspaces, and organizations, query `userRoles`.
2. Verify the returned set matches the user's actual assignments.

### Expected

- The query returns a complete, deduplicated role list grouped by journey level.
