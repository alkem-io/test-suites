import { expect, type Browser, type Locator, type Page } from '@playwright/test';
import {
  readRoleSetUsersInRole,
  RoleName,
  TestScenarioFactory,
  TestUser,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { ensurePersonaState } from '../fixtures/authenticated-session.fixture';
import { expectSignedIn } from '../my-dashboard/my-dashboard-page-objects';
import { must } from './lib-actor.helper';
import { deleteSpaceTree } from './space-cleanup.helper';

/**
 * What a persona sees of ONE space, and the server-side reads that back it
 * up — shared by the W2 membership, structure and settings journeys
 * (docs/qa/server-rebuild/plan.md § W2, rows 1–4). Every locator here is
 * scoped to an element that only exists once the page has resolved the
 * viewer's standing, so an absence asserted inside it cannot pass on a page
 * that has not rendered yet.
 */

export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** A signed-in page for a persona in its own browser context (own cookie jar). */
export type PersonaPage = { page: Page; close: () => Promise<void> };

export const openPersonaPage = async (
  browser: Browser,
  email: string
): Promise<PersonaPage> => {
  const context = await browser.newContext({
    storageState: await ensurePersonaState(browser, email),
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/home`);
  await expectSignedIn(page);
  return { page, close: () => context.close() };
};

/**
 * The About dialog the space route opens for a viewer who may not read the
 * space's content (a non-member of a private space lands on `/<space>/about`).
 * Its accessible name is the space's display name.
 */
export const aboutDialog = (page: Page, spaceDisplayName: string): Locator =>
  page.getByRole('dialog', { name: spaceDisplayName, exact: true });

/** The feed of callouts on a space page; only rendered for a viewer with READ. */
export const contentFeed = (page: Page): Locator =>
  page.getByRole('region', { name: 'Space content feed' });

/** A callout's title in the feed (CRD renders callout titles as h3). */
export const calloutHeading = (page: Page, calloutName: string): Locator =>
  contentFeed(page).getByRole('heading', { name: calloutName, level: 3, exact: true });

/** The L0 space's own sidebar (Join / Apply, Add Post, Create Subspace live here). */
export const spaceSidebar = (page: Page): Locator =>
  page.getByRole('navigation', { name: 'Space sidebar' });

/** The space page's h1 — rendered for both members and public-space visitors. */
export const spaceTitle = (page: Page, spaceDisplayName: string): Locator =>
  page.getByRole('heading', { name: spaceDisplayName, level: 1, exact: true });

/**
 * Starts waiting for the browser's own GraphQL request that carries
 * `fieldName` (e.g. `joinRoleSet`, `updateSpaceSettings`), and returns a
 * function that resolves once it has answered — failing on an HTTP error or
 * on GraphQL `errors`. Create it BEFORE the click that sends the mutation.
 * The UI is asserted afterwards; this only makes a server refusal fail at
 * the click that caused it, with the server's message, instead of as a
 * missing element three steps later.
 */
export const expectMutationAnswered = (
  page: Page,
  fieldName: string
): (() => Promise<void>) => {
  const answered = page.waitForResponse(
    response =>
      response.url().includes('graphql') &&
      response.request().method() === 'POST' &&
      (response.request().postData() ?? '').includes(`${fieldName}(`),
    { timeout: 60_000 }
  );
  return async () => {
    const response = await answered;
    expect(response.ok(), `${fieldName} HTTP status`).toBe(true);
    const body = (await response.json().catch(() => ({}))) as { errors?: unknown[] };
    expect(body.errors, `${fieldName} GraphQL errors`).toBeUndefined();
  };
};

/** Ids of the users holding `role` on a role set, read by the platform admin. */
export const userIdsInRole = async (
  roleSetId: string,
  role: RoleName = RoleName.Member,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
): Promise<string[]> => {
  const data = must(
    await readRoleSetUsersInRole(roleSetId, role, actor),
    `readRoleSetUsersInRole(${roleSetId}, ${role})`
  );
  return (data.lookup.roleSet?.usersInRole ?? []).map(u => u.id);
};

/**
 * Tears a seeded scenario down so that a leak FAILS the hook: the space tree
 * goes leaves-first through `deleteSpaceTree` (which throws, and also removes
 * subspaces a walk created in the UI), then the factory removes the rest
 * (organization) — its own errors are logged, not thrown, which is why the
 * spaces are not left to it. Safe on a half-built or already-removed scenario.
 */
export const teardownScenario = async (
  scenario: OrganizationWithSpaceModel | undefined
): Promise<void> => {
  if (!scenario) return;
  const nameId = scenario.space?.nameId;
  try {
    await deleteSpaceTree(scenario.space?.id ?? '');
    if (nameId) console.info(`[teardown] space tree '${nameId}' removed`);
  } finally {
    if (scenario.space) scenario.space.id = '';
    if (scenario.subspace) scenario.subspace.id = '';
    if (scenario.subsubspace) scenario.subsubspace.id = '';
    await TestScenarioFactory.cleanUpBaseScenario(scenario);
  }
};
