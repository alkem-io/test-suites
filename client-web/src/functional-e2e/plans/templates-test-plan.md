# Templates & Innovation Packs - Playwright E2E Test Plan

## Executive Summary
- Covers end-to-end validation of the Template Library, Template Packs (Innovation Packs), callout interactions, and space/subspace (L0 & L1/L2) scaffolding flows in the Alkemio client.
- Focuses on CRUD completeness for every template type surfaced in the UI, bi-directional conversions between templates and spaces/subspaces, callouts and callout templates, and reliability of template sharing/imports between space libraries.
- All scenarios are intended for automation with Playwright (Chromium project) and tagged `@templates` for targeted CI execution.

### Key User Personas
- **Space Admin**: `${TestUser.SPACE_ADMIN}@alkem.io` - Admin of a space that has templates
- **Template User**: `${TestUser.SPACE_MEMBER}@alkem.io` - Space member that uses the templates
- **Innovation Pack Owner**: `${TestUser.INNOVATION_PACK_OWNER}@alkem.io` - User that owns an Innovation pack with templates in it


## Environment & Assumptions
- Base URL provided through `ALKEMIO_BASE_URL` (defaults to `http://localhost:3000` as per `.env`).
- Seed data: `client-web/src/functional-e2e/seed-minimal.spec.ts` (no tutorial callouts) plus dedicated JSON/YAML descriptors for Innovation Packs located under `client-web/src/functional-e2e/templates/fixtures`.
- Clean state requirement: Any template instances created during a scenario must be uniquely named (`TestTemplates-${Date.now()}`) and deleted within the same test. Innovation Packs created during the tests should also be deleted after the tests and should be uniquely named (`TestIP-${Date.now()}`).

## Key Concepts
Alkemio has two places where templates can be stored:
- Spaces library: Every Level 0 space has a template library and has templates that can be used in the space and in any child subspace.
- An Innovation Pack: Users with a specific license can have "Template Packs" (Innovation Packs) associated to their account, where they can store templates. Those Innovation Packs can be public or private, and then the templates can be used by themselves only or by any user in the platform.

> Innovation Packs themselves cannot be imported. Only individual templates that live inside a public Innovation Pack can be imported into another space library.

### Template Types
- Space: Level 0 space with 4 states in the Innovation Flow and callouts in those states.
- Subspace: Level 1 or 2 space with N states in the Innovation Flow and callouts in those states.
- Collaboration Tool (Callout) Templates:
   - Callouts with framing types: None, Whiteboard, Memo, Call to action
   - Callouts with response types: None, Links, Posts, Memos, Whiteboards
   - Callouts with comments enabled/disabled
- Whiteboard Templates: Templates that can be imported when editing a whiteboard
- Post Templates: Templates that can be imported when editing a post
- Community Guidelines Templates: Templates of the user guidelines of a space

## Tooling, Data & CI Hooks
- Playwright config: `client-web/playwright.planner.config.ts` running the `chromium` project in headed mode locally and headless in CI.
- Command hooks:
  - Local smoke: `cd client-web && npx playwright test --config=playwright.planner.config.ts --grep "@templates"`.
  - CI job: add a `templates-e2e` step to run the same command with `ALKEMIO_BASE_URL` pointing to the staging environment.
- Test data fixtures:
  - `innovation-pack-basic.json` – minimal pack containing one of each template type.
  - `innovation-pack-l1l2.json` – pack referencing predefined L1/L2 scaffolds.
  - `callout-content-sample.json` – payload for asserting template-driven callout population.
- Reporting: enable trace on-first-retry (already configured) and upload Playwright traces + HTML report artifacts for every CI attempt.

## Application Overview


## Acceptance Criteria Traceability
| Acceptance Criteria | Covered Scenarios |
| --- | --- |
| All template CRUD operations on a SPACE are covered | 1.1, 1.2, 1.3 |
|(LATER)|
| All template CRUD operations on an InnovationPAck are covered | 2.1, 2.2, 2.3 |
| Template usage in callouts is verified | 3.1, 3.2, 3.3, 3.4 |
| Template generation flows are validated | 4.1, 4.2 |
| L1/L2 generation from templates works correctly | 5.1 |
| Generation of templates from L1/L2 | 5.2 |
| Tests are integrated into CI/CD pipeline | 6.1 |
| Tests pass consistently on the test environment | 6.1 (monitoring & retry policy) |
| Space template imports are tested | 7.1 |

## Test Scenarios


### 1. Template CRUD Coverage - SPACES
Template system tests on Space level.

##### 1.1 Create Template Per Type
**Steps:**
1. Iterate through the template categories defined in "Template Types": (sorted from easier to more complicated)
  - Content templates (Whiteboard, Post) and Community Guidelines templates.
  - Collaboration Tool (Callout) templates for each framing type (None, Whiteboard, Memo, Call to action) and each response type (None, Links, Posts, Memos, Whiteboards) with both comment states.
  - Space (L0) and Subspace (L1/L2) templates.
2. For each category, click "Create Template" and choose the matching option.
3. Provide unique name/description for the template. Provide content for the template, and attach default assets if supported.
4. Configure template-specific fields (Space templates are not configurable yet, a link to an existing space should be provided to use as template).
5. Save the template and wait for toast/redirect to template detail view.
6. Record the template ID/slug for later cleanup, keeping a matrix to confirm every framing/response/comment combination received coverage.

**Expected Results:**
- Form validation enforces required fields before save.
- Newly created template detail view shows status `Draft` (or `Published` if auto-published) and displays configured metadata.
- Template entry is visible from the library list when filtering by its type and owner.

#### 1.2 Update Template Metadata & Structure
**Steps:**
1. Open one template created in 1.1.
2. Edit the overview (name, description, thumbnail) and save.
3. Modify structural elements (e.g., add a new question block, reorder sections) and save again.
4. Publish the template if workflow demands a publish step.

**Expected Results:**
- Optimistic UI updates after save with eventual consistency (no stale data after reload).






NOTE FOR THE AGENT: WE'LL IMPLEMENT ALL OF THIS LATER. FOR NOW I ONLY WANT TO HAVE A WORKING TEST-SUITE FOR SPACE TEMPLATES.




#### 2.3 Permission Boundary (Non-Admin)
**Steps:**
1. Sign in as a Facilitator role (no template administration rights).
2. Navigate to `/innovation-library`.
3. Verify that create/import/delete actions are hidden or disabled.
4. Attempt direct navigation to `/innovation-library/create`.

**Expected Results:**
- Non-admin sees read-only view with "Use" actions only.
- Direct navigation redirects to an authorization error or back to library with warning banner.

### 3. Template Usage Inside Callouts (All Types)

#### 3.1 Create Callouts Covering Every Framing Type
**Steps:**
1. Enter an L2 subspace dashboard and click "Create Callout".
2. Select "Start from Template".
3. Iterate through framing types `{None, Whiteboard, Memo, Call to action}` by picking the corresponding callout template for each run.
4. For each framing type, review the preview dialog (owner, last updated, framing summary) and publish the callout.
5. Capture the resulting URL plus rendered framing UI (hero, embeds, or canvas) for validation.

**Expected Results:**
- Each framing type renders the appropriate layout (e.g., Memo shows rich text editor, Whiteboard launches canvas, Call to action shows CTA banner).
- Template preview clearly lists framing metadata before confirmation.
- Published callout references both template ID and framing type in metadata/API payload.

#### 3.2 Validate Response Modes & Comment Toggles
**Steps:**
1. For each response type `{None, Links, Posts, Memos, Whiteboards}`, duplicate an existing published callout from 3.1.
2. Edit the callout, switch to a template that drives the target response type, and republish.
3. Confirm comment toggle states by enabling/disabling comments per template specification.
4. Submit a sample response of the required type (link submission, memo post, etc.) to verify the template-configured form.

**Expected Results:**
- Response widgets (link input, memo composer, whiteboard picker, etc.) match the selected template configuration.
- Comment controls mirror the template definition (disabled UI with tooltip or enabled thread with composer).
- Data posted through the response form persists and remains associated with the correct callout/template pairing.

#### 3.3 Apply Template to Existing Callout (All Types)
**Steps:**
1. Open each callout created earlier in edit mode.
2. Choose "Switch Template" and cycle through framing/response combinations not yet covered (e.g., Whiteboard frame + Posts response).
3. Confirm warning modal about overwriting fields and proceed.
4. Validate that content updates to the new template while preserving callout-specific data (schedule, access rules) and logs the template change.

**Expected Results:**
- Switch is blocked if callout is in `Closed` state and surfaces descriptive messaging.
- A diff summary enumerates changes to framing, response type, and comments before confirmation.
- After switching, callout renders new sections without orphaned legacy fields, and audit trail records the template swap.

#### 3.4 Apply Content Templates (Whiteboard, Post, Community Guidelines)
**Steps:**
1. Open a whiteboard inside an active callout and import each Whiteboard Template from the library, ensuring layers/guides load correctly.
2. Within a callout update or announcement, choose "Import Post Template" and verify placeholders populate.
3. Navigate to the space settings page and apply each Community Guidelines Template, confirming preview and publish flows.
4. For every import, revert to a clean state or save and verify the template metadata reference.

**Expected Results:**
- Whiteboard imports reproduce shapes, sticky notes, and permissions exactly as defined.
- Post templates inject structured content (headings, call-to-action blocks) without losing existing custom text outside the template scope.
- Community guidelines templates update the public guidelines page and expose version metadata plus source template linkage.

### 4. Template ↔ Callout Generation Workflows

#### 4.1 Generate Deliverables From Callout Template
**Steps:**
1. Within a callout created from a template, trigger "Generate assets" (e.g., auto-create mission brief, timeline, tasks).
2. Confirm each generated artifact appears under the callout's attachments/tasks list.
3. Re-run generation to ensure idempotency or see duplication warning.

**Expected Results:**
- Generation respects template configuration (correct number/type of artifacts).
- Duplicate run either no-ops with message "Already generated" or creates deterministically named assets without conflicts.

#### 4.2 Capture Template From Configured Callout
**Steps:**
1. Edit a callout that has been heavily customized.
2. Click "Save as Template".
3. Provide metadata (name, tags, visibility) and save.
4. Locate the new template in the library and verify it mirrors the callout configuration.

**Expected Results:**
- "Save as Template" enforces unique naming and inherits structure/content.
- Resulting template is tagged with the source callout ID for auditing.
- Template status defaults to `Draft` with ability to publish immediately.

### 5. Templates With L1/L2 Spaces

#### 5.1 Generate L1 and L2 From Templates
**Steps:**
1. From the Template Library, choose a Space (L1) template and click "Create Space".
2. Complete creation wizard (name, slug, access model) and finish.
3. Inside the new space, select a Subspace (L2) template and instantiate at least one subspace.
4. Validate that nested callouts/resources defined by the template are created automatically.

**Expected Results:**
- Creation wizard honors defaults (branding, member roles, navigation structure).
- Resulting space inherits template assets (pages, callouts, documents) with correct ownership.
- Subspace inherits parent references and appears in the L1 overview list.

#### 5.2 Generate Templates From Existing L1/L2
**Steps:**
1. Open any configurable space (L1) and choose "Export as Template".
2. Select scope (entire L1 vs selected subspace) and metadata.
3. Repeat for a subspace to capture an L2 template.
4. Verify both exports appear in the template list and can be instantiated elsewhere.

**Expected Results:**
- Export flow captures structure, navigation, and nested callouts.
- Template metadata references originating space/subspace IDs.
- New templates pass validation when used to instantiate a fresh L1/L2 (sanity run optional but recommended).

### 6. CI/CD Integration & Stability Safeguards

#### 6.1 Pipeline Execution & Monitoring
**Steps:**
1. Add a GitHub Actions (or equivalent) job named `client-web-templates-e2e` that runs the Playwright command from "Tooling" with `UI_HEADLESS=false` for reproducible traces.
2. Configure job to pull latest Innovation Pack fixtures and cache Playwright browsers.
3. Set retry policy: rerun failing tests once before failing the pipeline.
4. Publish HTML/trace artifacts and Slack (or Teams) notifications on failure.
5. Schedule nightly run against staging plus on-demand run for pull requests touching `templates/` or `callouts/` code.

**Expected Results:**
- Pipeline step gates merges when template tests fail.
- Artifacts contain traces/screenshots for each failure.
- Historical trend in CI dashboard shows consistent pass rate; flakiness is triaged within SLA.
- Environment variables (API keys, admin credentials) are pulled from secure secrets store without leaking to logs.

### 7. Template Imports Between Space Libraries

#### 7.1 Import Template From Source Space Library
**Steps:**
1. Sign in as a Space Admin who has access to both a source Level 0 space (with existing templates) and a target Level 0 space.
2. In the source space, open its template library and mark a template as shareable/importable (e.g., via "Share" or "Allow import" toggle) if required.
3. Switch to the target space, open its template library, and click "Import template".
4. In the import modal, select the source space, choose the desired template (Space, Subspace, Callout, Whiteboard, Post, or Community Guidelines), and confirm.
5. Wait for the duplication process/toast to finish, then open the imported template detail page.

**Expected Results:**
- Import dialog lists only spaces/templates the admin is authorized to copy; Innovation Packs are absent from the selector.
- Imported template appears in the target library with a new ID/slug while referencing the origin space in metadata (e.g., "Imported from Space Alpha").
- Template content, attachments, and onboarding flows are cloned accurately; audit history reflects both the source and new owner.
- Subsequent edits to the imported copy do not mutate the source template, ensuring isolation between spaces.

### 1. Template Library Discovery & Innovation Pack Imports

#### 1.1 Access Template Library as Global Admin
**Steps:**
1. Navigate to `/home` and open the top navigation "Tools" menu.
2. Select "Template Library" and wait for `/innovation-library` to load.
3. Verify that template filters (type, owner, tags) render and show counts.
4. Expand a template pack card to view included template types and metadata.

**Expected Results:**
- Navigation lands on the library without auth redirects.
- Filters are interactive and default to "All" template types.
- Each template pack lists template counts by type and exposes primary actions (View, Duplicate, Use).

#### 1.2 Inspect Innovation Pack Templates
**Steps:**
1. From `/innovation-library`, locate an Innovation Pack owned by the current user (or public) and open its detail page.
2. Review metadata (owner, visibility, template counts) and expand the template list.
3. Trigger allowable actions such as "Use template" or "Duplicate to space" to confirm routing flows.
4. Verify that no import/upload controls exist for packs, reinforcing that packs are curated collections only.

**Expected Results:**
- Pack detail surfaces template counts grouped by type plus contextual metadata (description, tags, visibility).
- "Use" actions deep-link into the appropriate space/subspace/callout creation wizard.
- Attempting to find pack-level import buttons returns none; UI messaging clarifies that sharing happens via duplication or template-level actions.
- Audit or activity feeds capture usage of the pack without creating duplicate pack records.
