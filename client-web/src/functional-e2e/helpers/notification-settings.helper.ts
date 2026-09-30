import { GraphQLClient } from 'graphql-request';
import {
  testConfiguration,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';

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
 * Talks to the private GraphQL endpoint directly (the generated SDK has no
 * read operation for another user's settings) using the global admin's bearer
 * token from `TestUserManager` — the same mechanism `graphqlErrorWrapper`
 * uses internally.
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

const client = new GraphQLClient(testConfiguration.endPoints.graphql.private);

const READ_APPLICATION_CHANNELS = `
  query($id: UUID!) {
    lookup {
      user(ID: $id) {
        settings {
          notification {
            space { admin { communityApplicationReceived { email inApp push } } }
            user { membership { spaceCommunityJoined { email inApp push } } }
          }
        }
      }
    }
  }`;

const WRITE_APPLICATION_CHANNELS = `
  mutation(
    $id: UUID!
    $received: NotificationSettingInput!
    $joined: NotificationSettingInput!
  ) {
    updateUserSettings(
      settingsData: {
        userID: $id
        settings: {
          notification: {
            space: { admin: { communityApplicationReceived: $received } }
            user: { membership: { spaceCommunityJoined: $joined } }
          }
        }
      }
    ) { id }
  }`;

const adminHeaders = () => ({
  authorization: `Bearer ${TestUserManager.getUserModelByType(TestUser.GLOBAL_ADMIN).authToken}`,
});

const readApplicationChannels = async (
  userId: string
): Promise<ApplicationNotificationChannels> => {
  const data = await client.request<{
    lookup: {
      user: {
        settings: {
          notification: {
            space: {
              admin: { communityApplicationReceived: NotificationChannels };
            };
            user: {
              membership: { spaceCommunityJoined: NotificationChannels };
            };
          };
        };
      };
    };
  }>(READ_APPLICATION_CHANNELS, { id: userId }, adminHeaders());
  const notification = data.lookup.user.settings.notification;
  return {
    communityApplicationReceived:
      notification.space.admin.communityApplicationReceived,
    spaceCommunityJoined: notification.user.membership.spaceCommunityJoined,
  };
};

const writeApplicationChannels = async (
  userId: string,
  channels: ApplicationNotificationChannels
): Promise<void> => {
  await client.request(
    WRITE_APPLICATION_CHANNELS,
    {
      id: userId,
      received: channels.communityApplicationReceived,
      joined: channels.spaceCommunityJoined,
    },
    adminHeaders()
  );
};

/**
 * Turn on every channel of the two settings the application walks assert on
 * — `space.admin.communityApplicationReceived` (admin sees "applied to join")
 * and `user.membership.spaceCommunityJoined` (applicant sees "Welcome to the
 * community" / "declined") — for the given personas.
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
      const channels = await readApplicationChannels(userId);
      await writeApplicationChannels(userId, {
        communityApplicationReceived: ALL_CHANNELS_ON,
        spaceCommunityJoined: ALL_CHANNELS_ON,
      });
      return { userId, channels };
    })
  );

  return async () => {
    await Promise.all(
      previous.map(({ userId, channels }) =>
        writeApplicationChannels(userId, channels)
      )
    );
  };
};
