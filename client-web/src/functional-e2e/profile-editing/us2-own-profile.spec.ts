// spec: client-web/src/functional-e2e/profile-editing/profile-editing-test-plan.md
// W2 journey 7 (docs/qa/server-rebuild/plan.md § W2), the user's own profile.
// G2-1 moved here from `user-profile/update-basic-information.spec.ts` (Tier 1
// item 15): it used to rename the shared `admin` persona with no read-back.
//
// Every edit is made on a disposable user registered in beforeAll; the shared
// personas are only signed in to look. The oracle for each write is the
// reloaded tab, one `getUserData` read-back (by the id from registration, never
// by a nameID typed into a URL), and what ANOTHER signed-in user is shown.
//
// client-web#10437: the fields are plain labelled inputs; nothing saves per
// field. Edits are buffered on the tab and committed by the bottom "Unsaved
// changes" bar. The proof of a save is the reloaded page and the read-back:
// the toast alone could lie about persistence.

import { test, expect, type Page } from '@playwright/test';
import { getUserData, TestUserManager } from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import { UserProfileSettingsPage } from '../user-profile/user-profile-settings.page';
import {
  addTags,
  baseUrl,
  chipButtons,
  deleteDisposableUser,
  openPersonaPage,
  registerDisposableUser,
  removeLastTag,
  runCleanup,
  saveWith,
  sorted,
  tagsInput,
  tagsOf,
  uid,
  unsavedChangesBar,
  type DisposableUser,
  type PersonaPage,
} from './profile-editing.helpers';

const RUN = uid();

const SKILLS_PLACEHOLDER = 'e.g. UX research, TypeScript, facilitation';
const KEYWORDS_PLACEHOLDER = 'e.g. climate, governance, open source';

let self: DisposableUser | undefined;
let selfPage: PersonaPage | undefined;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  // Recorded at once, so a half-failed beforeAll is still cleaned.
  self = await registerDisposableUser(`profile ${RUN}`);
  selfPage = await openPersonaPage(browser, self.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await runCleanup([
    ['close self', () => selfPage?.close() ?? Promise.resolve()],
    ['delete user', () => deleteDisposableUser(self)],
  ]);
});

const serverUser = async () =>
  must(await getUserData(self!.id), `getUserData(${self!.email})`).user;

/** The user's public profile, seen by `space.member` (a read-only persona). */
const withViewer = async (
  browser: Parameters<Parameters<typeof test>[2]>[0]['browser'],
  body: (page: Page) => Promise<void>
) => {
  const viewer = await openPersonaPage(
    browser,
    TestUserManager.users.spaceMember.email
  );
  try {
    await viewer.page.goto(`${baseUrl}/user/${self!.nameId}`);
    await expect(
      viewer.page.getByRole('heading', {
        level: 1,
        name: self!.displayName,
        exact: true,
      })
    ).toBeVisible();
    await body(viewer.page);
  } finally {
    await viewer.close();
  }
};

test.describe('My Profile Tab - View and Edit', () => {
  test('G2-1 Update Basic Information: first and last name are saved, survive a reload and read back', async () => {
    const page = selfPage!.page;
    const first = `First${RUN}`;
    const last = `Last${RUN}`;
    const profile = new UserProfileSettingsPage(page);

    await profile.goto(self!.nameId);

    // The bar appears with the edit count as soon as a field differs from its
    // saved value.
    await expect(profile.unsavedChangesBar).toBeHidden();
    await profile.fillField('First Name', first);
    await expect(profile.unsavedChangesBar).toBeVisible();
    await expect(
      profile.unsavedChangesBar.getByText('1 unsaved change', { exact: true })
    ).toBeVisible();
    await profile.fillField('Last Name', last);
    await expect(
      profile.unsavedChangesBar.getByText('2 unsaved changes', { exact: true })
    ).toBeVisible();

    // Save through the bar; the server's answer and the "Changes saved" toast
    // confirm the commit. saveWith parks the pointer so the toast can leave
    // (a toast under a resting pointer never dismisses: red on test-alkem.io).
    await saveWith(page, 'updateUser', '2 unsaved changes');

    // The values survive a reload, and the server holds them (first and last
    // name are user fields, not profile fields).
    await profile.reload();
    await expect(profile.field('First Name')).toHaveValue(first);
    await expect(profile.field('Last Name')).toHaveValue(last);

    const stored = await serverUser();
    expect([stored.firstName, stored.lastName]).toEqual([first, last]);
  });

  test('G2-2 bio and location are saved, and another signed-in user sees them on the public profile', async ({
    browser,
  }) => {
    const page = selfPage!.page;
    const bio = `BIO ${RUN}`;
    const profile = new UserProfileSettingsPage(page);

    await profile.goto(self!.nameId);
    await profile.openSection('About You');

    // The city is free text; the test does not depend on the client's
    // suggestion bundle. Escape closes any suggestion list that opened.
    await profile.cityCombobox.fill('Utrecht');
    await profile.cityCombobox.press('Escape');
    await profile.pickCountry('Netherlands');
    await page.getByRole('textbox', { name: 'Formatting toolbar' }).fill(bio);

    // City, country and bio are separate scalar fields in the tab's diff.
    await saveWith(page, 'updateUser', '3 unsaved changes');

    await profile.reload();
    await profile.openSection('About You');
    await expect(profile.cityCombobox).toHaveValue('Utrecht');
    await expect(profile.countryCombobox).toContainText('Netherlands');
    await expect(
      page.getByRole('textbox', { name: 'Formatting toolbar' })
    ).toContainText(bio);

    const stored = (await serverUser()).profile;
    expect(stored?.location).toEqual({ city: 'Utrecht', country: 'NL' });
    expect(stored?.description).toContain(bio);

    await withViewer(browser, async viewerPage => {
      const main = viewerPage.getByRole('main');
      await expect(main.getByText('Utrecht, NL', { exact: true })).toBeVisible();
      await expect(main.getByText(bio)).toBeVisible();
    });
  });

  test('G2-3 skills and keywords go to their own tagsets and are replaced, not merged', async ({
    browser,
  }) => {
    const page = selfPage!.page;
    const s1 = `skill-a-${RUN}`;
    const s2 = `skill-b-${RUN}`;
    const s3 = `skill-c-${RUN}`;
    const k1 = `kw-a-${RUN}`;
    const profile = new UserProfileSettingsPage(page);

    // Precondition: a fresh user has both reserved tagsets, and they are empty.
    const before = (await serverUser()).profile?.tagsets;
    expect(tagsOf(before, 'skills')).toEqual([]);
    expect(tagsOf(before, 'keywords')).toEqual([]);

    await profile.goto(self!.nameId);
    await profile.openSection('About You');
    const skills = tagsInput(page, SKILLS_PLACEHOLDER);
    const keywords = tagsInput(page, KEYWORDS_PLACEHOLDER);
    await addTags(skills, [s1, s2]);
    await addTags(keywords, [k1]);
    // Each tagset counts as one change.
    await saveWith(page, 'updateUser', '2 unsaved changes');

    // A: both tagsets hold what was typed, each in its own tagset.
    const afterFirst = (await serverUser()).profile?.tagsets;
    expect(tagsOf(afterFirst, 'skills')).toEqual(sorted([s1, s2]));
    expect(tagsOf(afterFirst, 'keywords')).toEqual([k1]);

    // Remove the last skill (s2) from the keyboard and add s3.
    await removeLastTag(skills, s2);
    await addTags(skills, [s3]);
    await saveWith(page, 'updateUser', '1 unsaved change');

    // B: replaced, not merged (a merge would leave s2); keywords untouched.
    const afterSecond = (await serverUser()).profile?.tagsets;
    expect(tagsOf(afterSecond, 'skills')).toEqual(sorted([s1, s3]));
    expect(tagsOf(afterSecond, 'keywords')).toEqual([k1]);

    await profile.reload();
    await profile.openSection('About You');
    await expect(chipButtons(page, s1)).toHaveCount(2);
    await expect(chipButtons(page, s3)).toHaveCount(2);
    await expect(chipButtons(page, k1)).toHaveCount(2);
    await expect(chipButtons(page, s2)).toHaveCount(0);
    await expect(unsavedChangesBar(page)).toBeHidden();

    // The viewer's groups, in the order the server returned them (ruling R-5:
    // order comes from the server, not from typing). The tag list's hidden
    // measuring mirror is aria-hidden, so role queries see only the real chips.
    const inServerOrder = (name: 'skills' | 'keywords') =>
      (afterSecond ?? []).find(t => t.name.toLowerCase() === name)!.tags;
    await withViewer(browser, async viewerPage => {
      const chips = (heading: string) =>
        viewerPage
          .getByRole('listitem')
          .filter({
            has: viewerPage.getByRole('heading', {
              level: 3,
              name: heading,
              exact: true,
            }),
          })
          .getByRole('list')
          .getByRole('listitem');
      await expect(chips('Skills')).toHaveText(inServerOrder('skills'));
      await expect(chips('Keywords')).toHaveText(inServerOrder('keywords'));
    });
  });
});
