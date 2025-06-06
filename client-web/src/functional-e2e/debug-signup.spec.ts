import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:3000';

test('debug sign up page elements', async ({ page }) => {
  // Navigate to the site
  await page.goto(baseUrl);

  // Click on person icon
  await page.getByTestId('PersonIcon').click();

  // Click on login menu item
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();

  // Click on sign up link
  await page.getByRole('link', { name: 'Sign up' }).click();

  // Take a screenshot of the sign-up page
  await page.screenshot({ path: 'debug-signup-page.png', fullPage: true });

  // Look for checkbox related to terms
  console.log('Looking for terms and conditions checkbox...');
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  for (const checkbox of checkboxes) {
    const label = await checkbox.getAttribute('aria-label');
    const id = await checkbox.getAttribute('id');
    console.log(`Found checkbox with aria-label: "${label}", id: "${id}"`);
  }

  // Look for any buttons that might be related to email sign up
  console.log('Looking for email sign up buttons...');
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = await button.textContent();
    if (
      text &&
      (text.toLowerCase().includes('email') ||
        text.toLowerCase().includes('sign'))
    ) {
      console.log(`Found button with text: "${text}"`);
    }
  }

  // Print page content for debugging
  const pageContent = await page.content();
  console.log(
    'Page contains "email":',
    pageContent.toLowerCase().includes('email')
  );
  console.log(
    'Page contains "terms":',
    pageContent.toLowerCase().includes('terms')
  );
});
