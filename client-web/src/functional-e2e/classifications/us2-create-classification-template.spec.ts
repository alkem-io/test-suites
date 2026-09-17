// spec: workspace#024-classifications — specs/024-classifications/spec.md, User Story 2 (P1)
// "Create a Classification Template in a library or pack".
//
// Walks (repos.yaml naming):
//   US2-AS1 — a user with template-create access creates a Classification
//             Template through the normal Template flow (Settings →
//             Templates → "Classification templates" → Add new → Create
//             new); it is created immediately with no approval step and
//             appears alongside the other template types, capturing display
//             label, description, cardinality, value set and name-id
//             (FR-002/-003/-004, covers US2-S1/US2-S3).
//   US2-AS2 — typing only value display labels (no ids) derives a slugified
//             id per value; duplicate labels within the same set are
//             suffixed deterministically ("-2", "-3", …); a later rename of
//             a label (id resupplied explicitly, unchanged) leaves that id
//             unchanged (FR-002c, covers US2-S4).
//   US2-AS3 — an explicit id override that duplicates another id in the
//             same value set is rejected with a clear, field-level error —
//             both in the authoring form and at the API — never silently
//             suffixed (FR-002c, covers US2-S5).
//   US2-AS4 — once saved, the new template is offered in the Space's `+`
//             picker (Story 1, Step A) under "This Space's library" (no
//             scenario id — repos.yaml walk-only, not one-to-one with
//             spec.md scenarios).
//
// Authoring surface: Settings → Templates
// (`client-web/src/main/crdPages/topLevelPages/spaceSettings/templates/`,
// `client-web/src/crd/components/templates/ClassificationTemplateForm.tsx`).
// AS4 re-uses the Settings → About `+` picker
// (`ClassificationPickerDialog.tsx`) that Story 1 walks in full.
//
// Fixture: a single Space with its own Template Library — no seeded
// platform template is required for this story (that is US1's fixture);
// US2 only needs create-access to a library, per its Independent Test.

import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { TestUser, TestUserManager } from '@alkemio/tests-lib';
import {
  graphqlErrorWrapper,
  GraphqlReturnWithError,
} from '@alkemio/tests-lib/utils/graphql.wrapper';
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
    storageStateName: 'us2-create-classification-template.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const graphqlClient = new GraphQLClient(testConfiguration.endPoints.graphql.private);

// ---------------------------------------------------------------------------
// Minimal, spec-local GraphQL helpers for the 024-classifications surface —
// mirrors `classifications/us1-classify-a-space.spec.ts`.
// ---------------------------------------------------------------------------

type ClassificationValue = { id: string; label: string };

type ClassificationTemplate = {
  id: string;
  nameID: string;
  profile: { displayName: string; description?: string | null };
  classification: { cardinality: 'SINGLE_SELECT' | 'MULTI_SELECT'; values: ClassificationValue[] };
};

const getClassificationTemplatesInSet = async (
  templatesSetID: string
): Promise<ClassificationTemplate[]> => {
  const query = `
    query GetClassificationTemplatesInSet($templatesSetID: UUID!) {
      lookup {
        templatesSet(ID: $templatesSetID) {
          classificationTemplates {
            id
            nameID
            profile { displayName description }
            classification { cardinality values { id label } }
          }
        }
      }
    }
  `;
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<{
      lookup: { templatesSet: { classificationTemplates: ClassificationTemplate[] } };
    }>(query, { templatesSetID }, authToken ? { authorization: `Bearer ${authToken}` } : undefined);
  const result = await graphqlErrorWrapper<{
    lookup: { templatesSet: { classificationTemplates: ClassificationTemplate[] } };
  }>(callback, TestUser.GLOBAL_ADMIN);
  if (result.error) {
    throw new Error(`getClassificationTemplatesInSet failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.lookup.templatesSet.classificationTemplates;
};

const updateTemplateClassificationValueLabel = async (
  templateID: string,
  cardinality: 'SINGLE_SELECT' | 'MULTI_SELECT',
  values: ClassificationValue[]
): Promise<ClassificationTemplate> => {
  const mutation = `
    mutation UpdateTemplateClassification(
      $ID: UUID!
      $classificationData: CreateClassificationTemplateContentInput!
    ) {
      updateTemplate(updateData: { ID: $ID, classificationData: $classificationData }) {
        id
        nameID
        profile { displayName description }
        classification { cardinality values { id label } }
      }
    }
  `;
  const result = await graphqlErrorWrapper<{ updateTemplate: ClassificationTemplate }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ updateTemplate: ClassificationTemplate }>(
        mutation,
        { ID: templateID, classificationData: { cardinality, values } },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`updateTemplateClassificationValueLabel failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.updateTemplate;
};

const createTemplateWithDuplicateExplicitId = async (
  templatesSetID: string
): Promise<GraphqlReturnWithError<{ createTemplate: { id: string } }>> => {
  const mutation = `
    mutation CreateTemplateDuplicateId(
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
      ) { id }
    }
  `;
  const result = await graphqlErrorWrapper<{ createTemplate: { id: string } }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ createTemplate: { id: string } }>(
        mutation,
        {
          templatesSetID,
          profileData: { displayName: 'US2-AS3 API Duplicate Id', description: 'api dup id test' },
          classificationData: {
            cardinality: 'MULTI_SELECT',
            values: [
              { id: 'dup-id', label: 'Alpha' },
              { id: 'dup-id', label: 'Beta' },
            ],
          },
        },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  return result;
};

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-us2-create-classification-template',
  space: {
    about: { profile: { displayName: 'US2 Create Template Space' } },
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

const createdTemplateLabel = 'US2 Sector Vocab';
const createdTemplateDescription = 'AS1/AS2/AS4 walk template';

test.describe.serial('US2 — Create a Classification Template (workspace#024-classifications)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.spaceAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    if (baseScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  test(
    'US2-AS1 — created immediately with no approval step, appears alongside other template types, capturing label/description/cardinality/values/name-id',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/templates`);

      const classificationSection = page
        .locator('li', { has: page.getByRole('button', { name: /^Classification templates\b/ }) })
        .first();
      await expect(classificationSection).toBeVisible();
      const countBefore = await classificationSection.getByRole('listitem').count();

      await classificationSection.getByRole('button', { name: 'Add new' }).click();
      await page.getByRole('menuitem', { name: 'Create new' }).click();

      const dialog = page.getByRole('dialog', { name: 'Create classification template' });
      await expect(dialog).toBeVisible();

      await dialog.getByRole('textbox', { name: 'Template name' }).fill(createdTemplateLabel);
      await dialog.getByRole('textbox', { name: 'Description' }).fill(createdTemplateDescription);
      // Multi-select is the default; two label-only values (>= 2, FR-002a).
      await dialog.getByRole('textbox', { name: 'Value label' }).nth(0).fill('Health');
      await dialog.getByRole('button', { name: 'Add value' }).click();
      await dialog.getByRole('textbox', { name: 'Value label' }).nth(1).fill('Education');

      // No approval step: Save commits directly, no confirmation/moderation dialog.
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(dialog).toHaveCount(0);

      // Appears immediately, alongside the other template-type sections, in
      // the same "Classification templates" list — count incremented by one.
      await expect(
        classificationSection.getByRole('heading', { name: createdTemplateLabel, level: 4 })
      ).toBeVisible();
      await expect(
        classificationSection.getByText(createdTemplateDescription)
      ).toBeVisible();
      await expect(classificationSection.getByRole('listitem')).toHaveCount(countBefore + 1);

      // Reload proves it is persisted, not just optimistic client state.
      await page.reload();
      const sectionAfterReload = page
        .locator('li', { has: page.getByRole('button', { name: /^Classification templates\b/ }) })
        .first();
      await expect(
        sectionAfterReload.getByRole('heading', { name: createdTemplateLabel, level: 4 })
      ).toBeVisible();

      // Display label, description, cardinality, value set and name-id are
      // all captured — name-id is not a rendered surface (US2-S2 note), so
      // asserted via the read API.
      const templates = await getClassificationTemplatesInSet(baseScenario.space.templateSetId);
      const created = templates.find(t => t.profile.displayName === createdTemplateLabel);
      expect(created, 'the created template must be readable via the API').toBeDefined();
      expect(created!.profile.description).toEqual(createdTemplateDescription);
      expect(created!.classification.cardinality).toEqual('MULTI_SELECT');
      expect(created!.classification.values.map(v => v.label)).toEqual(['Health', 'Education']);
      expect(created!.nameID).toBeTruthy();
    }
  );

  test(
    'US2-AS2 — label-only values derive slugified ids; duplicate labels suffixed deterministically; a later rename leaves the id unchanged',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/templates`);
      const classificationSection = page
        .locator('li', { has: page.getByRole('button', { name: /^Classification templates\b/ }) })
        .first();
      await classificationSection.getByRole('button', { name: 'Add new' }).click();
      await page.getByRole('menuitem', { name: 'Create new' }).click();

      const dialog = page.getByRole('dialog', { name: 'Create classification template' });
      const slugTemplateLabel = 'US2 Slug Vocab';
      await dialog.getByRole('textbox', { name: 'Template name' }).fill(slugTemplateLabel);
      await dialog.getByRole('textbox', { name: 'Description' }).fill('AS2 slugification walk');

      // Two values sharing the SAME label (duplicate), one distinct — every
      // "Custom id" field left blank (label-only authoring, FR-002c).
      await dialog.getByRole('textbox', { name: 'Value label' }).nth(0).fill('Ocean Value');
      await dialog.getByRole('button', { name: 'Add value' }).click();
      await dialog.getByRole('textbox', { name: 'Value label' }).nth(1).fill('Ocean Value');
      await dialog.getByRole('button', { name: 'Add value' }).click();
      await dialog.getByRole('textbox', { name: 'Value label' }).nth(2).fill('Forest Value');

      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(dialog).toHaveCount(0);

      const templates = await getClassificationTemplatesInSet(baseScenario.space.templateSetId);
      const created = templates.find(t => t.profile.displayName === slugTemplateLabel);
      expect(created, 'the slug-test template must be readable via the API').toBeDefined();

      const values = created!.classification.values;
      expect(values.map(v => v.label)).toEqual(['Ocean Value', 'Ocean Value', 'Forest Value']);
      // Slugified from the label; the duplicate is suffixed deterministically.
      expect(values[0].id).toEqual('ocean-value');
      expect(values[1].id).toEqual('ocean-value-2');
      expect(values[2].id).toEqual('forest-value');
      // Every id distinct despite the duplicate label.
      expect(new Set(values.map(v => v.id)).size).toEqual(3);

      // Renaming a label afterwards (id resupplied unchanged) leaves that id
      // unchanged — the id is derived ONCE, at authoring time (FR-002c).
      const renamed = await updateTemplateClassificationValueLabel(
        created!.id,
        'MULTI_SELECT',
        [
          { id: values[0].id, label: 'Ocean Value RENAMED' },
          { id: values[1].id, label: values[1].label },
          { id: values[2].id, label: values[2].label },
        ]
      );
      expect(renamed.classification.values[0]).toEqual({ id: 'ocean-value', label: 'Ocean Value RENAMED' });
      expect(renamed.classification.values[1].id).toEqual('ocean-value-2');
      expect(renamed.classification.values[2].id).toEqual('forest-value');
    }
  );

  test(
    'US2-AS3 — an explicit id override that duplicates another id in the same set is rejected with a clear error, never silently suffixed',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/templates`);
      const classificationSection = page
        .locator('li', { has: page.getByRole('button', { name: /^Classification templates\b/ }) })
        .first();
      const countBefore = await classificationSection.getByRole('listitem').count();

      await classificationSection.getByRole('button', { name: 'Add new' }).click();
      await page.getByRole('menuitem', { name: 'Create new' }).click();

      const dialog = page.getByRole('dialog', { name: 'Create classification template' });
      await dialog.getByRole('textbox', { name: 'Template name' }).fill('US2 Dup Id Vocab');
      await dialog.getByRole('textbox', { name: 'Description' }).fill('AS3 duplicate id walk');

      await dialog.getByRole('textbox', { name: 'Value label' }).nth(0).fill('Alpha');
      await dialog.getByRole('textbox', { name: 'Custom id (optional)' }).nth(0).fill('dup-id');
      await dialog.getByRole('button', { name: 'Add value' }).click();
      await dialog.getByRole('textbox', { name: 'Value label' }).nth(1).fill('Beta');
      await dialog.getByRole('textbox', { name: 'Custom id (optional)' }).nth(1).fill('dup-id');

      await dialog.getByRole('button', { name: 'Save' }).click();

      // Rejected with a clear, field-level error — the dialog stays open,
      // nothing is silently suffixed or saved.
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByText('This id is already used by another value in this set.')
      ).toHaveCount(2);

      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(classificationSection.getByRole('listitem')).toHaveCount(countBefore);

      // The same rejection holds at the API layer directly (not merely a
      // client-side form guard) — a BAD_USER_INPUT error, not a 2xx with a
      // silently-suffixed id.
      const apiResult = await createTemplateWithDuplicateExplicitId(baseScenario.space.templateSetId);
      expect(apiResult.error, 'the API must reject a duplicate explicit id override').toBeTruthy();
    }
  );

  test(
    'US2-AS4 — the newly-saved template is offered in the Space\'s + picker (Step A)',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings/about`);
      await page.getByRole('button', { name: 'Add classification' }).click();

      const pickerDialog = page.getByRole('dialog', { name: 'Add a classification' });
      await expect(pickerDialog).toBeVisible();

      const librarySection = pickerDialog.getByRole('heading', { name: "This Space's library" });
      await expect(librarySection).toBeVisible();
      await expect(
        pickerDialog.getByRole('button', { name: `${createdTemplateLabel} ${createdTemplateDescription}` })
      ).toBeVisible();

      await pickerDialog.getByRole('button', { name: 'Cancel' }).click();
    }
  );
});
