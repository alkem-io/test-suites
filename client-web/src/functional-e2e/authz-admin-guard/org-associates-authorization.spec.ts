// Feature: 085-authz-admin-guard (client-web#9537) — Organization Associates
// and Authorization tabs. Release 75 verification rows 2 and 3 (P2, P3).
//
// Both tabs gate their add/remove controls on ROLE_SET_ASSIGN_PRIVILEGES
// (`ROLESET_ENTRY_ROLE_ASSIGN`) while the server requires GRANT on an
// organization role set (story R-2 / R-6). Two personas:
//
//  - ORGANIZATION_ADMIN — admin of the scenario organization: every control
//                         enabled, every change persists, no denied toast.
//  - GLOBAL_SUPPORT     — the actor R-2 names. The contract asserted is the
//                         one that matters: a control is EITHER gated off with
//                         the permission tooltip OR enabled and honoured by the
//                         server. "Enabled, then refused" is the defect.
import { expect } from '@playwright/test';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { DENIED_TOAST, DENIED_TOOLTIP } from './authz-admin-guard.helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'authz-org-tabs',
  organization: { community: { addMembers: false, addAdmin: true } },
};

let baseScenario: OrganizationWithSpaceModel;
const subject = () => TestUserManager.users.qaUser.displayName;
const orgUrl = (tab: 'community' | 'authorization') =>
  `${baseUrl}/organization/${baseScenario.organization.nameId}/settings/${tab}`;

const orgAdminTest = createPersonaTest('organization.admin@alkem.io');
const globalSupportTest = createPersonaTest('global.support@alkem.io');
orgAdminTest.describe.configure({ mode: 'serial' });

orgAdminTest.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});
globalSupportTest.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** Type in the tab's search box and return the add button for the subject. */
const findAddButton = async (page: import('@playwright/test').Page, roleWord: string) => {
  await page.getByRole('searchbox').or(page.getByPlaceholder('Search users by name…')).first().fill(subject());
  return page.getByRole('button', { name: `Add ${subject()} as ${roleWord}`, exact: true });
};

const confirmRemoval = async (page: import('@playwright/test').Page, roleWord: string) => {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: `Remove ${subject()} as ${roleWord}`, exact: true }).click();
  await expect(dialog).toBeHidden();
};

// Order matters: the Authorization tab offers Admin/Owner candidates from the
// organization's ASSOCIATES, so the subject is added as an associate first and
// removed as an associate last.
orgAdminTest.describe('Org Associates + Authorization — ORGANIZATION_ADMIN (P2, P3)', () => {
  orgAdminTest('2.1 Add the subject as Associate; it persists; no denied toast', async ({ page }) => {
    await page.goto(orgUrl('community'));
    await expect(page.getByRole('heading', { name: 'Current Associates' })).toBeVisible({ timeout: 15_000 });
    const add = await findAddButton(page, 'Associate');
    await expect(add).toBeEnabled();
    await add.click();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: `Remove ${subject()} as Associate`, exact: true })).toBeVisible({ timeout: 15_000 });
  });

  orgAdminTest('3.1 Add the subject as Admin; it persists; no denied toast', async ({ page }) => {
    await page.goto(orgUrl('authorization'));
    await expect(page.getByRole('heading', { name: 'Current Admins' })).toBeVisible({ timeout: 15_000 });
    const add = await findAddButton(page, 'Admin');
    await expect(add).toBeEnabled({ timeout: 15_000 });
    await add.click();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: `Remove ${subject()} as Admin`, exact: true })).toBeVisible({ timeout: 15_000 });
  });

  orgAdminTest('3.2 Remove the subject as Admin; it persists', async ({ page }) => {
    await page.goto(orgUrl('authorization'));
    const remove = page.getByRole('button', { name: `Remove ${subject()} as Admin`, exact: true });
    await expect(remove).toBeEnabled({ timeout: 15_000 });
    await remove.click();
    await confirmRemoval(page, 'Admin');
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Current Admins' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: `Remove ${subject()} as Admin`, exact: true })).toHaveCount(0);
  });

  orgAdminTest('3.3 An org admin (not owner) sees the Owner controls gated off', async ({ page }) => {
    await page.goto(orgUrl('authorization'));
    await page.getByRole('tab', { name: 'Owner' }).click();
    await expect(page.getByRole('heading', { name: 'Current Owners' })).toBeVisible({ timeout: 15_000 });
    const add = await findAddButton(page, 'Owner');
    // Gated: either disabled with the permission tooltip, or simply not offered.
    if ((await add.count()) > 0) {
      await expect(add).toBeDisabled();
      await add.locator('xpath=ancestor::span[@tabindex="0"][1]').focus();
      await expect(page.getByRole('tooltip').filter({ hasText: DENIED_TOOLTIP })).toBeVisible();
    }
  });

  orgAdminTest('2.2 Remove the subject as Associate; it persists', async ({ page }) => {
    await page.goto(orgUrl('community'));
    const remove = page.getByRole('button', { name: `Remove ${subject()} as Associate`, exact: true });
    await expect(remove).toBeEnabled({ timeout: 15_000 });
    await remove.click();
    await confirmRemoval(page, 'Associate');
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Current Associates' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: `Remove ${subject()} as Associate`, exact: true })).toHaveCount(0);
  });
});

globalSupportTest.describe('Org tabs — GLOBAL_SUPPORT probe (R-2 / R-6)', () => {
  for (const [tab, heading, roleWord] of [
    ['community', 'Current Associates', 'Associate'],
    ['authorization', 'Current Admins', 'Admin'],
  ] as const) {
    globalSupportTest(`4.${tab === 'community' ? 1 : 2} ${heading}: a control is gated off OR enabled-and-honoured, never enabled-then-refused`, async ({ page }) => {
      await page.goto(orgUrl(tab));
      await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 15_000 });
      const add = await findAddButton(page, roleWord);
      // Candidates are searched server-side; give the list the same budget the
      // admin cases get. A control that is never offered is a valid gated outcome.
      await add.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
      const record = (outcome: string) => {
        globalSupportTest.info().annotations.push({ type: 'GLOBAL_SUPPORT outcome', description: `${roleWord}: ${outcome}` });
        console.log(`[authz-probe] GLOBAL_SUPPORT on org ${roleWord}: ${outcome}`);
      };
      if ((await add.count()) === 0) {
        await expect(page.getByRole('button', { name: new RegExp(`^Add .* as ${roleWord}$`) })).toHaveCount(0);
        record('control not offered');
        return;
      }
      if (await add.isDisabled()) {
        await add.locator('xpath=ancestor::span[@tabindex="0"][1]').focus();
        await expect(page.getByRole('tooltip').filter({ hasText: DENIED_TOOLTIP })).toBeVisible();
        record('gated off with the permission tooltip');
        return;
      }
      record('enabled and honoured by the server');
      await add.click();
      // R-2: an enabled control the server refuses surfaces as this toast.
      await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
      const remove = page.getByRole('button', { name: `Remove ${subject()} as ${roleWord}`, exact: true });
      await expect(remove).toBeVisible({ timeout: 15_000 });
      if (roleWord === 'Associate') return; // keep the associate: the Admin probe picks candidates from associates
      await remove.click();
      await confirmRemoval(page, roleWord);
      await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    });
  }
});
