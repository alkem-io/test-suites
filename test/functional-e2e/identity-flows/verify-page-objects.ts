import { Page, expect } from '@playwright/test';

// Vreification Page Object

export const verifyVerificationPageElements = async (page: Page) => {
  await page
    .getByRole('link', { name: 'click here to send it again.' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Email verification' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'To receive a new verification' })
  ).toBeVisible();
  await expect(page.getByLabel('E-Mail *')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
};
