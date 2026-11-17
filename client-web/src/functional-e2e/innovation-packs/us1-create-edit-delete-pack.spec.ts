// spec: client-web/src/functional-e2e/innovation-packs/innovation-packs-test-plan.md
// W2 journey 12 (docs/qa/server-rebuild/plan.md § W2), audit rows K2 / L6:
// an organisation admin creates an innovation pack on the organisation's
// Account tab (K2-1) and edits its name, description, tags, store listing and
// search visibility on the pack's settings page (K2-2); the platform admin
// then finds it in Administration › Innovation Packs with that state and
// deletes it there (L6-1). Every write is read back over the lib.
//
// The organisation is self-seeded (factory: ACCOUNT_LICENSE_PLUS, 3 packs,
// with `organization.admin` as its Admin); the persona only acts on that
// organisation. The file is SERIAL: K2-2 edits K2-1's pack, L6-1 deletes it.
// afterAll deletes any pack left on the account, then the organisation.

import { test, expect } from '@playwright/test';
import {
  readInnovationPack,
  SearchVisibility,
  TestUserManager,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  accountPackIds,
  accountSection,
  addTags,
  adminPackRow,
  baseUrl,
  chipButtons,
  deleteAccountPacks,
  expectMutationAnswered,
  markdownEditor,
  openPersonaPage,
  orgSettingsUrl,
  packDescriptionPlaceholder,
  packDetails,
  replaceMarkdown,
  runCleanup,
  runId,
  seedOrganizationScenario,
  serverPack,
  tagsInput,
  teardownScenario,
  type PersonaPage,
} from './innovation-packs.helpers';

const RUN = runId();
const NAME = `W2 Pack ${RUN}`;
const DESCRIPTION = `A pack created by the W2 walk ${RUN}.`;
const NEW_NAME = `W2 Pack edited ${RUN}`;
const NEW_DESCRIPTION = `The edited description ${RUN}.`;
const TAGS = [`pack-a-${RUN}`, `pack-b-${RUN}`];

let scenario: OrganizationWithSpaceModel | undefined;
let orgAdmin: PersonaPage | undefined;
let packId = '';
let packUrl = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  scenario = await seedOrganizationScenario(`w2-pack-${RUN}`);
  orgAdmin = await openPersonaPage(
    browser,
    TestUserManager.users.organizationAdmin.email
  );
});

test.afterAll(async () => {
  await runCleanup([
    ['close organisation admin', () => orgAdmin?.close() ?? Promise.resolve()],
    [
      'delete packs',
      () => deleteAccountPacks(scenario?.organization.accountId),
    ],
    ['delete organisation', () => teardownScenario(scenario)],
  ]);
});

test('K2-1 an organisation admin creates a pack on the Account tab; it is stored with its name, description and provider, and counted', async () => {
  const page = orgAdmin!.page;
  const accountId = scenario!.organization.accountId;
  expect(await accountPackIds(accountId), 'no pack before the create').toEqual(
    []
  );

  await page.goto(orgSettingsUrl(scenario!.organization.nameId, 'account'));
  await accountSection(page, 'Template Packs 0/3').click();
  await page.getByRole('button', { name: /^Create new pack/ }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Create Innovation Pack',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Name *', exact: true }).fill(NAME);
  await replaceMarkdown(
    markdownEditor(dialog, packDescriptionPlaceholder),
    DESCRIPTION
  );
  // Create is enabled only once the description has reached the form (it is required).
  const create = dialog.getByRole('button', { name: 'Create', exact: true });
  await expect(create).toBeEnabled();
  const answered = expectMutationAnswered(page, 'createInnovationPack');
  await create.click();
  await answered();
  await expect(dialog).toBeHidden();

  await expect.poll(() => accountPackIds(accountId)).toHaveLength(1);
  [packId] = await accountPackIds(accountId);
  const stored = await serverPack(packId);
  expect(stored.profile.displayName).toBe(NAME);
  expect((stored.profile.description ?? '').trim()).toBe(DESCRIPTION);
  expect(stored.provider.id, 'the organisation provides the pack').toBe(
    scenario!.organization.id
  );
  packUrl = stored.profile.url;

  // The Account tab counts it, after a reload.
  await page.reload();
  await expect(accountSection(page, 'Template Packs 1/3')).toBeVisible();
});

test('K2-2 the organisation admin edits name, description, tags, store listing and search visibility; all are stored and survive a reload', async () => {
  expect(packId, 'K2-1 must have created the pack').not.toBe('');
  const page = orgAdmin!.page;
  const before = await serverPack(packId);
  expect([
    before.listedInStore,
    before.searchVisibility,
    before.profile.tagset?.tags,
  ]).toEqual([true, SearchVisibility.Account, []]);

  await page.goto(`${packUrl}/settings`);
  const form = packDetails(page);
  await expect(
    form.getByRole('textbox', { name: 'Pack name', exact: true })
  ).toHaveValue(NAME);
  await form
    .getByRole('textbox', { name: 'Pack name', exact: true })
    .fill(NEW_NAME);
  await replaceMarkdown(
    markdownEditor(form, packDescriptionPlaceholder),
    NEW_DESCRIPTION
  );
  await addTags(tagsInput(form, 'Add a tag and press Enter'), TAGS);
  await form
    .getByRole('switch', { name: 'Listed in store', exact: true })
    .click();
  await expect(
    form.getByRole('switch', { name: 'Listed in store', exact: true })
  ).not.toBeChecked();
  await form
    .getByRole('combobox', { name: 'Search visibility', exact: true })
    .click();
  await page.getByRole('option', { name: 'Public', exact: true }).click();
  await expect(
    form.getByRole('combobox', { name: 'Search visibility', exact: true })
  ).toHaveText('Public');
  const answered = expectMutationAnswered(page, 'updateInnovationPack');
  await form.getByRole('button', { name: 'Save changes', exact: true }).click();
  await answered();

  const stored = await serverPack(packId);
  expect(stored.profile.displayName).toBe(NEW_NAME);
  expect((stored.profile.description ?? '').trim()).toBe(NEW_DESCRIPTION);
  expect([...(stored.profile.tagset?.tags ?? [])].sort()).toEqual(
    [...TAGS].sort()
  );
  expect(stored.listedInStore).toBe(false);
  expect(stored.searchVisibility).toBe(SearchVisibility.Public);

  await page.reload();
  const reloaded = packDetails(page);
  await expect(
    reloaded.getByRole('textbox', { name: 'Pack name', exact: true })
  ).toHaveValue(NEW_NAME);
  await expect(markdownEditor(reloaded, packDescriptionPlaceholder)).toHaveText(
    NEW_DESCRIPTION
  );
  for (const tag of TAGS)
    await expect(chipButtons(reloaded, tag)).toHaveCount(2);
  await expect(
    reloaded.getByRole('switch', { name: 'Listed in store', exact: true })
  ).not.toBeChecked();
  await expect(
    reloaded.getByRole('combobox', { name: 'Search visibility', exact: true })
  ).toHaveText('Public');
});

test('L6-1 the platform admin finds the pack in Administration with its stored state and deletes it; the pack is gone', async ({
  browser,
}) => {
  expect(packId, 'K2-1 must have created the pack').not.toBe('');
  const admin = await openPersonaPage(
    browser,
    TestUserManager.users.globalAdmin.email
  );
  try {
    const page = admin.page;
    const row = await adminPackRow(page, baseUrl, NEW_NAME);
    await expect(row).toHaveCount(1);
    // The row shows what K2-2 stored, and who owns it.
    await expect(row.getByText('Not listed', { exact: true })).toBeVisible();
    await expect(row.getByText('Public', { exact: true })).toBeVisible();
    await expect(
      row.getByText(scenario!.organization.profile.displayName, { exact: true })
    ).toBeVisible();

    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('alertdialog', {
      name: `Delete ${NEW_NAME}?`,
    });
    const deleted = expectMutationAnswered(page, 'deleteInnovationPack');
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await deleted();
    await expect(confirm).toBeHidden();
    await expect(row).toHaveCount(0);

    const gone = await readInnovationPack(packId);
    expect(gone.error?.errors?.[0]?.code, 'the pack no longer exists').toBe(
      'ENTITY_NOT_FOUND'
    );
    expect(await accountPackIds(scenario!.organization.accountId)).toEqual([]);
  } finally {
    await admin.close();
  }

  // Positive control on the owner's side: the Account tab is back to 0/3.
  const page = orgAdmin!.page;
  await page.goto(orgSettingsUrl(scenario!.organization.nameId, 'account'));
  await expect(accountSection(page, 'Template Packs 0/3')).toBeVisible();
});
