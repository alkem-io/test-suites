// Feature: 085-authz-admin-guard (client-web#9537) — Space Community tab
// Release 75 verification rows 1 and 6 (P1, P6). Bug client-web#10279, fix #10280.
//
// The Community tab of a space's settings gates the member dialog's Lead
// checkbox, Admin checkbox and "remove this member" action on the privilege
// the server enforces for that action. Three personas:
//
//  - SPACE_ADMIN   — holds GRANT on the space role set: every control enabled,
//                    every change persists. The bug fixed by #10280 was this
//                    persona seeing the controls disabled.
//  - GLOBAL_SUPPORT — platform role with GRANT + ROLESET_ENTRY_ROLE_ASSIGN on
//                    space role sets: the same contract. The R-2 failure mode
//                    this suite fences is "control enabled, then the server
//                    refuses" — asserted by the absence of the denied toast and
//                    by the change surviving a reload.
//  - SPACE_MEMBER  — no UPDATE on the space: the settings page is not reachable,
//                    so the boundary is "no admin surface at all", not a disabled
//                    control.
import { expect } from '@playwright/test';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  DENIED_TOAST,
  openMemberSettingsDialog,
  openSpaceCommunityTab,
  memberDialogControls,
} from './authz-admin-guard.helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'authz-space-community',
  space: {
    about: { profile: { displayName: 'Authz Guard Space' } },
    collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      // QA_USER is the subject whose roles are changed; SPACE_MEMBER is the
      // plain-member persona for the boundary case.
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER, TestUser.QA_USER],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
const subjectName = () => TestUserManager.users.qaUser.displayName;

const spaceAdminTest = createPersonaTest('space.admin@alkem.io');
const globalSupportTest = createPersonaTest('global.support@alkem.io');
const spaceMemberTest = createPersonaTest('space.member@alkem.io');

spaceAdminTest.describe.configure({ mode: 'serial' });

spaceAdminTest.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

spaceMemberTest.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

spaceAdminTest.describe('Space Community — SPACE_ADMIN (P1)', () => {
  spaceAdminTest('1.1 Lead and Admin checkboxes and Remove are enabled for the space admin', async ({ page }) => {
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    const dialog = await openMemberSettingsDialog(page, subjectName());
    const { lead, admin, remove } = memberDialogControls(dialog);
    await expect(lead).toBeEnabled();
    await expect(admin).toBeEnabled();
    await expect(remove).toBeEnabled();
    await expect(lead).not.toBeChecked();
    await expect(admin).not.toBeChecked();
  });

  spaceAdminTest('1.2 Making the member a Lead persists and raises no denied toast', async ({ page }) => {
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    let dialog = await openMemberSettingsDialog(page, subjectName());
    await memberDialogControls(dialog).lead.check();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);

    await page.reload();
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    dialog = await openMemberSettingsDialog(page, subjectName());
    await expect(memberDialogControls(dialog).lead).toBeChecked();
  });

  spaceAdminTest('1.3 Making the member an Admin persists and raises no denied toast', async ({ page }) => {
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    let dialog = await openMemberSettingsDialog(page, subjectName());
    await memberDialogControls(dialog).admin.check();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);

    await page.reload();
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    dialog = await openMemberSettingsDialog(page, subjectName());
    await expect(memberDialogControls(dialog).admin).toBeChecked();
  });

  spaceAdminTest('1.4 Reverting both roles persists', async ({ page }) => {
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    let dialog = await openMemberSettingsDialog(page, subjectName());
    await memberDialogControls(dialog).lead.uncheck();
    await memberDialogControls(dialog).admin.uncheck();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);

    await page.reload();
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    dialog = await openMemberSettingsDialog(page, subjectName());
    await expect(memberDialogControls(dialog).lead).not.toBeChecked();
    await expect(memberDialogControls(dialog).admin).not.toBeChecked();
  });
});

globalSupportTest.describe('Space Community — GLOBAL_SUPPORT (P2 probe on the space surface)', () => {
  globalSupportTest('2.1 Controls are enabled and a Lead change persists — never "enabled then refused"', async ({ page }) => {
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    let dialog = await openMemberSettingsDialog(page, subjectName());
    const { lead, admin, remove } = memberDialogControls(dialog);
    await expect(lead).toBeEnabled();
    await expect(admin).toBeEnabled();
    await expect(remove).toBeEnabled();

    await lead.check();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    // The R-2 failure mode: the client showed an enabled control the server refuses.
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);

    await page.reload();
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    dialog = await openMemberSettingsDialog(page, subjectName());
    await expect(memberDialogControls(dialog).lead).toBeChecked();

    // Leave the subject as it was found.
    await memberDialogControls(dialog).lead.uncheck();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  globalSupportTest('2.2 Removing the member from the space works and persists', async ({ page }) => {
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    const dialog = await openMemberSettingsDialog(page, subjectName());
    await memberDialogControls(dialog).remove.click();
    // The removal is confirmed in an AlertDialog owned by the page.
    const confirm = page.getByRole('alertdialog').filter({ hasText: 'Are you sure you want to remove this member?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);

    await page.reload();
    await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
    await expect(page.getByRole('row').filter({ hasText: subjectName() })).toHaveCount(0);
  });
});

spaceMemberTest.describe('Space Community — SPACE_MEMBER boundary', () => {
  spaceMemberTest('3.1 A plain member has no Community admin surface at all', async ({ page }) => {
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings`);
    // Either the settings route bounces the member away, or it renders without
    // the members table. In neither case is a per-member "Actions" menu offered.
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Actions' })).toHaveCount(0);
  });
});
