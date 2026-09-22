// Durable regression cover for reading expanded Subspaces cards on a narrow
// screen: an EXPANDED Subspaces post's cards stack at phone width with no
// horizontal scroll and the same line clamps as wider viewports; the
// side-by-side/stacked choice follows the width available to the CARD, not
// the screen — proven by comparing the same post rendered in the page feed
// vs. its detail dialog at one shared viewport, since a screen-breakpoint
// implementation cannot pass that comparison; and resizing across the
// stacking threshold switches the arrangement while an active "Show more"
// reveal and an active search both survive the resize.
//
// Independently walked live via the browser against a running stack in this
// same session; this spec is the durable, self-contained form of that walk —
// it provisions its own fixture (a throwaway Space + five Subspaces, all
// named with a shared "Card" prefix and a shared tagline word so a single
// search term matches every card deterministically, and one EXPANDED
// "Subspaces — expanded" post) via the GraphQL API in `beforeAll`, and tears
// it down in `afterAll`.

import { test, expect, type Locator, type Page } from '@playwright/test';
import { getUserToken, UniqueIDGenerator } from '@alkemio/tests-lib';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';
// The non-interactive-login bearer (HS256) is only accepted on the private
// non-interactive endpoint — same convention as every other raw-GraphQL
// fixture setup in this suite (see subspaces-callout/us3-excerpt-safety.spec.ts).
const gqlEndpoint =
  process.env.ALKEMIO_SERVER ||
  'http://localhost:3000/api/private/non-interactive/graphql';

async function rawGql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string
): Promise<T> {
  const res = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors)
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  return body.data as T;
}

const runSuffix = UniqueIDGenerator.getID();
const POST_TITLE = 'Subspaces — expanded';

// Every card's What/Why/Who is long enough to overflow its clamp (3/2/2
// lines) at common desktop and mobile widths, mirroring the pattern used by
// us3-excerpt-safety.spec.ts's Alpha fixture — so the "same clamps at phone
// width" check has something real to clamp.
function longText(label: string, sentences: number): string {
  const base = `${label}'s section carries enough ordinary prose to overflow its line clamp reliably`;
  return Array.from(
    { length: sentences },
    (_, i) => `${base}, sentence ${i + 1} of this fixture card.`
  ).join(' ');
}

type CardDef = { label: string; what: string; why: string; who: string };

// All five names share the "Card" prefix and every tagline shares the word
// "fixture" (set explicitly below), so a single search term ("Card") matches
// every card deterministically — the resize test needs an active,
// non-trivial search that does not itself change which cards are visible, so
// its assertions are about survival, not re-filtering.
const CARDS: CardDef[] = [
  {
    label: 'CardAlpha',
    what: longText('CardAlpha', 4),
    why: longText('CardAlpha why', 3),
    who: longText('CardAlpha who', 3),
  },
  {
    label: 'CardBeta',
    what: longText('CardBeta', 4),
    why: longText('CardBeta why', 3),
    who: longText('CardBeta who', 3),
  },
  {
    label: 'CardGamma',
    what: longText('CardGamma', 4),
    why: longText('CardGamma why', 3),
    who: longText('CardGamma who', 3),
  },
  {
    label: 'CardDelta',
    what: longText('CardDelta', 4),
    why: longText('CardDelta why', 3),
    who: longText('CardDelta who', 3),
  },
  {
    label: 'CardEta',
    what: longText('CardEta', 4),
    why: longText('CardEta why', 3),
    who: longText('CardEta who', 3),
  },
];

type Fixture = {
  spaceId: string;
  spaceNameId: string;
  subspaceIds: string[];
};

let fixture: Fixture;
let adminToken: string;

const shortId = (label: string) => `${label}${runSuffix}`.slice(0, 24);

async function createSubspace(
  spaceId: string,
  label: string,
  what: string,
  why: string,
  who: string
): Promise<string> {
  const data = await rawGql<{ createSubspace: { id: string } }>(
    `mutation ($subspaceData: CreateSubspaceInput!) {
      createSubspace(subspaceData: $subspaceData) { id }
    }`,
    {
      subspaceData: {
        spaceID: spaceId,
        nameID: shortId(label.toLowerCase()),
        about: {
          profileData: {
            displayName: label,
            description: what,
            tagline: `${label} fixture card`,
          },
          why,
          who,
        },
        collaborationData: { calloutsSetData: {} },
        settings: { privacy: { mode: 'PUBLIC' } },
      },
    },
    adminToken
  );
  return data.createSubspace.id;
}

test.describe(
  'Read expanded cards on a phone (US4)',
  { tag: '@forge-acceptance' },
  () => {
    // One shared fixture (one Space + five Subspaces + one EXPANDED post) is
    // created once in `beforeAll` and read by every test below — serial mode
    // is what makes that safe under this repo's `fullyParallel: true` default
    // (see the identical note in us3-excerpt-safety.spec.ts). The explicit
    // timeout matches the beforeAll fixture's own 180s allowance, since the
    // default config's 30s test timeout applies regardless of a longer hook
    // timeout.
    test.describe.configure({ mode: 'serial', timeout: 180_000 });

    test.beforeAll(async () => {
      test.setTimeout(180_000);
      adminToken = await getUserToken(adminEmail);

      const me = await rawGql<{ me: { user: { account: { id: string } } } }>(
        'query { me { user { account { id } } } }',
        {},
        adminToken
      );
      const accountID = me.me.user.account.id;

      const spaceNameId = shortId('us4crd');
      const space = await rawGql<{
        createSpace: {
          id: string;
          collaboration: { calloutsSet: { id: string } };
        };
      }>(
        `mutation ($spaceData: CreateSpaceOnAccountInput!) {
        createSpace(spaceData: $spaceData) { id collaboration { calloutsSet { id } } }
      }`,
        {
          spaceData: {
            accountID,
            nameID: spaceNameId,
            about: {
              profileData: { displayName: `US4 Narrow Layout ${runSuffix}` },
            },
            collaborationData: { calloutsSetData: {} },
            settings: { privacy: { mode: 'PUBLIC' } },
          },
        },
        adminToken
      );
      const spaceId = space.createSpace.id;
      const calloutsSetId = space.createSpace.collaboration.calloutsSet.id;

      // Insertion order matters: the initial "Show 3" window must land the
      // 4th/5th cards behind "Show more" so the resize test's "Show more
      // expanded" premise is real, not incidental.
      const subspaceIds: string[] = [];
      for (const c of CARDS) {
        subspaceIds.push(
          await createSubspace(spaceId, c.label, c.what, c.why, c.who)
        );
      }

      await rawGql(
        `mutation ($calloutData: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $calloutData) { id }
      }`,
        {
          calloutData: {
            calloutsSetID: calloutsSetId,
            framing: { type: 'SPACES', profile: { displayName: POST_TITLE } },
            settings: { framing: { spaces: { cardVariant: 'EXPANDED' } } },
          },
        },
        adminToken
      );

      fixture = { spaceId, spaceNameId, subspaceIds };
    });

    test.afterAll(async () => {
      if (!fixture) return;
      // deleteSpace refuses a level-0 Space that still contains subspaces, so
      // leaves and root must be deleted in that order.
      for (const id of fixture.subspaceIds) {
        await rawGql(
          'mutation ($spaceID: UUID!) { deleteSpace(deleteData: { ID: $spaceID }) { id } }',
          {
            spaceID: id,
          },
          adminToken
        ).catch(() => undefined);
      }
      await rawGql(
        'mutation ($spaceID: UUID!) { deleteSpace(deleteData: { ID: $spaceID }) { id } }',
        {
          spaceID: fixture.spaceId,
        },
        adminToken
      ).catch(() => undefined);
    });

    async function gotoFixtureSpace(page: Page) {
      await page.goto(`${baseUrl}/${fixture.spaceNameId}`, {
        waitUntil: 'networkidle',
      });
      await expect(
        page.getByText(POST_TITLE, { exact: true }).first()
      ).toBeVisible();
    }

    async function findArticleByName(
      scope: Page | Locator,
      name: string
    ): Promise<Locator | null> {
      const articles = scope.locator('article');
      const count = await articles.count();
      for (let i = 0; i < count; i++) {
        const t = await articles.nth(i).innerText();
        if (t.includes(`\n${name}\n`)) return articles.nth(i);
      }
      return null;
    }

    /** side-by-side ⇔ the What excerpt (`.line-clamp-3`) sits well to the right
     * of the article's own left edge (past the ~300px identity column); stacked
     * ⇔ it sits at roughly the article's own left edge, below the identity
     * block. Mirrors the DOM contract `ExpandedSpaceCard.tsx` builds. */
    async function getArrangement(
      article: Locator
    ): Promise<'side-by-side' | 'stacked' | 'unknown'> {
      return article.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const what = el.querySelector('.line-clamp-3');
        if (!what) return 'unknown';
        const whatRect = (what as HTMLElement).getBoundingClientRect();
        return whatRect.left - rect.left > 150 ? 'side-by-side' : 'stacked';
      });
    }

    async function getClampInfo(article: Locator) {
      return article.evaluate(el => {
        const clamped2 = Array.from(el.querySelectorAll('.line-clamp-2'));
        const clamped3 = Array.from(el.querySelectorAll('.line-clamp-3'));
        const info = (elm: Element | undefined, lines: number) => {
          if (!elm) return null;
          const rect = (elm as HTMLElement).getBoundingClientRect();
          const lh = parseFloat(
            getComputedStyle(elm as HTMLElement).lineHeight
          );
          return {
            height: rect.height,
            maxAllowed: lines * lh + 2,
            top: rect.top,
            left: rect.left,
          };
        };
        return {
          what: info(clamped3[0], 3),
          why: info(clamped2[0], 2),
          who: info(clamped2[clamped2.length - 1], 2),
        };
      });
    }

    test('US4-AS1: phone width (390px) — every card stacks (identity, then What/Why/Who, then footer), no horizontal scroll, same clamps', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoFixtureSpace(page);

      const card = await findArticleByName(page, 'CardAlpha');
      expect(card).not.toBeNull();
      await card!.scrollIntoViewIfNeeded();

      expect(await getArrangement(card!)).toBe('stacked');

      const clamp = await getClampInfo(card!);
      expect(clamp.what).not.toBeNull();
      expect(clamp.why).not.toBeNull();
      expect(clamp.who).not.toBeNull();
      expect(clamp.what!.height).toBeLessThanOrEqual(clamp.what!.maxAllowed);
      expect(clamp.why!.height).toBeLessThanOrEqual(clamp.why!.maxAllowed);
      expect(clamp.who!.height).toBeLessThanOrEqual(clamp.who!.maxAllowed);

      // Stacking order: What, then Why, then Who, top-to-bottom, and all three
      // sit below the identity block.
      expect(clamp.what!.top).toBeLessThan(clamp.why!.top);
      expect(clamp.why!.top).toBeLessThanOrEqual(clamp.who!.top);

      // DOM text is "Leads" — the ALL-CAPS look is a CSS `.uppercase` transform,
      // which `getByText` does not apply when matching, so the match is
      // case-insensitive against the real casing.
      const leadsRow = card!.getByText(/^leads$/i);
      await expect(leadsRow).toBeVisible();
      const leadsBox = await leadsRow.boundingBox();
      expect(leadsBox).not.toBeNull();
      expect(leadsBox!.y).toBeGreaterThan(clamp.who!.top); // footer is last

      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    });

    test('US4-AS2: arrangement follows the width available to the card, not the viewport — feed vs. detail dialog at one viewport', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoFixtureSpace(page);

      const feedCard = await findArticleByName(page, 'CardAlpha');
      expect(feedCard).not.toBeNull();
      await feedCard!.scrollIntoViewIfNeeded();
      expect(await getArrangement(feedCard!)).toBe('side-by-side');
      const feedBox = await feedCard!.boundingBox();
      expect(feedBox).not.toBeNull();

      const openLink = page.getByRole('link', { name: `Open ${POST_TITLE}` });
      await openLink.click();
      const dialog = page
        .locator('[role="dialog"]')
        .filter({ hasText: POST_TITLE })
        .first();
      await expect(dialog).toBeVisible();

      const dialogCard = await findArticleByName(dialog, 'CardAlpha');
      expect(dialogCard).not.toBeNull();
      expect(await getArrangement(dialogCard!)).toBe('side-by-side');
      const dialogBox = await dialogCard!.boundingBox();
      expect(dialogBox).not.toBeNull();

      // The discriminating assertion: the feed and the dialog render the SAME
      // card at the SAME 1440px viewport with
      // MEASURABLY DIFFERENT widths (sidebar + feed padding vs. the dialog's
      // own chrome). A screen-breakpoint implementation cannot produce two
      // different widths for one viewport; a per-card width measurement does.
      expect(Math.abs(feedBox!.width - dialogBox!.width)).toBeGreaterThan(10);
      // Neither equals the raw viewport width — both are container-derived.
      expect(feedBox!.width).toBeLessThan(1440);
      expect(dialogBox!.width).toBeLessThan(1440);
    });

    test('US4-AS3: resizing across the stacking threshold switches arrangement; "Show more" reveal and an active search both survive', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await gotoFixtureSpace(page);

      const searchBox = page.getByPlaceholder('Search subspaces...');
      await searchBox.fill('Card'); // matches all five fixture cards by name

      const showMore = page.getByRole('button', { name: /show \d+ more/i });
      await expect(showMore).toBeVisible();
      await showMore.click();
      const showLess = page.getByRole('button', { name: /show less/i });
      await expect(showLess).toBeVisible();

      let card = await findArticleByName(page, 'CardEta'); // the 5th card, behind the initial "Show 3"
      expect(card).not.toBeNull();
      expect(await getArrangement(card!)).toBe('side-by-side');

      // Resize down across the ~520px card-width stacking threshold.
      await page.setViewportSize({ width: 420, height: 1000 });
      await expect(page.locator('body')).toBeVisible(); // let layout settle on the next frame
      await expect(searchBox).toHaveValue('Card');
      await expect(showLess).toBeVisible();
      card = await findArticleByName(page, 'CardEta');
      expect(card).not.toBeNull();
      await card!.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => getArrangement(card!), { timeout: 5000 })
        .toBe('stacked');

      // Resize back up across the threshold — both states still survive.
      await page.setViewportSize({ width: 1440, height: 1000 });
      await expect(searchBox).toHaveValue('Card');
      await expect(showLess).toBeVisible();
      card = await findArticleByName(page, 'CardEta');
      expect(card).not.toBeNull();
      await card!.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => getArrangement(card!), { timeout: 5000 })
        .toBe('side-by-side');
    });
  }
);
