---
feature: Client web — memberships, settings access control, profile visibility
slug: ui-memberships
---

<!--
  Covers client-web/src/functional-e2e/memberships/ — 20+ spec files verifying
  that access to account / membership / space / subspace / subsubspace
  settings and profile views is correctly gated per role.
-->

## TC-1900 — Space settings accessible to Space Admins

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as a Space Admin; navigate to the Space Settings page.

### Expected

- Settings load fully; admin-only controls (privacy, roleset, entitlements) are visible.

## TC-1901 — Space settings restricted for Space Members (read-only or redirect)

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as a Space Member (non-admin); attempt to open Space Settings.

### Expected

- Restricted view appears; admin-only controls are not visible.

## TC-1902 — Subspace settings accessible to Space Admin

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a Space Admin, navigate into a Subspace and open its settings.

### Expected

- Parent-space admin privileges propagate: all subspace settings editable.

## TC-1903 — Subspace settings accessible to Subspace Admin

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a Subspace Admin (not parent-space admin), open Subspace Settings.

### Expected

- Settings load; admin controls are available within the subspace scope.

## TC-1904 — Private Subspace in Private Space: denied for non-members and unauthenticated users

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a non-member of the private parent space, deep-link to a private subspace URL.
2. Repeat anonymously.

### Expected

- Both flows show a clear access-denied or "request to join" state; no private metadata leaks.

## TC-1905 — Private Subsubspace (L2) access gated by L1 + L2 membership

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a member of the L2, open its URL.
2. As a non-member (but member of the parent L1), try the same.
3. As a non-member at every level, try again.

### Expected

- L2 members see the content; non-L2 callers see the access-denied state even if they hold the parent L1 role.

## TC-1906 — Removed member cannot re-access a space after removal

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Add a user as a member; verify access.
2. Remove the user.
3. The removed user refreshes the space page.

### Expected

- After removal, the previously-accessible URL returns to an access-denied state.

## TC-1907 — User can access their own membership settings

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; open the user menu → Membership settings.

### Expected

- The page lists the user's spaces and roles; edits to notification preferences persist.

## TC-1908 — User cannot access another user's membership settings

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as user A; attempt to deep-link to user B's membership settings URL.

### Expected

- The request is denied with a clear message; no B-specific data leaks.

## TC-1909 — User can access their own account settings

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; open the user menu → Account settings.

### Expected

- The page loads with billing, license, and privacy controls scoped to the caller.

## TC-1910 — User cannot access another user's account settings

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as user A; attempt to deep-link to user B's account settings.

### Expected

- Access denied; no sensitive B data exposed.

## TC-1911 — Organization admin can view organization account settings

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as an organization admin; open the organization's Account Settings.

### Expected

- License, entitlements, and billing appear; edits persist per permission.

## TC-1912 — Non-admin cannot access organization account settings

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as a member of the organization (not admin); attempt the URL.

### Expected

- Restricted page or redirect; no admin data visible.

## TC-1913 — Home dashboard renders memberships for the authenticated user

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as a user with at least one membership; open `/home`.

### Expected

- Membership section lists the user's spaces with correct role labels.

## TC-1914 — Home dashboard with multiple memberships renders all of them correctly

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as a user with 3+ memberships; open `/home`.
2. Confirm each membership tile links to the right space.

### Expected

- All memberships render; counts and labels are consistent across tiles.

## TC-1915 — User can view their own profile's public information

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; open own profile from the user menu.

### Expected

- Public information (display name, tagline, visuals) is visible and correct.

## TC-1916 — User can view another user's profile (public view)

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as user A; navigate to user B's public profile URL.

### Expected

- Only public fields are visible; private fields are hidden or obscured.

## TC-1917 — Anonymous user profile view follows the anonymous-visibility policy

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Anonymously, navigate to a user's public profile URL.

### Expected

- Anonymous view matches the "unauthenticated user profile" policy; additional CTAs encourage sign-up where appropriate.

## TC-1918 — Organization profile is visible to anonymous users (public view)

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Anonymously, open an organization's public URL.

### Expected

- The organization's profile, tagline, and public members list render.

## TC-1919 — Organization admin sees the admin-augmented organization profile

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as an org admin; open the org profile.

### Expected

- Admin-only affordances (edit, manage members, manage license) are exposed.
