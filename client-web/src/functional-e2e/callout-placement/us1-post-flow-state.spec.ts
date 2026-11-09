// spec: client-web/src/functional-e2e/callout-placement/callout-placement-test-plan.md
// W2 journey 6 (docs/qa/server-rebuild/plan.md § W2), a post's phase:
// FS-1 move a post to the last phase, FS-2 rename the last phase.

import { test, expect } from '@playwright/test';
import {
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  baseUrl,
  calloutHeading,
  expectMutationAnswered,
  openPersonaPage,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  get,
  layoutColumn,
  layoutRow,
  openLayout,
  openPhaseTab,
  phases,
  placement,
  renderFeed,
  saveUnsaved,
  seededHeadings,
  seedPlacementSpace,
  seedPost,
} from './callout-placement.helpers';

/**
 * A post sits in the phase named by its FLOW_STATE tag. Both cases change that
 * through the admin's browser, read the tag back as the member sees it
 * (`readCalloutsPlacement`), then check the member's tabs.
 *
 *   A  "stay"  first phase, created first
 *   P  "move"  first phase
 *   K  "dest"  last phase
 *
 * Each case reads the phase names at its start and asserts only on posts it
 * can name, so neither depends on the other having run.
 *   admin `space.admin` · member `space.member`
 */
const uid = UniqueIDGenerator.getID();
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let member: PersonaPage | undefined;
const ids: { A?: string; P?: string; K?: string } = {};

const stay = `J6 stay ${uid}`;
const move = `J6 move ${uid}`;
const dest = `J6 dest ${uid}`;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  scenario = await seedPlacementSpace('fs', uid);
  const { first, last } = await phases(scenario.space.id);
  const set = scenario.space.collaboration.calloutsSetId;
  ids.A = await seedPost(set, stay, first.displayName);
  ids.P = await seedPost(set, move, first.displayName);
  ids.K = await seedPost(set, dest, last.displayName);
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

test('FS-1 — admin moves a post to the last phase in Settings › Layout, and the member sees it there', async () => {
  const { first, last } = await phases(space().id);
  const [A, P, K] = [ids.A!, ids.P!, ids.K!];
  const page = admin!.page;

  await openLayout(page, space().nameId);
  await expect(
    layoutColumn(page, first.displayName).getByText(move, { exact: true })
  ).toBeVisible();

  // The row menu is opacity 0 until hovered or focused.
  await layoutRow(page, P).hover();
  await layoutRow(page, P)
    .getByRole('button', { name: 'Post actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Move to' }).click();
  await page
    .getByRole('menuitem', { name: last.displayName, exact: true })
    .click();
  await expect(
    layoutColumn(page, last.displayName).getByText(move, { exact: true })
  ).toBeVisible();

  // `updateCallout(` does not match `updateCalloutsSortOrder(`: the next character is `s`.
  await saveUnsaved(page, ['updateCallout', 'updateCalloutsSortOrder']);

  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Add tab', exact: true })
  ).toBeVisible();
  await expect(
    layoutColumn(page, last.displayName).getByText(move, { exact: true })
  ).toBeVisible();
  await expect(
    layoutColumn(page, first.displayName).getByText(move, { exact: true })
  ).toHaveCount(0);
  // Positive control for the same column: the post left behind is still there.
  await expect(
    layoutColumn(page, first.displayName).getByText(stay, { exact: true })
  ).toBeVisible();

  // Layout's Move to appends the post to the end of the destination (ruling R-1).
  await expect
    .poll(async () => {
      const map = await placement(calloutsSetId(), TestUser.SPACE_MEMBER);
      return {
        P: get(map, P).phase,
        A: get(map, A).phase,
        K: get(map, K).phase,
        pAfterK: get(map, P).sortOrder > get(map, K).sortOrder,
      };
    })
    .toEqual({
      P: last.displayName,
      A: first.displayName,
      K: last.displayName,
      pAfterK: true,
    });

  const viewer = member!.page;
  await viewer.goto(`${baseUrl}/${space().nameId}`);
  await openPhaseTab(viewer, last.displayName);
  await renderFeed(viewer, [K, P]);
  await expect(seededHeadings(viewer, uid)).toHaveText([dest, move]);

  await openPhaseTab(viewer, first.displayName);
  await renderFeed(viewer, [A]);
  // Positive control: this tab's feed rendered.
  await expect(calloutHeading(viewer, stay)).toBeVisible();
  await expect(calloutHeading(viewer, move)).toHaveCount(0);
});

test('FS-2 — renaming the last phase keeps its posts in it', async () => {
  const { last } = await phases(space().id);
  const K = ids.K!;
  const newName = `Phase ${uid}`;
  const page = admin!.page;

  await openLayout(page, space().nameId);
  // The column header's pencil and the description's pencil are both named
  // "Edit Details"; the column menu carries the one item.
  await layoutColumn(page, last.displayName)
    .getByRole('button', { name: 'Column actions', exact: true })
    .click();
  await page
    .getByRole('menuitem', { name: 'Edit Details', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Edit Details: Flow Phase' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Title' }).fill(newName);
  // `updateInnovationFlowState(` does not match `updateInnovationFlowStateSettings(`.
  const answered = expectMutationAnswered(page, 'updateInnovationFlowState');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await answered();
  await expect(dialog).toBeHidden();

  // The client also retags each post in the phase; the read-back, not those requests, is the oracle.
  await expect
    .poll(
      async () =>
        get(await placement(calloutsSetId(), TestUser.SPACE_MEMBER), K).phase
    )
    .toBe(newName);

  const viewer = member!.page;
  await viewer.goto(`${baseUrl}/${space().nameId}`);
  // Positive control: the renamed tab exists.
  await expect(
    viewer.getByRole('tab', { name: newName, exact: true })
  ).toBeVisible();
  await expect(
    viewer.getByRole('tab', { name: last.displayName, exact: true })
  ).toHaveCount(0);
  await openPhaseTab(viewer, newName);
  await renderFeed(viewer, [K]);
  await expect(calloutHeading(viewer, dest)).toBeVisible();
});
