import {
  deleteMailSlurperMails,
  PLATFORM_ROLE_NAMES,
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
  cleanUp,
  expectedEmail,
  mailTo,
  platformRoleHolders,
  roleHolder,
} from './platform-admin-mail.helpers';
import type { Holder } from './platform-admin-mail.helpers';

/**
 * PLATFORM_ADMIN_SPACE_CREATED is routed to Platform Support and Platform
 * License Manager.
 *
 * Every other single-role holder keeps the `spaceCreated` row switched ON, so
 * "not routed to them" is observed rather than implied by their settings —
 * those 12 carry the negative proof. The legacy personas (`admin@`,
 * `global.support@`, `global.license@`) are outside the audience: which
 * platform roles they hold depends on how the environment was bootstrapped.
 *
 * The spaces are hosted on a pool user's own account: a fresh account is
 * entitled to no space, so Platform License Manager raises its baseline — the
 * same arrangement as the platform-roles suite's space host — and puts the
 * value it found back afterwards. A role user never hosts one: hosting would
 * hand that role space-admin rights.
 */

const uniqueId = UniqueIDGenerator.getID();

const ROUTED: readonly PlatformRoleName[] = [
  'PLATFORM_SUPPORT',
  'PLATFORM_LICENSE_MANAGER',
];

/** Free spaces the host needs at once: one per test, plus headroom for a leftover. */
const HOST_SPACE_FREE = 3;
const SPACE_FREE_BASELINE =
  'query { me { user { account { baselineLicensePlan { spaceFree } } } } }';
const SET_BASELINE =
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
/** The host account's `spaceFree` as found, before it is raised. */
let hostSpaceFreeBefore: number | undefined;
let snapshot: PlatformAdminSnapshot | undefined;

const setHostSpaceFree = async (
  account: RegisteredUser,
  spaceFree: number
): Promise<void> => {
  await rawRead(users.tokens.PLATFORM_LICENSE_MANAGER, SET_BASELINE, {
    updateData: { accountID: account.accountId, spaceFree },
  });
};

const deleteHostedSpaces = async (account: RegisteredUser): Promise<void> => {
  const { me } = await rawRead<{
    me: { user: { account: { spaces: { id: string }[] } } };
  }>(account.token, HOSTED_SPACES);
  for (const { id } of me.user.account.spaces) {
    await rawRead(account.token, DELETE_SPACE, { id });
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
  users = await platformRoleHolders();
  support = roleHolder(users, 'PLATFORM_SUPPORT');
  licenseManager = roleHolder(users, 'PLATFORM_LICENSE_MANAGER');
  notRouted = PLATFORM_ROLE_NAMES.filter(role => !ROUTED.includes(role)).map(
    role => roleHolder(users, role)
  );
  snapshot = await snapshotPlatformAdminRows([
    support,
    licenseManager,
    ...notRouted,
  ]);

  host = await acquirePoolUser(
    users.tokens.PLATFORM_ROLES_ADMIN,
    'notifspacehost'
  );
  // Read BEFORE raising, so afterAll puts back what was there.
  hostSpaceFreeBefore = (
    await rawRead<{
      me: { user: { account: { baselineLicensePlan: { spaceFree: number } } } };
    }>(host.token, SPACE_FREE_BASELINE)
  ).me.user.account.baselineLicensePlan.spaceFree;
  await setHostSpaceFree(host, HOST_SPACE_FREE);
  // A previous run that died mid-test leaves its space on this account.
  await deleteHostedSpaces(host);
});

afterAll(async () => {
  const account = host;
  const spaceFreeBefore = hostSpaceFreeBefore;
  await cleanUp([
    [
      'restore the holders settings',
      async () => {
        if (snapshot) await restorePlatformAdminRows(snapshot);
      },
    ],
    [
      'delete the hosted spaces',
      async () => {
        if (account) await deleteHostedSpaces(account);
      },
    ],
    [
      'restore the host baseline',
      async () => {
        if (account && spaceFreeBefore !== undefined) {
          await setHostSpaceFree(account, spaceFreeBefore);
        }
      },
    ],
    [
      'release the host',
      async () => {
        if (account) {
          await releasePoolUsers(users.tokens.PLATFORM_ROLES_ADMIN, [
            account.id,
          ]);
        }
      },
    ],
  ]);
});

describe('Notifications - Space creation', () => {
  const everyone = () => [support, licenseManager, ...notRouted];

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteHostedSpaces(host);
  });

  test('Space created - Platform Support(1), Platform License Manager(1) get notifications; no other role holder', async () => {
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
