/**
 * Collection: Posts
 * Enables responding with posts (rich text entries).
 */

import { Page, expect } from '@playwright/test';
import { ResponsePosts } from '../callout-template-form.models';

/**
 * Selects "Posts" for collection type.
 */
export const selectCollectionPosts = async (page: Page): Promise<void> => {
  // First expand Response Options if collapsed
  const expandButton = page.getByRole('button', { name: 'Expand' });
  if (await expandButton.isVisible()) {
    await expandButton.click();
  }

  // Select Posts in Collection section
  const collectionSection = page.getByRole('heading', { name: 'Collection' }).locator('..');
  const postsButton = collectionSection.getByRole('button', { name: 'Posts' });
  await postsButton.click();
};

/**
 * Opens Collection settings and configures posts options.
 */
export const fillCollectionPosts = async (
  page: Page,
  settings: ResponsePosts
): Promise<void> => {
  // Open collection settings dialog
  await page.getByRole('button', { name: 'Collection settings' }).click();

  const settingsDialog = page.getByRole('dialog', { name: 'Collection settings' });
  await expect(settingsDialog).toBeVisible();

  // Fill default title
  if (settings.defaultTitle) {
    const titleField = settingsDialog.getByRole('textbox', { name: 'Title' });
    await titleField.fill(settings.defaultTitle);
  }

  // Fill default description
  if (settings.defaultDescription) {
    const descField = settingsDialog.getByRole('textbox', { name: 'Markdown editor' });
    await descField.fill(settings.defaultDescription);
  }

  // Configure member permissions
  const membersCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Members can add to the collection',
  });
  const membersChecked = await membersCheckbox.isChecked();
  if (membersChecked !== settings.membersCanAdd) {
    await membersCheckbox.click();
  }

  // Configure admin permissions
  const adminsCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Admins can add to the collection',
  });
  const adminsChecked = await adminsCheckbox.isChecked();
  if (adminsChecked !== settings.adminsCanAdd) {
    await adminsCheckbox.click();
  }

  // Configure comments on posts
  const commentsCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Enable comments on each Post in the collection',
  });
  const commentsChecked = await commentsCheckbox.isChecked();
  if (commentsChecked !== settings.enableCommentsOnPosts) {
    await commentsCheckbox.click();
  }

  // Save and close
  await settingsDialog.getByRole('button', { name: 'Save' }).click();
  await expect(settingsDialog).not.toBeVisible();
};

/**
 * Edits collection settings for posts.
 */
export const editCollectionPosts = async (
  page: Page,
  settings: ResponsePosts
): Promise<void> => {
  // Open collection settings dialog
  await page.getByRole('button', { name: 'Collection settings' }).click();

  const settingsDialog = page.getByRole('dialog', { name: 'Collection settings' });
  await expect(settingsDialog).toBeVisible();

  // Clear and fill default title
  if (settings.defaultTitle) {
    const titleField = settingsDialog.getByRole('textbox', { name: 'Title' });
    await titleField.click();
    await titleField.press('Control+a');
    await titleField.fill(settings.defaultTitle);
  }

  // Clear and fill default description
  if (settings.defaultDescription) {
    const descField = settingsDialog.getByRole('textbox', { name: 'Markdown editor' });
    await descField.click();
    await descField.press('Control+a');
    await descField.fill(settings.defaultDescription);
  }

  // Configure member permissions
  const membersCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Members can add to the collection',
  });
  const membersChecked = await membersCheckbox.isChecked();
  if (membersChecked !== settings.membersCanAdd) {
    await membersCheckbox.click();
  }

  // Configure admin permissions
  const adminsCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Admins can add to the collection',
  });
  const adminsChecked = await adminsCheckbox.isChecked();
  if (adminsChecked !== settings.adminsCanAdd) {
    await adminsCheckbox.click();
  }

  // Configure comments on posts
  const commentsCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Enable comments on each Post in the collection',
  });
  const commentsChecked = await commentsCheckbox.isChecked();
  if (commentsChecked !== settings.enableCommentsOnPosts) {
    await commentsCheckbox.click();
  }

  // Save and close
  await settingsDialog.getByRole('button', { name: 'Save' }).click();
  await expect(settingsDialog).not.toBeVisible();
};
