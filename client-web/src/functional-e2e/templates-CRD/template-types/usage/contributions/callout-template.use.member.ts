import { Browser, expect } from '@playwright/test';
import {
  readCalloutsSetCalloutResponses,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  must,
  sessionActor,
} from '@src/functional-e2e/helpers/lib-actor.helper';
import { openPersonaPage } from '@src/functional-e2e/helpers/space-access.helper';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';

/**
 * The space MEMBER — not the admin who built the template and published the
 * callout — adds a post to a Posts callout made from a template whose
 * "Members can add" is on. Until this case every contribution on a
 * template-made callout was made by the admin, so "Members can add" was only
 * ever read back as a switch state, never exercised.
 *
 * Oracles: the member sees the callout and its "Add Post" button; the create
 * dialog is pre-filled with the template's default response title (the
 * template reached the member's view too); after Post the member's own title
 * renders in the card; and the server stores that post on that callout,
 * created by the member.
 */
export const verifyMemberAddsPost = async (
  browser: Browser,
  url: string,
  templateData: CalloutTemplateForm,
  calloutsSetId: string
): Promise<void> => {
  if (
    templateData.responseOptions.type !== 'posts' ||
    !templateData.responseOptions.membersCanAdd
  ) {
    throw new Error('verifyMemberAddsPost needs a Posts callout members can add to');
  }
  const memberUser = TestUserManager.users.spaceMember;
  const member = await openPersonaPage(browser, memberUser.email);
  try {
    const page = member.page;
    await page.goto(url);

    const title = page
      .getByRole('region', { name: 'Space content feed' })
      .getByRole('heading', { name: templateData.calloutTitle, exact: true });
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeVisible();
    // Same card anchor as verifyCalloutTemplateUsage (the card is a plain
    // <div> with no role; the title's grandparent is the card).
    const card = title.locator('xpath=ancestor::*[2]');

    const addPost = card.getByRole('button', { name: /^add post$/i });
    await expect(addPost).toBeVisible();
    await addPost.click();

    const dialog = await getCreateContributionDialog(page, templateData);
    const titleBox = dialog.getByRole('textbox', { name: 'Title' });
    await expect(titleBox).toHaveValue(templateData.responseOptions.defaultTitle);

    const memberPostTitle = `Member post ${UniqueIDGenerator.getID()}`;
    await titleBox.fill(memberPostTitle);
    await dialog.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(dialog).toBeHidden();

    await expect(
      card.getByRole('button').filter({ hasText: memberPostTitle }).first()
    ).toBeVisible();

    // Server: the post is on that callout, created by the member.
    const set = must(
      await readCalloutsSetCalloutResponses(
        calloutsSetId,
        await sessionActor(page)
      ),
      'read back the callouts set as the member'
    );
    const callouts = (set.lookup.calloutsSet?.callouts ?? []).filter(
      c => c.framing.profile.displayName === templateData.calloutTitle
    );
    expect(callouts, 'one stored callout made from the template').toHaveLength(1);
    const posts = callouts[0].contributions
      .map(c => c.post)
      .filter(p => p?.profile.displayName === memberPostTitle);
    expect(posts, 'the member post is stored once on that callout').toHaveLength(1);
    expect(posts[0]?.createdBy?.id, 'created by the member').toBe(memberUser.id);
  } finally {
    await member.close();
  }
};
