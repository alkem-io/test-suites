import { TestUser } from "../../../common/enums/test.user";
import type {
  CreateNvpInput,
  InviteForEntryRoleOnRoleSetMutationVariables,
  RoleName,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";

export const readRoleSetUsersInRole = (
  roleSetId: string,
  role: RoleName,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadRoleSetUsersInRole({ roleSetId, role }, headers),
  );

export const readRoleSetUsersInRoles = (
  roleSetId: string,
  roles: RoleName[],
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadRoleSetUsersInRoles({ roleSetId, roles }, headers),
  );

export const readRoleSetOrganizationsInRoles = (
  roleSetId: string,
  roles: RoleName[],
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadRoleSetOrganizationsInRoles({ roleSetId, roles }, headers),
  );

/** Invitations on a role set with their state and invited actor id. */
export const readRoleSetInvitations = (
  roleSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadRoleSetInvitations({ roleSetId }, headers));

/** Applications on a role set (id + state) — one gated pending list per read. */
export const readRoleSetApplications = (
  roleSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.RoleSetPendingApplications({ roleSetId }, headers),
  );

/** Invitation ids + states on a role set — one gated pending list per read. */
export const readRoleSetInvitationIds = (
  roleSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.RoleSetPendingInvitations({ roleSetId }, headers),
  );

/** Platform (by-email) invitations on a role set, with email and suggested language. */
export const readRoleSetPlatformInvitations = (
  roleSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.RoleSetPendingPlatformInvitations({ roleSetId }, headers),
  );

/** All three pending lists of a role set in one read (needs GRANT + INVITE on all). */
export const readRoleSetPending = (
  roleSetId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.GetOrganizationRoleSetPending({ roleSetId }, headers),
  );

/** Apply, as the actor, for the entry role of a role set. */
export const applyForEntryRoleOnRoleSet = (
  roleSetID: string,
  actor: GraphqlActor,
  questions: CreateNvpInput[] = [],
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ApplyForEntryRoleOnRoleSet(
      { applicationData: { roleSetID, questions } },
      headers,
    ),
  );

/** Invite actors (by id) and/or emails to the entry role of a role set, with optional extra roles. */
export const inviteForEntryRoleOnRoleSet = (
  invitation: InviteForEntryRoleOnRoleSetMutationVariables,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.InviteForEntryRoleOnRoleSet(invitation, headers),
  );

/** Drive an invitation's lifecycle (ACCEPT, REJECT …) as the actor. */
export const eventOnInvitation = (
  invitationID: string,
  eventName: string,
  actor: GraphqlActor,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.EventOnInvitationState({ invitationID, eventName }, headers),
  );

/** Drive an application's lifecycle (APPROVE, REJECT …) as the actor. */
export const eventOnApplication = (
  applicationID: string,
  eventName: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.EventOnApplicationState({ applicationID, eventName }, headers),
  );

/**
 * Join, as the actor itself, the entry role of a role set whose membership
 * policy lets it in (OPEN, or a subspace whose parent it already belongs to).
 * The server-side half of the UI "Join" button; since workspace#027 Slice B
 * it is the only way an actor becomes a MEMBER of an L0 space without an
 * invitation or an application. Uses the lib's `joinRoleSet` document.
 */
export const joinRoleSet = (roleSetID: string, actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) =>
    sdk.joinRoleSet({ joinData: { roleSetID } }, headers),
  );
