import { expect, type Page } from '@playwright/test';
import {
  assignPlatformRole,
  eventOnInvitation,
  getUserToken,
  readMyPlatformRoles,
  readMyUser,
  readRoleSetUsersInRoles,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib';
import {
  assignUserRoleOnOrganization,
  createTestOrganization,
  removeUserRoleOnOrganization,
  type OrgFixture,
} from '../organization-user-associates/organization-user-associates.helpers';

/**
 * Shared pieces of the Platform Support organisation Community-tab walks
 * (workspace#090, server#6692 / client-web#10468). Organisations, personas and
 * teardown are the organisation-user-associates helpers; this file adds what
 * these walks need on top: the Support-only precondition, an orphaned
 * organisation, a raw accept, and the Community-tab locators.
 */

export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

export const SUPPORT_EMAIL = 'global.support@alkem.io';
export const ORG_ADMIN_EMAIL = 'organization.admin@alkem.io';

/** `apollo.errors.userMessages.authorization.platformSupportSelfTarget` (crd/i18n/common/common.en.json). */
export const SELF_TARGET_TOAST =
  "You can't do this to your own account. Ask another Platform Support user or an organisation admin.";

/**
 * Loads the shared personas and requires that the Support persona holds
 * Platform Support and NOTHING else: a walk where the actor also held another
 * role (or was the organisation's admin) would pass for the wrong reason.
 */
export const assertSupportIsSupportOnly = async (): Promise<void> => {
  await TestUserManager.populateUserModelMap();
  const roles = async (): Promise<string[]> => {
    const res = await readMyPlatformRoles({ bearerToken: await getUserToken(SUPPORT_EMAIL) });
    expect(res.error?.errors ?? [], 'read the Support persona roles').toEqual([]);
    return res.data!.platform.roleSet.myRoles;
  };
  if (!(await roles()).includes('PLATFORM_SUPPORT')) {
    const granted = await assignPlatformRole(TestUserManager.users.globalSupportAdmin.id, RoleName.PlatformSupport);
    expect(granted.error, 'grant Platform Support').toBeUndefined();
  }
  expect([...(await roles())].sort()).toEqual(['PLATFORM_SUPPORT', 'REGISTERED']);
};

/** The creator (the harness admin) steps down: ADMIN first, then ASSOCIATE. Afterwards nobody holds a role. */
export const createOrphanOrganization = async (label: string, runSuffix: string): Promise<OrgFixture> => {
  const org = await createTestOrganization(label, runSuffix);
  const creatorId = TestUserManager.users.globalAdmin.id;
  await removeUserRoleOnOrganization(org.roleSetId, creatorId, RoleName.Admin);
  await removeUserRoleOnOrganization(org.roleSetId, creatorId, RoleName.Associate);
  const held = await rolesOn(org.roleSetId);
  expect(held[RoleName.Associate], 'the orphan has no associate').toEqual([]);
  expect(held[RoleName.Admin], 'the orphan has no admin').toEqual([]);
  expect(held[RoleName.Owner], 'the orphan has no owner').toEqual([]);
  return org;
};

/** An organisation whose admin is the harness organisation-admin persona (so it opens in full mode for it). */
export const createManagedOrganization = async (label: string, runSuffix: string): Promise<OrgFixture> => {
  const org = await createTestOrganization(label, runSuffix);
  const adminId = TestUserManager.users.organizationAdmin.id;
  await assignUserRoleOnOrganization(org.roleSetId, adminId, RoleName.Associate);
  await assignUserRoleOnOrganization(org.roleSetId, adminId, RoleName.Admin);
  return org;
};

/** role -> user ids, read as the harness admin (a Support user, which may read the member list). */
export const rolesOn = async (roleSetId: string): Promise<Record<string, string[]>> => {
  const res = await readRoleSetUsersInRoles(
    roleSetId,
    [RoleName.Associate, RoleName.Admin, RoleName.Owner],
    { bearerToken: await getUserToken(TestUserManager.users.globalAdmin.email) }
  );
  expect(res.error?.errors ?? [], 'read the member list').toEqual([]);
  const byRole: Record<string, string[]> = { [RoleName.Associate]: [], [RoleName.Admin]: [], [RoleName.Owner]: [] };
  for (const entry of res.data!.lookup.roleSet!.usersInRoles) byRole[entry.role] = entry.users.map(u => u.id);
  return byRole;
};

export const userIdOf = async (email: string): Promise<string> => {
  const res = await readMyUser({ bearerToken: await getUserToken(email) });
  const id = res.data?.me.user?.id;
  if (!id) throw new Error(`no user for ${email}: ${JSON.stringify(res.error ?? res.data)}`);
  return id;
};

export const displayNameOf = async (email: string): Promise<string> => {
  const res = await readMyUser({ bearerToken: await getUserToken(email) });
  const name = res.data?.me.user?.profile?.displayName;
  if (!name) throw new Error(`no display name for ${email}: ${JSON.stringify(res.error ?? res.data)}`);
  return name;
};

/** Accepts an organisation invitation as its invitee, through the API. */
export const acceptInvitationRaw = async (invitationId: string, bearerToken: string): Promise<void> => {
  const res = await eventOnInvitation(invitationId, 'ACCEPT', { bearerToken });
  expect(res.error?.errors ?? [], 'accept the invitation').toEqual([]);
};

export const settingsUrl = (org: Pick<OrgFixture, 'nameID'>, tail = ''): string =>
  `${baseUrl}/organization/${org.nameID}/settings${tail}`;

/**
 * The org Community tab (server#6692) — since client-web#10476 the Associates tab at
 * `/settings/associates` (`/settings/community` redirects there) — once its heading has
 * rendered (the guard shows a loader while privileges load).
 */
export const openCommunityTab = async (page: Page, org: Pick<OrgFixture, 'nameID'>): Promise<void> => {
  await page.goto(settingsUrl(org, '/associates'));
  await expect(page.getByRole('heading', { name: 'Pending applications & invitations' })).toBeVisible({
    timeout: 20_000,
  });
};

export { TestUser };
