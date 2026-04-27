---
feature: Entitlements — space, VC, licenses
slug: entitlements
---

<!--
  Covers server-api/src/functional-api/entitlements/.
  Entitlements derive from account/license configurations and gate what a
  tenant can create and run (e.g. how many spaces, VCs, innovation packs).
-->

## TC-0500 — A user account's Space entitlement count is enforced at create time

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Given a user account with `SPACE_FREE` entitlement = 2, create 2 spaces.
2. Attempt to create a third space.

### Expected

- The third creation is rejected with an entitlement-exhausted error.
- Reducing the count (by deleting a space) allows a new creation.

## TC-0501 — Updating a license entitlement takes effect immediately

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As Global Admin, update an account's license to include `SPACE_PLUS`.
2. As the account owner, query authorization / license privileges.
3. Create a resource that required the upgraded entitlement.

### Expected

- The query reflects the new entitlement set immediately.
- The previously-forbidden creation now succeeds.

## TC-0502 — Virtual Contributor entitlements gate creation and usage

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Given an account without the `VIRTUAL_CONTRIBUTOR` entitlement, attempt to create a VC.
2. Grant the entitlement and retry.

### Expected

- Without entitlement: creation is rejected with an entitlement-exhausted error.
- With entitlement: creation succeeds and the VC is counted toward the limit.

## TC-0503 — Innovation Pack entitlements are enforced at create and transfer time

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Attempt to create an innovation pack on an account at its pack limit.
2. Transfer an existing pack to an account at its limit.

### Expected

- Both operations are rejected with a clear entitlement error that identifies the offending entitlement.

## TC-0504 — User and Organization authorization + license privileges are queryable

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Query `userAccountAuthorizationPrivileges(userId)`.
2. Query `organizationAccountAuthorizationPrivileges(organizationId)`.

### Expected

- Both queries return the expected privilege set for the given entity's license.
- Non-admin callers receive only their own privileges or an authorization error.
