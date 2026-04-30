---
feature: Client web — public space navigation for non-members and anonymous users
slug: ui-public-space
---

<!--
  Covers client-web/src/functional-e2e/public-space/ — 6 spec files verifying
  what non-members (and anonymous users) can see and do on a public space:
  tab navigation, community leads, whiteboards, subspaces, edge cases.
-->

## TC-2100 — Anonymous user can access a public Space via direct URL

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Anonymously, deep-link to a public Space URL.

### Expected

- Space dashboard renders with public content; no sign-in wall.

## TC-2101 — Anonymous user can access the Community tab on a public Space

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Anonymously, open a public space and click Community.

### Expected

- Community tab loads with the leads and members visible per public-view policy.

## TC-2102 — Non-member can navigate to a public Space from Home

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As an authenticated non-member, open `/home`; click a public space card.

### Expected

- The space dashboard opens without a membership prompt.

## TC-2103 — Non-member sees the full set of Space tabs and can navigate each

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. On a public space, verify the Dashboard, Subspaces, Knowledge Base, and Community tabs are present and clickable.

### Expected

- Each tab loads within 2 seconds; URL updates; back-forward history works.

## TC-2104 — Non-member can view space leads and open a lead's profile

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. On the Community tab, click a lead's avatar.
2. Profile opens with public information.

### Expected

- Lead profile loads; returning to the space maintains the tab state.

## TC-2105 — Non-member can navigate into a public Subspace

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. From the Subspaces tab, click a public subspace.

### Expected

- Subspace dashboard opens; non-member content is visible.

## TC-2106 — Non-member sees the About dialog when accessing a private sub-subspace

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Navigate to a private L2 URL as a non-member.

### Expected

- About dialog appears explaining the access boundary; no private content is leaked.

## TC-2107 — Non-member can view subspace community and leads

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. In a public subspace, open the Community tab as a non-member.

### Expected

- Leads and public members render; admin affordances are hidden.

## TC-2108 — Non-member can view whiteboard callouts in a public space

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open a whiteboard callout card on a public space.
2. Open the whiteboard full-screen.

### Expected

- Whiteboard content renders; non-member may have read-only or limited edit per policy.

## TC-2109 — Anonymous user can view whiteboard callout on a public space

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Anonymously, open a whiteboard callout on a public space.

### Expected

- Whiteboard content is visible; guest-edit affordance behaves per policy.

## TC-2110 — Edge case: non-member sees appropriate UI when a space has a default callout

```yaml
priority: P3
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. On a space where the default callout is configured, open as a non-member.

### Expected

- The default callout renders with the expected "non-member view" affordances.

## TC-2111 — Non-member can return to the space from a subspace via breadcrumbs

```yaml
priority: P3
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Navigate into a subspace; click the parent space in the breadcrumb.

### Expected

- Returns to the parent space dashboard without a page reload.

## TC-2112 — Expired session does not block continued access to public-space content

```yaml
priority: P3
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; wait for or simulate session expiry.
2. Navigate to a public-space URL.

### Expected

- Public content remains accessible as anonymous; members-only affordances transition gracefully to the "please sign in" state.
