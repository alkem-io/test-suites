---
feature: Client web — collaborative whiteboards
slug: ui-whiteboards
---

<!--
  Covers client-web collaborative-whiteboard capabilities documented in
  alkem-io/client-web. Whiteboards are a primary content type on callouts
  and support both authenticated collaboration and public guest access.
-->

## TC-1800 — A community member can open a whiteboard callout and see existing content

```yaml
priority: P1
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. Sign in as a community member on a space that contains a populated whiteboard callout.
2. Open the whiteboard.

### Expected

- The whiteboard loads within 3 seconds with all existing shapes, text, and images.
- The cursor of any other connected user is visible in real time.

## TC-1801 — A user can draw shapes, add text, and insert images on a whiteboard

```yaml
priority: P1
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. On an open whiteboard, draw a rectangle, add a text block, and upload an image.
2. Reload the page.

### Expected

- Each addition is persisted server-side within 5 seconds.
- After reload, all additions are restored exactly.

## TC-1802 — Collaborative editing: two users see each other's changes in real time

```yaml
priority: P1
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. Two authenticated users open the same whiteboard simultaneously.
2. User A adds a shape; user B adds a text block.

### Expected

- Both users see both additions within 2 seconds.
- Each user's cursor and selection are visible to the other.

## TC-1803 — An anonymous guest can access a public whiteboard via a shareable link

```yaml
priority: P2
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. As an anonymous visitor, follow a public whiteboard share link.
2. Enter a display name when prompted.
3. Draw a shape as the guest.

### Expected

- Guest can view and edit the whiteboard with full feature access (per the guest policy).
- Guest edits are tagged to the anonymized display name.

## TC-1804 — Whiteboard content can be exported to disk

```yaml
priority: P2
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. On a populated whiteboard, trigger the export action.
2. Save the exported file and open it locally.

### Expected

- The exported file (image / PDF / .excalidraw, per the implementation) renders the whiteboard faithfully.
- Export works both for authenticated users and guests.

## TC-1805 — Session persistence across page refreshes for both authenticated and guest users

```yaml
priority: P2
type: e2e
state: Ready
automation: optional
owner: ev.dimitrovv
```

### Steps

1. Open a whiteboard as each of: authenticated user, guest.
2. Refresh the page.

### Expected

- Session / guest display name persists through refresh; the whiteboard re-renders without losing context.
