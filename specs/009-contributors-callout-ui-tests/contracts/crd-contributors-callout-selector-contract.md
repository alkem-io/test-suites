# CRD Selector Contract — Contributors Callout

**Suite**: `client-web/src/functional-e2e/contributors-callout/`
**Page object**: `pages/ContributorsCalloutPage.ts`
**Verified against**: live CRD build (client-web PR #9955, merged 2026-06-30), 2026-07-01.

All selectors below were confirmed empirically by dumping the accessible tree of the
create dialog and the rendered collection, then by a green suite run under
`--workers=1 --retries=2` (headless). Strategy priority: ARIA role + accessible name,
then `aria-pressed`/`aria-selected`/`aria-checked`, then placeholder-as-label. No
MUI-only markup and no positional `.nth()`/`.last()` selectors are used except the two
annotated exceptions below: the callout-card scoping `.last()` and the map-region `.first()`.

## Create / edit callout form

| Element | Selector | Notes |
|---|---|---|
| Add callout trigger | `getByRole('button', { name: 'Add Post', exact: true })` | Tab-level create button (CRD). Absent for members. |
| "Contributors" framing | `getByRole('radio', { name: 'Contributors', exact: true })` | Framing options render as **radios** (not chips). Admin-only + collaboration-only; gated by `permissions.canUpdate`. |
| Contributor-type toggle | `getByRole('button', { name: <'People'\|'Organizations'\|'Virtual Contributors'>, exact: true })` | Multi-select **buttons** with `aria-pressed`. All three pre-selected by default. |
| Default-type option | `getByRole('radio', { name: <type>, exact: true })` | `radiogroup` "Default type"; shown only when >1 type selected. Same labels as the toggles but distinct role (radio vs button). |
| Default-view option | `getByRole('radio', { name: <'List'\|'Map'>, exact: true })` | Default-display radiogroup. |
| Title | `getByRole('textbox', { name: 'Title' })` | |
| Submit (create) | `getByRole('button', { name: 'Post', exact: true })` | |
| Submit (edit) | `getByRole('button', { name: 'Save', exact: true })` | |
| Types-required error | `getByText('Select at least one contributor type.')` | **Submit-time** validation — appears only after clicking Post, not live on toggle. Distinct from the always-present hint "Select at least one type to include." |
| Close/cancel | `getByRole('button', { name: 'Close' }).first()` | Dialog dismiss. |

## Rendered contributor collection

**Scoping:** every rendered assertion is scoped to the **callout card under test**, not a
page-wide region, because a migrated env auto-provisions a default Contributors callout on
new spaces (so >1 `region "Contributors"` may exist). The card is:
**Annotated `.last()`**: `page.locator('div').filter({ has: heading(title) }).filter({ has: region("Contributors") }).last()`
— the innermost element holding both the callout's title heading and a Contributors region.
All selectors below are resolved **within** that card (`ContributorsCalloutPage.collection(title)`).

| Element | Selector (within the callout card) | Notes |
|---|---|---|
| Collection region | `card.getByRole('region', { name: 'Contributors', exact: true })` | `<section aria-label="Contributors">`, scoped to the card so it is unambiguous even with a co-existing default callout. |
| Segmented type switch | `getByRole('tab', { name: /^<type>\s*\d/ })` | Radix `Tabs`; the per-type count is concatenated into the accessible name (e.g. "People 3"). The trailing `\d` requirement disambiguates from the type-toggle buttons and from the All/Lead/Member role-filter tabs. Shown only when >1 type. |
| Active type | `<typeSwitchTab>` + `toHaveAttribute('aria-selected', 'true')` | Opens on the configured default type. |
| Name search | `region.getByRole('textbox', { name: 'Search by name…' })` | `<input aria-label="Search by name…">` (label == placeholder). |
| View toggle | `region.getByRole('button', { name: <'List'\|'Map'>, exact: true })` | `ViewButton` with `aria-pressed`. Hidden on the Virtual Contributors segment (list-only). |
| Map region | `getByRole('region', { name: 'Map', exact: true }).first()` | **Annotated `.first()`**: both the wrapping `<section aria-label="Map">` and the MapLibre canvas expose the "Map" name. Primary signal for the map view is the toggle's `aria-pressed`. |
| Empty state | `region.getByText('No contributors to show.')` | Shown for a type with no contributors (not an error). |
| No-match state | `region.getByText('No contributors match your search.')` | Shown when the client-side name search filters everything out. |
| Contributor card | `region.getByRole('link', { name: <contributor name> })` | Card name renders as an `<a>` link to the profile. |

## Gap log

- **G-1 (info, not a blocker):** Zero-types validation is **submit-time only** — the
  error is not surfaced live when the last type is deselected, and the Post button is
  **not** disabled. The suite therefore clicks Post to trigger the error, then asserts
  nothing is persisted. If the product later moves to live validation / a disabled
  submit, tighten `1.2` accordingly.
- **G-2 (a11y):** The MapLibre canvas reuses the accessible name "Map", colliding with
  the wrapping map section (`getByRole('region', { name: 'Map' })` → 2 matches).
  Worked around with `.first()`; a distinct name on one of them would remove the need.
- **G-3 (a11y):** The name-search `<input>` derives its accessible name from a value
  equal to its placeholder ("Search by name…"). Stable enough to target, but an
  explicit `<label>` would be language-stabler.
- **G-4 (data):** The default `TestScenarioFactory` scenario seeds no virtual
  contributors and no geocoded coordinates, so precise map-pin plotting and the
  "no location data" list are not asserted (see spec Out of Scope). Adding a VC and a
  geocoded user to the scenario would let those two acceptance criteria be automated.
- **G-5 (scope):** The segmented type switch renders alongside an All/Lead/Member
  role-filter (both `tab`s). Only the type switch is under test here; the role-filter
  counts are out of scope for this pass.
- **G-6 (environment split):** The L0 backfill migration also seeds the L0 space content
  **template**, so on a **migrated env** (dev/CI) a newly created space auto-provisions a
  default Contributors callout — intentionally reversing FR-023. On an **un-migrated env**
  (fresh local `develop` DB, or the migration run without the mandatory
  `authorizationPolicyResetAll` post-step → callouts invisible) it does not. The suite is
  written to pass in both: it scopes to its own callout card by title (see Scoping above),
  and the community-tab alignment tests assert only surfaces present in both (the sidebar
  "Space Leads"). Verified locally (un-migrated: 9/9) and via a two-callout scoping probe;
  full migrated-env validation is left to a dev/CI run.
