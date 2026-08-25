// spec: workspace#040-sidebar-widget-config (specs/040-sidebar-widget-config/spec.md, US1)
// Acceptance walk for User Story 1 — "Members keep the sidebar they know, now
// driven by per-tab configuration". Builds a Space with the fixture content
// described in specs/040-sidebar-widget-config/quickstart.md (subspace, future
// event, community update, guidelines, lead, extra tab) purely through the
// product UI, then asserts each tab's sidebar renders the FR-009 default
// widget set in order for a plain (non-admin) member.
//
// AS5 (missing/unknown stored `sidebar` entries) is NOT automated here: the
// scenario is explicitly defined as a manufactured direct-DB-edit condition
// ("manufactured via direct DB edit on the forge instance" — spec.md US1-AS5),
// which is an operator/QA action outside a UI-driven regression walk's scope
// and outside this suite's existing raw-SQL-free conventions. It was verified
// manually during the 2026-08-20 acceptance run (see forge evidence
// worktrees/040-sidebar-widget-config/.forge/evidence/US1/).

import { test, expect } from '@playwright/test';
import { TestScenarioFactory, TestUserManager } from '@alkemio/tests-lib';
import {
  HomePage,
  MyAccountPage,
  CreateSpaceDialog,
  SpacePage,
  SpaceSettingsPage,
} from '@src/functional-e2e/space/pages';
import { acceptCookiesIfVisible } from '@src/functional-e2e/helpers/cookies.helper';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// Two independent authenticated sessions are needed for this walk: the Space
// admin who builds the fixture, and a plain member who only ever reads it.
// `createAuthenticatedSessionFixture` gives each its own shared context/page
// so the two personas never race for the same browser tab.
const admin = createAuthenticatedSessionFixture({
  storageStateName: 'us1-sidebar-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});
const member = createAuthenticatedSessionFixture({
  storageStateName: 'us1-sidebar-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

let spaceName: string;
let spaceUrl: string;

test.describe('@forge-acceptance US1 — default sidebar rendering (per-tab widget config)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);

    await TestScenarioFactory.createBaseScenarioEmpty({
      name: 'us1-sidebar-widgets',
    });

    await admin.setupAuthentication(
      browser,
      TestUserManager.users.globalAdmin.email
    );
    await member.setupAuthentication(
      browser,
      TestUserManager.users.qaUser.email
    );

    const adminPage = admin.getSharedPage();
    const uniqueId = Date.now().toString().slice(-6);
    spaceName = `Sidebar Space ${uniqueId}`;
    spaceUrl = `sidebar-${uniqueId}`;

    // --- Create the Space (My Account > Hosted Spaces > Create Space) ------
    const homePage = new HomePage(adminPage, baseUrl);
    const myAccountPage = new MyAccountPage(adminPage, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(adminPage);
    const spacePage = new SpacePage(adminPage, baseUrl);

    await homePage.navigateToMyAccount();
    await myAccountPage.openCreateSpaceDialog();
    await createSpaceDialog.waitForVisible();
    await createSpaceDialog.createSpace(spaceName, spaceUrl);
    await createSpaceDialog.waitForHidden();
    await adminPage.waitForURL(new RegExp(`.*/${spaceUrl}.*`));
    await spacePage.waitForSpaceReady();
    await spacePage.dismissSuccessDialog();

    // --- Subspace "Sub One" (feeds subspaceLinks on tab 1) -----------------
    await adminPage.goto(`${baseUrl}/${spaceUrl}/subspaces`);
    await acceptCookiesIfVisible(adminPage);
    await adminPage.getByRole('button', { name: 'CREATE SUBSPACE' }).click();
    const subspaceDialog = adminPage.getByRole('dialog', {
      name: 'Create new Subspace',
    });
    await subspaceDialog.getByRole('textbox', { name: 'Name' }).fill('Sub One');
    await subspaceDialog
      .getByRole('button', { name: 'CREATE SUBSPACE' })
      .click();
    await expect(adminPage.getByText('Sub One')).toBeVisible({
      timeout: 15_000,
    });

    // --- Future calendar event (feeds events on tab 1) ----------------------
    await adminPage.goto(`${baseUrl}/${spaceUrl}`);
    await acceptCookiesIfVisible(adminPage);
    const homeSidebar = adminPage.locator('#crd-space-sidebar-desktop');
    await homeSidebar.getByRole('button', { name: 'Add event' }).click();
    const eventDialog = adminPage.getByRole('dialog', { name: 'Add event' });
    await eventDialog
      .getByRole('textbox', { name: 'Title' })
      .fill('Future Kickoff Call');
    await eventDialog.getByRole('button', { name: /Start date/ }).click();
    // Jump to next month so every visible day cell is unambiguously future —
    // no risk of colliding with a same-numbered cell from the current or
    // previous month at the calendar's edges.
    await adminPage.getByRole('button', { name: 'Go to next month' }).click();
    await adminPage.getByRole('gridcell', { name: '15', exact: true }).click();
    await eventDialog.getByRole('combobox', { name: 'Type' }).click();
    await adminPage.getByRole('option', { name: 'Meeting' }).click();
    await eventDialog.getByRole('button', { name: 'Save' }).click();
    await expect(eventDialog).toBeHidden({ timeout: 10_000 });
    // Saving routes into a read-only "Events" dialog; dismiss it with Escape
    // (matches the fallback-close pattern used elsewhere in this suite, e.g.
    // CreateSpaceDialog.clickClose) rather than guessing its close button name.
    await adminPage.keyboard.press('Escape');

    // --- Community update (feeds updates on tab 1) --------------------------
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/updates`);
    await acceptCookiesIfVisible(adminPage);
    await adminPage.getByRole('button', { name: 'NEW UPDATE' }).click();
    await adminPage
      .getByRole('textbox', { name: 'Write your update…' })
      .click();
    await adminPage.keyboard.type('We shipped the first milestone this week!');
    await adminPage.getByRole('button', { name: 'Publish' }).click();
    await expect(
      adminPage.getByText('We shipped the first milestone this week!')
    ).toBeVisible({
      timeout: 10_000,
    });

    // --- Community guidelines (feeds guidelines on tab 2) --------------------
    await adminPage.goto(
      `${baseUrl}/${spaceUrl}/settings/community#guidelines`
    );
    await acceptCookiesIfVisible(adminPage);
    await adminPage
      .getByRole('textbox', { name: 'Title' })
      .fill(`${spaceName} Guidelines`);
    await adminPage.locator('[contenteditable="true"]').first().click();
    await adminPage.keyboard.type('Be respectful and collaborative.');
    await adminPage.getByRole('button', { name: 'SAVE GUIDELINES' }).click();
    await expect(
      adminPage.getByText('Community guidelines updated successfully.')
    ).toBeVisible({
      timeout: 10_000,
    });

    // --- Extra tab (4th+ position -> generic [intent, index] default) -------
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/layout`);
    await acceptCookiesIfVisible(adminPage);
    await adminPage.getByRole('button', { name: 'ADD TAB' }).click();
    const addTabDialog = adminPage.getByRole('dialog', {
      name: 'Add a new tab',
    });
    await addTabDialog.getByRole('textbox', { name: 'Tab name' }).fill('Extra');
    await addTabDialog.getByRole('button', { name: 'Add tab' }).click();
    await expect(
      adminPage.getByRole('heading', { name: 'Extra', level: 3 })
    ).toBeVisible({
      timeout: 10_000,
    });

    // --- Invite the member persona (admin is already the auto-assigned lead) -
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/community`);
    await acceptCookiesIfVisible(adminPage);
    await adminPage
      .getByRole('button', { name: 'Invite', exact: true })
      .click();
    const inviteDialog = adminPage.getByRole('dialog', {
      name: /Invite others/,
    });
    await inviteDialog
      .getByRole('textbox', { name: 'Search for users by name or email' })
      .fill(TestUserManager.users.qaUser.email);
    await inviteDialog.getByRole('button', { name: /qa/i }).click();
    await inviteDialog.getByRole('button', { name: 'Send' }).click();
    await expect(inviteDialog.getByText('Invitation sent')).toBeVisible({
      timeout: 10_000,
    });
    await inviteDialog.getByRole('button', { name: 'Close' }).click();

    // --- Member accepts the invitation --------------------------------------
    const memberPage = member.getSharedPage();
    await memberPage.goto(`${baseUrl}/home`);
    await acceptCookiesIfVisible(memberPage);
    await memberPage.getByRole('link', { name: 'Invitations' }).click();
    await memberPage.getByRole('button', { name: 'ACCEPT' }).click();
    await expect(memberPage.getByText(spaceName)).toBeVisible({
      timeout: 15_000,
    });
  });

  test.afterAll(async () => {
    // Cleanup: delete the Space as admin, then close both sessions.
    const adminPage = admin.getSharedPage();
    if (spaceUrl) {
      const spacePage = new SpacePage(adminPage, baseUrl);
      const spaceSettingsPage = new SpaceSettingsPage(adminPage);
      await spacePage.goto(spaceUrl).catch(() => {});
      await spacePage.navigateToSettings().catch(() => {});
      await spaceSettingsPage.deleteSpace().catch(() => {});
    }
    await admin.teardownAuthentication();
    await member.teardownAuthentication();
  });

  test('US1-AS1 — Home tab (tab 1) sidebar renders Intention&Leads, About, Subspaces, Events, Update in order', async () => {
    const memberPage = member.getSharedPage();
    await memberPage.goto(`${baseUrl}/${spaceUrl}`);
    await acceptCookiesIfVisible(memberPage);

    const sidebar = memberPage.locator('#crd-space-sidebar-desktop');
    await expect(sidebar.getByText('Space Lead')).toBeVisible();
    await expect(
      sidebar.getByRole('button', { name: 'About this Space' })
    ).toBeVisible();
    await expect(
      sidebar.getByRole('heading', { name: 'Subspaces' })
    ).toBeVisible();
    await expect(sidebar.getByText('Sub One')).toBeVisible();
    await expect(
      sidebar.getByRole('heading', { name: 'Events' })
    ).toBeVisible();
    await expect(sidebar.getByText('Future Kickoff Call')).toBeVisible();
    await expect(
      sidebar.getByRole('heading', { name: 'Updates' })
    ).toBeVisible();
    await expect(
      sidebar.getByText('We shipped the first milestone this week!')
    ).toBeVisible();

    // Order: Intention&Leads -> About -> Subspaces -> Events -> Updates
    const sidebarText = await sidebar.innerText();
    const order = [
      'Space Lead',
      'About this Space',
      'Subspaces',
      'Events',
      'Updates',
    ].map(marker => sidebarText.indexOf(marker));
    expect(order.every(i => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test('US1-AS2 — Community tab (tab 2) sidebar renders Intention&Leads, Contact-lead, Guidelines in order', async () => {
    const memberPage = member.getSharedPage();
    await memberPage.goto(`${baseUrl}/${spaceUrl}/community`);
    await acceptCookiesIfVisible(memberPage);

    const sidebar = memberPage.locator('#crd-space-sidebar-desktop');
    await expect(sidebar.getByText('Space Lead')).toBeVisible();
    await expect(
      sidebar.getByRole('button', { name: 'Contact Leads' })
    ).toBeVisible();
    await expect(sidebar.getByText(`${spaceName} Guidelines`)).toBeVisible();

    // A plain member has neither invite permission nor VC entitlement by
    // default in this fixture — FR-012 says a configured-but-inapplicable
    // widget renders nothing, so neither should appear for this persona.
    await expect(
      sidebar.getByRole('button', { name: 'Invite', exact: true })
    ).toHaveCount(0);
    await expect(
      sidebar.getByRole('heading', { name: 'Virtual Contributors' })
    ).toHaveCount(0);

    const sidebarText = await sidebar.innerText();
    const order = [
      'Space Lead',
      'Contact Leads',
      `${spaceName} Guidelines`,
    ].map(marker => sidebarText.indexOf(marker));
    expect(order.every(i => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  // The stored 3rd-tab default is [createSubspace, createPost, applicationButton,
  // intent] (2026-08-25 RULING promoted Create Subspace to lead it), but the three
  // action widgets are privilege/applicability-gated and render nothing for a plain
  // member (FR-012) — so the member-visible sidebar is still Intention&Leads only.
  test('US1-AS3 — Subspaces tab (tab 3) sidebar renders Intention&Leads only', async () => {
    const memberPage = member.getSharedPage();
    await memberPage.goto(`${baseUrl}/${spaceUrl}/?tab=3`);
    await acceptCookiesIfVisible(memberPage);

    const sidebar = memberPage.locator('#crd-space-sidebar-desktop');
    await expect(sidebar.getByText('Space Lead')).toBeVisible();
    await expect(
      sidebar.getByRole('button', { name: 'About this Space' })
    ).toHaveCount(0);
    await expect(sidebar.getByRole('heading', { name: 'Events' })).toHaveCount(
      0
    );
    await expect(sidebar.getByRole('heading', { name: 'Updates' })).toHaveCount(
      0
    );
    await expect(
      sidebar.getByRole('button', { name: 'Post Index' })
    ).toHaveCount(0);
  });

  test('US1-AS4 — tab 4 (Knowledge) and tab "Extra" render Intention&Leads + Post Index, dialog opens', async () => {
    const memberPage = member.getSharedPage();

    for (const tabIndex of [4, 5]) {
      await memberPage.goto(`${baseUrl}/${spaceUrl}/?tab=${tabIndex}`);
      await acceptCookiesIfVisible(memberPage);

      const sidebar = memberPage.locator('#crd-space-sidebar-desktop');
      await expect(sidebar.getByText('Space Lead')).toBeVisible();
      const postIndexButton = sidebar.getByRole('button', {
        name: 'Post Index',
      });
      await expect(postIndexButton).toBeVisible();

      // Nothing from the other variants should have leaked onto this tab.
      await expect(
        sidebar.getByRole('button', { name: 'About this Space' })
      ).toHaveCount(0);
      await expect(
        sidebar.getByRole('heading', { name: 'Events' })
      ).toHaveCount(0);
      await expect(
        sidebar.getByRole('heading', { name: 'Updates' })
      ).toHaveCount(0);

      await postIndexButton.click();
      const postIndexDialog = memberPage.getByRole('dialog', {
        name: 'Post Index',
      });
      await expect(postIndexDialog).toBeVisible();
      await memberPage.keyboard.press('Escape');
      await expect(postIndexDialog).toBeHidden();
    }
  });
});
