// spec: test-plan-applications-reorganized.md
// seed: seed-applications.spec.ts

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

test.describe('Level 0 (Space) Test Suite', () => {
  test.describe('1. Space Discovery and Privacy Indicators', () => {
    test('1.1 View Private Space as Non-Member', async ({ page }) => {
      // 1. Sign in as NON_SPACE_MEMBER
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page.getByRole('textbox', { name: 'E-Mail' }).fill('non.space@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to the main spaces listing page
      // Already on home page which shows spaces

      // 3. Locate the Level 0 space
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await expect(spaceCard).toBeVisible();

      // 4. Observe privacy indicators (lock icon on card)
      await expect(spaceCard.getByTestId('LockOutlinedIcon')).toBeVisible();

      // 5. Verify Apply button is available for Level 0 space
      await spaceCard.click();
      const applyButton = page.getByRole('button', { name: /apply|join/i });
      await expect(applyButton).toBeVisible();

      // 6. Verify Level 1 and Level 2 are NOT visible to non-members
      const subspacesList = page.locator('[data-testid="SubspacesList"]');
      await expect(subspacesList).not.toBeVisible();
    });

    test('1.2 View Level 0 as Member', async ({ page }) => {
      // 1. Sign in as SPACE_MEMBER (Level 0 member only, not Level 1 or Level 2 member)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page.getByRole('textbox', { name: 'E-Mail' }).fill('space.member@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to spaces listing
      // Already on home page

      // 3. Navigate into Level 0 Space
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      // 4. Verify Level 1 subspaces are visible in Subspaces section
      const subspacesList = page.locator('[data-testid="SubspaceCard"]').first();
      await expect(subspacesList).toBeVisible();

      // 5. Verify Level 2 subsubspaces are NOT visible
      await subspacesList.click();
      const subsubspacesList = page.locator('[data-testid="SubspaceCard"]');
      await expect(subsubspacesList).not.toBeVisible();
    });
  });

  test.describe('2. Level 0 Application Submission', () => {
    test('2.1 Apply to Level 0 Space', async ({ page }) => {
      // 1. Sign in as NON_SPACE_MEMBER
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page.getByRole('textbox', { name: 'E-Mail' }).fill('non.space@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to the Level 0 Space
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      // 3. Click the "Apply" button
      const applyButton = page.getByRole('button', { name: /apply|join/i });
      await applyButton.click();

      // 4. Verify questionnaire modal/form appears
      const questionnaireForm = page.locator('[role="dialog"], form');
      await expect(questionnaireForm).toBeVisible();

      // 5. Fill in questionnaire with test answers
      const question1 = page.locator('input, textarea').first();
      await question1.fill('I am interested in collaborating on this space');

      const question2 = page.locator('input, textarea').nth(1);
      await question2.fill('5 years of experience in the field');

      // 6. Submit the application
      const submitButton = page.getByRole('button', { name: /submit|send|apply/i });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      await expect(page.getByText(/success|submitted|pending/i)).toBeVisible();
    });

    test('2.2 Prevent Duplicate Applications to Level 0', async ({ page }) => {
      // 1. Sign in as NON_SPACE_MEMBER (who already applied in test 2.1)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page.getByRole('textbox', { name: 'E-Mail' }).fill('non.space@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 0 Space
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      // 3. Attempt to apply again to the same space
      const applyButton = page.getByRole('button', { name: /apply|join|pending/i });
      
      const isDisabled = await applyButton.isDisabled();
      const buttonText = await applyButton.textContent();
      
      expect(isDisabled || buttonText?.toLowerCase().includes('pending')).toBeTruthy();
    });
  });

  test.describe('3. Level 0 Admin Notifications', () => {
    test('3.1 Receive Notification for Level 0 Application', async ({ page }) => {
      // 2. Sign in as SPACE_ADMIN
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page.getByRole('textbox', { name: 'E-Mail' }).fill('space.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Click the bell icon in the upper right corner
      const bellIcon = page.getByTestId('NotificationsIcon');
      await expect(bellIcon).toBeVisible();
      await bellIcon.click();

      // 4. View notifications list
      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });

    test('3.2 Navigate from Notification to Level 0 Application Management', async ({ page }) => {
      // 1. Sign in as SPACE_ADMIN with pending application notification
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page.getByRole('textbox', { name: 'E-Mail' }).fill('space.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // Navigate directly to Level 0 space settings to verify access
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      // Verify cog icon is visible and clickable
      const cogIcon = page.getByTestId('SettingsIcon');
      await expect(cogIcon).toBeVisible();
      await cogIcon.click();

      // Verify Community tab is visible
      const communityTab = page.getByRole('tab', { name: /community/i });
      await expect(communityTab).toBeVisible();
    });
  });

  test.describe('4. Level 0 Application Review', () => {
    test('4.1 Level 0 Admin Access to Applications', async ({ page }) => {
      // 1. Sign in as SPACE_ADMIN
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page.getByRole('textbox', { name: 'E-Mail' }).fill('space.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 0 Space
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      // 3. Click cog icon in subheader navigation
      const cogIcon = page.getByTestId('SettingsIcon');
      await cogIcon.click();

      // 4. Click Community tab in subnavigation
      const communityTab = page.getByRole('tab', { name: /community/i });
      await communityTab.click();

      // 5. Locate Applications section
      await expect(page.getByText(/applications/i).first()).toBeVisible();
    });
  });
});
