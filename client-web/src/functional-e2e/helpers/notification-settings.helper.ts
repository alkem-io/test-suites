import {
  readUserSettings,
  TestUser,
  TestUserManager,
  updateUserSettings,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';

/**
 * Notification-channel setup for UI walks that assert an in-app notification
 * in the bell dialog.
 *
 * The fixed harness personas are shared with the server-api suite, whose
 * notification specs switch email + in-app OFF for these users in their
 * `beforeAll` and never switch them back. The nightly runs server-api before
 * Playwright on the same database, so a UI spec that relies on the server
 * defaults (all channels on) finds "No notifications" instead. A UI spec must
 * therefore set the channels it depends on itself, and put them back the way
 * it found them so it does not fight other suites.
 *
 * Reads and writes another user's settings through the lib as the global
 * admin persona (`readUserSettings` / `updateUserSettings`).
 */

export type NotificationChannels = {
  email: boolean;
  inApp: boolean;
  push: boolean;
};

type ApplicationNotificationChannels = {
  communityApplicationReceived: NotificationChannels;
  spaceCommunityJoined: NotificationChannels;
};

const ALL_CHANNELS_ON: NotificationChannels = {
  email: true,
  inApp: true,
  push: true,
};

/** The three channel flags of one setting, without the read-back's `__typename`. */
const channels = (setting: NotificationChannels): NotificationChannels => ({
  email: setting.email,
  inApp: setting.inApp,
  push: setting.push,
});

/** The user's notification matrix, read as the global admin. */
const readNotificationSettings = async (userId: string) =>
  must(
    await readUserSettings(userId, TestUser.GLOBAL_ADMIN),
    `read notification settings of ${userId}`
  ).user.settings.notification;

const readApplicationChannels = async (
  userId: string
): Promise<ApplicationNotificationChannels> => {
  const notification = await readNotificationSettings(userId);
  return {
    communityApplicationReceived: channels(
      notification.space.admin.communityApplicationReceived
    ),
    spaceCommunityJoined: channels(
      notification.user.membership.spaceCommunityJoined
    ),
  };
};

const writeApplicationChannels = async (
  userId: string,
  channels: ApplicationNotificationChannels
): Promise<void> => {
  must(
    await updateUserSettings(
      userId,
      {
        notification: {
          space: {
            admin: {
              communityApplicationReceived:
                channels.communityApplicationReceived,
            },
          },
          user: { membership: { spaceCommunityJoined: channels.spaceCommunityJoined } },
        },
      },
      TestUser.GLOBAL_ADMIN
    ),
    `write application notification channels of ${userId}`
  );
};

/**
 * Turn on every channel of the two settings the application walks assert on
 * — `space.admin.communityApplicationReceived` (admin sees "applied to join")
 * and `user.membership.spaceCommunityJoined` (applicant sees "Welcome to the
 * community" / "declined") — for the given personas.
 *
 * Reads every persona's current values first, then writes; if any write
 * fails, the values already written are rolled back before the error is
 * rethrown, so a failed `beforeAll` cannot leave the shared personas
 * half-modified.
 *
 * Returns a restore function that writes the previous values back; call it
 * from `afterAll`.
 */
export const enableApplicationNotifications = async (
  roles: TestUser[]
): Promise<() => Promise<void>> => {
  await TestUserManager.populateUserModelMap();

  const previous = await Promise.all(
    roles.map(async role => {
      const userId = TestUserManager.getUserModelByType(role).id;
      return { userId, channels: await readApplicationChannels(userId) };
    })
  );

  const restore = async () => {
    await Promise.all(
      previous.map(({ userId, channels }) =>
        writeApplicationChannels(userId, channels)
      )
    );
  };

  const writes = await Promise.allSettled(
    previous.map(({ userId }) =>
      writeApplicationChannels(userId, {
        communityApplicationReceived: ALL_CHANNELS_ON,
        spaceCommunityJoined: ALL_CHANNELS_ON,
      })
    )
  );
  const failed = writes.find(
    (w): w is PromiseRejectedResult => w.status === 'rejected'
  );
  if (failed) {
    await restore();
    throw failed.reason;
  }

  return restore;
};

// ─── Callout reactions ───────────────────────────────────────────────────────

/**
 * Turn on every channel of `space.collaborationCalloutReaction`
 * ("someone reacted to a callout you published") for one user — the setting
 * the callout-reaction walks assert on in the bell dialog. Same contract as
 * `enableApplicationNotifications`: reads first, returns a restore function
 * for `afterAll`.
 */
export const enableCalloutReactionNotifications = async (
  userId: string
): Promise<() => Promise<void>> => {
  await TestUserManager.populateUserModelMap();
  const previous = channels(
    (await readNotificationSettings(userId)).space.collaborationCalloutReaction
  );
  const write = async (reaction: NotificationChannels) => {
    must(
      await updateUserSettings(
        userId,
        { notification: { space: { collaborationCalloutReaction: reaction } } },
        TestUser.GLOBAL_ADMIN
      ),
      `write callout-reaction notification channels of ${userId}`
    );
  };
  const restore = () => write(previous);
  try {
    await write(ALL_CHANNELS_ON);
  } catch (error) {
    // The server may have committed the write although the response failed:
    // put the previous channels back before surfacing the error.
    await restore().catch(() => undefined);
    throw error;
  }
  return restore;
};
