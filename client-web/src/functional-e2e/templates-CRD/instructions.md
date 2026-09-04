# Callout Tests — Resume Instructions

You (future Claude) are continuing work on **`template-types/callout-tests.spec.ts`** — the 40+ callout/collaboration-tool template tests in this `templates-CRD/` folder. The other three template types (whiteboard, post, community-guidelines) have already been migrated to the redesigned CRD UI in this same folder.

If the user gives you a failing test number, jump to **§ Resume workflow** at the bottom.

## What "the redesigned UI" means

The platform shipped a redesigned Templates settings page gated on the localStorage flag `alkemio-crd-enabled`. Set it (and reload) in every `beforeEach`:

```ts
await page.evaluate(() => localStorage.setItem('alkemio-crd-enabled', 'true'));
await page.reload();
```

The CRD page is structurally different from the legacy one — most selectors changed.

### Universal patterns (apply across all template types)

| Thing | Legacy | New |
|---|---|---|
| Page banner | "Here you can create and edit Templates…" text | `textbox "Search templates…"` |
| Settings entry | `tab "Settings"` in space tabs | `link "Settings"` in the space banner |
| Section header | `heading "Whiteboard Templates"` | `button "Whiteboard templates 3 …"` (count baked in) |
| Add | `button "Create new"` | `button "Add new"` → opens menu → `menuitem "Create new"` |
| Create dialog title | `Create new Whiteboard Template` | `Create <slug> template` (slugs: `whiteboard`, `post`, `community-guidelines`, `collaboration-tool`) |
| Edit dialog title | `Edit Whiteboard Template` | `Edit <slug> template` |
| Submit button | `Create` / `Update` | `Save` |
| Cancel w/ unsaved | (none) | `alertdialog "Discard changes?"` → `Discard` / `Keep editing` |
| Card | `link "Contribute"` MUI card | `button "Preview: <name>"` + `heading <name>` (level 4) + description paragraph + optional tag list |
| Preview dialog | `Preview — <name>` heading | `dialog "<name> <section name>"`, buttons `Edit template` / `Close` |

**Section order in `Add new` button list** (used by `.nth(N)`):
0 Space templates, 1 Collaboration tools, 2 Whiteboard templates, 3 Post templates, 4 Community guidelines templates.

**Tag chips are lowercased on input.** Keep test data lowercase (CG already fixed: `tags: ['template', 'cg']`).

**Description textbox ambiguity**: reference rows expose a textbox with the same accessible name "Description" as the template-level field. `template-form.ts` already uses `getByPlaceholder('What is this template for?')` to disambiguate.

### Whiteboard editor (used by callout whiteboard framing and whiteboards-response default)

- Editor opens as a nested `dialog` **named after the whiteboard's display name**
  (post local-first rework, client#10205/#10207/#10241) — the old `Drawing canvas`
  text is gone.
- Open via `openWhiteboardEditor(page)` (clicks `Start drawing` or `Edit drawing`).
- Get the editor via `getWhiteboardEditorDialog(page)` (filters by the stable
  `Close whiteboard` button, since the dialog name varies).
- Text tool: `editorDialog.getByTitle(/^Text —/).click()` — the radio is hidden behind a `<label>`; clicking the radio does nothing.
- **There is NO Save button.** The editor autosaves over the collaboration
  channel and finalizes on close ("durable close"): call
  `closeWhiteboardEditor(editorDialog)` (clicks `Close whiteboard`, waits for
  the dialog to disappear once content is durable). Don't press Escape — it
  first de-selects inside Excalidraw and may not close the dialog.
- "Find Template" moved to the editor **header** and is disabled until the
  Excalidraw scene initializes (click auto-waits).

## Callout-specific facts (confirmed in browser)

Create dialog: `getByRole('dialog', { name: 'Create collaboration-tool template' })`.

Inside the dialog:
1. **Template fields** (standard): handled by `fillTemplateForm(scope, templateData)` from `../template-form.ts`.
2. **Callout fields**:
   - `textbox "Title"` — `calloutTitle`
   - `textbox "Write something..."` — `calloutDescription` (rich-text)
   - `radiogroup "Add to post"` — framing. Radios: `Whiteboard`, `Memo`, `Document`, `Call to Action`, `Media Gallery`, `Poll`. **`none` = leave nothing selected.**
   - `radiogroup "Responses"` — response collection. Radios: `Links & Files`, `Posts`, `Memos`, `Whiteboards`. **`none` = leave nothing selected.**
   - When a response is selected, inline switches appear: `switch "Members can add"`, `switch "Admins can add"`, `switch "Enable comments"` (Posts at least). Plus a `button "Set Default Response"`.
   - `Set Default Response` for Posts opens `dialog "Posts defaults"` containing `Choose a template…` button, `textbox "Default title"`, `textbox "Guidance shown when a member starts a new contribution"` (rich-text), `Cancel` / `Save`.
   - **Callout tags input**: same chip pattern as template-level tags — accessible name `"Add a tag and press Enter"`, fill+Enter per tag (was briefly comma-separated in an earlier UI revision; that's gone). Both the template-level and callout-level tag inputs now share that accessible name, so disambiguate by DOM order: template = `.first()`, callout = `.nth(1)`. Already wired in the helpers.
   - `switch "Allow comments"` — `commentsEnabled`.
   - References: `button "Add another reference"` opens reference rows (assumed identical to CG: `listitem` with `textbox "Name"`/`textbox "URL"`/`textbox "Description"` + `button "Remove reference"`).
3. Footer: `button "Cancel"` / `button "Save"`.

## File map and confidence levels

| File | Status | Notes |
|---|---|---|
| `template-types/callout-tests.spec.ts` | ✅ Updated | `createAndVerifyCalloutTemplate` rewritten for the new UI. The 40+ tests below it are unchanged data-only calls. |
| `forms/callout/callout-template-form.models.ts` | ✅ Unchanged | Data shapes, no UI selectors. |
| `forms/callout/callout-template-form.ts` | ✅ Validated | Orchestrator. Self-contained. Exports `fillCalloutTemplateForm`, `getCalloutTemplateDialog`, `setSwitch`. |
| `forms/callout/callout-template-framing.ts` | ✅ Whiteboard / Memo / CTA validated | **Whiteboard framing**: select `radio "Whiteboard"` in `Add to post` group, then click `dialog.getByRole('button', { name: 'Edit', exact: true }).last()` (two Edit buttons appear — icon-only for preview thumbnail, labeled for drawing; `.last()` is the labeled one). Editor that opens is identical to the standalone whiteboard template editor, so `getWhiteboardEditorDialog` + `writeTextInWhiteboardDialog` reuse cleanly. **Memo framing**: select `radio "Memo"`, then fill `textbox "Write your memo…"` (note ellipsis char). **Do NOT fill `Write something...`** — that's the callout description and writing there would overwrite it. **CTA framing**: select `radio "Call to Action"`, then fill `#link-framing-url` (input[type=url] labeled "URL") and `#link-framing-display-name` (input[type=text] labeled "Display Name"). IDs are used rather than labels to avoid colliding with reference rows' URL field. |
| `forms/callout/collection/index.ts` | ✅ Validated | Posts/Memos/Whiteboards defaults dialogs and inline switches all confirmed against the live UI. |
| `forms/callout/collection/{none,links-files,posts,memos,whiteboards}.ts` | 🗑 Deleted | All collapsed into `collection/index.ts`. |
| `verify/callout-template-verify.ts` | ✅ Validated | `verifyCalloutTemplate` checks card + preview heading + callout title + framing content (whiteboard img / memo text / CTA link+href / poll question+options). Callout-level tags & references are not rendered in the preview (CRD gap, `CLIENT_BUGS.md §1`) and are asserted in the usage feed flow instead. |
| `usage/callout-template.use.ts` | ✅ Validated end-to-end | `verifyCalloutTemplateUsage`: Knowledge tab → `Add Post` → `dialog "Create Post"` → `Find Template` → `dialog "Use a template"` (listitem filter by `hasText` + `Use this template` button) → `Post` → feed verification anchored on the title heading inside `region "Space content feed"` walking up 2 ancestors. Framing branches (memo/CTA/whiteboard/poll) confirmed for the in-feed render. |
| `usage/contributions/*.ts` | ✅ Validated | Triggered by `verifyCalloutContributions`, called unconditionally (no-op for `responseOptions.type === 'none'`). links/posts/memos/whiteboards flows all validated against the live UI (whiteboards uses the generic `Add Response` affordance + `Create new whiteboard` dialog). |

Shared helpers used (don't break them — whiteboard/post/CG depend on them):
- `forms/template-form.ts` — `fillTemplateForm(scope, templateData)`. Accepts `Page` or `Locator` scope.
- `forms/whiteboards/whiteboard-dialog.ts` — `openWhiteboardEditor`, `getWhiteboardEditorDialog`, `writeTextInWhiteboardDialog`, `useTemplateInAWhiteboard`. Legacy aliases (`clickOnEditWhiteboardPreview`, `getWhiteboardDialog`) kept for compat.
- `verify/template-verify.ts` — `verifyTemplate` (card + open preview + `verifyOpenedTemplate`; **leaves preview open** for type-specific checks).
- `verify/verify-opened-template.ts` — `verifyOpenedTemplate`, `getTemplatePreviewDialog`, `closeTemplatePreview`.

## Recent decisions to remember

- **Tag lowercasing**: the new tag input lowercases on input. Test data uses lowercase tags. Not a UI bug (decision deferred).
- **CG card tags**: were missing from the card and added back as a UI fix.
- **CG description ambiguity**: fixed via placeholder lookup in `template-form.ts`.
- **Feed callout card has no class hooks** (no `.MuiPaper-root`, no `.MuiChip-root`). Anchor on the title heading inside `region "Space content feed"` and walk up two ancestors with `title.locator('xpath=ancestor::*[2]')` to get the card. Tag chips are plain text nodes — `card.getByText(tag, { exact: true })`.

## Resume workflow

When user says "test N is failing":

1. **Ask the user** for a working templates URL where they're logged in (e.g. `http://localhost:3000/<space-nameid>/settings/templates`). Their test scenarios get torn down between runs, so don't reuse an old URL — confirm it's currently accessible.
2. **Read** the failing test in `template-types/callout-tests.spec.ts` and the template data it builds (the framing/response/comments combo). The test body just calls `createAndVerifyCalloutTemplate(page, templateData)`.
3. **Drive the MCP browser** through that helper's steps, one by one:
   - Navigate, set the CRD flag, reload, verify the search textbox is visible.
   - Snapshot the page; locate the `Collaboration tools` section button and the matching `Add new` button (it's `.nth(1)`).
   - Open the menu and click `Create new`.
   - Snapshot the open create dialog. Compare each field/control against the selector the helper is using. **When something differs, edit the helper** in `forms/callout/...` and re-snapshot to confirm.
   - For framing types you haven't yet confirmed (Memo, Call to Action), click the radio and snapshot to discover the actual field names.
   - For response types beyond Posts, click `Set Default Response` and snapshot the defaults dialog.
4. **After each helper edit**, run from `client-web/`:
   ```bash
   pnpm exec tsc --noEmit -p tsconfig.json && pnpm exec eslint src/functional-e2e/templates-CRD --quiet
   ```
   Both must pass before handing back to the user.
5. **Don't run `playwright test` yourself.** The user runs it from their side and reports back. Your job is to validate selectors in the MCP browser and edit helpers.

### Notes that bit me before

- The MCP browser session and the user's test session are separate browsers. Snapshots you see are not what the test sees, but selectors transfer 1:1.
- Strict-mode violations look like: "resolved to N elements". Almost always means an accessible name collision (reference rows duplicating `Description`, `Save` button in both an outer and inner dialog). Disambiguate by scope (`getByRole('dialog', ...)`) or placeholder, not by `.first()`.
- After clicking buttons that open menus / dropdowns, always snapshot before clicking the next item — MCP rewrites refs on every snapshot, and stale refs fail.
- The `usage/*` files reference the in-space callout UI. If the user reports failures there, expect they'll need their own discovery session — don't try to fix blind.

When in doubt: snapshot first, edit selector, typecheck, ask the user to re-run.
