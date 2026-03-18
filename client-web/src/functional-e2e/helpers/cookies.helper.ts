import { Page } from '@playwright/test';

/**
 * Helper function to accept cookies if the dialog appears.
 * Waits for the banner to disappear after clicking.
 */
export async function acceptCookiesIfVisible(page: Page): Promise<void> {
  await page.waitForTimeout(1000);
  const acceptCookiesButton = page.getByRole('button', {
    name: /accept all cookies/i,
  });

  try {
    if (await acceptCookiesButton.first().isVisible({ timeout: 3000 })) {
      await acceptCookiesButton.first().click();
      await acceptCookiesButton
        .first()
        .waitFor({ state: 'hidden', timeout: 5000 });
    }
  } catch {
    // Banner not visible or already dismissed
  }
}
