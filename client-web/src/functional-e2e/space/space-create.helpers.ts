import { expect, type Locator, type Page } from '@playwright/test';
import {
  readSpaceByNameId,
  readSpaceCalloutNames,
  SpaceLevel,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import { baseUrl, contentFeed } from '../helpers/space-access.helper';

/**
 * Server-side oracles for a Space created and deleted through the UI
 * (client-net audit § 4, Tier 1 item 12). The create dialog only knows the
 * URL slug it typed, so the record is read back by nameID.
 */

/**
 * The Space the dialog created exists on the server with EXACTLY what the user
 * typed, as an L0 hosted by the expected account. Returns its id.
 */
export const expectCreatedSpaceRecord = async (
  nameID: string,
  expected: { displayName: string; accountId: string; tagline?: string }
): Promise<string> => {
  const space = must(
    await readSpaceByNameId(nameID),
    `readSpaceByNameId(${nameID})`
  ).lookupByName.space;
  expect(space, `Space '${nameID}' on the server`).toBeTruthy();
  expect(space!.nameID).toBe(nameID);
  expect(space!.level).toBe(SpaceLevel.L0);
  expect(space!.about.profile.displayName).toBe(expected.displayName);
  expect(space!.account.id, 'host account of the new Space').toBe(
    expected.accountId
  );
  if (expected.tagline !== undefined) {
    expect(space!.about.profile.tagline).toBe(expected.tagline);
  }
  return space!.id;
};

/**
 * The tutorial callouts the page shows are the server's record: each
 * tutorial heading on the landing tab is the display name of a callout read
 * back over the API, and at least `minCount` of them are. Names come from the
 * server, never hard-coded here. The server's set is larger than the landing
 * tab (other flow states hold the rest, e.g. "Contributors"), so the check is
 * page ⊆ server, not equality.
 */
export const expectTutorialCalloutsRendered = async (
  page: Page,
  spaceId: string,
  minCount: number
): Promise<void> => {
  const callouts =
    must(
      await readSpaceCalloutNames(spaceId),
      `readSpaceCalloutNames(${spaceId})`
    ).lookup.space?.collaboration.calloutsSet.callouts ?? [];
  const serverNames = callouts.map(c => c.framing.profile.displayName);
  // Same emoji-prefix rule SpacePage.verifyTutorialsPresent waits on.
  const tutorialHeading = /^[👋📚↪️🤝⚙️🧩🧹]/u;
  const onPage = (
    await contentFeed(page).getByRole('heading', { level: 3 }).allTextContents()
  )
    .map(t => t.trim())
    .filter(t => tutorialHeading.test(t));
  expect(
    onPage.length,
    `tutorial headings on the page: ${JSON.stringify(onPage)}`
  ).toBeGreaterThanOrEqual(minCount);
  for (const name of onPage) {
    expect(
      serverNames,
      `callout "${name}" on the page is a server callout of the Space`
    ).toContain(name);
  }
};

/**
 * After the UI delete, the Space is gone server-side (`lookupByName` answers
 * ENTITY_NOT_FOUND) and its About route no longer resolves: the client shows
 * its "We are redirecting you..." not-found dialog instead of the Space.
 */
export const expectSpaceGone = async (
  page: Page,
  nameID: string
): Promise<void> => {
  const lookup = await readSpaceByNameId(nameID);
  expect(
    lookup.data?.lookupByName.space,
    `Space '${nameID}' after delete`
  ).toBeFalsy();
  // Rebaseline candidate: ENTITY_NOT_FOUND is a server error code.
  expect(JSON.stringify(lookup.error?.errors ?? lookup.error ?? '')).toContain(
    'ENTITY_NOT_FOUND'
  );

  // The client leaves the deleted Space's pages on its own (to /home) once
  // the delete is sent. `SpaceSettingsPage.deleteSpace` can return before
  // that, because its URL wait also matches `/<space>/settings/account`, and
  // a goto issued then is interrupted by the redirect. Wait it out first.
  await expect(page).not.toHaveURL(new RegExp(`/${nameID}(/|\\?|$)`));
  await page.goto(`${baseUrl}/${nameID}/about`);
  await expect(
    page
      .getByRole('dialog', { name: 'We are redirecting you...' })
      .getByRole('heading', { name: 'We are redirecting you...', level: 2 })
  ).toBeVisible();
};

/**
 * A hosted Space's card link inside the Hosted Spaces section of an Account
 * tab (My Account or an organization's), by its exact display name. The
 * section is a collapsible whose trigger `aria-controls` its content, so the
 * link is looked up there only: a same-named link elsewhere on the page (a
 * membership list, the navigation) cannot stand in for the hosted-space card.
 * The card's image link carries no name, so the exact name matches one link.
 */
export const hostedSpaceCardLink = async (
  page: Page,
  spaceDisplayName: string
): Promise<Locator> => {
  const sectionTrigger = page.getByRole('button', { name: /^Hosted Spaces\b/ });
  const contentId = await sectionTrigger.getAttribute('aria-controls');
  expect(contentId, 'Hosted Spaces section content id').toBeTruthy();
  return page
    .locator(`[id="${contentId}"]`)
    .getByRole('link', { name: spaceDisplayName, exact: true });
};
