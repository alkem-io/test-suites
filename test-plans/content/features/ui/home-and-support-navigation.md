---
feature: Client web — home menus and support navigation
slug: ui-home-and-support-navigation
---

<!--
  Covers:
    client-web/src/functional-e2e/home-menus.spec.ts
    client-web/src/functional-e2e/support-navigation/
-->

## TC-1700 — Tools menu navigation exposes every tool entry

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the Tools menu from the header.
2. Click each entry and verify it navigates to the expected page.

### Expected

- Every Tools-menu entry navigates without 404 or console error.
- Active-page highlight behaves correctly on return.

## TC-1701 — User menu (avatar) navigation works for every entry

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; click the user avatar; click each menu entry.

### Expected

- Profile, Account settings, Membership settings, and Sign out entries all navigate correctly.

## TC-1702 — Left sidebar menu navigates between top-level sections

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; verify the left sidebar.
2. Click each entry.

### Expected

- Each entry navigates; the active-section indicator updates.

## TC-1710 — Support dialog opens and closes cleanly

```yaml
priority: P3
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the Support dialog from the help entry.
2. Close it via the close button and via the ESC key.

### Expected

- Dialog closes in both flows; focus returns to the trigger.

## TC-1711 — Documentation page is accessible directly and via dashboard → documentation

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the documentation URL directly.
2. Navigate: Dashboard → Support → Documentation; use the back link to return.

### Expected

- Direct URL loads documentation without redirect loop.
- Back-link returns to the dashboard with preserved scroll position.

## TC-1712 — Complete support journey: Dashboard → Documentation → Inviting tutorial → back

```yaml
priority: P3
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. From the dashboard, open Support → Documentation.
2. Click the Inviting tutorial; return to the dashboard.

### Expected

- All intermediate pages load without error.
- The final return to dashboard lands on the same home state.
