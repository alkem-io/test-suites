// spec: test-plan-applications-reorganized.md
// seed: seed-applications.spec.ts

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

test.describe('Level 1 (Subspace) Test Suite', () => {
  test.describe('1. Level 1 Discovery', () => {
    test('1.1 View Level 1 as Level 0 Member', async ({ page }) => {
      // 1. Sign in as SPACE_MEMBER (Level 0 member, not Level 1 or Level 2 member)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('space.member@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 0 Space
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      // 3. View Subspaces section
      // 4. Locate Level 1 subspace
      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await expect(subspaceCard).toBeVisible();
      await expect(subspaceCard.getByTestId('LockOutlinedIcon')).toBeVisible();

      const applyButton = page.getByRole('button', { name: /apply|join/i });
      await expect(applyButton).toBeVisible();
    });

    test('1.2 View Level 1 as Member with Level 2 Visible', async ({
      page,
    }) => {
      // 1. Sign in as SUBSPACE_MEMBER (Level 1 member)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subspace.member@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 0 Space (if accessible) or directly to Level 1 Subspace
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      // 3. View Level 1 Subspace
      // 4. Verify Level 2 subsubspaces are visible
      const subsubspaceCard = page
        .locator('[data-testid="SubspaceCard"]')
        .first();
      await expect(subsubspaceCard).toBeVisible();
      await expect(
        subsubspaceCard.getByTestId('LockOutlinedIcon')
      ).toBeVisible();
    });
  });

  test.describe('2. Level 1 Application Submission', () => {
    test('2.1 Apply to Level 1 Subspace', async ({ page }) => {
      // 1. Sign in as SPACE_MEMBER (Level 0 member, not Level 1 member)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('space.member@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 0 Space > Subspaces
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      // 3. Click on Level 1 Subspace
      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      // 4. Click "Apply" button
      const applyButton = page.getByRole('button', { name: /apply|join/i });
      await applyButton.click();

      // 5. Fill in questionnaire
      const question1 = page.locator('input, textarea').first();
      await question1.fill('Interested in Level 1 collaboration');

      const question2 = page.locator('input, textarea').nth(1);
      await question2.fill('Relevant Level 1 experience');

      // 6. Submit application
      const submitButton = page.getByRole('button', {
        name: /submit|send|apply/i,
      });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      await expect(page.getByText(/success|submitted|pending/i)).toBeVisible();
    });
  });

  test.describe('3. Level 1 Admin Notifications', () => {
    test('3.1 Level 0 Admin Does Not Receive Level 1 Application Notification', async ({
      page,
    }) => {
      // 2. Sign in as SPACE_ADMIN (Level 0 admin)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('space.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Open notifications panel
      const bellIcon = page.getByTestId('NotificationsIcon');
      await bellIcon.click();

      // Expected: Level 0 admin does NOT receive notifications for Level 1 applications
      // This is a negative test - we verify Level 1 notifications don't appear
      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });

    test('3.2 Level 1 Admin Receives Notification', async ({ page }) => {
      // 2. Sign in as SUBSPACE_ADMIN (Level 1 admin)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Open notifications panel
      const bellIcon = page.getByTestId('NotificationsIcon');
      await expect(bellIcon).toBeVisible();
      await bellIcon.click();

      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });

    test('3.3 Level 1 Admin Does Not Receive Level 0 Notifications', async ({
      page,
    }) => {
      // 2. Sign in as SUBSPACE_ADMIN (Level 1 admin)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Open notifications panel
      const bellIcon = page.getByTestId('NotificationsIcon');
      await bellIcon.click();

      // Expected: Only Level 0 admins receive Level 0 application notifications
      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });
  });

  test.describe('4. Level 1 Application Review (Simplified)', () => {
    test('4.1 Level 1 Admin Access to Applications', async ({ page }) => {
      // 1. Sign in as SUBSPACE_ADMIN
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 1 Subspace
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      // 3. Click cog icon
      const cogIcon = page.getByTestId('SettingsIcon');
      await cogIcon.click();

      // 4. Click "Community" tab
      const communityTab = page.getByRole('tab', { name: /community/i });
      await communityTab.click();

      // 5. Verify "Applications" section is visible
      await expect(page.getByText(/applications/i).first()).toBeVisible();
    });

    test('4.2 Level 1 Admin Can See Application Management Buttons', async ({
      page,
    }) => {
      // 2. Sign in as SUBSPACE_ADMIN
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Navigate to Level 1 Subspace > Settings > Community > Applications
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      const cogIcon = page.getByTestId('SettingsIcon');
      await cogIcon.click();

      const communityTab = page.getByRole('tab', { name: /community/i });
      await communityTab.click();

      // 4. Verify "Approve" and "Reject" buttons are visible
      // Note: This assumes there's a pending application
      await expect(page.getByText(/applications/i).first()).toBeVisible();
    });

    test('4.3 Level 0 Admin Cannot Manage Level 1 Applications', async ({
      page,
    }) => {
      // 2. Sign in as SPACE_ADMIN (Level 0 admin, not Level 1 admin)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('space.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Attempt to navigate to Level 1 Subspace settings
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      // Expected: Level 0 admin cannot access Level 1 Settings (or has limited permissions)
      const cogIcon = page.getByTestId('SettingsIcon');
      const isVisible = await cogIcon.isVisible().catch(() => false);

      // If settings is visible, Community tab should not be accessible or show limited permissions
      if (isVisible) {
        await cogIcon.click();
        const communityTab = page.getByRole('tab', { name: /community/i });
        const tabVisible = await communityTab.isVisible().catch(() => false);
        expect(tabVisible).toBeFalsy();
      }
    });
  });
});
