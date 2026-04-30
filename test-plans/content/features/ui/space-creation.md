---
feature: Client web — Space creation from Account / Organization
slug: ui-space-creation
---

<!--
  Covers client-web/src/functional-e2e/space/ — create-space dialog from
  both personal account and organization contexts.
-->

## TC-2300 — Successfully create a new Space from the user's account

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in; open the create-space dialog.
2. Enter a valid title, URL slug, accept terms, submit.
3. Confirm the space opens.

### Expected

- Dialog closes on success; space dashboard loads.
- Space appears in the user's memberships.

## TC-2301 — Successfully create a new Space from an Organization

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as an organization admin; from the organization context, open the create-space dialog.
2. Complete creation.

### Expected

- Created space belongs to the organization (not the user's personal account).

## TC-2302 — URL auto-generation from the title works across account + organization contexts

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the dialog; type a title.
2. Observe the URL field populate automatically.
3. Edit the title; confirm URL updates until manually edited.

### Expected

- Auto-slug matches the expected transformation (lowercase, hyphenated, no special chars).

## TC-2303 — URL length validation: reject URLs exceeding the documented maximum

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the dialog; paste a URL exceeding the max length.

### Expected

- Validation error appears; submit button disabled until length is corrected.

## TC-2304 — Terms-and-conditions checkbox enforced at submit time

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Fill valid fields but leave the T&C checkbox unchecked; attempt to submit.

### Expected

- Submit is rejected with a clear message pointing to the checkbox.

## TC-2305 — Cancel / Close button returns the dialog state without side effects

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the dialog, fill some fields, click Cancel.
2. Repeat with the top-right close (×) button.

### Expected

- Dialog closes; no partial space is created; no backend call made.

## TC-2306 — Dialog form elements verification (both contexts)

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the dialog from both account and organization contexts.
2. Verify every visible form element (title, URL, description, T&C, submit / cancel).

### Expected

- All elements present and labelled consistently across the two entry points.
