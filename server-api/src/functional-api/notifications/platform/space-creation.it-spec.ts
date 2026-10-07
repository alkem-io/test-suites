import {
  deleteMailSlurperMails,
  PLATFORM_ROLE_NAMES,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type {
  PlatformRoleName,
  SeededPlatformRoleUsers,
} from '@alkemio/tests-lib';
import {
  restorePlatformAdminRows,
  setPlatformAdminEmail,
  snapshotPlatformAdminRows,
} from '@functional-api/platform-roles/_support/platform-admin-settings';
import type { PlatformAdminSnapshot } from '@functional-api/platform-roles/_support/platform-admin-settings';
import { rawRead } from '@functional-api/platform-roles/_support/raw-request';
import {
  acquirePoolUser,
  releasePoolUsers,
} from '@functional-api/platform-roles/_support/users';
import type { RegisteredUser } from '@functional-api/platform-roles/_support/users';
import { getMailsDataSettled } from '../notification.helpers';
import {
  expectedEmail,
  mailTo,
  platformRoleHolders,
  roleHolder,
  testUserHolder,
} from './platform-admin-mail.helpers';
import type { Holder } from './platform-admin-mail.helpers';

/**
 * PLATFORM_ADMIN_SPACE_CREATED is routed to Platform Support and Platform
 * License Manager. The legacy Global Admin / Support / License Manager audience
 * no longer receives it.
 *
 * Every other single-role holder, and all three legacy-trio users, keep the
 * `spaceCreated` row switched ON, so "not routed to them" is observed rather
 * than implied by their settings.
 *
 * The spaces are hosted on a pool user's own account: a fresh account is
 * entitled to no space, so Platform License Manager raises its baseline — the
 * same arrangement as the platform-roles suite's space host. A role user never
 * hosts one: hosting would hand that role space-admin rights.
 */

const uniqueId = UniqueIDGenerator.getID();

const ROUTED: readonly PlatformRoleName[] = [
  'PLATFORM_SUPPORT',
  'PLATFORM_LICENSE_MANAGER',
];

const RAISE_BASELINE =
  'mutation($updateData: UpdateBaselineLicensePlanOnAccount!) { updateBaselineLicensePlanOnAccount(updateData: $updateData) { id } }';
const HOSTED_SPACES = 'query { me { user { account { spaces { id } } } } }';
const CREATE_SPACE =
  'mutation($spaceData: CreateSpaceOnAccountInput!) { createSpace(spaceData: $spaceData) { id } }';
const DELETE_SPACE =
  'mutation($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }';

let users: SeededPlatformRoleUsers;
let support: Holder;
let licenseManager: Holder;
/** Holders the event is NOT routed to — every one keeps its row on. */
let notRouted: Holder[];
let host: RegisteredUser;
let snapshot: PlatformAdminSnapshot | undefined;

const deleteHostedSpaces = async (): Promise<void> => {
  const { me } = await rawRead<{
    me: { user: { account: { spaces: { id: string }[] } } };
  }>(host.token, HOSTED_SPACES);
  for (const { id } of me.user.account.spaces) {
    await rawRead(host.token, DELETE_SPACE, { id });
  }
};

/** `tag`: a few lowercase letters — the nameID must stay within 25 characters. */
const createSpace = async (tag: string): Promise<string> => {
  const displayName = `testspace${tag}${uniqueId}`;
  await rawRead(host.token, CREATE_SPACE, {
    spaceData: {
      accountID: host.accountId,
      nameID: `ns-${tag}-${uniqueId}`,
      about: { profileData: { displayName } },
      collaborationData: { addTutorialCallouts: false, calloutsSetData: {} },
    },
  });
  return `New space created - ${displayName}`;
};

beforeAll(async () => {
  // Only the test-user map: the base scenario would also try to grant the
  // legacy global roles, which no longer exist.
  await TestUserManager.populateUserModelMap();
  users = await platformRoleHolders();
  support = roleHolder(users, 'PLATFORM_SUPPORT');
  licenseManager = roleHolder(users, 'PLATFORM_LICENSE_MANAGER');
  notRouted = [
    ...PLATFORM_ROLE_NAMES.filter(role => !ROUTED.includes(role)).map(role =>
      roleHolder(users, role)
    ),
    testUserHolder(TestUserManager.users.globalAdmin),
    testUserHolder(TestUserManager.users.globalSupportAdmin),
    testUserHolder(TestUserManager.users.globalLicenseAdmin),
  ];
  snapshot = await snapshotPlatformAdminRows([
    support,
    licenseManager,
    ...notRouted,
  ]);

  host = await acquirePoolUser(
    users.tokens.PLATFORM_ROLES_ADMIN,
    'notifspacehost'
  );
  await rawRead(users.tokens.PLATFORM_LICENSE_MANAGER, RAISE_BASELINE, {
    updateData: { accountID: host.accountId, spaceFree: 3 },
  });
  // A previous run that died mid-test leaves its space on this account.
  await deleteHostedSpaces();
});

afterAll(async () => {
  try {
    if (snapshot) await restorePlatformAdminRows(snapshot);
  } finally {
    if (host) {
      await deleteHostedSpaces();
      await releasePoolUsers(users.tokens.PLATFORM_ROLES_ADMIN, [host.id]);
    }
  }
});

describe('Notifications - Space creation', () => {
  const everyone = () => [support, licenseManager, ...notRouted];

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteHostedSpaces();
  });

  test('Space created - Platform Support(1), Platform License Manager(1) get notifications; no other role holder and not the legacy trio', async () => {
    // Arrange
    await setPlatformAdminEmail(everyone(), ['spaceCreated'], true);

    // Act
    const subject = await createSpace('all');
    const [mails, count] = await getMailsDataSettled(2, {
      scope: mailTo(subject, everyone()),
    });

    // Assert
    expect(count).toEqual(2);
    expect(mails).toEqual(
      expect.arrayContaining([
        expectedEmail(subject, support.email),
        expectedEmail(subject, licenseManager.email),
      ])
    );
  });

  test('Space created - Platform Support(0), Platform License Manager(0) with the row switched off, nobody else either', async () => {
    // Arrange
    await setPlatformAdminEmail(everyone(), ['spaceCreated'], false);

    // Act
    const subject = await createSpace('muted');
    const [, count] = await getMailsDataSettled(0, {
      scope: mailTo(subject, everyone()),
    });

    // Assert
    expect(count).toEqual(0);
  });

  test('Space created - Platform Support(1) gets notifications, Platform License Manager(0) with its row switched off', async () => {
    // Arrange
    await setPlatformAdminEmail(
      [support, ...notRouted],
      ['spaceCreated'],
      true
    );
    await setPlatformAdminEmail([licenseManager], ['spaceCreated'], false);

    // Act
    const subject = await createSpace('one');
    const [mails, count] = await getMailsDataSettled(1, {
      scope: mailTo(subject, everyone()),
    });

    // Assert
    expect(count).toEqual(1);
    expect(mails).toEqual([expectedEmail(subject, support.email)]);
  });
});
