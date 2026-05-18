import { expect, Page } from '@playwright/test';
import { PostTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';
import {
  closeTemplatePreview,
  getTemplatePreviewDialog,
} from './verify-opened-template';

export const verifyPostTemplate = async (
  page: Page,
  templateData: PostTemplateForm
) => {
  await verifyTemplate(page, templateData);

  // The preview dialog shows the "Default description" content. The
  // defaultContent is markdown - check that it survives the round-trip by
  // asserting the prose substrings appear in the rendered output (markdown
  // markers like `# ` are stripped during rendering, so we can't compare
  // against the raw source).
  const dialog = getTemplatePreviewDialog(page);
  await expect(dialog.getByText('Default description')).toBeVisible();
  for (const phrase of extractMarkdownPhrases(templateData.defaultContent)) {
    await expect(dialog).toContainText(phrase);
  }

  await closeTemplatePreview(page);
};

/**
 * Splits a markdown source into prose-only phrases for substring assertions.
 * Strips leading heading markers (`# `, `## `, …) and blank-line separators so
 * each non-empty line becomes a phrase that should be visible verbatim in the
 * rendered HTML.
 */
const extractMarkdownPhrases = (markdown: string): string[] =>
  markdown
    .split(/\n+/)
    .map(line => line.replace(/^#{1,6}\s+/, '').trim())
    .filter(line => line.length > 0);
