---
feature: Templates — Space, Post, Whiteboard
slug: templates
---

<!-- Covers server-api/src/functional-api/templates/. -->

## TC-0800 — Admins can CRUD a Subspace template

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a Subspace template with display name, description, and a collaboration definition.
2. Update the display name and tags.
3. Delete the template.

### Expected

- All three operations succeed for admins; non-admins get authorization errors.

## TC-0801 — A Post template can be applied when creating a Post

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Define a Post template with a default description and tags.
2. Create a Post on a callout, specifying the template.

### Expected

- The created Post inherits the template's default description and tags.
- Subsequent edits to the template do NOT retroactively modify existing Posts.

## TC-0802 — Post templates: CRUD authorization is enforced across roles

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Attempt CRUD as: non-member, member, content manager, admin.
2. Repeat on a private template library and a public one.

### Expected

- Only roles with `TEMPLATE_MANAGE` privilege succeed.
- Public-library queries succeed for any authenticated user; private libraries only for scoped members.

## TC-0803 — Negative scenarios: invalid payloads, missing required fields, stale references

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a template with an empty display name.
2. Create a template referencing a non-existent tag-set.
3. Delete a template currently referenced by a Post.

### Expected

- Each case returns a clear validation or conflict error without corrupting state.

## TC-0804 — Whiteboard templates round-trip through create, list, apply, and delete

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a Whiteboard template carrying a content payload.
2. List templates on a library.
3. Apply the template when creating a new Whiteboard Callout.
4. Delete the template.

### Expected

- The list query returns all templates in the library.
- Applying a template produces a Whiteboard with its content preloaded.
- Delete is rejected if the template is still referenced; succeeds otherwise.
