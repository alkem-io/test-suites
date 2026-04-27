---
feature: Client web — Callouts UI (creation, publishing, contribution, moderation)
slug: ui-callouts
---

<!--
  Covers client-web/src/functional-e2e/callouts/ — 9 spec files end-to-end
  covering admin-side CRUD + workflows and member-side contribution and
  commenting. Distinct from server-api/callout.md (which is API-level).
-->

## TC-2200 — End-to-end callout workflow: create, publish, contribute, comment, moderate

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As Space Admin, create a Post Collection callout.
2. Publish the callout.
3. As Space Member, add a post contribution.
4. As Space Member, comment on the callout.
5. As Space Admin, moderate the content (hide / delete / respond).

### Expected

- Each step succeeds with the documented UI affordance for that role.
- Content transitions through draft → published → contributed → moderated without data loss.

## TC-2201 — Space Admin has full access to callout creation, editing, deletion, and publish actions

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as Space Admin; verify every callout action's availability.

### Expected

- Create, Edit details, Edit settings, Publish, and Delete all present and functional.

## TC-2202 — Space Member has limited access: contribute and comment only

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as Space Member; attempt admin-only callout actions.

### Expected

- Create, Edit, Delete, Publish all hidden or disabled.
- Contribute and comment available.

## TC-2203 — Admin can create a Callout of each framing type (Post, Whiteboard, Memo) and each collection type (Posts / Links & Files / Memos / Whiteboards)

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Walk the create-callout dialog for each of: Post, Whiteboard, Memo, Posts Collection, Links & Files Collection, Memos Collection, Whiteboards Collection.

### Expected

- Every type is creatable; each renders its distinct body editor and settings.

## TC-2204 — Admin cannot create a callout as a Space Member (negative control)

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Sign in as Space Member; attempt to open the create-callout dialog.

### Expected

- No affordance to open the dialog; deep-linking fails gracefully.

## TC-2205 — Subspace Admin can create callouts in their subspace but not in the parent Space

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a Subspace Admin (no parent-space rights), create a callout in the subspace.
2. Attempt the same in the parent space.

### Expected

- Subspace creation succeeds; parent-space attempt is denied.

## TC-2206 — Admin can edit callout details and settings; can publish a draft

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Create a draft callout as admin.
2. Edit details (name, description, tags) and settings (framing, contribution policy).
3. Publish.

### Expected

- Edits persist across reload.
- Publishing transitions the callout to Visible state for members.

## TC-2207 — Admin can delete a callout; members cannot

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As admin, delete an existing callout; confirm removal.
2. As member, attempt delete (expect no affordance).

### Expected

- Admin delete removes the callout from listings and queries.
- Member has no delete path.

## TC-2208 — Space Admin can view a draft callout; Space Member cannot

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Admin creates a draft; both admin and member navigate to its URL.

### Expected

- Admin sees the draft content with draft-state indicator.
- Member sees access-denied or sees the content not listed.

## TC-2209 — Published callout visible to both admin and member; draft never to member

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Publish a callout and confirm visibility for both roles.
2. Create a new draft; confirm member cannot see it.

### Expected

- Visibility aligns with the documented state machine.

## TC-2210 — Space Admin and Space Member can each add comments on a callout

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As Space Admin, add a comment on a published callout.
2. As Space Member, add another comment.

### Expected

- Both comments render with correct authorship.
- The comment thread shows them in posting order.

## TC-2211 — Comment thread is viewable by all community members

```yaml
priority: P2
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. With multiple comments on a callout, open the thread as a Space Member.

### Expected

- All comments load; reply / reaction affordances are available per policy.

## TC-2212 — Member can add a Post contribution and a Link contribution; can edit their own

```yaml
priority: P1
type: e2e
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Add a Post contribution on a Posts Collection callout.
2. Add a Link contribution on a Links & Files Collection callout.
3. Edit the Post contribution as its author.

### Expected

- Contributions appear attributed to the member.
- Edit updates persist on reload.
