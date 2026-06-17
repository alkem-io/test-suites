import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../forms/callout/callout-template-form.models';
import { verifyCalloutContributionLinks } from './contributions/callout-template.use.links';
import { verifyCalloutContributionPosts } from './contributions/callout-template.use.posts';
import { verifyContributionSettings } from './contributions/callout-template.use.contributions';
import { verifyCalloutContributionMemos } from './contributions/callout-template.use.memos';
import { verifyCalloutContributionWhiteboards } from './contributions/callout-template.use.whiteboards';

export const verifyCalloutTemplateUsage = async (
  page: Page,
  url: string,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Navigate to the provided URL where the template will be used
  await page.goto(url);

  // Open the "Create Post" dialog from the feed
  await page.getByRole('button', { name: 'Add Post' }).first().click();

  const createPostDialog = page
    .getByRole('dialog')
    .filter({
      has: page.getByRole('heading', { name: 'Create Post' }),
    })
    .last();
  await expect(createPostDialog).toBeVisible();

  // Open the "Use a template" picker
  await createPostDialog
    .getByRole('button', { name: 'Find Template' })
    .click();

  // The picker lists templates as list items with a "Use template" button per
  // row (same pattern as the whiteboard editor's picker).
  const pickerDialog = page.getByRole('dialog', { name: 'Use a template' });
  await expect(pickerDialog).toBeVisible();

  const item = pickerDialog
    .getByRole('listitem')
    .filter({ hasText: templateData.displayName });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Use template', exact: true }).click();

  // Picker closes; Create Post dialog is now pre-populated. Sanity-check the
  // callout title was filled in.
  await expect(pickerDialog).not.toBeVisible();
  await expect(
    createPostDialog.getByRole('textbox', { name: 'Title' })
  ).toHaveValue(templateData.calloutTitle);

  // Publish the post
  await createPostDialog
    .getByRole('button', { name: 'Post', exact: true })
    .click();

  // Wait for the dialog to close
  await createPostDialog.waitFor({ state: 'hidden' });

  // Verify the callout appears in the feed with correct title and description.
  // The feed is exposed as a `region "Space content feed"`; each callout card
  // is a plain <div> inside it (no MUI / class hooks anymore), so we anchor on
  // the title heading and climb up two levels to the card container.
  const feedRegion = page.getByRole('region', { name: 'Space content feed' });
  const title = feedRegion.getByRole('heading', {
    name: templateData.calloutTitle,
    exact: true,
  });
  await title.scrollIntoViewIfNeeded();
  await expect(title).toBeVisible();

  const calloutContainer = title.locator('xpath=ancestor::*[2]');

  // Verify description text is present (substring match - HTML collapses whitespace)
  await expect(
    calloutContainer.getByText('Callout Template Description', { exact: false })
  ).toBeVisible();
  await expect(
    calloutContainer.getByText(`- ID: ${templateData.testId}`, { exact: false }).first()
  ).toBeVisible();

  // Verify at least the first 3 callout tags are present. Tag chips render
  // twice for the responsive-overflow layout: a `visibility: hidden`
  // measuring copy first in DOM order, then the visible chip. `.first()`
  // alone would pin the hidden duplicate, so filter to visible matches.
  for (const tag of templateData.calloutTags.slice(0, 3)) {
    await expect(
      calloutContainer
        .getByText(tag, { exact: true })
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 15000 });
  }

  for (const reference of templateData.calloutReferences) {
    const link = calloutContainer
      .getByRole('link', { name: reference.title })
      .first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', reference.url);
  }

  // Verify Framing:
  switch (templateData.framing.type) {
    case 'whiteboard': {
      // The in-feed whiteboard control is a button labelled "Open Whiteboard"
      // (validated against the live CRD UI on 2026-05-18). Always visible -
      // unlike the legacy MUI overlay-on-hover. There's also a "Open Whiteboard"
      // affordance on the standalone whiteboard editor, hence `.first()`.
      await expect(
        calloutContainer.getByRole('button', { name: 'Open Whiteboard' }).first()
      ).toBeVisible();
      break;
    }
    case 'memo': {
      // Verify memo content is visible
      await expect(
        calloutContainer
          .getByText(templateData.framing.memoContent, { exact: true })
          .first()
      ).toBeVisible();
      break;
    }
    case 'callToAction': {
      // CTA renders as a link to the configured URL. Its accessible name is
      // "<ctaText> (opens <ctaUrl> in a new tab)", so a substring match on
      // ctaText is enough.
      const ctaLink = calloutContainer
        .getByRole('link', { name: templateData.framing.ctaText })
        .first();
      await expect(ctaLink).toBeVisible();
      await expect(ctaLink).toHaveAttribute(
        'href',
        templateData.framing.ctaUrl
      );
      break;
    }
    case 'poll': {
      // In-feed poll (validated against the live CRD UI on 2026-05-20). Each
      // option is a `<button role="radio|checkbox">` with NO accessible name -
      // the option label is a sibling text node - so options are matched by
      // their visible label text, not by control name. The radiogroup, when
      // present, is named "Poll" (not the question), so we don't anchor on it.
      const { settings, options } = templateData.framing;

      for (const option of options) {
        await expect(
          calloutContainer.getByText(option, { exact: false }).first()
        ).toBeVisible();
      }

      // All four Poll Settings flags are observable on this freshly-created
      // (zero-vote) callout - no need to cast a vote:

      // 1) Allow multiple responses -> options render as checkboxes (multi)
      //    instead of radios (single). Assert the configured control is used
      //    and the other is absent.
      const optionRole = settings.allowMultipleResponses ? 'checkbox' : 'radio';
      const wrongRole = settings.allowMultipleResponses ? 'radio' : 'checkbox';
      await expect(calloutContainer.getByRole(optionRole).first()).toBeVisible();
      await expect(calloutContainer.getByRole(wrongRole)).toHaveCount(0);

      // 2) Allow contributors to add options -> an "Add your own option..."
      //    button is rendered on the card.
      const addOption = calloutContainer.getByRole('button', {
        name: /Add your own option/,
      });
      if (settings.allowContributorsToAddOptions && options.length < 10) {
        await expect(addOption).toBeVisible();
      } else {
        await expect(addOption).toHaveCount(0);
      }

      // 3) Show voter avatars OFF -> the poll is anonymous and renders an
      //    "Anonymous poll" label. ON -> no such label (voter avatars shown
      //    once votes exist instead).
      const anonymousLabel = calloutContainer.getByText('Anonymous poll', {
        exact: true,
      });
      if (settings.showVoterAvatars) {
        await expect(anonymousLabel).toHaveCount(0);
      } else {
        await expect(anonymousLabel).toBeVisible();
      }

      // 4) Hide results until user votes -> before the viewer votes, per-option
      //    vote tallies "(n)" are hidden. With the setting OFF the "(0)" counts
      //    are shown immediately; with it ON nothing is shown until a vote is
      //    cast (this callout has no votes yet).
      const voteTallies = calloutContainer.getByText(/\(\d+\)/);
      if (settings.hideResultsUntilUserVotes) {
        await expect(voteTallies).toHaveCount(0);
      } else {
        await expect(voteTallies.first()).toBeVisible();
      }
      break;
    }
    case 'none':
    default: {
      // No framing content to verify
      break;
    }
  }

  await verifyCalloutContributions(page, calloutContainer, templateData);
};

/**
 * Verify the contribution settings dialog in the Callout created using the template
 */
const verifyCalloutContributions = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Check that the contribution settings are the same
  // Verify Response Options based on type
  switch (templateData.responseOptions.type) {
    case 'linksFiles': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionLinks(
        page,
        calloutContainer,
        templateData
      );
      break;
    }
    case 'posts': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionPosts(
        page,
        calloutContainer,
        templateData
      );
      break;
    }
    case 'memos': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionMemos(
        page,
        calloutContainer,
        templateData
      );
      break;
    }
    case 'whiteboards': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionWhiteboards(
        page,
        calloutContainer,
        templateData
      );
      break;
    }
    case 'none':
    default: {
      // No contribution options to verify
      break;
    }
  }
};
