// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { delay } from '@alkemio/tests-lib/utils/delay';
import { test, expect, Page } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// CRD profile identity fields are inline-edit buttons. Clicking the button
// swaps the read-only button for an active textbox with the same accessible
// name, in place. The edit commits on Enter (auto-save, no Save button).
async function openInlineField(page: Page, fieldName: string) {
  await page.getByRole('button', { name: fieldName }).click();
  const textbox = page.getByRole('textbox', { name: fieldName });
  await textbox.waitFor({ state: 'visible', timeout: 10_000 });
  return textbox;
}

async function readInlineFieldValue(
  page: Page,
  fieldName: string
): Promise<string> {
  const textbox = await openInlineField(page, fieldName);
  const value = await textbox.inputValue();
  // Close the inline editor without changing anything.
  await page.keyboard.press('Escape');
  return value;
}

async function updateInlineField(
  page: Page,
  fieldName: string,
  value: string
) {
  const textbox = await openInlineField(page, fieldName);
  await textbox.fill(value);
  // CRD inline editors commit on Enter; the field then collapses back to its
  // read-only button. Wait for that collapse to confirm the edit committed.
  await textbox.press('Enter');
  await expect(
    page.getByRole('button', { name: fieldName })
  ).toContainText(value, { timeout: 10_000 });
}

test.describe('My Profile Tab - View and Edit', () => {
  let originalFirstName: string;
  let originalLastName: string;

  test('Update Basic Information', async ({ page }) => {
    // Seed: Login
    await page.goto(baseUrl);
    const cookieButton = page.getByRole('button', {
      name: 'Accept All Cookies',
    });
    if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieButton.click();
    }
    await delay(1000); // inconsistency in passing locally
    const loginLink = page.getByRole('link', { name: 'Log in', exact: true });
    await loginLink.waitFor({ state: 'visible', timeout: 30_000 });
    await loginLink.click();
    await page.waitForURL(/.*login.*/);
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*home.*/);
    const switchToNewDesign = page.getByRole('button', {
      name: /take me to the new design/i,
    });
    if (
      await switchToNewDesign.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await switchToNewDesign.click().catch(() => {});
    }

    // Navigate to the Profile settings tab
    await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);

    // CRD turns each identity field into an inline-edit button that swaps to
    // an active textbox in place; the edit auto-saves on Enter (no bottom Save
    // button). Store originals, then update each field.
    originalFirstName = await readInlineFieldValue(page, 'First Name');
    originalLastName = await readInlineFieldValue(page, 'Last Name');

    // 1-4 + 6. Update First Name. updateInlineField confirms the edit
    // committed (the field collapses back to a button showing the new value),
    // which is the deterministic proof of a successful save; the transient
    // "User updated successfully" toast is the same signal, checked
    // best-effort since it auto-dismisses quickly.
    await updateInlineField(page, 'First Name', 'TestFirstName');
    await expect(page.getByText('User updated successfully'))
      .toBeVisible({ timeout: 3000 })
      .catch(() => {});

    // Update Last Name and verify it committed.
    await updateInlineField(page, 'Last Name', 'TestLastName');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Revert changes to original values if they were modified
    if (originalFirstName && originalLastName) {
      await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);
      await updateInlineField(page, 'First Name', originalFirstName);
      await updateInlineField(page, 'Last Name', originalLastName);
      // Cleanup verification: confirm the values reverted. The per-save toast
      // is transient, so assert the committed field values instead.
      await expect(
        page.getByRole('button', { name: 'First Name' })
      ).toContainText(originalFirstName);
      await expect(
        page.getByRole('button', { name: 'Last Name' })
      ).toContainText(originalLastName);
    }
  });
});
