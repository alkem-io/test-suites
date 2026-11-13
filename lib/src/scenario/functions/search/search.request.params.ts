import { TestUser } from "../../../common/enums/test.user";
import {
  SearchCategory,
  SearchResultType,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";

/** Rebuild the search indices from the database. The ingest runs on after the call returns. */
export const ingestSearchFromScratch = (
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) => sdk.AdminSearchIngestFromScratch({}, headers));

/**
 * A background task's status (`IN_PROGRESS` | `COMPLETED` | `ERRORED`), its
 * errors and its progress; e.g. the task `ingestSearchFromScratch` returns.
 */
export const readTask = (
  id: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadTask({ id }, headers));

/**
 * How long a from-scratch ingest may take before the new indices go live (the
 * aliases swap only at the end). A large database takes minutes: about 4.5 on
 * a local copy of the platform. Override with SEARCH_INGEST_TIMEOUT_MS.
 */
export const searchIngestTimeoutMs = (): number =>
  Number(process.env.SEARCH_INGEST_TIMEOUT_MS) || 360_000;

/**
 * Search Spaces and Subspaces for the terms, one page of `size`; the result
 * carries `spaceResults.total` (every result the actor may see) and the
 * `cursor` to the next page (null on the last).
 */
export const searchSpacesAndSubspaces = (
  terms: string[],
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
  size = 3,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.search(
      {
        searchData: {
          terms,
          filters: [
            {
              category: SearchCategory.Spaces,
              size,
              types: [SearchResultType.Space, SearchResultType.Subspace],
              countTotal: true,
            },
          ],
        },
      },
      headers,
    ),
  );

/**
 * Search posts (callouts) for the terms, folded to the containing callout the
 * way the Space sidebar search widget asks. `scope.spaceID` narrows to one
 * Space (`searchInSpaceFilter`), `scope.flowStateID` to one tab of it
 * (`searchInFlowStateFilter`); with neither, the search is platform wide. Each
 * result carries `callout.framing.profile.displayName` and the `space` it
 * belongs to.
 */
export const searchCallouts = (
  terms: string[],
  scope: { spaceID?: string; flowStateID?: string } = {},
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
  size = 20,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.search(
      {
        searchData: {
          terms,
          searchInSpaceFilter: scope.spaceID,
          searchInFlowStateFilter: scope.flowStateID,
          foldCalloutResources: true,
          filters: [
            {
              category: SearchCategory.CollaborationTools,
              size,
              types: [SearchResultType.Callout],
            },
          ],
        },
      },
      headers,
    ),
  );
