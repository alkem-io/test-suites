import { expect, type Locator, type Page } from '@playwright/test';
import {
  deletePlatformDiscussion,
  getUserToken,
  readMyNotifications,
  readPlatformDiscussion,
  readPlatformForumDiscussions,
  readMyUser,
  TestUser,
  type GraphqlActor,
  type NotificationEvent,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';

/**
 * Shared set-up, locators and read-back wrappers for the forum walks (W2
 * journey 12, docs/qa/server-rebuild/plan.md § W2): a user starts a
 * discussion, another user comments on it, the author answers in the thread,
 * and a comment mentions a user. Every write is made in the browser and read
 * back over `@alkemio/tests-lib` — the discussion row, each message with its
 * sender and thread, and the recipient's in-app notification.
 */

export {
  baseUrl,
  expectMutationAnswered,
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
export {
  deleteDisposableUser,
  registerDisposableUser,
  runCleanup,
  runId,
  type DisposableUser,
} from '../contributors-crud/contributors-crud.helpers';

// --------------------------------------------------------------- server reads

/** One discussion with its comment room, as the platform admin reads it. */
export const serverDiscussion = async (discussionId: string) => {
  const discussion = must(
    await readPlatformDiscussion(discussionId),
    `readPlatformDiscussion(${discussionId})`
  ).platform.forum.discussion;
  if (!discussion) throw new Error(`discussion ${discussionId} not found`);
  return discussion;
};

/** The id of the discussion whose nameID is the last segment of a `/forum/discussion/<nameID>` URL. */
export const discussionIdFromUrl = async (url: string): Promise<string> => {
  const nameId = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
  const all =
    must(await readPlatformForumDiscussions(), 'readPlatformForumDiscussions')
      .platform.forum.discussions ?? [];
  const found = all.filter(d => d.nameID === nameId);
  expect(found, `exactly one discussion with nameID ${nameId}`).toHaveLength(1);
  return found[0].id;
};

/**
 * Deletes every discussion whose nameID starts with `nameIdPrefix` (the
 * slug of the walk's run-unique title), as the platform admin. Since
 * workspace#027 an author cannot delete their own discussion, so teardown
 * never runs as the author. A discussion the walk never got to create is not
 * an error; a failed delete is.
 */
export const deleteDiscussionsByPrefix = async (
  nameIdPrefix: string
): Promise<void> => {
  const all =
    must(await readPlatformForumDiscussions(), 'readPlatformForumDiscussions')
      .platform.forum.discussions ?? [];
  for (const d of all.filter(x => x.nameID.startsWith(nameIdPrefix))) {
    must(
      await deletePlatformDiscussion(d.id, TestUser.GLOBAL_ADMIN),
      `deleteDiscussion(${d.nameID})`
    );
    console.info(`[teardown] discussion '${d.nameID}' removed`);
  }
};

/** A disposable user's own profile URL as the server renders it (the target a mention links to). */
export const profileUrlOf = async (email: string): Promise<string> => {
  const me = must(
    await readMyUser({ bearerToken: await getUserToken(email) }),
    `readMyUser(${email})`
  ).me.user;
  const url = me?.profile?.url;
  if (!url) throw new Error(`${email} has no profile url`);
  return url;
};

/** The actor's in-app notifications of one event type. */
export const notificationsOf = async (
  actor: GraphqlActor,
  type: NotificationEvent
) =>
  must(
    await readMyNotifications(actor, { types: [type] }),
    `readMyNotifications(${type})`
  ).me.notifications.inAppNotifications;

// ------------------------------------------------------------------ locators

export const forumUrl = (path = ''): string =>
  `${process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'}/forum${path}`;

export const createDiscussionDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Create Discussion', exact: true });

/** The discussion page's title (the CRD detail renders it as an h2). */
export const discussionHeading = (page: Page, title: string): Locator =>
  page
    .getByRole('main')
    .getByRole('heading', { level: 2, name: title, exact: true });

/** The top-level comment box under a discussion (a combobox once mentions are wired). */
export const commentBox = (scope: Page | Locator): Locator =>
  scope
    .getByRole('textbox', { name: 'Add a comment...', exact: true })
    .or(scope.getByRole('combobox', { name: 'Add a comment...', exact: true }));

/**
 * One comment of the thread, found by its author's name (the comment card's
 * accessible name) and its text. Scoped to `main` so a toast cannot match.
 */
export const commentByAuthor = (
  page: Page,
  authorName: string,
  text: string
): Locator =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByLabel(authorName, { exact: true }) })
    .filter({ hasText: text });

/** Types `text` into a comment box and sends it with Enter; resolves once the `sendMessage…` mutation answered without errors. */
export const sendComment = async (
  page: Page,
  box: Locator,
  text: string,
  mutationField: 'sendMessageToRoom' | 'sendMessageReplyToRoom',
  expectAnswered: (page: Page, field: string) => () => Promise<void>
): Promise<void> => {
  await box.click();
  await box.pressSequentially(text);
  await expect(box).toHaveValue(text);
  const answered = expectAnswered(page, mutationField);
  await box.press('Enter');
  await answered();
  // The top-level box clears once the message is confirmed; a thread's reply box closes instead.
  if (mutationField === 'sendMessageToRoom') await expect(box).toHaveValue('');
  else await expect(box).toBeHidden();
};
