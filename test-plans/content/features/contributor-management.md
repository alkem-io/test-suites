---
feature: Contributor management — Users, Organizations, Virtual Contributors
slug: contributor-management
---

<!-- Covers server-api/src/functional-api/contributor-management/. -->

## TC-1500 — A new user can self-register and complete their profile

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Call `createUser` with email, display name, and initial profile fields.
2. Update bio, avatar, and tagline via `updateUser`.
3. Delete the user via `deleteUser`.

### Expected

- Each mutation returns the user in its post-mutation state.
- Self-registration emits the registration notification.
- Deletion cascades memberships and roles per policy.

## TC-1501 — An authenticated user can create, update, and delete an Organization

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create an organization with display name, tagline, and profile data.
2. Update verification status (as a verifier) and general settings.
3. Transfer ownership to another user.

### Expected

- The authenticated creator becomes the default owner/admin.
- Verification transitions (UNVERIFIED → PENDING → VERIFIED) persist and are queryable.
- Ownership transfer reassigns admin privileges atomically.

## TC-1502 — Organization verification flow enforces the configured workflow

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Submit an organization for verification with the required attachments.
2. As the verifier, approve and reject sample submissions.

### Expected

- Status transitions follow the documented state machine.
- Only verifiers can approve/reject; others receive an authorization error.

## TC-1503 — A Virtual Contributor can be created and queried with visibility controls

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a Virtual Contributor with a display name, tagline, and engine selection.
2. Set visibility: public profile + public Body of Knowledge (BoK).
3. Repeat for each of the other three visibility combinations.

### Expected

- The four documented visibility combinations are enforceable and queryable.
- Anonymous and non-member access respects the configured visibility.

## TC-1504 — Virtual Contributor access: All-Public vs All-Private read paths

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As an anonymous user, query an All-Public VC, an All-Private VC, and the three mixed combinations.
2. As the VC owner, query all five.

### Expected

- Anonymous: sees only All-Public fully; sees only minimal metadata for the others; sees nothing for All-Private.
- Owner: sees all fields on all VCs they own.

## TC-1505 — VC Model Card renders the expected structured fields for each supported engine type

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. For each engine type listed in the spec, create a VC and query its Model Card.
2. Assert the expected sections are present: metadata, capabilities, ethics, evaluation.

### Expected

- Every engine type produces a non-empty Model Card with the required fields populated.
- Missing configuration produces a clear validation error, not a partial card.
