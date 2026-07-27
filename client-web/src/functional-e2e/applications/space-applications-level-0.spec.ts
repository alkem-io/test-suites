// spec: client-web/src/functional-e2e/applications/test-plan-applications-v2.md
// seed: client-web/src/functional-e2e/applications/seed-applications.spec.ts

import { test, expect, Page } from '@playwright/test';
import {
  TestScenarioFactory,
  TestUser,
  TestScenarioConfig,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { loginViaCrd } from '../helpers/login.helper';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-space-applications',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.describe('Level 0 Space - Applications', () => {
  let globalBaseScenario: OrganizationWithSpaceModel;
  let baseScenario: OrganizationWithSpaceModel;
  let nonSpaceMemberPage: Page;
  let spaceAdminPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Scenario creation + isolated non-member login can exceed the default 30s
    // hook budget on the slower test env; give it headroom so the hook doesn't
    // time out and fail the first test with a beforeAll error.
    test.setTimeout(60_000);
    globalBaseScenario =
      await TestScenarioFactory.createBaseScenario(scenarioConfig);
    baseScenario = globalBaseScenario;

    // Sign in as non-space member in an ISOLATED context (separate cookie jar
    // from the admin) so the two CRD sessions don't bleed into each other.
    nonSpaceMemberPage = await (await browser.newContext()).newPage();
    await loginViaCrd(
      nonSpaceMemberPage,
      `${TestUser.NON_SPACE_MEMBER}@alkem.io`,
      password
    );

    // Sign in as space admin in its own isolated context
    spaceAdminPage = await (await browser.newContext()).newPage();
    await loginViaCrd(
      spaceAdminPage,
      `${TestUser.SPACE_ADMIN}@alkem.io`,
      password
    );
  });

  test.afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(globalBaseScenario);
    await nonSpaceMemberPage.close();
    await spaceAdminPage.close();
  });

  test.describe('Space Discovery and Applications', () => {
    test('1.0 Apply button is NOT shown on a public L0 space dashboard', async () => {
      // Use a dedicated PUBLIC space so the non-member actually lands on the
      // dashboard (private spaces redirect non-members to /about).
      const publicScenarioConfig: TestScenarioConfig = {
        name: 'seed-space-apps-public-dashboard',
        space: {
          collaboration: { addTutorialCallouts: false },
          community: {
            admins: [TestUser.SPACE_ADMIN],
            members: [TestUser.SPACE_ADMIN],
          },
          settings: {
            privacy: { mode: SpacePrivacyMode.Public },
            membership: { policy: CommunityMembershipPolicy.Applications },
          },
        },
      };

      const publicScenario =
        await TestScenarioFactory.createBaseScenario(publicScenarioConfig);

      try {
        const page = nonSpaceMemberPage;

        // Navigate to the PUBLIC space dashboard (not /about)
        await page.goto(`${baseUrl}/${publicScenario.space.nameId}`, {
          waitUntil: 'networkidle',
        });

        // Verify no Apply button on the dashboard — per PR #10000,
        // the Apply button was removed from the L0 dashboard entirely.
        const applyButton = page.getByRole('button', { name: 'Apply' });
        await expect(applyButton).not.toBeVisible();
      } finally {
        await TestScenarioFactory.cleanUpBaseScenario(publicScenario);
      }
    });

    test('1.1 Submit Application to Level 0 Space', async () => {
      const page = nonSpaceMemberPage;
      const spaceNameId = baseScenario.space.nameId;

      // 1. Navigate directly to Level 0 Space About page
      await page.goto(`${baseUrl}/${spaceNameId}/about`, {
        waitUntil: 'networkidle',
      });

      // 2. Locate and click the "Apply" button
      await page.getByRole('button', { name: 'Apply' }).click();

      // 3. Verify questionnaire modal/form appears
      const questionnaireHeading = page.getByRole('heading', {
        name: 'Apply to',
        level: 2,
      });
      await expect(questionnaireHeading).toBeVisible();

      // 4. Fill in questionnaire fields with test data
      const requiredField = page.getByRole('textbox', {
        name: "If you have a specific idea for how you'd like to contribute, please share it below.",
      });
      await requiredField.fill(
        'I am interested in collaborating on this space'
      );

      // Verify Apply button is enabled after filling required field
      const submitButton = page
        .getByRole('dialog')
        .last()
        .getByRole('button', { name: 'Apply' });
      await expect(submitButton).toBeEnabled();

      // 5. Submit the application
      await submitButton.click();

      // 6. Verify success confirmation appears (CRD: "Application submitted"
      // dialog, replacing the MUI "Thanks for applying to our community!").
      const successHeading = page.getByRole('heading', {
        name: 'Application submitted',
        level: 2,
      });
      await expect(successHeading).toBeVisible();

      // Close success dialog
      const closeButton = page
        .getByRole('dialog')
        .filter({ hasText: 'Application submitted' })
        .getByRole('button', { name: 'Close' });
      await closeButton.click();

      // 7. Verify the application was submitted successfully
      // Note: Based on manual testing, the UI currently allows re-applying,
      // so we verify that the success message appeared, which confirms submission
      await expect(successHeading).not.toBeVisible();
    });

    test('1.2 View Pending Applications as Space Admin', async () => {
      const page = spaceAdminPage;
      const spaceName = baseScenario.space.about.profile.displayName;

      // 1-2. Navigate to the space (CRD opens settings via a banner link, not
      // the MUI SettingsOutlinedIcon cog).
      await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

      // 3. Open space settings via the CRD banner "Settings" link
      const settingsLink = page.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible({ timeout: 15_000 });
      await settingsLink.click();

      // 4. Verify navigation to space settings page
      await page.waitForURL(`**/${baseScenario.space.nameId}/settings**`);

      // 5-6. Open the CRD "Community" settings tab
      const communityTab = page.getByRole('tab', { name: 'Community' });
      await expect(communityTab).toBeVisible();
      await communityTab.click();

      // 7. Verify the pending-memberships section is visible (CRD renames
      // "Pending applications & invitations" -> "Pending Memberships").
      await expect(
        page.getByRole('heading', { name: 'Pending Memberships' })
      ).toBeVisible();
    });
  });

  test.describe('Application Management', () => {
    test.beforeEach(async () => {
      // Per-test scenario creation + application submission exceeds the default
      // 30s hook budget on the slower test env.
      test.setTimeout(60_000);
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      const spaceName = baseScenario.space.about.profile.displayName;
      const spaceNameId = baseScenario.space.nameId;

      // Step 1: As Non-Space Member - Submit Application
      const applicantPage = nonSpaceMemberPage;

      // Navigate directly to the space about page using nameId
      // This avoids issues with the space not appearing on home page immediately
      await applicantPage.goto(`${baseUrl}/${spaceNameId}/about`, {
        waitUntil: 'networkidle',
      });

      // Check if there's already a pending application (CRD shows a disabled
      // "Application pending" button in place of the Apply button).
      const applicationPending = applicantPage.getByRole('button', {
        name: 'Application pending',
      });
      const isApplicationPending = await applicationPending
        .isVisible()
        .catch(() => false);

      if (!isApplicationPending) {
        // Click the "Apply" button only if no pending application exists
        await applicantPage.getByRole('button', { name: 'Apply' }).click();

        // Fill in the required questionnaire fields with test data
        const requiredField = applicantPage.getByRole('textbox', {
          name: "If you have a specific idea for how you'd like to contribute, please share it below.",
        });
        await requiredField.fill(
          'I am interested in collaborating on this space'
        );

        // Submit the application
        const submitButton = applicantPage
          .getByRole('dialog')
          .last()
          .getByRole('button', { name: 'Apply' });
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        // Verify success confirmation appears (CRD "Application submitted")
        const successHeading = applicantPage.getByRole('heading', {
          name: 'Application submitted',
          level: 2,
        });
        await expect(successHeading).toBeVisible();

        // Close success dialog
        const closeButton = applicantPage
          .getByRole('dialog')
          .filter({ hasText: 'Application submitted' })
          .getByRole('button', { name: 'Close' });
        await closeButton.click();
      }

      // Step 2: As Space Admin - Navigate to Community Settings (CRD)
      const adminPage = spaceAdminPage;

      // Navigate to the space, open settings via the banner "Settings" link
      await adminPage.goto(`${baseUrl}/${spaceNameId}`);
      const settingsLink = adminPage.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible({ timeout: 15_000 });
      await settingsLink.click();
      await adminPage.waitForURL(`**/${baseScenario.space.nameId}/settings**`);

      // Open the CRD "Community" settings tab
      const communityTab = adminPage.getByRole('tab', { name: 'Community' });
      await expect(communityTab).toBeVisible();
      await communityTab.click();
      await expect(
        adminPage.getByRole('heading', { name: 'Pending Memberships' })
      ).toBeVisible({ timeout: 15_000 });
    });

    test.afterEach(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    });

    test('2.1 Reject Application to Level 0 Space', async () => {
      const adminPage = spaceAdminPage;

      // Locate the pending application from the non-space member. CRD renders
      // a semantic table (not a MUI DataGrid); find the application row by the
      // applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the row's "Reject" action button (CRD: named button in the row).
      const rejectButton = applicationRow.getByRole('button', {
        name: 'Reject',
      });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      // Verify rejection confirmation appears (CRD uses a Radix alertdialog)
      const confirmDialog = adminPage.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible();

      // Confirm the rejection action
      const confirmButton = confirmDialog.getByRole('button', {
        name: /confirm|reject|yes/i,
      });
      await confirmButton.click();

      // Verify the application is removed from the pending list
      await expect(applicationRow).not.toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIcon).toBeVisible();
      await notificationsBellIcon.click();

      // Verify notification modal/panel appears with rejection notification
      const notificationsPanel = applicantPage.getByRole('dialog');
      await expect(notificationsPanel).toBeVisible();
      await expect(notificationsPanel).toContainText(/declined/i);
    });

    test('2.2 Archive Application to Level 0 Space', async () => {
      const adminPage = spaceAdminPage;

      // Locate the pending application from the non-space member. CRD renders
      // a semantic table (not a MUI DataGrid); find the application row by the
      // applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the delete button (icon button with aria-label="Delete")
      const deleteButton = applicationRow.getByRole('button', {
        name: 'Delete',
      });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // Verify archive/delete confirmation appears (CRD Radix alertdialog)
      const confirmDialog = adminPage.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible();

      // Confirm the archive/delete action
      const confirmButton = confirmDialog.getByRole('button', {
        name: /archive|delete|confirm|yes/i,
      });
      await confirmButton.click();

      // Verify the application is removed from the pending list
      await expect(applicationRow).not.toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIcon).toBeVisible();
      await notificationsBellIcon.click();

      // Verify notification modal/panel appears with archive notification
      const notificationsPanel = applicantPage.getByRole('dialog');
      await expect(notificationsPanel).toBeVisible();
      await expect(notificationsPanel).toContainText(/declined/i);
    });

    test('2.3 View and Approve Application to Level 0 Space', async () => {
      const adminPage = spaceAdminPage;

      // Locate the pending application from the non-space member. CRD renders
      // a semantic table (not a MUI DataGrid); find the application row by the
      // applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the row's "View application" button (CRD: named button). In CRD
      // this opens a READ-ONLY questionnaire/About preview with no action
      // buttons; approval is performed via the in-row icon button afterwards.
      const viewButton = applicationRow.getByRole('button', {
        name: 'View application',
      });
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      // Verify questionnaire answers modal appears
      const questionnaireModal = adminPage.getByRole('dialog');
      await expect(questionnaireModal).toBeVisible();

      // Verify the questionnaire responses are displayed (read-only preview)
      await expect(questionnaireModal).toContainText(
        'I am interested in collaborating on this space'
      );

      // Close the read-only preview dialog
      await questionnaireModal
        .getByRole('button', { name: 'Close' })
        .first()
        .click();
      await expect(questionnaireModal).not.toBeVisible();

      // Approve via the in-row "Approve" icon button (CRD aria-label="Approve",
      // a tick/checkmark). In CRD, approval is applied immediately with no
      // confirmation dialog, and the application leaves the default
      // "Application received" status filter.
      const approveButton = applicationRow.getByRole('button', {
        name: 'Approve',
      });
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // The approved application moves out of the default "received" filter.
      // Switch to the "Application approved" status filter and verify the
      // application now appears there with the approved status. (The applicant
      // also joins Space Members, so scope the assertion to the membership row
      // carrying the "Application approved" status.)
      await adminPage
        .getByRole('button', { name: /Application approved/i })
        .click();
      await expect(
        applicationRow.filter({ hasText: 'Application approved' })
      ).toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIcon).toBeVisible();
      await notificationsBellIcon.click();

      // Verify notification modal/panel appears with approval notification
      const notificationsPanel = applicantPage.getByRole('dialog');
      await expect(notificationsPanel).toBeVisible();
      await expect(notificationsPanel).toContainText(
        /Welcome to the community/i
      );
    });

    test('2.4 View and Reject Application to Level 0 Space', async () => {
      const adminPage = spaceAdminPage;

      // Locate the pending application from the non-space member. CRD renders
      // a semantic table (not a MUI DataGrid); find the application row by the
      // applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the row's "View application" button (CRD: named button). In CRD
      // this opens a READ-ONLY questionnaire/About preview with no action
      // buttons; rejection is performed via the in-row icon button afterwards.
      const viewButton = applicationRow.getByRole('button', {
        name: 'View application',
      });
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      // Verify questionnaire answers modal appears
      const questionnaireModal = adminPage.getByRole('dialog');
      await expect(questionnaireModal).toBeVisible();

      // Verify the questionnaire responses are displayed (read-only preview)
      await expect(questionnaireModal).toContainText(
        'I am interested in collaborating on this space'
      );

      // Close the read-only preview dialog
      await questionnaireModal
        .getByRole('button', { name: 'Close' })
        .first()
        .click();
      await expect(questionnaireModal).not.toBeVisible();

      // Reject via the in-row "Reject" icon button (CRD aria-label="Reject",
      // an X), mirroring the working 2.1 reject-from-row pattern.
      const rejectButton = applicationRow.getByRole('button', {
        name: 'Reject',
      });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      // Confirm the rejection in the CRD Radix alertdialog
      const confirmDialog = adminPage.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible();
      const confirmButton = confirmDialog.getByRole('button', {
        name: /confirm|reject|yes/i,
      });
      await confirmButton.click();

      // The rejected application moves out of the default "received" filter.
      // Switch to the "Application rejected" status filter and verify the
      // application now appears there with the rejected status.
      await expect(applicationRow).not.toBeVisible();
      await adminPage
        .getByRole('button', { name: /Application rejected/i })
        .click();
      await expect(
        applicationRow.filter({ hasText: 'Application rejected' })
      ).toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIcon).toBeVisible();
      await notificationsBellIcon.click();

      // Verify notification modal/panel appears with rejection notification
      const notificationsPanel = applicantPage.getByRole('dialog');
      await expect(notificationsPanel).toBeVisible();
      await expect(notificationsPanel).toContainText(/declined/i);
    });

    test('2.5 Approve Application Directly from Data Grid', async () => {
      const adminPage = spaceAdminPage;

      // Navigate to home page
      await adminPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon to check for new application notification
      const notificationsBellIconAdmin = adminPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIconAdmin).toBeVisible();
      await notificationsBellIconAdmin.click();

      // Verify notification panel appears with new application notification
      const notificationsPanelAdmin = adminPage.getByRole('dialog');
      await expect(notificationsPanelAdmin).toBeVisible();
      await expect(notificationsPanelAdmin).toContainText(/applied to join/i);
      // Click on the notification to navigate to the community settings page.
      // CRD renders each notification entry as a <button>, not an <a>.
      const applicationNotification = notificationsPanelAdmin
        .getByRole('button')
        .filter({
          hasText: new RegExp(
            `applied to join ${baseScenario.space.about.profile.displayName}`,
            'i'
          ),
        })
        .first();
      await applicationNotification.click();

      // The notification deep-links the admin into the space context. From
      // there, open the space's Community settings (the same path the
      // application-management flow uses) to reach the applications data grid.
      await adminPage.waitForURL(`**/${baseScenario.space.nameId}**`, {
        waitUntil: 'commit',
      });
      const settingsLink = adminPage.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible({ timeout: 15_000 });
      await settingsLink.click();
      await adminPage.waitForURL(`**/${baseScenario.space.nameId}/settings**`);
      const communityTab = adminPage.getByRole('tab', { name: 'Community' });
      await expect(communityTab).toBeVisible();
      await communityTab.click();
      await expect(
        adminPage.getByRole('heading', { name: 'Pending Memberships' })
      ).toBeVisible({ timeout: 15_000 });

      // Locate the pending application from the non-space member. CRD renders
      // a semantic table (not a MUI DataGrid); find the application row by the
      // applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the in-row "Approve" icon button directly (CRD aria-label="Approve").
      // Approval is applied immediately with no confirmation dialog, and the
      // application leaves the default "Application received" status filter.
      const approveButton = applicationRow.getByRole('button', {
        name: 'Approve',
      });
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // The approved application moves out of the default "received" filter.
      // Switch to the "Application approved" status filter and verify the
      // application now appears there with the approved status. (The applicant
      // also joins Space Members, so scope the assertion to the membership row
      // carrying the "Application approved" status.)
      await adminPage
        .getByRole('button', { name: /Application approved/i })
        .click();
      await expect(
        applicationRow.filter({ hasText: 'Application approved' })
      ).toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIcon).toBeVisible();
      await notificationsBellIcon.click();

      // Verify notification modal/panel appears with approval notification
      const notificationsPanel = applicantPage.getByRole('dialog');
      await expect(notificationsPanel).toBeVisible();
      await expect(notificationsPanel).toContainText(
        /Welcome to the community/i
      );
    });
  });
});
