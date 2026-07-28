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
    },
  },
};

test.describe('Level 1 Subspace - Applications', () => {
  let globalBaseScenario: OrganizationWithSpaceModel;
  let baseScenario: OrganizationWithSpaceModel;
  let nonSpaceMemberPage: Page;
  let subspaceAdminPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Scenario creation + two isolated logins (non-member, subspace admin) can
    // exceed the default 30s hook budget on the slower test env; give it
    // headroom so the hook doesn't time out and fail the first test.
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

    // Sign in as subspace admin in its own isolated context
    subspaceAdminPage = await (await browser.newContext()).newPage();
    await loginViaCrd(
      subspaceAdminPage,
      `${TestUser.SUBSPACE_ADMIN}@alkem.io`,
      password
    );
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

      // 2. Find and click the Level 0 space card. CRD lists space cards as
      // links under the "Recent Spaces" heading; the broad `a:hasText`
      // matched unrelated activity links, so navigate to the space directly.
      await page.goto(`${baseUrl}/${spaceNameId}`);

      // 3. Click on the "Subspaces" tab in the navigation
      const subspacesTab = page.getByRole('tab', { name: 'Subspaces' });
      await expect(subspacesTab).toBeVisible();
      await subspacesTab.click();

      // 4. Verify private Level 1 subspace card is visible. CRD renders the
      // subspace as an unnamed link in the "Subspaces grid" region wrapping a
      // heading; the private state shows a "Private" label. The grid can mount
      // an off-screen measuring duplicate of the card, so scope to the visible
      // one before asserting/clicking to avoid hitting a non-actionable copy.
      const subspaceCard = page
        .getByRole('region', { name: 'Subspaces grid' })
        .getByRole('link')
        .filter({
          has: page.getByRole('heading', { name: subspaceName, exact: true }),
        })
        .filter({ visible: true });
      await expect(subspaceCard).toBeVisible();
      await expect(subspaceCard.getByText(/Private/i)).toBeVisible();

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

      // 1. Navigate to Level 1 Subspace About page. Start from a clean known
      // state: the previous test (1.1) ran on this SHARED page, so do a full
      // navigation (not an inherited in-app state) and let the network settle
      // before interacting. In CRD the subspace About view itself renders as a
      // routed Radix dialog, so we deliberately do NOT press Escape here (that
      // would close the About view and navigate back to the parent space).
      await page.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}/about`,
        { waitUntil: 'networkidle' }
      );

      // 2. Locate and click the page-level "Apply" button on the About view.
      // Scope it to the About dialog (heading = subspace name) so we don't match
      // an unrelated/leftover Apply button elsewhere on the shared page.
      const aboutDialog = page
        .getByRole('dialog')
        .filter({
          has: page.getByRole('heading', {
            name: baseScenario.subspace.about.profile.displayName,
            level: 2,
          }),
        });
      await aboutDialog.getByRole('button', { name: 'Apply' }).click();

      // 3. Verify questionnaire modal/form appears. Scope to the questionnaire
      // dialog explicitly (the one headed "Apply to ...") rather than relying on
      // `.last()`, which can resolve to a leftover About-preview dialog.
      const questionnaireDialog = page
        .getByRole('dialog')
        .filter({ has: page.getByRole('heading', { name: 'Apply to' }) });
      const questionnaireHeading = questionnaireDialog.getByRole('heading', {
        name: 'Apply to',
        level: 2,
      });
      await expect(questionnaireHeading).toBeVisible();

      // 4. Fill in questionnaire fields with test data
      const requiredField = questionnaireDialog.getByRole('textbox', {
        name: 'What brings you here?',
      });
      await requiredField.fill(
        'I am interested in collaborating on this subspace'
      );

      // Verify Apply button is enabled after filling required field. Scope the
      // submit button to the questionnaire dialog (not `.last()`) so the click
      // targets the real form action, not a stray copy behind an overlay.
      const submitButton = questionnaireDialog.getByRole('button', {
        name: 'Apply',
      });
      await expect(submitButton).toBeEnabled();

      // 5. Submit the application
      await submitButton.click();

      // 6. Verify success confirmation appears (CRD "Application submitted")
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

      // 2. Open subspace settings via the CRD banner "Settings" link
      const settingsLink = page.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible({ timeout: 15_000 });
      await settingsLink.click();

      // 3. Verify navigation to subspace settings page
      await page.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/settings**`
      );

      // 5. Open the CRD "Community" settings tab
      const communityTab = page.getByRole('tab', { name: 'Community' });
      await expect(communityTab).toBeVisible();
      await communityTab.click();

      // 6. Verify the pending-memberships section is visible (CRD)
      await expect(
        page.getByRole('heading', { name: 'Pending Memberships' })
      ).toBeVisible();
    });
  });

  test.describe('Subspace Application Management', () => {
    test.beforeEach(async () => {
      // Per-test scenario creation + application submission exceeds the default
      // 30s hook budget on the slower test env.
      test.setTimeout(60_000);
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

      // Step 2: As Subspace Admin - Navigate to Community Settings (CRD)
      const adminPage = subspaceAdminPage;

      // Navigate to the Level 1 Subspace page
      await adminPage.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}`
      );

      // Open subspace settings via the CRD banner "Settings" link
      const settingsLink = adminPage.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible({ timeout: 15_000 });
      await settingsLink.click();
      await adminPage.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/settings**`
      );

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

    test('2.1 Reject Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      // CRD renders a semantic table (not a MUI DataGrid); find the
      // application row by the applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the reject button
      const rejectButton = applicationRow.getByRole('button', {
        name: 'Reject',
      });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      // Verify rejection confirmation dialog appears
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

    test('2.2 Archive Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      // CRD renders a semantic table (not a MUI DataGrid); find the
      // application row by the applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the delete button
      const deleteButton = applicationRow.getByRole('button', {
        name: 'Delete',
      });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // Verify archive confirmation dialog appears
      const confirmDialog = adminPage.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible();

      // Confirm the archive action
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

    test('2.3 View and Approve Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      // CRD renders a semantic table (not a MUI DataGrid); find the
      // application row by the applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the row's "View application" button. In CRD this opens a
      // READ-ONLY questionnaire/About preview with no action buttons; approval
      // is performed via the in-row icon button afterwards.
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
        'I am interested in collaborating on this subspace'
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

    test('2.4 View and Reject Application to Level 1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-space member
      // CRD renders a semantic table (not a MUI DataGrid); find the
      // application row by the applicant's name.
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();

      await expect(applicationRow).toContainText('non space');
      await expect(applicationRow).toContainText('Application received');

      // Click the row's "View application" button. In CRD this opens a
      // READ-ONLY questionnaire/About preview with no action buttons; rejection
      // is performed via the in-row icon button afterwards.
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
        'I am interested in collaborating on this subspace'
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
      const adminPage = subspaceAdminPage;

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
          hasText: /applied to join/i,
        })
        .first();
      await applicationNotification.click();

      // The notification deep-links the admin into the subspace context. From
      // there, open the subspace's Community settings (the same path the
      // application-management flow uses) to reach the applications data grid.
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;
      await adminPage.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}**`,
        { waitUntil: 'commit' }
      );
      const settingsLink = adminPage.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible({ timeout: 15_000 });
      await settingsLink.click();
      await adminPage.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/settings**`
      );
      const communityTab = adminPage.getByRole('tab', { name: 'Community' });
      await expect(communityTab).toBeVisible();
      await communityTab.click();
      await expect(
        adminPage.getByRole('heading', { name: 'Pending Memberships' })
      ).toBeVisible({ timeout: 15_000 });

      // Locate the pending application from the non-space member
      // CRD renders a semantic table (not a MUI DataGrid); find the
      // application row by the applicant's name.
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
