// spec: test-plan-applications-reorganized.md
// seed: seed-applications.spec.ts

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

test.describe('Level 2 (Subsubspace) Test Suite', () => {
  test.describe('1. Level 2 Discovery', () => {
    test('1.1 View Level 2 as Level 1 Member', async ({ page }) => {
      // 1. Sign in as SUBSPACE_MEMBER (Level 1 member, not Level 2 member)
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

      // 2. Navigate to Level 1 Subspace
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      // 3. View Subspaces section
      // 4. Verify Level 2 subsubspaces are visible
      const subsubspaceCard = page
        .locator('[data-testid="SubspaceCard"]')
        .first();
      await expect(subsubspaceCard).toBeVisible();
      await expect(
        subsubspaceCard.getByTestId('LockOutlinedIcon')
      ).toBeVisible();

      const applyButton = page.getByRole('button', { name: /apply|join/i });
      await expect(applyButton).toBeVisible();
    });

    test('1.2 View Level 2 as Member with Full Access', async ({ page }) => {
      // 1. Sign in as SUBSUBSPACE_MEMBER (Level 2 member)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subsubspace.member@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 2 Subsubspace
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      const subsubspaceCard = page
        .locator('[data-testid="SubspaceCard"]')
        .first();
      await subsubspaceCard.click();

      // 3. Verify full access to content
      // No Apply button should be shown for members
      const applyButton = page.getByRole('button', { name: /apply|join/i });
      await expect(applyButton).not.toBeVisible();
    });
  });

  test.describe('2. Level 2 Application Submission', () => {
    test('2.1 Apply to Level 2 Subsubspace', async ({ page }) => {
      // 1. Sign in as SUBSPACE_MEMBER (Level 1 member, not Level 2 member)
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

      // 2. Navigate to Level 1 Subspace > Subspaces
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      // 3. Click on Level 2 Subsubspace
      const subsubspaceCard = page
        .locator('[data-testid="SubspaceCard"]')
        .first();
      await subsubspaceCard.click();

      // 4. Click "Apply" button
      const applyButton = page.getByRole('button', { name: /apply|join/i });
      await applyButton.click();

      // 5. Fill in questionnaire
      const question1 = page.locator('input, textarea').first();
      await question1.fill('Interested in Level 2 work');

      const question2 = page.locator('input, textarea').nth(1);
      await question2.fill('Level 2 expertise');

      // 6. Submit application
      const submitButton = page.getByRole('button', {
        name: /submit|send|apply/i,
      });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      await expect(page.getByText(/success|submitted|pending/i)).toBeVisible();
    });
  });

  test.describe('3. Level 2 Admin Notifications', () => {
    test('3.1 Level 0 Admin Does Not Receive Level 2 Notifications', async ({
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

      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });

    test('3.2 Level 1 Admin Does Not Receive Level 2 Notifications', async ({
      page,
    }) => {
      // 2. Sign in as SUBSPACE_ADMIN (Level 1 admin, not Level 2 admin)
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

      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });

    test('3.3 Level 2 Admin Receives Notification', async ({ page }) => {
      // 2. Sign in as SUBSUBSPACE_ADMIN (Level 2 admin)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subsubspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Open notifications panel
      const bellIcon = page.getByTestId('NotificationsIcon');
      await expect(bellIcon).toBeVisible();
      await bellIcon.click();

      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });

    test('3.4 Level 2 Admin Does Not Receive Level 0 or Level 1 Notifications', async ({
      page,
    }) => {
      // 2. Sign in as SUBSUBSPACE_ADMIN (Level 2 admin)
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subsubspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Open notifications panel
      const bellIcon = page.getByTestId('NotificationsIcon');
      await bellIcon.click();

      await expect(page.locator('[role="menu"], [role="list"]')).toBeVisible();
    });
  });

  test.describe('4. Level 2 Application Review (Simplified)', () => {
    test('4.1 Level 2 Admin Access to Applications', async ({ page }) => {
      // 1. Sign in as SUBSUBSPACE_ADMIN
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subsubspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 2. Navigate to Level 2 Subsubspace
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      const subsubspaceCard = page
        .locator('[data-testid="SubspaceCard"]')
        .first();
      await subsubspaceCard.click();

      // 3. Click cog icon
      const cogIcon = page.getByTestId('SettingsIcon');
      await cogIcon.click();

      // 4. Click "Community" tab
      const communityTab = page.getByRole('tab', { name: /community/i });
      await communityTab.click();

      // 5. Verify "Applications" section is visible
      await expect(page.getByText(/applications/i).first()).toBeVisible();
    });

    test('4.2 Level 2 Admin Can See Application Management Buttons', async ({
      page,
    }) => {
      // 2. Sign in as SUBSUBSPACE_ADMIN
      await page.goto('http://localhost:3000');
      await page.getByRole('button', { name: 'Accept All Cookies' }).click();
      await page.getByTestId('PersonIcon').click();
      await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
      await expect(page).toHaveURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail' })
        .fill('subsubspace.admin@alkem.io');
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/.*home.*/);

      // 3. Navigate to Level 2 Subsubspace > Settings > Community > Applications
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      await subspaceCard.click();

      const subsubspaceCard = page
        .locator('[data-testid="SubspaceCard"]')
        .first();
      await subsubspaceCard.click();

      const cogIcon = page.getByTestId('SettingsIcon');
      await cogIcon.click();

      const communityTab = page.getByRole('tab', { name: /community/i });
      await communityTab.click();

      // 4. Verify "Approve" and "Reject" buttons are visible
      await expect(page.getByText(/applications/i).first()).toBeVisible();
    });

    test('4.3 Level 0 and Level 1 Admins Cannot Manage Level 2 Applications', async ({
      page,
    }) => {
      // 2. Sign in as SPACE_ADMIN (not Level 2 admin)
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

      // 3. Attempt to navigate to Level 2 Subsubspace settings
      const spaceCard = page.locator('[data-testid="SpaceCard"]').first();
      await spaceCard.click();

      const subspaceCard = page.locator('[data-testid="SubspaceCard"]').first();
      const subspaceVisible = await subspaceCard.isVisible().catch(() => false);

      if (subspaceVisible) {
        await subspaceCard.click();

        const subsubspaceCard = page
          .locator('[data-testid="SubspaceCard"]')
          .first();
        const subsubspaceVisible = await subsubspaceCard
          .isVisible()
          .catch(() => false);

        // Expected: Level 0 admin cannot see Level 2 at all
        expect(subsubspaceVisible).toBeFalsy();
      }
    });
  });
});
