---
feature: Client web — Templates UI (Post, Whiteboard, Community Guidelines, Callout variants)
slug: ui-templates
---

<!--
  Covers client-web/src/functional-e2e/templates/template-types/ — Post,
  Whiteboard, Community Guidelines, and the big callout-combinatorics matrix.
  Distinct from server-api/templates.md (which is API-level).
-->

## TC-2400 — Navigate to the templates settings surface from any context

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. From a Space, open Settings → Templates.
2. Repeat from an Organization, and at the platform level.

### Expected

- The templates settings page loads at each level with the correct scope.

## TC-2410 — Post template: create, edit (with cancel / confirm dialog), delete

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a Post template with default description and tags.
2. Edit it; exercise the cancel-without-save and confirm-save paths.
3. Delete it.

### Expected

- Each action persists through reload; cancel discards changes without side effects.

## TC-2420 — Whiteboard template: create, edit, apply-to-whiteboard, delete

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a Whiteboard template carrying a content payload.
2. Edit it.
3. Create a new whiteboard and apply the template.
4. Delete the template.

### Expected

- Applied template preloads the whiteboard's initial content.
- Deletion succeeds when no references block it.

## TC-2430 — Community Guidelines template: create, edit, use, verify edit/cancel/confirm dialog, delete

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a Community Guidelines template.
2. Edit; exercise cancel and confirm dialogs.
3. Apply to a community; verify propagation.
4. Delete.

### Expected

- Guidelines template renders in the community's guidelines surface.
- Cancel path loses the unsaved edits; confirm path persists.

## TC-2440 — Callout combinatorics matrix: every Framing × Response × Comments × Contribution combination renders correctly

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create callouts of each documented combination (None / Whiteboard / Memo / Call-to-Action framing × None / Links-and-Files / Posts / Memos / Whiteboards response × Comments on/off × Contribution on/off/admin).
2. Verify each renders the expected UI surface.

### Expected

- Every combination in the matrix renders without console errors.
- Contribution and comment affordances appear / are hidden per the combination's configuration.
