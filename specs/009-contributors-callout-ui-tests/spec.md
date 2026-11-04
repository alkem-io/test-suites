# Feature Specification: Contributors Callout — Test Suite Coverage & Alignment

**Feature Branch**: `feat/009-contributors-callout-ui-tests`
**Created**: 2026-07-01
**Status**: Draft
**Input**: Story [client-web#9928 "Contributors callout"](https://github.com/alkem-io/client-web/issues/9928) · Source spec [agents-hq#24](https://github.com/alkem-io/agents-hq/pull/24) · Server PR [server#6200](https://github.com/alkem-io/server/pull/6200) · Client PR [client-web#9955](https://github.com/alkem-io/client-web/pull/9955) (merged 2026-06-30) · Epic [alkem-io/alkemio#1541](https://github.com/alkem-io/alkemio/issues/1541)

## Context

The Alkemio web client gained an **admin-only Contributors callout**: a callout
framing that renders a space's contributors — **People** (users), **Organizations**,
and **Virtual Contributors** — as a self-updating card collection. It replaces the
hard-coded community contributor widget (`SpaceMembers`) with a callout an admin can
place anywhere, that stays current as membership changes.

This feature concerns the **QA test suite** (`@alkemio/test-suite-client-web`), not
the client application. It has two parts:

1. **New coverage** — the Contributors callout is new product behaviour with no
   existing automated coverage. This spec adds a functional-E2E suite
   (`client-web/src/functional-e2e/contributors-callout/`) that exercises the
   callout's creation, admin-only settings, rendered collection (segmented type
   switch, per-type counts, name search, list/map view, empty state) and
   type-persistence-on-edit against a live CRD build.

2. **Alignment** — the client PR removed the hard-coded `SpaceMembers` grid from the
   CRD community page (`CrdSpaceCommunityPage`) and added a space-level
   *user-information visibility* setting. The existing suites that render the
   community tab (`explore-platform`, `public-space`, `memberships`) must remain
   green against the new page. The community-page section heading
   ("The contributors to this Space!") is unchanged by the PR, so those assertions
   survive; this spec verifies that and records any that need re-aligning.

The guiding principle (per the 005–008 precedent): a 1:N mapping of business
scenario → automation test is preserved. No previously-green test may be silently
disabled, and new behaviour is covered by new tests rather than by weakening
existing ones.

Because the callout's contributor data is seeded via `TestScenarioFactory`
(admins/members/host organization; no virtual contributors by default), the new
suite asserts the **deterministic** behaviours — type presence, counts, the
segmented switch, per-type scoping, the VC empty state, name search, the list/map
toggle, single-vs-multi-type, admin-only gating, and edit persistence — and treats
data-rich map-plotting of geocoded contributors as an assumption-bounded edge case
(see Out of Scope / Assumptions).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contributors callout creation & admin-only settings (Priority: P1)

The QA engineer runs the Contributors callout suite against a CRD build. A space
admin is offered the "Contributors" framing option, configures the contributor
types (all three by default), the default type and the default view, and creates
the callout; saving with zero types is blocked; a space member is never offered the
framing (they cannot create callouts at all).

**Why this priority**: Creation and its admin-only settings are the foundational
flow that produces the entity every rendering scenario acts upon, and the
settings/validation rules (≥1 type required, default-type/default-view) are the
distinctive product logic this feature introduces. This is the minimum viable slice.

**Independent Test**: Run `0.1contributors-callout.spec.ts` tests `1.1`, `1.2`,
`2.1`. The admin is offered and can select the Contributors framing; zero-types
submission surfaces the validation error and creates nothing; a member sees no
create affordance.

**Acceptance Scenarios**:

1. **Given** the CRD create-callout form as a space admin, **When** the framing list
   is shown, **Then** a "Contributors" framing radio is present (admin-only,
   collaboration-only) and selecting it reveals the contributor-type multi-select,
   the default-type picker, and the default-display (List/Map) control.
2. **Given** the Contributors framing selected with **zero** types, **When** the
   admin submits, **Then** the "Select at least one contributor type." validation
   error is shown, submission is blocked, and no callout is persisted.
3. **Given** a space member, **When** they view the space collaboration surface,
   **Then** no create-callout affordance is available (the framing is never offered).

---

### User Story 2 - Rendered collection: types, counts, search, empty state (Priority: P1)

The QA engineer verifies the rendered contributor collection. With the default
settings (all three types) the collection shows a segmented type switch — one
segment per configured type, each carrying an always-visible per-type count — that
opens on the configured default type and scopes the view (search, cards) to the
active type. A type with no contributors shows an empty state (not an error), and
client-side name search filters the active type with its own no-match empty state.
A single configured type shows no segmented switch.

**Why this priority**: The rendered collection is the user-facing payoff of the
feature and encodes the bulk of the acceptance criteria (segmented switch, per-type
counts, per-type scoping, empty states, name search, single-vs-multi type). It
depends only on creation (P1).

**Independent Test**: Run tests `1.3`, `1.4`, `1.5`, `1.8`. Default settings render
People/Organizations/Virtual Contributors segments with counts, opening on People;
the Virtual Contributors segment (no VCs) shows the empty state; name search yields
a no-match empty state; a single-type callout shows no segmented switch.

**Acceptance Scenarios**:

1. **Given** a Contributors callout with default settings, **When** it renders,
   **Then** a segmented switch shows one segment per type, each with its count, and
   opens on the configured default type (People).
2. **Given** the segmented switch, **When** the admin selects the Virtual
   Contributors segment (which has no contributors), **Then** an empty state is
   shown (not an error).
3. **Given** the active type, **When** the admin types a non-matching name in the
   search box, **Then** the cards filter to the active type and a no-match empty
   state is shown.
4. **Given** a Contributors callout configured with a **single** type, **When** it
   renders, **Then** no segmented type switch is shown.

---

### User Story 3 - List/Map view, VC list-only, and edit persistence (Priority: P2)

The QA engineer verifies the map affordance and edit persistence. Users and
organizations expose a List/Map toggle; switching to Map renders the map region.
Virtual Contributors are list-only (no Map control on that segment). Editing an
existing callout to exclude a type (e.g. Virtual Contributors) persists after save —
that segment disappears from the rendered switch.

**Why this priority**: The map toggle and the VC list-only rule are important
view-shaping behaviours, and edit-persistence proves the settings round-trip through
the server. They build on the rendered collection (P1/US2).

**Independent Test**: Run tests `1.4`, `1.6`, `1.7`. On the People segment the Map
control is present and switches to a map region; on the Virtual Contributors segment
the Map control is absent; excluding Virtual Contributors via edit removes that
segment after save.

**Acceptance Scenarios**:

1. **Given** the People segment, **When** the admin toggles to Map, **Then** the map
   region is shown and the Map control is pressed; toggling back returns to the list.
2. **Given** the Virtual Contributors segment, **When** it is active, **Then** no Map
   control is offered (list-only).
3. **Given** an existing Contributors callout with all three types, **When** the
   admin edits it to exclude Virtual Contributors and saves, **Then** the rendered
   switch shows only People and Organizations after save (the change persisted).

---

### User Story 4 - Community-page alignment survives the widget removal (Priority: P2)

The QA engineer confirms the existing suites that render the CRD community tab stay
green after the hard-coded `SpaceMembers` grid was removed. The community-page
section heading the suites assert ("The contributors to this Space!") is unchanged
by the client PR, so those assertions continue to pass; any that genuinely broke are
re-aligned to a CRD-valid selector without dropping the scenario.

**Why this priority**: This is regression-protection for adjacent suites rather than
new coverage; it trails the executable new-coverage stories.

**Independent Test**: Run the community-tab scenarios in `explore-platform`,
`public-space`, and `memberships`. Each still passes; any re-aligned selector is
recorded in the selector contract.

**Acceptance Scenarios**:

1. **Given** the CRD community tab after the `SpaceMembers` removal, **When** an
   authenticated user opens it, **Then** the suites' community assertions still hold
   (the section heading survives; no member-grid selector is relied upon).
2. **Given** a selector that genuinely broke, **When** it is re-aligned, **Then** the
   scenario and behavioural assertion are unchanged and the change is recorded in the
   selector contract.

---

### Edge Cases

- **No virtual contributors in the seeded scenario**: the VC segment shows the empty
  state and is list-only — asserted directly (deterministic).
- **Zero contributor types on submit**: validation is **submit-time** — the error
  appears only when the admin clicks Post (not live on toggle); the suite clicks Post
  to surface it, then asserts nothing is persisted.
- **Two elements expose the "Map" accessible name**: the wrapping
  `<section aria-label="Map">` and the MapLibre canvas both match; the suite scopes to
  the first and relies on the toggle's `aria-pressed` as the primary signal.
- **Multiple Contributors callouts in one space** produce multiple
  `region "Contributors"` — expected on a migrated env, where a new space already
  carries an auto-provisioned default callout alongside the suite's own. The suite
  scopes every rendered assertion to the callout card matching the title under test
  (the innermost element containing both that title heading and a `region "Contributors"`),
  so locators stay unambiguous regardless of how many collections are on the page.
- **Map tiles are fetched from a public basemap** (OpenFreeMap positron); the suite
  asserts the map *region* renders, not tile content, so it does not depend on
  external tile availability.
- **Segmented type switch vs. the All/Lead/Member role filter**: both render as
  `tab`s; the type switch is disambiguated by requiring the trailing per-type count
  digit in the accessible name (e.g. `^People\s*\d`).
- **User-information visibility = members only**: server-enforced; hides member users
  from non-members while organizations and virtual contributors are unaffected. Rich
  cross-viewer assertion is data/permission-heavy and is bounded as an assumption.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A new functional-E2E suite MUST cover the Contributors callout end-to-end
  against a CRD build: creation with the "Contributors" framing, the admin-only
  type/default-type/default-view settings, and the rendered collection.
- **FR-002**: The suite MUST assert the admin-only, collaboration-only framing: a space
  admin is offered the "Contributors" framing radio; a space member has no
  create-callout affordance.
- **FR-003**: The suite MUST assert the ≥1-type rule — submitting with zero types shows
  the "Select at least one contributor type." error and persists nothing.
- **FR-004**: The suite MUST assert the rendered collection: a segmented type switch
  with one segment per configured type, each carrying an always-visible per-type count,
  opening on the configured default type, and scoping search/cards to the active type;
  and that a single configured type shows no switch.
- **FR-005**: The suite MUST assert empty states (not errors): a type with no
  contributors, and a name search with no matches.
- **FR-006**: The suite MUST assert the List/Map view toggle for a locatable type
  (users/organizations) and that Virtual Contributors are list-only (no Map control).
- **FR-007**: The suite MUST assert that editing an existing callout to exclude a type
  persists after save (the excluded segment disappears from the rendered switch).
- **FR-008**: Every selector MUST use a CRD-valid, language-stable strategy (ARIA role +
  accessible name, `aria-pressed`/`aria-selected`/`aria-checked`, placeholder-as-label)
  and MUST NOT rely on MUI-only markup or positional `.nth()` hacks; any unavoidable
  positional selector MUST be annotated. All selectors are recorded in the selector
  contract.
- **FR-009**: The existing suites that render the CRD community tab (`explore-platform`,
  `public-space`, `memberships`) MUST remain green after the `SpaceMembers` widget
  removal; any selector that genuinely broke MUST be re-aligned to a CRD-valid strategy
  without dropping its scenario, and recorded in the selector contract.
- **FR-010**: The suite MUST run via the existing client-web execution path (Playwright,
  Chrome branded channel, `--workers=1 --retries=2`, headless) with no new
  infrastructure, and be runnable both as a directory-scoped run
  (`playwright test src/functional-e2e/contributors-callout`) and per-file.
- **FR-011**: Every rendered-collection assertion MUST be scoped to the **specific
  callout under test** (its title's callout card), never a page-wide
  `region "Contributors"`, because a **migrated environment auto-provisions a default
  Contributors callout on new spaces** (see FR-012) — so more than one
  `region "Contributors"` may be present. The suite MUST pass identically whether or
  not that default callout exists.
- **FR-012**: The suite MUST tolerate the **environment split** in the rollout. The L0
  backfill migration (`BackfillContributorsCalloutL0Community`) also seeds the **L0
  space content template**, so on a migrated env (dev/CI) a newly created space
  **inherits** a default Contributors callout — this **intentionally reverses the
  original FR-023 "new spaces get nothing automatic" decision**. On an un-migrated env
  (e.g. a fresh local `develop` DB without the migration + `authorizationPolicyResetAll`
  post-step) new spaces have none. The suite MUST NOT assume either state: it creates
  its own callouts and scopes to them (FR-011), and the community-tab alignment
  assertions (FR-009) rely only on surfaces present in both (the sidebar "Space Leads").

### Key Entities *(include if feature involves data)*

- **Contributors callout suite**: `client-web/src/functional-e2e/contributors-callout/`
  — `0.1contributors-callout.spec.ts` (admin creation/settings/rendering + member
  negative) and `pages/ContributorsCalloutPage.ts` (the page object).
- **ContributorsCalloutPage page object**: centralizes the create-form selectors
  (framing radio, type toggles, default-type/default-view radios, validation error) and
  the rendered-collection selectors (region, type-switch tabs, search, view toggle,
  cards, empty states, map region) plus create/edit/delete helpers.
- **CRD Contributors surfaces under test**: the create/edit callout form's
  `ContributorCollectionConfigField` + "Contributors" framing radio; the rendered
  `ContributorCollection` (segmented `Tabs`, search `input`, `ViewButton` toggle,
  `ContributorCard`s, `EmptyState`) and the lazy `ContributorMap` — defined by
  client-web PR #9955.
- **Test data / scenario setup**: `TestScenarioFactory.createBaseScenario(...)`
  (GraphQL-seeded space with a host organization, `SPACE_ADMIN` lead + `SPACE_MEMBER`;
  no virtual contributors), the authenticated-session fixture, and the `SPACE_ADMIN` /
  `SPACE_MEMBER` test users — unchanged by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The new `contributors-callout` suite passes 100% against a CRD build under
  the required run profile (`--workers=1 --retries=2`, headless).
- **SC-002**: All seven story acceptance criteria that are deterministic under the seeded
  scenario (AC1, AC2, AC3, AC5, AC6, AC7 and the admin-only gating) have at least one
  passing automated test; the data-rich subset (geocoded map plotting, members-only
  cross-viewer visibility) is explicitly bounded rather than silently omitted.
- **SC-003**: Every getter/helper exported from `ContributorsCalloutPage` and used by an
  active test resolves to exactly one element on its CRD surface (no zero-match or
  ambiguous-match locators), verified empirically.
- **SC-004**: No MUI-only or positional selector is introduced; the selector contract
  lists every selector and any gap.
- **SC-005**: The `explore-platform`, `public-space`, and `memberships` community-tab
  scenarios remain green after the `SpaceMembers` removal; any re-aligned selector is
  recorded, and the count of scenarios lost is zero.

## Assumptions

- Client PR #9955 is merged and served by the target build; the GraphQL schema exposes
  `CalloutFraming.contributors` / `contributorCounts` and `CalloutSettings.framing.contributors`
  (verified live). If the redesign is behind a flag, it is enabled deterministically.
- `TestScenarioFactory` seeds a space with a host organization and admin/member users but
  **no virtual contributors** and **no geocoded coordinates**; therefore the VC segment is
  reliably empty (drives the empty-state assertion) and precise map-pin plotting is not
  asserted (only that the map region renders).
- The default test-environment language is English, so the English accessible names
  ("Contributors", "People", "Organizations", "Virtual Contributors", "List", "Map",
  "Select at least one contributor type.", "No contributors to show.",
  "No contributors match your search.") match.
- The CRD surfaces follow the design system's accessibility commitments (semantic
  roles, `aria-pressed`/`aria-selected`/`aria-checked`, accessible names on controls),
  providing the roles/names the suite targets.
- The community-page section heading "The contributors to this Space!" is rendered
  outside the removed `SpaceMembers` widget and is unchanged by PR #9955 (confirmed via
  diff), so the adjacent suites' community assertions survive without change.

## Out of Scope

- Any change to the Alkemio client application itself (the Contributors callout
  implementation lives in `client-web`, not this QA repo).
- Server-api coverage of the contributor-collection GraphQL settings and the
  server-enforced privacy rules (a separate server-api effort); the user provided that
  the API tests pass.
- Data-rich rendering that the default seeded scenario cannot make deterministic:
  precise map-pin plotting of geocoded contributors, the "no location data" list
  beneath the map, cross-viewer *members-only* user-information visibility, and the
  All/Lead/Member role-filter counts.
- Directly testing the rollout **migration** itself (`BackfillContributorsCalloutL0Community`
  provisioning existing L0 spaces + the L0 template, and the `authorizationPolicyResetAll`
  post-step). The suite does not run migrations; it is written to pass whether the
  environment has applied them (new spaces auto-provision a default callout — FR-012)
  or not, by scoping to its own callouts (FR-011).
- Accessibility automation (axe-core), performance, or visual-regression testing of the
  Contributors surfaces.
