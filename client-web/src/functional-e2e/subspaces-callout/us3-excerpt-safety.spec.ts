// Durable regression cover for the guarantee that subspace-authored content
// cannot break the host page: hostile subspace-authored content (embedded
// image + iframe, fixed-position full-screen HTML, heading/list/quote/
// link/table markdown, a 500-char unbroken token) rendered inside an
// EXPANDED Subspaces post's card excerpt must never reach the host page — no
// media request, no author styling, no heading/bullet/table structure, no
// clickable link, no horizontal scroll — and the excerpt clamp (What <=3
// lines, Why/Who <=2 lines) must hold even at the platform's maximum
// accepted field length while the list stays responsive to search.
//
// Independently walked live via the browser + GraphQL API against a running
// stack in this same session; this spec is the durable, self-contained form
// of that walk — it provisions its own fixture (a throwaway "Cards Space" +
// Alpha/Beta/Delta/Zeta/Eta subspaces and an EXPANDED "Subspaces — expanded"
// post) via the GraphQL API in `beforeAll`, exactly as the manual walk did,
// and tears it down in `afterAll`.

import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  findArticleByName,
  gotoSpaceAndWaitForCards,
  deleteFixtureTree,
  newFixtureTree,
} from './subspaces-callout.helpers';
import { getUserToken, UniqueIDGenerator } from '@alkemio/tests-lib';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';
// The non-interactive-login bearer (HS256) is only accepted on the private
// non-interactive endpoint — same convention as every other raw-GraphQL
// fixture setup in this suite (see organization-space-invitations specs).
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

// ─── Fixture content — Eta sits at the platform's save-time limits
// (`HUGE_TEXT_LENGTH` for About.description, `VERY_LONG_TEXT_LENGTH` for
// Why/Who — server/src/common/constants/entity.field.length.constants.ts). ───

const LONG_TOKEN = 'a'.repeat(500);

const DELTA_WHAT = [
  '<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background-color:red">PWNED</div>',
  '',
  'This sentence should still be visible in the excerpt after the hostile HTML block is neutralized.',
].join('\n');

const DELTA_WHY = [
  '![probe image](http://localhost:3000/__076_probe__.png)',
  '',
  '<iframe src="http://localhost:3000/__076_probe_embed__"></iframe>',
  '',
  'This sentence follows an embedded image and an iframe embed, both of which must never be requested by the browser.',
].join('\n');

const DELTA_WHO = [
  '# Huge heading',
  '',
  '- First bullet item',
  '- Second bullet item',
  '- Third bullet item',
  '',
  '> A block quote of hostile provenance',
  '',
  'Visit [Example Link](https://example.org) for more.',
  '',
  '| Col A | Col B |',
  '|-------|-------|',
  '| one   | two   |',
  '| three | four  |',
  '',
  LONG_TOKEN,
].join('\n');

const ZETA_WHAT =
  'Zeta is a subspace with a filled What section describing its purpose in a couple of sentences, enough to show a proper excerpt in the expanded card.';
const ZETA_WHY =
  '![zeta probe image](http://localhost:3000/__076_probe_zeta__.png)';
const ZETA_WHO = '<div>only html</div>';

const ALPHA_WHAT =
  'Alpha is the fully-filled reference subspace for this fixture. Its What section carries several lines of ordinary prose so the excerpt clamp is exercised at its full three lines, giving a stable baseline to compare against other cards in the list. The text keeps going a little further to be sure it overflows any three-line clamp at common card widths, describing goals, scope and a short roadmap for this space.';
const ALPHA_WHY =
  "Alpha's Why section explains the motivation behind this subspace in a few sentences, long enough to overflow the two-line clamp reliably across common desktop and mobile card widths used in this walkthrough.";
const ALPHA_WHO =
  "Alpha's Who section lists the people and organisations behind this subspace, along with a short description of their roles, long enough on its own to overflow the two-line clamp used for this excerpt.";

const BETA_WHAT =
  'Beta has only a What section filled, two lines of plain prose describing a small workstream for this fixture.';

/** Deterministic ordinary prose of an exact character length, with markdown
 * emphasis every few words — the max-length boundary fixture is about
 * LENGTH, not structure, so a plain repeating word list is representative
 * and keeps the file self-contained. */
function makeText(targetLen: number): string {
  const words = [
    'alkemio',
    'subspace',
    'collaboration',
    'platform',
    'innovation',
    'community',
    'ecosystem',
    'impact',
    'design',
    'research',
    'forum',
    'value',
    'insight',
    'network',
    'project',
    'launch',
    'review',
    'summary',
    'context',
    'detail',
    'vision',
    'mission',
    'delivery',
    'scope',
    'growth',
    'pattern',
    'system',
    'module',
    'service',
    'feature',
  ];
  const parts: string[] = [];
  let length = 0;
  let i = 0;
  while (length < targetLen) {
    let w = words[i % words.length];
    if (i % 5 === 0) w = `**${w}**`;
    parts.push(w);
    length += w.length + 1;
    i++;
  }
  let text = parts.join(' ');
  if (text.length > targetLen) text = text.slice(0, targetLen);
  else if (text.length < targetLen)
    text = text + 'x'.repeat(targetLen - text.length);
  return text;
}

const ETA_WHAT = makeText(65568);
const ETA_WHY = makeText(32784);
const ETA_WHO = makeText(32784);

/** Regression case: 16,000 '*' + 'x' + 16,000 '*' — 32,001 chars of nested
 * inline emphasis, inside the Why save-time limit. Before
 * `clampExcerptSource` bounded the excerpt parser's input by length (not
 * just nesting depth), this froze the host page for ~15s and then threw a
 * RangeError that unmounted the whole app. Bounded to the first 2,000
 * chars, this parses as a `thematicBreak` (a bare run of `*` on its own
 * line) — a node with no visible text — so `hasVisibleExcerptText`
 * correctly reports it empty and the Why section (and its label) is
 * omitted as an empty field would be, never crashing. */
const THETA_WHY = '*'.repeat(16000) + 'x' + '*'.repeat(16000);

type Fixture = {
  spaceId: string;
  spaceNameId: string;
  calloutId: string;
  subspaceIds: string[];
};

let fixture: Fixture;
// Everything created on the stack, recorded the moment it exists, so a
// `beforeAll` that fails halfway still leaves a complete deletion list.
const tree = newFixtureTree();
let adminToken: string;

const shortId = (label: string) => `${label}${runSuffix}`.slice(0, 24);

async function createSubspace(
  spaceId: string,
  label: string,
  displayName: string,
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
        nameID: shortId(label),
        about: { profileData: { displayName, description: what }, why, who },
        collaborationData: { calloutsSetData: {} },
        settings: { privacy: { mode: 'PUBLIC' } },
      },
    },
    adminToken
  );
  tree.subspaceIds.push(data.createSubspace.id);
  return data.createSubspace.id;
}

test.describe(
  'Subspace content cannot break the host page (US3)',
  { tag: '@forge-acceptance' },
  () => {
    // One shared fixture (one Space + five Subspaces + one EXPANDED post) is
    // created once in `beforeAll` and read by every test below. Under this
    // repo's `fullyParallel: true` default, an un-serialized describe block can
    // have `beforeAll` re-invoked once per test rather than once per file (see
    // the identical fix in organization-space-invitations/us3-org-accepts-declines.spec.ts) —
    // serial mode is what makes "one fixture, seven read-only tests" safe. The
    // explicit timeout matches the beforeAll fixture's own 180s allowance,
    // since the default config's 30s test timeout applies regardless of a
    // longer hook timeout.
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

      const spaceNameId = shortId(`us3crd${runSuffix}`);
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
              profileData: { displayName: `US3 Excerpt Safety ${runSuffix}` },
            },
            collaborationData: { calloutsSetData: {} },
            settings: { privacy: { mode: 'PUBLIC' } },
          },
        },
        adminToken
      );
      const spaceId = space.createSpace.id;
      tree.spaceId = spaceId;
      const calloutsSetId = space.createSpace.collaboration.calloutsSet.id;

      // Alphabetical order matters: the initial "Show 3" window must land Eta,
      // Theta and Zeta behind "Show more" so the max-length test's "activates Show
      // more" premise is real, not incidental (Alpha, Beta, Delta, Eta, Theta, Zeta).
      const subspaceIds = [
        await createSubspace(
          spaceId,
          'a',
          'Alpha',
          ALPHA_WHAT,
          ALPHA_WHY,
          ALPHA_WHO
        ),
        await createSubspace(spaceId, 'b', 'Beta', BETA_WHAT, '', ''),
        await createSubspace(
          spaceId,
          'd',
          'Delta',
          DELTA_WHAT,
          DELTA_WHY,
          DELTA_WHO
        ),
        await createSubspace(spaceId, 'e', 'Eta', ETA_WHAT, ETA_WHY, ETA_WHO),
        await createSubspace(
          spaceId,
          't',
          'Theta',
          'Theta has a What section so the card is not all-empty.',
          THETA_WHY,
          ''
        ),
        await createSubspace(
          spaceId,
          'z',
          'Zeta',
          ZETA_WHAT,
          ZETA_WHY,
          ZETA_WHO
        ),
      ];

      const callout = await rawGql<{
        createCalloutOnCalloutsSet: { id: string };
      }>(
        `mutation ($calloutData: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $calloutData) { id }
      }`,
        {
          calloutData: {
            calloutsSetID: calloutsSetId,
            framing: {
              type: 'SPACES',
              profile: { displayName: 'Subspaces — expanded' },
            },
            settings: { framing: { spaces: { cardVariant: 'EXPANDED' } } },
          },
        },
        adminToken
      );

      fixture = {
        spaceId,
        spaceNameId,
        calloutId: callout.createCalloutOnCalloutsSet.id,
        subspaceIds,
      };
    });

    test.afterAll(async () => {
      // Leaves then root (deleteSpace refuses a level-0 Space that still
      // contains subspaces), and every failure is reported rather than
      // swallowed: a public fixture tree left behind on the shared stack is
      // a defect of this file, not noise.
      await deleteFixtureTree(tree, id =>
        rawGql(
          'mutation ($spaceID: UUID!) { deleteSpace(deleteData: { ID: $spaceID }) { id } }',
          { spaceID: id },
          adminToken
        )
      );
    });

    async function gotoFixtureSpace(page: Page) {
      await gotoSpaceAndWaitForCards(page, `${baseUrl}/${fixture.spaceNameId}`);
    }

    /** Reads the three excerpt bodies (by section test id) plus the safety-relevant DOM
     * facts `ExpandedSpaceCard`/`InlineMarkdown` (card-safe mode) are meant to
     * guarantee — see client-web src/crd/components/space/ExpandedSpaceCard.tsx
     * and src/crd/components/common/InlineMarkdown.tsx. */
    async function readCardSafety(article: Locator) {
      return article.evaluate(el => {
        const imgs = Array.from(el.querySelectorAll('img')).map(
          i => (i as HTMLImageElement).src
        );
        const iframes = el.querySelectorAll('iframe').length;
        const anchors = Array.from(el.querySelectorAll('a')).map(a => ({
          text: a.textContent,
          href: a.getAttribute('href'),
          ariaLabel: a.getAttribute('aria-label'),
        }));
        const fixedEls = Array.from(el.querySelectorAll('*')).filter(
          n => getComputedStyle(n).position === 'fixed'
        ).length;

        // Address each excerpt by its section, never by clamp class alone: the
        // identity block's tagline is a `.line-clamp-2` that precedes the panel.
        const body = (selector: string) =>
          (el.querySelector(
            `${selector} [class*="line-clamp"]`
          ) as HTMLElement | null) ?? undefined;
        const whatEl = body('[data-testid="excerpt-what"]');
        const whyEl = body('[data-testid="excerpt-why"]');
        const whoEl = body('[data-testid="excerpt-who"]');

        const sectionInfo = (
          elm: HTMLElement | undefined,
          expectedLines: number
        ) => {
          if (!elm) return null;
          const rect = elm.getBoundingClientRect();
          const lh = parseFloat(getComputedStyle(elm).lineHeight);
          return {
            height: rect.height,
            lineHeight: lh,
            maxAllowed: expectedLines * lh + 2,
            scrollWidth: elm.scrollWidth,
            clientWidth: elm.clientWidth,
          };
        };

        const h1 = el.querySelector('h1');
        const table = el.querySelector('table');
        const ul = el.querySelector('ul');

        return {
          imgs,
          iframes,
          anchors,
          fixedEls,
          text: el.textContent,
          what: sectionInfo(whatEl, 3),
          why: sectionInfo(whyEl, 2),
          who: sectionInfo(whoEl, 2),
          h1FontSize: h1 ? getComputedStyle(h1).fontSize : null,
          whoExcerptFontSize: whoEl ? getComputedStyle(whoEl).fontSize : null,
          tableDisplay: table ? getComputedStyle(table).display : null,
          ulDisplay: ul ? getComputedStyle(ul).display : null,
        };
      });
    }

    test('US3-AS1: embedded image + iframe embed never render or fetch; surrounding text still shows', async ({
      page,
    }) => {
      const probeRequests: string[] = [];
      page.on('request', req => {
        if (req.url().includes('__076_probe')) probeRequests.push(req.url());
      });

      await gotoFixtureSpace(page);
      const delta = await findArticleByName(page, 'Delta');
      await delta.scrollIntoViewIfNeeded();

      const safety = await readCardSafety(delta);
      expect(safety.imgs.some(src => src.includes('__076_probe'))).toBe(false);
      expect(safety.iframes).toBe(0);
      expect(safety.text).toContain(
        'This sentence follows an embedded image and an iframe embed, both of which must never be requested by the browser.'
      );
      // Requests are async relative to render — give the network a moment, then
      // assert the negative for real (not "none yet").
      await page.waitForTimeout(1000);
      expect(probeRequests).toEqual([]);
    });

    test('US3-AS2: fixed-position hostile HTML is not interpreted; no overlay; page stays clickable', async ({
      page,
    }) => {
      await gotoFixtureSpace(page);
      const delta = await findArticleByName(page, 'Delta');
      await delta.scrollIntoViewIfNeeded();

      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toContain('PWNED');

      const safety = await readCardSafety(delta);
      expect(safety.fixedEls).toBe(0);
      expect(safety.text).toContain(
        'This sentence should still be visible in the excerpt after the hostile HTML block is neutralized.'
      );

      // Page stays clickable — no overlay intercepting pointer events anywhere.
      await expect(
        page.getByRole('link', { name: 'Alpha' }).first()
      ).toBeVisible();
      await page.mouse.click(5, 5);
    });

    test('US3-AS3: Who excerpt is one compact run — no heading size, no bullets, no table, within the 2-line clamp', async ({
      page,
    }) => {
      await gotoFixtureSpace(page);
      const delta = await findArticleByName(page, 'Delta');
      await delta.scrollIntoViewIfNeeded();

      const safety = await readCardSafety(delta);
      expect(safety.who).not.toBeNull();
      expect(safety.who!.height).toBeLessThanOrEqual(safety.who!.maxAllowed);
      expect(safety.h1FontSize).toBe(safety.whoExcerptFontSize); // heading not heading-sized
      expect(safety.text).not.toMatch(/[•◦]/); // no bullet glyphs
      expect(safety.tableDisplay).not.toBe('table');
      expect(safety.ulDisplay).not.toBe('block');
    });

    test('US3-AS4: link text renders plain; the card has exactly one anchor', async ({
      page,
    }) => {
      await gotoFixtureSpace(page);
      const delta = await findArticleByName(page, 'Delta');
      await delta.scrollIntoViewIfNeeded();

      const safety = await readCardSafety(delta);
      expect(safety.anchors).toHaveLength(1);
      expect(
        safety.anchors.some(a => (a.text || '').includes('Example Link'))
      ).toBe(false);
      expect(safety.text).toContain('Visit Example Link for more.');
    });

    test('US3-AS5: a field with only suppressed material counts as empty — Zeta shows only What', async ({
      page,
    }) => {
      await gotoFixtureSpace(page);
      const showMore = page.getByRole('button', { name: /show \d+ more/i });
      await expect(showMore).toBeVisible();
      await showMore.click();

      const zeta = await findArticleByName(page, 'Zeta');
      await zeta.scrollIntoViewIfNeeded();
      const zetaText = await zeta.innerText();
      expect(zetaText).toMatch(/\bWHAT\b/);
      expect(zetaText).not.toMatch(/\bWHY\b/);
      expect(zetaText).not.toMatch(/\bWHO\b/);
    });

    test('US3-AS6: an unbroken 500-char token wraps inside the card at 1280px and 390px — no page-wide horizontal scroll', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 1000 });
      await gotoFixtureSpace(page);
      let delta = await findArticleByName(page, 'Delta');
      await delta.scrollIntoViewIfNeeded();

      let safety = await readCardSafety(delta);
      expect(safety.who!.scrollWidth).toBeLessThanOrEqual(
        safety.who!.clientWidth + 1
      );
      let doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);

      await page.setViewportSize({ width: 390, height: 800 });
      delta = await findArticleByName(page, 'Delta');
      safety = await readCardSafety(delta);
      expect(safety.who!.scrollWidth).toBeLessThanOrEqual(
        safety.who!.clientWidth + 1
      );
      doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    });

    test('US3-AS7: max-length fields stay clamped and area-matched; search still narrows the list within 2s', async ({
      page,
    }) => {
      // Regression guard: Theta's 32,001-char nested-inline-emphasis Why must
      // never crash the page (see the THETA_WHY comment above).
      const pageErrors: string[] = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.setViewportSize({ width: 1280, height: 1000 });
      await gotoFixtureSpace(page);

      const showMore = page.getByRole('button', { name: /show \d+ more/i });
      await expect(showMore).toBeVisible();
      await showMore.click();

      const eta = await findArticleByName(page, 'Eta');
      const alpha = await findArticleByName(page, 'Alpha');
      const theta = await findArticleByName(page, 'Theta');
      await eta.scrollIntoViewIfNeeded();

      // Theta renders intact: its What section shows, no page error was
      // thrown, and the pathological Why — which bounds to a bare
      // thematicBreak with no visible text once clamped — correctly shows
      // no "WHY" label rather than crashing or leaving a dangling one.
      await theta.scrollIntoViewIfNeeded();
      const thetaText = await theta.innerText();
      expect(thetaText).toContain(
        'Theta has a What section so the card is not all-empty.'
      );
      expect(thetaText).not.toMatch(/\bWHY\b/);
      expect(pageErrors).toEqual([]);

      const measureArea = (article: Locator) =>
        article.evaluate(el => {
          const area = el.querySelector(
            '.flex-1.min-w-0.flex.flex-col.gap-5.p-6'
          );
          const rect = area ? area.getBoundingClientRect() : null;
          return rect ? rect.height : null;
        });

      const etaSafety = await readCardSafety(eta);
      for (const section of [etaSafety.what, etaSafety.why, etaSafety.who]) {
        if (section)
          expect(section.height).toBeLessThanOrEqual(section.maxAllowed);
      }

      const etaAreaHeight = await measureArea(eta);
      const alphaAreaHeight = await measureArea(alpha);
      expect(etaAreaHeight).not.toBeNull();
      expect(alphaAreaHeight).not.toBeNull();
      expect(
        Math.abs((etaAreaHeight as number) - (alphaAreaHeight as number))
      ).toBeLessThanOrEqual(8);

      const searchInput = page.locator(
        'input[placeholder="Search subspaces..."]'
      );
      const t0 = Date.now();
      await searchInput.fill('Alpha');
      await page.waitForFunction(
        () => {
          const arts = Array.from(document.querySelectorAll('article'));
          return arts.length === 1 && arts[0].innerText.includes('\nAlpha\n');
        },
        undefined,
        { timeout: 5000 }
      );
      const elapsedMs = Date.now() - t0;
      // Recorded so a reviewer can judge the margin, not only pass/fail.
      await test
        .info()
        .attach('search-narrowing-elapsed-ms', { body: String(elapsedMs) });
      expect(elapsedMs).toBeLessThan(2000);

      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);

      // Re-assert after every interaction above: Theta never threw.
      expect(pageErrors).toEqual([]);
    });
  }
);
