import { expect } from '@playwright/test';
import { Page } from "@playwright/test";
import { CommunityGuidelinesTemplateForm } from "../forms/template-form.models";
import { verifyTemplate } from './template-verify';

export const verifyCommunityGuidelinesTemplate = async (page: Page, templateData: CommunityGuidelinesTemplateForm) => {
  await verifyTemplate(page, templateData);

  // Verify the edited template is displayed with updated title
  await expect(page.getByRole('heading', { name: `Preview — ${templateData.displayName}`, exact: true })).toBeVisible();

  // Verify the new edited tag is visible
  await expect(page.locator('.MuiChip-root').filter({ hasText: templateData.tags[templateData.tags.length - 1]}).first()).toBeVisible();

  // Verify the edited description is visible
  await expect(page.locator('.markdown').filter({ hasText: templateData.description }).first()).toBeVisible();

  await expect(page.locator('div').filter({ hasText: templateData.guidelines.displayName }).first()).toBeVisible();
  await expect(page.locator('div').filter({ hasText: templateData.guidelines.description }).first()).toBeVisible();
}