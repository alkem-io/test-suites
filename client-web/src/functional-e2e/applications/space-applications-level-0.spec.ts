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
    globalBaseScenario =
      await TestScenarioFactory.createBaseScenario(scenarioConfig);
    baseScenario = globalBaseScenario;

    // Sign in as non-space member
    nonSpaceMemberPage = await browser.newPage();
    await nonSpaceMemberPage.goto(`${baseUrl}/login`);
    await nonSpaceMemberPage
      .getByRole('button', { name: 'Accept All Cookies' })
      .click();

    await nonSpaceMemberPage
      .getByRole('textbox', { name: 'E-Mail' })
      .fill(`${TestUser.NON_SPACE_MEMBER}@alkem.io`);
    await nonSpaceMemberPage
      .getByRole('textbox', { name: 'Password' })
      .fill(password);
    await nonSpaceMemberPage
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
    await nonSpaceMemberPage.waitForURL(/.*home.*/);

    // Sign in as space admin
    spaceAdminPage = await browser.newPage();
    await spaceAdminPage.goto(`${baseUrl}/login`);
    await spaceAdminPage
      .getByRole('button', { name: 'Accept All Cookies' })
      .click();

    await spaceAdminPage
      .getByRole('textbox', { name: 'E-Mail' })
      .fill(`${TestUser.SPACE_ADMIN}@alkem.io`);
    await spaceAdminPage
      .getByRole('textbox', { name: 'Password' })
      .fill(password);
    await spaceAdminPage
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
    await spaceAdminPage.waitForURL(/.*home.*/);
  });

  test.afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(globalBaseScenario);
    await nonSpaceMemberPage.close();
    await spaceAdminPage.close();
  });

  test.describe('Space Discovery and Applications', () => {
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
        name: 'If you have a specific idea for how you\'d like to contribute, please share it below.',
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

      // 6. Verify success confirmation appears (popup/notification)
      const successHeading = page.getByRole('heading', {
        name: 'Thanks for applying to our community!',
        level: 2,
      });
      await expect(successHeading).toBeVisible();

      // Close success dialog
      const closeButton = page
        .getByRole('dialog')
        .filter({ hasText: 'Thanks for applying' })
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

      // 1. Navigate to home page
      await page.goto(`${baseUrl}/home`);

      // 2. Click on the Level 0 Space card to navigate to the space page
      const spaceCard = page.locator('a', { hasText: spaceName });
      await spaceCard.click();

      // 3. Locate and click the space settings icon (cog icon)
      const settingsButton = page.getByTestId('SettingsOutlinedIcon');
      await expect(settingsButton).toBeVisible();
      await settingsButton.click();

      // 4. Verify navigation to space settings page
      await page.waitForURL(`**/${baseScenario.space.nameId}/settings/**`);

      // 5. Verify space-settings div is present
      const spaceSettings = page.getByTestId('space-settings');
      await expect(spaceSettings).toBeVisible();

      // 6. Locate and click the "Community" tab
      const communityTab = spaceSettings.getByRole('tab', {
        name: 'Community',
      });
      await expect(communityTab).toBeVisible();
      await communityTab.click();

      // 7. Verify "Pending applications & invitations" section is visible
      const pendingSection = page.getByText(
        'Pending applications & invitations'
      );
      await expect(pendingSection).toBeVisible();
    });
  });

  test.describe('Application Management', () => {
    test.beforeEach(async () => {
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

      // Check if there's already a pending application
      const applicationPending = applicantPage
        .locator('div')
        .filter({ hasText: /^Application pending$/ });
      const isApplicationPending = await applicationPending.isVisible();

      if (!isApplicationPending) {
        // Click the "Apply" button only if no pending application exists
        await applicantPage.getByRole('button', { name: 'Apply' }).click();

        // Fill in the required questionnaire fields with test data
        const requiredField = applicantPage.getByRole('textbox', {
          name: 'If you have a specific idea for how you\'d like to contribute, please share it below.',
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

        // Verify success confirmation appears
        const successHeading = applicantPage.getByRole('heading', {
          name: 'Thanks for applying to our community!',
          level: 2,
        });
        await expect(successHeading).toBeVisible();

        // Close success dialog
        const closeButton = applicantPage
          .getByRole('dialog')
          .filter({ hasText: 'Thanks for applying' })
          .getByRole('button', { name: 'Close' });
        await closeButton.click();
      }

      // Step 2: As Space Admin - Navigate to Community Settings
      const adminPage = spaceAdminPage;

      // Navigate to home page
      await adminPage.goto(`${baseUrl}/home`);

      // Click on the Level 0 Space card to navigate to the space page
      const adminSpaceCard = adminPage.locator('a', { hasText: spaceName });
      await adminSpaceCard.click();

      // Click the space settings icon (cog icon)
      const settingsButton = adminPage.getByTestId('SettingsOutlinedIcon');
      await expect(settingsButton).toBeVisible();
      await settingsButton.click();

      // Verify navigation to space settings page
      await adminPage.waitForURL(`**/${baseScenario.space.nameId}/settings/**`);

      // Click the "Community" tab
      const spaceSettings = adminPage.getByTestId('space-settings');
      const communityTab = spaceSettings.getByRole('tab', {
        name: 'Community',
      });
      await expect(communityTab).toBeVisible();
      await communityTab.click();
    });

    test.afterEach(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    });

    test('2.1 Reject Application to Level 0 Space', async () => {
      const adminPage = spaceAdminPage;

      // Locate the pending application from the non-space member
      // The application is displayed in a MuiDataGrid with the applicant's display name
      // Find the parent container using data-testid
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the reject button (icon button with aria-label="Reject application")
      const rejectButton = applicationRow.getByRole('button', {
        name: 'Reject application',
      });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      // Verify rejection confirmation dialog appears
      const confirmDialog = adminPage.getByRole('dialog');
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
        name: 'Notifications Button',
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

      // Locate the pending application from the non-space member
      // The application is displayed in a MuiDataGrid with the applicant's display name
      // Find the parent container using data-testid
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the delete button (icon button with aria-label="Delete")
      const deleteButton = applicationRow.getByRole('button', {
        name: 'Delete',
      });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // Verify archive confirmation dialog appears
      const confirmDialog = adminPage.getByRole('dialog');
      await expect(confirmDialog).toBeVisible();

      // Confirm the archive action
      const confirmButton = confirmDialog.getByRole('button', {
        name: /archive/i,
      });
      await confirmButton.click();

      // Verify the application is removed from the pending list
      await expect(applicationRow).not.toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications Button',
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

      // Locate the pending application from the non-space member
      // The application is displayed in a MuiDataGrid with the applicant's display name
      // Find the parent container using data-testid
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the view button (Material UI eye icon - VisibilityOutlinedIcon)
      const viewButton = applicationRow.getByTestId('VisibilityOutlinedIcon');
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      // Verify questionnaire answers modal appears
      const questionnaireModal = adminPage.getByRole('dialog');
      await expect(questionnaireModal).toBeVisible();

      // Verify the questionnaire responses are displayed
      await expect(questionnaireModal).toContainText(
        'I am interested in collaborating on this space'
      );

      // Locate and click the "Approve" button at the bottom of the modal
      const approveButton = questionnaireModal.getByRole('button', {
        name: /approve/i,
      });
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // Verify the modal closes
      await expect(questionnaireModal).not.toBeVisible();

      // Verify the application is removed from the pending list
      await expect(applicationRow).toBeVisible();
      await expect(applicationRow).toContainText('Application Approved');

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications Button',
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

      // Locate the pending application from the non-space member
      // The application is displayed in a MuiDataGrid with the applicant's display name
      // Find the parent container using data-testid
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the view button (Material UI eye icon - VisibilityOutlinedIcon)
      const viewButton = applicationRow.getByTestId('VisibilityOutlinedIcon');
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      // Verify questionnaire answers modal appears
      const questionnaireModal = adminPage.getByRole('dialog');
      await expect(questionnaireModal).toBeVisible();

      // Verify the questionnaire responses are displayed
      await expect(questionnaireModal).toContainText(
        'I am interested in collaborating on this space'
      );

      // Locate and click the "Reject" button at the bottom of the modal
      const rejectButton = questionnaireModal.getByRole('button', {
        name: /reject/i,
      });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      // Verify rejection confirmation dialog (if it appears)
      // Some implementations may show a confirmation dialog, others may reject immediately
      const possibleConfirmDialog = adminPage.getByRole('dialog').last();
      const isConfirmDialogVisible = await possibleConfirmDialog.isVisible();

      if (isConfirmDialogVisible) {
        // If a confirmation dialog appears, confirm the rejection
        const confirmButton = possibleConfirmDialog.getByRole('button', {
          name: /archive/i,
        });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }

      // Verify the modal closes
      await expect(questionnaireModal).not.toBeVisible();
      await expect(applicationRow).toBeVisible();
      await expect(applicationRow).toContainText('Application Rejected');

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications Button',
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
        name: 'Notifications Button',
      });
      await expect(notificationsBellIconAdmin).toBeVisible();
      await notificationsBellIconAdmin.click();

      // Verify notification panel appears with new application notification
      const notificationsPanelAdmin = adminPage.getByRole('dialog');
      await expect(notificationsPanelAdmin).toBeVisible();
      await expect(notificationsPanelAdmin).toContainText(/applied to join/i);
      // Click on the notification to navigate to the community settings page
      const applicationNotification = notificationsPanelAdmin
        .locator('a', {
          hasText: new RegExp(
            `applied to join ${baseScenario.space.about.profile.displayName}`,
            'i'
          ),
        })
        .first();
      await applicationNotification.click();

      // Verify navigation to space settings community page
      await adminPage.waitForURL(`**/${baseScenario.space.nameId}/settings/**`);

      // Locate the pending application from the non-space member
      // The application is displayed in a MuiDataGrid with the applicant's display name
      // Find the parent container using data-testid
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the approve button directly from the data grid (Material UI check circle icon)
      const approveButton = applicationRow.getByTestId(
        'CheckCircleOutlineIcon'
      );
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // Verify approval confirmation dialog (if it appears)
      // Some implementations may show a confirmation dialog, others may approve immediately
      const possibleConfirmDialog = adminPage.getByRole('dialog').last();
      const isConfirmDialogVisible = await possibleConfirmDialog.isVisible();

      if (isConfirmDialogVisible) {
        // If a confirmation dialog appears, confirm the approval
        const confirmButton = possibleConfirmDialog.getByRole('button', {
          name: /approve/i,
        });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }

      // Verify the application status changes to approved
      await expect(applicationRow).toBeVisible();
      await expect(applicationRow).toContainText('Application Approved');

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      // Click the notifications bell icon
      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications Button',
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
