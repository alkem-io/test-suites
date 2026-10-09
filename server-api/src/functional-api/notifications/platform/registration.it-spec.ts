import {
  deleteMailSlurperMails,
  PLATFORM_ROLE_NAMES,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { SeededPlatformRoleUsers } from '@alkemio/tests-lib';
import {
  restorePlatformAdminRows,
  setPlatformAdminEmail,
  snapshotPlatformAdminRows,
} from '@functional-api/platform-roles/_support/platform-admin-settings';
import type { PlatformAdminSnapshot } from '@functional-api/platform-roles/_support/platform-admin-settings';
import { releasePoolUsers } from '@functional-api/platform-roles/_support/users';
import { getMailsDataSettled } from '../notification.helpers';
import {
  cleanUp,
  createUserAs,
  deleteUserAs,
  expectedEmail,
  mailTo,
  platformRoleHolders,
  poolHolderWithRole,
  roleHolder,
} from './platform-admin-mail.helpers';
import type { Holder } from './platform-admin-mail.helpers';

/**
 * PLATFORM_ADMIN_USER_PROFILE_CREATED and PLATFORM_ADMIN_USER_PROFILE_REMOVED
 * are routed to Platform Users Admin only; the removal leaves out the operator
 * who removed the user.
 *
 * Every other single-role holder keeps the matching row switched ON, so "not
 * routed to them" is observed rather than implied by their settings — those 13
 * carry the negative proof. The legacy personas (`admin@`, `global.support@`,
 * `global.license@`) are outside the audience: which platform roles they hold
 * depends on how the environment was bootstrapped, so they may legitimately
 * receive these mails.
 *
 * The users these specs create are created by Platform Content Full Access —
 * the only role holding the platform CREATE that `createUser` checks — and
 * removed by a Platform Users Admin.
 */

const uniqueId = UniqueIDGenerator.getID();

let users: SeededPlatformRoleUsers;
let usersAdmin: Holder;
let creator: Holder;
/** Holders the two events are NOT routed to — every one keeps its row on. */
let notRouted: Holder[];
let snapshot: PlatformAdminSnapshot | undefined;

/** `tag`: a few lowercase letters — the nameID must stay within 25 characters. */
const newUser = (tag: string) => ({
  email: `${tag}${uniqueId}@test.com`,
  nameID: `nr-${tag}-${uniqueId}`,
  displayName: `testuser${tag}${uniqueId}`,
});

beforeAll(async () => {
  users = await platformRoleHolders();
  usersAdmin = roleHolder(users, 'PLATFORM_USERS_ADMIN');
  creator = roleHolder(users, 'PLATFORM_CONTENT_FULL_ACCESS');
  notRouted = PLATFORM_ROLE_NAMES.filter(
    role => role !== 'PLATFORM_USERS_ADMIN'
  ).map(role => roleHolder(users, role));
  snapshot = await snapshotPlatformAdminRows([usersAdmin, ...notRouted]);
});

afterAll(async () => {
  if (snapshot) await restorePlatformAdminRows(snapshot);
});

describe('Notifications - User registration', () => {
  let createdUserId = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    if (createdUserId) {
      await deleteUserAs(usersAdmin.token, createdUserId);
      createdUserId = '';
    }
  });

  test('User sign up - Platform Users Admin(1) gets notifications; no other role holder', async () => {
    // Arrange
    await setPlatformAdminEmail(
      [usersAdmin, ...notRouted],
      ['userProfileCreated'],
      true
    );
    const user = newUser('signup');
    const subject = `New user registration on Alkemio: ${user.displayName}`;

    // Act
    createdUserId = await createUserAs(creator.token, user);
    const [mails, count] = await getMailsDataSettled(1, {
      scope: mailTo(subject, [usersAdmin, ...notRouted]),
    });

    // Assert
    expect(count).toEqual(1);
    expect(mails).toEqual([expectedEmail(subject, usersAdmin.email)]);
  });

  test('User sign up - Platform Users Admin(0) with the row switched off, nobody else either', async () => {
    // Arrange
    await setPlatformAdminEmail(
      [usersAdmin, ...notRouted],
      ['userProfileCreated'],
      false
    );
    const user = newUser('muted');
    const subject = `New user registration on Alkemio: ${user.displayName}`;

    // Act
    createdUserId = await createUserAs(creator.token, user);
    const [, count] = await getMailsDataSettled(0, {
      scope: mailTo(subject, [usersAdmin, ...notRouted]),
    });

    // Assert
    expect(count).toEqual(0);
  });
});

describe('Notifications - User removal', () => {
  // A second Platform Users Admin, so that whichever of the two removes the
  // user, the other one is a third party who must still receive the mail —
  // without it, "the actor is left out" and "the mail is never sent" both
  // read as zero mails.
  let otherUsersAdmin: Holder;
  let otherSnapshot: PlatformAdminSnapshot | undefined;
  /** The user the current test created, until its removal succeeded. */
  let createdUserId = '';

  beforeAll(async () => {
    otherUsersAdmin = await poolHolderWithRole(
      users,
      'notifremoval',
      'PLATFORM_USERS_ADMIN'
    );
    otherSnapshot = await snapshotPlatformAdminRows([otherUsersAdmin]);
    await setPlatformAdminEmail(
      [usersAdmin, otherUsersAdmin, ...notRouted],
      ['userProfileRemoved'],
      true
    );
  });

  // A removal that failed leaves its user behind — removed here instead, by
  // the fixture Users Admin.
  afterEach(async () => {
    if (createdUserId) {
      const id = createdUserId;
      createdUserId = '';
      await deleteUserAs(usersAdmin.token, id);
    }
  });

  afterAll(async () => {
    await cleanUp([
      [
        'restore the other Users Admin settings',
        async () => {
          if (otherSnapshot) await restorePlatformAdminRows(otherSnapshot);
        },
      ],
      [
        'release the other Users Admin',
        async () => {
          if (otherUsersAdmin) {
            await releasePoolUsers(users.tokens.PLATFORM_ROLES_ADMIN, [
              otherUsersAdmin.id,
            ]);
          }
        },
      ],
    ]);
  });

  const removeAndGetEmails = async (
    remover: Holder,
    tag: string
  ): Promise<{ subject: string; mails: unknown[]; count: number }> => {
    const user = newUser(tag);
    const subject = `User profile deleted from the Alkemio platform: ${user.displayName}`;
    createdUserId = await createUserAs(creator.token, user);
    await deleteMailSlurperMails();

    await deleteUserAs(remover.token, createdUserId);
    createdUserId = '';

    const [mails, count] = await getMailsDataSettled(1, {
      scope: mailTo(subject, [usersAdmin, otherUsersAdmin, ...notRouted]),
    });
    return { subject, mails, count };
  };

  test('User removed by Platform Users Admin - the acting operator(0) is left out, the other Users Admin(1) gets notifications', async () => {
    const { subject, mails, count } = await removeAndGetEmails(
      usersAdmin,
      'rmfix'
    );

    expect(count).toEqual(1);
    expect(mails).toEqual([expectedEmail(subject, otherUsersAdmin.email)]);
  });

  test('User removed by the other Users Admin - Platform Users Admin(1) gets notifications, the acting operator(0) does not', async () => {
    const { subject, mails, count } = await removeAndGetEmails(
      otherUsersAdmin,
      'rmpool'
    );

    expect(count).toEqual(1);
    expect(mails).toEqual([expectedEmail(subject, usersAdmin.email)]);
  });
});
