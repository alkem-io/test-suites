// spec: workspace#024-classifications — specs/024-classifications/spec.md, User Story 3
// (P2) "See a Space's Classifications" — About page display only (operator ruling D2).
//
// Walks (repos.yaml naming):
//   US3-AS1 — a shown Classification with selected values renders as a labelled
//             group on the About page.
//   US3-AS2 / US3-AS4 — a hidden Classification and a zero-selected-value
//             Classification do not render to a read-only (anonymous) visitor,
//             while the read API still returns both (FR-017, FR-010d, FR-018c).
//   US3-AS5 — Classification groups render in order of addition (never
//             alphabetical); removing and re-adding one moves it to the end
//             (FR-018b).
//
// Editor-only render states (the "not shown on the Space page" badge and the
// empty/prompting group — FR-018d / FR-018c) are covered by the shipped unit
// spec `client-web/src/crd/components/classification/ClassificationGroupList.spec.tsx`
// and the render-rule predicates in `.../classification/types.spec.ts`; this
// E2E spec exercises the same feature end-to-end against a live backend from
// the read-only/anonymous vantage point that `functional-e2e` specs in this
// repo are set up to drive deterministically (no interactive-login fixture
// exists in this suite for the CRD editor surface yet).
//
// Fixture: the two seeded platform Classification Templates "SDGs" (multi-select)
// and "Sector" (single-select) — FR-005a. "Sector" is used for the hidden /
// zero-value / reorder-probe entries so this spec has no dependency on SDGs'
// specific value ids beyond "sdg-13"/"sdg-14", which the seed guarantees stable
// (FR-002c, FR-010c).

import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { testConfiguration } from '@alkemio/tests-lib/config/test.configuration';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { test, expect } from '@playwright/test';
import { GraphQLClient } from 'graphql-request';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;
const graphqlClient = new GraphQLClient(testConfiguration.endPoints.graphql.private);

// ---------------------------------------------------------------------------
// Minimal, spec-local GraphQL helpers for the 024-classifications surface.
// The mutations here are API-only this iteration (FR-017a / operator ruling
// D4) — `@alkemio/tests-lib` has no scenario-mutation wrappers for them yet,
// so fixture setup talks to the schema directly, mirroring the existing
// `updateInnovationPackVisibility` pattern in `lib/src/scenario/baseFunctions.ts`.
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
  profile: { displayName: string };
  classification: { values: { id: string; label: string }[] } | null;
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
                classification { values { id label } }
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
      ) { id displayLabel display sortOrder selectedValues { id label } }
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

/**
 * Ad-hoc (template-free) create — API-only this iteration (FR-008a / FR-017a,
 * operator ruling D4). The caller always applies the selection afterwards via
 * `updateClassificationEntrySelection` (a separate call, so this probe also
 * exercises FR-012d's full-replacement selection write as Step B revisited).
 */
const createAdHocClassificationEntry = async (
  spaceID: string,
  displayLabel: string,
  values: { label: string }[]
): Promise<ClassificationEntry> => {
  const mutation = `
    mutation CreateClassificationEntry(
      $spaceID: UUID!
      $displayLabel: String!
      $values: [CreateClassificationValueInput!]!
    ) {
      createClassificationEntry(
        classificationData: {
          spaceID: $spaceID
          displayLabel: $displayLabel
          cardinality: MULTI_SELECT
          values: $values
        }
      ) { id displayLabel display sortOrder selectedValues { id label } }
    }
  `;
  // The server slugifies each omitted id from its label (FR-002c) — the probe
  // relies on that rather than predicting the slug itself.
  const created = await graphqlErrorWrapper<{ createClassificationEntry: ClassificationEntry }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ createClassificationEntry: ClassificationEntry }>(
        mutation,
        { spaceID, displayLabel, values },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (created.error) {
    throw new Error(`createClassificationEntry failed: ${JSON.stringify(created.error.errors)}`);
  }
  return created.data!.createClassificationEntry;
};

const updateClassificationEntrySelection = async (
  classificationEntryID: string,
  selectedValueIDs: string[]
): Promise<ClassificationEntry> => {
  const mutation = `
    mutation UpdateClassificationEntrySelection($classificationEntryID: UUID!, $selectedValueIDs: [String!]!) {
      updateClassificationEntrySelection(
        classificationData: { classificationEntryID: $classificationEntryID selectedValueIDs: $selectedValueIDs }
      ) { id displayLabel display sortOrder selectedValues { id label } }
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

const updateClassificationEntryDisplay = async (
  classificationEntryID: string,
  display: boolean
): Promise<ClassificationEntry> => {
  const mutation = `
    mutation UpdateClassificationEntryDisplay($classificationEntryID: UUID!, $display: Boolean!) {
      updateClassificationEntryDisplay(
        classificationData: { classificationEntryID: $classificationEntryID display: $display }
      ) { id displayLabel display sortOrder selectedValues { id label } }
    }
  `;
  const result = await graphqlErrorWrapper<{ updateClassificationEntryDisplay: ClassificationEntry }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ updateClassificationEntryDisplay: ClassificationEntry }>(
        mutation,
        { classificationEntryID, display },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`updateClassificationEntryDisplay failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.updateClassificationEntryDisplay;
};

const deleteClassificationEntry = async (id: string): Promise<void> => {
  const mutation = `
    mutation DeleteClassificationEntry($id: UUID!) {
      deleteClassificationEntry(classificationData: { ID: $id }) { id }
    }
  `;
  const result = await graphqlErrorWrapper<{ deleteClassificationEntry: { id: string } }>(
    (authToken: string | undefined) =>
      graphqlClient.rawRequest<{ deleteClassificationEntry: { id: string } }>(
        mutation,
        { id },
        authToken ? { authorization: `Bearer ${authToken}` } : undefined
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (result.error) {
    throw new Error(`deleteClassificationEntry failed: ${JSON.stringify(result.error.errors)}`);
  }
};

/**
 * Reads a Space's classifications. Pass `asAnonymous: true` to omit the auth
 * header entirely — this is how US3-AS2 / US3-AS4 prove the read API returns
 * hidden and zero-value entries to anyone who can read a public Space's
 * About, with no privilege beyond it (FR-010d).
 */
const getSpaceClassifications = async (
  spaceID: string,
  asAnonymous = false
): Promise<ClassificationEntry[]> => {
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
    }>(
      query,
      { spaceID },
      !asAnonymous && authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );
  const result = await graphqlErrorWrapper<{
    lookup: { space: { about: { classifications: ClassificationEntry[] } } };
  }>(callback, asAnonymous ? undefined : TestUser.GLOBAL_ADMIN);
  if (result.error) {
    throw new Error(`getSpaceClassifications failed: ${JSON.stringify(result.error.errors)}`);
  }
  return result.data!.lookup.space.about.classifications;
};

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-us3-classifications',
  space: {
    about: { profile: { displayName: 'US3 Classifications Space' } },
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

let sdgsEntryId: string;
let hiddenEntryId: string;
let zeroValueEntryId: string;
let reorderProbeOneId: string;
let reorderProbeTwoId: string;

test.describe('US3 — See a Space Classifications (workspace#024-classifications)', () => {
  test.beforeAll(async () => {
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

    // US3-AS1: a shown Classification with two selected values, added first.
    const sdgs = await addClassificationEntryFromTemplate(baseScenario.space.id, sdgsTemplate.id);
    sdgsEntryId = sdgs.id;
    await updateClassificationEntrySelection(sdgsEntryId, ['sdg-13', 'sdg-14']);

    // US3-AS2: a hidden Classification (still carries a selected value).
    const hidden = await addClassificationEntryFromTemplate(
      baseScenario.space.id,
      sectorTemplate.id,
      'Sector (hidden)'
    );
    hiddenEntryId = hidden.id;
    await updateClassificationEntrySelection(hiddenEntryId, ['technology']);
    await updateClassificationEntryDisplay(hiddenEntryId, false);

    // US3-AS4: a shown Classification with zero selected values.
    const zeroValue = await addClassificationEntryFromTemplate(
      baseScenario.space.id,
      sectorTemplate.id,
      'Sector (zero-value)'
    );
    zeroValueEntryId = zeroValue.id;

    // US3-AS5: two more shown, valued entries — added after SDGs — to prove
    // addition order and the remove/re-add-moves-to-end rule (FR-018b)
    // entirely from what a read-only visitor can observe.
    const probeOne = await createAdHocClassificationEntry(baseScenario.space.id, 'Reorder Probe One', [
      { label: 'Alpha' },
      { label: 'Beta' },
    ]);
    reorderProbeOneId = probeOne.id;
    await updateClassificationEntrySelection(reorderProbeOneId, ['alpha']);

    const probeTwo = await createAdHocClassificationEntry(baseScenario.space.id, 'Reorder Probe Two', [
      { label: 'Gamma' },
      { label: 'Delta' },
    ]);
    reorderProbeTwoId = probeTwo.id;
    await updateClassificationEntrySelection(reorderProbeTwoId, ['gamma']);
  });

  test.afterAll(async () => {
    test.setTimeout(20_000);
    // Deleting the Space cascades every classification_entry row (D1 —
    // `space_about.id` FK, `ON DELETE CASCADE`); no separate cleanup needed.
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test(
    'US3-AS1 — a shown Classification renders as a labelled group of its selected values',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
      await page.getByRole('button', { name: 'About this Space' }).click();

      const dialog = page.getByRole('dialog');
      const sdgsHeading = dialog.getByRole('heading', { name: 'SDGs', level: 3 });
      await expect(sdgsHeading).toBeVisible();

      // The classification group heading sits inside its own "Classifications"
      // section, distinct from the group's values.
      await expect(dialog.getByRole('heading', { name: 'Classifications' })).toBeVisible();
      await expect(dialog.getByText('13 · Climate Action')).toBeVisible();
      await expect(dialog.getByText('14 · Life Below Water')).toBeVisible();
    }
  );

  test(
    'US3-AS2 & US3-AS4 — hidden and zero-value Classifications are invisible to a read-only visitor, but the read API still returns both',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
      await page.getByRole('button', { name: 'About this Space' }).click();

      const dialog = page.getByRole('dialog');
      // Sentinel: the dialog (and its Classifications section) is loaded.
      await expect(dialog.getByRole('heading', { name: 'SDGs', level: 3 })).toBeVisible();

      // Neither the hidden entry nor the zero-value entry render for an
      // anonymous / read-only visitor (FR-018c, FR-018d).
      await expect(dialog.getByRole('heading', { name: 'Sector (hidden)', level: 3 })).toHaveCount(0);
      await expect(dialog.getByRole('heading', { name: 'Sector (zero-value)', level: 3 })).toHaveCount(0);
      await expect(dialog.getByText('Technology')).toHaveCount(0);

      // The read API returns both regardless — display is a render-only flag
      // (FR-010d), and a zero-value entry is still returned (FR-018c).
      const anonymousRead = await getSpaceClassifications(baseScenario.space.id, true);
      const hidden = anonymousRead.find(e => e.id === hiddenEntryId);
      const zeroValue = anonymousRead.find(e => e.id === zeroValueEntryId);
      expect(hidden).toBeDefined();
      expect(hidden!.display).toBe(false);
      expect(hidden!.selectedValues.map(v => v.label)).toContain('Technology');
      expect(zeroValue).toBeDefined();
      expect(zeroValue!.display).toBe(true);
      expect(zeroValue!.selectedValues).toHaveLength(0);
    }
  );

  test(
    'US3-AS5 — Classification groups render in order of addition; removing and re-adding one moves it to the end',
    { tag: '@forge-acceptance' },
    async ({ page }) => {
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);
      await page.getByRole('button', { name: 'About this Space' }).click();

      const dialog = page.getByRole('dialog');
      const headings = dialog.locator('h3');

      // Initial order of addition: SDGs, Reorder Probe One, Reorder Probe Two
      // (hidden/zero-value entries never render here, so they don't interleave).
      await expect(dialog.getByRole('heading', { name: 'SDGs', level: 3 })).toBeVisible();
      const initialOrder = await headings.allInnerTexts();
      const initialVisible = initialOrder.filter(t => t.startsWith('SDGs') || t.startsWith('Reorder Probe'));
      expect(initialVisible).toEqual(['SDGs', 'Reorder Probe One', 'Reorder Probe Two']);

      // Remove the MIDDLE entry and re-add it (same ad-hoc definition,
      // re-selecting the same value) — FR-014b / FR-018b say this moves it to
      // the very end, not back to its old slot.
      await deleteClassificationEntry(reorderProbeOneId);
      const reAdded = await createAdHocClassificationEntry(baseScenario.space.id, 'Reorder Probe One', [
        { label: 'Alpha' },
        { label: 'Beta' },
      ]);
      await updateClassificationEntrySelection(reAdded.id, ['alpha']);

      await page.reload();
      await page.getByRole('button', { name: 'About this Space' }).click();
      const dialogAfter = page.getByRole('dialog');
      await expect(dialogAfter.getByRole('heading', { name: 'SDGs', level: 3 })).toBeVisible();
      const finalOrder = await dialogAfter.locator('h3').allInnerTexts();
      const finalVisible = finalOrder.filter(t => t.startsWith('SDGs') || t.startsWith('Reorder Probe'));
      expect(finalVisible).toEqual(['SDGs', 'Reorder Probe Two', 'Reorder Probe One']);
    }
  );
});
