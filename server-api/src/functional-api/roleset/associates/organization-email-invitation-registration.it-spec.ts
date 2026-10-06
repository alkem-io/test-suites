// What registration does with an open organization email invitation, what it
// converts it into, and what account deletion and organization deletion leave
// behind.
//
// Registration precedence: a verified organization whose domain matches the
// registering address and whose "matching domain may join" switch is on would
// auto-join the new user. When that address also holds an open invitation to
// the same organization the invitation wins — the user is NOT auto-joined, they
// are asked. This spec is RED on a build that lifts the organization-only email
// guard without the precedence rule (registration then throws mid-finalize) and
// GREEN with it; it cannot be RED on plain develop, where the guard refuses the
// invitation before any of this is reachable.
//
// Registration always goes through `registerVerifiedUser` (Kratos → identity
// resolve → domain auto-join), never the admin `createUser` helper.
import {
  getGraphqlClient,
  getUserToken,
  harnessPostgresConfigured,
  queryHarnessDb,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { GraphqlReturnWithError } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  OrganizationVerificationEnum,
  RoleName,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  createUserDataOrFail,
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  createOrganization,
  deleteOrganization,
  getOrganizationData,
  updateOrganization,
  updateOrganizationSettings,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { getLanguageConfig } from '@functional-api/language/language.request.params';
import { getRoleSetInvitationsApplications } from '../application/application.request.params';
import {
  deleteExternalInvitation,
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '../invitations/invitation.request.params';
import {
  getRoleSetPendingPlatformInvitations,
  getSingleInvitationResult,
  isPlatformInvitationGone,
  lookupPlatformInvitation,
  platformInvitationRowExists,
  usersInRoles,
} from '../roleset.request.params';
import { assignRoleToUser } from '../roles-request.params';

const uniqueId = UniqueIDGenerator.getID();
const domain = `inv${uniqueId}.example.com`;
const message = `You are welcome here ${uniqueId}`;
const OWNER_CAP = 3;

let orgScenario: OrganizationWithSpaceModel;
let capScenario: OrganizationWithSpaceModel;
let suggestedLanguage: string | undefined;

const userIds = new Set<string>();
const platformInvitationIds = new Set<string>();
const invitationIds = new Set<string>();
const organizationIds = new Set<string>();

/** Acts as any registered address (every registered user shares the harness
 * password), for the calls only the invitee may make. */
const callAsEmail = async <TData>(
  email: string,
  invoke: (
    client: ReturnType<typeof getGraphqlClient>,
    auth: { authorization: string }
  ) => Promise<{ data: TData }>
): Promise<GraphqlReturnWithError<TData>> => {
  const token = await getUserToken(email);
  try {
    const result = await invoke(getGraphqlClient(), {
      authorization: `Bearer ${token}`,
    });
    return { data: result.data };
  } catch (error) {
    const err = error as {
      response?: { errors?: Array<Record<string, unknown>> };
    };
    return {
      error: {
        errors: err.response?.errors ?? [{ message: String(error) }],
      },
    };
  }
};

const register = async (email: string, label: string) => {
  const id = await registerVerifiedUser(
    email,
    `fn${label}${uniqueId}`,
    `ln${label}${uniqueId}`
  );
  userIds.add(id);
  return id;
};

const inviteEmail = async (
  roleSetId: string,
  email: string,
  roles: RoleName[],
  as: TestUser = TestUser.ORGANIZATION_ADMIN,
  language?: string
) => {
  const res = await inviteForEntryRoleOnRoleSet(
    roleSetId,
    [],
    [email],
    message,
    roles,
    as,
    language
  );
  expect(res?.error).toBeUndefined();
  const result = getSingleInvitationResult(res);
  expect(result?.type).toEqual(
    RoleSetInvitationResultType.InvitedToPlatformAndRoleSet
  );
  const id = result?.platformInvitation?.id ?? '';
  expect(id).toHaveLength(36);
  platformInvitationIds.add(id);
  return id;
};

/** The invitation is erased: the lookup answers entity-not-found (any other
 * error does not count), and where the harness reaches Postgres no row is left. */
const expectInvitationErased = async (id: string) => {
  expect(
    isPlatformInvitationGone(await lookupPlatformInvitation(id)),
    id
  ).toBe(true);
  expect(await platformInvitationRowExists(id), id).not.toEqual(true);
};

const roleHolders = async (roleSetId: string, role: RoleName) => {
  const res = await usersInRoles(roleSetId, [role], TestUser.GLOBAL_ADMIN);
  return (
    res?.data?.lookup?.roleSet?.usersInRoles?.[0]?.users?.map(u => u.id) ?? []
  );
};

beforeAll(async () => {
  orgScenario = await TestScenarioFactory.createBaseScenario({
    name: 'org-email-register',
    organization: { verification: { setVerified: true } },
    space: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN],
      },
    },
  });
  await updateOrganization(orgScenario.organization.id, { domain });
  await updateOrganizationSettings(orgScenario.organization.id, {
    membership: { allowUsersMatchingDomainToJoin: true },
  });

  capScenario = await TestScenarioFactory.createBaseScenarioOrganization({
    name: 'org-email-owner-cap',
  });

  const config = await getLanguageConfig();
  const language = config.body?.data?.platform?.configuration?.language;
  const eligible: string[] = language?.eligible ?? [];
  suggestedLanguage =
    eligible.find(code => code !== language?.default) ?? eligible[0];
});

afterAll(async () => {
  for (const id of platformInvitationIds) {
    await deleteExternalInvitation(id).catch(() => undefined);
  }
  for (const id of invitationIds) {
    await deleteInvitation(id).catch(() => undefined);
  }
  for (const id of userIds) {
    await deleteUser(id).catch(() => undefined);
  }
  for (const id of organizationIds) {
    await deleteOrganization(id).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(orgScenario);
  await TestScenarioFactory.cleanUpBaseScenario(capScenario);
});

describe('An open invitation wins over the domain auto-join (US2)', () => {
  const invitedEmail = `new-${uniqueId}@${domain}`;
  let invitedUserId = '';
  const consumedInvitationIds: string[] = [];

  /**
   * The state US2-AS4/AS6/US4-AS2, US2-AS3 and US4-AS3 all build on: the
   * organization and the Space each hold an open invitation for the address,
   * and the address has then registered (so both records are consumed and one
   * converted invitation per role set exists). Memoized, so the first test to
   * run does the work and the later ones reuse it — each of the three can be
   * run alone (`-t`) and the chain still reads top to bottom.
   */
  let invitedState: Promise<void> | undefined;
  const ensureInvitedAddressRegistered = (): Promise<void> =>
    (invitedState ??= (async () => {
      const orgInvitationId = await inviteEmail(
        orgScenario.organization.roleSetId,
        invitedEmail,
        [RoleName.Admin],
        TestUser.ORGANIZATION_ADMIN,
        suggestedLanguage
      );
      const spaceInvitationId = await inviteEmail(
        orgScenario.space.community.roleSetId,
        invitedEmail,
        [RoleName.Member],
        TestUser.GLOBAL_ADMIN,
        suggestedLanguage
      );
      consumedInvitationIds.push(orgInvitationId, spaceInvitationId);

      // Registration must not fail mid-finalize on the colliding domain join.
      invitedUserId = await register(invitedEmail, 'invited');
    })());

  test('US2-AS4: the organization is verified and its domain door is open', async () => {
    const org = await getOrganizationData(orgScenario.organization.id);
    expect(org?.data?.organization.verification.status).toEqual(
      OrganizationVerificationEnum.VerifiedManualAttestation
    );
  });

  test('US2-AS4/AS6/US4-AS2: registering with an invited same-domain address succeeds, does not auto-join, and leaves exactly one converted invitation carrying roles, inviter, message and language', async () => {
    const organizationRoleSetId = orgScenario.organization.roleSetId;
    await ensureInvitedAddressRegistered();

    // Not auto-joined.
    expect(await roleHolders(organizationRoleSetId, RoleName.Associate)).not.toContain(
      invitedUserId
    );

    // Exactly one open invitation for the new user, with everything carried over.
    const pending = await getRoleSetInvitationsApplications(
      organizationRoleSetId
    );
    const forUser = (pending?.data?.lookup?.roleSet?.invitations ?? []).filter(
      i => i.actor.id === invitedUserId
    );
    expect(forUser).toHaveLength(1);
    const converted = forUser[0];
    invitationIds.add(converted.id);
    expect(converted.state).toEqual('invited');
    expect(converted.extraRoles).toEqual([RoleName.Admin]);
    expect(converted.createdBy?.id).toEqual(
      TestUserManager.users.organizationAdmin.id
    );
    expect(converted.welcomeMessage).toEqual(message);
    if (suggestedLanguage) {
      expect(converted.suggestedLanguage).toEqual(suggestedLanguage);
    }

    // The invitee sees it on their own pending surface.
    const mine = await callAsEmail(invitedEmail, (client, auth) =>
      client.MeOrganizationPending({}, auth)
    );
    expect(mine?.error).toBeUndefined();
    expect(
      (mine?.data?.me.organizationInvitations ?? []).filter(
        i => i.organization.id === orgScenario.organization.id
      )
    ).toHaveLength(1);

    // The admin's pending table no longer lists the address (open-only), for
    // the organization and for the Space.
    const orgList = await getRoleSetPendingPlatformInvitations(
      organizationRoleSetId,
      TestUser.ORGANIZATION_ADMIN
    );
    expect(
      (orgList?.data?.lookup?.roleSet?.platformInvitations ?? []).map(
        p => p.email
      )
    ).not.toContain(invitedEmail);
    const spaceList = await getRoleSetPendingPlatformInvitations(
      orgScenario.space.community.roleSetId
    );
    expect(
      (spaceList?.data?.lookup?.roleSet?.platformInvitations ?? []).map(
        p => p.email
      )
    ).not.toContain(invitedEmail);

    // The converted Space invitation exists too.
    const spacePending = await getRoleSetInvitationsApplications(
      orgScenario.space.community.roleSetId
    );
    const spaceConverted = (
      spacePending?.data?.lookup?.roleSet?.invitations ?? []
    ).filter(i => i.actor.id === invitedUserId);
    expect(spaceConverted).toHaveLength(1);
    invitationIds.add(spaceConverted[0].id);
    // Conversion carries the message and the suggested language on the Space side too.
    expect(spaceConverted[0].welcomeMessage).toEqual(message);
    if (suggestedLanguage) {
      expect(spaceConverted[0].suggestedLanguage).toEqual(suggestedLanguage);
    }
  });

  test('US2-AS3: accepting the converted invitation grants Associate + Admin', async () => {
    await ensureInvitedAddressRegistered();
    const pending = await getRoleSetInvitationsApplications(
      orgScenario.organization.roleSetId
    );
    const converted = (pending?.data?.lookup?.roleSet?.invitations ?? []).find(
      i => i.actor.id === invitedUserId
    );
    expect(converted).toBeDefined();

    const accepted = await callAsEmail(invitedEmail, (client, auth) =>
      client.InvitationStateEvent(
        { input: { invitationID: converted!.id, eventName: 'ACCEPT' } },
        auth
      )
    );
    expect(accepted?.error).toBeUndefined();
    expect(accepted?.data?.eventOnInvitation.extraRolesWithheld).toEqual([]);

    const roleSetId = orgScenario.organization.roleSetId;
    expect(await roleHolders(roleSetId, RoleName.Associate)).toContain(
      invitedUserId
    );
    expect(await roleHolders(roleSetId, RoleName.Admin)).toContain(
      invitedUserId
    );
  });

  test('control: an address on the same domain with no invitation is still auto-joined at registration', async () => {
    const otherEmail = `other-${uniqueId}@${domain}`;
    const otherId = await register(otherEmail, 'other');
    expect(
      await roleHolders(orgScenario.organization.roleSetId, RoleName.Associate)
    ).toContain(otherId);
  });

  test('US4-AS3: deleting the account erases every email-invitation record for the address, and registering the address again finds nothing', async () => {
    await ensureInvitedAddressRegistered();
    expect(consumedInvitationIds).toHaveLength(2);
    // Consumed, but still on record until the account goes.
    for (const id of consumedInvitationIds) {
      const row = await lookupPlatformInvitation(id);
      expect(row?.data?.lookup?.platformInvitation?.profileCreated).toEqual(
        true
      );
    }

    const deleted = await deleteUser(invitedUserId);
    expect(deleted?.error).toBeUndefined();
    userIds.delete(invitedUserId);

    for (const id of consumedInvitationIds) {
      await expectInvitationErased(id);
    }
    expect(
      (
        (
          await getRoleSetPendingPlatformInvitations(
            orgScenario.organization.roleSetId
          )
        )?.data?.lookup?.roleSet?.platformInvitations ?? []
      ).map(p => p.email)
    ).not.toContain(invitedEmail);

    // Registering the same address again: no invitation comes back.
    const reregisteredId = await register(invitedEmail, 'again');
    for (const roleSetId of [
      orgScenario.organization.roleSetId,
      orgScenario.space.community.roleSetId,
    ]) {
      const pending = await getRoleSetInvitationsApplications(roleSetId);
      expect(
        (pending?.data?.lookup?.roleSet?.invitations ?? []).filter(
          i => i.actor.id === reregisteredId
        )
      ).toHaveLength(0);
    }
  });
});

describe('A consumed invitation is never converted again (US4-AS4)', () => {
  // The erasure case above cannot reach this rule: it re-registers after the rows are gone. A consumed
  // record can only be forged by flipping the flag on an open row, which needs the harness database.
  test.skipIf(!harnessPostgresConfigured())('registering an address whose record is already consumed creates no invitation and no membership', async () => {
    const email = `consumed-${uniqueId}@alkemio.test`;
    const roleSetId = orgScenario.organization.roleSetId;
    const id = await inviteEmail(roleSetId, email, [RoleName.Admin]);
    await queryHarnessDb(
      'UPDATE platform_invitation SET "profileCreated" = true WHERE id = $1',
      [id]
    );

    const userId = await register(email, 'consumed');

    const pending = await getRoleSetInvitationsApplications(roleSetId);
    expect(
      (pending?.data?.lookup?.roleSet?.invitations ?? []).filter(
        i => i.actor.id === userId
      )
    ).toHaveLength(0);
    expect(await roleHolders(roleSetId, RoleName.Associate)).not.toContain(
      userId
    );
  });
});

describe('The offered Owner role is withheld at accept time when the cap is full (US2-AS5)', () => {
  test('an Owner offer made by email is created; once the cap is full the invitee registers, accepts and becomes an associate only', async () => {
    const capRoleSetId = capScenario.organization.roleSetId;
    const email = `owner-${uniqueId}@alkemio.test`;

    // Invite while the cap is still open, then fill it.
    await inviteEmail(capRoleSetId, email, [RoleName.Owner]);
    const owners = (await roleHolders(capRoleSetId, RoleName.Owner)).length;
    for (let i = owners; i < OWNER_CAP; i++) {
      const filler = await createUserDataOrFail({
        profileData: { displayName: `Owner Filler ${i}` },
      });
      userIds.add(filler.id);
      await assignRoleToUser(filler.id, capRoleSetId, RoleName.Owner);
    }
    expect(await roleHolders(capRoleSetId, RoleName.Owner)).toHaveLength(
      OWNER_CAP
    );

    const userId = await register(email, 'owner');
    const pending = await getRoleSetInvitationsApplications(capRoleSetId);
    const converted = (pending?.data?.lookup?.roleSet?.invitations ?? []).find(
      i => i.actor.id === userId
    );
    expect(converted?.extraRoles).toEqual([RoleName.Owner]);

    const accepted = await callAsEmail(email, (client, auth) =>
      client.InvitationStateEvent(
        { input: { invitationID: converted!.id, eventName: 'ACCEPT' } },
        auth
      )
    );
    expect(accepted?.error).toBeUndefined();
    expect(accepted?.data?.eventOnInvitation.extraRolesWithheld).toEqual([
      RoleName.Owner,
    ]);
    expect(await roleHolders(capRoleSetId, RoleName.Associate)).toContain(
      userId
    );
    expect(await roleHolders(capRoleSetId, RoleName.Owner)).not.toContain(
      userId
    );
  });
});

describe('Deleting an organization removes its open email invitations (US4-AS6)', () => {
  test('the platform invitation does not outlive its organization', async () => {
    const created = await createOrganization(
      `org-email-del-${uniqueId}`,
      `orgemaildel${uniqueId}`.toLowerCase().slice(0, 24)
    );
    const organization = created.data?.createOrganization;
    expect(organization?.id).toBeDefined();
    organizationIds.add(organization!.id);

    const email = `doomed-${uniqueId}@alkemio.test`;
    const invitationId = await inviteEmail(
      organization!.roleSet.id,
      email,
      [],
      TestUser.GLOBAL_ADMIN
    );
    expect(
      isPlatformInvitationGone(await lookupPlatformInvitation(invitationId))
    ).toBe(false);

    const deleted = await deleteOrganization(organization!.id);
    expect(deleted?.error).toBeUndefined();
    organizationIds.delete(organization!.id);

    await expectInvitationErased(invitationId);
  });
});
