/**
 * Lib-owned re-exports of the generated input/result TYPES a spec may name
 * (for a typed fixture or a typed result). Same rule as `enums/alkemio.ts`:
 * the spec imports from the lib barrel, the generated module stays private
 * to the lib.
 */
export type {
  CreateCalloutOnCalloutsSetInput,
  CreateContributionOnCalloutInput,
  CreateSpaceOnAccountInput,
  CreateSubspaceInput,
  CreateTemplateOnTemplatesSetInput,
  CreateVirtualContributorOnAccountInput,
  InviteForEntryRoleOnRoleSetMutation,
  NotificationSettingInput,
  RoleSetApplicationsInvitationsQuery,
  RoleSetPendingPlatformInvitationsQuery,
  SubmitCalloutFormResponseInput,
  UpdateCalloutEntityInput,
  UpdateCalloutFormInput,
  UpdateOrganizationInput,
  UpdateSpaceInput,
  UpdateUserInput,
  UpdateUserSettingsEntityInput,
  UpdateVirtualContributorInput,
} from "../../core/generated/alkemio-schema";
