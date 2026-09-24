// Durable regression cover for reading richer subspace cards (US1 of
// workspace#076): an EXPANDED Subspaces post renders one card per row with the
// identity block on the left and clamped What / Why / Who excerpts on the
// right (AS1); a card whose subspace has only some fields filled shows only
// those sections (AS2); an all-empty subspace renders as the normal compact
// card in its own row (AS3); the whole card is exactly one link, operable by
// pointer and keyboard, while the tag row's "+N" overflow keeps working without
// navigating (AS4); the list shows 3 cards then "Show N more" where a compact
// post keeps 6 (AS5); a private subspace's excerpts appear exactly where its
// own About panel is readable by the same viewer — compared via the API for
// the admin and the anonymous viewer, then in the anonymous browser (AS6); and
// the name search narrows the list and reaches the same "no match" state as the
// compact post (AS7).
//
// Independently walked live via the browser against a running stack in this
// same session (four viewer classes for AS6 — admin, a member of the private
// subspace, a signed-in non-member, anonymous; contract probe 6 for legs b and
// c); this spec is the durable, self-contained form of that walk — it
// provisions its own fixture (a throwaway PUBLIC Space with seven Subspaces,
// one of them PRIVATE, one EXPANDED post and one COMPACT post) via the GraphQL
// API in `beforeAll` and tears it down in `afterAll`. The browser legs run as
// the anonymous viewer: the host is public, so anonymous already sees every
// fixture card, which is the demanding case for AS6 (a viewer with the fewest
// rights must see no more on the card than on the About panel).

import { test, expect, type Locator, type Page } from '@playwright/test';
import { deleteFixtureTree, newFixtureTree } from './subspaces-callout.helpers';
import { getUserToken, UniqueIDGenerator } from '@alkemio/tests-lib';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';
// The non-interactive-login bearer (HS256) is only accepted on the private
// non-interactive endpoint — same convention as every other raw-GraphQL
// fixture setup in this suite (see subspaces-callout/us4-narrow-layout.spec.ts).
const gqlEndpoint =
  process.env.ALKEMIO_SERVER ||
  'http://localhost:3000/api/private/non-interactive/graphql';
// The public endpoint, hit with no credentials at all — the anonymous viewer.
const publicGqlEndpoint = `${baseUrl}/api/public/graphql`;

async function rawGql<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(token ? gqlEndpoint : publicGqlEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors)
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  return body.data as T;
}

const runSuffix = UniqueIDGenerator.getID();
const SEARCH_BOX = 'input[placeholder="Search subspaces..."]';
const EXPANDED_POST = 'Subspaces — expanded';
const COMPACT_POST = 'Subspaces — compact';

function longText(label: string, sentences: number): string {
  const base = `${label}'s section carries enough ordinary prose to overflow its line clamp reliably`;
  return Array.from(
    { length: sentences },
    (_, i) => `${base}, sentence ${i + 1} of this fixture card.`
  ).join(' ');
}

type CardDef = {
  label: string;
  what?: string;
  why?: string;
  who?: string;
  tags?: string[];
  privacy?: 'PUBLIC' | 'PRIVATE';
  noLeads?: boolean;
};

// Seven subspaces so the expanded list shows 3 + "Show 4 more" and the compact
// one 6 + "Show 1 more". Names sort alphabetically (the list's order) so the
// first three are Alpha, Beta, Delta — Gamma (all-empty, no leads) sits behind
// "Show more", exactly as in the live fixture.
const CARDS: CardDef[] = [
  {
    label: 'Alpha',
    what: longText('Alpha', 5),
    why: longText('Alpha why', 3),
    who: longText('Alpha who', 3),
    tags: [
      'innovation',
      'sustainability',
      'community-building',
      'open-collaboration',
      'research',
      'education',
      'policy',
    ],
  },
  {
    label: 'Beta',
    what: 'Beta has only a What section filled, two lines of plain prose for this fixture.',
  },
  { label: 'Gamma', noLeads: true },
  {
    label: 'Delta',
    what: longText('Delta', 4),
    why: longText('Delta why', 3),
    who: longText('Delta who', 3),
  },
  {
    label: 'Epsilon',
    privacy: 'PRIVATE',
    what: 'Epsilon is the private subspace of the fixture; its What shows only where its About panel is readable.',
    why: 'Epsilon exists to prove that expanded mode widens nothing.',
    who: 'Epsilon members and the platform admin.',
  },
  {
    label: 'Eta',
    what: longText('Eta', 4),
    why: longText('Eta why', 3),
    who: longText('Eta who', 3),
  },
  {
    label: 'Zeta',
    what: longText('Zeta', 4),
    why: longText('Zeta why', 3),
    who: longText('Zeta who', 3),
  },
];

type Fixture = {
  spaceId: string;
  spaceNameId: string;
  subspaceIds: string[];
  subspaceNameIds: Record<string, string>;
  expandedCalloutId: string;
};

let fixture: Fixture;
// Everything created on the stack, recorded the moment it exists, so a
// `beforeAll` that fails halfway still leaves a complete deletion list.
const tree = newFixtureTree();
let adminToken: string;

const shortId = (label: string) => `${label}${runSuffix}`.slice(0, 24);

async function createSubspace(
  spaceId: string,
  adminUserId: string,
  c: CardDef
): Promise<{ id: string; nameID: string }> {
  const nameID = shortId(c.label.toLowerCase());
  const data = await rawGql<{
    createSubspace: {
      id: string;
      nameID: string;
      community: { roleSet: { id: string } };
    };
  }>(
    `mutation ($subspaceData: CreateSubspaceInput!) {
      createSubspace(subspaceData: $subspaceData) { id nameID community { roleSet { id } } }
    }`,
    {
      subspaceData: {
        spaceID: spaceId,
        nameID,
        about: {
          profileData: {
            displayName: c.label,
            description: c.what,
            tagline: `${c.label} fixture card`,
            tags: c.tags,
          },
          why: c.why,
          who: c.who,
        },
        collaborationData: { calloutsSetData: {} },
        settings: { privacy: { mode: c.privacy ?? 'PUBLIC' } },
      },
    },
    adminToken
  );
  if (c.noLeads) {
    // createSubspace makes its creator a Lead; AS3 needs a subspace with none.
    await rawGql(
      'mutation ($roleData: RemoveRoleOnRoleSetInput!) { removeRoleFromUser(roleData: $roleData) { id } }',
      {
        roleData: {
          actorID: adminUserId,
          role: 'LEAD',
          roleSetID: data.createSubspace.community.roleSet.id,
        },
      },
      adminToken
    );
  }
  tree.subspaceIds.push(data.createSubspace.id);
  return data.createSubspace;
}

async function createSpacesPost(
  calloutsSetId: string,
  title: string,
  cardVariant: 'EXPANDED' | 'COMPACT'
): Promise<string> {
  const data = await rawGql<{ createCalloutOnCalloutsSet: { id: string } }>(
    `mutation ($calloutData: CreateCalloutOnCalloutsSetInput!) {
      createCalloutOnCalloutsSet(calloutData: $calloutData) { id }
    }`,
    {
      calloutData: {
        calloutsSetID: calloutsSetId,
        framing: { type: 'SPACES', profile: { displayName: title } },
        settings: { framing: { spaces: { cardVariant } } },
      },
    },
    adminToken
  );
  return data.createCalloutOnCalloutsSet.id;
}

test.describe(
  'See richer subspace cards (US1)',
  { tag: '@forge-acceptance' },
  () => {
    // One shared fixture is created once in `beforeAll` and read by every test
    // below — serial mode is what makes that safe under this repo's
    // `fullyParallel: true` default (see the identical note in us4-narrow-layout.spec.ts).
    // The explicit timeout raises the per-test budget to match the beforeAll
    // fixture's own 240s allowance — the default config's 30s test timeout
    // otherwise applies regardless of a longer hook timeout.
    test.describe.configure({ mode: 'serial', timeout: 240_000 });

    test.beforeAll(async () => {
      test.setTimeout(240_000);
      adminToken = await getUserToken(adminEmail);

      const me = await rawGql<{
        me: { user: { id: string; account: { id: string } } };
      }>('query { me { user { id account { id } } } }', {}, adminToken);
      const accountID = me.me.user.account.id;

      const spaceNameId = shortId('us1crd');
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
              profileData: { displayName: `US1 Expanded Cards ${runSuffix}` },
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

      const subspaceIds: string[] = [];
      const subspaceNameIds: Record<string, string> = {};
      for (const c of CARDS) {
        const created = await createSubspace(spaceId, me.me.user.id, c);
        subspaceIds[subspaceIds.length] = created.id;
        subspaceNameIds[c.label] = created.nameID;
      }

      const expandedCalloutId = await createSpacesPost(
        calloutsSetId,
        EXPANDED_POST,
        'EXPANDED'
      );
      await createSpacesPost(calloutsSetId, COMPACT_POST, 'COMPACT');

      fixture = {
        spaceId,
        spaceNameId,
        subspaceIds,
        subspaceNameIds,
        expandedCalloutId,
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

    async function acceptCookiesIfVisible(page: Page) {
      const btn = page.getByRole('button', { name: /accept all cookies/i });
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false))
        await btn.click().catch(() => undefined);
    }

    /** The subspaces list `<section>` that belongs to the post titled `title`.
     * The post is anchored by its own "Open <title>" link and `<title>` h3
     * heading: the smallest element holding both is the post, and its list is
     * the search-box section inside it. Posts and their lists mount lazily as
     * the feed scrolls, so retry (scrolling) until that list exists — never
     * falling back to another post's list that happened to mount first. The
     * match is pinned by a marker attribute so the returned locator cannot
     * drift if another post's list mounts above it later. */
    async function listOfPost(page: Page, title: string): Promise<Locator> {
      await expect
        .poll(
          async () => {
            const found = await page.evaluate(
              ({ t, box }) => {
                const link = Array.from(document.querySelectorAll('a')).find(
                  a => (a.textContent || '').trim() === `Open ${t}`
                );
                let post: HTMLElement | null = link?.parentElement ?? null;
                while (
                  post &&
                  !Array.from(post.querySelectorAll('h3')).some(
                    h => (h.textContent || '').trim() === t
                  )
                ) {
                  post = post.parentElement;
                }
                const section = Array.from(
                  post?.querySelectorAll('section') ?? []
                ).find(s => s.querySelector(box));
                if (!section) return false;
                section.setAttribute('data-e2e-list-of', t);
                return true;
              },
              { t: title, box: SEARCH_BOX }
            );
            if (!found) await page.mouse.wheel(0, 1000);
            return found;
          },
          {
            timeout: 30_000,
            message: `subspaces list for post "${title}" not found`,
          }
        )
        .toBe(true);
      return page.locator(`section[data-e2e-list-of="${title}"]`);
    }

    async function gotoFixtureSpace(
      page: Page,
      postTitle = EXPANDED_POST
    ): Promise<Locator> {
      await page.goto(`${baseUrl}/${fixture.spaceNameId}`, {
        waitUntil: 'networkidle',
      });
      await acceptCookiesIfVisible(page);
      const list = await listOfPost(page, postTitle);
      await list.scrollIntoViewIfNeeded();
      await expect(list.locator('article').first()).toBeVisible();
      return list;
    }

    const cardNamed = (list: Locator, name: string) =>
      list
        .locator('article')
        .filter({
          has: list.page().getByRole('heading', { name, exact: true }),
        })
        .first();

    // The list's own "Show N more" button — NOT the tag row's "+N" chip, whose
    // aria-label is also "Show N more".
    const showMoreOf = (list: Locator) =>
      list.locator('button', { hasText: /^Show \d+ more$/ });

    test('US1-AS1: one card per row; identity block left; What (≤3 lines) then Why/Who (≤2 lines) right with ellipsis; full-width leads footer', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const list = await gotoFixtureSpace(page);
      const alpha = cardNamed(list, 'Alpha');
      await alpha.scrollIntoViewIfNeeded();

      const layout = await list.evaluate(el => {
        const ul = el.querySelector('ul') as HTMLElement;
        const tops = Array.from(el.querySelectorAll('article')).map(a =>
          Math.round(a.getBoundingClientRect().top)
        );
        return {
          columns: getComputedStyle(ul).gridTemplateColumns.split(' ').length,
          distinctRows: new Set(tops).size,
          cards: tops.length,
        };
      });
      expect(layout.columns).toBe(1);
      expect(layout.distinctRows).toBe(layout.cards);

      const m = await alpha.evaluate(a => {
        const r = a.getBoundingClientRect();
        const identity = a.querySelector(
          '.w-\\[300px\\]'
        ) as HTMLElement | null;
        const panel = a.querySelector('.flex-1.min-w-0') as HTMLElement;
        const clamp = (e: Element | null, lines: number) => {
          if (!e) return null;
          const cs = getComputedStyle(e as HTMLElement);
          const rect = (e as HTMLElement).getBoundingClientRect();
          return {
            left: rect.left - r.left,
            top: rect.top - r.top,
            height: rect.height,
            maxAllowed: lines * parseFloat(cs.lineHeight) + 2,
            overflows: (e as HTMLElement).scrollHeight > rect.height + 1,
            lineClamp: cs.webkitLineClamp,
          };
        };
        const c2 = panel.querySelectorAll('.line-clamp-2');
        const labels = Array.from(a.querySelectorAll('span.uppercase')).map(
          s => (s as HTMLElement).innerText
        );
        const whatLabel = a.querySelector('span.uppercase') as HTMLElement;
        const whyLabel = Array.from(
          a.querySelectorAll('span.uppercase')
        )[1] as HTMLElement;
        const footer = a.querySelector('.border-t') as HTMLElement;
        return {
          width: r.width,
          identity: identity && {
            width: identity.getBoundingClientRect().width,
            left: identity.getBoundingClientRect().left - r.left,
          },
          labels,
          what: clamp(panel.querySelector('.line-clamp-3'), 3),
          why: clamp(c2[0], 2),
          who: clamp(c2[1], 2),
          whatLabelPx: parseFloat(getComputedStyle(whatLabel).fontSize),
          whyLabelPx: parseFloat(getComputedStyle(whyLabel).fontSize),
          footer: {
            width: footer.getBoundingClientRect().width,
            text: footer.innerText,
            avatars: footer.querySelectorAll('[aria-label]').length,
          },
        };
      });
      expect(m.identity).not.toBeNull();
      expect(m.identity!.width).toBe(300);
      expect(m.identity!.left).toBeLessThanOrEqual(2);
      expect(m.labels).toEqual(['WHAT', 'WHY', 'WHO', 'LEADS']);
      for (const [sec, lines] of [
        [m.what, 3],
        [m.why, 2],
        [m.who, 2],
      ] as const) {
        expect(sec).not.toBeNull();
        expect(sec!.lineClamp).toBe(String(lines));
        expect(sec!.height).toBeLessThanOrEqual(sec!.maxAllowed);
        expect(sec!.overflows).toBe(true); // text really is cut, i.e. the ellipsis is exercised
      }
      expect(m.what!.left).toBeGreaterThan(300); // content sits right of the identity block
      expect(m.what!.top).toBeLessThan(m.why!.top);
      expect(m.why!.top).toBeLessThan(m.who!.top);
      expect(m.whatLabelPx).toBeGreaterThan(m.whyLabelPx); // What is primary
      expect(Math.abs(m.footer.width - m.width)).toBeLessThanOrEqual(4); // full-width footer
      expect(m.footer.text).toMatch(/LEADS/);
      expect(m.footer.avatars).toBeGreaterThanOrEqual(1);
    });

    test('US1-AS2: a subspace with only What filled shows only the What section — no Why/Who label, placeholder or gap', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const list = await gotoFixtureSpace(page);
      const beta = cardNamed(list, 'Beta');
      const m = await beta.evaluate(a => {
        const panel = a.querySelector('.flex-1.min-w-0') as HTMLElement;
        return {
          labels: Array.from(a.querySelectorAll('span.uppercase')).map(
            s => (s as HTMLElement).innerText
          ),
          sections: panel.children.length,
          clamp3: panel.querySelectorAll('.line-clamp-3').length,
          clamp2: panel.querySelectorAll('.line-clamp-2').length,
        };
      });
      expect(m.labels).toEqual(['WHAT', 'LEADS']);
      expect(m.sections).toBe(1);
      expect(m.clamp3).toBe(1);
      expect(m.clamp2).toBe(0);
    });

    test('US1-AS5: expanded shows exactly 3 then "Show 4 more" → all seven + "Show less"; the compact post shows 6 then "Show 1 more"', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const list = await gotoFixtureSpace(page);
      await expect(list.locator('article h3')).toHaveText([
        'Alpha',
        'Beta',
        'Delta',
      ]);
      const showMore = showMoreOf(list);
      await expect(showMore).toHaveText(/show 4 more/i);
      await showMore.click();
      await expect(list.locator('article')).toHaveCount(7);
      await expect(
        list.getByRole('button', { name: /show less/i })
      ).toBeVisible();

      const compact = await listOfPost(page, COMPACT_POST);
      await compact.scrollIntoViewIfNeeded();
      await expect(compact.locator('article')).toHaveCount(6);
      await expect(showMoreOf(compact)).toHaveText(/show 1 more/i);
      const compactColumns = await compact.evaluate(
        el =>
          getComputedStyle(
            el.querySelector('ul') as HTMLElement
          ).gridTemplateColumns.split(' ').length
      );
      expect(compactColumns).toBe(3);
    });

    test('US1-AS3: an all-empty subspace with no leads renders as the normal compact card at identity-block width, in its own row', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const list = await gotoFixtureSpace(page);
      await showMoreOf(list).click();
      const gamma = cardNamed(list, 'Gamma');
      await gamma.scrollIntoViewIfNeeded();
      const m = await gamma.evaluate(a => {
        const li = a.closest('li') as HTMLElement;
        const siblings = Array.from(
          li.parentElement!.children
        ) as HTMLElement[];
        const top = li.getBoundingClientRect().top;
        return {
          width: a.getBoundingClientRect().width,
          ownRow: siblings.every(
            s => s === li || Math.abs(s.getBoundingClientRect().top - top) > 5
          ),
          labels: Array.from(a.querySelectorAll('span.uppercase')).map(
            s => (s as HTMLElement).innerText
          ),
          hasContentPanel: !!a.querySelector('.flex-1.min-w-0'),
          hasCta: /OPEN SUBSPACE/.test((a as HTMLElement).innerText),
        };
      });
      expect(m.width).toBe(300);
      expect(m.ownRow).toBe(true);
      expect(m.labels).toEqual([]); // no What/Why/Who — and no LEADS label without leads
      expect(m.hasContentPanel).toBe(false);
      expect(m.hasCta).toBe(false);
    });

    test('US1-AS4: the card is exactly one link named after the subspace; click and Enter navigate; no "Read more"; the tag row +N opens by keyboard without navigating', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      let list = await gotoFixtureSpace(page);
      let alpha = cardNamed(list, 'Alpha');
      await alpha.scrollIntoViewIfNeeded();

      const markup = await alpha.evaluate(a => ({
        links: Array.from(a.querySelectorAll('a')).map(x => ({
          ariaLabel: x.getAttribute('aria-label'),
          href: x.getAttribute('href'),
        })),
        readMore: /read more/i.test((a as HTMLElement).innerText),
        buttonsOutsideTagRow: Array.from(a.querySelectorAll('button')).filter(
          b => !b.closest('.relative.z-10')
        ).length,
      }));
      expect(markup.links).toHaveLength(1);
      expect(markup.links[0].ariaLabel).toBe('Alpha'); // announced by the subspace name, not the excerpts
      expect(markup.links[0].href).toContain(fixture.subspaceNameIds.Alpha);
      expect(markup.readMore).toBe(false);
      expect(markup.buttonsOutsideTagRow).toBe(0); // no interactive element the compact card lacks

      // The tag row's "+N" overflow: keyboard-operable, and it never navigates.
      const plusN = alpha.locator('button', { hasText: /^\+\d+$/ }).first();
      await plusN.focus();
      await page.keyboard.press('Enter');
      await expect(
        page
          .locator(
            '[data-slot="popover-content"], [data-radix-popper-content-wrapper]'
          )
          .first()
      ).toBeVisible();
      expect(page.url()).toContain(`/${fixture.spaceNameId}`);
      expect(page.url()).not.toContain(fixture.subspaceNameIds.Alpha);
      await page.keyboard.press('Escape');

      // Keyboard: Enter on the focused card link navigates to the subspace.
      await alpha.getByRole('link', { name: 'Alpha', exact: true }).focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(new RegExp(fixture.subspaceNameIds.Alpha), {
        timeout: 20_000,
      });

      // Pointer: a click on the What excerpt (far from the name) navigates too —
      // the whole card is the link's hit area. A real pointer click at those
      // coordinates is used on purpose: Playwright's element click would refuse
      // because the stretched link overlay is what receives the event.
      list = await gotoFixtureSpace(page);
      alpha = cardNamed(list, 'Alpha');
      // Centre the card so the excerpt cannot sit under the sticky page header.
      await alpha.evaluate(el => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      const box = await alpha.locator('.line-clamp-3').boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.waitForURL(new RegExp(fixture.subspaceNameIds.Alpha), {
        timeout: 20_000,
      });
    });

    test('US1-AS6: a private subspace exposes on the card exactly what its About panel exposes to the same viewer — API parity (admin, anonymous) then the anonymous browser', async ({
      browser,
    }) => {
      const epsilonId =
        fixture.subspaceIds[CARDS.findIndex(c => c.label === 'Epsilon')];
      const viaCallout = `query ($calloutId: UUID!) { lookup { callout(ID: $calloutId) { framing { subspaces {
      id about { why who profile { displayName tagline description } } } } } } }`;
      const idsOnly =
        'query ($calloutId: UUID!) { lookup { callout(ID: $calloutId) { framing { subspaces { id } } } } }';
      const direct =
        'query ($id: UUID!) { lookup { space(ID: $id) { id about { why who profile { displayName tagline description } } } } }';

      type About = {
        why: string | null;
        who: string | null;
        profile: {
          displayName: string;
          tagline: string | null;
          description: string | null;
        };
      };
      type ViaCallout = {
        lookup: {
          callout: { framing: { subspaces: { id: string; about: About }[] } };
        };
      };
      type Direct = { lookup: { space: { id: string; about: About } | null } };

      // What the admin can read directly is the reference for "filled": pair parity
      // (c) is about a field being WITHHELD by authorization, not about a field an
      // author simply never set (Gamma has no description at all, for anyone).
      const filledByAdmin = new Map<string, About>();
      for (const token of [adminToken, undefined]) {
        const full = await rawGql<ViaCallout>(
          viaCallout,
          { calloutId: fixture.expandedCalloutId },
          token
        );
        const ids = await rawGql<ViaCallout>(
          idsOnly,
          { calloutId: fixture.expandedCalloutId },
          token
        );
        const set = full.lookup.callout.framing.subspaces.map(s => s.id).sort();
        // (a) the same subspace set whether or not About fields are selected
        expect(set).toEqual(
          ids.lookup.callout.framing.subspaces.map(s => s.id).sort()
        );
        for (const s of full.lookup.callout.framing.subspaces) {
          // (b) every About field equals what the direct lookup returns to this viewer
          const d = await rawGql<Direct>(direct, { id: s.id }, token);
          expect(d.lookup.space?.about).toEqual(s.about);
          if (token === adminToken) filledByAdmin.set(s.id, s.about);
          // (c) pair parity — description/who present exactly where tagline/why are,
          // for every field the admin proves is filled (presence = a non-null value)
          const ref = filledByAdmin.get(s.id)!;
          if (ref.profile.description != null) {
            expect(s.about.profile.description != null).toBe(
              s.about.profile.tagline != null
            );
          }
          if (ref.who != null) {
            expect(s.about.who != null).toBe(s.about.why != null);
          }
        }
        // The private subspace: visible on the callout ⇔ readable directly
        const directEps = await rawGql<Direct>(
          direct,
          { id: epsilonId },
          token
        ).catch(() => null);
        expect(set.includes(epsilonId)).toBe(directEps?.lookup.space != null);
      }

      // Anonymous browser: the card shows Epsilon's About text exactly where the
      // About panel shows it, and the compact post lists Epsilon iff the expanded one does.
      // Explicit `storageState: undefined`: never inherit a session from a
      // fixture/config storageState — this leg must be genuinely anonymous.
      const context = await browser.newContext({
        storageState: undefined,
        viewport: { width: 1280, height: 900 },
      });
      expect(await context.cookies()).toHaveLength(0);
      const page = await context.newPage();
      try {
        const list = await gotoFixtureSpace(page);
        await showMoreOf(list).click();
        const expandedNames = await list.locator('article h3').allInnerTexts();
        const eps = cardNamed(list, 'Epsilon');
        const cardSections = await eps.evaluate(a => {
          const out: Record<string, string> = {};
          const panel = a.querySelector('.flex-1.min-w-0') as HTMLElement;
          for (const d of Array.from(panel.children)) {
            const lbl = d.querySelector('span.uppercase') as HTMLElement | null;
            const body = d.querySelector(
              '[class*="line-clamp"]'
            ) as HTMLElement | null;
            if (lbl && body) out[lbl.innerText] = body.innerText;
          }
          return out;
        });
        expect(Object.keys(cardSections)).toEqual(['WHAT', 'WHY', 'WHO']);
        await expect(eps.getByText('Private', { exact: true })).toBeVisible();

        const compact = await listOfPost(page, COMPACT_POST);
        await showMoreOf(compact).click();
        const compactNames = await compact
          .locator('article h3')
          .allInnerTexts();
        expect(compactNames.includes('Epsilon')).toBe(
          expandedNames.includes('Epsilon')
        );

        await page.goto(
          `${baseUrl}/${fixture.spaceNameId}/challenges/${fixture.subspaceNameIds.Epsilon}/about`,
          {
            waitUntil: 'networkidle',
          }
        );
        await acceptCookiesIfVisible(page);
        const aboutText = (await page.locator('body').innerText()).replace(
          /\s+/g,
          ' '
        );
        for (const excerpt of Object.values(cardSections)) {
          expect(aboutText).toContain(excerpt.replace(/\s+/g, ' ').trim());
        }
      } finally {
        await context.close();
      }
    });

    test('US1-AS7: the name search narrows to the matching card, and a non-matching string reaches the same "no match" state as the compact post', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const list = await gotoFixtureSpace(page);
      const search = list.getByPlaceholder('Search subspaces...');
      await search.fill('Alpha');
      await expect(list.locator('article h3')).toHaveText(['Alpha']);

      await search.fill('zzz-matches-nothing');
      await expect(list.locator('article')).toHaveCount(0);
      const expandedEmpty = list.locator('.border-dashed');
      await expect(expandedEmpty).toContainText('No subspaces found');
      await expect(
        expandedEmpty.getByRole('button', { name: /clear filters/i })
      ).toBeVisible();

      const compact = await listOfPost(page, COMPACT_POST);
      await compact
        .getByPlaceholder('Search subspaces...')
        .fill('zzz-matches-nothing');
      await expect(compact.locator('article')).toHaveCount(0);
      const compactEmpty = compact.locator('.border-dashed');
      await expect(compactEmpty).toContainText('No subspaces found');
      expect((await compactEmpty.innerText()).trim()).toBe(
        (await expandedEmpty.innerText()).trim()
      );
    });
  }
);
