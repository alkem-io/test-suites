import { TestUser } from "../../../common/enums/test.user";
import type {
  ConversionVcSpaceToVcKnowledgeBaseInput,
  CreateVirtualContributorOnAccountInput,
  TransferAccountSpaceInput,
  UpdateBaselineLicensePlanOnAccount,
  UpdateVirtualContributorInput,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";

/** Everything an account hosts: VCs, packs, hubs and the space tree (L0 → L1 → L2 ids). */
export const readAccountResources = (
  accountId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadAccountResources({ accountId }, headers));

export const readInnovationPackVisibility = (
  innovationPackId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadInnovationPackVisibility({ innovationPackId }, headers),
  );

export const readInnovationPackTemplatesSet = (
  innovationPackId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadInnovationPackTemplatesSet({ innovationPackId }, headers),
  );

export const updateBaselineLicensePlanOnAccount = (
  updateData: UpdateBaselineLicensePlanOnAccount,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.updateBaselineLicensePlanOnAccount({ updateData }, headers),
  );

/** Move a space to another account. */
export const transferSpaceToAccount = (
  transferData: TransferAccountSpaceInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.TransferSpaceToAccount({ transferData }, headers),
  );

export const readVirtualContributorProfileTagsets = (
  virtualContributorId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadVirtualContributorProfileTagsets({ virtualContributorId }, headers),
  );

export const readVirtualContributorVisibility = (
  virtualContributorId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadVirtualContributorVisibility({ virtualContributorId }, headers),
  );

/** Update a VC (profile data, visibility …); returns the id only. */
export const updateVirtualContributorData = (
  virtualContributorData: UpdateVirtualContributorInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.UpdateVirtualContributorData({ virtualContributorData }, headers),
  );

/** Create a VC from a full input; returns id, profile url and the knowledge-base callouts set id. */
export const createVirtualContributorWithData = (
  virtualContributorData: CreateVirtualContributorOnAccountInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.CreateVirtualContributorWithData({ virtualContributorData }, headers),
  );

export const convertVirtualContributorToUseKnowledgeBase = (
  conversionData: ConversionVcSpaceToVcKnowledgeBaseInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.PlatformRolesConvertVirtualContributorToUseKnowledgeBase(
      { conversionData },
      headers,
    ),
  );
