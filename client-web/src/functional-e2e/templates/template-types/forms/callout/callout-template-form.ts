/**
 * Callout Template Form Orchestrator
 *
 * Main entry point for filling and editing Callout Template forms.
 * Combines template metadata, callout fields, additional content, and collection helpers.
 */

import { Page, expect } from '@playwright/test';
import { fillTemplateForm } from '../template-form';
import {
  CalloutTemplateForm,
  AdditionalContent,
  ResponseCollection,
} from './callout-template-form.models';

// Additional Content helpers
import {
  selectAdditionalContentNone,
  editAdditionalContentNone,
} from './additional-content/none';
import {
  selectAdditionalContentWhiteboard,
  fillAdditionalContentWhiteboard,
  editAdditionalContentWhiteboard,
} from './additional-content/whiteboard';
import {
  selectAdditionalContentMemo,
  fillAdditionalContentMemo,
  editAdditionalContentMemo,
} from './additional-content/memo';
import {
  selectAdditionalContentCallToAction,
  fillAdditionalContentCallToAction,
  editAdditionalContentCallToAction,
} from './additional-content/call-to-action';

// Collection helpers
import {
  selectCollectionNone,
  fillCollectionNone,
  editCollectionNone,
} from './collection/none';
import {
  selectCollectionLinksFiles,
  fillCollectionLinksFiles,
  editCollectionLinksFiles,
} from './collection/links-files';
import {
  selectCollectionPosts,
  fillCollectionPosts,
  editCollectionPosts,
} from './collection/posts';
import {
  selectCollectionMemos,
  fillCollectionMemos,
  editCollectionMemos,
} from './collection/memos';
import {
  selectCollectionWhiteboards,
  fillCollectionWhiteboards,
  editCollectionWhiteboards,
} from './collection/whiteboards';

// ============================================================================
// Callout Base Fields
// ============================================================================

/**
 * Fills the callout-specific base fields (title, tags, description).
 * These appear in the "Collaboration Tool Template" section of the form.
 */
const fillCalloutBaseFields = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Fill callout title (required) - use exact: true to distinguish from Template title
  const titleField = page.getByRole('textbox', { name: 'Title', exact: true });
  await titleField.fill(templateData.calloutTitle);

  // Fill callout tags
  if (templateData.calloutTags.length > 0) {
    const tagsCombobox = page
      .getByRole('heading', { name: 'Collaboration Tool Template' })
      .locator('..')
      .locator('..')
      .getByRole('combobox')
      .first();

    for (const tag of templateData.calloutTags) {
      await tagsCombobox.fill(tag);
      await tagsCombobox.press('Enter');
    }
  }

  // Fill callout description
  if (templateData.calloutDescription) {
    // The callout description is the second markdown editor in the form
    const descriptionEditor = page
      .getByRole('heading', { name: 'Collaboration Tool Template' })
      .locator('..')
      .locator('..')
      .getByRole('textbox', { name: 'Markdown editor' })
      .first();
    await descriptionEditor.fill(templateData.calloutDescription);
  }
};

// ============================================================================
// Additional Content Dispatcher
// ============================================================================

const selectAndFillAdditionalContent = async (
  page: Page,
  content: AdditionalContent
): Promise<void> => {
  switch (content.type) {
    case 'none':
      await selectAdditionalContentNone(page);
      break;
    case 'whiteboard':
      await selectAdditionalContentWhiteboard(page);
      await fillAdditionalContentWhiteboard(page, content);
      break;
    case 'memo':
      await selectAdditionalContentMemo(page);
      await fillAdditionalContentMemo(page, content);
      break;
    case 'callToAction':
      await selectAdditionalContentCallToAction(page);
      await fillAdditionalContentCallToAction(page, content);
      break;
  }
};

const editAdditionalContent = async (
  page: Page,
  content: AdditionalContent
): Promise<void> => {
  switch (content.type) {
    case 'none':
      await editAdditionalContentNone(page);
      break;
    case 'whiteboard':
      await editAdditionalContentWhiteboard(page, content);
      break;
    case 'memo':
      await editAdditionalContentMemo(page, content);
      break;
    case 'callToAction':
      await editAdditionalContentCallToAction(page, content);
      break;
  }
};

// ============================================================================
// Expand Response Options
// ============================================================================

const expandResponseOptions = async (page: Page): Promise<void> => {
  // Expand Response Options if collapsed
  await page.getByRole('button', { name: 'Expand' }).click();
  // if (await expandButton.isVisible()) {
  //   await expandButton.click();
  // }
};

// ============================================================================
// Comments Toggle
// ============================================================================

const setCommentsEnabled = async (
  page: Page,
  enabled: boolean
): Promise<void> => {
  // const commentsSection = page
  //   .getByRole('heading', { name: 'Comments' })
  //   .locator('..');
  const buttonName = enabled ? 'Comments' : 'No Comments';
  await page.getByRole('button', { name: buttonName }).click();
};

// ============================================================================
// Collection Dispatcher
// ============================================================================

const selectAndFillCollection = async (
  page: Page,
  collection: ResponseCollection
): Promise<void> => {
  switch (collection.type) {
    case 'none':
      await selectCollectionNone(page);
      await fillCollectionNone(page);
      break;
    case 'linksFiles':
      await selectCollectionLinksFiles(page);
      await fillCollectionLinksFiles(page, collection);
      break;
    case 'posts':
      await selectCollectionPosts(page);
      await fillCollectionPosts(page, collection);
      break;
    case 'memos':
      await selectCollectionMemos(page);
      await fillCollectionMemos(page, collection);
      break;
    case 'whiteboards':
      await selectCollectionWhiteboards(page);
      await fillCollectionWhiteboards(page, collection);
      break;
  }
};

const editCollection = async (
  page: Page,
  collection: ResponseCollection
): Promise<void> => {
  switch (collection.type) {
    case 'none':
      await editCollectionNone(page);
      break;
    case 'linksFiles':
      await editCollectionLinksFiles(page, collection);
      break;
    case 'posts':
      await editCollectionPosts(page, collection);
      break;
    case 'memos':
      await editCollectionMemos(page, collection);
      break;
    case 'whiteboards':
      await editCollectionWhiteboards(page, collection);
      break;
  }
};

// ============================================================================
// Main Form Functions
// ============================================================================

/**
 * Fills a new Callout Template form with all fields.
 */
export const fillCalloutTemplateForm = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // 1. Fill template metadata (displayName, description, tags)
  await fillTemplateForm(page, templateData);

  // 2. Fill callout base fields (title, calloutTags, calloutDescription)
  await fillCalloutBaseFields(page, templateData);

  // 3. Select and fill additional content
  await selectAndFillAdditionalContent(page, templateData.additionalContent);

  // 4. Expand Response Options
  await expandResponseOptions(page);

  // 5. Set comments enabled/disabled
  await setCommentsEnabled(page, templateData.commentsEnabled);

  // 5. Select and fill collection
  await selectAndFillCollection(page, templateData.responseOptions);
};
