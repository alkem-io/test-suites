---
feature: Client web — explore platform, my dashboard, memberships
slug: ui-explore-and-dashboard
---

<!--
  Covers client-web/src/functional-e2e/explore-platform/, my-dashboard/,
  memberships/, applications/. Currently under-automated; cases reflect
  the user-facing capabilities documented in alkem-io/client-web.
-->

## TC-1700 — Explore page lists public spaces and their high-level metadata

```yaml
priority: P1
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. As an anonymous visitor, navigate to `/explore`.
2. Verify that at least one public space card is rendered with display name, tagline, and banner.
3. Click a card and confirm the space's public profile loads.

### Expected

- The page loads in under 3 seconds.
- Only public spaces are listed; private spaces never appear.

## TC-1701 — Explore page supports filtering and keyword search

```yaml
priority: P2
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. On `/explore`, filter by tag or category.
2. Use the keyword search to find a specific space by display name.

### Expected

- Filters narrow the visible set; clearing filters restores the full list.
- Keyword search matches case-insensitively on display name and tagline.

## TC-1702 — Signed-in user's dashboard surfaces their memberships, recent activity, and pending invitations

```yaml
priority: P1
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. Sign in as a user with memberships in two spaces, one pending invitation, and recent activity in one callout.
2. Open `/home`.

### Expected

- All three sections (memberships, recent activity, pending invitations) render with correct counts and links.
- Clicking any item deep-links to the referenced entity.

## TC-1703 — A user can apply to join a public community directly from the space's UI

```yaml
priority: P1
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. As a signed-in non-member, open a public space with open applications.
2. Click "Apply to join", fill in the application message, and submit.

### Expected

- Submission confirms with a toast / success state.
- The application appears in the user's "pending applications" list and in the community admin's queue.

## TC-1704 — A user can accept an invitation from their dashboard

```yaml
priority: P1
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. Given a user with one pending invitation, sign in and open `/home`.
2. Click "Accept" on the invitation.

### Expected

- The invitation is removed from the pending list.
- The invited community now appears in the user's memberships.

## TC-1705 — Navigating to a private space the user does not belong to surfaces an access-denied view

```yaml
priority: P2
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. Sign in as a user without membership in a private space.
2. Deep-link to that space's URL.

### Expected

- The page renders a clear "access denied / request to join" state, not a 500 or leaked metadata.
