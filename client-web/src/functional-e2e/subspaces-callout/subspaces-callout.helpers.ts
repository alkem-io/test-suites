import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared DOM helpers for the subspaces-callout walks. They encode the two facts
 * every walk depends on and that a naive locator gets wrong:
 *
 * - Subspace cards mount lazily. A Subspaces post renders a skeleton, waits until
 *   it has been in view for half a second, then fetches its subspaces, and only
 *   then do the `<article>` cards exist. `networkidle` (also a half-second quiet
 *   window) resolves before that, so a one-shot scan right after navigation
 *   races the mount. Wait for a card, not for the network.
 * - The expanded card reuses the compact card's identity block, whose tagline is
 *   itself a `.line-clamp-2` element that comes BEFORE the What/Why/Who panel in
 *   document order. Excerpts are therefore addressed by their `data-testid`,
 *   never by clamp class alone.
 */

/**
 * The entities a walk creates on the stack, recorded as they are created so
 * the teardown has a complete list even when `beforeAll` failed halfway.
 */
export type FixtureTree = {
  spaceId?: string;
  subspaceIds: string[];
};

export function newFixtureTree(): FixtureTree {
  return { subspaceIds: [] };
}

/**
 * Delete a fixture tree leaves-first (the platform refuses to delete a
 * level-0 Space that still contains subspaces), attempting every entity even
 * after a failure, then throw once listing everything that could not be
 * removed. A swallowed teardown error orphans a public fixture tree on the
 * shared stack — with nightly retries, up to three per file per night — so the
 * leak must surface in the report, not disappear.
 */
export async function deleteFixtureTree(
  tree: FixtureTree,
  deleteSpace: (id: string) => Promise<unknown>
): Promise<void> {
  const failures: string[] = [];
  const attempt = async (id: string) => {
    try {
      await deleteSpace(id);
    } catch (error) {
      failures.push(
        `${id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };
  for (const id of tree.subspaceIds) await attempt(id);
  if (tree.spaceId) await attempt(tree.spaceId);
  if (failures.length > 0) {
    throw new Error(
      `fixture teardown left entities behind:\n${failures.join('\n')}`
    );
  }
}

export const EXCERPT_SELECTOR = {
  what: '[data-testid="excerpt-what"]',
  why: '[data-testid="excerpt-why"]',
  who: '[data-testid="excerpt-who"]',
} as const;

const SUBSPACES_SEARCH = 'input[placeholder="Search subspaces..."]';

/** Navigate to a space page and wait until at least one subspace card has mounted. */
export async function gotoSpaceAndWaitForCards(
  page: Page,
  url: string
): Promise<void> {
  await page.goto(url);
  await expect(page.locator('article').first()).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * The subspaces list rendered by the post titled `title`: the innermost element
 * that contains both the post's "Open <title>" link and the list's search box.
 * Scoping to it keeps assertions off the sidebar's subspace links and off other
 * posts' cards on the same page.
 */
export function subspacesListOfPost(page: Page, title: string): Locator {
  return page
    .locator('*')
    .filter({ has: page.getByRole('link', { name: `Open ${title}` }) })
    .filter({ has: page.locator(SUBSPACES_SEARCH) })
    .last();
}

/**
 * The card whose name heading is `name`. Both card kinds carry it as a heading
 * (the compact card is wrapped in its link; the expanded card's name heading
 * holds a stretched link), so the heading — not a link — is what both share.
 * Web-first: retries until visible.
 */
export async function findArticleByName(
  scope: Page | Locator,
  name: string
): Promise<Locator> {
  // The `has` locator is evaluated relative to each candidate article, so it
  // must be built from the page, never from `scope`: a locator chained off a
  // dialog would look for that dialog inside the card and never match.
  const root = 'page' in scope ? scope.page() : scope;
  const article = scope
    .locator('article')
    .filter({ has: root.getByRole('heading', { name, exact: true }) })
    .first();
  await expect(article).toBeVisible({ timeout: 20_000 });
  return article;
}

export type ClampInfo = {
  height: number;
  lineHeight: number;
  maxAllowed: number;
  top: number;
  left: number;
  scrollWidth: number;
  clientWidth: number;
};

/**
 * Geometry of the three excerpt bodies of an expanded card, by section. A
 * section that does not render (empty field) is `null`.
 */
export async function readExcerptClamps(article: Locator): Promise<{
  what: ClampInfo | null;
  why: ClampInfo | null;
  who: ClampInfo | null;
}> {
  return article.evaluate((el, selectors) => {
    const info = (selector: string, lines: number) => {
      const body = el.querySelector(
        `${selector} [class*="line-clamp"]`
      ) as HTMLElement | null;
      if (!body) return null;
      const rect = body.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(body).lineHeight);
      return {
        height: rect.height,
        lineHeight,
        maxAllowed: lines * lineHeight + 2,
        top: rect.top,
        left: rect.left,
        scrollWidth: body.scrollWidth,
        clientWidth: body.clientWidth,
      };
    };
    return {
      what: info(selectors.what, 5),
      why: info(selectors.why, 5),
      who: info(selectors.who, 5),
    };
  }, EXCERPT_SELECTOR);
}
