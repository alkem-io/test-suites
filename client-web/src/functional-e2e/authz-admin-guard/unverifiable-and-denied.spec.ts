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
import { expect, Page, Route } from '@playwright/test';
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
const roleSetId = () => baseScenario.space.community.roleSetId;
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

/**
 * Apply `mutate` to THIS role set's `authorization` in every GraphQL response
 * that carries it, whatever the operation. The Community tab reads the role
 * set through more than one document (`RoleSetAuthorization`,
 * `CommunityApplicationsInvitations`, …) and Apollo merges them all into the
 * same `RoleSet:<id>` cache entry, so a fault injected into a single operation
 * is overwritten by whichever response lands last — the race that turned 5.2
 * red on the slower Test environment while it stayed green locally.
 *
 * A reload or navigation can abort an in-flight request while its handler is
 * still awaiting `route.fetch()`; fulfilling that route then throws "Route is
 * already handled". That request is gone anyway, so the error is swallowed
 * rather than failing the test.
 */
const injectRoleSetAuthorizationFault = (
  page: Page,
  mutate: (authorization: Record<string, unknown>) => void
) =>
  page.route(GRAPHQL, async route => {
    try {
      const response = await route.fetch();
      const body = await response.json();
      let touched = false;
      const visit = (node: unknown): void => {
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (!node || typeof node !== 'object') return;
        const record = node as Record<string, unknown>;
        if (record.id === roleSetId() && record.authorization && typeof record.authorization === 'object') {
          mutate(record.authorization as Record<string, unknown>);
          touched = true;
        }
        Object.values(record).forEach(visit);
      };
      visit(body?.data);
      await route.fulfill(touched ? { response, json: body } : { response });
    } catch (error) {
      if (!String(error).includes('already handled')) throw error;
    }
  });

test('5.1 unverifiable: a role-set read without myPrivileges leaves no admin surface at all', async ({ page }) => {
  // Strip `myPrivileges` from the role set's authorization wherever the
  // Community tab reads it, leaving everything else intact.
  await injectRoleSetAuthorizationFault(page, authorization => {
    delete authorization.myPrivileges;
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
  await injectRoleSetAuthorizationFault(page, authorization => {
    authorization.myPrivileges = ['READ'];
  });

  await openSpaceCommunityTab(page, baseUrl, baseScenario.space.nameId);
  const dialog = await openMemberSettingsDialog(page, subject());
  const { lead, admin, remove } = memberDialogControls(dialog);
  // Every control the derivation gates carries the same reason (`GatedAction`
  // wraps all three), so each one is checked for the tooltip, not just Lead.
  await expectGatedWithReason(page, lead, DENIED_TOOLTIP);
  await expectGatedWithReason(page, admin, DENIED_TOOLTIP);
  await expectGatedWithReason(page, remove, DENIED_TOOLTIP);
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
