// spec: space/space-crud.spec.md
// seed: client-web/src/functional-e2e/seed-minimal.spec.ts

import { expect } from '@playwright/test';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  HomePage,
  MyAccountPage,
  CreateSpaceDialog,
  SpacePage,
  SpaceSettingsPage,
} from './pages';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

// Create the authenticated fixture with a unique storage state name for this test suite
const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'my-feature-test.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'space-create',
};

/** @testCase TC-2300, TC-2302, TC-2303, TC-2304, TC-2305, TC-2306 */
test.describe('CREATE Space Operations', () => {
  test.beforeAll(async ({ browser }) => {
    await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
    await setupAuthentication(browser, TestUserManager.users.globalAdmin.email);
  });
  test.afterAll(async () => {
    // Clean up authentication
    await teardownAuthentication();
  });
  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('1.1 Create Space - Happy Path (Valid Data)', async ({ page }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // 1. Navigate to My Account page to access Hosted Spaces section
    await homePage.navigateToMyAccount();

    // 2. Verify Hosted Spaces section is visible
    await myAccountPage.verifyHostedSpacesVisible();

    // 3. Click the Add button next to Hosted Spaces to open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // 4. Verify Create a new Space dialog appears
    await createSpaceDialog.waitForVisible();

    // 5. Fill in the required fields
    await createSpaceDialog.fillBasicInfo(
      'Test Space Alpha',
      'test-space-alpha',
      'A collaborative space for testing'
    );

    // Verify Create button is disabled before accepting terms
    await createSpaceDialog.verifyCreateButtonDisabled();

    // 6. Check the terms and agreements checkbox
    await createSpaceDialog.acceptTermsAndConditions();

    // 7. Verify Create button becomes enabled
    await createSpaceDialog.verifyCreateButtonEnabled();

    // Close dialog without creating (to not affect other tests)
    await createSpaceDialog.clickCancel();
    await createSpaceDialog.waitForHidden();
  });

  test.skip('1.4 Create Space - With Tutorials Enabled', async ({ page }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);
    const spacePage = new SpacePage(page, baseUrl);
    const spaceSettingsPage = new SpaceSettingsPage(page);

    // Use short unique identifier to stay within 25 char URL limit
    const uniqueId = Date.now().toString().slice(-6);
    const spaceName = `Tutorial Space ${uniqueId}`;
    const spaceUrl = `tutor-${uniqueId}`;

    // 1. Navigate to My Account
    await homePage.navigateToMyAccount();

    // 2. Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // 3. Fill in required fields
    await createSpaceDialog.fillTitle(spaceName);
    await createSpaceDialog.fillUrl(spaceUrl);

    // 4. Verify tutorials checkbox is initially unchecked
    await createSpaceDialog.verifyTutorialsUnchecked();

    // 5. Check the tutorials checkbox
    await createSpaceDialog.checkTutorials();
    await createSpaceDialog.verifyTutorialsChecked();

    // 6. Check terms
    await createSpaceDialog.acceptTermsAndConditions();

    // 7. Verify Create button is enabled and click it
    await createSpaceDialog.verifyCreateButtonEnabled();
    await createSpaceDialog.clickCreate();

    // 8. Verify success dialog appears
    await spacePage.waitForSpaceReady();

    // 9. Click GET STARTED to go to Space page
    await spacePage.clickGetStarted();

    // 10. Verify tutorials are present on the Space page
    await spacePage.verifyTutorialsPresent(2);

    // 11. Cleanup: Navigate to Settings and delete the Space
    await spacePage.navigateToSettings();
    await spaceSettingsPage.deleteSpace();
  });

  test('1.5 Create Space - Validation: Missing Required Fields (Title)', async ({
    page,
  }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // Leave Title empty, fill only URL
    await createSpaceDialog.fillUrl('test-space-no-title');

    // Check terms
    await createSpaceDialog.acceptTermsAndConditions();

    // Verify Create button is still disabled (Title is required)
    await createSpaceDialog.verifyCreateButtonDisabled();

    // Close dialog
    await createSpaceDialog.clickClose();
  });

  test('1.6 Create Space - Validation: URL Length Exceeded', async ({
    page,
  }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // Fill in Title (this will auto-generate a long URL)
    await createSpaceDialog.fillTitle(
      'This Is A Very Long Space Title That Exceeds Limit'
    );

    // Try to enter a URL longer than 25 characters
    await createSpaceDialog.fillUrl('this-url-is-way-too-long-for-validation');

    // Verify the character count indicator shows exceeded limit
    await expect(createSpaceDialog.urlCharacterCount).toBeVisible();

    // Check terms
    await createSpaceDialog.acceptTermsAndConditions();

    // Verify Create button remains disabled due to URL length validation
    await createSpaceDialog.verifyCreateButtonDisabled();

    // Close dialog
    await createSpaceDialog.clickClose();
  });

  test('1.8 Create Space - Validation: Terms Not Accepted', async ({
    page,
  }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // Fill in required fields
    await createSpaceDialog.fillTitle('Test Space');
    await createSpaceDialog.fillUrl('test-space');

    // Verify terms checkbox is unchecked
    await createSpaceDialog.verifyTermsUnchecked();

    // Verify Create button remains disabled
    await createSpaceDialog.verifyCreateButtonDisabled();

    // Close dialog
    await createSpaceDialog.clickClose();
  });

  test('1.10 Create Space - Dialog Form Elements Verification', async ({
    page,
  }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears with correct title
    await createSpaceDialog.waitForVisible();

    // Verify all form elements are present
    await createSpaceDialog.verifyAllFormElementsPresent();

    // Close dialog
    await createSpaceDialog.clickClose();
  });

  test('1.11 Create Space - URL Auto-generation from Title', async ({
    page,
  }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // Fill in Title
    await createSpaceDialog.fillTitle('My New Space');

    // Verify URL is auto-generated (lowercase, no spaces)
    await createSpaceDialog.verifyUrlAutoGenerated(/mynewspace/i);

    // Close dialog
    await createSpaceDialog.clickClose();
  });

  test('1.12 Create Space - Cancel Closes Dialog Without Changes', async ({
    page,
  }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Verify Hosted Spaces section is visible
    await myAccountPage.verifyHostedSpacesVisible();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // Fill in some data
    await createSpaceDialog.fillTitle('Cancelled Space');

    // Click Cancel
    await createSpaceDialog.clickCancel();

    // Verify dialog is closed
    await createSpaceDialog.waitForHidden();

    // Verify we're still on the My Account page
    await myAccountPage.verifyHostedSpacesVisible();
  });

  test('1.13 Create Space - Close Button Closes Dialog', async ({ page }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // Fill in some data
    await createSpaceDialog.fillTitle('To Be Closed');

    // Click Close button (X)
    await createSpaceDialog.clickClose();

    // Verify dialog is closed
    await createSpaceDialog.waitForHidden();
  });

  test('1.14 Create Space - Successfully Creates New Space', async ({
    page,
  }) => {
    const homePage = new HomePage(page, baseUrl);
    const myAccountPage = new MyAccountPage(page, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(page);
    const spacePage = new SpacePage(page, baseUrl);
    const spaceSettingsPage = new SpaceSettingsPage(page);

    // Use short unique identifier to stay within 25 char URL limit
    const uniqueId = Date.now().toString().slice(-6);
    const spaceName = `Test Space ${uniqueId}`;
    const spaceUrl = `test-${uniqueId}`;

    // Navigate to My Account
    await homePage.navigateToMyAccount();

    // Verify Hosted Spaces section is visible
    await myAccountPage.verifyHostedSpacesVisible();

    // Open Create Space dialog
    await myAccountPage.openCreateSpaceDialog();

    // Verify dialog appears
    await createSpaceDialog.waitForVisible();

    // Create Space with all required info
    await createSpaceDialog.createSpace(spaceName, spaceUrl, {
      tagline: 'E2E test space for automated testing',
    });

    // Wait for create dialog to close
    await createSpaceDialog.waitForHidden();

    // Verify redirect to the new Space page
    await page.waitForURL(new RegExp(`.*/${spaceUrl}.*`));

    // Verify success dialog and dismiss it
    await spacePage.waitForSpaceReady();
    await spacePage.dismissSuccessDialog();

    // Verify Space was created - check Space title is visible
    await spacePage.verifySpaceTitle(spaceName);

    // Cleanup: Delete the created Space
    await spacePage.navigateToSettings();
    await spaceSettingsPage.deleteSpace();
  });
});
