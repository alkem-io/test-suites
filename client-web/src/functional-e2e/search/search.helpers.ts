import { expect, type Locator, type Page } from '@playwright/test';
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  CalloutVisibility,
  createCalloutWithData,
  ingestSearchFromScratch,
  readSpaceInnovationFlowStates,
  readTask,
  searchIngestTimeoutMs,
  searchCallouts,
  searchSpacesAndSubspaces,
  SpacePrivacyMode,
  TagsetReservedName,
  TestScenarioFactory,
  TestUser,
  updateSpaceSettingsData,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import { spaceSidebar } from '../helpers/space-access.helper';

/**
 * Shared steps for W2 journey 8 (docs/qa/server-rebuild/plan.md § W2): the
 * global search overlay and the Space sidebar's per-tab search.
 *
 * Search reads an Elasticsearch projection of the database, so a fixture only
 * becomes searchable after an ingest. Every name the journey searches for
 * carries a run-unique word, so a search for it can only match this run.
 */

/** The viewer of every case, and the actor of every search read-back. */
export const VIEWER = TestUser.NON_SPACE_MEMBER;

/**
 * A PUBLIC L0 Space named after `word` ("l0-<word>-…"), with no tutorial
 * posts; with `withSubspace`, one PUBLIC L1 ("l1-<word>") under it.
 */
export const seedSearchSpace = async (
  word: string,
  withSubspace: boolean
): Promise<OrganizationWithSpaceModel> => {
  const scenario = await TestScenarioFactory.createBaseScenario({
    name: word,
    space: {
      collaboration: { addTutorialCallouts: false },
      settings: { privacy: { mode: SpacePrivacyMode.Public } },
      ...(withSubspace ? { subspace: { collaboration: {} } } : {}),
    },
  });
  expect(scenario.scenarioSetupSucceeded, `seed the Space "${word}"`).toBe(
    true
  );
  if (withSubspace) {
    must(
      await updateSpaceSettingsData({
        spaceID: scenario.subspace.id,
        settings: { privacy: { mode: SpacePrivacyMode.Public } },
      }),
      `make the subspace of "${word}" public`
    );
  }
  return scenario;
};

export type Phase = { id: string; displayName: string };

/** The Space's visible phases (its page tabs), in tab order. */
export const phasesOf = async (spaceId: string): Promise<Phase[]> => {
  const data = must(
    await readSpaceInnovationFlowStates(spaceId),
    `readSpaceInnovationFlowStates(${spaceId})`
  );
  const all = (data.lookup.space?.collaboration.innovationFlow.states ?? [])
    .filter(state => state.settings.visible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ id, displayName }) => ({ id, displayName }));
  expect(all.length, 'the Space has at least two visible tabs').toBeGreaterThan(
    1
  );
  return all;
};

/** A published post in the named phase; returns its id. */
export const seedPost = async (
  calloutsSetID: string,
  displayName: string,
  phaseName: string
): Promise<string> => {
  const created = must(
    await createCalloutWithData({
      calloutsSetID,
      framing: {
        profile: { displayName, description: 'W2 journey 8' },
        type: CalloutFramingType.None,
      },
      settings: {
        visibility: CalloutVisibility.Published,
        contribution: {
          enabled: true,
          allowedTypes: [CalloutContributionType.Post],
          canAddContributions: CalloutAllowedActors.Members,
          commentsEnabled: true,
        },
        framing: { commentsEnabled: true },
      },
      classification: {
        tagsets: [{ name: TagsetReservedName.FlowState, tags: [phaseName] }],
      },
    }),
    `createCalloutWithData(${displayName})`
  );
  return created.createCalloutOnCalloutsSet.id;
};

/** The ids of the Spaces and Subspaces a search for `word` returns to the viewer. */
export const spaceIdsFoundFor = async (word: string): Promise<string[]> => {
  const data = must(
    await searchSpacesAndSubspaces([word], VIEWER, 20),
    `search Spaces for ${word}`
  );
  return data.search.spaceResults.results
    .map(result => ('space' in result ? result.space.id : ''))
    .sort();
};

/** The ids of the posts a search for `word` returns to the viewer, within `scope`. */
export const postIdsFoundFor = async (
  word: string,
  scope: { spaceID?: string; flowStateID?: string } = {}
): Promise<string[]> => {
  const data = must(
    await searchCallouts([word], scope, VIEWER),
    `search posts for ${word}`
  );
  return (data.search.calloutResults?.results ?? [])
    .map(result => ('callout' in result ? result.callout.id : ''))
    .sort();
};

/**
 * Rebuilds the search index, waits for that ingest task to finish, then
 * expects every expectation to hold: each word finds exactly the ids listed
 * for it.
 *
 * The new indices go live only when the whole ingest has finished (the
 * aliases swap at the end), minutes later on a large database, so the wait is
 * on the task's own status, bounded by `searchIngestTimeoutMs()`
 * (SEARCH_INGEST_TIMEOUT_MS, default 6 min).
 *
 * One retry, for a known server defect: two overlapping ingests race, and an
 * earlier one that finishes after ours swaps in an index read before our
 * fixtures existed (alkem-io/server#6382). On a shared backend another
 * user's ingest can do that; a second ingest, started after it, cannot.
 */
export const ingestAndWaitUntilFound = async (
  expectations: Array<{
    what: string;
    found: () => Promise<string[]>;
    ids: string[];
  }>
): Promise<void> => {
  const expected = Object.fromEntries(
    expectations.map(({ what, ids }) => [what, [...ids].sort()])
  );
  const answers = async () => {
    const result: Record<string, string[]> = {};
    for (const { what, found } of expectations) result[what] = await found();
    return result;
  };
  for (let attempt = 1; ; attempt++) {
    const taskId = must(
      await ingestSearchFromScratch(),
      'start the search ingest'
    ).adminSearchIngestFromScratch;
    await expect
      .poll(
        // A failed read (the server restarting, a 502) is retried, not fatal.
        async () => (await readTask(taskId)).data?.task.status ?? 'UNREADABLE',
        {
          message: `the search ingest did not finish within ${searchIngestTimeoutMs()} ms (SEARCH_INGEST_TIMEOUT_MS)`,
          timeout: searchIngestTimeoutMs(),
          intervals: [5_000],
        }
      )
      .toMatch(/^(COMPLETED|ERRORED)$/);
    const task = must(await readTask(taskId), `readTask(${taskId})`).task;
    expect(
      task.status,
      `the search ingest ended ${task.status}: ${JSON.stringify(task.errors)}`
    ).toBe('COMPLETED');
    try {
      // The aliases are swapped: the answer is immediate, give it a short settle.
      await expect
        .poll(answers, {
          message: `after ingest ${attempt}, the index does not return exactly this run's fixtures`,
          timeout: 30_000,
        })
        .toEqual(expected);
      return;
    } catch (error) {
      if (attempt >= 2) throw error;
      console.info(
        "[search] the index lacks this run's fixtures after a completed ingest (overlapping ingest, server#6382): ingesting once more"
      );
    }
  }
};

/** `beforeAll` budget for `ingestAndWaitUntilFound`: two ingests and their checks. */
export const ingestBudgetMs = (): number =>
  2 * (searchIngestTimeoutMs() + 30_000);

/* ---------- global search (the header's search overlay) ---------- */

export const searchDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Platform Search' });

/** Opens the overlay from the header's Search button. */
export const openGlobalSearch = async (page: Page): Promise<Locator> => {
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Search', exact: true })
    .click();
  const dialog = searchDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

/** Types a term and presses Enter; the term becomes the one active chip. */
export const searchTerm = async (
  dialog: Locator,
  term: string
): Promise<void> => {
  const input = dialog.getByRole('textbox', { name: 'Search input' });
  await input.fill(term);
  await input.press('Enter');
  await expect(
    dialog
      .getByRole('list', { name: 'Active search terms' })
      .getByRole('listitem')
  ).toHaveText([term]);
};

/** Removes the active chip for `term`. */
export const removeTerm = async (
  dialog: Locator,
  term: string
): Promise<void> => {
  await dialog
    .getByRole('button', { name: `Remove search term: ${term}`, exact: true })
    .click();
  await expect(
    dialog.getByRole('list', { name: 'Active search terms' })
  ).toHaveCount(0);
};

/** The results pane (absent while loading, empty or without results). */
export const resultsPane = (dialog: Locator): Locator =>
  dialog.getByRole('region', { name: 'Search results', exact: true });

/** The Space card names in the Spaces section, sorted. */
export const spaceCardNames = (dialog: Locator): Locator =>
  resultsPane(dialog)
    .getByRole('region', { name: 'Spaces results', exact: true })
    .getByRole('listitem')
    .getByRole('heading', { level: 3 });

/** The post cards in the Posts section (each card is a button named by the post's title). */
export const postCards = (dialog: Locator): Locator =>
  resultsPane(dialog)
    .getByRole('region', { name: 'Posts results', exact: true })
    .getByRole('listitem');

/** The scope chip shown when the overlay is opened inside a Space. */
export const scopeChip = (dialog: Locator, option: string): Locator =>
  dialog.getByRole('button', {
    name: `Change search scope. Currently searching: ${option}`,
    exact: true,
  });

/* ---------- the Space sidebar's search widget ---------- */

export const sidebarSearchBox = (page: Page): Locator =>
  spaceSidebar(page).getByRole('searchbox', { name: 'Search posts' });

/** The widget's match summary, e.g. `1 item related to "word"`. */
export const matchSummary = (page: Page): Locator =>
  spaceSidebar(page).getByRole('status');

/**
 * A post's item on the page, keyed by its API id: the browse feed and the
 * search results both wrap each post in an element carrying the callout id,
 * already while the card is a skeleton without a role or name. This is a CSS
 * last resort, used only for presence and absence; the visible title is
 * asserted by role.
 */
export const postItem = (page: Page, calloutId: string): Locator =>
  page.locator(`[id="${calloutId}"]`);

export const postTitle = (page: Page, title: string): Locator =>
  page.getByRole('heading', { name: title, level: 3, exact: true });

export const openTab = async (page: Page, phaseName: string): Promise<void> => {
  await page.getByRole('tab', { name: phaseName, exact: true }).click();
  await expect(
    page.getByRole('tab', { name: phaseName, exact: true, selected: true })
  ).toBeVisible();
};

/** The X beside the match summary, which clears the text and the tags. */
export const clearSidebarSearch = (page: Page): Locator =>
  spaceSidebar(page).getByRole('button', {
    name: 'Clear filters',
    exact: true,
  });
