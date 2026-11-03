// spec: client-web/src/functional-e2e/explore-platform/explore-spaces-search-count-test-plan.md
//
// The Spaces explorer (/spaces) states how many Spaces and Subspaces match a
// search: the server's exact `spaceResults.total` for what the user may see,
// narrowed by the Type filter on the server. Privacy still filters in the
// browser, so with it set the line names the terms without a number.
//
// @local-stack: needs Elasticsearch (re-ingested here), which the shared test
// cluster does not provide.

import { BrowserContext, expect, Page } from '@playwright/test';
import {
  ingestSearchFromScratch,
  searchIngestTimeoutMs,
  searchSpacesAndSubspaces,
  SpacePrivacyMode,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  updateSpaceSettingsData,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createAuthenticatedSessionFixture,
  ensurePersonaState,
} from '../fixtures/authenticated-session.fixture';
import { must } from '../helpers/lib-actor.helper';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'explore-spaces-search-count.json',
  });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// A run-unique word in every display name ("l0-<word>-…", "l1-<word>",
// "l2-<word>"): the search matches this file's three spaces and nothing else.
const word = `srchcnt${UniqueIDGenerator.getID()}`;

const scenarioConfig: TestScenarioConfig = {
  name: word,
  space: {
    collaboration: { addTutorialCallouts: false },
    settings: { privacy: { mode: SpacePrivacyMode.Public } },
    subspace: {
      subspace: {},
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;

const setSubspacePrivacy = async (mode: SpacePrivacyMode) =>
  must(
    await updateSpaceSettingsData({
      spaceID: baseScenario.subspace.id,
      settings: { privacy: { mode } },
    }),
    `set the subspace ${mode}`
  );

const searchFor = async (page: Page) => {
  await page.goto(`${baseUrl}/spaces`);
  const searchBox = page.getByRole('textbox', { name: 'Search spaces...' });
  await searchBox.fill(word);
  await searchBox.press('Enter');
};

const results = (page: Page) =>
  page.getByRole('list', { name: 'spaces', exact: true }).getByRole('listitem');

const chooseFilter = async (page: Page, option: string) => {
  await page.getByRole('button', { name: /filters/i }).click();
  const menu = page.getByRole('menu');
  await menu
    .getByRole('menuitemcheckbox', { name: option, exact: true })
    .click();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
};

test.describe('Explore Spaces - search count', { tag: '@local-stack' }, () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000 + searchIngestTimeoutMs());
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();
    await setSubspacePrivacy(SpacePrivacyMode.Public);

    must(await ingestSearchFromScratch(), 'start the search ingest');
    // The ingest runs on after the call returns: wait until it has indexed
    // the three spaces.
    await expect
      .poll(
        async () =>
          (await searchSpacesAndSubspaces([word])).data?.search.spaceResults
            .total,
        { timeout: searchIngestTimeoutMs(), intervals: [5_000] }
      )
      .toBe(3);

    await setupAuthentication(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
  });

  test.afterAll(async () => {
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('states how many Spaces and Subspaces match the search', async ({
    page,
  }) => {
    await searchFor(page);

    await expect(
      page.getByText(`3 spaces matching “${word}”`, { exact: true })
    ).toBeVisible();
    await expect(results(page)).toHaveCount(3);
  });

  test('counts only Subspaces when Type is "Subspaces only"', async ({
    page,
  }) => {
    await searchFor(page);
    await expect(
      page.getByText(`3 spaces matching “${word}”`, { exact: true })
    ).toBeVisible();

    await chooseFilter(page, 'Subspaces only');

    await expect(
      page.getByText(`2 spaces matching “${word}”`, { exact: true })
    ).toBeVisible();
    await expect(results(page)).toHaveCount(2);
  });

  test('names the terms without a number while Privacy filters the results', async ({
    page,
  }) => {
    await searchFor(page);
    await expect(
      page.getByText(`3 spaces matching “${word}”`, { exact: true })
    ).toBeVisible();

    await chooseFilter(page, 'Public only');

    // Positive control: the filtered results are on screen.
    await expect(results(page)).toHaveCount(3);
    await expect(
      page.getByText(`Spaces matching “${word}”`, { exact: true })
    ).toBeVisible();
    await expect(page.getByText(/\d+ spaces? matching/)).toHaveCount(0);
  });

  test('hides a private Subspace under Public only', async ({ browser }) => {
    // The admin sees the private Subspace, so Public only has something to
    // hide; the non-member session above would not see it at all.
    let adminContext: BrowserContext | undefined;
    await setSubspacePrivacy(SpacePrivacyMode.Private);
    try {
      adminContext = await browser.newContext({
        storageState: await ensurePersonaState(
          browser,
          TestUserManager.users.globalAdmin.email
        ),
      });
      const adminPage = await adminContext.newPage();
      await searchFor(adminPage);
      // Positive control: all three are shown before filtering.
      await expect(
        adminPage.getByText(`3 spaces matching “${word}”`, { exact: true })
      ).toBeVisible();
      await expect(results(adminPage)).toHaveCount(3);

      await chooseFilter(adminPage, 'Public only');

      // The private Subspace is hidden (and, depending on how privacy is
      // inherited, its own Subspace with it); the public Space stays.
      await expect
        .poll(() => results(adminPage).count(), { timeout: 10_000 })
        .toBeLessThan(3);
      expect(await results(adminPage).count()).toBeGreaterThanOrEqual(1);
      await expect(
        adminPage.getByText(`Spaces matching “${word}”`, { exact: true })
      ).toBeVisible();
    } finally {
      await adminContext?.close();
      await setSubspacePrivacy(SpacePrivacyMode.Public);
    }
  });

  test('counts only what the user may see when a Subspace is private', async ({
    page,
  }) => {
    await setSubspacePrivacy(SpacePrivacyMode.Private);
    try {
      // The admin still finds all three: the index is unchanged.
      const asAdmin = must(
        await searchSpacesAndSubspaces([word], TestUser.GLOBAL_ADMIN),
        'search as the admin'
      );
      expect(asAdmin.search.spaceResults.total).toBe(3);

      await searchFor(page);

      await expect(
        page.getByText(`1 space matching “${word}”`, { exact: true })
      ).toBeVisible();
      await expect(results(page)).toHaveCount(1);
      await expect(
        page.getByRole('button', { name: /load more/i })
      ).toHaveCount(0);
    } finally {
      await setSubspacePrivacy(SpacePrivacyMode.Public);
    }
  });
});
