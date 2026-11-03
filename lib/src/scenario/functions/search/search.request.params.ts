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
