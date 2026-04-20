---
feature: Callouts and Posts
slug: callout
---

<!--
  Covers server-api/src/functional-api/callout/.
  Callouts are the primary content container in a Space/Subspace; Posts are
  the user-authored content that lives within a Callout.
-->

## TC-0200 — Authorized users can create, update, and delete a Callout

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As a Space admin, call `createCalloutOnCollaboration` with a display name, type, and description.
2. Update the display name and framing text via `updateCallout`.
3. Delete the callout via `deleteCallout`.

### Expected

- Each mutation returns the callout in its post-mutation state.
- After delete, subsequent queries no longer return the callout.

## TC-0201 — Callout CRUD authorization is enforced at every journey level

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Attempt create / update / delete as each of: non-member, member, community manager, admin.
2. Repeat at Space, Subspace, and Subsubspace levels.

### Expected

- Only roles with the appropriate privilege (e.g. `CREATE` for create, `DELETE` for delete) succeed.
- All other attempts return `AuthorizationPrivilegeError` (or the equivalent).

## TC-0202 — A user can create a Post on a Callout with initial content

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. On an existing Callout of type `POST_COLLECTION`, call `createPostOnCallout` with a display name and description.
2. Query the callout's posts.

### Expected

- The post appears in the callout with the expected author, display name, and description.
- The post has a default visual and an auto-generated `nameID`.

## TC-0203 — Post authors and admins can update, comment on, and delete a Post

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Update a post's description as its author.
2. Add a comment to the post's comments room as another community member.
3. Delete the post as its author; separately, as an admin.

### Expected

- Updates succeed for the author and for admins; fail with auth error for unrelated users.
- Comments are visible to all community members; non-members cannot post.
- Delete succeeds for author and admin.

## TC-0204 — Closed Callouts restrict user privileges as configured

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Set an existing Callout to `closed: true`.
2. As a regular member, attempt to add a post, a comment, and a reaction.
3. As a community manager or admin, attempt the same.

### Expected

- Regular members receive authorization errors for content-adding operations.
- Admins and community managers retain appropriate privileges as defined by the close-state policy.

## TC-0205 — Posts can attach references and be retrieved with them

```yaml
priority: P3
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. On a post, attach an external reference (URL) via `createReferenceOnProfile`.
2. Query the post, expanding its references.

### Expected

- The reference appears in the post's `profile.references` list with the correct URL and display name.
- Updating or deleting the reference reflects immediately on next query.
