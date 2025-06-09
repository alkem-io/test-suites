import { Page, expect } from '@playwright/test';

// Vreification Page Object

export const verifyVerificationPageElements = async (page: Page) => {
  await expect(
    page.getByRole('heading', { name: 'Email verification' })
  ).toBeVisible();
  page.getByRole('button', { name: 'Sign in', exact: true });
  await expect(
    page.getByRole('heading', { name: 'To receive a new verification' })
  ).toBeVisible();
  await expect(page.getByLabel('E-Mail *')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
};

export const verifyVerificationPageWithSendAgainButtonElements = async (
  page: Page
) => {
  await expect(
    page.getByRole('heading', { name: 'Email verification' })
  ).toBeVisible();
  await expect(page.getByLabel('Verification code *')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resend code' })).toBeVisible();
};
