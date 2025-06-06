import { test, expect } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || '';

test('debug registration page navigation', async ({ page }) => {
  // Navigate to the site
  await page.goto(baseUrl);

  // Take a screenshot of the initial page
  await page.screenshot({ path: 'debug-initial.png', fullPage: true });

  // Click on person icon
  await page.getByTestId('PersonIcon').click();
  await page.screenshot({
    path: 'debug-after-person-icon.png',
    fullPage: true,
  });

  // Click on login menu item
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
  await page.screenshot({ path: 'debug-login-page.png', fullPage: true });

  // Look for any links that might be related to sign up
  console.log('Looking for sign up related links...');
  const links = await page.locator('a').all();
  for (const link of links) {
    const text = await link.textContent();
    if (text && text.toLowerCase().includes('sign')) {
      console.log(`Found link with text: "${text}"`);
    }
  }

  // Look for any buttons that might be related to sign up
  console.log('Looking for sign up related buttons...');
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = await button.textContent();
    if (text && text.toLowerCase().includes('sign')) {
      console.log(`Found button with text: "${text}"`);
    }
  }

  // Print page content for debugging
  const pageContent = await page.content();
  console.log(
    'Page contains "sign up":',
    pageContent.toLowerCase().includes('sign up')
  );
  console.log(
    'Page contains "register":',
    pageContent.toLowerCase().includes('register')
  );
});
