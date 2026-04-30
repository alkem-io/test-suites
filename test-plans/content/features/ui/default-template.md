---
feature: Client web — Default Template per flow state
slug: ui-default-template
---

<!--
  Covers client-web/src/functional-e2e/default-template/
  default-template-per-flow-state.spec.ts — admin flow to configure a
  default Post Template that auto-applies for members at a specific
  workflow state.
-->

## TC-2500 — Admin sees "Default Post Template" option in the flow-state menu

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as Space Admin; open a callout's flow-state menu.

### Expected

- Default Post Template option is visible for all configured flow states.

## TC-2501 — Opening the "Select default Post Template" dialog when none is selected

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Open the dialog on a flow state with no template currently set.

### Expected

- Dialog opens; lists available templates; confirms empty "currently-selected" state.

## TC-2502 — Admin can add a default template for a flow state

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. In the dialog, select a template; confirm.

### Expected

- Flow state now shows the template name.
- Members creating posts in this state auto-receive the template's defaults.

## TC-2503 — Admin can update an existing default template for a flow state

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. With a default already set, open the dialog, choose a different template; confirm.

### Expected

- The new selection replaces the previous; no orphan references remain.

## TC-2504 — Member-created post inherits the default template automatically

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As Space Member, create a post on a callout whose flow state has a default template.

### Expected

- Post body pre-fills with the template's default content.
- Member can override but is not forced to.
