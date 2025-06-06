import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './src/functional-e2e/authentication/login-page-objects';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test('debug sign-in page content', async ({ page }) => {
  console.log('Starting debug test...');

  // Navigate to login page
  await navigateToLoginPageFromMenu(baseUrl, page);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-signin-page.png' });

  // Get all text content on the page
  const allText = await page.locator('body').textContent();
  console.log('All page text:', allText);

  // Check for various text patterns that might be on the sign-in page
  const textPatterns = [
    "Don't have an Alkemio account",
    "Don't have an Alkemio account",
    'Sign up',
    'Register',
    'Create account',
    'Sign in',
    'Login',
    'Email',
    'Password',
    'LinkedIn',
    'Microsoft',
  ];

  for (const pattern of textPatterns) {
    const isVisible = await page
      .getByText(pattern, { exact: false })
      .isVisible()
      .catch(() => false);
    console.log(`"${pattern}": ${isVisible}`);
  }

  // Check for input fields
  const emailVisible = await page
    .locator('input[type="email"]')
    .isVisible()
    .catch(() => false);
  const passwordVisible = await page
    .locator('input[type="password"]')
    .isVisible()
    .catch(() => false);

  console.log('Email field visible:', emailVisible);
  console.log('Password field visible:', passwordVisible);
});
