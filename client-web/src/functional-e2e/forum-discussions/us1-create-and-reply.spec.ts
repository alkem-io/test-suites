// spec: client-web/src/functional-e2e/forum-discussions/forum-discussions-test-plan.md
// W2 journey 12 (docs/qa/server-rebuild/plan.md § W2), audit rows J2 / J3:
// a registered user starts a forum discussion in the browser (J2-1), another
// user comments on it (J3-1) and the author answers in that comment's thread
// (J3-2). Each write is read back over the lib: the discussion's title,
// description, category and author; each message's text, sender and thread;
// and, for the thread answer, the in-app notification of the comment's author.
//
// Both users are disposable (registered and deleted by this file). The file is
// SERIAL: J3-1 comments on J2-1's discussion and J3-2 answers J3-1's comment.
// The comment cases send through the discussion's Matrix room and are
// `@local-stack` (plan R-1); the nightly runs J2-1 alone. The discussion is
// deleted by the platform admin in afterAll (an author may not delete their
// own discussion since workspace#027), before the users.

import { test, expect } from '@playwright/test';
import {
  ForumDiscussionCategory,
  getUserToken,
  NotificationEvent,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  commentBox,
  commentByAuthor,
  createDiscussionDialog,
  deleteDisposableUser,
  deleteDiscussionsByPrefix,
  discussionHeading,
  discussionIdFromUrl,
  expectMutationAnswered,
  forumUrl,
  notificationsOf,
  openPersonaPage,
  registerDisposableUser,
  runCleanup,
  runId,
  sendComment,
  serverDiscussion,
  type DisposableUser,
  type PersonaPage,
} from './forum-discussions.helpers';

const RUN = runId();
const TITLE = `W2 forum ${RUN}`;
/** The nameID the server derives from TITLE (lowercase, separators dropped), used for teardown. */
const NAME_ID_PREFIX = `w2forum${RUN}`;
const BODY = `Opening post of the W2 forum walk ${RUN}.`;
const COMMENT = `A comment from the second user ${RUN}`;
const ANSWER = `The author answers in the thread ${RUN}`;

let author: DisposableUser | undefined;
let replier: DisposableUser | undefined;
let authorPage: PersonaPage | undefined;
let replierPage: PersonaPage | undefined;
let discussionUrl = '';
let discussionId = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  await TestUserManager.populateUserModelMap();
  author = await registerDisposableUser(`forumauthor ${RUN}`);
  replier = await registerDisposableUser(`forumreplier ${RUN}`);
  authorPage = await openPersonaPage(browser, author.email);
  replierPage = await openPersonaPage(browser, replier.email);
});

// File level: runs even when a failure retires the worker mid-file.
test.afterAll(async () => {
  await runCleanup([
    ['close author', () => authorPage?.close() ?? Promise.resolve()],
    ['close replier', () => replierPage?.close() ?? Promise.resolve()],
    ['delete discussion', () => deleteDiscussionsByPrefix(NAME_ID_PREFIX)],
    ['delete author', () => deleteDisposableUser(author)],
    ['delete replier', () => deleteDisposableUser(replier)],
  ]);
});

test('J2-1 a registered user starts a discussion; the server stores its title, body, category and author, and another user finds it in the category', async () => {
  const page = authorPage!.page;
  await page.goto(forumUrl());
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Initiate Discussion', exact: true })
    .click();
  const dialog = createDiscussionDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill(TITLE);
  await dialog
    .getByRole('combobox', { name: 'Category *', exact: true })
    .click();
  // A non-admin is not offered the admin-only categories (client-web
  // forumDataMapper ADMIN_ONLY_CATEGORIES: Releases, Newsletter). Positive
  // control first: the open list offers Q&A, so the absences below are read
  // from a rendered list, not from one that has not mounted yet.
  const qa = page.getByRole('option', { name: 'Q&A', exact: true });
  await expect(qa).toBeVisible();
  for (const adminOnly of ['Releases', 'Newsletter'])
    await expect(
      page.getByRole('option', { name: adminOnly, exact: true }),
      `the admin-only category "${adminOnly}" is not offered to a non-admin`
    ).toHaveCount(0);
  await qa.click();
  const editor = dialog.locator('[contenteditable="true"]');
  await editor.click();
  await page.keyboard.type(BODY);
  // The submit is enabled only once the editor has handed its markdown to the form.
  const submit = dialog.getByRole('button', {
    name: 'Create Discussion',
    exact: true,
  });
  await expect(submit).toBeEnabled();
  const answered = expectMutationAnswered(page, 'createDiscussion');
  await submit.click();
  await answered();

  await expect(page).toHaveURL(/\/forum\/discussion\/[^/]+$/);
  await expect(discussionHeading(page, TITLE)).toBeVisible();
  discussionUrl = page.url();
  discussionId = await discussionIdFromUrl(discussionUrl);

  const stored = await serverDiscussion(discussionId);
  expect(stored.profile.displayName).toBe(TITLE);
  expect((stored.profile.description ?? '').trim()).toBe(BODY);
  expect(stored.category).toBe(ForumDiscussionCategory.Help);
  expect(stored.createdBy, 'the author is the user who created it').toBe(
    author!.id
  );
  expect(stored.comments.messagesCount).toBe(0);

  // Another user finds it listed under the category it was filed in.
  const other = replierPage!.page;
  await other.goto(forumUrl('/help'));
  await expect(
    other.getByRole('main').getByRole('link', { name: new RegExp(`^${TITLE}`) })
  ).toBeVisible();
  await other.goto(discussionUrl);
  await expect(discussionHeading(other, TITLE)).toBeVisible();
  await expect(
    other.getByRole('main').getByText(BODY, { exact: true })
  ).toBeVisible();
});

test(
  'J3-1 another user comments on the discussion; the comment is stored with its sender and text and survives a reload',
  { tag: '@local-stack' },
  async () => {
    expect(discussionId, 'J2-1 must have created the discussion').not.toBe('');
    const page = replierPage!.page;
    await page.goto(discussionUrl);
    await expect(discussionHeading(page, TITLE)).toBeVisible();
    await sendComment(
      page,
      commentBox(page.getByRole('main')),
      COMMENT,
      'sendMessageToRoom',
      expectMutationAnswered
    );

    await page.reload();
    await expect(
      commentByAuthor(page, replier!.displayName, COMMENT)
    ).toBeVisible();

    const stored = await serverDiscussion(discussionId);
    expect(stored.comments.messages).toHaveLength(1);
    const [comment] = stored.comments.messages;
    expect(comment.message).toBe(COMMENT);
    expect(comment.sender?.id, 'the sender is the commenting user').toBe(
      replier!.id
    );
    expect(comment.sender?.profile?.displayName).toBe(replier!.displayName);
  }
);

test(
  "J3-2 the author answers in the comment's thread; the answer is stored in that thread and the commenter is notified",
  { tag: '@local-stack' },
  async () => {
    const page = authorPage!.page;
    await page.goto(discussionUrl);
    const comment = commentByAuthor(page, replier!.displayName, COMMENT);
    await expect(comment).toBeVisible();
    await comment.getByRole('button', { name: 'Reply', exact: true }).click();
    // The reply box opens under the comment, after the top-level box in DOM order.
    const replyBox = commentBox(comment);
    await expect(replyBox).toBeVisible();
    await sendComment(
      page,
      replyBox,
      ANSWER,
      'sendMessageReplyToRoom',
      expectMutationAnswered
    );

    // After a reload the answer is rendered nested in the comment's own reply list.
    await page.reload();
    const answerInThread = commentByAuthor(page, replier!.displayName, COMMENT)
      .getByRole('listitem')
      .filter({ has: page.getByLabel(author!.displayName, { exact: true }) })
      .filter({ hasText: ANSWER });
    await expect(answerInThread).toBeVisible();

    const stored = await serverDiscussion(discussionId);
    expect(stored.comments.messages).toHaveLength(2);
    const parent = stored.comments.messages.find(m => m.message === COMMENT);
    const answer = stored.comments.messages.find(m => m.message === ANSWER);
    expect(parent, 'the comment is still there').toBeDefined();
    expect(answer, 'the answer is stored').toBeDefined();
    expect(answer!.threadID, "the answer sits in the comment's thread").toBe(
      parent!.id
    );
    expect(answer!.sender?.id, "the answer is the author's").toBe(author!.id);

    // The commenter is told about the answer (commentReply in-app is on by default).
    const replierActor = { bearerToken: await getUserToken(replier!.email) };
    await expect
      .poll(
        async () =>
          (
            await notificationsOf(
              replierActor,
              NotificationEvent.UserCommentReply
            )
          ).filter(
            n =>
              n.payload.__typename ===
                'InAppNotificationPayloadPlatformUserMessageRoom' &&
              n.payload.messageDetails?.room.id === stored.comments.id
          ).length,
        {
          message: 'one comment-reply notification for this discussion',
          timeout: 30_000,
        }
      )
      .toBe(1);
  }
);
