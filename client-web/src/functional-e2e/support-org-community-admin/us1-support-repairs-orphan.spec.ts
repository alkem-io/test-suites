// User Story 1 (workspace#090, server#6692 / server#6708 / client-web#10468):
// "Platform Support repairs an organisation that lost all its admins".
//
// The walk a Platform Support user takes on an orphaned organisation: open the
// organisation, reach its settings from the profile (the link is offered to
// Support), land on the Community tab as the only tab, invite a user offering
// Admin, and see that user arrive as Associate + Admin once they accept.
//
// The API half (every gate, every audit row, accept-time honouring) is in
// server-api/src/functional-api/roleset/associates/support-org-community-*.it-spec.ts.
// This file covers what only the browser shows: the settings link, the
// community-only shell, the invite dialog, the pending row and the member row.
//
// Serial: the three persona blocks are one journey (invite -> accept -> see).
// Mail: the invitee is registered through the real sign-up flow, so run with
// one worker (the shared MailSlurper inbox).
import { expect, test as baseTest } from '@playwright/test';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  cleanUpTestOrganizations,
  deletePersonasByEmail,
  registerPersona,
  runSuffix,
  type OrgFixture,
} from '../organization-user-associates/organization-user-associates.helpers';
import {
  assertSupportIsSupportOnly,
  baseUrl,
  createOrphanOrganization,
  displayNameOf,
  openCommunityTab,
  rolesOn,
  SUPPORT_EMAIL,
  settingsUrl,
  userIdOf,
} from './support-org-community-admin.helpers';

baseTest.describe.configure({ mode: 'serial' });

let orphan: OrgFixture;
let inviteeEmail = '';
let inviteeId = '';
let inviteeName = '';

const supportTest = createPersonaTest(SUPPORT_EMAIL);
// The invitee's identity is registered in `beforeAll`; the persona fixture
// provisions it on demand if its first login runs earlier.
const inviteeTest = createPersonaTest(`us090-invitee-${runSuffix}@alkem.io`);

baseTest.beforeAll(async () => {
  // A Kratos registration + mailbox verification, an organisation and a persona login.
  baseTest.setTimeout(180_000);
  await assertSupportIsSupportOnly();
  inviteeEmail = await registerPersona('us090-invitee');
  inviteeId = await userIdOf(inviteeEmail);
  inviteeName = await displayNameOf(inviteeEmail);
  orphan = await createOrphanOrganization('SupOrphan', runSuffix);
});

baseTest.afterAll(async () => {
  const failures: string[] = [];
  try {
    await cleanUpTestOrganizations();
  } catch (error) {
    failures.push((error as Error)?.message ?? String(error));
  }
  failures.push(...(await deletePersonasByEmail([inviteeEmail])));
  if (failures.length > 0) {
    throw new Error(
      `[us1-support-repairs-orphan afterAll] ${failures.length} fixture(s) could not be torn down:\n  ${failures.join('\n  ')}`
    );
  }
});

supportTest.describe('W-01 — Support repairs an orphaned organisation: reach the tab and invite', () => {
  supportTest(
    'from the profile the settings link is offered; it lands on the Community tab as the only tab, empty, with Invite enabled; inviting a user offering Admin shows the pending row',
    async ({ page }) => {
      supportTest.setTimeout(150_000);

      // FR-020: the settings link is offered to Platform Support.
      await page.goto(`${baseUrl}/organization/${orphan.nameID}`);
      const settingsLink = page.getByRole('link', { name: 'Open organisation settings' });
      await expect(settingsLink).toBeVisible({ timeout: 20_000 });
      await settingsLink.click();

      // FR-019/FR-022: the Community tab, alone, with no extra affordance.
      await expect(page).toHaveURL(new RegExp(`/organization/${orphan.nameID}/settings/associates$`));
      await expect(page.getByRole('heading', { name: 'Pending applications & invitations' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole('tab')).toHaveCount(1);
      await expect(page.getByRole('tab', { name: 'Associates' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('heading', { name: 'Associates', level: 4 })).toBeVisible();
      await expect(page.getByText('No associates yet.', { exact: true })).toBeVisible();
      const invite = page.getByRole('button', { name: 'Invite', exact: true });
      await expect(invite).toBeEnabled();

      // Invite the registered user, offering Admin.
      await invite.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(`Invite associates to "${orphan.displayName}"`)).toBeVisible();
      await dialog.getByRole('textbox', { name: 'Search for users by name or email' }).fill(inviteeName);
      await dialog.getByRole('button', { name: inviteeName }).click();
      await dialog.getByRole('button', { name: 'Choose roles for the invitees' }).click();
      await page.getByRole('checkbox', { name: 'Admin' }).check();
      await dialog.getByRole('button', { name: 'Choose roles for the invitees' }).click(); // close the popover
      await dialog.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(dialog.getByText('Invitation sent', { exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: 'Close', exact: true }).click();

      // The pending table shows the invitee with the offered role.
      const row = page.getByRole('row', { name: new RegExp(inviteeName) });
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText('Associate + Admin');
      await expect(page.getByRole('button', { name: /^Invited \(1\)$/ })).toBeVisible();
    }
  );
});

inviteeTest.describe('W-01 — the invitee accepts', () => {
  inviteeTest('the invitee responds to the invitation from the organisation profile and accepts', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orphan.nameID}`);
    const respond = page.getByRole('button', { name: 'Respond to invitation' });
    await expect(respond).toBeVisible({ timeout: 20_000 });
    await respond.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Associate + Admin');
    await dialog.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Respond to invitation' })).toHaveCount(0, { timeout: 20_000 });
  });
});

supportTest.describe('W-01 — Support sees the repaired organisation', () => {
  supportTest('reloading the Community tab lists the invitee as Associate + Admin, and the server agrees', async ({ page }) => {
    await openCommunityTab(page, orphan);
    const member = page.getByRole('listitem').filter({ hasText: inviteeName });
    await expect(member).toBeVisible({ timeout: 15_000 });
    await expect(member).toContainText('Associate');
    await expect(member).toContainText('Admin');
    await expect(page.getByText('No associates yet.', { exact: true })).toHaveCount(0);

    // The server's record, so the screen cannot lie: in both roles.
    const held = await rolesOn(orphan.roleSetId);
    expect(held[RoleName.Associate]).toContain(inviteeId);
    expect(held[RoleName.Admin]).toContain(inviteeId);
    // And the page we were on is still the Community tab.
    await expect(page).toHaveURL(settingsUrl(orphan, '/associates'));
  });
});
