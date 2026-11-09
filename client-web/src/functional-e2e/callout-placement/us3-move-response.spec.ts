// spec: client-web/src/functional-e2e/callout-placement/callout-placement-test-plan.md
// W2 journey 6 (docs/qa/server-rebuild/plan.md § W2), moving a response:
// MC-1 the admin moves the member's response to a post in another phase,
// MC-2 the author is not offered the move.

import { test, expect } from '@playwright/test';
import {
  CalloutContributionType,
  createContributionOnCallout,
  readCalloutContributions,
  readMyUser,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  openPhaseTab,
  phases,
  postCard,
  renderFeed,
  seedPlacementSpace,
  seedPost,
} from './callout-placement.helpers';

/**
 * A response (a post-type contribution) belongs to one post. The admin's Edit
 * Post dialog carries a "Post location" select that moves it to another
 * post-collecting post of the same Space; the member, who authored it, is not
 * offered the move.
 *
 *   S "source"  first phase, collects posts
 *   L "links"   first phase, collects LINKS only (must not be offered as a target)
 *   T "target"  last phase, collects posts
 *   R  "moved reply" and R2 "kept reply", both authored by the member in S
 *
 * R2 is never moved or edited, so MC-2 can run before or after MC-1.
 *   admin `space.admin` · member `space.member`
 */
const uid = UniqueIDGenerator.getID();
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let member: PersonaPage | undefined;
const ids: { S?: string; L?: string; T?: string; R?: string; R2?: string } = {};
let memberName = '';

const source = `J6 source ${uid}`;
const links = `J6 links ${uid}`;
const target = `J6 target ${uid}`;
const movedReply = `J6 moved reply ${uid}`;
const keptReply = `J6 kept reply ${uid}`;

const reply = async (calloutID: string, displayName: string): Promise<string> =>
  must(
    await createContributionOnCallout(
      {
        calloutID,
        type: CalloutContributionType.Post,
        post: { profileData: { displayName, description: 'J6 reply' } },
      },
      TestUser.SPACE_MEMBER
    ),
    `createContributionOnCallout(${displayName})`
  ).createContributionOnCallout.id;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  scenario = await seedPlacementSpace('mc', uid);
  const { first, last } = await phases(scenario.space.id);
  const set = scenario.space.collaboration.calloutsSetId;
  ids.S = await seedPost(set, source, first.displayName);
  ids.L = await seedPost(set, links, first.displayName, [
    CalloutContributionType.Link,
  ]);
  ids.T = await seedPost(set, target, last.displayName);
  ids.R = await reply(ids.S, movedReply);
  ids.R2 = await reply(ids.S, keptReply);
  const me = must(await readMyUser(TestUser.SPACE_MEMBER), 'readMyUser').me
    .user;
  memberName = me?.profile?.displayName ?? '';
  if (!memberName)
    throw new Error('the member has no display name to look for');
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

/** The display names of the responses a post holds, as `actor` reads them. */
const responsesOf = async (calloutId: string, actor: TestUser) =>
  must(
    await readCalloutContributions(calloutId, actor),
    `readCalloutContributions(${calloutId})`
  ).lookup.callout?.contributions.map(c => ({
    id: c.id,
    name: c.post?.profile.displayName,
  })) ?? [];

test("MC-1 — admin moves the member's response to a post in another phase", async () => {
  const { last } = await phases(space().id);
  const [S, T, R] = [ids.S!, ids.T!, ids.R!];
  const page = admin!.page;

  await page.goto(`${baseUrl}/${space().nameId}`);
  await renderFeed(page, [S]);
  await postCard(page, source)
    .getByRole('button', { name: new RegExp(`^${movedReply}`) })
    .click();
  await page
    .getByRole('region', { name: 'Selected contribution preview' })
    .getByRole('button', { name: 'Edit response', exact: true })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Edit Post' });
  await expect(dialog.getByRole('textbox', { name: 'Title' })).toHaveValue(
    movedReply
  );
  await expect(
    dialog.getByText('Post location', { exact: true })
  ).toBeVisible();

  // The Post location select has no accessible name (its <Label> is not linked
  // to it: ruling R-6), so it is found by the value it currently shows.
  await dialog.getByRole('combobox').filter({ hasText: source }).click();
  const listbox = page.getByRole('listbox');
  await expect(
    listbox.getByRole('option', { name: source, exact: true })
  ).toBeVisible();
  await expect(
    listbox.getByRole('option', { name: target, exact: true })
  ).toBeVisible();
  await expect(
    listbox.getByRole('option', { name: links, exact: true })
  ).toHaveCount(0);
  await listbox.getByRole('option', { name: target, exact: true }).click();

  // The move runs on Save, after `updatePost`.
  const moved = expectMutationAnswered(page, 'moveContributionToCallout');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await moved();
  await expect(
    page.getByText('Response moved successfully.', { exact: true })
  ).toBeVisible();
  await expect(dialog).toBeHidden();

  await expect
    .poll(async () =>
      (await responsesOf(S, TestUser.SPACE_MEMBER)).map(c => c.name)
    )
    .toEqual([keptReply]);
  const inTarget = await responsesOf(T, TestUser.SPACE_MEMBER);
  // The same id, so it was re-parented, not deleted and created again.
  expect(inTarget.filter(c => c.id === R).map(c => c.name)).toEqual([
    movedReply,
  ]);

  const viewer = member!.page;
  await viewer.goto(`${baseUrl}/${space().nameId}`);
  await renderFeed(viewer, [S]);
  // Positive control: the source post's responses rendered.
  await expect(
    postCard(viewer, source).getByRole('button', {
      name: new RegExp(`^${keptReply}`),
    })
  ).toBeVisible();
  await expect(
    postCard(viewer, source).getByRole('button', {
      name: new RegExp(`^${movedReply}`),
    })
  ).toHaveCount(0);
  await openPhaseTab(viewer, last.displayName);
  await renderFeed(viewer, [T]);
  const moved2 = postCard(viewer, target).getByRole('button', {
    name: new RegExp(`^${movedReply}`),
  });
  await expect(moved2).toBeVisible();
  // The author is kept.
  await expect(moved2).toContainText(memberName);
});

test('MC-2 — the author is not offered the move on their own response', async () => {
  const S = ids.S!;
  const page = member!.page;

  await page.goto(`${baseUrl}/${space().nameId}`);
  await renderFeed(page, [S]);
  await postCard(page, source)
    .getByRole('button', { name: new RegExp(`^${keptReply}`) })
    .click();
  // The author holds UPDATE on the response: that the dialog opens at all is the positive control.
  await page
    .getByRole('region', { name: 'Selected contribution preview' })
    .getByRole('button', { name: 'Edit response', exact: true })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Edit Post' });
  // The pre-fill comes from the same `PostSettings` query that carries MOVE_POST.
  await expect(dialog.getByRole('textbox', { name: 'Title' })).toHaveValue(
    keptReply
  );
  await expect(dialog.getByText('Post location', { exact: true })).toHaveCount(
    0
  );
  await expect(dialog.getByRole('combobox')).toHaveCount(0);

  // Not saved: the response must stay as it is for re-runs.
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
});
