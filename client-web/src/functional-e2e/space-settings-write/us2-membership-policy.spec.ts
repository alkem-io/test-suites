// spec: client-web/src/functional-e2e/space-settings-write/space-settings-write-test-plan.md
// W2 journey 4 (docs/qa/server-rebuild/plan.md § W2), membership policy:
// open → applications → invitations → open.

import { test, expect } from '@playwright/test';
import { CommunityMembershipPolicy, TestUserManager } from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  baseUrl,
  calloutHeading,
  openPersonaPage,
  spaceSidebar,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import { applyFlowSettled, expectNoApplyControl } from '../applications/applications.helpers';
import {
  openSettingsTab,
  policyRadio,
  saveSettings,
  seedSettingsScenario,
  serverSettings,
} from './space-settings-write.helpers';

/**
 * The admin changes the membership policy of a PUBLIC Space; the oracle is
 * the membership action the Space sidebar offers a NON-MEMBER: Join (open),
 * Apply (applications), none (invitations). Every view is read only after
 * the page has rendered the Space's callout for that same viewer — the
 * positive control that makes "no button" an observation, not a slow render.
 *
 *   admin `space.admin` · non-member `non.space`
 */
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let nonMember: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  scenario = await seedSettingsScenario('pol');
  admin = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
  nonMember = await openPersonaPage(browser, TestUserManager.users.nonSpaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await nonMember?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const space = () => scenario!.space;

/**
 * The non-member's sidebar on the Space page, once the page has rendered AND
 * the membership action has resolved: the apply flow's own requests
 * (`applyFlowSettled`) have finished, so a missing Join/Apply is the
 * server's answer for this viewer, not a control still loading.
 */
const nonMemberSidebar = async () => {
  const page = nonMember!.page;
  const flow = applyFlowSettled(page);
  try {
    await page.goto(`${baseUrl}/${space().nameId}`);
    await expect(calloutHeading(page, space().collaboration.calloutPostDisplayName)).toBeVisible();
    const sidebar = spaceSidebar(page);
    await expect(sidebar.getByRole('button', { name: 'About this Space', exact: true })).toBeVisible();
    await flow.settled();
    return sidebar;
  } finally {
    flow.dispose();
  }
};

const changePolicy = async (from: CommunityMembershipPolicy, to: CommunityMembershipPolicy) => {
  const page = admin!.page;
  await openSettingsTab(page, space().nameId);
  await expect(policyRadio(page, from)).toBeChecked();
  await policyRadio(page, to).click();
  await saveSettings(page);
  expect((await serverSettings(space().id)).membership.policy).toBe(to);
  await page.reload();
  await expect(policyRadio(page, to)).toBeChecked();
};

test.describe('W2 journey 4 — membership policy, changed in Space settings', () => {
  test('M4-1 open → applications: saved and read back; the non-member is offered Apply instead of Join', async () => {
    // Precondition — the seeded open Space offers Join.
    const before = await nonMemberSidebar();
    await expect(before.getByRole('button', { name: 'Join', exact: true })).toBeVisible();

    await changePolicy(CommunityMembershipPolicy.Open, CommunityMembershipPolicy.Applications);

    const after = await nonMemberSidebar();
    await expect(after.getByRole('button', { name: 'Apply', exact: true })).toBeVisible();
    await expect(after.getByRole('button', { name: 'Join', exact: true })).toHaveCount(0);
  });

  test('M4-2 applications → invitations: saved and read back; the non-member is offered no way in', async () => {
    const before = await nonMemberSidebar();
    await expect(before.getByRole('button', { name: 'Apply', exact: true })).toBeVisible();

    await changePolicy(CommunityMembershipPolicy.Applications, CommunityMembershipPolicy.Invitations);

    await expectNoApplyControl(await nonMemberSidebar());
  });

  test('M4-3 invitations → open: saved and read back; the non-member is offered Join again', async () => {
    await expectNoApplyControl(await nonMemberSidebar());

    await changePolicy(CommunityMembershipPolicy.Invitations, CommunityMembershipPolicy.Open);

    const after = await nonMemberSidebar();
    await expect(after.getByRole('button', { name: 'Join', exact: true })).toBeVisible();
    await expect(after.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0);
  });
});
