# Collaboration Tool (Callout) Templates - Test Plan

## Overview

Collaboration Tool Templates (also known as Callout Templates) have the most complex form structure among template types. This document outlines the test strategy and implementation plan.

## Form Structure

### 1. Template Metadata (shared with all templates)
- `displayName`: Template title
- `description`: Template description (markdown)
- `tags`: Array of strings

### 2. Callout Base Fields
- `title`: Callout title (required)
- `calloutTags`: Tags for the callout itself
- `calloutDescription`: Callout description (markdown)

### 3. Additional Content (mutually exclusive)
| Type | Fields | Notes |
|------|--------|-------|
| `none` | - | Default, no extra content |
| `whiteboard` | `textInWhiteboard` | Opens Excalidraw editor |
| `memo` | `memoContent` | Markdown editor |
| `callToAction` | `ctaText`, `ctaUrl` | Text field + URL field |

### 4. Response Options

#### 4.1 Comments
- `commentsEnabled`: boolean (No Comments / Comments buttons)

#### 4.2 Collection Type (mutually exclusive)
| Type | UI Label | Collection Settings Fields |
|------|----------|---------------------------|
| `none` | None | - |
| `linksFiles` | Links & Files | `membersCanAdd`, `adminsCanAdd` |
| `posts` | Posts | `defaultTitle`, `defaultDescription`, `membersCanAdd`, `adminsCanAdd`, `enableCommentsOnPosts` |
| `memos` | Memos | `defaultTitle`, `defaultDescription`, `membersCanAdd`, `adminsCanAdd` |
| `whiteboards` | Whiteboards | `defaultTitle`, `textInWhiteboard`, `membersCanAdd`, `adminsCanAdd` |

## Test Strategy

### Representative Coverage Approach
Instead of testing all 40 combinations (4 additionalContent × 2 comments × 5 collection), we use representative coverage:

1. **One spec file per Additional Content type** (4 files)
2. **Each spec tests CRUD with a representative collection type**
3. **Comments toggle tested in one spec for each state**

### Test Matrix

| Spec File | Additional Content | Collection | Comments | Focus |
|-----------|-------------------|------------|----------|-------|
| `callout-none.spec.ts` | None | Links & Files | Disabled | Basic callout, simple collection |
| `callout-whiteboard.spec.ts` | Whiteboard | Posts | Enabled | Excalidraw + rich collection |
| `callout-memo.spec.ts` | Memo | Memos | Disabled | Memo content + memo collection |
| `callout-cta.spec.ts` | Call To Action | Whiteboards | Enabled | CTA fields + whiteboard collection |

## Folder Structure

```
templates/template-types/
├── callout/
│   ├── CALLOUT-TEMPLATES-PLAN.md          # This file
│   ├── callout-none.spec.ts               # None additional content
│   ├── callout-whiteboard.spec.ts         # Whiteboard additional content
│   ├── callout-memo.spec.ts               # Memo additional content
│   └── callout-cta.spec.ts                # Call To Action additional content
├── forms/
│   ├── callout/
│   │   ├── callout-template-form.models.ts    # All interfaces
│   │   ├── callout-template-form.ts           # Main form orchestrator
│   │   ├── additional-content/
│   │   │   ├── none.ts
│   │   │   ├── whiteboard.ts
│   │   │   ├── memo.ts
│   │   │   └── call-to-action.ts
│   │   └── collection/
│   │       ├── none.ts
│   │       ├── links-files.ts
│   │       ├── posts.ts
│   │       ├── memos.ts
│   │       └── whiteboards.ts
│   └── ... (existing form helpers)
└── verify/
    └── callout/
        └── callout-template-verify.ts

```

## Implementation Order

### Phase 1: Models & Interfaces
1. Create `callout-template-form.models.ts` with all type definitions

### Phase 2: Additional Content Helpers
1. `additional-content/none.ts` - no-op helper
2. `additional-content/whiteboard.ts` - reuse Excalidraw logic
3. `additional-content/memo.ts` - markdown editor helper
4. `additional-content/call-to-action.ts` - text + URL fields

### Phase 3: Collection Helpers
1. `collection/none.ts` - no-op
2. `collection/links-files.ts` - simple toggles
3. `collection/posts.ts` - full settings dialog
4. `collection/memos.ts` - settings dialog without comments
5. `collection/whiteboards.ts` - settings with whiteboard canvas

### Phase 4: Main Form Orchestrator
1. `callout-template-form.ts` - combines all helpers

### Phase 5: Verification
1. `callout-template-verify.ts` - verification logic

### Phase 6: Spec Files
1. `callout-none.spec.ts`
2. `callout-whiteboard.spec.ts`
3. `callout-memo.spec.ts`
4. `callout-cta.spec.ts`

## UI Selectors Reference

### Dialog
- Create: `dialog "Create new Collaboration Tool Template"`
- Edit: `dialog "Edit Collaboration Tool Template"` (assumed)

### Template Metadata Section
- Title: `textbox "Template title"`
- Description: `textbox "Markdown editor"` (first one)
- Tags: `combobox "Template tags Tags"`

### Callout Fields Section
- Title: `textbox "Title"` (required)
- Tags: `combobox` (second one, unlabeled in form)
- Description: `textbox "Markdown editor"` (second one)

### Additional Content Buttons
- None: `button "None"` (first group)
- Whiteboard: `button "Whiteboard"` (first in Additional Content)
- Memo: `button "Memo"`
- Call To Action: `button "Call To Action"`

### Additional Content Fields
- Whiteboard: Shows canvas with `button "Edit"` to open Excalidraw
- Memo: Opens markdown editor inline
- CTA: `textbox "Call To Action"` + `textbox "URL"`

### Response Options Section
- Expand: `button "Expand"` (to reveal collection section)

### Comments Section
- No Comments: `button "No Comments"`
- Comments: `button "Comments"`

### Collection Section
- None: `button "None"` (second group)
- Links & Files: `button "Links & Files"`
- Posts: `button "Posts"`
- Memos: `button "Memos"`
- Whiteboards: `button "Whiteboards"`
- Settings: `button "Collection settings"`

### Collection Settings Dialog
- Title: `textbox "Title"`
- Description: `textbox "Markdown editor"` or whiteboard canvas
- Members toggle: `checkbox "Members can add to the collection"`
- Admins toggle: `checkbox "Admins can add to the collection"`
- Comments toggle (Posts only): `checkbox "Enable comments on each Post in the collection"`
- Back: `button "Back"`
- Save: `button "Save"`

### Form Actions
- Create: `button "Create"`
- Update: `button "Update"`
- Delete: `button "Delete"`
