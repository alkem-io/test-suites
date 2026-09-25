// workspace#027 — platform role redesign. Manual checklist C4 (can), automated:
// Platform Resource Admin promotes a subspace to a top-level space from
// Conversions & Transfers. Disposable scenario; the promoted space is deleted
// by the scenario clean-up (it deletes by id, whatever the level).
import { expect, test as base, type Page } from '@playwright/test';
import { platformRoleEmail, seedPlatformRoleUsers, TestScenarioFactory, TestUserManager } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let scenario: OrganizationWithSpaceModel;

base.beforeAll(async () => {
  base.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  await seedPlatformRoleUsers();
  scenario = await TestScenarioFactory.createBaseScenario({ name: 'pr-convert', space: { subspace: {} } });
});
base.afterAll(async () => {
  if (scenario) await TestScenarioFactory.cleanUpBaseScenario(scenario).catch(() => undefined);
});

const levelOf = (page: Page, id: string) =>
  page.evaluate(async (spaceId: string) => {
    const res = await fetch('/api/private/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: `{ lookup { space(ID: "${spaceId}") { level } } }` }),
    });
    return (await res.json()).data.lookup.space.level as string;
  }, id);

const asResourceAdmin = createPersonaTest(platformRoleEmail('PLATFORM_RESOURCE_ADMIN'));
asResourceAdmin('promotes a subspace to a top-level space (L1 → L0)', async ({ page }) => {
  await page.goto(`${baseUrl}/admin/transfer`);
  const main = page.getByRole('main');
  // "Source URL" boxes, in page order: convert space is the FIRST.
  const source = main.getByRole('textbox', { name: 'Source URL', exact: true }).first();
  await source.fill(`${baseUrl}/${scenario.space.nameId}/challenges/${scenario.subspace.nameId}`);
  await source.press('Enter');
  await expect(main.getByText('Resolved level: L1')).toBeVisible({ timeout: 20_000 });
  expect(await levelOf(page, scenario.subspace.id)).toBe('L1');

  const converted = page.waitForResponse(
    r => r.url().includes('/graphql') && r.request().postDataJSON()?.operationName === 'ConvertSpaceL1ToL0'
  );
  await main.getByRole('button', { name: 'Promote to top-level space (L1 → L0)' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Confirm conversion' });
  await confirm.getByRole('button', { name: 'Convert Space' }).click();
  expect((await (await converted).json()).errors).toBeUndefined();
  await expect.poll(() => levelOf(page, scenario.subspace.id), { timeout: 15_000 }).toBe('L0');
});
