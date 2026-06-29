# CRD Callout Selector Contract & Gap Log

For a UI-test feature there is no API contract. The analogous "contract" is the set of **stable, accessible hooks the CRD callout surfaces must expose** for the suite to target without brittle selectors. This file is both the target contract and the running **gap log** required by FR-008 / SC-007: any required hook the CRD build does not provide is recorded here as a finding rather than worked around silently.

Selector priority order (per client-web `src/crd/CLAUDE.md`): `getByRole(role, { name })` → `getByLabel` / `getByPlaceholder` → `data-slot` → `data-testid` (last resort; CRD primitives do not define test ids — those belong in the `src/main/crdPages/` integration layer if needed).

## How to use this file

1. During implementation, for each row, inspect the running CRD surface (Playwright codegen / accessibility snapshot) — **accessible names below are derived from client-web specs + component source and MUST be confirmed against the live build**.
2. Set **Status**: `OK` (hook present and stable, name confirmed), `ALT` (different but acceptable stable hook found — note it), or `GAP` (no stable accessible hook — file a finding).
3. Every `GAP` row is a reviewable follow-up (e.g. a client-web issue requesting a `data-testid` or accessible name). The count of `GAP` rows is reported at verification (SC-007).

## MUI-era selectors to eliminate (SC-004)

These are the concrete legacy hooks in the current suite that the CRD build no longer exposes. Each must be replaced with a CRD-valid strategy (target column) and confirmed.

| Legacy selector | Location (today) | CRD replacement (to confirm) | Status |
|---|---|---|---|
| `[data-testid="callout-card"]` | `CollaborationPage.ts:31` | callout card by heading/accessible name; `PostCard` `<article>` / title link | _TBD_ |
| `[data-testid="draft-indicator"], .draft-badge` | `CollaborationPage.ts:118` | `getByText(/draft/i)` on `PostCard` Badge (amber) | _TBD_ |
| `[data-testid="EditOutlinedIcon"]` | `0.4callout-contributions.spec.ts:146` | contribution edit affordance via role + accessible name | _TBD_ |
| `.first()`/`.last()`/`.nth()` (19+ uses) | `CollaborationPage.ts` + specs | stable role + accessible name; annotate any unavoidable residual | _TBD_ |
| `/create\|post/i`, `/confirm\|yes\|delete\|publish/i` (broad regexes) | `CollaborationPage.ts:22,207` | narrowed, dialog-scoped role + name | _TBD_ |

## Contract: required hooks per CRD callout surface

### Callout feed card — `PostCard` (`src/crd/components/space/PostCard.tsx`)

| Element | Required hook (preferred) | Status | Note |
|---|---|---|---|
| Card container | `article` role / scoping wrapper | _TBD_ | replaces `[data-testid="callout-card"]` |
| Callout title (opens detail) | link, accessible name = callout title | _TBD_ | inside `<h3>` |
| Draft badge | text `/draft/i` | _TBD_ | amber Badge when `isDraft` |
| Framing-type label | text `/(whiteboard\|memo\|post\|poll\|media gallery\|call to action)/i` | _TBD_ | i18n `callout.{type}` |
| Whiteboard framing preview | button `/open whiteboard/i` | _TBD_ | preview, not inline editor |
| Memo framing preview | button `/open memo/i` | _TBD_ | CroppedMarkdown preview |
| Comments footer toggle (collapsed) | button `/N comments/i` (chevron) | _TBD_ | inline expand (020/089 US5) |
| Expand button | button `/expand/i` (icon-only `aria-label`) | _TBD_ | opens detail dialog |
| Settings (3-dots) | button `/settings/i` (icon-only `aria-label`) | _TBD_ | renders `CalloutContextMenu` |

### Create / Edit callout form — `AddPostModal` (`src/crd/forms/callout/AddPostModal.tsx`)

| Element | Required hook | Status | Note |
|---|---|---|---|
| Dialog container | `dialog` role | _TBD_ | Radix Dialog |
| Dialog title | heading `/create post\|edit post/i` | _TBD_ | i18n `forms.createPost`/`editPost` — confirm exact copy |
| Close (X) | button, `aria-label` `/close/i` | _TBD_ | icon-only |
| Title input | label/`getByLabel(/title/i)` | _TBD_ | autofocused; no MUI `" *"` suffix |
| Title error | `alert` / `aria-live="polite"` region | _TBD_ | |
| Description editor | textbox `/description/i` (CRD MarkdownEditor) | _TBD_ | injected slot |
| Framing chips zone | `radiogroup`: Whiteboard, Memo, Document (disabled), Call to Action, Image, Poll | _TBD_ | `aria-pressed` active; locked in edit (`aria-disabled`, FR-111) |
| Response chips zone | `radiogroup`: Links & Files, Posts, Memos, Whiteboards, Documents (disabled) | _TBD_ | locked entirely in edit (FR-112) |
| Collection-type buttons (current suite) | button names `None`/`Links & Files`/`Posts`/`Memos`/`Whiteboards` | _TBD_ | replace `.last()` on `None` |
| CTA label / URL inputs | textbox `Call To Action` / `URL` | _TBD_ | confirm names |
| More Options toggle | button `/more options/i` (`aria-expanded`) | _TBD_ | reveals tags/references/comments |
| Notify-members switch | switch `/notify/i` | _TBD_ | create only, when title non-empty |
| Save Draft | button `/save draft/i` | _TBD_ | create only |
| Publish | button `/publish/i` (`aria-busy` while submitting) | _TBD_ | create only |
| Save | button `/save/i` (`aria-busy`) | _TBD_ | edit only |
| Cancel | button `/cancel/i` | _TBD_ | |

### Callout detail dialog — `CalloutDetailDialog` (`src/crd/components/callout/CalloutDetailDialog.tsx`)

| Element | Required hook | Status | Note |
|---|---|---|---|
| Dialog container | `dialog` role | _TBD_ | |
| Title | heading, accessible name = callout title | _TBD_ | sticky header + `h1` body |
| Share | button `/share/i` (icon-only) | _TBD_ | |
| Settings (3-dots) | button `/settings/i` | _TBD_ | `CalloutContextMenu` |
| Close (X) | button `/close/i` | _TBD_ | |
| Description (markdown) | rendered `MarkdownContent` | _TBD_ | rendered, not raw |
| Contributions header | heading level 2 `/contributions/i` + count badge | _TBD_ | replaces `getByRole('heading',{level:2})` count proxy |
| Contributions grid | `list`/`grid` of contribution cards | _TBD_ | |
| Discussion / comments header | heading level 2 `/comments\|discussion/i` + count badge | _TBD_ | |

### Context menu — `CalloutContextMenu` (`src/crd/components/callout/CalloutContextMenu.tsx`)

| Element | Required hook | Status | Note |
|---|---|---|---|
| Menu trigger | button `/settings/i` (`aria-label`) | _TBD_ | |
| Edit | menuitem `/edit/i` | _TBD_ | when `editable` |
| Publish / Unpublish | menuitem `/publish/i` / `/unpublish/i` | _TBD_ | draft state dependent |
| Share | menuitem `/share/i` | _TBD_ | |
| Delete | menuitem `/delete/i` | _TBD_ | opens `DeleteCalloutDialog` |
| Move / Sort items | menuitem `/move (top\|up\|down\|bottom)/i`, `/sort/i` | _TBD_ | privilege/position gated |

### Add contribution (post / memo / whiteboard / link)

| Element | Required hook | Status | Note |
|---|---|---|---|
| Add contribution affordance | button `/add( post\| memo\| whiteboard)?/i` | _TBD_ | replaces `getByRole('button',{name:'Add',exact:true})` |
| Post: title input | label `/title/i` | _TBD_ | |
| Post: description editor | textbox `/description\|markdown editor/i` | _TBD_ | |
| Link: url / title inputs | label `/url/i`, `/title/i` | _TBD_ | replaces regex `getByLabel(/url/i)` |
| Submit | button `/submit\|post\|create\|save/i` (scoped) | _TBD_ | |
| Discard guard | `DiscardChangesDialog` (`/keep editing/i`, `/discard/i`) | _TBD_ | when form dirty |

### Comment input & thread — `CommentInput` / `CommentThread` (`src/crd/components/comment/`)

| Element | Required hook | Status | Note |
|---|---|---|---|
| Comment input | textbox `/comment\|message/i` | _TBD_ | **at TOP of thread** (089 FR-001) — confirm placement |
| Send | button `/send\|submit/i` | _TBD_ | |
| Comment list | `list` of `listitem` | _TBD_ | newest-first top-level (FR-002) |
| Comment body | rendered `InlineMarkdown` text | _TBD_ | re-check `locator('p',{hasText})` assertions |
| Reply | button `/reply/i` | _TBD_ | **top-level only** (089 FR-005) |
| Delete comment | button `/delete/i` | _TBD_ | own/admin; may route through confirm |

### Delete / visibility confirmation dialogs

| Element | Required hook | Status | Note |
|---|---|---|---|
| Delete callout dialog | `dialog`, heading `/delete callout/i` | _TBD_ | `DeleteCalloutDialog` |
| Delete confirm (destructive) | button `/delete\|yes/i` (scoped to dialog) | _TBD_ | step 2 of two-step delete |
| Delete cancel | button `/cancel\|no/i` | _TBD_ | |
| Visibility change dialog | `dialog`, heading `/(publish\|unpublish) callout/i` | _TBD_ | `CalloutVisibilityChangeDialog` |
| Notify-members switch (publish) | switch `/notify/i` | _TBD_ | publish only |
| Confirm | button `/publish\|unpublish/i` | _TBD_ | |

## Gap Log (FR-008 / SC-007)

> To be populated during the implementation pass against the running CRD build.
> A `GAP` is a CRD surface lacking a stable accessible hook needed to assert an
> existing scenario. A non-empty gap log does not block the alignment, but each
> gap must be visible and have a proposed follow-up — no gap may be hidden behind
> a position-based or copy-fragile selector.

| # | Surface / element | Finding | Proposed follow-up | Status in suite |
|---|---|---|---|---|
| 1 | Callout detail dialog → comment box | The comment `textbox` exposes **no accessible name/label** — only `placeholder="Add a comment..."`. Role+name selection is impossible; the suite targets it via `getByPlaceholder('Add a comment...')`. | Request client-web add an `aria-label` (e.g. "Add a comment") to the comment input so tests aren't placeholder-coupled. | Handled via `getByPlaceholder` in `CollaborationPage.commentInput` (placeholder-coupled, language-sensitive). |

### Confirmed against live CRD build (0.9callout-viewing, 2026-06-23)

| Surface / element | Confirmed hook | Status |
|---|---|---|
| Callout card → open detail dialog | `link` name `Open {title}` (the heading is **not** the click target) | OK |
| Detail dialog → context-menu trigger | `button` name `Settings` | OK |
| Context menu → publish | `menuitem` name `Publish` | OK |
| Publish confirmation | **`alertdialog`** (not `dialog`) titled `Publish this post?`, confirm `button` `Publish`, `switch` `Notify space members` (default on) | OK (role=alertdialog) |
| Comment box | `textbox` placeholder `Add a comment...` (no accessible name — see Gap #1) | ALT |
| Draft badge | text `Draft` on the card | OK |

### Confirmed across the full suite (0.1–0.9, 2026-06-23)

**Create / edit form (`AddPostModal`)**
| Element | Confirmed hook | Status |
|---|---|---|
| Tab create trigger | `button` name `Add Post` **exact** (lowercase `Add post` is the contribution button) | OK |
| Title | `textbox` name `Title` | OK |
| Body editor | `textbox` name `Write something...` | OK |
| Framing | `radio` in `radiogroup "Add to post"`: `Whiteboard`/`Memo` (**exact** — avoid plural responses), `Call to Action`, `Media Gallery`, `Poll` | OK |
| Responses | `radio` in `radiogroup "Responses"`: `Links & Files`/`Posts`/`Memos`/`Whiteboards` (shown inline, no Expand) | OK |
| CTA fields | `textbox` `Display Name` + `textbox` `URL` | OK |
| Submit | `button` `Post` (create) / `Save` (edit); draft `button` `Save Draft` | OK |

**Contributions**
| Element | Confirmed hook | Status |
|---|---|---|
| Add contribution | `button` in dialog: `Add post` / `Add link or file` (by collection type) | OK |
| Post contribution editor | `textbox` name `Write your post...` (distinct from create form's `Write something...`) | OK |
| Link contribution form | `textbox` `URL` + `textbox` `Display name`; submit `button` `Add` (exact) | OK |
| Open a contribution | dialog-scoped `button` whose name starts with the contribution title (feed has a duplicate behind the dialog) | OK |
| Edit a contribution | `button` `Edit response` on the opened contribution preview (replaces `[data-testid="EditOutlinedIcon"]`) | OK |

**Confirmations & login**
| Element | Confirmed hook | Status |
|---|---|---|
| Delete callout confirm | `alertdialog`, confirm `button` `Delete` | OK |
| Publish confirm | `alertdialog "Publish this post?"`, `button` `Publish`, `switch` `Notify space members` | OK |
| Fixture login | in-SPA header `link "Log in"` (a full-page visit to `/login` does NOT init the Kratos flow — fields never render) | OK |
| Cookie banner | `button` `Accept All Cookies` (can overlay the create dialog's submit; dismissed in `navigateToSpace`) | OK |

**Run profile (required for a green suite):** `--workers=1` (parallel logins overload the local stack) and `--retries=2` (transient Kratos-flow-init flake) — matches the CI nightly config.

**Reporting rule**: At verification, report the total count of `GAP` rows.
