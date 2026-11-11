import { Browser, expect } from '@playwright/test';
import {
  CalloutContributionType,
  createContributionOnCallout,
  readCalloutsSetCalloutResponses,
  TestUser,
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

/**
 * The other half of "Members can add": on a Posts callout made from a
 * template whose "Members can add" is OFF and "Admins can add" ON
 * (Contrib: Admin), the space MEMBER may read the callout but not add to it.
 *
 * Oracles: the member sees the callout (positive control for the page) but
 * no "Add Post" on its card; the member's own createContributionOnCallout is
 * refused with CALLOUT_CLOSED "Only admins are allowed to contribute to this
 * Callout" (server `callout.resolver.mutations.ts`), while the same call by
 * the space admin is accepted (positive control for the call); the server
 * then holds the admin's post and not the member's.
 */
export const verifyMemberCannotAddPost = async (
  browser: Browser,
  url: string,
  templateData: CalloutTemplateForm,
  calloutsSetId: string
): Promise<void> => {
  if (
    templateData.responseOptions.type !== 'posts' ||
    !templateData.responseOptions.adminsCanAdd ||
    templateData.responseOptions.membersCanAdd
  ) {
    throw new Error(
      'verifyMemberCannotAddPost needs a Posts callout only admins can add to'
    );
  }
  const member = await openPersonaPage(
    browser,
    TestUserManager.users.spaceMember.email
  );
  try {
    const page = member.page;
    await page.goto(url);

    const title = page
      .getByRole('region', { name: 'Space content feed' })
      .getByRole('heading', { name: templateData.calloutTitle, exact: true });
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeVisible();
    // Same card anchor as verifyMemberAddsPost.
    const card = title.locator('xpath=ancestor::*[2]');
    await expect(card.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(card.getByRole('button', { name: /^add post$/i })).toHaveCount(
      0
    );

    const memberActor = await sessionActor(page);
    const set = must(
      await readCalloutsSetCalloutResponses(calloutsSetId, memberActor),
      'read the callouts set as the member'
    );
    const callouts = (set.lookup.calloutsSet?.callouts ?? []).filter(
      c => c.framing.profile.displayName === templateData.calloutTitle
    );
    expect(callouts, 'one stored callout made from the template').toHaveLength(1);
    const calloutID = callouts[0].id;

    const addPost = (displayName: string) => ({
      calloutID,
      type: CalloutContributionType.Post,
      post: { profileData: { displayName } },
    });
    const memberTitle = `Member post ${UniqueIDGenerator.getID()}`;
    const refused = await createContributionOnCallout(
      addPost(memberTitle),
      memberActor
    );
    expect(
      refused.error?.errors.map(e => e.code),
      'the member is refused'
    ).toEqual(['CALLOUT_CLOSED']);
    expect(refused.error?.errors[0].message).toContain(
      'Only admins are allowed to contribute to this Callout'
    );

    const adminTitle = `Admin post ${UniqueIDGenerator.getID()}`;
    must(
      await createContributionOnCallout(
        addPost(adminTitle),
        TestUser.SPACE_ADMIN
      ),
      'the space admin adds a post to the same callout'
    );

    const after = must(
      await readCalloutsSetCalloutResponses(calloutsSetId, memberActor),
      'read back the callouts set as the member'
    );
    const titles = (after.lookup.calloutsSet?.callouts ?? [])
      .filter(c => c.id === calloutID)
      .flatMap(c => c.contributions.map(x => x.post?.profile.displayName));
    expect(titles, "the admin's post is stored").toContain(adminTitle);
    expect(titles, "the member's post is not").not.toContain(memberTitle);
  } finally {
    await member.close();
  }
};
