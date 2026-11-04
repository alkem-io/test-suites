import { rawRead } from './raw-request';

/**
 * A user's five platform-admin notification rows — one per platform-admin
 * notification event — read and written by the user THEMSELVES.
 *
 * Only the user holds UPDATE on their own settings (Platform Users Admin may
 * read them, nobody else may write them), so every call here carries the
 * owner's own token. Shared by the recipient-routing spec in this directory
 * and the platform notification specs in `notifications/platform/`, which
 * toggle the same rows on the same single-role users.
 */
export const PLATFORM_ADMIN_ROWS = [
  'userProfileCreated',
  'userProfileRemoved',
  'spaceCreated',
  'userGlobalRoleChanged',
  'userEmailChanged',
] as const;
export type PlatformAdminRow = (typeof PLATFORM_ADMIN_ROWS)[number];

export type Channels = { email: boolean; inApp: boolean; push: boolean };
export type PlatformAdminRows = Record<PlatformAdminRow, Channels>;

/** A user acting on their own settings. */
export type SettingsOwner = { id: string; token: string };

const READ_ROWS = `query { me { user { id settings { notification { platform { admin { ${PLATFORM_ADMIN_ROWS.map(
  row => `${row} { email inApp push }`
).join(' ')} } } } } } } }`;

const WRITE_ROWS =
  'mutation($settingsData: UpdateUserSettingsInput!) { updateUserSettings(settingsData: $settingsData) { id } }';

export const readPlatformAdminRows = async (
  owner: SettingsOwner
): Promise<PlatformAdminRows> => {
  const { me } = await rawRead<{
    me: {
      user: {
        id: string;
        settings: { notification: { platform: { admin: PlatformAdminRows } } };
      } | null;
    };
  }>(owner.token, READ_ROWS);
  if (me.user?.id !== owner.id) {
    throw new Error(
      `platform-admin settings: token resolved to ${me.user?.id ?? 'no user'}, expected ${owner.id}`
    );
  }
  const admin = me.user.settings.notification.platform.admin;
  // Exactly the three channels — the response carries nothing else here, but
  // the restore writes these objects straight back into the update input.
  return Object.fromEntries(
    PLATFORM_ADMIN_ROWS.map(row => [
      row,
      {
        email: admin[row].email,
        inApp: admin[row].inApp,
        push: admin[row].push,
      },
    ])
  ) as PlatformAdminRows;
};

/** A partial write: channels left out keep their stored value. Throws on any error. */
export const writePlatformAdminRows = async (
  owner: SettingsOwner,
  rows: Partial<Record<PlatformAdminRow, Partial<Channels>>>
): Promise<void> => {
  await rawRead(owner.token, WRITE_ROWS, {
    settingsData: {
      userID: owner.id,
      settings: { notification: { platform: { admin: rows } } },
    },
  });
};

/** Sets the given channels of the given rows, on every owner; channels left out stay as they are. */
export const setPlatformAdminChannels = async (
  owners: readonly SettingsOwner[],
  rows: readonly PlatformAdminRow[],
  channels: Partial<Channels>
): Promise<void> => {
  const update = Object.fromEntries(rows.map(row => [row, channels]));
  await Promise.all(owners.map(owner => writePlatformAdminRows(owner, update)));
};

/** Sets the EMAIL channel of the given rows, on every owner; the other channels stay as they are. */
export const setPlatformAdminEmail = (
  owners: readonly SettingsOwner[],
  rows: readonly PlatformAdminRow[],
  email: boolean
): Promise<void> => setPlatformAdminChannels(owners, rows, { email });

export type PlatformAdminSnapshot = {
  owner: SettingsOwner;
  rows: PlatformAdminRows;
}[];

/** Read BEFORE anything is changed, so the restore puts back what was there — not a hard-coded default. */
export const snapshotPlatformAdminRows = async (
  owners: readonly SettingsOwner[]
): Promise<PlatformAdminSnapshot> =>
  Promise.all(
    owners.map(async owner => ({
      owner,
      rows: await readPlatformAdminRows(owner),
    }))
  );

/**
 * Writes every snapshotted row back, all three channels. Attempts every owner
 * and THEN fails, naming each one it could not restore: these users are shared
 * with every spec that counts platform-admin mail, so a silently skipped
 * restore leaks into all of them.
 */
export const restorePlatformAdminRows = async (
  snapshot: PlatformAdminSnapshot
): Promise<void> => {
  const failures: string[] = [];
  for (const { owner, rows } of snapshot) {
    try {
      await writePlatformAdminRows(owner, rows);
    } catch (e) {
      failures.push(`${owner.id}: ${(e as Error).message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `could not restore platform-admin notification settings —\n  ${failures.join('\n  ')}`
    );
  }
};
