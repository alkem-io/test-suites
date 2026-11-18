// spec: client-web/src/functional-e2e/search/search-test-plan.md
// W2 journey 8 (docs/qa/server-rebuild/plan.md § W2): global search and the
// Space sidebar's per-tab search find this run's names, and only them.
//
// @local-stack: search reads Elasticsearch, which the shared test cluster does
// not run. The file rebuilds the index itself (ingestSearchFromScratch) and
// waits, up to SEARCH_INGEST_TIMEOUT_MS, until it returns exactly this run's
// fixtures.
//
// One file on purpose: both walks share one fixture and one ingest. A second
// file running its own ingest in parallel could swap in an index built before
// this file's fixtures existed.

import { expect, test } from '@playwright/test';
import { TestUserManager, UniqueIDGenerator } from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  baseUrl,
  openPersonaPage,
  spaceTitle,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  ingestAndWaitUntilFound,
  ingestBudgetMs,
  matchSummary,
  openGlobalSearch,
  openTab,
  phasesOf,
  postCards,
  postIdsFoundFor,
  postItem,
  postTitle,
  removeTerm,
  resultsPane,
  scopeChip,
  searchDialog,
  searchTerm,
  seedPost,
  seedSearchSpace,
  sidebarSearchBox,
  clearSidebarSearch,
  spaceCardNames,
  spaceIdsFoundFor,
  type Phase,
} from './search.helpers';

/**
 * Fixture (all PUBLIC, the viewer is `non.space`, a member of neither Space):
 *
 *   mine   L0 "l0-<word>-…" + L1 "l1-<word>"   this run's Space word
 *          first tab:  "J8 <postWord> first", "J8 control <uid>"
 *          last tab:   "J8 <postWord> last"
 *   other  L0 "l0-<otherWord>-…"               what another run of this file leaves behind
 *          first tab:  "J8 <postWord> elsewhere"  the same post word, in another Space
 *
 * `word` and `otherWord` come from the same generator, exactly as two runs'
 * words would: a search for one must never return the other.
 */
const uid = UniqueIDGenerator.getID();
const word = `jeight${uid}`;
const otherWord = `jeight${UniqueIDGenerator.getID()}`;
const postWord = `jpost${uid}`;
const titles = {
  first: `J8 ${postWord} first`,
  last: `J8 ${postWord} last`,
  control: `J8 control ${uid}`,
  elsewhere: `J8 ${postWord} elsewhere`,
};

let mine: OrganizationWithSpaceModel | undefined;
let other: OrganizationWithSpaceModel | undefined;
let viewer: PersonaPage | undefined;
let phases: Phase[] = [];
const ids: Record<keyof typeof titles, string> = {
  first: '',
  last: '',
  control: '',
  elsewhere: '',
};

test.describe("Search finds this run's names", { tag: '@local-stack' }, () => {
  test.beforeAll(async ({ browser }) => {
    // Seeding and sign-in, plus the whole ingest.
    test.setTimeout(150_000 + ingestBudgetMs());
    mine = await seedSearchSpace(word, true);
    other = await seedSearchSpace(otherWord, false);

    phases = await phasesOf(mine.space.id);
    const firstTab = phases[0].displayName;
    const lastTab = phases[phases.length - 1].displayName;
    const mySet = mine.space.collaboration.calloutsSetId;
    ids.first = await seedPost(mySet, titles.first, firstTab);
    ids.control = await seedPost(mySet, titles.control, firstTab);
    ids.last = await seedPost(mySet, titles.last, lastTab);
    const otherFirstTab = (await phasesOf(other.space.id))[0].displayName;
    ids.elsewhere = await seedPost(
      other.space.collaboration.calloutsSetId,
      titles.elsewhere,
      otherFirstTab
    );

    await ingestAndWaitUntilFound([
      {
        what: `Spaces for ${word}`,
        found: () => spaceIdsFoundFor(word),
        ids: [mine.space.id, mine.subspace.id],
      },
      {
        what: `Spaces for ${otherWord}`,
        found: () => spaceIdsFoundFor(otherWord),
        ids: [other.space.id],
      },
      {
        what: `posts for ${postWord}`,
        found: () => postIdsFoundFor(postWord),
        ids: [ids.first, ids.last, ids.elsewhere],
      },
    ]);

    viewer = await openPersonaPage(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
  });

  // File level teardown: runs after a failed beforeAll too, children first.
  test.afterAll(async () => {
    try {
      await viewer?.close();
    } finally {
      try {
        await teardownScenario(mine);
      } finally {
        await teardownScenario(other);
      }
    }
  });

  const myL0 = () => mine!.space.about.profile.displayName;
  const myL1 = () => mine!.subspace.about.profile.displayName;
  const otherL0 = () => other!.space.about.profile.displayName;

  test("GS-1 — global search finds this run's Space and Subspace by its word, and another run's Space only by theirs", async () => {
    const page = viewer!.page;
    await page.goto(`${baseUrl}/home`);
    const dialog = await openGlobalSearch(page);
    // Outside a Space the overlay searches the whole platform: no scope chip.
    await expect(
      dialog.getByRole('button', { name: /^Change search scope/ })
    ).toHaveCount(0);

    await searchTerm(dialog, word);
    // Exactly this run's two, by name; nothing else carries the word.
    await expect
      .poll(async () => (await spaceCardNames(dialog).allTextContents()).sort())
      .toEqual([myL0(), myL1()].sort());
    await expect(resultsPane(dialog).getByText(otherWord)).toHaveCount(0);

    // Positive control for that absence: the other run's Space IS indexed and
    // found by its own word, and this run's Spaces are not.
    await removeTerm(dialog, word);
    await searchTerm(dialog, otherWord);
    await expect
      .poll(async () => spaceCardNames(dialog).allTextContents())
      .toEqual([otherL0()]);
    await expect(resultsPane(dialog).getByText(word)).toHaveCount(0);
  });

  test("GS-2 — global search lists the posts carrying this run's word, in every Space, and not the post without it", async () => {
    const page = viewer!.page;
    await page.goto(`${baseUrl}/home`);
    const dialog = await openGlobalSearch(page);

    await searchTerm(dialog, postWord);
    const cards = postCards(dialog);
    await expect(cards).toHaveCount(3);
    for (const title of [titles.first, titles.last, titles.elsewhere]) {
      await expect(
        cards.getByRole('button', { name: title, exact: true })
      ).toBeVisible();
    }
    await expect(resultsPane(dialog).getByText(titles.control)).toHaveCount(0);
  });

  test('GS-3 — opened inside a Space, global search is scoped to it until widened to the whole platform', async () => {
    const page = viewer!.page;
    await page.goto(`${baseUrl}/${mine!.space.nameId}`);
    await expect(spaceTitle(page, myL0())).toBeVisible();
    const dialog = await openGlobalSearch(page);
    const scoped = scopeChip(dialog, myL0());
    await expect(scoped).toBeVisible();

    await searchTerm(dialog, postWord);
    const cards = postCards(dialog);
    await expect(cards).toHaveCount(2);
    await expect(
      cards.getByRole('button', { name: titles.first, exact: true })
    ).toBeVisible();
    await expect(
      cards.getByRole('button', { name: titles.last, exact: true })
    ).toBeVisible();
    await expect(
      cards.getByRole('button', { name: titles.elsewhere, exact: true })
    ).toHaveCount(0);

    await scoped.click();
    await page
      .getByRole('menuitem', { name: 'Entire platform', exact: true })
      .click();
    await expect(scopeChip(dialog, 'Entire platform')).toBeVisible();
    // Widened: the other Space's post appears, which proves it was hidden by
    // the scope and not missing from the index.
    await expect(cards).toHaveCount(3);
    await expect(
      cards.getByRole('button', { name: titles.elsewhere, exact: true })
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(searchDialog(page)).toBeHidden();
  });

  for (const [caseId, tab, hit, misses] of [
    ['SB-1', 'first', 'first', ['last', 'control', 'elsewhere']],
    ['SB-2', 'last', 'last', ['first', 'elsewhere']],
  ] as const) {
    test(`${caseId} — the sidebar search on the ${tab} tab finds only that tab's post carrying the word`, async () => {
      const page = viewer!.page;
      const phase = tab === 'first' ? phases[0] : phases[phases.length - 1];

      // The server answer the widget shows: this tab of this Space only.
      expect(
        await postIdsFoundFor(postWord, {
          spaceID: mine!.space.id,
          flowStateID: phase.id,
        })
      ).toEqual([ids[hit]]);

      await page.goto(`${baseUrl}/${mine!.space.nameId}`);
      await expect(spaceTitle(page, myL0())).toBeVisible();
      await openTab(page, phase.displayName);
      // Positive control: before searching, the tab's feed shows its posts.
      await expect(postTitle(page, titles[hit])).toBeVisible();
      if (tab === 'first')
        await expect(postItem(page, ids.control)).toHaveCount(1);

      await sidebarSearchBox(page).fill(postWord);
      await expect(matchSummary(page)).toHaveText(
        `1 item related to "${postWord}"`
      );
      await expect(postTitle(page, titles[hit])).toBeVisible();
      // Absence by item id: a skeleton has no heading, but it has the id.
      for (const miss of misses) {
        await expect(postItem(page, ids[miss])).toHaveCount(0);
      }

      // Clearing restores the browse feed.
      await clearSidebarSearch(page).click();
      await expect(matchSummary(page)).toHaveCount(0);
      if (tab === 'first')
        await expect(postItem(page, ids.control)).toHaveCount(1);
    });
  }
});
