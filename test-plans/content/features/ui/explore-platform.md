---
feature: Client web — explore platform (anonymous + authenticated)
slug: ui-explore-platform
---

<!--
  Covers client-web/src/functional-e2e/explore-platform/
  (explore-platform-anonymous.spec.ts, explore-platform-authenticated.spec.ts).
  Two parallel flows walking through Home → public space → tabs → Explore
  Spaces / Forum / Template Library.
-->

## TC-1800 — Home page loads with the expected content for anonymous and authenticated users

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As anonymous, load `/home`. As authenticated, repeat.
2. Verify the hero, featured content, and navigation.

### Expected

- Both flows render the home page without errors.
- Content visible to each role respects the documented public / authenticated differences.

## TC-1801 — User can click a public space tile and open its dashboard

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. From home, click a public-space card.
2. The space dashboard renders.

### Expected

- The dashboard's space name and tagline match the card that was clicked.
- No authorization errors for anonymous callers.

## TC-1802 — A space's Community / Subspaces / Knowledge tabs all load

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open a public space; click each of the Community, Subspaces, and Knowledge tabs.
2. Verify each loads its main heading within 2 seconds.

### Expected

- All three tabs navigate without a page reload.
- Deep-linking to each tab URL works after refresh.

## TC-1803 — "Explore Spaces" (Tools menu) lists public spaces and links back into them

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the Tools menu; click "Explore Spaces".
2. From the resulting listing, click a public space.

### Expected

- The Explore Spaces page lists multiple public spaces with filters.
- Clicking a card opens the space dashboard.

## TC-1804 — Explore Contributors page (authenticated) lists contributors

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; open the Tools menu → "Explore Contributors".

### Expected

- The page renders a searchable list of contributors (users and organizations).
- Clicking a contributor opens their profile.

## TC-1805 — Explore Forum loads and renders discussions

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. From the Tools menu, open "Forum" (both anonymous and authenticated).

### Expected

- The forum lists at least one discussion.
- Anonymous callers see the read-only view per policy.

## TC-1806 — Template Library loads, and filters (e.g. Collaboration Tool) narrow the visible set

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the Template Library.
2. Apply the "Collaboration Tool" filter; clear it.

### Expected

- Filter-on reduces the visible template count.
- Clear restores the full list.

## TC-1807 — Anonymous user can navigate from Explore to Sign Up; authenticated user's profile is accessible

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Anonymous: click the Sign Up CTA from Explore; land on `/identity/sign-up`.
2. Authenticated: from Explore, open the user avatar menu → profile.

### Expected

- Sign Up CTA lands on the correct page.
- Authenticated user profile opens without error.
