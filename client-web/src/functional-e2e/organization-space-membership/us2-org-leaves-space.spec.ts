// spec: client-web/src/functional-e2e/organization-space-membership/organization-space-membership-test-plan.md
// server-api coverage: server-api/src/functional-api/roleset/organization/organization-self-removal.it-spec.ts

import { expect, Locator, Page } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import {
  clearHostLead,
  COPY,
  ensureOrgMemberOf,
  errorToast,
  gotoMembershipTab,
  inviteAndAccept,
  leaveRowButton,
  makePersonaUserMember,
  membershipRow,
  membershipRows,
  orgIsLeadOf,
  orgIsMemberOf,
  removeAllOrgSpaceRoles,
  removeOrgRoleIfHeld,
  successToast,
} from './organization-space-membership.helpers';

/**
 * @forge-acceptance
 *
 * User Story 2 — an organization admin makes the organization leave a Space
 * or Subspace from its Membership tab. Every outcome is asserted on the
 * Space's role set through the API as well as on screen.
 *
 * Serial: each test builds on the memberships the previous one left (AS2
 * opens its own dialog rather than reusing AS1's). The scenario organization
 * starts as a plain Member of Space S and Subspace S1 (and, through the
 * parent/child invitation rule, S2); a second Space L has it as Member + Lead.
 *
 * Environment notes (verified against the 027 platform-role server):
 *  - A NEW organization can only enter a Space through an accepted invitation
 *    (`roleset-entry-role-assign-organization` is no longer held by anyone), so
 *    memberships are seeded with invite + accept, not `assignRoleToOrganization`.
 *  - The Membership tab lists only Spaces the VIEWER can read (Clarification
 *    C-5), and a Subspace is readable by its members only — the persona is
 *    therefore also made a user-Member of S, S1 and S2.
 *  - The harness `admin@alkem.io` must hold PLATFORM_SUPPORT,
 *    PLATFORM_CONTENT_FULL_ACCESS, PLATFORM_LICENSE_MANAGER and
 *    FEATURE_ORGANIZATION_CREATOR for `TestScenarioFactory` to build scenarios.
 */

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'org-membership-leave-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const runSuffix = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel | undefined;
let leadScenario: OrganizationWithSpaceModel;

const sceneConfig = (name: string, deep: boolean): TestScenarioConfig => ({
  name,
  space: {
    collaboration: { addTutorialCallouts: false },
    ...(deep
      ? {
          subspace: {
            collaboration: { addTutorialCallouts: false },
            subspace: { collaboration: { addTutorialCallouts: false } },
          },
        }
      : {}),
  },
});

const orgId = () => baseScenario!.organization.id;
const spaceRoleSetId = () => baseScenario!.space.community.roleSetId;
const subspaceRoleSetId = () => baseScenario!.subspace.community.roleSetId;
const subsubspaceRoleSetId = () => baseScenario!.subsubspace.community.roleSetId;
const leadRoleSetId = () => leadScenario.space.community.roleSetId;
const spaceName = () => baseScenario!.space.about.profile.displayName;
const subspaceName = () => baseScenario!.subspace.about.profile.displayName;
const subsubspaceName = () =>
  baseScenario!.subsubspace.about.profile.displayName;
const leadName = () => leadScenario.space.about.profile.displayName;

/** Makes the scenario organization a Member of the Space, Subspace and
 * sub-subspace (the Space itself is held since creation). */
const seedOrgChain = () =>
  ensureOrgMemberOf(orgId(), [
    spaceRoleSetId(),
    subspaceRoleSetId(),
    subsubspaceRoleSetId(),
  ]);

// --- Locators ---------------------------------------------------------------

/** SC-001: the confirmation toast appears within 3 seconds of confirming. */
const SUCCESS_TOAST_MS = 3_000;

const dialogOf = (page: Page): Locator => page.getByRole('alertdialog');
const leaveButton = (dialog: Locator): Locator =>
  dialog.getByRole('button', { name: COPY.dialogConfirm, exact: true });
const cancelBtn = (dialog: Locator): Locator =>
  dialog.getByRole('button', { name: COPY.dialogCancel, exact: true });

const openTabWithRows = (page: Page, count: number) =>
  gotoMembershipTab(page, baseScenario!.organization.nameId, async p => {
    await expect(membershipRows(p)).toHaveCount(count, { timeout: 5_000 });
  });

const startLeave = async (page: Page, name: string) => {
  await leaveRowButton(page, name).click();
  const dialog = dialogOf(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('Organization Membership tab — leave a Space', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(
      sceneConfig(`org-membership-us2-${runSuffix}`, true)
    );
    leadScenario = await TestScenarioFactory.createBaseScenario(
      sceneConfig(`org-membership-us2l-${runSuffix}`, false)
    );
    await clearHostLead(baseScenario);
    await makePersonaUserMember(spaceRoleSetId(), [
      subspaceRoleSetId(),
      subsubspaceRoleSetId(),
    ]);
    await seedOrgChain();
    // Space L: the organization is Member + Lead (Lead through the invitation).
    await inviteAndAccept(orgId(), leadRoleSetId(), TestUser.GLOBAL_ADMIN, [
      RoleName.Lead,
    ]);
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    await teardownAuthentication();
    // A failed createBaseScenario leaves nothing to clean; surface that error,
    // not a TypeError from here.
    if (!baseScenario) return;
    // Role removal is best-effort; the scenarios are deleted regardless so a
    // failed removal never leaks organizations and Spaces on the shared server.
    try {
      if (leadScenario) {
        await removeOrgRoleIfHeld(orgId(), leadRoleSetId(), RoleName.Lead);
        await removeOrgRoleIfHeld(orgId(), leadRoleSetId(), RoleName.Member);
      }
      await removeAllOrgSpaceRoles(baseScenario);
    } finally {
      if (leadScenario) {
        await TestScenarioFactory.cleanUpBaseScenario(leadScenario);
      }
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  test('US2-AS1 Leave Subspace opens a destructive confirmation naming the Subspace', async ({
    page,
  }) => {
    await openTabWithRows(page, 4); // S, S1, S2, L

    const removeRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('graphql') && request.method() === 'POST') {
        const op = request.postDataJSON()?.operationName ?? '';
        if (/removerolefromorganization/i.test(op)) removeRequests.push(op);
      }
    });

    const dialog = await startLeave(page, subspaceName());

    await expect(
      dialog.getByText(COPY.dialogTitle, { exact: true })
    ).toBeVisible();
    await expect(dialog).toContainText(subspaceName());
    // Nothing is sent before confirming.
    expect(removeRequests).toHaveLength(0);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS2 Cancel changes nothing', async ({ page }) => {
    await openTabWithRows(page, 4); // S, S1, S2, L
    const dialog = await startLeave(page, subspaceName());

    await cancelBtn(dialog).click();

    await expect(dialog).toBeHidden();
    await expect(membershipRows(page)).toHaveCount(4);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(true);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS3 confirming leaves only the Subspace chosen', async ({
    page,
  }) => {
    await openTabWithRows(page, 4); // S, S1, S2, L
    const dialog = await startLeave(page, subspaceName());

    await leaveButton(dialog).click();

    await expect(successToast(page)).toBeVisible({
      timeout: SUCCESS_TOAST_MS,
    });
    await expect(membershipRow(page, subspaceName())).toHaveCount(0);
    await expect(membershipRow(page, spaceName())).toBeVisible();
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS4 leaving the Space ends its Subspace memberships too', async ({
    page,
  }) => {
    // Leaving S1 also ended S2 (shared cascade), and a Subspace invitation
    // re-seats the parent chain — so re-seed the whole chain.
    await seedOrgChain();
    await openTabWithRows(page, 4); // S, S1, S2, L
    await expect(membershipRow(page, subsubspaceName())).toBeVisible();

    const dialog = await startLeave(page, spaceName());
    await leaveButton(dialog).click();

    await expect(successToast(page)).toBeVisible({
      timeout: SUCCESS_TOAST_MS,
    });
    await expect(membershipRow(page, spaceName())).toHaveCount(0);
    await expect(membershipRow(page, subspaceName())).toHaveCount(0);
    await expect(membershipRow(page, subsubspaceName())).toHaveCount(0);
    await expect(membershipRows(page)).toHaveCount(1); // only L remains
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(subsubspaceRoleSetId(), orgId())).toBe(false);
  });

  test('US2-AS5 leaving a Space where the organization is Lead removes the Lead role too', async ({
    page,
  }) => {
    // Leaving is all-or-nothing: the operator ruling in server#6649 (merged
    // 2026-10-09, one hour after this suite) superseded decision D-2 "Lead
    // survives Leave". Removing the organization's MEMBER role now revokes
    // every other role it holds on that role set (LEAD), so the Space leaves
    // the Membership tab entirely — an organization is never left a
    // Lead-without-Member.
    expect(await orgIsMemberOf(leadRoleSetId(), orgId())).toBe(true);
    expect(await orgIsLeadOf(leadRoleSetId(), orgId())).toBe(true);
    await openTabWithRows(page, 1);
    await expect(
      membershipRow(page, leadName()).getByText(COPY.roleLead, { exact: true })
    ).toBeVisible();

    const dialog = await startLeave(page, leadName());
    await leaveButton(dialog).click();

    await expect(successToast(page)).toBeVisible({
      timeout: SUCCESS_TOAST_MS,
    });
    expect(await orgIsMemberOf(leadRoleSetId(), orgId())).toBe(false);
    expect(await orgIsLeadOf(leadRoleSetId(), orgId())).toBe(false);
    await expect(membershipRow(page, leadName())).toHaveCount(0);
    await expect(membershipRows(page)).toHaveCount(0);

    // AS6 and AS7 count on L still being listed next to S: put the plain
    // membership back the only way a new organization can enter a Space.
    await inviteAndAccept(orgId(), leadRoleSetId(), TestUser.GLOBAL_ADMIN);
    expect(await orgIsMemberOf(leadRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS6 a membership removed meanwhile reports an error, never success', async ({
    page,
  }) => {
    await ensureOrgMemberOf(orgId(), [spaceRoleSetId()]);
    await openTabWithRows(page, 2); // S, L

    // A Space admin removes the organization while the tab is open.
    await removeOrgRoleIfHeld(orgId(), spaceRoleSetId(), RoleName.Member);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    await expect(membershipRow(page, spaceName())).toBeVisible(); // stale tab

    const dialog = await startLeave(page, spaceName());
    await leaveButton(dialog).click();

    await expect(errorToast(page)).toBeVisible({ timeout: 8_000 });
    await expect(dialog).toBeHidden();
    await expect(successToast(page)).toHaveCount(0);
    // The list refreshes to the actual memberships.
    await expect(membershipRow(page, spaceName())).toHaveCount(0, {
      timeout: 8_000,
    });
    await expect(membershipRows(page)).toHaveCount(1);
  });

  test('US2-AS7 a second submit is impossible while the leave is in flight', async ({
    page,
  }) => {
    await inviteAndAccept(orgId(), spaceRoleSetId(), TestUser.GLOBAL_ADMIN);
    await openTabWithRows(page, 2); // S, L

    let removeRequests = 0;
    await page.route('**/graphql', async route => {
      const op = route.request().postDataJSON()?.operationName ?? '';
      if (/removerolefromorganization/i.test(op)) {
        removeRequests += 1;
        await new Promise(resolve => setTimeout(resolve, 3_000));
      }
      await route.continue();
    });

    try {
      const dialog = await startLeave(page, spaceName());
      await leaveButton(dialog).click();

      // The confirmed dialog itself stays open and non-interactive while the
      // removal is in flight: busy, disabled confirm and disabled Cancel, so
      // no second request can be sent and the leave cannot be abandoned.
      await expect(dialog).toBeVisible();
      await expect(leaveButton(dialog)).toBeDisabled();
      await expect(leaveButton(dialog)).toHaveAttribute('aria-busy', 'true');
      await expect(cancelBtn(dialog)).toBeDisabled();
      await expect.poll(() => removeRequests).toBe(1);

      await expect(successToast(page)).toBeVisible({ timeout: 15_000 });
      await expect(dialog).toBeHidden();
      expect(removeRequests).toBe(1);
      expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    } finally {
      await page.unroute('**/graphql');
    }
  });
});
