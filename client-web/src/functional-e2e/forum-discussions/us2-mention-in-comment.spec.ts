// spec: client-web/src/functional-e2e/forum-discussions/forum-discussions-test-plan.md
// W2 journey 12 (docs/qa/server-rebuild/plan.md § W2), audit row E5
// (mentions): a user picks another user from the comment box's "@" list and
// sends the comment. The stored message must carry a mention that resolves to
// exactly that user's profile, the rendered comment must link to it, and the
// mentioned user must get one in-app "you were mentioned" notification for
// this room.
//
// The mention pipeline is room-agnostic (server `RoomMentionsService` parses
// every room message the same way), so the platform forum stands in for any
// commentable surface: its "@" list is platform-wide, so no Space membership
// is needed. Which users a Space's "@" list offers is covered by
// contributors-crud VC 3.5 (positive control: a member is offered).
//
// The discussion is seeded through the lib (its creation is US1's subject);
// both users are disposable. The comment rides the discussion's Matrix room
// and the notification the inbound Matrix event, so the whole file is
// `@local-stack` (plan R-1).

import { test, expect } from '@playwright/test';
import {
  createPlatformDiscussion,
  getPlatformForumId,
  getUserToken,
  NotificationEvent,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import {
  commentBox,
  commentByAuthor,
  deleteDisposableUser,
  deleteDiscussionsByPrefix,
  discussionHeading,
  expectMutationAnswered,
  notificationsOf,
  openPersonaPage,
  profileUrlOf,
  registerDisposableUser,
  runCleanup,
  runId,
  serverDiscussion,
  type DisposableUser,
  type PersonaPage,
} from './forum-discussions.helpers';

const RUN = runId();
const TITLE = `W2 mention ${RUN}`;
const NAME_ID_PREFIX = `w2mention${RUN}`;
const AFTER = `please have a look ${RUN}`;

let mentioner: DisposableUser | undefined;
let mentioned: DisposableUser | undefined;
let mentionerPage: PersonaPage | undefined;
let discussionId = '';
let discussionUrl = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  await TestUserManager.populateUserModelMap();
  mentioner = await registerDisposableUser(`mentioner ${RUN}`);
  mentioned = await registerDisposableUser(`mentioned ${RUN}`);
  const created = must(
    await createPlatformDiscussion(
      await getPlatformForumId(),
      { title: TITLE, description: `Seeded for the W2 mention walk ${RUN}.` },
      TestUser.GLOBAL_ADMIN
    ),
    'createPlatformDiscussion'
  ).createDiscussion;
  discussionId = created.id;
  discussionUrl = created.profile.url;
  mentionerPage = await openPersonaPage(browser, mentioner.email);
});

test.afterAll(async () => {
  await runCleanup([
    ['close mentioner', () => mentionerPage?.close() ?? Promise.resolve()],
    ['delete discussion', () => deleteDiscussionsByPrefix(NAME_ID_PREFIX)],
    ['delete mentioner', () => deleteDisposableUser(mentioner)],
    ['delete mentioned', () => deleteDisposableUser(mentioned)],
  ]);
});

test.describe('mentions', { tag: '@local-stack' }, () => {
  test('E5-1 a user mentions another user in a comment; the stored mention resolves to that user, the comment links to their profile, and they are notified once', async () => {
    const page = mentionerPage!.page;
    const mentionedUrl = await profileUrlOf(mentioned!.email);
    const mentionedActor = {
      bearerToken: await getUserToken(mentioned!.email),
    };
    const before = await notificationsOf(
      mentionedActor,
      NotificationEvent.UserMentioned
    );
    expect(before, 'a fresh user has no mention notification').toHaveLength(0);

    await page.goto(discussionUrl);
    await expect(discussionHeading(page, TITLE)).toBeVisible();
    const box = commentBox(page.getByRole('main'));
    await box.click();
    // The display name is "Crud mentioned<RUN>"; the run id makes the search unique.
    await box.pressSequentially(`@mentioned${RUN}`);
    const option = page
      .getByRole('listbox')
      .getByRole('option', { name: new RegExp(`^${mentioned!.displayName}`) });
    await expect(option).toHaveCount(1);
    await option.click();
    await expect(box).toHaveValue(`@${mentioned!.displayName} `);
    await box.pressSequentially(AFTER);
    const answered = expectMutationAnswered(page, 'sendMessageToRoom');
    await box.press('Enter');
    await answered();
    await expect(box).toHaveValue('');

    // Stored: the mention markup points at exactly the mentioned user's profile.
    const stored = await serverDiscussion(discussionId);
    expect(stored.comments.messages).toHaveLength(1);
    expect(stored.comments.messages[0].message).toBe(
      `[@${mentioned!.displayName}](${mentionedUrl}) ${AFTER}`
    );
    expect(stored.comments.messages[0].sender?.id).toBe(mentioner!.id);

    // Rendered, after a reload: the mention is a link to that profile.
    await page.reload();
    const comment = commentByAuthor(page, mentioner!.displayName, AFTER);
    await expect(comment).toBeVisible();
    await expect(
      comment.getByRole('link', { name: new RegExp(mentioned!.displayName) })
    ).toHaveAttribute('href', new RegExp(`${new URL(mentionedUrl).pathname}$`));

    // Notified: one USER_MENTIONED for this room, addressed to the mentioned user, raised by the mentioner.
    await expect
      .poll(
        async () =>
          (
            await notificationsOf(
              mentionedActor,
              NotificationEvent.UserMentioned
            )
          ).length,
        {
          message: 'the mentioned user gets a mention notification',
          timeout: 30_000,
        }
      )
      .toBe(1);
    const [notification] = await notificationsOf(
      mentionedActor,
      NotificationEvent.UserMentioned
    );
    expect(notification.triggeredBy?.id).toBe(mentioner!.id);
    expect(notification.payload.__typename).toBe(
      'InAppNotificationPayloadPlatformUserMessageRoom'
    );
    if (
      notification.payload.__typename !==
      'InAppNotificationPayloadPlatformUserMessageRoom'
    )
      return;
    expect(notification.payload.user.id).toBe(mentioned!.id);
    expect(notification.payload.messageDetails?.room.id).toBe(
      stored.comments.id
    );
    expect(notification.payload.messageDetails?.message).toBe(
      stored.comments.messages[0].message
    );
  });
});
