// User Story 1 — Recognise a contributor from the card (P1)
// workspace#077-richer-contributor-cards · client-web#10316
//
// Spec: agents-hq/specs/077-richer-contributor-cards/spec.md US1-AS1..AS8,
// FR-001..FR-009, FR-014, FR-015, FR-034 (FR-003/FR-004 as amended
// 2026-09-28: one row of pills with a "+N" chip; tag lists merged).
// Contract: contracts/crd-contributor-card.md §4–§6.
//
// Self-seeded: one PUBLIC scenario space with its own throwaway users,
// organizations and virtual contributors, viewed anonymously (the spec's
// "any viewer"; anonymous visitors of a public space see enriched cards).
// Expected tag lists come from the API, which the API spec pins against the
// amended FR-004; this file proves the card renders them.

import { expect, test, type Page } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  ApiCard,
  CardsFixture,
  adminGql,
  apiCards,
  createContributorsCalloutViaApi,
  setSpacePrivacy,
} from './cards-fixture';
import {
  BAD_CARD_TEXT,
  ContributorsCalloutPage,
  cardRowSignature,
  contributorCardsIn,
  type ContributorCards,
  type ContributorType,
} from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const uid = UniqueIDGenerator.getID();
const TITLE = `US1 Cards ${uid}`;
const N = (label: string) => `US1 ${label} ${uid}`;

/** The server caps a tagline at 128 characters (RQ-04): the boundary value. */
const TAGLINE_128 =
  'A long tagline that has to stop at two lines on the card, cut with a mark. '
    .repeat(2)
    .slice(0, 128);
/** One unbroken 69-character tag: wider than any card. */
const LONG_TAG =
  'Supercalifragilisticexpialidocious-interdisciplinary-transformation-x';

const P = {
  long: N('Ada Long'),
  merged: N('Ben Merged'),
  keywordsOnly: N('Cleo Keywords'),
  empty: N('Cy Empty'),
  orgMany: N('Org Many'),
  orgOne: N('Org One'),
  orgZero: N('Org Zero'),
  orgCapable: N('Org Capable'),
  helperVc: N('Helper VC'),
  quietVc: N('Quiet VC'),
};

const scenarioConfig: TestScenarioConfig = {
  name: `us1-cards-${uid}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [
      { profileDisplayName: P.helperVc },
      { profileDisplayName: P.quietVc },
    ],
  },
};

let baseScenario: OrganizationWithSpaceModel;
const fixture = new CardsFixture(uid);
let calloutId = '';
/** API oracle, by display name. */
const api: Record<string, ApiCard> = {};

test.use({ timezoneId: 'UTC', locale: 'en-US' });

async function openCollection(page: Page, title = TITLE) {
  const cc = new ContributorsCalloutPage(page, baseUrl);
  await cc.navigateToSpace(baseScenario.space.nameId);
  const col = cc.collection(title);
  await expect(col.region).toBeVisible({ timeout: 30_000 });
  await expect(col.cardItems.first()).toBeVisible({ timeout: 15_000 });
  return col;
}

async function showSegment(
  col: Awaited<ReturnType<typeof openCollection>>,
  type: ContributorType
) {
  await col.switchType(type);
  await expect(col.cardItems.first()).toBeVisible();
}

/** Every tag a card exposes: the visible pills, then the "+N" chip's popover. */
async function allTagsShown(page: Page, cards: ContributorCards, name: string) {
  const visible = await cards.tagPillsOf(name).allInnerTexts();
  const hidden = await cards.hiddenTagCount(name);
  if (hidden === 0) return { visible, hidden: [] as string[] };
  const chip = cards.moreChipOf(name);
  await chip.click();
  const popover = page
    .locator('[data-radix-popper-content-wrapper]')
    .getByRole('dialog');
  await expect(popover).toBeVisible();
  const hiddenTags = (await popover.innerText())
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean);
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  expect(hiddenTags).toHaveLength(hidden);
  return { visible, hidden: hiddenTags };
}

test.describe.serial('US1 — Recognise a contributor from the card', () => {
  test.beforeAll(async () => {
    test.setTimeout(300_000);
    await TestUserManager.populateUserModelMap();
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setSpacePrivacy(baseScenario.space.id, { mode: 'PUBLIC' });
    const roleSet = baseScenario.space.community.roleSetId;
    const adminId = TestUserManager.users.globalAdmin.id;
    calloutId = await createContributorsCalloutViaApi(
      baseScenario.space.collaboration.calloutsSetId,
      TITLE
    );

    await fixture.user(P.long, roleSet, {
      tagline: TAGLINE_128,
      tags: {
        skills: [LONG_TAG, 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'],
      },
      location: { city: 'Barcelona', country: 'ES' },
    });
    await fixture.user(P.merged, roleSet, {
      tagline: 'Urban planner.',
      tags: {
        skills: ['Urban Planning', 'Sustainability'],
        keywords: [
          'sustainability',
          ' ',
          'Mobility',
          'URBAN PLANNING',
          'Water',
          'Energy',
        ],
      },
    });
    await fixture.user(P.keywordsOnly, roleSet, {
      tags: { skills: [], keywords: ['Policy', 'Energy'] },
    });
    await fixture.user(P.empty, roleSet);

    await fixture.organization(
      P.orgMany,
      `us1many${uid}`,
      roleSet,
      {
        associates: 3,
        seed: {
          tagline: 'Renewable energy for every neighbourhood.',
          tags: {
            keywords: ['Renewable Energy', 'Grid'],
            capabilities: ['grid', 'Funding'],
          },
          location: { city: 'Rotterdam', country: 'NL' },
        },
      },
      adminId
    );
    await fixture.organization(
      P.orgOne,
      `us1one${uid}`,
      roleSet,
      {
        associates: 1,
        seed: { tagline: 'A one-person organization.' },
      },
      adminId
    );
    await fixture.organization(
      P.orgZero,
      `us1zero${uid}`,
      roleSet,
      { associates: 0 },
      adminId
    );
    await fixture.organization(
      P.orgCapable,
      `us1cap${uid}`,
      roleSet,
      {
        associates: 0,
        seed: { tags: { keywords: [], capabilities: ['Funding'] } },
      },
      adminId
    );

    const [helper, quiet] = baseScenario.virtualContributors!;
    await fixture.virtualContributorMember(helper.id, roleSet, {
      tagline: 'Answers questions about this space.',
      tags: { keywords: ['Assistant', 'Research'] },
    });
    await fixture.virtualContributorMember(quiet.id, roleSet);

    for (const type of [
      'USER',
      'ORGANIZATION',
      'VIRTUAL_CONTRIBUTOR',
    ] as const) {
      for (const card of await apiCards(calloutId, type))
        api[card.displayName] = card;
    }
    // The fixture really is what the cards below claim to show.
    expect(api[P.merged].tags).toEqual([
      'Urban Planning',
      'Sustainability',
      'Mobility',
      'Water',
      'Energy',
    ]);
    expect(api[P.long].tags).toHaveLength(6);
    expect(api[P.orgZero].associatesCount).toBe(0);
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    try {
      await fixture.cleanUp();
    } finally {
      if (baseScenario)
        await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  test('US1-AS1 — a long tagline stops at two lines with a mark; one row of pills ends in "+N" counting the rest; one location row', async ({
    page,
  }) => {
    const col = await openCollection(page);
    const tagline = col.taglineOf(P.long);
    await expect(tagline).toHaveText(TAGLINE_128);
    const clamp = await tagline.evaluate(el => {
      const cs = getComputedStyle(el);
      return {
        lines: cs.getPropertyValue('-webkit-line-clamp'),
        lineHeight: parseFloat(cs.lineHeight),
        height: el.clientHeight,
        truncated: el.scrollHeight > el.clientHeight + 1,
      };
    });
    expect(clamp.lines).toBe('2');
    expect(clamp.truncated).toBe(true);
    expect(clamp.height).toBeLessThanOrEqual(clamp.lineHeight * 2 + 2);

    const visible = await col.tagPillsOf(P.long).allInnerTexts();
    const hidden = await col.hiddenTagCount(P.long);
    expect(hidden).toBeGreaterThan(0);
    expect(visible.length + hidden).toBe(api[P.long].tags!.length);
    expect(visible).toEqual(api[P.long].tags!.slice(0, visible.length));

    await expect(col.locationOf(P.long)).toHaveText('Barcelona, ES');
  });

  test('US1-AS2 — an empty user shows the italic fallback and no tag or location row; an empty organization and VC show no text row', async ({
    page,
  }) => {
    const col = await openCollection(page);
    const fallback = col.taglineOf(P.empty);
    await expect(fallback).toHaveText('User has not filled in their tagline.');
    await expect(fallback).toHaveCSS('font-style', 'italic');
    await expect(col.cardFor(P.empty)).toBeVisible();
    await expect(col.tagListOf(P.empty)).toHaveCount(0);
    await expect(col.locationOf(P.empty)).toHaveCount(0);

    await showSegment(col, 'Organizations');
    await expect(col.cardFor(P.orgZero)).toBeVisible();
    await expect(col.taglineOf(P.orgZero)).toHaveCount(0);
    await expect(col.cardFor(P.orgZero)).not.toContainText(
      'User has not filled in'
    );

    await showSegment(col, 'Virtual Contributors');
    await expect(col.cardFor(P.quietVc)).toBeVisible();
    await expect(col.taglineOf(P.quietVc)).toHaveCount(0);
    await expect(col.cardFor(P.quietVc)).not.toContainText(
      'User has not filled in'
    );
  });

  test('US1-AS3 — the card shows the merged, deduplicated tag list in order: skills then keywords for people, keywords then capabilities for organizations', async ({
    page,
  }) => {
    const col = await openCollection(page);
    const merged = await allTagsShown(page, col, P.merged);
    expect([...merged.visible, ...merged.hidden]).toEqual(api[P.merged].tags);
    const keywordsOnly = await allTagsShown(page, col, P.keywordsOnly);
    expect([...keywordsOnly.visible, ...keywordsOnly.hidden]).toEqual([
      'Policy',
      'Energy',
    ]);

    await showSegment(col, 'Organizations');
    const capable = await allTagsShown(page, col, P.orgCapable);
    expect([...capable.visible, ...capable.hidden]).toEqual(['Funding']);
    const many = await allTagsShown(page, col, P.orgMany);
    expect([...many.visible, ...many.hidden]).toEqual([
      'Renewable Energy',
      'Grid',
      'Funding',
    ]);
  });

  test('US1-AS4 — organizations read "N associates in this organization" with singular and zero forms, plus their tagline, tags and location', async ({
    page,
  }) => {
    const col = await openCollection(page);
    await showSegment(col, 'Organizations');
    await expect(col.bottomLineOf(P.orgMany)).toHaveText(
      '3 associates in this organization'
    );
    await expect(col.bottomLineOf(P.orgOne)).toHaveText(
      '1 associate in this organization'
    );
    await expect(col.bottomLineOf(P.orgZero)).toHaveText(
      '0 associates in this organization'
    );
    await expect(col.taglineOf(P.orgMany)).toHaveText(api[P.orgMany].tagline!);
    await expect(col.tagPillsOf(P.orgMany).first()).toHaveText(
      'Renewable Energy'
    );
    await expect(col.locationOf(P.orgMany)).toHaveText('Rotterdam, NL');
    // The number on the card is the API's platform-wide count (FR-009/FR-030,
    // pinned against the organization metric in the API spec).
    expect(api[P.orgMany].associatesCount).toBe(3);
  });

  test('US1-AS5 — a virtual contributor shows its tagline and tags, no location row and no bottom line', async ({
    page,
  }) => {
    const col = await openCollection(page);
    await showSegment(col, 'Virtual Contributors');
    await expect(col.taglineOf(P.helperVc)).toHaveText(
      'Answers questions about this space.'
    );
    await expect(col.tagPillsOf(P.helperVc)).toHaveText([
      'Assistant',
      'Research',
    ]);
    await expect(col.cardFor(P.helperVc)).toBeVisible();
    await expect(col.locationOf(P.helperVc)).toHaveCount(0);
    await expect(col.bottomLineOf(P.helperVc)).toHaveCount(0);
  });

  test('FR-034 — no card in any segment shows "undefined", "null", "Invalid Date" or "NaN"', async ({
    page,
  }) => {
    const col = await openCollection(page);
    for (const type of [
      'People',
      'Organizations',
      'Virtual Contributors',
    ] as const) {
      await showSegment(col, type);
      const texts = await col.cardItems.allInnerTexts();
      expect(texts.length, type).toBeGreaterThan(1);
      expect(
        texts.filter(t => BAD_CARD_TEXT.test(t)),
        type
      ).toEqual([]);
    }
  });

  test('US1-AS6 — cards in each segment share one height and one bottom-line offset at 1440, 768 and 390 px; the page never scrolls sideways', async ({
    page,
  }) => {
    const col = await openCollection(page);
    for (const type of [
      'People',
      'Organizations',
      'Virtual Contributors',
    ] as const) {
      await showSegment(col, type);
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect
          .poll(
            async () => {
              const boxes = await col.cardItems.evaluateAll(items =>
                items.map(li => li.getBoundingClientRect().height)
              );
              return Math.max(...boxes) - Math.min(...boxes);
            },
            { message: `${type} @${width}px card height spread` }
          )
          .toBeLessThanOrEqual(1);
        const gaps: number[] = [];
        for (const item of await col.cardItems.all()) {
          const bottom = item.getByText(
            /^(Joined this space .+|\d+ associates? in this organization)$/
          );
          if ((await bottom.count()) === 1) {
            const [card, line] = [
              await item.boundingBox(),
              await bottom.boundingBox(),
            ];
            gaps.push(card!.y + card!.height - (line!.y + line!.height));
          }
        }
        if (type !== 'Virtual Contributors') {
          expect(
            gaps.length,
            `${type} @${width}px bottom lines`
          ).toBeGreaterThan(1);
          expect(
            Math.max(...gaps) - Math.min(...gaps),
            `${type} @${width}px bottom-line offset`
          ).toBeLessThanOrEqual(1);
        }
        const [scrollWidth, clientWidth] = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.clientWidth,
        ]);
        expect(scrollWidth, `${type} @${width}px`).toBeLessThanOrEqual(
          clientWidth
        );
      }
    }
  });

  test('US1-AS7 — at 1440 and 390 px the tagline stays at two lines and the over-long first tag is cut inside the card with a full-text tooltip', async ({
    page,
  }) => {
    const col = await openCollection(page);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const tagline = col.taglineOf(P.long);
      const lines = await tagline.evaluate(
        el => el.clientHeight / parseFloat(getComputedStyle(el).lineHeight)
      );
      expect(lines, `@${width}px`).toBeLessThanOrEqual(2.1);

      const pill = col.tagPillsOf(P.long).first();
      await expect(pill).toHaveText(LONG_TAG);
      const cut = await pill
        .locator('span')
        .first()
        .evaluate(el => el.scrollWidth > el.clientWidth);
      expect(cut, `@${width}px first pill is cut`).toBe(true);
      const [card, pillBox] = [
        await col.cardFor(P.long).boundingBox(),
        await pill.boundingBox(),
      ];
      expect(
        pillBox!.x + pillBox!.width,
        `@${width}px pill inside card`
      ).toBeLessThanOrEqual(card!.x + card!.width);

      // The Radix tooltip trigger is the pill's inner badge span.
      await pill.locator('span').first().hover();
      await expect(page.getByRole('tooltip'), `@${width}px tooltip`).toHaveText(
        LONG_TAG
      );
      // Dismiss it so the next width cannot pass on a stale tooltip.
      await page.keyboard.press('Escape');
      await expect(page.getByRole('tooltip')).toHaveCount(0);

      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth, `@${width}px`).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('US1-AS8 / FR-015 — the detail dialog and the map\'s "No location data" list carry the same rows and controls as the feed', async ({
    page,
  }) => {
    const col = await openCollection(page);
    const people = [P.long, P.merged, P.keywordsOnly, P.empty];
    const feed: Record<
      string,
      Awaited<ReturnType<typeof cardRowSignature>>
    > = {};
    for (const name of people) feed[name] = await cardRowSignature(col, name);

    await page
      .getByRole('link', { name: `Open ${TITLE}` })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const dialogRegion = dialog.getByRole('region', {
      name: 'Contributors',
      exact: true,
    });
    const inDialog = contributorCardsIn(dialogRegion);
    await expect(inDialog.cardItems.first()).toBeVisible();
    for (const name of people) {
      expect(await cardRowSignature(inDialog, name), `dialog: ${name}`).toEqual(
        feed[name]
      );
    }

    await dialogRegion
      .getByRole('button', { name: 'Map', exact: true })
      .click();
    await expect(
      dialog.getByRole('heading', { name: 'No location data' })
    ).toBeVisible({ timeout: 15_000 });
    const inMapList = contributorCardsIn(dialogRegion);
    // Users with no location at all are always listed under the map.
    for (const name of [P.merged, P.keywordsOnly, P.empty]) {
      await expect(inMapList.cardFor(name), `map list: ${name}`).toBeVisible();
      expect(
        await cardRowSignature(inMapList, name),
        `map list: ${name}`
      ).toEqual(feed[name]);
    }
  });
  test('FR-015 — the callout deep link opens the dialog with the same rows as the feed', async ({
    page,
  }) => {
    const col = await openCollection(page);
    const feed = await cardRowSignature(col, P.long);
    const { lookup } = await adminGql<{
      lookup: { callout: { framing: { profile: { url: string } } } };
    }>(
      'query($id: UUID!) { lookup { callout(ID: $id) { framing { profile { url } } } } }',
      {
        id: calloutId,
      }
    );
    await page.goto(lookup.callout.framing.profile.url);
    const dialogRegion = page
      .getByRole('dialog')
      .getByRole('region', { name: 'Contributors', exact: true });
    const inDeepLink = contributorCardsIn(dialogRegion);
    await expect(inDeepLink.cardFor(P.long)).toBeVisible({ timeout: 30_000 });
    expect(await cardRowSignature(inDeepLink, P.long)).toEqual(feed);
  });

  test("FR-015 — map pins and their popups are unchanged: a located contributor's popup shows its name, none of the card rows", async ({
    page,
  }) => {
    const col = await openCollection(page);
    await col.viewToggle('Map').click();
    await expect(col.mapRegion()).toBeVisible({ timeout: 15_000 });
    // Precondition: the stack geocodes "Barcelona, ES" into a pin. Without a
    // geocoder this fails here, by name, rather than passing on an empty map.
    const pin = col.region.getByRole('button', { name: P.long, exact: true });
    await expect(pin, 'no map pin for the located contributor').toBeVisible({
      timeout: 15_000,
    });
    await pin.click();
    const popup = page.locator('.maplibregl-popup');
    await expect(popup).toContainText(P.long);
    await expect(popup).not.toContainText(TAGLINE_128.slice(0, 30));
    await expect(popup).not.toContainText(LONG_TAG);
    await expect(popup).not.toContainText('Joined this space');
  });

  // Product finding QA-PF-03 — https://github.com/alkem-io/client-web/issues/10370
  // The shared CollapsibleTagList always keeps at least one tag
  // (`setVisibleCount(Math.max(1, best))`), so when the first tag alone fills
  // the row the "+N" chip wraps onto a second line. Kept last so a red here
  // skips nothing else in this serial block.
  // Skipped by decision of the QA lead (2026-10-05) until that issue ships; the assertions below
  // are the acceptance oracle for the fix and must not be softened. Un-skip, do not delete.
  test.skip('US1-AS7 / FR-003 — the tag row never wraps to a second line: overflow goes into the "+N" chip (1440 and 390 px)', async ({
    page,
  }) => {
    const col = await openCollection(page);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const pill = col.tagPillsOf(P.long).first();
      await expect(pill).toHaveText(LONG_TAG);
      const [pillBox, chipBox, row] = [
        await pill.boundingBox(),
        await col.moreChipOf(P.long).boundingBox(),
        await col.tagListOf(P.long).boundingBox(),
      ];
      expect(
        chipBox!.y,
        `@${width}px "+N" chip on the first row`
      ).toBeLessThanOrEqual(pillBox!.y + 2);
      expect(row!.height, `@${width}px one tag row`).toBeLessThanOrEqual(
        pillBox!.height + 2
      );
    }
  });
});
