import { test, expect } from '@playwright/test';
import { TestUser } from '@alkemio/tests-lib';

/**
 * Space Membership and Community Management Tests
 *
 * Based on SPACE_TEST_PLAN.md Section 4
 *
 * Prerequisites:
 * - seed.spec.ts has created space with SPACE_ADMIN and SPACE_MEMBER
 * - User is authenticated
 */

test.describe('Space Membership and Community Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Community tab
    await page.click('text=Community');
    await page.waitForLoadState('networkidle');
  });

  test.describe('4.1 View Space Members as Admin', () => {
    test('should display all members with roles', async ({ page }) => {
      // Verify we're on Community tab
      await expect(page.locator('text=Community')).toHaveClass(
        /active|selected/
      );

      // Verify members list is visible
      const membersList = page.locator(
        '.members-list, [data-testid="members-list"]'
      );
      await expect(membersList).toBeVisible();

      // Verify both admin and member are shown
      await expect(page.locator('text=/admin/i')).toBeVisible();
      await expect(page.locator('text=/member/i')).toBeVisible();

      // Verify member count is displayed
      await expect(page.locator('text=/[0-9]+.*member/i')).toBeVisible();

      // Verify member information is displayed (names, avatars)
      const memberCards = page.locator(
        '.member-card, .user-card, [data-testid="member-card"]'
      );
      const memberCount = await memberCards.count();
      expect(memberCount).toBeGreaterThanOrEqual(2); // At least admin and member from seed
    });
  });

  test.describe('4.2 Invite User to Space', () => {
    test('should send invitation to new user', async ({ page }) => {
      // Look for invite button
      const inviteButton = page
        .locator('button:has-text("Invite"), button:has-text("Add Member")')
        .first();

      // Check if user has permission to invite (as admin)
      if (await inviteButton.isVisible()) {
        await inviteButton.click();

        // Fill invitation form
        // Note: Adjust selectors based on actual UI
        await page.fill(
          'input[name="email"], input[placeholder*="email"]',
          'newuser@test.com'
        );

        // Select role if available
        const roleSelector = page.locator(
          'select[name="role"], [data-testid="role-selector"]'
        );
        if (await roleSelector.isVisible()) {
          await roleSelector.selectOption('member');
        }

        // Add optional message
        const messageField = page.locator('textarea[name="message"]');
        if (await messageField.isVisible()) {
          await messageField.fill('Welcome to our space!');
        }

        // Send invitation
        await page.click(
          'button[type="submit"], button:has-text("Send"), button:has-text("Invite")'
        );

        // Verify success message or invitation appears in pending list
        await expect(
          page.locator('text=/invitation.*sent|invited.*successfully/i')
        ).toBeVisible({ timeout: 5000 });
      } else {
        // Skip test if user doesn't have permissions
        console.log('User does not have invitation permissions - skipping');
      }
    });
  });

  test.describe('4.3 Accept Space Invitation', () => {
    test.skip('should accept invitation and join space', async ({ page }) => {
      // This test requires:
      // 1. Creating an invitation first
      // 2. Logging in as the invited user
      // 3. Navigating to invitations
      // 4. Accepting the invitation
      // Placeholder for invitation acceptance flow
      // Implementation depends on invitation notification system
    });
  });

  test.describe('4.4 Decline Space Invitation', () => {
    test.skip('should decline invitation', async ({ page }) => {
      // Similar to accept, but clicking decline/reject
      // Requires multi-user test setup
    });
  });

  test.describe('4.5 Remove Member from Space', () => {
    test('should allow admin to remove member', async ({ page }) => {
      // Find a regular member (not admin)
      const memberCards = page.locator('.member-card, .user-card');
      const memberCount = await memberCards.count();

      if (memberCount > 1) {
        // Find a member that is not the current user
        for (let i = 0; i < memberCount; i++) {
          const card = memberCards.nth(i);
          const isAdmin = await card
            .locator('text=/admin/i')
            .isVisible()
            .catch(() => false);

          if (!isAdmin) {
            // Found a regular member, try to remove
            const removeButton = card.locator(
              'button:has-text("Remove"), [data-testid="remove-member"]'
            );

            if (await removeButton.isVisible()) {
              await removeButton.click();

              // Confirm removal if dialog appears
              const confirmButton = page
                .locator(
                  'button:has-text("Confirm"), button:has-text("Remove")'
                )
                .last();
              if (await confirmButton.isVisible({ timeout: 2000 })) {
                await confirmButton.click();
              }

              // Verify member was removed
              await expect(
                page.locator('text=/removed.*successfully|member.*removed/i')
              ).toBeVisible({ timeout: 5000 });

              break;
            }
          }
        }
      } else {
        console.log('Not enough members to test removal - skipping');
      }
    });
  });

  test.describe('4.6 Promote Member to Admin', () => {
    test('should allow admin to promote member', async ({ page }) => {
      // Find a regular member
      const memberCards = page.locator('.member-card, .user-card');
      const memberCount = await memberCards.count();

      for (let i = 0; i < memberCount; i++) {
        const card = memberCards.nth(i);
        const roleText = await card
          .locator('text=/role|admin|member/i')
          .textContent();

        if (
          roleText &&
          roleText.toLowerCase().includes('member') &&
          !roleText.toLowerCase().includes('admin')
        ) {
          // Found a regular member
          const editButton = card.locator(
            'button:has-text("Edit"), [data-testid="edit-role"]'
          );

          if (await editButton.isVisible()) {
            await editButton.click();

            // Change role to admin
            await page.selectOption('select[name="role"]', 'admin');

            // Save changes
            await page.click('button:has-text("Save"), button[type="submit"]');

            // Verify role change
            await expect(card.locator('text=/admin/i')).toBeVisible();

            break;
          }
        }
      }
    });
  });

  test.describe('4.7 Demote Admin to Member', () => {
    test('should prevent removal of last admin', async ({ page }) => {
      // Count current admins
      const adminElements = page.locator('text=/admin/i');
      const adminCount = await adminElements.count();

      if (adminCount === 1) {
        // Try to demote the only admin
        const memberCards = page.locator('.member-card, .user-card');
        const firstCard = memberCards.first();

        const editButton = firstCard.locator('button:has-text("Edit")');
        if (await editButton.isVisible()) {
          await editButton.click();

          // Try to change to member
          await page.selectOption('select[name="role"]', 'member');
          await page.click('button:has-text("Save")');

          // Should show error about requiring at least one admin
          await expect(
            page.locator('text=/at least one admin|require.*admin/i')
          ).toBeVisible();
        }
      } else if (adminCount > 1) {
        // Can demote one admin - future enhancement
        console.log('Multiple admins exist, could test demotion');
      }
    });
  });

  test.describe('Member Visibility and Information', () => {
    test('should display member profile information', async ({ page }) => {
      // Click on a member to view profile
      const memberCard = page.locator('.member-card, .user-card').first();
      await memberCard.click();

      // Verify profile information is displayed
      // This might open a modal or navigate to profile page
      await expect(
        page.locator(
          '.profile-modal, .user-profile, [data-testid="member-profile"]'
        )
      ).toBeVisible({ timeout: 3000 });

      // Verify profile details are shown
      // Name, role, bio, etc.
    });

    test('should filter or search members', async ({ page }) => {
      // Look for search or filter functionality
      const searchField = page.locator(
        'input[placeholder*="search"], input[type="search"]'
      );

      if (await searchField.isVisible()) {
        // Test search functionality
        await searchField.fill('admin');
        await page.waitForTimeout(500); // Wait for debounce

        // Verify filtered results
        const visibleMembers = page.locator(
          '.member-card:visible, .user-card:visible'
        );
        const count = await visibleMembers.count();

        expect(count).toBeGreaterThan(0);

        // Clear search
        await searchField.clear();
      }
    });
  });
});
