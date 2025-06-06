import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:3000';

test('debug signin page elements', async ({ page }) => {
  // Navigate to login page
  await page.goto(baseUrl);
  await page.getByTestId('PersonIcon').click();
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();

  // Take a screenshot
  await page.screenshot({ path: 'debug-signin-page.png', fullPage: true });

  // Get page content to check for expected text
  const pageText = await page.textContent('body');
  console.log(
    'Page contains "account":',
    pageText?.toLowerCase().includes('account')
  );
  console.log(
    'Page contains "sign up":',
    pageText?.toLowerCase().includes('sign up')
  );

  // Look for all text elements containing "account"
  const textElements = await page
    .locator('*')
    .filter({ hasText: /account/i })
    .all();
  console.log(`Found ${textElements.length} elements with "account" text`);
  for (let i = 0; i < textElements.length; i++) {
    const text = await textElements[i].textContent();
    console.log(`Element ${i}: "${text}"`);
  }
});
