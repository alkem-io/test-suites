// User Story 3 (workspace#090, server#6692 / server#6708 / client-web#10468):
// "Support reaches the Community tab and nothing else, and cannot elevate itself".
//
// W-02: every other settings path of an organisation leads a Platform Support
// user back to the Community tab, whose tab strip holds that tab alone; an
// organisation admin keeps the full six-tab shell (the positive control, which
// also guards the catch-all redirect that was rewritten for this change).
// W-03: the self-target refusal reaches the user as the one dedicated message,
// once, and changes nothing.
//
// The API half of the same rules (what the server refuses, with which code) is in
// server-api/src/functional-api/roleset/associates/support-org-community-*.it-spec.ts.
import { expect, test as baseTest } from '@playwright/test';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  cleanUpTestOrganizations,
  getUserIdsInRole,
  inviteUserToOrganizationRaw,
  runSuffix,
  type OrgFixture,
} from '../organization-user-associates/organization-user-associates.helpers';
import {
  acceptInvitationRaw,
  assertSupportIsSupportOnly,
  createManagedOrganization,
  displayNameOf,
  ORG_ADMIN_EMAIL,
  openCommunityTab,
  SELF_TARGET_TOAST,
  SUPPORT_EMAIL,
  settingsUrl,
  userIdOf,
} from './support-org-community-admin.helpers';
import { getUserToken } from '@alkemio/tests-lib';

baseTest.describe.configure({ mode: 'serial' });

const supportTest = createPersonaTest(SUPPORT_EMAIL);
const orgAdminTest = createPersonaTest(ORG_ADMIN_EMAIL);

/** Support holds no role on this organisation: it is the W-02 subject. */
let outsider: OrgFixture;
/** Support is an associate of this one, by consent: it is the W-03 subject. */
let consented: OrgFixture;
let supportId = '';
let supportName = '';

baseTest.beforeAll(async () => {
  baseTest.setTimeout(120_000);
  await assertSupportIsSupportOnly();
  supportId = await userIdOf(SUPPORT_EMAIL);
  supportName = await displayNameOf(SUPPORT_EMAIL);
  outsider = await createManagedOrganization('SupOutsider', runSuffix);
  consented = await createManagedOrganization('SupConsent', runSuffix);

  // Consent: the organisation admin invites Support, Support accepts (API).
  const orgAdminToken = await getUserToken(ORG_ADMIN_EMAIL);
  const invitation = await inviteUserToOrganizationRaw(
    consented.roleSetId,
    supportId,
    `US3 consent ${runSuffix}`,
    orgAdminToken
  );
  expect(invitation.type).toEqual('INVITED_TO_ROLE_SET');
  await acceptInvitationRaw(invitation.invitationId!, await getUserToken(SUPPORT_EMAIL));
  expect(await getUserIdsInRole(consented.roleSetId, RoleName.Associate)).toContain(supportId);
  expect(await getUserIdsInRole(consented.roleSetId, RoleName.Admin)).not.toContain(supportId);
});

baseTest.afterAll(async () => {
  await cleanUpTestOrganizations();
});

// Index, the five legacy tabs, the old "settings" tab, the pre-#10476 "community" URL and an unknown segment.
const OTHER_SETTINGS_PATHS = [
  '',
  '/profile',
  '/account',
  '/membership',
  '/invitations',
  '/settings',
  '/authorization',
  '/community',
  '/bogus',
];

supportTest.describe('W-02 — Support is confined to the Community tab', () => {
  supportTest('every other settings path redirects to Community, whose tab strip holds that one tab', async ({ page }) => {
    supportTest.setTimeout(150_000);
    for (const tail of OTHER_SETTINGS_PATHS) {
      await page.goto(settingsUrl(outsider, tail));
      await expect(page.getByRole('heading', { name: 'Pending applications & invitations' }), `settings${tail}`).toBeVisible({
        timeout: 20_000,
      });
      await expect(page, `settings${tail}`).toHaveURL(new RegExp(`/organization/${outsider.nameID}/settings/associates$`));
      await expect(page.getByRole('tab'), `settings${tail}`).toHaveCount(1);
      await expect(page.getByRole('tab', { name: 'Associates' }), `settings${tail}`).toHaveAttribute(
        'aria-selected',
        'true'
      );
    }
  });
});

orgAdminTest.describe('W-02 (control) — an organisation admin keeps the full shell', () => {
  orgAdminTest('an unknown settings path lands on Profile with all six tabs', async ({ page }) => {
    await page.goto(settingsUrl(outsider, '/bogus'));
    await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true', {
      timeout: 20_000,
    });
    await expect(page).toHaveURL(new RegExp(`/organization/${outsider.nameID}/settings/profile$`));
    await expect(page.getByRole('tab')).toHaveCount(6);
  });
});

supportTest.describe('W-03 — the self-target refusal reaches the user', () => {
  supportTest('promoting oneself to Admin from the row editor shows the dedicated message once and changes nothing', async ({
    page,
  }) => {
    await openCommunityTab(page, consented);

    const row = page.getByRole('listitem').filter({ hasText: supportName });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: new RegExp(`^Edit .*${supportName}`) }).click();
    const dialog = page.getByRole('dialog', { name: new RegExp(`^Edit .*${supportName}`) });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('switch', { name: 'Admin', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    // Exactly one toast: the change fired a triple toast before this fix.
    await expect(page.getByText(SELF_TARGET_TOAST, { exact: true })).toHaveCount(1, { timeout: 15_000 });

    // Nothing changed, on screen or on the server.
    await expect.poll(() => getUserIdsInRole(consented.roleSetId, RoleName.Admin), { timeout: 10_000 }).not.toContain(supportId);
    expect(await getUserIdsInRole(consented.roleSetId, RoleName.Associate)).toContain(supportId);
  });
});
