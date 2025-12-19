// spec: /Users/vlad/projects/alkem.io/test-suites/test-plan-applications-v2.md
// seed: client-web/src/functional-e2e/seed-applications.spec.ts

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
      members: [
        TestUser.SPACE_ADMIN,
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.NON_SPACE_MEMBER,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSPACE_MEMBER],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
      subspace: {
        community: {
          admins: [TestUser.SUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_ADMIN, TestUser.SUBSUBSPACE_MEMBER],
        },
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: {
            policy: CommunityMembershipPolicy.Applications,
          },
        },
      },
    },
  },
};

test.describe('Level 1 Subspace - Applications', () => {
  let globalBaseScenario: OrganizationWithSpaceModel;
  let baseScenario: OrganizationWithSpaceModel;
  let nonSpaceMemberPage: Page;
  let subspaceAdminPage: Page;

  test.beforeAll(async ({ browser }) => {
    globalBaseScenario =
      await TestScenarioFactory.createBaseScenario(scenarioConfig);
    baseScenario = globalBaseScenario;

    // Sign in as non-space member (who is a Level 0 member to see subspaces)
    nonSpaceMemberPage = await browser.newPage();
    await nonSpaceMemberPage.goto(`${baseUrl}/login`);
    await nonSpaceMemberPage
      .getByRole('textbox', { name: 'E-Mail' })
      .fill(`${TestUser.NON_SPACE_MEMBER}@alkem.io`);
    await nonSpaceMemberPage
      .getByRole('textbox', { name: 'Password' })
      .fill(password);
    await nonSpaceMemberPage.getByRole('button', { name: 'Sign in' }).click();
    await nonSpaceMemberPage.waitForURL(/.*home.*/);

    // Sign in as subspace admin
    subspaceAdminPage = await browser.newPage();
    await subspaceAdminPage.goto(`${baseUrl}/login`);
    await subspaceAdminPage
      .getByRole('button', { name: 'Accept All Cookies' })
      .click();
    await subspaceAdminPage
      .getByRole('textbox', { name: 'E-Mail' })
      .fill(`${TestUser.SUBSPACE_ADMIN}@alkem.io`);
    await subspaceAdminPage
      .getByRole('textbox', { name: 'Password' })
      .fill(password);
    await subspaceAdminPage.getByRole('button', { name: 'Sign in' }).click();
    await subspaceAdminPage.waitForURL(/.*home.*/);
  });

  test.afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(globalBaseScenario);
    await nonSpaceMemberPage.close();
    await subspaceAdminPage.close();
  });

  test.describe('Subspace Discovery and Applications', () => {
    test('1.1 View Private Level 1 Subspace Card as Non-Member', async () => {
      const page = nonSpaceMemberPage;
      const spaceName = baseScenario.space.about.profile.displayName;
      const spaceNameId = baseScenario.space.nameId;
      const subspaceName = baseScenario.subspace.about.profile.displayName;
      const subspaceNameId = baseScenario.subspace.nameId;

      // 1. Navigate to the home page
      await page.goto(`${baseUrl}/home`);

      // 2. Find and click the Level 0 space card
      const spaceCard = page.locator('a', { hasText: spaceName });
      await expect(spaceCard).toBeVisible();
      await spaceCard.click();

      // 3. Click on the "Subspaces" tab in the navigation
      const subspacesTab = page.getByRole('tab', { name: 'Subspaces' });
      await expect(subspacesTab).toBeVisible();
      await subspacesTab.click();

      // 4. Verify private Level 1 subspace card is visible with lock icon
      const subspaceCard = page.locator('a', { hasText: subspaceName });
      await expect(subspaceCard).toBeVisible();

      const lockIcon = subspaceCard.locator('img').last();
      await expect(lockIcon).toBeVisible();

      // 5. Click on the subspace card
      await subspaceCard.click();

      // 6. Verify navigation to Subspace About page
      await page.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/about`
      );

      // 7. Verify Apply button is visible
      const applyButton = page.getByRole('button', { name: 'Apply' });
      await expect(applyButton).toBeVisible();
    });

    test('1.2 Submit Application to Level 1 Subspace', async () => {
      const page = nonSpaceMemberPage;
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;

      // 1. Navigate to Level 1 Subspace About page
      await page.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}/about`
      );

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
        name: 'What brings you here?',
      });
      await requiredField.fill(
        'I am interested in collaborating on this subspace'
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
      await expect(successHeading).not.toBeVisible();
    });

    test('1.3 View Pending Applications as Subspace Admin', async () => {
      const page = subspaceAdminPage;
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;

      // 1. Navigate directly to the Level 1 Subspace page
      await page.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}`,
        {
          waitUntil: 'networkidle',
        }
      );

      // 2. Locate and click the Settings button (contains SettingsOutlinedIcon)
      const settingsButton = page.getByTestId('SettingsOutlinedIcon');
      await expect(settingsButton).toBeVisible();
      await settingsButton.click();

      // 3. Verify navigation to subspace settings page
      await page.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/settings/**`
      );

      // 4. Verify subspace-settings div is present
      const subspaceSettings = page.getByTestId('subspace-settings');
      await expect(subspaceSettings).toBeVisible();

      // 5. Locate and click the "Community" tab
      const communityTab = subspaceSettings.getByRole('tab', {
        name: 'Community',
      });
      await expect(communityTab).toBeVisible();
      await communityTab.click();

      // 6. Verify "Pending applications & invitations" section is visible
      const pendingSection = page.getByText(
        'Pending applications & invitations'
      );
      await expect(pendingSection).toBeVisible();
    });
  });

  test.describe('Subspace Application Management', () => {
    test.beforeEach(async () => {
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;

      // Step 1: As Non-Space Member - Submit Application
      const applicantPage = nonSpaceMemberPage;

      // Navigate directly to the subspace about page using nameId
      await applicantPage.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}/about`,
        {
          waitUntil: 'networkidle',
        }
      );

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
          name: 'What brings you here?',
        });
        await requiredField.fill(
          'I am interested in collaborating on this subspace'
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

      // Step 2: As Subspace Admin - Navigate to Community Settings
      const adminPage = subspaceAdminPage;

      // Navigate to the Level 1 Subspace page
      await adminPage.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}`
      );

      // Click the Settings button (contains SettingsOutlinedIcon)
      const settingsButton = adminPage.getByTestId('SettingsOutlinedIcon');
      await expect(settingsButton).toBeVisible();
      await settingsButton.click();

      // Verify navigation to subspace settings page
      await adminPage.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/settings/**`
      );

      // Click the "Community" tab
      const subspaceSettings = adminPage.getByTestId('subspace-settings');
      const communityTab = subspaceSettings.getByRole('tab', {
        name: 'Community',
      });
      await expect(communityTab).toBeVisible();
      await communityTab.click();
    });

    test.afterEach(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    });

    test('2.1 Reject Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the reject button
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

    test('2.2 Archive Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the delete button
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

    test('2.3 View and Approve Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the view button
      const viewButton = applicationRow.getByTestId('VisibilityOutlinedIcon');
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      // Verify questionnaire answers modal appears
      const questionnaireModal = adminPage.getByRole('dialog');
      await expect(questionnaireModal).toBeVisible();

      // Verify the questionnaire responses are displayed
      await expect(questionnaireModal).toContainText(
        'I am interested in collaborating on this subspace'
      );

      // Locate and click the "Approve" button at the bottom of the modal
      const approveButton = questionnaireModal.getByRole('button', {
        name: /approve/i,
      });
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // Verify the modal closes
      await expect(questionnaireModal).not.toBeVisible();

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

    test('2.4 View and Reject Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the view button
      const viewButton = applicationRow.getByTestId('VisibilityOutlinedIcon');
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      // Verify questionnaire answers modal appears
      const questionnaireModal = adminPage.getByRole('dialog');
      await expect(questionnaireModal).toBeVisible();

      // Verify the questionnaire responses are displayed
      await expect(questionnaireModal).toContainText(
        'I am interested in collaborating on this subspace'
      );

      // Locate and click the "Reject" button at the bottom of the modal
      const rejectButton = questionnaireModal.getByRole('button', {
        name: /reject/i,
      });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      // Verify rejection confirmation dialog (if it appears)
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
      const adminPage = subspaceAdminPage;

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
        .getByRole('link', {
          name: /applied to join/i,
        })
        .first();
      await applicationNotification.click();

      // Verify navigation to subspace settings community page
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;
      await adminPage.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/settings/**`
      );

      // Locate the pending application from the non-space member
      const pendingSection = adminPage.getByTestId('communityMemberships');
      const dataGrid = pendingSection.locator('.MuiDataGrid-root');
      await expect(dataGrid).toBeVisible();

      // Find the row containing the non-space member's application
      const applicationRow = dataGrid.locator('role=row').last();
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application Received');

      // Click the approve button directly from the data grid
      const approveButton = applicationRow.getByTestId(
        'CheckCircleOutlineIcon'
      );
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // Handle confirmation dialog if it appears
      const possibleConfirmDialog = adminPage.getByRole('dialog').last();
      const isConfirmDialogVisible = await possibleConfirmDialog.isVisible();

      if (isConfirmDialogVisible) {
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
