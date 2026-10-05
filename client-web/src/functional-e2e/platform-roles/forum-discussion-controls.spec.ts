// workspace#027 — platform role redesign. Manual checklist E5 + the forum half
// of A15, automated: who is offered edit / delete on a forum discussion.
//  - Platform Support owns the forum (PLATFORM_FORUM_MANAGE on every discussion)
//    and must be offered the controls;
//  - an author holds only READ + CONTRIBUTE on their own discussion since 027
//    (a server decision recorded as E5), so the client is right to offer none.
// The discussion is created by a Feature-role user and deleted through the API
// at the end, whatever happened in between.
import { expect, test as base, type Page } from '@playwright/test';
import { platformRoleEmail, seedPlatformRoleUsers, TestUserManager } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const title = `pr-forum-${Math.random().toString(36).slice(2, 7)}`;
let discussionUrl = '';

base.beforeAll(async () => {
  await TestUserManager.populateUserModelMap();
  await seedPlatformRoleUsers();
});
base.afterAll(async () => {
  // Delete by title prefix as the bootstrap admin, so a failed test cannot leave it behind.
  const gql = `${baseUrl}/api/private/non-interactive/graphql`;
  const run = async (query: string, variables: Record<string, unknown> = {}) =>
    (
      await fetch(gql, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}`,
        },
        body: JSON.stringify({ query, variables }),
      })
    ).json();
  const list = await run('{ platform { forum { discussions { id nameID } } } }');
  const mine: { id: string; nameID: string }[] = list.data?.platform.forum.discussions ?? [];
  for (const d of mine.filter(d => d.nameID.startsWith(title))) {
    await run('mutation($id: UUID!) { deleteDiscussion(deleteData: { ID: $id }) { id } }', { id: d.id });
  }
});

const editOrDelete = (page: Page) =>
  page.getByRole('main').getByRole('button', { name: /^(edit|delete)/i }).or(page.getByRole('menuitem', { name: /edit|delete/i }));

const asAuthor = createPersonaTest(platformRoleEmail('FEATURE_BETA_TESTER'));
asAuthor.describe.configure({ mode: 'serial' });
asAuthor('an author creates a discussion and is offered no edit / delete on it (E5)', async ({ page }) => {
  await page.goto(`${baseUrl}/forum`);
  await page.getByRole('main').getByRole('button', { name: 'Initiate Discussion' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Title' }).fill(title);
  await dialog.getByRole('combobox', { name: /Category/ }).click();
  await page.getByRole('option').first().click();
  await dialog.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type('Created by the 027 acceptance suite.');
  const created = page.waitForResponse(
    r => r.url().includes('/graphql') && r.request().postDataJSON()?.operationName === 'createDiscussion'
  );
  await dialog.getByRole('button', { name: 'Create Discussion', exact: true }).click();
  expect((await (await created).json()).errors).toBeUndefined();
  await expect(page).toHaveURL(/\/forum\/discussion\//, { timeout: 20_000 });
  discussionUrl = page.url();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(editOrDelete(page)).toHaveCount(0);
});

const asSupport = createPersonaTest(platformRoleEmail('PLATFORM_SUPPORT'));
asSupport('PLATFORM_SUPPORT, who manages the forum, is offered edit and delete on it', async ({ page }) => {
  // KNOWN CLIENT DEFECT (027, E28): the server grants Support
  // PLATFORM_FORUM_MANAGE on every discussion (the API suite proves update and
  // delete work), but the discussion page shows Support the same controls as a
  // reader: "Add reaction" and nothing else. Expected to fail until the client
  // keys the controls on that privilege.
  asSupport.fail(true, 'client-web 027: discussion page ignores PLATFORM_FORUM_MANAGE');
  expect(discussionUrl, 'the author test must have created the discussion').not.toBe('');
  await page.goto(discussionUrl);
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 });
  const more = page.getByRole('main').getByRole('button', { name: /more|options|actions/i });
  if (await more.count()) await more.first().click();
  await expect(editOrDelete(page).first()).toBeVisible({ timeout: 5_000 });
});
