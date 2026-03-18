import { test } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change-me!';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.skip('seed', async ({ page }) => {
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page.getByTestId('PersonIcon').click();
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
  await page.waitForURL(/.*login.*/);
  await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/.*home.*/);
});
