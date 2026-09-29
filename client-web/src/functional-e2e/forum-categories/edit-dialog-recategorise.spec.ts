// E-1 (forum-discussions-test-plan.md; US2-AS1/2, SC-002) — an admin
// recategorises an existing forum post through the edit dialog, and the
// change is reflected in the nav back-link and the category listing pages.
// The post is created through the API (GA) and deleted through the API at
// the end, whatever happened in between.
import { expect } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const title = `forum-e2e-move-${Math.random().toString(36).slice(2, 7)}`;
let discussionId = '';
let permalink = '';

const gql = async (query: string, variables: Record<string, unknown> = {}) => {
  const res = await fetch(`${baseUrl}/api/private/non-interactive/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
};

const test = createPersonaTest('admin@alkem.io');

test.beforeAll(async () => {
  await TestUserManager.populateUserModelMap();
  const forumRes = await gql('{ platform { forum { id } } }');
  const forumId = forumRes.data?.platform.forum.id;
  const created = await gql(
    `mutation($createData: ForumCreateDiscussionInput!) {
       createDiscussion(createData: $createData) {
         id
         profile { url }
       }
     }`,
    {
      createData: {
        forumID: forumId,
        profile: { displayName: title, description: 'Created by the forum E2E suite.' },
        category: 'HELP',
      },
    }
  );
  discussionId = created.data?.createDiscussion?.id;
  permalink = created.data?.createDiscussion?.profile?.url;
  expect(discussionId, 'API discussion creation must succeed').toBeTruthy();
});

test.afterAll(async () => {
  if (discussionId) {
    await gql(
      'mutation($id: UUID!) { deleteDiscussion(deleteData: { ID: $id }) { id } }',
      { id: discussionId }
    );
  }
});

test('TC-E1 — admin recategorises through the edit dialog (US2-AS1/2, SC-002)', async ({
  page,
}) => {
  const path = new URL(permalink, baseUrl).pathname;
  await page.goto(`${baseUrl}${path}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible({
    timeout: 20_000,
  });

  // Back-link to the category listing starts under /forum/help
  const backLinkBefore = page.getByRole('link', {
    name: 'See all discussions in this category',
  });
  await expect(backLinkBefore).toHaveAttribute('href', /\/forum\/help$/);

  await page.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Discussion' });
  await expect(dialog).toBeVisible();

  const category = dialog.getByRole('combobox', { name: 'Category *' });
  await category.click();
  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible();
  expect(await options.count()).toBeGreaterThan(1);
  await expect(page.getByRole('option', { name: 'Tips & Tricks' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Q&A' })).toBeVisible();
  await page.getByRole('option', { name: 'Tips & Tricks' }).click();

  const saved = page.waitForResponse(
    res =>
      res.url().includes('/graphql') &&
      res.request().postDataJSON()?.operationName === 'updateDiscussion'
  );
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  const savedBody = await (await saved).json();
  expect(savedBody.errors, `updateDiscussion failed: ${JSON.stringify(savedBody.errors)}`).toBeUndefined();

  // URL is unchanged after the save
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  // Back-link now points at /forum/tips-and-tricks
  const backLinkAfter = page.getByRole('link', {
    name: 'See all discussions in this category',
  });
  await expect(backLinkAfter).toHaveAttribute('href', /\/forum\/tips-and-tricks$/);

  // Listed on the new category page, not the old one
  await page.goto(`${baseUrl}/forum/tips-and-tricks`);
  await expect(page.getByRole('link', { name: title })).toBeVisible({
    timeout: 20_000,
  });

  await page.goto(`${baseUrl}/forum/help`);
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);
});
