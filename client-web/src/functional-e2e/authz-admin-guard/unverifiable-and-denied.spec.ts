// Feature: 085-authz-admin-guard (client-web#9537) — the two failure paths.
// Release 75 verification rows 5 and 6 (P5, P6).
//
//  P5 `unverifiable` — when the role set's `myPrivileges` cannot be read, the
//     gate fails CLOSED: controls disabled, tooltip "Permissions could not be
//     verified." A reload without the fault clears it.
//  P6 denied toast — when the server refuses a role change the client had
//     allowed, the user sees "You don't have permission to make this change.
//     The change was not saved." and nothing is applied.
//
// Both faults are injected at the network layer for the SPACE_ADMIN persona,
// so the product code path is the real one and no privilege is actually
// removed from anyone.
import { expect, Route } from '@playwright/test';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  DENIED_TOAST,
  DENIED_TOOLTIP,
  expectGatedWithReason,
  memberDialogControls,
  openMemberSettingsDialog,
  openSpaceCommunityTab,
} from './authz-admin-guard.helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const GRAPHQL = '**/api/private/graphql';

const scenarioConfig: TestScenarioConfig = {
  name: 'authz-fault-paths',
  space: {
    collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.QA_USER],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
const subject = () => TestUserManager.users.qaUser.displayName;
const test = createPersonaTest('space.admin@alkem.io');
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});
test.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

const operationName = (route: Route): string | undefined => {
  try {
    return JSON.parse(route.request().postData() ?? '{}').operationName;
  } catch {
    return undefined;
  }
};

test('5.1 unverifiable: a role-set read without myPrivileges leaves no admin surface at all', async ({ page }) => {
  // Strip `myPrivileges` from the role set's authorization in the response the
  // Community tab gates on (`RoleSetAuthorization`), leaving everything else intact.
  await page.route(GRAPHQL, async route => {
    if (operationName(route) !== 'RoleSetAuthorization') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    const roleSet = body?.data?.lookup?.roleSet;
    if (roleSet?.authorization) delete roleSet.authorization.myPrivileges;
    await route.fulfill({ response, json: body });
  });

  // Fail-closed all the way down: without a readable privilege set the tab
  // does not even list members, so no per-member "Actions" menu is offered.
  await page.goto(`${baseUrl}/${baseScenario.space.nameId}/settings`);
  await page.getByRole('tab', { name: 'Community' }).click();
  await expect(page.getByRole('heading', { name: 'Space Members' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Actions' })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: subject() })).toHaveCount(0);

  // Fault removed: a plain reload restores the surface.
  await page.unroute(GRAPHQL);
  await page.reload();
  await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
  const healthy = await openMemberSettingsDialog(page, subject());
  await expect(memberDialogControls(healthy).lead).toBeEnabled();
  await healthy.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('5.2 denied by derivation: privileges present but without the assign token gate every control with the tooltip', async ({ page }) => {
  await page.route(GRAPHQL, async route => {
    if (operationName(route) !== 'RoleSetAuthorization') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    const roleSet = body?.data?.lookup?.roleSet;
    if (roleSet?.authorization) roleSet.authorization.myPrivileges = ['READ'];
    await route.fulfill({ response, json: body });
  });

  await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
  const dialog = await openMemberSettingsDialog(page, subject());
  const { lead, admin, remove } = memberDialogControls(dialog);
  await expectGatedWithReason(page, lead, DENIED_TOOLTIP);
  await expect(admin).toBeDisabled();
  await expect(remove).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.unroute(GRAPHQL);
});

test('6.1 denied: a server refusal after an allowed control shows the toast and applies nothing', async ({ page }) => {
  await page.route(GRAPHQL, async route => {
    if (operationName(route) !== 'AssignRoleToUser') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: {
        errors: [
          {
            message: 'Authorization: unable to grant \'grant\' privilege: assign role to User',
            path: ['assignRoleToUser'],
            extensions: { code: 'FORBIDDEN', numericCode: 11102 },
          },
        ],
        data: null,
      },
    });
  });

  await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
  let dialog = await openMemberSettingsDialog(page, subject());
  const { lead } = memberDialogControls(dialog);
  await expect(lead).toBeEnabled();
  await lead.check();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(DENIED_TOAST)).toBeVisible({ timeout: 10_000 });

  await page.unroute(GRAPHQL);
  await page.reload();
  await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
  dialog = await openMemberSettingsDialog(page, subject());
  await expect(memberDialogControls(dialog).lead).not.toBeChecked();
});
