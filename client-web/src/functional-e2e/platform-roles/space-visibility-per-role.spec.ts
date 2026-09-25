// workspace#027 — platform role redesign. Manual checklist C1 (cannot), C7
// (can) and E8/E25, automated: a space's platform visibility is License
// Manager's to change (A14) and nobody else's — and when the server refuses,
// the UI must SAY so.
//
// The space is disposable; the License Manager test leaves it on DEMO, which
// the scenario clean-up deletes anyway.
import { expect, test as base, type Page } from '@playwright/test';
import {
  platformRoleEmail,
  seedPlatformRoleUsers,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let scenario: OrganizationWithSpaceModel;

base.beforeAll(async () => {
  base.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  await seedPlatformRoleUsers();
  scenario = await TestScenarioFactory.createBaseScenario({ name: 'pr-visibility', space: {} });
});
base.afterAll(async () => {
  if (scenario) await TestScenarioFactory.cleanUpBaseScenario(scenario).catch(() => undefined);
});

/** The space's visibility as the server reports it to the signed-in user. */
const visibilityOf = (page: Page) =>
  page.evaluate(async (id: string) => {
    const res = await fetch('/api/private/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: `{ lookup { space(ID: "${id}") { visibility } } }` }),
    });
    return (await res.json()).data.lookup.space.visibility as string;
  }, scenario.space.id);

const asContentFullAccess = createPersonaTest(platformRoleEmail('PLATFORM_CONTENT_FULL_ACCESS'));
asContentFullAccess('PLATFORM_CONTENT_FULL_ACCESS: a refused visibility change is reported, not swallowed', async ({ page }) => {
  // KNOWN CLIENT DEFECT (027, E25): the server refuses `updateSpacePlatformSettings`
  // to this role (only License Manager may), but `CrdAdminSpacesPage.saveSettings`
  // is `void update(...).then(close)` with no error branch — the dialog stays
  // open, no toast, no message. Expected to fail until the refusal is shown.
  asContentFullAccess.fail(true, 'client-web 027: refused space-settings save shows no error');

  await page.goto(`${baseUrl}/admin/spaces`);
  const row = page.getByRole('row').filter({ hasText: scenario.space.nameId });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole('button', { name: 'Edit space settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Space settings' });
  await dialog.getByRole('combobox', { name: 'Visibility' }).click();
  await page.getByRole('option', { name: 'Demo' }).click();
  const refused = page.waitForResponse(
    r => r.url().includes('/graphql') && r.request().postDataJSON()?.operationName === 'UpdateSpacePlatformSettings'
  );
  await dialog.getByRole('button', { name: 'Save' }).click();
  expect((await (await refused).json()).errors?.[0]?.extensions?.code).toBe('FORBIDDEN_POLICY');
  expect(await visibilityOf(page)).toBe('ACTIVE');
  // What the user must see: some error text, in the dialog or as a toast.
  await expect(page.getByRole('alert').or(dialog.getByText(/denied|not allowed|permission|failed/i))).toBeVisible({
    timeout: 5_000,
  });
});

const asLicenseManager = createPersonaTest(platformRoleEmail('PLATFORM_LICENSE_MANAGER'));
asLicenseManager.describe('PLATFORM_LICENSE_MANAGER on the Licensing section', () => {
  asLicenseManager('changes a space visibility inline, and it persists', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/licensing`);
    const row = page.getByRole('row').filter({ hasText: scenario.space.nameId });
    await expect(row).toBeVisible({ timeout: 20_000 });
    expect(await visibilityOf(page)).toBe('ACTIVE');
    await row.getByRole('combobox', { name: /^Visibility of / }).click();
    await page.getByRole('option', { name: 'Demo' }).click();
    await expect.poll(() => visibilityOf(page), { timeout: 10_000 }).toBe('DEMO');
    await page.reload();
    await expect(row.getByRole('combobox', { name: /^Visibility of / })).toHaveText('Demo', { timeout: 20_000 });
  });

  asLicenseManager('is offered license USAGE only: three lists, no plan definitions, no Wingback', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/licensing`);
    const main = page.getByRole('main');
    await expect(main.getByRole('tab', { name: 'Licensing' })).toBeVisible({ timeout: 20_000 });
    // The section's own inner tabs, below the shell's.
    await expect(main.getByRole('tab', { name: /^(Spaces|Organisations|Users)$/ })).toHaveCount(3);
    // Plan DEFINITION would be a create/edit/delete-plan control; the only
    // plan control here is the per-row "Manage license plans" (usage).
    await expect(main.getByRole('button', { name: /(new|create|edit|delete|define).*plan|plan.*(definition|rule)/i })).toHaveCount(0);
    await expect(main.getByText(/wingback/i)).toHaveCount(0);
  });
});
