// spec: client-web/src/functional-e2e/profile-editing/profile-editing-test-plan.md
// W2 journey 7 (docs/qa/server-rebuild/plan.md § W2), a Space's About.
//
// `space.admin` edits the Space's About in Space Settings → About; the oracle
// is the reloaded tab, one `readSpaceAbout` read-back, and what a NON-MEMBER
// (`non.space`) is shown: the Space is private, so the non-member is routed to
// `/<nameID>/about` and reads the About dialog — the strictest public read.
// The cases read their own starting state from the server and have no order.

import { test, expect } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  aboutDialog,
  addTags,
  baseUrl,
  chipButtons,
  openAboutTab,
  openPersonaPage,
  openSettingsSection,
  removeLastTag,
  saveWith,
  seedAboutSpace,
  serverAbout,
  sorted,
  spaceNameField,
  spaceTagsInput,
  spaceTaglineField,
  teardownScenario,
  uid,
  whatEditor,
  whyEditor,
  type PersonaPage,
} from './profile-editing.helpers';

const RUN = uid();

let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  scenario = await seedAboutSpace(RUN);
  admin = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const space = () => scenario!.space;

test.describe('W2 journey 7 — a Space About, edited in Space Settings', () => {
  test('C2-1 the admin changes the Space name, tagline, What and Why; the server keeps them and a non-member is shown them', async ({
    browser,
  }) => {
    const page = admin!.page;
    const newName = `W2 About ${RUN}`;
    const newTagline = `Tagline ${RUN}`;
    const what = `WHAT ${RUN}`;
    const why = `WHY ${RUN}`;

    // Do not assume the seed's names or text: read the starting state.
    const before = await serverAbout(space().id);
    const oldName = before.profile.displayName;
    expect(oldName).not.toBe(newName);

    await openAboutTab(page, space().nameId);
    await spaceNameField(page).fill(newName);
    await spaceTaglineField(page).fill(newTagline);
    await openSettingsSection(page, 'Context');
    await whatEditor(page).fill(what);
    await whyEditor(page).fill(why);

    // Exactly four edits: the client registered every field, so a missing one
    // later is the server's.
    await saveWith(page, 'updateSpace', '4 unsaved changes');

    await page.reload();
    await expect(spaceNameField(page)).toHaveValue(newName);
    await expect(spaceTaglineField(page)).toHaveValue(newTagline);
    await openSettingsSection(page, 'Context');
    await expect(whatEditor(page)).toContainText(what);
    await expect(whyEditor(page)).toContainText(why);

    // The server holds all four; an untouched field is not wiped.
    const after = await serverAbout(space().id);
    expect(after.profile.displayName).toBe(newName);
    expect(after.profile.tagline).toBe(newTagline);
    expect(after.profile.description).toContain(what);
    expect(after.why).toContain(why);
    expect(after.who).toBe(before.who);

    const viewer = await openPersonaPage(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
    try {
      await viewer.page.goto(`${baseUrl}/${space().nameId}`);
      const dialog = aboutDialog(viewer.page, newName);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(newTagline, { exact: true })).toBeVisible();
      await expect(dialog.getByText(what)).toBeVisible();
      await expect(dialog.getByText(why)).toBeVisible();
      // Absence, with the positive control above: no About is served under
      // the old name (a stale About for another actor).
      await expect(aboutDialog(viewer.page, oldName)).toHaveCount(0);
    } finally {
      await viewer.close();
    }
  });

  test('C2-2 Space tags are replaced, not merged, and the viewer sees exactly the stored set', async ({
    browser,
  }) => {
    const page = admin!.page;
    const t1 = `tag-a-${RUN}`;
    const t2 = `tag-b-${RUN}`;
    const t3 = `tag-c-${RUN}`;

    // The client sends tags only when the About's tagset id is known, and
    // silently sends nothing otherwise: the id is the precondition.
    const start = (await serverAbout(space().id)).profile.tagset;
    expect(start?.id).toBeTruthy();
    expect(start?.tags).toEqual([]);

    await openAboutTab(page, space().nameId);
    await openSettingsSection(page, 'Tags');
    await addTags(spaceTagsInput(page), [t1, t2]);
    // The tag field counts as one change.
    await saveWith(page, 'updateSpace', '1 unsaved change');

    // A: both tags stored.
    const first = (await serverAbout(space().id)).profile.tagset!.tags;
    expect(sorted(first)).toEqual(sorted([t1, t2]));

    // Remove the last chip (t2) from the keyboard and add t3.
    await removeLastTag(spaceTagsInput(page), t2);
    await addTags(spaceTagsInput(page), [t3]);
    await saveWith(page, 'updateSpace', '1 unsaved change');

    // B: replaced, not merged — a merge would leave t2.
    const about = await serverAbout(space().id);
    const stored = about.profile.tagset!.tags;
    expect(sorted(stored)).toEqual(sorted([t1, t3]));

    await page.reload();
    await openSettingsSection(page, 'Tags');
    await expect(chipButtons(page, t1)).toHaveCount(2);
    await expect(chipButtons(page, t3)).toHaveCount(2);
    await expect(chipButtons(page, t2)).toHaveCount(0);

    // The viewer's About lists exactly the stored set, in the server's order
    // (ruling R-5). Take the name from the read-back: C2-1 may have renamed
    // the Space, and the cases have no fixed order.
    const viewer = await openPersonaPage(
      browser,
      TestUserManager.users.nonSpaceMember.email
    );
    try {
      await viewer.page.goto(`${baseUrl}/${space().nameId}`);
      const dialog = aboutDialog(viewer.page, about.profile.displayName);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole('list', { name: 'Tags' }).getByRole('listitem')
      ).toHaveText(stored);
    } finally {
      await viewer.close();
    }
  });
});
