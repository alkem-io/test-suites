// spec: client-web/src/functional-e2e/organization-space-membership/organization-space-membership-test-plan.md
// server-api coverage: server-api/src/functional-api/roleset/organization/organization-self-removal.it-spec.ts

import { expect, Page } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import {
  cancelButton,
  clearHostLead,
  confirmButton,
  confirmDialog,
  COPY,
  ensureOrgRole,
  errorToast,
  gotoMembershipTab,
  leaveMenuItem,
  membershipCard,
  membershipCards,
  MembershipType,
  openCardMenu,
  orgIsLeadOf,
  orgIsMemberOf,
  removeAllOrgSpaceRoles,
  removeOrgRoleIfHeld,
  seedOrgMemberships,
  successToast,
} from './organization-space-membership.helpers';

/**
 * @forge-acceptance
 *
 * User Story 2 — an organization admin makes the organization leave a Space
 * or Subspace from its Membership tab. Every outcome is asserted on the
 * Space's role set through the API as well as on screen.
 *
 * The tests are serial and build on each other's state: the scenario
 * organization starts as a plain Member of Space S and Subspace S1.
 */

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'org-membership-leave-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const runSuffix = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: `org-membership-us2-${runSuffix}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      subspace: {
        collaboration: { addTutorialCallouts: false },
      },
    },
  },
};

const orgId = () => baseScenario.organization.id;
const spaceRoleSetId = () => baseScenario.space.community.roleSetId;
const subspaceRoleSetId = () => baseScenario.subspace.community.roleSetId;
const subsubspaceRoleSetId = () => baseScenario.subsubspace.community.roleSetId;
const spaceName = () => baseScenario.space.about.profile.displayName;
const subspaceName = () => baseScenario.subspace.about.profile.displayName;
const subsubspaceName = () =>
  baseScenario.subsubspace.about.profile.displayName;

const openTabWithCards = (page: Page, count: number) =>
  gotoMembershipTab(page, baseScenario.organization.nameId, async p => {
    await expect(membershipCards(p)).toHaveCount(count, { timeout: 10_000 });
  });

const startLeave = async (page: Page, name: string, type: MembershipType) => {
  await openCardMenu(membershipCard(page, name));
  await leaveMenuItem(page, type).click();
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('Organization Membership tab — leave a Space', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await clearHostLead(baseScenario);
    await seedOrgMemberships(baseScenario);
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(90_000);
    await teardownAuthentication();
    await removeAllOrgSpaceRoles(baseScenario);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('US2-AS1 Leave Subspace opens a destructive confirmation naming the Subspace', async ({
    page,
  }) => {
    await openTabWithCards(page, 2);

    const dialog = await startLeave(page, subspaceName(), 'Subspace');

    await expect(
      dialog.getByText(COPY.dialogTitle, { exact: true })
    ).toBeVisible();
    await expect(dialog).toContainText(subspaceName());
    // Nothing is sent before confirming.
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS2 Cancel changes nothing', async ({ page }) => {
    const dialog = confirmDialog(page);
    await expect(dialog).toBeVisible();

    await cancelButton(dialog).click();

    await expect(dialog).toBeHidden();
    await expect(membershipCards(page)).toHaveCount(2);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS3 confirming leaves only the Subspace', async ({ page }) => {
    const dialog = await startLeave(page, subspaceName(), 'Subspace');

    await confirmButton(dialog).click();

    await expect(successToast(page)).toBeVisible({ timeout: 3_000 });
    await expect(membershipCards(page)).toHaveCount(1);
    await expect(membershipCard(page, spaceName())).toBeVisible();
    await expect(membershipCard(page, subspaceName())).toHaveCount(0);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS4 leaving the Space ends its Subspace memberships too', async ({
    page,
  }) => {
    await seedOrgMemberships(baseScenario, { includeSubsubspace: true });
    await openTabWithCards(page, 3);
    await expect(membershipCard(page, subsubspaceName())).toBeVisible();

    const dialog = await startLeave(page, spaceName(), 'Space');
    await confirmButton(dialog).click();

    await expect(successToast(page)).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(COPY.empty, { exact: true })).toBeVisible();
    await expect(membershipCards(page)).toHaveCount(0);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(subsubspaceRoleSetId(), orgId())).toBe(false);
  });

  test('US2-AS5 leaving a Space where the organization is Lead keeps the Lead role', async ({
    page,
  }) => {
    await ensureOrgRole(orgId(), spaceRoleSetId(), RoleName.Member);
    await ensureOrgRole(orgId(), spaceRoleSetId(), RoleName.Lead);
    await openTabWithCards(page, 1);

    const dialog = await startLeave(page, spaceName(), 'Space');
    await confirmButton(dialog).click();

    await expect(successToast(page)).toBeVisible({ timeout: 3_000 });
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsLeadOf(spaceRoleSetId(), orgId())).toBe(true);
    await expect(
      membershipCard(page, spaceName()).getByText(COPY.roleLead, {
        exact: true,
      })
    ).toBeVisible();
  });

  test('US2-AS6 a membership removed meanwhile reports an error, never success', async ({
    page,
  }) => {
    await removeOrgRoleIfHeld(orgId(), spaceRoleSetId(), RoleName.Lead);
    await ensureOrgRole(orgId(), spaceRoleSetId(), RoleName.Member);
    await openTabWithCards(page, 1);

    // A Space admin removes the organization while the tab is open.
    await removeOrgRoleIfHeld(orgId(), spaceRoleSetId(), RoleName.Member);

    const dialog = await startLeave(page, spaceName(), 'Space');
    await confirmButton(dialog).click();

    await expect(errorToast(page)).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(successToast(page)).toHaveCount(0);
    // The list refreshes to the actual memberships.
    await expect(membershipCards(page)).toHaveCount(0);
    await expect(page.getByText(COPY.empty, { exact: true })).toBeVisible();
  });

  test('US2-AS7 the dialog is busy and non-interactive while the leave is in flight', async ({
    page,
  }) => {
    await ensureOrgRole(orgId(), spaceRoleSetId(), RoleName.Member);
    await openTabWithCards(page, 1);

    await page.route('**/graphql', async route => {
      const body = route.request().postDataJSON() as {
        operationName?: string;
      } | null;
      if (body?.operationName?.toLowerCase() === 'removerolefromorganization') {
        await new Promise(resolve => setTimeout(resolve, 1_500));
      }
      await route.continue();
    });

    try {
      const dialog = await startLeave(page, spaceName(), 'Space');
      const confirm = confirmButton(dialog);
      await confirm.click();

      await expect(confirm).toBeDisabled();
      await expect(confirm).toHaveAttribute('aria-busy', 'true');
      await expect(cancelButton(dialog)).toBeDisabled();

      await expect(successToast(page)).toBeVisible();
      expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    } finally {
      await page.unroute('**/graphql');
    }
  });
});
