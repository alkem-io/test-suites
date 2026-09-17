// spec: workspace#024-classifications — specs/024-classifications/spec.md, User Story 1 (P1)
// "Classify a Space: add a classification, then select its values".
//
// Walks (repos.yaml naming):
//   US1-AS1 — the `+` picker in Settings → About lists platform-wide AND
//             top-level-Space templates, visually distinguished (separate
//             sections), each with its description; no create-template and
//             no create-classification option (FR-007/-007a/-007b/-015/-016).
//   US1-AS2 — picking a template persists the classification immediately with
//             zero selected values; surviving a reload (FR-006a, FR-012a).
//   US1-AS3 — a single-select classification: selecting a second value
//             replaces the first, never two selected (FR-012).
//   US1-AS4 — a multi-select classification: several selected values persist
//             on reload, no separate form save (FR-006a).
//   US1-AS5 — a Classification is a pure, independent copy: renaming, editing
//             and deleting the source template never changes it (FR-009,
//             FR-010, SC-003).
//   US1-AS6 — the display-label duplicate guard: re-picking the same template
//             (default label, and a normalized-equal variant) is rejected and
//             prompts for a different label; a genuinely different label
//             succeeds as a second, independent copy (FR-011a/-011b/-011c).
//   US1-AS7 — from inside a sub-subspace, the picker's Space-scoped half
//             offers the TOP-LEVEL Space's library (not the immediate
//             parent's), and the added classification attaches to the acting
//             (sub-sub)space itself (FR-007a, FR-008).
//   US1-AS8 — revising which values apply to an already-added classification
//             changes only the selection: same entry id, same render
//             position, Step A never repeated (FR-012, FR-018b, SC-002).
//
// Authoring surface: Settings → About (`ClassificationPickerDialog`,
// `ClassificationValueSelector`, `client-web/src/crd/components/classification/`)
// wired from `CrdSpaceSettingsPage.tsx`.
//
// Fixture: the seeded platform Classification Template "SDGs" (multi-select,
// FR-005a) for the platform-wide half of the picker (US1-AS1, US1-AS6), plus
// two Space-scoped Classification Templates created in the top-level Space's
// own Template Library for the rest of the walk — a template-free (ad-hoc)
// path is deliberately NOT used here, since US1 walks the template-sourced
// add flow the `+` picker actually offers (FR-015).

import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { TestUser, TestUserManager } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { testConfiguration } from '@alkemio/tests-lib/config/test.configuration';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { expect } from '@playwright/test';
import { GraphQLClient } from 'graphql-request';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'us1-classify-a-space.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const graphqlClient = new GraphQLClient(testConfiguration.endPoints.graphql.private);

// ---------------------------------------------------------------------------
// Minimal, spec-local GraphQL helpers for the 024-classifications surface —
// mirrors `classifications/us3-see-classifications.spec.ts` and
// `classifications/rem-remove-a-classification.spec.ts`.
// ---------------------------------------------------------------------------

type ClassificationEntry = {
  id: string;
  displayLabel: string;
  display: boolean;
  sortOrder: number;
  selectedValues: { id: string; label: string }[];
};

type ClassificationTemplate = {
  id: string;
  type: string;
  profile: { displayName: string; description?: string | null };
};

const getClassificationTemplates = async (): Promise<ClassificationTemplate[]> => {
  const query = `
    query GetClassificationTemplates {
      platform {
        library {
          innovationPacks {
            templatesSet {
              templates {
                id
                type
                profile { displayName description }
              }
            }
          }
        }
      }
    }
  `;
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<{
      platform: { library: { innovationPacks: { templatesSet: { templates: ClassificationTemplate[] } }[] } };
    }>(query, {}, authToken ? { authorization: `Bearer ${authToken}` } : undefined);
  const result = await graphqlErrorWrapper<{
    platform: { library: { innovationPacks: { templatesSet: { templates: ClassificationTemplate[] } }[] } };
  }>(callback, TestUser.GLOBAL_ADMIN);
  if (result.error) {
    throw new Error(`getClassificationTemplates failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.platform.library.innovationPacks.flatMap(
    pack => pack.templatesSet.templates
  );
};

const createClassificationTemplate = async (
  templatesSetID: string,
  displayName: string,
  description: string,
  cardinality: 'SINGLE_SELECT' | 'MULTI_SELECT',
  values: string[]
): Promise<{ id: string; profile: { displayName: string } }> => {
  const mutation = `
    mutation CreateClassificationTemplate(
      $templatesSetID: UUID!
      $profileData: CreateProfileInput!
      $classificationData: CreateClassificationTemplateContentInput!
    ) {
      createTemplate(
        templateData: {
          templatesSetID: $templatesSetID
          type: CLASSIFICATION
          profileData: $profileData
          classificationData: $classificationData
        }
      ) { id profile { displayName } }
    }
  `;
  const result = await graphqlErrorWrapper<{ createTemplate: { id: string; profile: { displayName: string } } }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ createTemplate: { id: string; profile: { displayName: string } } }>(
        mutation,
        {
          templatesSetID,
          profileData: { displayName, description },
          classificationData: { cardinality, values: values.map(label => ({ label })) },
        },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`createClassificationTemplate failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.createTemplate;
};

const updateTemplate = async (
  id: string,
  displayName: string
): Promise<{ id: string; profile: { displayName: string } }> => {
  const mutation = `
    mutation UpdateClassificationTemplate($ID: UUID!, $profile: UpdateProfileInput!) {
      updateTemplate(updateData: { ID: $ID profile: $profile }) { id profile { displayName } }
    }
  `;
  const result = await graphqlErrorWrapper<{ updateTemplate: { id: string; profile: { displayName: string } } }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ updateTemplate: { id: string; profile: { displayName: string } } }>(
        mutation,
        { ID: id, profile: { displayName } },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`updateTemplate failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.updateTemplate;
};

const deleteTemplate = async (id: string): Promise<void> => {
  const mutation = `
    mutation DeleteClassificationTemplate($ID: UUID!) {
      deleteTemplate(deleteData: { ID: $ID }) { id }
    }
  `;
  const result = await graphqlErrorWrapper<{ deleteTemplate: { id: string } }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ deleteTemplate: { id: string } }>(
        mutation,
        { ID: id },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`deleteTemplate failed: ${JSON.stringify(result.error.errors)}`);
  }
};

const getSpaceClassifications = async (spaceID: string): Promise<ClassificationEntry[]> => {
  const query = `
    query GetSpaceClassifications($spaceID: UUID!) {
      lookup {
        space(ID: $spaceID) {
          about { classifications { id displayLabel display sortOrder selectedValues { id label } } }
        }
      }
    }
  `;
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<{
      lookup: { space: { about: { classifications: ClassificationEntry[] } } };
    }>(query, { spaceID }, authToken ? { authorization: `Bearer ${authToken}` } : undefined);
  const result = await graphqlErrorWrapper<{
    lookup: { space: { about: { classifications: ClassificationEntry[] } } };
  }>(callback, TestUser.GLOBAL_ADMIN);
  if (result.error) {
    throw new Error(`getSpaceClassifications failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.lookup.space.about.classifications;
};

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-us1-classify-a-space',
  space: {
    about: { profile: { displayName: 'US1 Classify Space' } },
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
    subspace: {
      about: { profile: { displayName: 'US1 Subspace' } },
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: { policy: CommunityMembershipPolicy.Applications },
      },
      subspace: {
        about: { profile: { displayName: 'US1 Subsubspace' } },
        collaboration: { addTutorialCallouts: false },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          privacy: { mode: SpacePrivacyMode.Public },
          membership: { policy: CommunityMembershipPolicy.Applications },
        },
      },
    },
  },
};

const singleTemplateLabel = 'US1 Single Vocab';
const singleTemplateDescription = 'AS3 single-select template';
const multiTemplateLabel = 'US1 Multi Vocab';
const multiTemplateDescription = 'AS4/AS7/AS8 multi-select template';
const independenceTemplateLabel = 'US1 Independence Vocab';
const independenceTemplateRenamedLabel = 'US1 Independence Vocab RENAMED';

let independenceTemplateId: string;
let multiEntryId: string; // captured in AS4, revisited (not re-added) in AS8

test.describe.serial('US1 — Classify a Space (workspace#024-classifications)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(90_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    const templates = await getClassificationTemplates();
    const sdgs = templates.find(t => t.type === 'CLASSIFICATION' && t.profile.displayName === 'SDGs');
    if (!sdgs) {
      throw new Error('Seeded "SDGs" Classification Template not found (FR-005a) — bootstrap seed did not land.');
    }

    await createClassificationTemplate(
      baseScenario.space.templateSetId,
      singleTemplateLabel,
      singleTemplateDescription,
      'SINGLE_SELECT',
      ['Option X', 'Option Y']
    );

    await createClassificationTemplate(
      baseScenario.space.templateSetId,
      multiTemplateLabel,
      multiTemplateDescription,
      'MULTI_SELECT',
      ['Value A', 'Value B']
    );

    const independence = await createClassificationTemplate(
      baseScenario.space.templateSetId,
      independenceTemplateLabel,
      'AS5 independence template',
      'MULTI_SELECT',
      ['Alpha', 'Beta']
    );
    independenceTemplateId = independence.id;

    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    // Deleting the Space cascades every classification_entry row (D1 —
    // `space_about.id` FK, `ON DELETE CASCADE`); no separate cleanup needed.
    if (baseScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  test(
    'US1-AS1 — the picker lists platform-wide AND top-level-Space templates, distinguished, with descriptions; no create-template/create-classification option',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await expect(page.getByRole('heading', { name: 'Classifications', level: 3 })).toBeVisible();
      await page.getByRole('button', { name: 'Add classification' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: 'Add a classification' })).toBeVisible();

      // Two distinct, separately-headed sources.
      const platformSection = dialog.getByRole('heading', { name: 'Platform-wide' });
      const librarySection = dialog.getByRole('heading', { name: "This Space's library" });
      await expect(platformSection).toBeVisible();
      await expect(librarySection).toBeVisible();

      // Platform-wide: the seeded SDGs template, with its description shown.
      await expect(
        dialog.getByRole('button', { name: /^SDGs\b/ })
      ).toBeVisible();
      await expect(dialog.getByText('The UN Sustainable Development Goals.')).toBeVisible();

      // This Space's library: both Space-scoped templates created in beforeAll,
      // each showing its description (FR-007b).
      await expect(
        dialog.getByRole('button', { name: `${singleTemplateLabel} ${singleTemplateDescription}` })
      ).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: `${multiTemplateLabel} ${multiTemplateDescription}` })
      ).toBeVisible();

      // No create-template and no create-classification affordance (FR-015/FR-016).
      await expect(dialog.getByRole('button', { name: /create.*template/i })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: /create.*classification/i })).toHaveCount(0);

      await dialog.getByRole('button', { name: 'Cancel' }).click();
    }
  );

  test(
    'US1-AS2 — picking a template persists the classification immediately with zero selected values, surviving a reload',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await page.getByRole('button', { name: 'Add classification' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^SDGs\b/ }).click();

      // Persisted immediately, no separate save, with no value selected yet.
      const group = page.locator('div', { has: page.getByRole('heading', { name: 'SDGs', level: 4 }) }).first();
      await expect(group.getByText('No values selected yet')).toBeVisible();
      await expect(group.getByRole('checkbox', { checked: true })).toHaveCount(0);

      await page.reload();
      const groupAfter = page.locator('div', { has: page.getByRole('heading', { name: 'SDGs', level: 4 }) }).first();
      await expect(groupAfter.getByText('No values selected yet')).toBeVisible();
      await expect(groupAfter.getByRole('checkbox', { checked: true })).toHaveCount(0);
    }
  );

  test(
    'US1-AS3 — single-select: selecting a second value replaces the first, never two selected',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await page.getByRole('button', { name: 'Add classification' }).click();
      const dialog = page.getByRole('dialog');
      await dialog
        .getByRole('button', { name: `${singleTemplateLabel} ${singleTemplateDescription}` })
        .click();

      const group = page
        .locator('div', { has: page.getByRole('heading', { name: singleTemplateLabel, level: 4 }) })
        .first();
      await group.getByRole('radio', { name: 'Option X' }).click();
      await expect(group.getByRole('radio', { checked: true })).toHaveCount(1);

      await group.getByRole('radio', { name: 'Option Y' }).click();
      await expect(group.getByRole('radio', { name: 'Option Y', checked: true })).toBeVisible();
      await expect(group.getByRole('radio', { checked: true })).toHaveCount(1);

      await page.reload();
      const groupAfter = page
        .locator('div', { has: page.getByRole('heading', { name: singleTemplateLabel, level: 4 }) })
        .first();
      await expect(groupAfter.getByRole('radio', { name: 'Option Y', checked: true })).toBeVisible();
      await expect(groupAfter.getByRole('radio', { name: 'Option X', checked: true })).toHaveCount(0);
      await expect(groupAfter.getByRole('radio', { checked: true })).toHaveCount(1);
    }
  );

  test(
    'US1-AS4 — multi-select: several selected values persist on reload with no separate form save',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await page.getByRole('button', { name: 'Add classification' }).click();
      const dialog = page.getByRole('dialog');
      await dialog
        .getByRole('button', { name: `${multiTemplateLabel} ${multiTemplateDescription}` })
        .click();

      const group = page
        .locator('div', { has: page.getByRole('heading', { name: multiTemplateLabel, level: 4 }) })
        .first();
      await group.getByRole('checkbox', { name: 'Value A' }).click();
      await group.getByRole('checkbox', { name: 'Value B' }).click();
      await expect(group.getByRole('checkbox', { checked: true })).toHaveCount(2);

      await page.reload();
      const groupAfter = page
        .locator('div', { has: page.getByRole('heading', { name: multiTemplateLabel, level: 4 }) })
        .first();
      await expect(groupAfter.getByRole('checkbox', { name: 'Value A', checked: true })).toBeVisible();
      await expect(groupAfter.getByRole('checkbox', { name: 'Value B', checked: true })).toBeVisible();
      await expect(groupAfter.getByRole('checkbox', { checked: true })).toHaveCount(2);

      // Captured for US1-AS8, which revisits this exact entry.
      const entries = await getSpaceClassifications(baseScenario.space.id);
      const multiEntry = entries.find(e => e.displayLabel === multiTemplateLabel);
      expect(multiEntry).toBeDefined();
      multiEntryId = multiEntry!.id;
    }
  );

  test(
    'US1-AS5 — a Classification is a pure copy: renaming/editing/deleting the source template never changes it',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await page.getByRole('button', { name: 'Add classification' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^US1 Independence Vocab\b/ }).click();

      const group = page
        .locator('div', { has: page.getByRole('heading', { name: independenceTemplateLabel, level: 4 }) })
        .first();
      await group.getByRole('checkbox', { name: 'Alpha' }).click();
      await expect(group.getByRole('checkbox', { name: 'Alpha', checked: true })).toBeVisible();

      // Edit AND rename the source template.
      await updateTemplate(independenceTemplateId, independenceTemplateRenamedLabel);

      // The Space's copy is byte-identical: same label, same values, same
      // selection — a live re-fetch proves it, not just the client cache.
      await page.reload();
      const untouchedGroup = page
        .locator('div', { has: page.getByRole('heading', { name: independenceTemplateLabel, level: 4 }) })
        .first();
      await expect(untouchedGroup.getByRole('checkbox', { name: 'Alpha', checked: true })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: independenceTemplateRenamedLabel, level: 4 })
      ).toHaveCount(0);

      // Delete the source template entirely.
      await deleteTemplate(independenceTemplateId);

      await page.reload();
      const stillThereGroup = page
        .locator('div', { has: page.getByRole('heading', { name: independenceTemplateLabel, level: 4 }) })
        .first();
      await expect(stillThereGroup.getByRole('checkbox', { name: 'Alpha', checked: true })).toBeVisible();

      const entries = await getSpaceClassifications(baseScenario.space.id);
      const survivor = entries.find(e => e.displayLabel === independenceTemplateLabel);
      expect(survivor).toBeDefined();
      expect(survivor!.selectedValues.map(v => v.label)).toEqual(['Alpha']);
    }
  );

  test(
    'US1-AS6 — re-picking the same template (default label, and a normalized-equal variant) is rejected; a genuinely different label succeeds as a second copy',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      // Given: SDGs already added (US1-AS2).
      await expect(page.getByRole('heading', { name: 'SDGs', level: 4 })).toBeVisible();

      // When: picks SDGs again (default label) — rejected, prompted for a
      // different label.
      await page.getByRole('button', { name: 'Add classification' }).click();
      let dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^SDGs\b/ }).click();

      const conflictDialog = page.getByRole('dialog', { name: 'That name is already in use' });
      await expect(conflictDialog).toBeVisible();
      const labelInput = conflictDialog.getByRole('textbox', { name: 'Display label' });

      // And again as a normalized-equal variant ("sdgs " — case + trailing
      // whitespace) — also rejected (FR-011c).
      await labelInput.fill('sdgs ');
      await conflictDialog.getByRole('button', { name: 'Add with this label' }).click();
      await expect(conflictDialog).toBeVisible();

      // Then: a genuinely different label succeeds as an independent second copy.
      await labelInput.fill('SDGs - aspirational');
      await conflictDialog.getByRole('button', { name: 'Add with this label' }).click();
      await expect(conflictDialog).toHaveCount(0);

      await expect(page.getByRole('heading', { name: 'SDGs', level: 4, exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'SDGs - aspirational', level: 4 })).toBeVisible();

      await page.reload();
      await expect(page.getByRole('heading', { name: 'SDGs', level: 4, exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'SDGs - aspirational', level: 4 })).toBeVisible();

      const entries = await getSpaceClassifications(baseScenario.space.id);
      expect(entries.filter(e => e.displayLabel === 'SDGs' || e.displayLabel === 'SDGs - aspirational')).toHaveLength(2);
    }
  );

  test(
    'US1-AS7 — from a sub-subspace, the picker offers the TOP-LEVEL Space library (not the immediate parent), and the classification attaches to the acting subspace itself',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      const subsubspaceAboutUrl = `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}/opportunities/${baseScenario.subsubspace.nameId}/settings/about`;
      await page.goto(subsubspaceAboutUrl);
      await expect(page.getByRole('heading', { name: 'Classifications', level: 3 })).toBeVisible();
      await page.getByRole('button', { name: 'Add classification' }).click();

      const dialog = page.getByRole('dialog');
      // The Space-scoped half offers the TOP-LEVEL Space's own templates —
      // the same ones seen at top level, resolved through the root, not a
      // library of the sub-subspace's own (none exists) or its immediate
      // parent's.
      await expect(
        dialog.getByRole('button', { name: `${multiTemplateLabel} ${multiTemplateDescription}` })
      ).toBeVisible();

      await dialog
        .getByRole('button', { name: `${singleTemplateLabel} ${singleTemplateDescription}` })
        .click();
      const group = page
        .locator('div', { has: page.getByRole('heading', { name: singleTemplateLabel, level: 4 }) })
        .first();
      await group.getByRole('radio', { name: 'Option X' }).click();
      await expect(group.getByRole('radio', { name: 'Option X', checked: true })).toBeVisible();

      // Attaches to the acting sub-subspace itself...
      await page.reload();
      await expect(page.getByRole('heading', { name: singleTemplateLabel, level: 4 })).toBeVisible();

      // ...never the top-level Space (which already has its OWN, separate
      // "US1 Single Vocab" entry from US1-AS3/AS7 setup, but the sub-subspace's
      // entry is a distinct copy — verified via the read API by host id).
      const topLevelEntries = await getSpaceClassifications(baseScenario.space.id);
      const subsubspaceEntries = await getSpaceClassifications(baseScenario.subsubspace.id);
      const topLevelSingle = topLevelEntries.find(e => e.displayLabel === singleTemplateLabel);
      const subsubspaceSingle = subsubspaceEntries.find(e => e.displayLabel === singleTemplateLabel);
      expect(topLevelSingle).toBeDefined();
      expect(subsubspaceSingle).toBeDefined();
      expect(subsubspaceSingle!.id).not.toEqual(topLevelSingle!.id);
      expect(subsubspaceSingle!.selectedValues.map(v => v.label)).toEqual(['Option X']);

      // ...and never the intermediate subspace either.
      const subspaceEntries = await getSpaceClassifications(baseScenario.subspace.id);
      expect(subspaceEntries.find(e => e.displayLabel === singleTemplateLabel)).toBeUndefined();
    }
  );

  test(
    'US1-AS8 — revising the selection changes only the selection: same entry id, same render position, Step A never repeated',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      expect(multiEntryId, 'US1-AS4 must have captured the multi-select entry id').toBeTruthy();

      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      const headings = page.locator('h4');
      const orderBefore = await headings.allInnerTexts();
      const positionBefore = orderBefore.indexOf(multiTemplateLabel);
      expect(positionBefore).toBeGreaterThanOrEqual(0);

      // Revise the selection: deselect Value A, keep Value B only.
      const group = page
        .locator('div', { has: page.getByRole('heading', { name: multiTemplateLabel, level: 4 }) })
        .first();
      await group.getByRole('checkbox', { name: 'Value A' }).click();
      await expect(group.getByRole('checkbox', { name: 'Value A', checked: false })).toBeVisible();
      await expect(group.getByRole('checkbox', { name: 'Value B', checked: true })).toBeVisible();

      await page.reload();

      // Same render position — Step A was never repeated (no remove+re-add,
      // which would move it to the end per FR-018b).
      const orderAfter = await page.locator('h4').allInnerTexts();
      const positionAfter = orderAfter.indexOf(multiTemplateLabel);
      expect(positionAfter).toEqual(positionBefore);

      // Same entry id, new selection, via the read API — the definitive proof
      // Step A was not repeated (SC-002).
      const entries = await getSpaceClassifications(baseScenario.space.id);
      const revised = entries.find(e => e.id === multiEntryId);
      expect(revised, 'the original entry id must still resolve — it was revised, not replaced').toBeDefined();
      expect(revised!.selectedValues.map(v => v.label)).toEqual(['Value B']);
      expect(entries.filter(e => e.displayLabel === multiTemplateLabel)).toHaveLength(1);
    }
  );
});
