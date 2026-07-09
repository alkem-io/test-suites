// spec: client-web/src/functional-e2e/applications/test-plan-applications-v2.md
// Covers: PR #9986 (combined-subspace-application) + PR #10000 (Release 66 patch 1)
// Scenario: L0 space is PUBLIC, applicant is NOT a member of L0 but can apply
// to L1 subspace directly via the ROLESET_ENTRY_ROLE_APPLY privilege.

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
  name: 'seed-space-applications-public-parent',
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
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
        allowSubspaceAdminsToInviteMembers: true,
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

test.describe('Level 1 Subspace - Applications (Public Parent Space)', () => {
  let globalBaseScenario: OrganizationWithSpaceModel;
  let baseScenario: OrganizationWithSpaceModel;
  let nonSpaceMemberPage: Page;
  let subspaceAdminPage: Page;

  test.beforeAll(async ({ browser }) => {
    globalBaseScenario =
      await TestScenarioFactory.createBaseScenario(scenarioConfig);
    baseScenario = globalBaseScenario;

    // Sign in as non-space member — NOT a member of L0.
    // Since L0 is public, they can still see its subspaces.
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

  test.describe('Subspace Discovery via Public Parent', () => {
    test('1.1 Non-parent-member can see L1 subspace card from public L0 space', async () => {
      const page = nonSpaceMemberPage;
      const spaceNameId = baseScenario.space.nameId;
      const subspaceName = baseScenario.subspace.about.profile.displayName;

      // Navigate to the public L0 space
      await page.goto(`${baseUrl}/${spaceNameId}`, {
        waitUntil: 'networkidle',
      });

      // Click on the "Subspaces" tab in the navigation
      const subspacesTab = page.getByRole('tab', { name: 'Subspaces' });
      await expect(subspacesTab).toBeVisible();
      await subspacesTab.click();

      // Verify the L1 subspace card is visible (the user is NOT a member
      // of L0 but L0 is public, so subspaces are discoverable).
      const subspaceCard = page
        .getByRole('region', { name: 'Subspaces grid' })
        .getByRole('link')
        .filter({
          has: page.getByRole('heading', { name: subspaceName, exact: true }),
        })
        .filter({ visible: true });
      await expect(subspaceCard).toBeVisible();

      // The subspace is private, so it should show a "Private" indicator
      await expect(subspaceCard.getByText(/Private/i)).toBeVisible();
    });

    test('1.2 Non-parent-member can apply to L1 subspace from About dialog', async () => {
      const page = nonSpaceMemberPage;
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;

      // Navigate directly to L1 Subspace About page.
      // The user is NOT a member of L0 but L0 is public, so this route
      // is reachable. The server grants ROLESET_ENTRY_ROLE_APPLY.
      await page.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}/about`,
        { waitUntil: 'networkidle' }
      );

      // Locate and click the "Apply" button on the About dialog.
      // Per PR #9986, the client trusts the server-granted privilege
      // directly — no parent-membership check needed.
      const aboutDialog = page.getByRole('dialog').filter({
        has: page.getByRole('heading', {
          name: baseScenario.subspace.about.profile.displayName,
          level: 2,
        }),
      });
      await aboutDialog.getByRole('button', { name: 'Apply' }).click();

      // Verify questionnaire modal/form appears
      const questionnaireDialog = page
        .getByRole('dialog')
        .filter({ has: page.getByRole('heading', { name: 'Apply to' }) });
      const questionnaireHeading = questionnaireDialog.getByRole('heading', {
        name: 'Apply to',
        level: 2,
      });
      await expect(questionnaireHeading).toBeVisible();

      // Fill in questionnaire fields with test data
      const requiredField = questionnaireDialog.getByRole('textbox', {
        name: 'What brings you here?',
      });
      await requiredField.fill(
        'I want to contribute to this subspace as a non-parent-member'
      );

      // Submit the application
      const submitButton = questionnaireDialog.getByRole('button', {
        name: 'Apply',
      });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Verify success confirmation appears (CRD "Application submitted")
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

      // Verify the application was submitted successfully
      await expect(successHeading).not.toBeVisible();
    });

    test('1.3 View Pending Application as Subspace Admin', async () => {
      const page = subspaceAdminPage;
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;

      // Navigate directly to the Level 1 Subspace page
      await page.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}`,
        { waitUntil: 'networkidle' }
      );

      // Open subspace settings via the CRD banner "Settings" link
      const settingsLink = page.getByRole('link', { name: 'Settings' });
      await expect(settingsLink).toBeVisible({ timeout: 15_000 });
      await settingsLink.click();

      // Verify navigation to subspace settings page
      await page.waitForURL(
        `**/${spaceNameId}/challenges/${subspaceNameId}/settings**`
      );

      // Open the CRD "Community" settings tab
      const communityTab = page.getByRole('tab', { name: 'Community' });
      await expect(communityTab).toBeVisible();
      await communityTab.click();

      // Verify the pending-memberships section is visible
      await expect(
        page.getByRole('heading', { name: 'Pending Memberships' })
      ).toBeVisible();

      // Verify the application from the non-parent-member is listed
      const applicationRow = page
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();
      await expect(applicationRow).toContainText('Application received');
    });
  });

  test.describe('Subspace Application Management (Public Parent)', () => {
    test.beforeEach(async () => {
      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      const spaceNameId = baseScenario.space.nameId;
      const subspaceNameId = baseScenario.subspace.nameId;

      // Step 1: As Non-Space Member - Submit Application to L1 subspace
      const applicantPage = nonSpaceMemberPage;

      await applicantPage.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}/about`,
        { waitUntil: 'networkidle' }
      );

      // Check if there's already a pending application
      const applicationPending = applicantPage.getByRole('button', {
        name: 'Application pending',
      });
      const isApplicationPending = await applicationPending
        .isVisible()
        .catch(() => false);

      if (!isApplicationPending) {
        // Click the "Apply" button
        await applicantPage.getByRole('button', { name: 'Apply' }).click();

        // Fill in the required questionnaire fields
        const requiredField = applicantPage.getByRole('textbox', {
          name: 'What brings you here?',
        });
        await requiredField.fill(
          'I want to contribute to this subspace as a non-parent-member'
        );

        // Submit the application
        const submitButton = applicantPage
          .getByRole('dialog')
          .last()
          .getByRole('button', { name: 'Apply' });
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        // Verify success confirmation
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

      // Step 2: As Subspace Admin - Navigate to Community Settings
      const adminPage = subspaceAdminPage;

      await adminPage.goto(
        `${baseUrl}/${spaceNameId}/challenges/${subspaceNameId}`
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
    });

    test.afterEach(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    });

    test('2.1 Approve non-parent-member application to L1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application from the non-parent-member
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();
      await expect(applicationRow).toContainText('Application received');

      // View the application questionnaire
      const viewButton = applicationRow.getByRole('button', {
        name: 'View application',
      });
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      // Verify questionnaire modal with responses
      const questionnaireModal = adminPage.getByRole('dialog');
      await expect(questionnaireModal).toBeVisible();
      await expect(questionnaireModal).toContainText(
        'I want to contribute to this subspace as a non-parent-member'
      );

      // Close the read-only preview dialog
      await questionnaireModal
        .getByRole('button', { name: 'Close' })
        .first()
        .click();
      await expect(questionnaireModal).not.toBeVisible();

      // Approve the application
      const approveButton = applicationRow.getByRole('button', {
        name: 'Approve',
      });
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // Switch to "Application approved" filter and verify
      await adminPage
        .getByRole('button', { name: /Application approved/i })
        .click();
      await expect(
        applicationRow.filter({ hasText: 'Application approved' })
      ).toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIcon).toBeVisible();
      await notificationsBellIcon.click();

      const notificationsPanel = applicantPage.getByRole('dialog');
      await expect(notificationsPanel).toBeVisible();
      await expect(notificationsPanel).toContainText(
        /Welcome to the community/i
      );
    });

    test('2.2 Reject non-parent-member application to L1 Subspace', async () => {
      const adminPage = subspaceAdminPage;

      // Locate the pending application
      const applicationRow = adminPage
        .getByRole('row')
        .filter({ hasText: 'non space' });
      await expect(applicationRow).toBeVisible();
      await expect(applicationRow).toContainText('Application received');

      // Reject the application
      const rejectButton = applicationRow.getByRole('button', {
        name: 'Reject',
      });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      // Confirm rejection in the alertdialog
      const confirmDialog = adminPage.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible();
      const confirmButton = confirmDialog.getByRole('button', {
        name: /confirm|reject|yes/i,
      });
      await confirmButton.click();

      // Verify the application is removed from the pending list
      await expect(applicationRow).not.toBeVisible();

      // Verify notification is received by the applicant
      const applicantPage = nonSpaceMemberPage;
      await applicantPage.goto(`${baseUrl}/home`);

      const notificationsBellIcon = applicantPage.getByRole('button', {
        name: 'Notifications',
      });
      await expect(notificationsBellIcon).toBeVisible();
      await notificationsBellIcon.click();

      const notificationsPanel = applicantPage.getByRole('dialog');
      await expect(notificationsPanel).toBeVisible();
      await expect(notificationsPanel).toContainText(/declined/i);
    });
  });
});
