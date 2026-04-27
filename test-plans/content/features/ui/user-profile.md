---
feature: Client web — user profile
slug: ui-user-profile
---

<!-- Covers client-web/src/functional-e2e/user-profile/. -->

## TC-1950 — User can access their profile from the dashboard

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; open the user menu → Profile.

### Expected

- Profile page loads; all tabs (My Profile, Memberships, etc.) render.

## TC-1951 — Direct URL access to a user profile works

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Deep-link to `/user/<nameID>` both as the profile owner and as another authenticated user.

### Expected

- Owner sees the full profile; others see the public-view subset.

## TC-1952 — My Profile tab renders profile information read-only view correctly

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open My Profile tab.

### Expected

- Display name, tagline, bio, avatar, and contact fields render matching the saved state.

## TC-1953 — User can update basic information and changes persist

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. On My Profile, edit display name, tagline, and bio; save.
2. Reload the page.

### Expected

- Saved values persist; toast / success indicator appears on save.
- Invalid inputs (empty required fields, over-length) show validation errors without data loss.
