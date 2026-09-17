// spec: workspace#024-classifications — specs/024-classifications/spec.md, story REMOVAL (P1)
// repos.yaml walk: REM-AS1
//
// Given a classification with values selected, and another with none, when
// the Space owner removes either from Settings → About, an explicit
// confirmation is required in BOTH cases and states that removal is
// permanent (no undo, no soft-delete — FR-014b). After confirming, the
// classification is gone from the Space and both the source template and
// the Space's other Classifications are untouched (FR-014).
//
// Authoring surface: Settings → About (`ClassificationRemoveConfirm`,
// `client-web/src/crd/components/classification/ClassificationRemoveConfirm.tsx`)
// wired from `CrdSpaceSettingsPage.tsx` via `deleteClassificationEntry`.
//
// Fixture: the seeded platform Classification Templates "SDGs" (multi-select)
// and "Sector" (single-select) — FR-005a.

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
    storageStateName: 'rem-remove-a-classification.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const graphqlClient = new GraphQLClient(testConfiguration.endPoints.graphql.private);

// ---------------------------------------------------------------------------
// Minimal, spec-local GraphQL helpers for the 024-classifications surface —
// mirrors `classifications/us3-see-classifications.spec.ts` (the mutations
// are API-only this iteration, FR-017a / operator ruling D4, so there is no
// `@alkemio/tests-lib` scenario-mutation wrapper for them yet).
// ---------------------------------------------------------------------------

type ClassificationEntry = {
  id: string;
  displayLabel: string;
  selectedValues: { id: string; label: string }[];
};

type ClassificationTemplate = {
  id: string;
  type: string;
  profile: { displayName: string };
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
                profile { displayName }
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

const addClassificationEntryFromTemplate = async (
  spaceID: string,
  templateID: string,
  displayLabel?: string
): Promise<ClassificationEntry> => {
  const mutation = `
    mutation AddClassificationEntryFromTemplate($spaceID: UUID!, $templateID: UUID!, $displayLabel: String) {
      addClassificationEntryFromTemplate(
        classificationData: { spaceID: $spaceID templateID: $templateID displayLabel: $displayLabel }
      ) { id displayLabel selectedValues { id label } }
    }
  `;
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<{ addClassificationEntryFromTemplate: ClassificationEntry }>(
      mutation,
      { spaceID, templateID, displayLabel },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );
  const result = await graphqlErrorWrapper<{ addClassificationEntryFromTemplate: ClassificationEntry }>(
    callback,
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`addClassificationEntryFromTemplate failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.addClassificationEntryFromTemplate;
};

const updateClassificationEntrySelection = async (
  classificationEntryID: string,
  selectedValueIDs: string[]
): Promise<ClassificationEntry> => {
  const mutation = `
    mutation UpdateClassificationEntrySelection($classificationEntryID: UUID!, $selectedValueIDs: [String!]!) {
      updateClassificationEntrySelection(
        classificationData: { classificationEntryID: $classificationEntryID selectedValueIDs: $selectedValueIDs }
      ) { id displayLabel selectedValues { id label } }
    }
  `;
  const result = await graphqlErrorWrapper<{ updateClassificationEntrySelection: ClassificationEntry }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ updateClassificationEntrySelection: ClassificationEntry }>(
        mutation,
        { classificationEntryID, selectedValueIDs },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`updateClassificationEntrySelection failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.updateClassificationEntrySelection;
};

/**
 * Reads a Space's classifications as the Global Admin — used post-removal to
 * assert the removed entry is gone while its siblings survive untouched.
 */
const getSpaceClassifications = async (spaceID: string): Promise<ClassificationEntry[]> => {
  const query = `
    query GetSpaceClassifications($spaceID: UUID!) {
      lookup {
        space(ID: $spaceID) {
          about { classifications { id displayLabel selectedValues { id label } } }
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
  name: 'seed-rem-remove-a-classification',
  space: {
    about: { profile: { displayName: 'REM Classification Removal Space' } },
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
};

let entryWithValuesId: string;
let entryNoValuesId: string;
let survivorEntryId: string;
const entryWithValuesLabel = 'REM SDGs (with values)';
const entryNoValuesLabel = 'REM Sector (no values)';
const survivorLabel = 'REM Survivor (untouched)';

test.describe.serial('REMOVAL — Remove a Classification from a Space (workspace#024-classifications)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    const templates = await getClassificationTemplates();
    const sdgsTemplate = templates.find(t => t.type === 'CLASSIFICATION' && t.profile.displayName === 'SDGs');
    const sectorTemplate = templates.find(
      t => t.type === 'CLASSIFICATION' && t.profile.displayName === 'Sector'
    );
    if (!sdgsTemplate || !sectorTemplate) {
      throw new Error(
        'Seeded "SDGs"/"Sector" Classification Templates not found (FR-005a) — bootstrap seed did not land.'
      );
    }

    // Given a classification with values selected...
    const withValues = await addClassificationEntryFromTemplate(
      baseScenario.space.id,
      sdgsTemplate.id,
      entryWithValuesLabel
    );
    entryWithValuesId = withValues.id;
    await updateClassificationEntrySelection(entryWithValuesId, ['sdg-13', 'sdg-14']);

    // ...and another with none (Step A only, Step B never completed — FR-012a).
    const noValues = await addClassificationEntryFromTemplate(
      baseScenario.space.id,
      sectorTemplate.id,
      entryNoValuesLabel
    );
    entryNoValuesId = noValues.id;

    // A third, untouched entry — proves removal only ever affects the entry
    // it targets, never the Space's other Classifications (FR-014).
    const survivor = await addClassificationEntryFromTemplate(
      baseScenario.space.id,
      sectorTemplate.id,
      survivorLabel
    );
    survivorEntryId = survivor.id;
    await updateClassificationEntrySelection(survivorEntryId, ['health']);

    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    // Deleting the Space cascades every remaining classification_entry row
    // (D1 — `space_about.id` FK, `ON DELETE CASCADE`); no separate cleanup.
    if (baseScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  test(
    'REM-AS1a — removing a Classification WITH selected values requires confirmation stating it is permanent, then removes only that entry',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await expect(page.getByRole('heading', { name: 'Classifications', level: 3 })).toBeVisible();

      const group = page.locator('div', { has: page.getByRole('heading', { name: entryWithValuesLabel, level: 4 }) }).first();
      await expect(group.getByRole('checkbox', { checked: true })).toHaveCount(2);
      await group.getByRole('button', { name: 'Remove classification' }).click();

      // Explicit confirmation is required, and it states removal is
      // permanent — no undo, no soft-delete (FR-014b).
      const dialog = page.getByRole('alertdialog');
      await expect(dialog.getByRole('heading', { name: 'Remove this classification?' })).toBeVisible();
      await expect(dialog).toContainText(entryWithValuesLabel);
      await expect(dialog).toContainText(/cannot be undone/i);
      await expect(dialog).toContainText(/no undo/i);
      await expect(dialog).toContainText(/re-select values from scratch/i);

      await dialog.getByRole('button', { name: 'Remove', exact: true }).click();

      // After confirming, the classification is gone from the settings list...
      await expect(page.getByRole('heading', { name: entryWithValuesLabel, level: 4 })).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Classifications', level: 3 })).toBeVisible();
      await expect(page.getByRole('heading', { name: entryWithValuesLabel, level: 4 })).toHaveCount(0);

      // ...permanently (the read API confirms it, not just the client cache)...
      const remaining = await getSpaceClassifications(baseScenario.space.id);
      expect(remaining.find(e => e.id === entryWithValuesId)).toBeUndefined();

      // ...and the Space's other Classifications are untouched (FR-014).
      const survivor = remaining.find(e => e.id === survivorEntryId);
      expect(survivor).toBeDefined();
      expect(survivor!.selectedValues.map(v => v.id)).toEqual(['health']);
      const stillPending = remaining.find(e => e.id === entryNoValuesId);
      expect(stillPending).toBeDefined();

      // ...and the source template is untouched (a copy was removed, never
      // the template it was taken from — FR-014).
      const templatesAfter = await getClassificationTemplates();
      expect(
        templatesAfter.find(t => t.type === 'CLASSIFICATION' && t.profile.displayName === 'SDGs')
      ).toBeDefined();
    }
  );

  test(
    'REM-AS1b — removing a Classification with NO selected values ALSO requires confirmation stating it is permanent',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await expect(page.getByRole('heading', { name: 'Classifications', level: 3 })).toBeVisible();

      const group = page.locator('div', { has: page.getByRole('heading', { name: entryNoValuesLabel, level: 4 }) }).first();
      await expect(group.getByRole('radio', { checked: true })).toHaveCount(0);
      await group.getByRole('button', { name: 'Remove classification' }).click();

      // Confirmation is required EVEN THOUGH nothing was selected (FR-014b —
      // "always confirmed... whether or not values are selected").
      const dialog = page.getByRole('alertdialog');
      await expect(dialog.getByRole('heading', { name: 'Remove this classification?' })).toBeVisible();
      await expect(dialog).toContainText(entryNoValuesLabel);
      await expect(dialog).toContainText(/cannot be undone/i);
      await expect(dialog).toContainText(/no undo/i);

      await dialog.getByRole('button', { name: 'Remove', exact: true }).click();

      await expect(page.getByRole('heading', { name: entryNoValuesLabel, level: 4 })).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Classifications', level: 3 })).toBeVisible();
      await expect(page.getByRole('heading', { name: entryNoValuesLabel, level: 4 })).toHaveCount(0);

      const remaining = await getSpaceClassifications(baseScenario.space.id);
      expect(remaining.find(e => e.id === entryNoValuesId)).toBeUndefined();

      // The survivor entry (already proven untouched in REM-AS1a) stays
      // untouched by this second, independent removal too.
      const survivor = remaining.find(e => e.id === survivorEntryId);
      expect(survivor).toBeDefined();
      expect(survivor!.selectedValues.map(v => v.id)).toEqual(['health']);

      const templatesAfter = await getClassificationTemplates();
      expect(
        templatesAfter.find(t => t.type === 'CLASSIFICATION' && t.profile.displayName === 'Sector')
      ).toBeDefined();
    }
  );
});
