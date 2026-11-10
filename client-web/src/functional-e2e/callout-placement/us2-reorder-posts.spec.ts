// spec: client-web/src/functional-e2e/callout-placement/callout-placement-test-plan.md
// W2 journey 6 (docs/qa/server-rebuild/plan.md § W2), post order:
// RO-1 Move to Top, RO-2 Move Down, RO-3 a member is not offered reorder.

import { test, expect } from '@playwright/test';
import {
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  get,
  openPhaseTab,
  openPostMenu,
  orderOf,
  phases,
  placement,
  renderFeed,
  seededHeadings,
  seedPlacementSpace,
  seedPost,
  tabEnds,
} from './callout-placement.helpers';

/**
 * Three posts (A, B, C) in the first phase, one (K) in the last. Each create
 * lands on top, so the seeded order is A, B, C, but no case assumes it: every
 * case reads the stored order first and speaks of [x, y, z] (top to bottom).
 * A template post such as "Welcome" may sit below the seeded three in the same
 * tab, so the boundary cases (BVA) find the tab's first and last post through
 * the stored order (`tabEnds`), never by assuming which post it is.
 *   admin `space.admin` · member `space.member`
 */
const uid = UniqueIDGenerator.getID();
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let member: PersonaPage | undefined;
/** The phase the posts under test were seeded in; the bare Space URL may open another. */
let firstPhase = '';
const ids: { A?: string; B?: string; C?: string; K?: string } = {};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  scenario = await seedPlacementSpace('ro', uid);
  const { first, last } = await phases(scenario.space.id);
  firstPhase = first.displayName;
  const set = scenario.space.collaboration.calloutsSetId;
  ids.C = await seedPost(set, `J6 C ${uid}`, first.displayName);
  ids.B = await seedPost(set, `J6 B ${uid}`, first.displayName);
  ids.A = await seedPost(set, `J6 A ${uid}`, first.displayName);
  ids.K = await seedPost(set, `J6 K ${uid}`, last.displayName);
  admin = await openPersonaPage(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
  member = await openPersonaPage(
    browser,
    TestUserManager.users.spaceMember.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  // Teardown runs even when a context is already gone, so a failed run cannot leak the Space.
  try {
    await admin?.close();
    await member?.close();
  } finally {
    await teardownScenario(scenario);
    scenario = undefined;
  }
});

const space = () => scenario!.space;
const calloutsSetId = () => space().collaboration.calloutsSetId;
const trio = () => [ids.A!, ids.B!, ids.C!];

/** The stored order of A, B, C as the member sees it: ids top to bottom, and their titles. */
const storedOrder = async () => {
  const map = await placement(calloutsSetId(), TestUser.SPACE_MEMBER);
  const order = orderOf(map, trio());
  return { map, order, names: order.map(id => get(map, id).name) };
};

test('RO-1 — Move to Top on the lowest of three posts, stored and seen by the member', async () => {
  const {
    order: [x, y, z],
    names: [nx, ny, nz],
  } = await storedOrder();
  const page = admin!.page;

  await page.goto(`${baseUrl}/${space().nameId}`);
  await openPhaseTab(page, firstPhase);
  await renderFeed(page, trio());
  await expect(seededHeadings(page, uid)).toHaveText([nx, ny, nz]);

  // BVA, last position: the tab's last post can move up but not down.
  const adminView = await placement(calloutsSetId(), TestUser.SPACE_ADMIN);
  const { bottom } = tabEnds(adminView, firstPhase);
  await renderFeed(page, [bottom]);
  const lastMenu = await openPostMenu(page, get(adminView, bottom).name);
  await expect(
    lastMenu.getByRole('menuitem', { name: 'Move Up', exact: true })
  ).toBeVisible();
  for (const item of ['Move Down', 'Move to Bottom']) {
    await expect(
      lastMenu.getByRole('menuitem', { name: item, exact: true }),
      item
    ).toHaveCount(0);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();

  const menu = await openPostMenu(page, nz);
  await expect(
    menu.getByRole('menuitem', { name: 'Move to Top', exact: true })
  ).toBeVisible();
  await expect(
    menu.getByRole('menuitem', { name: 'Move Up', exact: true })
  ).toBeVisible();
  const answered = expectMutationAnswered(page, 'updateCalloutsSortOrder');
  await menu
    .getByRole('menuitem', { name: 'Move to Top', exact: true })
    .click();
  await answered();

  // In place, before any reload (a client that only reorders after a reload is a defect).
  await expect(seededHeadings(page, uid)).toHaveText([nz, nx, ny]);
  await page.reload();
  await openPhaseTab(page, firstPhase);
  await renderFeed(page, trio());
  await expect(seededHeadings(page, uid)).toHaveText([nz, nx, ny]);

  await expect.poll(async () => (await storedOrder()).order).toEqual([z, x, y]);
  const { map } = await storedOrder();
  expect(get(map, z).sortOrder).toBeLessThan(get(map, x).sortOrder);
  expect(get(map, x).sortOrder).toBeLessThan(get(map, y).sortOrder);

  const viewer = member!.page;
  await viewer.goto(`${baseUrl}/${space().nameId}`);
  await openPhaseTab(viewer, firstPhase);
  await renderFeed(viewer, trio());
  await expect(seededHeadings(viewer, uid)).toHaveText([nz, nx, ny]);
});

test('RO-2 — Move Down on the top post swaps it with the next and leaves other phases untouched', async () => {
  const {
    map: before,
    order: [x, y, z],
    names: [nx, ny, nz],
  } = await storedOrder();
  const K = ids.K!;
  const K0 = { ...get(before, K) };
  const page = admin!.page;
  // Every create lands on top, so the top seeded post is the tab's first post.
  expect(
    tabEnds(await placement(calloutsSetId(), TestUser.SPACE_ADMIN), firstPhase)
      .top,
    'the top seeded post is the first post of its tab'
  ).toBe(x);

  await page.goto(`${baseUrl}/${space().nameId}`);
  await openPhaseTab(page, firstPhase);
  await renderFeed(page, trio());
  await expect(seededHeadings(page, uid)).toHaveText([nx, ny, nz]);

  const menu = await openPostMenu(page, nx);
  await expect(
    menu.getByRole('menuitem', { name: 'Move Down', exact: true })
  ).toBeVisible();
  // BVA, first position: the tab's first post can move down but not up.
  for (const item of ['Move to Top', 'Move Up']) {
    await expect(
      menu.getByRole('menuitem', { name: item, exact: true }),
      item
    ).toHaveCount(0);
  }
  const answered = expectMutationAnswered(page, 'updateCalloutsSortOrder');
  await menu.getByRole('menuitem', { name: 'Move Down', exact: true }).click();
  await answered();
  await expect(seededHeadings(page, uid)).toHaveText([ny, nx, nz]);

  await expect.poll(async () => (await storedOrder()).order).toEqual([y, x, z]);
  const { map } = await storedOrder();
  expect(get(map, y).sortOrder).toBeLessThan(get(map, x).sortOrder);
  expect(get(map, x).sortOrder).toBeLessThan(get(map, z).sortOrder);
  // The client sends only this tab's ids; the post in the other phase must not move.
  expect(get(map, K).sortOrder).toBe(K0.sortOrder);
  expect(get(map, K).phase).toBe(K0.phase);

  const viewer = member!.page;
  await viewer.goto(`${baseUrl}/${space().nameId}`);
  await openPhaseTab(viewer, firstPhase);
  await renderFeed(viewer, trio());
  await expect(seededHeadings(viewer, uid)).toHaveText([ny, nx, nz]);
});

test('RO-3 — a member is not offered reorder, edit or delete on a post', async () => {
  const { names } = await storedOrder();
  const middle = names[1];
  const page = member!.page;

  // The Move items follow the callouts set's UPDATE privilege. While that query
  // loads they are hidden, so an absence read earlier would be vacuous.
  const authorized = page.waitForResponse(
    response =>
      response.url().includes('graphql') &&
      response.request().method() === 'POST' &&
      (response.request().postData() ?? '').includes('CalloutsSetAuthorization')
  );
  await page.goto(`${baseUrl}/${space().nameId}`);
  await authorized;
  await openPhaseTab(page, firstPhase);
  await renderFeed(page, trio());
  await expect(seededHeadings(page, uid)).toHaveText(names);

  const menu = await openPostMenu(page, middle);
  // Positive control: the menu rendered.
  await expect(
    menu.getByRole('menuitem', { name: 'Share', exact: true })
  ).toBeVisible();
  for (const item of [
    'Move to Top',
    'Move Up',
    'Move Down',
    'Move to Bottom',
    'Edit',
    'Delete',
  ]) {
    await expect(
      menu.getByRole('menuitem', { name: item, exact: true }),
      item
    ).toHaveCount(0);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
});
