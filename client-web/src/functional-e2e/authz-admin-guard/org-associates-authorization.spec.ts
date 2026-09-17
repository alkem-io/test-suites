// Feature: 085-authz-admin-guard (client-web#9537) — organization role
// management. Release 75 verification rows 2 and 3 (P2, P3).
//
// RETARGETED by workspace#062-organization-user-associates: the Community and
// Authorization tabs this file used to drive are gone. Their add/remove
// controls (`Add X as Associate/Admin/Owner`) no longer exist anywhere —
// becoming an associate is invite-only now — and `/settings/authorization`
// redirects to the Associates tab. Role management for an EXISTING associate
// moved into that tab's per-row pencil editor, so the same two personas are
// probed there instead:
//
//  - ORGANIZATION_ADMIN — admin of the scenario organization: the editor's
//                         controls act and the change persists, no denied toast.
//  - GLOBAL_SUPPORT     — the actor R-2 names. The contract asserted is the
//                         one that matters, and is unchanged: a control is
//                         EITHER gated off OR enabled and honoured by the
//                         server. "Enabled, then refused" is the defect.
//
// The subject is seeded as an associate through the API, because no UI path
// adds one any more (062 US5: the tab is invite-only). Editor mechanics,
// role caps and the redirect are covered by the feature's own walks in
// ../organization-user-associates/ (us1, us5); this file only owns the
// authorization contract above.
import { expect, Locator, Page } from '@playwright/test';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager } from '@alkemio/tests-lib';
import {
  assignUserRoleOnOrganization,
  getUserIdsInRole,
} from '../organization-user-associates/organization-user-associates.helpers';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { DENIED_TOAST } from './authz-admin-guard.helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'authz-org-tabs',
  organization: { community: { addMembers: false, addAdmin: true } },
};

let baseScenario: OrganizationWithSpaceModel;
const subject = () => TestUserManager.users.qaUser.displayName;
const subjectId = () => TestUserManager.users.qaUser.id;
const associatesTabUrl = () =>
  `${baseUrl}/organization/${baseScenario.organization.nameId}/settings/community`;

const orgAdminTest = createPersonaTest('organization.admin@alkem.io');
const globalSupportTest = createPersonaTest('global.support@alkem.io');
orgAdminTest.describe.configure({ mode: 'serial' });

orgAdminTest.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  // No UI adds an associate any more (062 US5), so the row under edit is seeded.
  await assignUserRoleOnOrganization(baseScenario.organization.roleSetId, subjectId(), RoleName.Associate);
});

globalSupportTest.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** Associates tab, waiting for the associates card. */
const openAssociatesTab = async (page: Page) => {
  await page.goto(associatesTabUrl());
  await expect(page.getByRole('heading', { name: 'Associates' })).toBeVisible({ timeout: 15_000 });
};

/** Re-grants the subject the entry role when a previous case removed them. */
const reseedSubjectAsAssociate = async () => {
  const associates = await getUserIdsInRole(baseScenario.organization.roleSetId, RoleName.Associate);
  if (!associates.includes(subjectId())) {
    await assignUserRoleOnOrganization(baseScenario.organization.roleSetId, subjectId(), RoleName.Associate);
  }
};

/** The subject's row editor (pencil), resolved to the open dialog. */
const openSubjectEditor = async (page: Page): Promise<Locator> => {
  const row = page.getByRole('listitem').filter({ hasText: new RegExp(subject(), 'i') });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: new RegExp(`^Edit .*${subject()}`, 'i') }).click();
  const dialog = page.getByRole('dialog', { name: new RegExp(`^Edit .*${subject()}`, 'i') });
  await expect(dialog).toBeVisible();
  return dialog;
};

orgAdminTest.describe('Org Associates editor — ORGANIZATION_ADMIN (P2, P3)', () => {
  orgAdminTest('2.1 Grant Admin to an associate; it persists; no denied toast', async ({ page }) => {
    await openAssociatesTab(page);
    const dialog = await openSubjectEditor(page);

    await dialog.getByRole('switch', { name: 'Admin', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await expect
      .poll(() => getUserIdsInRole(baseScenario.organization.roleSetId, RoleName.Admin), { timeout: 15_000 })
      .toContain(subjectId());
  });

  orgAdminTest('2.2 Revoke Admin from that associate; it persists', async ({ page }) => {
    await openAssociatesTab(page);
    const dialog = await openSubjectEditor(page);

    await dialog.getByRole('switch', { name: 'Admin', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await expect
      .poll(() => getUserIdsInRole(baseScenario.organization.roleSetId, RoleName.Admin), { timeout: 15_000 })
      .not.toContain(subjectId());
  });

  orgAdminTest('2.3 Remove from organisation; it persists', async ({ page }) => {
    await openAssociatesTab(page);
    const dialog = await openSubjectEditor(page);

    await dialog.getByRole('button', { name: 'Remove from organisation', exact: true }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Remove from organisation', exact: true }).click();

    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await expect
      .poll(() => getUserIdsInRole(baseScenario.organization.roleSetId, RoleName.Associate), { timeout: 15_000 })
      .not.toContain(subjectId());
  });

  // Last, and on a re-seeded row: granting Owner can leave the subject as the
  // organization's ONLY owner, and the row editor then (correctly) refuses to
  // remove them — "an organisation must keep at least one owner". Probing Owner
  // before the removal case would make that refusal look like a removal defect.
  orgAdminTest('2.4 The Owner control is gated off OR honoured, never enabled-then-refused', async ({ page }) => {
    await reseedSubjectAsAssociate();
    await openAssociatesTab(page);
    const dialog = await openSubjectEditor(page);
    const owner = dialog.getByRole('switch', { name: 'Owner', exact: true });

    if ((await owner.count()) === 0) {
      orgAdminTest.info().annotations.push({ type: 'Owner control', description: 'not offered' });
      return;
    }
    if (await owner.isDisabled()) {
      orgAdminTest.info().annotations.push({ type: 'Owner control', description: 'gated off' });
      return;
    }

    await owner.click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    // Enabled: the server must honour it. A refusal surfaces as the denied toast.
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await expect
      .poll(() => getUserIdsInRole(baseScenario.organization.roleSetId, RoleName.Owner), { timeout: 15_000 })
      .toContain(subjectId());
  });
});

globalSupportTest.describe('Org Associates tab — GLOBAL_SUPPORT probe (R-2 / R-6)', () => {
  globalSupportTest(
    '4.1 Invite: GLOBAL_SUPPORT holds the invite privilege on every organization (062 US2-AS9), so the control is enabled and opens the dialog',
    async ({ page }) => {
      await openAssociatesTab(page);
      // Exactly the Associates card's "Invite" action — NOT the pending section's
      // "Revoke invitation" rows, which also match a loose /invite/i and render first.
      //
      // This used to be a three-way probe that recorded whichever branch it
      // found and could not fail on any product defect. The policy is settled
      // (spec 062 US2-AS9: GLOBAL_ADMIN / GLOBAL_SUPPORT hold
      // ROLESET_ENTRY_ROLE_INVITE on every organization), so the expected
      // branch is asserted: offered, enabled, and the invite dialog opens with
      // no denied toast.
      const invite = page.getByRole('button', { name: 'Invite', exact: true });
      await expect(invite).toBeVisible({ timeout: 8_000 });
      await expect(invite).toBeEnabled();
      await invite.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    }
  );

  globalSupportTest(
    '4.2 Row editor: the control is gated off OR enabled-and-honoured, never enabled-then-refused',
    async ({ page }) => {
      await openAssociatesTab(page);
      const record = (outcome: string) => {
        globalSupportTest.info().annotations.push({ type: 'GLOBAL_SUPPORT outcome', description: `Editor: ${outcome}` });
        console.log(`[authz-probe] GLOBAL_SUPPORT on org row editor: ${outcome}`);
      };

      const row = page.getByRole('listitem').filter({ hasText: new RegExp(subject(), 'i') });
      if ((await row.count()) === 0) {
        await reseedSubjectAsAssociate();
        await openAssociatesTab(page);
      }

      const editButton = page
        .getByRole('listitem')
        .filter({ hasText: new RegExp(subject(), 'i') })
        .getByRole('button', { name: new RegExp(`^Edit .*${subject()}`, 'i') });
      await editButton.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => undefined);
      if ((await editButton.count()) === 0) {
        record('editor not offered');
        return;
      }
      if (await editButton.isDisabled()) {
        record('editor gated off');
        return;
      }

      await editButton.click();
      const dialog = page.getByRole('dialog', { name: new RegExp(`^Edit .*${subject()}`, 'i') });
      await expect(dialog).toBeVisible();
      const admin = dialog.getByRole('switch', { name: 'Admin', exact: true });
      if ((await admin.count()) === 0 || (await admin.isDisabled())) {
        record('Admin switch gated off');
        return;
      }

      record('Admin switch enabled and honoured by the server');
      await admin.click();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
      await expect
        .poll(() => getUserIdsInRole(baseScenario.organization.roleSetId, RoleName.Admin), { timeout: 15_000 })
        .toContain(subjectId());
    }
  );
});
