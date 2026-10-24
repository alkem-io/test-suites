import { expect } from 'vitest';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import type { PlatformRole } from '../../capabilities.data';
import {
  registerDisposableUser,
  removeDisposableUser,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import { rawRead, rawRequest } from '../raw-request';
import type { GroupModule, Headers, PerRole } from '../types';
import { undoOnFailure } from '../undo-on-failure';
import {
  createOwnedOrganization,
  organizationAdminOf,
  removeOwnedOrganization,
  resignFromOrganization,
} from './organization-content';

/**
 * A23 — manage an organisation's people on its Community tab (workspace#090,
 * server#6692 / #6708). Platform Support does what an organisation admin does
 * there, and no other platform role does, with two declared exceptions that
 * come from today's root CRUD rule (OP-6): Content Full Access can also revoke
 * an invitation (user or email) and reject an application.
 *
 * Who does what:
 *  - Platform Support creates the organisation and hands it to a neutral
 *    organisation admin, then resigns (`createOwnedOrganization`), so its
 *    positives pass through its OWN Support privilege and not through ownership.
 *  - That organisation admin seeds the people: associates, pending invitations
 *    (user and email) and applications, as an admin would.
 *  - One target per ALLOWED role for every state-changing row, plus ONE deny
 *    target that must survive the run: two allowed roles never race on a
 *    target, and a negative that (wrongly) succeeded cannot starve a positive.
 *
 * The invitation, email-invitation and application targets are consumed by the
 * positives, so the fixture is built fresh every run.
 */
type A23 = {
  organizationId: string;
  roleSetId: string;
  /** Users who take part: registered by the group, deleted by its teardown. */
  users: DisposableUser[];

  /** invite: a user nobody has invited yet. */
  inviteeAllowed: string;
  inviteeDeny: string;
  /** resend: one open email invitation (a refused resend never reaches the throttle). */
  resendInvitationId: string;
  /** promote / remove: associates. */
  promoteTarget: string;
  removeTarget: string;
  denyAssociate: string;
  /** APPROVE / REJECT: pending applications; `denyApplication` survives. */
  approveApplication: string;
  approveApplicant: string;
  rejectApplications: PerRole;
  denyApplication: string;
  /** deleteInvitation: pending user invitations. */
  deleteInvitations: PerRole;
  denyInvitation: string;
  /** deletePlatformInvitation: open email invitations. */
  deleteEmailInvitations: PerRole;
  denyEmailInvitation: string;
};

const cap = (id: string) => CAPABILITIES.find(c => c.id === id)!;
const INVITE = cap('A23.inviteForEntryRoleOnRoleSet');
const REJECT = cap('A23.eventOnApplication#reject');
const DELETE_INVITATION = cap('A23.deleteInvitation');
const DELETE_EMAIL = cap('A23.deletePlatformInvitation');

const isAllowed = (id: string, role: PlatformRole): boolean =>
  allowedRoles(cap(id)).includes(role);

const token = (headers: Headers): string =>
  headers.authorization.replace(/^Bearer /, '');

/**
 * ONE call with a `{ id }` selection. The generated `assignRoleToUser` /
 * `removeRoleFromUser` documents select the whole `UserData` fragment, whose
 * `settings` field Platform Support may not read: the action succeeds and the
 * response then carries an authorization error BELOW the gate, which the
 * suite (rightly) reports as a failure. A GraphQL error is re-thrown in the
 * SDK's shape so `classify` judges it like any other call.
 */
const minimalCall = async (
  headers: Headers,
  query: string,
  variables: Record<string, unknown>
): Promise<{ data: unknown }> => {
  const { data, errors } = await rawRequest(token(headers), query, variables);
  if (errors.length > 0) throw { response: { errors } };
  return { data };
};

const ROLE_SET =
  'query($id: UUID!) { lookup { organization(ID: $id) { roleSet { id } } } }';
const ASSIGN =
  'mutation($d: AssignRoleOnRoleSetInput!) { assignRoleToUser(roleData: $d) { id } }';
const REMOVE =
  'mutation($d: RemoveRoleOnRoleSetInput!) { removeRoleFromUser(roleData: $d) { id } }';
const INVITE_MUTATION = `mutation($d: InviteForEntryRoleOnRoleSetInput!) {
  inviteForEntryRoleOnRoleSet(invitationData: $d) {
    invitation { id } platformInvitation { id }
  }
}`;
const APPLY =
  'mutation($d: ApplyForEntryRoleOnRoleSetInput!) { applyForEntryRoleOnRoleSet(applicationData: $d) { id } }';
const APPLICATION_STATE =
  'query($id: UUID!) { lookup { application(ID: $id) { state } } }';
const INVITATION_EXISTS =
  'query($id: UUID!) { lookup { invitation(ID: $id) { id } } }';
const EMAIL_INVITATION_EXISTS =
  'query($id: UUID!) { lookup { platformInvitation(ID: $id) { id } } }';
const IN_ROLES = `query($id: UUID!, $roles: [RoleName!]!) {
  lookup { roleSet(ID: $id) { usersInRoles(roles: $roles) { role users { id } } } }
}`;

/** role -> ids of the users in it, read with `reader` (the caller, who passed the gate). */
const membersOf = async (
  reader: string,
  roleSetId: string
): Promise<Record<string, string[]>> => {
  const data = await rawRead<{
    lookup: {
      roleSet: { usersInRoles: { role: string; users: { id: string }[] }[] };
    };
  }>(reader, IN_ROLES, {
    id: roleSetId,
    roles: [RoleName.Associate, RoleName.Admin, RoleName.Owner],
  });
  return Object.fromEntries(
    data.lookup.roleSet.usersInRoles.map(r => [r.role, r.users.map(u => u.id)])
  );
};

const stateOf = async (reader: string, id: string): Promise<string> =>
  (
    await rawRead<{ lookup: { application: { state: string } } }>(
      reader,
      APPLICATION_STATE,
      { id }
    )
  ).lookup.application.state;

/** `true` only on the server's own not-found; any other error is thrown. */
const gone = async (
  reader: string,
  query: string,
  id: string
): Promise<boolean> => {
  const { data, errors } = await rawRequest<{
    lookup: Record<string, unknown | null>;
  }>(reader, query, { id });
  // Resolved: gone only if the lookup answered null.
  if (errors.length === 0) return Object.values(data?.lookup ?? {})[0] == null;
  if (errors.every(e => e.extensions?.code === 'ENTITY_NOT_FOUND')) return true;
  throw new Error(`could not read ${id}: ${errors[0].message}`);
};

export const A23_GROUP: GroupModule<A23> = {
  group: 'A23',

  build: ctx =>
    undoOnFailure(async undo => {
      const admin = await organizationAdminOf();
      const { organizationId } = await createOwnedOrganization(ctx, 'a23', {
        license: false,
      });
      undo(async () => {
        await resignFromOrganization(admin.token, admin.id, organizationId);
        await removeOwnedOrganization(ctx, organizationId, {
          packs: [],
          hubs: [],
          spaces: [],
        });
      });
      const roleSetId = (
        await rawRead<{
          lookup: { organization: { roleSet: { id: string } } };
        }>(admin.token, ROLE_SET, { id: organizationId })
      ).lookup.organization.roleSet.id;

      const users: DisposableUser[] = [];
      const register = async (tag: string): Promise<DisposableUser> => {
        const user = await registerDisposableUser(ctx, `a23${tag}`);
        users.push(user);
        undo(() => removeDisposableUser(ctx, user));
        return user;
      };
      const addAssociate = async (user: DisposableUser) =>
        rawRead(admin.token, ASSIGN, {
          d: { roleSetID: roleSetId, actorID: user.id, role: 'ASSOCIATE' },
        });
      const invitationTo = async (invitee: DisposableUser): Promise<string> =>
        (
          await rawRead<{
            inviteForEntryRoleOnRoleSet: { invitation: { id: string } }[];
          }>(admin.token, INVITE_MUTATION, {
            d: {
              roleSetID: roleSetId,
              invitedActorIDs: [invitee.id],
              invitedUserEmails: [],
              welcomeMessage: `platform-roles a23 ${ctx.runId}`,
              extraRoles: [],
            },
          })
        ).inviteForEntryRoleOnRoleSet[0].invitation.id;
      let emailCount = 0;
      const emailInvitation = async (): Promise<string> =>
        (
          await rawRead<{
            inviteForEntryRoleOnRoleSet: { platformInvitation: { id: string } }[];
          }>(admin.token, INVITE_MUTATION, {
            d: {
              roleSetID: roleSetId,
              invitedActorIDs: [],
              invitedUserEmails: [
                `pr-a23-${ctx.runId}-${emailCount++}@alkemio.test`,
              ],
              welcomeMessage: `platform-roles a23 ${ctx.runId}`,
              extraRoles: [],
            },
          })
        ).inviteForEntryRoleOnRoleSet[0].platformInvitation.id;
      const applicationBy = async (user: DisposableUser): Promise<string> =>
        (
          await rawRead<{ applyForEntryRoleOnRoleSet: { id: string } }>(
            user.token,
            APPLY,
            { d: { roleSetID: roleSetId, questions: [] } }
          )
        ).applyForEntryRoleOnRoleSet.id;

      // associates
      const promote = await register('promote');
      const remove = await register('remove');
      const denyAssociate = await register('denyassoc');
      for (const user of [promote, remove, denyAssociate]) {
        await addAssociate(user);
      }

      // invitations to registered users (inviteeAllowed / inviteeDeny stay uninvited
      // by Support's path; inviteeDeny also carries the deny invitation)
      const inviteeAllowed = await register('inviteallow');
      const inviteeDeny = await register('invitedeny');
      const deleteInvitations: PerRole = {};
      for (const role of allowedRoles(DELETE_INVITATION)) {
        const invitee = await register(`del${role.slice(-6).toLowerCase()}`);
        deleteInvitations[role] = await invitationTo(invitee);
      }
      const denyInvitation = await invitationTo(inviteeDeny);

      // email invitations
      const resendInvitationId = await emailInvitation();
      const deleteEmailInvitations: PerRole = {};
      for (const role of allowedRoles(DELETE_EMAIL)) {
        deleteEmailInvitations[role] = await emailInvitation();
      }
      const denyEmailInvitation = await emailInvitation();

      // applications
      const approveApplicant = await register('approve');
      const approveApplication = await applicationBy(approveApplicant);
      const rejectApplications: PerRole = {};
      for (const role of allowedRoles(REJECT)) {
        const applicant = await register(`rej${role.slice(-6).toLowerCase()}`);
        rejectApplications[role] = await applicationBy(applicant);
      }
      const denyApplicant = await register('denyapp');
      const denyApplication = await applicationBy(denyApplicant);

      return {
        organizationId,
        roleSetId,
        users,
        inviteeAllowed: inviteeAllowed.id,
        inviteeDeny: inviteeDeny.id,
        resendInvitationId,
        promoteTarget: promote.id,
        removeTarget: remove.id,
        denyAssociate: denyAssociate.id,
        approveApplication,
        approveApplicant: approveApplicant.id,
        rejectApplications,
        denyApplication,
        deleteInvitations,
        denyInvitation,
        deleteEmailInvitations,
        denyEmailInvitation,
      };
    }),

  // The organisation first (Support deletes it; its invitations, applications
  // and memberships go with it), then the users. Every step is attempted.
  teardown: async (ctx, _sdk, fx) => {
    const failures: string[] = [];
    try {
      const admin = await organizationAdminOf();
      await resignFromOrganization(admin.token, admin.id, fx.organizationId);
      await removeOwnedOrganization(ctx, fx.organizationId, {
        packs: [],
        hubs: [],
        spaces: [],
      });
    } catch (e) {
      failures.push(`organization: ${(e as Error).message}`);
    }
    for (const user of fx.users) {
      try {
        await removeDisposableUser(ctx, user);
      } catch (e) {
        failures.push(`user ${user.email}: ${(e as Error).message}`);
      }
    }
    if (failures.length) throw new Error(failures.join('; '));
  },

  invocations: {
    'A23.inviteForEntryRoleOnRoleSet': {
      gate: ['inviteForEntryRoleOnRoleSet'],
      call: (sdk, headers, fx, role) =>
        sdk.InviteForEntryRoleOnRoleSet(
          {
            roleSetId: fx.roleSetId,
            invitedActorIds: [
              isAllowed(INVITE.id, role) ? fx.inviteeAllowed : fx.inviteeDeny,
            ],
            invitedUserEmails: [],
            welcomeMessage: 'platform-roles a23',
            extraRoles: [],
          },
          headers
        ),
      verify: async ({ fx, data, caller }) => {
        const created = (
          data as {
            inviteForEntryRoleOnRoleSet: { invitation?: { id: string } }[];
          }
        ).inviteForEntryRoleOnRoleSet[0].invitation?.id;
        expect(created, 'the invitation was created').toBeDefined();
        const listed = await rawRead<{
          lookup: { roleSet: { invitations: { id: string }[] } };
        }>(
          caller.token,
          'query($id: UUID!) { lookup { roleSet(ID: $id) { invitations { id } } } }',
          { id: fx.roleSetId }
        );
        expect(listed.lookup.roleSet.invitations.map(i => i.id)).toContain(
          created
        );
      },
    },

    'A23.resendPlatformInvitation': {
      gate: ['resendPlatformInvitation'],
      call: (sdk, headers, fx) =>
        sdk.ResendPlatformInvitation(
          { invitationId: fx.resendInvitationId },
          headers
        ),
      verify: async ({ fx, data }) =>
        expect(
          (data as { resendPlatformInvitation: { id: string } })
            .resendPlatformInvitation.id
        ).toEqual(fx.resendInvitationId),
    },

    'A23.assignRoleToUser': {
      gate: ['assignRoleToUser'],
      call: (_sdk, headers, fx, role) =>
        minimalCall(headers, ASSIGN, {
          d: {
            roleSetID: fx.roleSetId,
            actorID: isAllowed('A23.assignRoleToUser', role)
              ? fx.promoteTarget
              : fx.denyAssociate,
            role: RoleName.Admin,
          },
        }),
      verify: async ({ fx, caller }) =>
        expect(
          (await membersOf(caller.token, fx.roleSetId))[RoleName.Admin]
        ).toContain(fx.promoteTarget),
    },

    'A23.removeRoleFromUser': {
      gate: ['removeRoleFromUser'],
      call: (_sdk, headers, fx, role) =>
        minimalCall(headers, REMOVE, {
          d: {
            roleSetID: fx.roleSetId,
            actorID: isAllowed('A23.removeRoleFromUser', role)
              ? fx.removeTarget
              : fx.denyAssociate,
            role: RoleName.Associate,
          },
        }),
      verify: async ({ fx, caller }) => {
        const members = await membersOf(caller.token, fx.roleSetId);
        for (const role of [
          RoleName.Associate,
          RoleName.Admin,
          RoleName.Owner,
        ]) {
          expect(members[role], role).not.toContain(fx.removeTarget);
        }
      },
    },

    // APPROVE is the one cell where a role that holds UPDATE but not GRANT
    // (Content Full Access) gets a SUCCESS back: the resolver admits it and the
    // lifecycle guard then refuses the transition without raising an error. So
    // the refusal is judged on the STATE: when the call returned and the
    // application is not approved, nothing was granted, and that is reported as
    // the authorization denial it is. A call that returned AND approved stays
    // `ok`, so a negative that (wrongly) took effect still fails.
    'A23.eventOnApplication': {
      gate: ['eventOnApplication'],
      call: async (sdk, headers, fx, role) => {
        const applicationId = isAllowed('A23.eventOnApplication', role)
          ? fx.approveApplication
          : fx.denyApplication;
        const result = await sdk.eventOnApplication(
          { input: { applicationID: applicationId, eventName: 'APPROVE' } },
          headers
        );
        if (isAllowed('A23.eventOnApplication', role)) return result;
        if ((await stateOf(token(headers), applicationId)) !== 'approved') {
          throw {
            response: {
              errors: [
                {
                  message:
                    'APPROVE returned without an error but the application was not approved (the lifecycle guard needs GRANT)',
                  path: ['eventOnApplication'],
                  extensions: { code: 'FORBIDDEN_POLICY' },
                },
              ],
            },
          };
        }
        return result;
      },
      verify: async ({ fx, caller }) => {
        expect(await stateOf(caller.token, fx.approveApplication)).toEqual(
          'approved'
        );
        expect(
          (await membersOf(caller.token, fx.roleSetId))[RoleName.Associate]
        ).toContain(fx.approveApplicant);
      },
    },

    'A23.eventOnApplication#reject': {
      gate: ['eventOnApplication'],
      call: (sdk, headers, fx, role) =>
        sdk.eventOnApplication(
          {
            input: {
              applicationID:
                fx.rejectApplications[role] ?? fx.denyApplication,
              eventName: 'REJECT',
            },
          },
          headers
        ),
      verify: async ({ fx, role, caller }) =>
        expect(
          await stateOf(caller.token, fx.rejectApplications[role]!)
        ).toEqual('rejected'),
    },

    'A23.deleteInvitation': {
      gate: ['deleteInvitation'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteInvitation(
          {
            deleteData: {
              ID: fx.deleteInvitations[role] ?? fx.denyInvitation,
            },
          },
          headers
        ),
      verify: async ({ fx, role, caller }) =>
        expect(
          await gone(
            caller.token,
            INVITATION_EXISTS,
            fx.deleteInvitations[role]!
          )
        ).toBe(true),
    },

    'A23.deletePlatformInvitation': {
      gate: ['deletePlatformInvitation'],
      call: (sdk, headers, fx, role) =>
        sdk.DeletePlatformInvitation(
          {
            invitationId:
              fx.deleteEmailInvitations[role] ?? fx.denyEmailInvitation,
          },
          headers
        ),
      verify: async ({ fx, role, caller }) =>
        expect(
          await gone(
            caller.token,
            EMAIL_INVITATION_EXISTS,
            fx.deleteEmailInvitations[role]!
          )
        ).toBe(true),
    },

    // A nested field: the gate is the field itself, so an authorization error
    // on `lookup.roleSet.applications` is the refusal.
    'A23.applications': {
      gate: ['lookup', 'roleSet', 'applications'],
      call: (sdk, headers, fx) =>
        sdk.RoleSetPendingApplications({ roleSetId: fx.roleSetId }, headers),
      verify: async ({ fx, data }) =>
        expect(
          (
            data as {
              lookup: { roleSet: { applications: { id: string }[] } };
            }
          ).lookup.roleSet.applications.map(a => a.id)
        ).toContain(fx.denyApplication),
    },
  },
};

