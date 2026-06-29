# Feature Specification: CRD Callouts — Test Suite Alignment

**Feature Branch**: `006-crd-callout-ui-tests`
**Created**: 2026-06-22
**Status**: Draft
**Input**: User description: "UI changes to the callout/collaboration flows (CRD space page, comments refinement, callout collapse) while preserving existing functionality, aligned with client-web specs/042-crd-space-page/, specs/089-crd-comments-refinement/, and specs/020-callout-collapse/"

## Context

The Alkemio web client is migrating its space/collaboration surfaces — callout cards, the callout detail dialog, the create/edit callout form, contributions (posts, memos, whiteboards, links, media, polls), and the callout comment thread — from the legacy MUI design to the new CRD design system. Per the client-web feature specs (`specs/042-crd-space-page/`, `specs/089-crd-comments-refinement/`, `specs/020-callout-collapse/`), this migration is **UI-only**: URL paths, GraphQL operations, permission model, validation rules, callout/contribution types, draft/publish semantics, and notification behavior all remain unchanged. The CRD surfaces become the single callout interface for every user once the redesign is enabled.

This feature concerns the **QA test suite** (`@alkemio/test-suite-client-web`), not the client application. The existing functional-E2E callouts suite (`client-web/src/functional-e2e/callouts/`) and its `CollaborationPage` page object were written against the MUI surfaces. Because the UI is changing while behavior is preserved, the **test scenarios and coverage must remain unchanged**, but the **element selectors, page-object navigation/interaction steps, and any UI-shape assertions must be re-aligned** to the CRD layout so the suite keeps passing against the new surfaces.

The guiding principle (per the 005 precedent and repo convention): a 1:N mapping of business scenario → automation test must be preserved. No business scenario currently covered may lose coverage as a result of this UI change, and no previously-green test may be silently disabled. Where the CRD redesign genuinely changed the **shape of a flow** (e.g. the comment input moved to the top of the thread, deletion now routes through a confirmation dialog, framing/response types lock after creation), the test may adapt its **interaction steps** — but never its scenario, coverage, or behavioral assertions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Callout creation and viewing coverage survives the CRD migration (Priority: P1)

The QA engineer runs the callout creation and viewing suites against a client build serving the new CRD space page. Every creation scenario that passed against MUI — creating post / whiteboard / CTA / memo callouts, creating callouts with posts / links-and-files / memos / whiteboards collections, creating in a subspace, the member-cannot-create check — passes again against CRD, and the draft-vs-published visibility scenarios (admin sees draft, member does not) pass via CRD-valid selectors.

**Why this priority**: Callout creation is the foundational flow that produces the entities every other suite (editing, deletion, contributions, comments) acts upon, and the `CollaborationPage` create/navigate/lookup selectors are the most-reused across the directory. If the create form's framing/response chips or the callout-card lookup break, the whole directory cascades. This is the minimum viable slice of the migration alignment.

**Independent Test**: Point the suite at a CRD-enabled client build and run `0.5callout-creation.spec.ts`, `0.8callout-subspace-creation.spec.ts`, and `0.9callout-viewing.spec.ts`. All creation and visibility scenarios listed pass; created callouts are located on the CRD feed via role/accessible-name selectors.

**Acceptance Scenarios**:

1. **Given** the CRD create-callout form is open, **When** the suite selects a framing type (whiteboard, memo, CTA) and a response/collection type (posts, links & files, memos, whiteboards), **Then** each is selected via a CRD-valid selector (chip role + accessible name / `aria-pressed`), not via MUI-only markup or positional `.last()`/`.first()` hacks.
2. **Given** a callout name and description, **When** the suite fills the title and description fields and submits (publish or save-draft), **Then** the fields are located by CRD-valid labels/roles and submission triggers the same backend create flow as before.
3. **Given** a created callout, **When** the suite locates it on the CRD feed, **Then** it is found via its heading/accessible name without relying on `[data-testid="callout-card"]`.
4. **Given** a subspace, **When** a subspace admin creates a callout there and is verified unable to create in the parent space, **Then** both the positive and negative assertions hold against CRD selectors.
5. **Given** a draft callout, **When** an admin views it and a member is checked, **Then** the admin sees it and the member does not — the same visibility outcomes as the MUI suite, asserted via CRD-valid selectors.

---

### User Story 2 - Contribution and comment coverage survives (Priority: P2)

The QA engineer runs the contributions, comments, and full-workflow suites against the CRD callout detail dialog. Adding post and link contributions, editing one's own contribution, adding comments as admin and member, viewing the comment thread, and the multi-user end-to-end workflow (admin creates & publishes → member contributes & comments → admin moderates) all pass against the new layout — including the flows the redesign reshaped.

**Why this priority**: Contributions and comments are core collaboration journeys with the most CRD-reshaped flows: the comment input moved to the **top** of the thread (089, FR-001), sort is hardcoded newest-first (089, FR-002), reply is offered only on top-level comments (089, FR-005), and contribution add now opens dedicated CRD dialogs. They depend on creation alignment (P1) for their preconditions, so they follow it.

**Independent Test**: Run `0.3callout-comments.spec.ts`, `0.4callout-contributions.spec.ts`, and `0.1callout-full-workflow.spec.ts` against a CRD build. The contribution add/edit, comment add/view, and end-to-end moderation scenarios pass; the comment input is located at its new top-of-thread position.

**Acceptance Scenarios**:

1. **Given** the CRD callout detail dialog, **When** the suite adds a post contribution (title + markdown body) and a link contribution (url + title), **Then** the add affordance and form fields are located via CRD-valid selectors and the contributions appear, asserted without `.first()` positional disambiguation where a stable name exists.
2. **Given** an existing own contribution, **When** the suite edits it, **Then** the edit affordance is located via a CRD-valid selector (not `[data-testid="EditOutlinedIcon"]`) and the update persists.
3. **Given** the CRD comment thread, **When** the suite adds a comment, **Then** the comment input is located at the top of the thread (above existing comments) and the posted comment is asserted present.
4. **Given** multiple comments, **When** the suite views the thread, **Then** the count/threading assertion holds against the CRD newest-first, top-level-reply-only model.
5. **Given** the multi-user workflow, **When** an admin creates & publishes a callout, a member contributes & comments, and the admin moderates, **Then** every step completes against CRD selectors with the same behavioral outcomes as the MUI suite.

---

### User Story 3 - Editing, deletion, publish, and access-control coverage survives (Priority: P2)

The QA engineer runs the editing, deletion, and access-control suites against the CRD callout context menu and dialogs. Editing callout details/settings, publishing a draft, deleting a callout (now via a confirmation dialog), and the admin-can / member-cannot permission checks for edit, delete, and share all pass against the new layout.

**Why this priority**: These are important management journeys whose flow shape changed materially: destructive actions now route through a `ConfirmationDialog` (delete is two-step), publish/unpublish/share/edit/delete live in a CRD context (3-dots) menu, and framing/response types are locked (`aria-disabled`) in edit mode. They depend on created callouts (P1).

**Independent Test**: Run `0.7callout-editing.spec.ts`, `0.6callout-deletion.spec.ts`, and `0.2callout-access-control.spec.ts` against a CRD build. Edit, publish, two-step delete, and the admin/member permission assertions pass.

**Acceptance Scenarios**:

1. **Given** a callout, **When** an admin opens the context (3-dots) menu and edits details/settings, **Then** the menu trigger and the Edit item are located via CRD-valid selectors and the changes persist.
2. **Given** a draft callout, **When** an admin publishes it from the context menu, **Then** the publish path (and any notify-members affordance) is exercised via CRD-valid selectors and visibility changes as before.
3. **Given** a callout, **When** an admin deletes it, **Then** the suite completes the CRD two-step delete (menu → Delete → confirmation dialog → confirm) and the callout disappears.
4. **Given** a space member, **When** the suite checks edit/delete/share availability, **Then** the absence of admin-only affordances is asserted against CRD selectors (the negative assertions still hold).
5. **Given** edit mode, **When** the suite interacts with framing/response controls, **Then** any step that previously toggled a now-locked control is adapted to the CRD locked-after-creation model without dropping the underlying scenario.

---

### User Story 4 - Page object and suite docs reflect the CRD reality (Priority: P3)

The QA engineer updates the shared `CollaborationPage` page object (`callouts/pages/CollaborationPage.ts`) so its getters, navigation helpers, and interaction methods match the CRD surfaces, and records the selector-strategy changes. Anyone reading the page object sees the current truth, not stale MUI references (`callout-card`, `draft-indicator`, `EditOutlinedIcon`, `.draft-badge`, broad `/confirm|yes|delete|publish/i` regexes, positional `.nth()`/`.last()`).

**Why this priority**: Page-object hygiene prevents future drift and duplicate fixes, but delivers no runnable coverage on its own, so it trails the executable stories. In practice most edits land here because `CollaborationPage` is the single locus of selectors for the directory.

**Independent Test**: Review the updated `CollaborationPage`; every getter used by an active suite resolves to exactly one element on the corresponding CRD surface, and the selector contract's gap log reflects the verification pass.

**Acceptance Scenarios**:

1. **Given** the `CollaborationPage` page object, **When** a CRD callout surface is loaded, **Then** every getter/helper used by the active suites resolves to exactly one element (no zero-match or ambiguous-match locators).
2. **Given** the migration is complete, **When** the page object is reviewed, **Then** MUI-only selectors are gone, positional selectors are replaced where a stable role/name exists (or annotated where genuinely unavoidable), and the selector contract records any remaining gap.

---

### Edge Cases

- **A MUI selector has no direct CRD equivalent** (e.g. `[data-testid="EditOutlinedIcon"]`, `[data-testid="callout-card"]`, `[data-testid="draft-indicator"]`, `.draft-badge`): the selector must be re-expressed using a CRD-valid strategy (accessible name, role, `data-slot`, or stable test id) without dropping the assertion. If no stable hook exists on the CRD surface, the gap is recorded as a finding (FR-008) rather than masked by a brittle/position-based selector.
- **A flow's shape changed, not just its markup**: the comment input moved to the **top** of the thread (089 FR-001); deletion is now a **two-step** confirmation dialog; framing/response chips are **locked** (`aria-disabled`) in edit mode (042 FR-111/FR-112); memo/whiteboard framing now render a **preview + "Open …" button** rather than an inline editor; markdown is **rendered**, not raw. Interaction steps adapt; scenarios and assertions do not.
- **Positional selectors** (`.first()`, `.last()`, `.nth()` — 19+ uses today): replace with semantic role/name where the CRD surface provides one; keep only where genuinely unavoidable and annotate why.
- **Broad regex selectors** (`/create|post/i`, `/confirm|yes|delete|publish/i`): narrow/scope to the dialog or surface context so they resolve to exactly one element under CRD.
- **Comment body assertions via `locator('p', { hasText })`**: re-check against the CRD rendered-markdown / `InlineMarkdown` output and re-express if the element shape changed.
- **CRD enablement**: if the target build gates the redesign behind a flag (e.g. `localStorage['alkemio-crd-enabled'] = 'true'`, as the templates-CRD suite sets), the suite/fixtures must enable it deterministically before asserting CRD selectors.
- **Multi-language rendering**: prefer language-stable strategies (roles, test ids) over hardcoded English text where the suite already does; any English-text assertion the suite relies on must continue to match the default test-environment language.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The callout functional-E2E suites that are currently active and passing MUST continue to pass when run against a client build serving the CRD callout/collaboration surfaces, with no reduction in the set of automated scenarios. (Runtime/pass-state guarantee; FR-004 is its scenario-mapping counterpart.)
- **FR-002**: Every element selector used by the active callout suites MUST resolve correctly against the CRD layout, replacing any selector that depends on MUI-only markup (`[data-testid="callout-card"]`, `[data-testid="draft-indicator"]`, `[data-testid="EditOutlinedIcon"]`, `.draft-badge`) with a strategy valid on the CRD surface (ARIA role + accessible name, persistent label, `data-slot`, or stable test id).
- **FR-003**: `CollaborationPage` navigation and interaction helpers MUST reflect the CRD flow and step model for create, edit, view/expand, contribute, comment, publish/unpublish, share, and delete — including cases where the flow shape changed (top-of-thread comment input, two-step confirmation delete, context-menu actions, locked framing/response in edit, preview+open framing).
- **FR-004**: The suite MUST preserve the existing 1:N business-scenario → automation-test mapping — no covered scenario may lose its automated test, and no previously-green test may be disabled or skipped to accommodate the UI change. (Scenario-mapping-integrity counterpart to FR-001.)
- **FR-005**: Behavioral assertions (admin-vs-member permissions for create/edit/delete/share, draft-vs-published visibility, contribution and comment presence/counts, publish/unpublish outcomes, subspace scope boundaries) MUST remain identical to the pre-migration assertions, because the underlying behavior is unchanged.
- **FR-006**: Selectors MUST prefer language-stable and accessibility-aligned strategies (role + accessible name, persistent labels, stable test ids) and MUST replace position-based selectors (`.first()`, `.last()`, `.nth()`) wherever the CRD surface exposes a stable role/name; any unavoidable positional selector MUST be annotated with the reason.
- **FR-007**: The `CollaborationPage` page object (and any callout suite documentation) MUST be updated to reflect the CRD callout UI, retain the complete scenario list, and note any scenario whose selector or interaction strategy changed as part of the migration.
- **FR-008**: Any selector gap discovered during alignment — a CRD surface lacking a stable, accessible hook needed to assert an existing scenario — MUST be recorded as an explicit finding in the selector contract's gap log rather than masked by a brittle or position-based selector.
- **FR-009**: Where the CRD redesign changed the shape of a flow, the test MAY adapt its interaction steps to the new shape (e.g. perform the two-step delete confirmation, locate the comment input at the top of the thread, treat framing/response as locked in edit), but MUST NOT alter the scenario, its coverage, or its behavioral assertions.
- **FR-010**: No new callout scenarios, backend interactions, or end-to-end round-trips beyond those already in the suite are introduced by this feature; scope is limited to keeping existing coverage green against the new UI and documenting the alignment.
- **FR-011**: The suite MUST run via the existing client-web execution path (Playwright, Chrome branded channel) without new infrastructure, and the aligned suites MUST be runnable both individually (single `.spec.ts` file) and as a directory-scoped run (`playwright test src/functional-e2e/callouts`).

### Key Entities *(include if feature involves data)*

- **Callout test suite**: The active `0.1`–`0.9` `*.spec.ts` files under `client-web/src/functional-e2e/callouts/` (full-workflow, access-control, comments, contributions, creation, deletion, editing, subspace-creation, viewing) that assert callout behavior.
- **CollaborationPage page object**: `callouts/pages/CollaborationPage.ts` (+ `pages/index.ts`) — the centralized selector and interaction helper consumed by the suites; the locus of most selector changes.
- **CRD callout surfaces**: The new design-system surfaces under test — callout feed card (`PostCard`), callout detail dialog (`CalloutDetailDialog`), create/edit form (`AddPostModal` + framing/response zones), context menu (`CalloutContextMenu`), comment input/thread (`CommentInput`/`CommentThread`), and the delete/visibility confirmation dialogs — defined by client-web `specs/042-crd-space-page/`, `specs/089-crd-comments-refinement/`, `specs/020-callout-collapse/`.
- **Test data / scenario setup**: `TestScenarioFactory.createBaseScenario(...)` (GraphQL-seeded spaces, subspaces, callouts, members), test users (`SPACE_ADMIN`, `SPACE_MEMBER`, `SUBSPACE_ADMIN`, …), the authenticated-session fixture, and `updateCalloutVisibility` — unchanged by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the active callout scenarios pass when the suites run against a CRD-enabled client build.
- **SC-002**: Zero active callout scenarios are removed, skipped, or disabled compared with the pre-migration suite (the count of active, non-deprecated tests does not decrease).
- **SC-003**: Every getter/helper exported from `CollaborationPage` and used by an active suite resolves to exactly one element on its corresponding CRD surface (no zero-match or ambiguous-match locators).
- **SC-004**: All MUI-only selectors (`[data-testid="callout-card"]`, `[data-testid="draft-indicator"]`, `[data-testid="EditOutlinedIcon"]`, `.draft-badge`) are removed from the callout suite.
- **SC-005**: Behavioral assertions (permissions, draft/published visibility, contribution/comment presence, publish/unpublish, subspace scope) produce the same pass/fail outcomes for the same inputs as they did against the MUI surfaces.
- **SC-006**: The count of position-based selectors (`.first()`/`.last()`/`.nth()`) in the callout suite is reduced; any remaining instance is annotated with a justification.
- **SC-007**: Any CRD surface lacking a stable accessible hook required by an existing scenario is captured as an explicit, reviewable finding in the selector contract gap log; the count of such findings is reported rather than hidden.

## Assumptions

- The client-web CRD callout migration (`specs/042-crd-space-page/`, `specs/089-crd-comments-refinement/`, `specs/020-callout-collapse/`) preserves all URLs, GraphQL operations, permissions, validation, draft/publish semantics, and notification behavior; only the rendered UI changes. The test suite therefore changes selectors/interaction steps, not scenarios or expected behavior.
- A client build serving the CRD callout surfaces is available to run the suite against during alignment and verification. If the redesign is behind a flag, it can be enabled deterministically from the test (e.g. `localStorage['alkemio-crd-enabled']`).
- The default language of the test environment remains English, so existing English-text assertions continue to match unless a string was intentionally changed by the CRD migration.
- The CRD surfaces follow the design system's accessibility commitments (semantic `<a>`/`<button>`, `aria-label` on icon-only controls, persistent labels, `data-slot` on primitives), providing accessible names/roles the suite can target; stable test ids are requested only where accessible names are insufficient.
- The repository's specification-driven workflow applies; this spec feeds `/speckit.plan` next, and concrete file-level test/selector changes are produced in planning/tasks and confirmed empirically against the running CRD build.

## Out of Scope

- Any change to the Alkemio client application itself (the CRD UI implementation lives in the client-web product repo, not this QA repo).
- Adding new callout scenarios, new contribution/comment types, or coverage beyond what the current suite automates.
- The parallel MUI `templates/` suite and the already-migrated `templates-CRD/` suite (separate efforts); changes to other client-web functional-E2E areas (memberships, public-space, user-profile, etc.).
- Changes to server-api test suites or the shared `@alkemio/tests-lib` package (including `TestScenarioFactory` and callout mutation/visibility helpers).
- Accessibility automation (axe-core), performance, or visual-regression/screenshot testing of the CRD callout surfaces.
