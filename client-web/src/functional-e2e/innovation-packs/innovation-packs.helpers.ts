import { expect, type Locator, type Page } from '@playwright/test';
import {
  deleteInnovationPack,
  readAccountResources,
  readInnovationPack,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';

/**
 * Shared reads and locators for the innovation-pack walks (W2 journey 12,
 * docs/qa/server-rebuild/plan.md § W2, audit K2 / L6): an organisation admin
 * creates a pack on the organisation's Account tab and edits it on the pack's
 * settings page; the platform admin deletes it in Administration. Every write
 * is read back with `readInnovationPack` / `readAccountResources`.
 */

export {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
export {
  accountSection,
  orgSettingsUrl,
  runCleanup,
  runId,
  seedOrganizationScenario,
  teardownScenario,
} from '../contributors-crud/contributors-crud.helpers';
export {
  addTags,
  chipButtons,
  tagsInput,
} from '../profile-editing/profile-editing.helpers';

/** Ids of the packs an account hosts. */
export const accountPackIds = async (accountId: string): Promise<string[]> =>
  (
    must(
      await readAccountResources(accountId),
      `readAccountResources(${accountId})`
    ).lookup.account?.innovationPacks ?? []
  ).map(p => p.id);

/** One pack as the server holds it (platform admin read). */
export const serverPack = async (packId: string) => {
  const pack = must(
    await readInnovationPack(packId),
    `readInnovationPack(${packId})`
  ).lookup.innovationPack;
  if (!pack) throw new Error(`innovation pack ${packId} not found`);
  return pack;
};

/** Deletes every pack an account still hosts (teardown, before the organisation). */
export const deleteAccountPacks = async (
  accountId: string | undefined
): Promise<void> => {
  if (!accountId) return;
  for (const id of await accountPackIds(accountId)) {
    must(await deleteInnovationPack(id), `deleteInnovationPack(${id})`);
  }
};

/** The editor of a markdown field, named by its placeholder. */
export const markdownEditor = (
  scope: Page | Locator,
  placeholder: string
): Locator => scope.getByRole('textbox', { name: placeholder, exact: true });

/** Replaces a markdown editor's whole content with one paragraph. */
export const replaceMarkdown = async (
  editor: Locator,
  text: string
): Promise<void> => {
  await editor.click();
  await editor.press('ControlOrMeta+a');
  await editor.press('Delete');
  await editor.pressSequentially(text);
  await expect(editor).toHaveText(text);
};

export const packDescriptionPlaceholder = 'What is this Innovation Pack about?';

/** The "Pack details" form on `<pack url>/settings`. */
export const packDetails = (page: Page): Locator =>
  page.getByRole('region', { name: 'Pack details', exact: true });

/** One row of Administration › Innovation Packs, found by the pack's name after a search. */
export const adminPackRow = async (
  page: Page,
  baseUrl: string,
  name: string
): Promise<Locator> => {
  await page.goto(`${baseUrl}/admin/innovation-packs`);
  await page.getByRole('searchbox', { name: 'Search…' }).fill(name);
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name, exact: true }) });
};
