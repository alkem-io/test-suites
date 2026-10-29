import { TestUser } from "../../../common/enums/test.user";
import type {
  RemoveRoleOnRoleSetInput,
  UpdateOrganizationInput,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";

export const readOrganizationProfileTagsets = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationProfileTagsets({ organizationId }, headers),
  );

/** The organization's verification record (id + status). */
export const readOrganizationVerification = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationVerification({ organizationId }, headers),
  );

export const readOrganizationAccount = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationAccount({ organizationId }, headers),
  );

/** The spaces (with subspaces) an organization holds roles in. */
export const readOrganizationSpaceRoles = (
  actorID: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationSpaceRoles({ actorID }, headers),
  );

/** The organization's role set id and its authorization id. */
export const readOrganizationRoleSet = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationRoleSet({ organizationId }, headers),
  );

export const readOrganizationRoleSetApplications = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationRoleSetApplications({ organizationId }, headers),
  );

export const readOrganizationRoleSetInvitations = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationRoleSetInvitations({ organizationId }, headers),
  );

export const readOrganizationRoleSetPlatformInvitations = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationRoleSetPlatformInvitations({ organizationId }, headers),
  );

/** All three organization-rooted pending lists in one read. */
export const readOrganizationRoleSetPending = (
  organizationId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadOrganizationRoleSetPending({ organizationId }, headers),
  );

/** Whether the actor may apply to / join the organization, and why not. */
export const readOrganizationAssociateEligibility = (
  organizationId: string,
  actor: GraphqlActor,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.GetOrganizationAssociateEligibility({ organizationId }, headers),
  );

/** Update an organization (domain, website, profile …); returns the id only. */
export const updateOrganizationData = (
  organizationData: UpdateOrganizationInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateOrganizationData({ organizationData }, headers),
  );

/** Remove an organization from a role on a role set. */
export const removeRoleFromOrganization = (
  roleData: RemoveRoleOnRoleSetInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.RemoveRoleFromOrganization({ roleData }, headers),
  );
