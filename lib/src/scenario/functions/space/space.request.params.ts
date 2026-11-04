import { TestUser } from "../../../common/enums/test.user";
import type {
  CreateSpaceOnAccountInput,
  CreateSubspaceInput,
  UpdateCommunityGuidelinesEntityInput,
  UpdateInnovationFlowStateSettingsInput,
  UpdateInnovationFlowStatesSortOrderInput,
  UpdateSpaceInput,
  UpdateSpaceSettingsInput,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";

/** Create an L0 space from a full input; returns the ids a fixture needs next (role set, callouts set, url). */
export const createSpaceOnAccount = (
  spaceData: CreateSpaceOnAccountInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.CreateSpaceOnAccount({ spaceData }, headers));

/** Create a subspace from a full input; same return shape as `createSpaceOnAccount`. */
export const createSubspaceWithData = (
  subspaceData: CreateSubspaceInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.CreateSubspaceWithData({ subspaceData }, headers),
  );

/**
 * Create an L0 space from a full input and read back only its id — the one
 * field the creating (non-platform-admin) user may select in the same
 * mutation, since the new space's policies land a beat after the create.
 */
export const createSpaceOnAccountId = (
  spaceData: CreateSpaceOnAccountInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.createSpace({ spaceData }, headers));

/**
 * Update a space's settings from a full input, exactly as given — no defaults
 * are filled in for the blocks the caller omits (unlike `updateSpaceSettings`,
 * which rewrites membership and collaboration with harness defaults).
 */
export const updateSpaceSettingsData = (
  settingsData: UpdateSpaceSettingsInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.UpdateSpaceSettings({ settingsData }, headers));

/** Update a space (about, profile, visibility …); returns the id only. */
export const updateSpaceData = (
  spaceData: UpdateSpaceInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.UpdateSpaceData({ spaceData }, headers));

export const readSpaceLevelAndVisibility = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadSpaceLevelAndVisibility({ spaceId }, headers),
  );

/** The full settings block of a space (privacy, membership, collaboration). */
export const readSpaceSettings = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadSpaceSettings({ spaceId }, headers));

export const readSpaceMyPrivileges = (spaceId: string, actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadSpaceMyPrivileges({ spaceId }, headers));

/**
 * A subspace read through its parent by nameID — id, nameID, level, display
 * name and URL. A hit is the parent edge; `level` is the depth. Errors (or a
 * null subspace) when the actor may not read it or it is not a child of that
 * parent.
 */
export const readSubspaceByNameId = (
  parentSpaceId: string,
  nameID: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadSubspaceByNameId({ parentSpaceId, nameID }, headers),
  );

/**
 * A space and its two levels of subspaces (id, nameID, level) — the input a
 * leaves-first teardown needs; the server refuses to delete a space that
 * still has subspaces.
 */
export const readSpaceSubspaceTree = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadSpaceSubspaceTree({ spaceId }, headers),
  );

/** A space's about section: why/who, profile displayName/tagline/description/url and tags. */
export const readSpaceAbout = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadSpaceAbout({ spaceId }, headers));

/** The ids hanging off a space: role set, membership role set, collaboration and callouts set. */
export const readSpaceRefs = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadSpaceRefs({ spaceId }, headers));

/** The callouts of a space with their display names. */
export const readSpaceCalloutNames = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadSpaceCalloutNames({ spaceId }, headers));

/** The innovation-flow states of a space with their sidebar/visibility settings. */
export const readSpaceInnovationFlowStates = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadSpaceInnovationFlowStates({ spaceId }, headers),
  );

export const updateInnovationFlowStateSettings = (
  innovationFlowStateID: string,
  settings: UpdateInnovationFlowStateSettingsInput | undefined,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateInnovationFlowState(
      { stateData: { innovationFlowStateID, settings } },
      headers,
    ),
  );

export const updateInnovationFlowStatesSortOrder = (
  sortOrderData: UpdateInnovationFlowStatesSortOrderInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateInnovationFlowStatesSortOrder({ sortOrderData }, headers),
  );

export const readSpaceGuidelinesId = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadSpaceGuidelinesId({ spaceId }, headers));

export const updateCommunityGuidelines = (
  communityGuidelinesData: UpdateCommunityGuidelinesEntityInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateCommunityGuidelinesData({ communityGuidelinesData }, headers),
  );

/** The space's templates-set id and its about-profile tagset id. */
export const readSpaceTemplatesManager = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadSpaceTemplatesManager({ spaceId }, headers),
  );

/** The sibling spaces of the same account the Spaces-callout picker offers. */
export const readSpaceAccountSpaces = (
  spaceId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadSpaceAccountSpaces({ spaceId }, headers));

/** The classification entries of a space, in API order. */
export const readSpaceClassifications = (spaceId: string, actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadSpaceClassifications({ spaceId }, headers));

export const assignLicensePlanToSpace = (
  spaceID: string,
  licensePlanID: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.AssignLicensePlanToSpaceById({ planData: { spaceID, licensePlanID } }, headers),
  );
