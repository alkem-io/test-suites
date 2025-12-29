/**
 * Callout Template Form Orchestrator
 *
 * Main entry point for filling and editing Callout Template forms.
 * Combines template metadata, callout fields, additional content, and collection helpers.
 */

import { Page } from '@playwright/test';
import { fillTemplateForm } from '../template-form';
import {
  CalloutTemplateForm,
  CalloutTemplateFraming,
  CalloutTemplateResponseCollection,
} from './callout-template-form.models';
// Collection helpers
import {
  selectCollectionNone,
} from './collection/none';
import {
  selectCollectionLinksFiles,
  fillCollectionLinksFiles,
} from './collection/links-files';
import {
  selectCollectionPosts,
  fillCollectionPosts,
} from './collection/posts';
import {
  selectCollectionMemos,
  fillCollectionMemos,
} from './collection/memos';
import {
  selectCollectionWhiteboards,
  fillCollectionWhiteboards,
} from './collection/whiteboards';
import { fillCalloutTemplateFramingCallToAction, fillCalloutTemplateFramingMemo, fillCalloutTemplateFramingWhiteboard, selectCalloutTemplateFramingCallToAction, selectCalloutTemplateFramingMemo, selectCalloutTemplateFramingNone, selectCalloutTemplateFramingWhiteboard } from './callout-template-framing';

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
  content: CalloutTemplateFraming
): Promise<void> => {
  switch (content.type) {
    case 'none':
      await selectCalloutTemplateFramingNone(page);
      break;
    case 'whiteboard':
      await selectCalloutTemplateFramingWhiteboard(page);
      await fillCalloutTemplateFramingWhiteboard(page, content);
      break;
    case 'memo':
      await selectCalloutTemplateFramingMemo(page);
      await fillCalloutTemplateFramingMemo(page, content);
      break;
    case 'callToAction':
      await selectCalloutTemplateFramingCallToAction(page);
      await fillCalloutTemplateFramingCallToAction(page, content);
      break;
  }
};

// ============================================================================
// Expand Response Options
// ============================================================================

const expandResponseOptions = async (page: Page): Promise<void> => {
  // Expand Response Options if collapsed
  await page.getByRole('button', { name: 'Expand' }).click();
};

// ============================================================================
// Comments Toggle
// ============================================================================

const setCommentsEnabled = async (
  page: Page,
  enabled: boolean
): Promise<void> => {
  const buttonName = enabled ? 'Comments' : 'No Comments';
  await page.getByRole('button', { name: buttonName, exact: true }).click();
};

// ============================================================================
// Collection Dispatcher
// ============================================================================

const selectAndFillCollection = async (
  page: Page,
  collection: CalloutTemplateResponseCollection
): Promise<void> => {
  const dialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Create new Collaboration Tool Template' }),
  }).last();

  const collectionSection = dialog.getByRole('heading', { name: 'Collection' })
    .locator('..').locator('..').locator('..').locator('..');

  switch (collection.type) {
    case 'none':
      await selectCollectionNone(collectionSection);
      break;
    case 'linksFiles':
      await selectCollectionLinksFiles(collectionSection);
      await fillCollectionLinksFiles(page, dialog, collection);
      break;
    case 'posts':
      await selectCollectionPosts(collectionSection);
      await fillCollectionPosts(page, dialog, collection);
      break;
    case 'memos':
      await selectCollectionMemos(collectionSection);
      await fillCollectionMemos(page, dialog, collection);
      break;
    case 'whiteboards':
      await selectCollectionWhiteboards(collectionSection);
      await fillCollectionWhiteboards(page, dialog, collection);
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
  await selectAndFillAdditionalContent(page, templateData.framing);

  // 4. Expand Response Options
  await expandResponseOptions(page);

  // 5. Set comments enabled/disabled
  await setCommentsEnabled(page, templateData.commentsEnabled);

  // 5. Select and fill collection
  await selectAndFillCollection(page, templateData.responseOptions);
};
