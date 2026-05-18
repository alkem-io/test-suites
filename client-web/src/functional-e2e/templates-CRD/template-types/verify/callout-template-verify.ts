/**
 * Callout (Collaboration tool) Template verification.
 *
 * Verifies a Callout Template appears in the redesigned templates list and
 * that its preview dialog shows the expected callout content. The preview
 * structure (confirmed against the live CRD UI):
 *
 *   dialog [Edit template]
 *     ├─ <h2> displayName + section name ("Collaboration tools")
 *     ├─ template description paragraph + tag list
 *     ├─ framing badge ("Text" / "Memo" / "Whiteboard" / ...)
 *     │  + comments-on/off label
 *     ├─ <h3> calloutTitle
 *     ├─ callout description (markdown - each source line becomes its own <p>)
 *     ├─ framing-specific content (memo <p>, whiteboard <img alt=calloutTitle>,
 *     │   CTA <a href=ctaUrl>ctaText</a>)
 *     └─ "ALLOWED CONTRIBUTIONS" section
 *
 * NOTE: callout-level references are NOT rendered in the preview dialog. They
 * ARE rendered on the in-feed callout once the template is used, so reference
 * assertions live in `usage/callout-template.use.ts`. Callout-level tags
 * (`calloutTags`) are likewise not rendered in the preview - they show up on
 * the in-feed callout and are asserted in the usage flow.
 */

import { expect, Page } from '@playwright/test';
import { CalloutTemplateForm } from '../forms/callout/callout-template-form.models';

export const verifyCalloutTemplate = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  const previewButton = page.getByRole('button', {
    name: `Preview: ${templateData.displayName}`,
    exact: true,
  });
  await expect(previewButton).toBeVisible();

  // The card shows the first couple of (template-level) tags
  const card = page.getByRole('listitem').filter({ has: previewButton }).last();
  for (const tag of templateData.tags.slice(0, 2)) {
    await expect(card.getByText(tag, { exact: true }).first()).toBeVisible();
  }

  // Open the preview dialog
  await previewButton.click();
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Edit template' }) });
  await expect(dialog).toBeVisible();

  // <h2> heading is the displayName (the section name is appended in the
  // accessible name; partial name match works).
  await expect(
    dialog.getByRole('heading', { name: templateData.displayName })
  ).toBeVisible();

  // <h3> heading is the callout's own title
  await expect(
    dialog.getByRole('heading', { level: 3, name: templateData.calloutTitle })
  ).toBeVisible();

  // The callout description is rendered as markdown - each source line becomes
  // a separate <p>. The "- ID: <testId>" line appears verbatim (the template
  // description renders the same line as a <li> WITHOUT the leading dash, so
  // this assertion uniquely confirms the callout description was rendered).
  await expect(
    dialog.getByText(`- ID: ${templateData.testId}`, { exact: true }).first()
  ).toBeVisible();

  // Framing-specific content
  switch (templateData.framing.type) {
    case 'whiteboard': {
      // Whiteboard preview is an <img> whose alt is the callout title.
      await expect(
        dialog.getByRole('img', { name: templateData.calloutTitle })
      ).toBeVisible();
      break;
    }
    case 'memo': {
      // Memo content is rendered as a paragraph inside the preview body.
      await expect(
        dialog.getByText(templateData.framing.memoContent, { exact: true })
      ).toBeVisible();
      break;
    }
    case 'callToAction': {
      // CTA renders as <a href={ctaUrl}>{ctaText}</a>.
      const ctaLink = dialog
        .getByRole('link', { name: templateData.framing.ctaText })
        .first();
      await expect(ctaLink).toBeVisible();
      await expect(ctaLink).toHaveAttribute(
        'href',
        templateData.framing.ctaUrl
      );
      break;
    }
    case 'none':
    default:
      break;
  }

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).not.toBeVisible();
};

/**
 * Verifies that a Callout Template card is visible in the templates list.
 */
export const verifyCalloutTemplateInList = async (
  page: Page,
  displayName: string
): Promise<void> => {
  await expect(
    page.getByRole('heading', { name: displayName, exact: true }).first()
  ).toBeVisible();
};

/**
 * Verifies that a Callout Template card is NOT visible in the templates list.
 */
export const verifyCalloutTemplateNotInList = async (
  page: Page,
  displayName: string
): Promise<void> => {
  await expect(
    page.getByRole('heading', { name: displayName, exact: true })
  ).not.toBeVisible();
};
