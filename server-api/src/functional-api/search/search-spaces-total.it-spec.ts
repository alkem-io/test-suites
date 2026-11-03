/**
 * Spaces search: exact `total` and cursor pagination.
 *
 * The server counts the Spaces and Subspaces the requester may see, so
 * `spaceResults.total` follows the privacy settings as they are now, without
 * a re-ingest, and the cursor is null on the last page.
 */
import {
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  SearchResultType,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { updateSpaceSettings } from '../journey/space/space.request.params';
import {
  adminSearchIngestFromScratch,
  searchSpacesPage,
} from './search.request.params';

// A run-unique word in every space's display name ("l0-<word>-…", "l1-<word>",
// "l2-<word>"), so the search matches this file's three spaces and nothing else.
const word = `srchtot${UniqueIDGenerator.getID()}`;
const terms = [word];

const scenarioConfig: TestScenarioConfig = {
  name: word,
  space: {
    community: {
      members: [TestUser.SUBSPACE_MEMBER],
    },
    subspace: {
      community: {
        members: [TestUser.SUBSPACE_MEMBER],
      },
      subspace: {},
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let allSpaceIds: string[] = [];

// The results are a union of every search result type; Spaces carry `space`.
const spaceIds = (results: ReadonlyArray<object> | undefined): string[] =>
  (results ?? []).map(result =>
    'space' in result ? ((result.space as { id: string }).id ?? '') : ''
  );

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  allSpaceIds = [
    baseScenario.space.id,
    baseScenario.subspace.id,
    baseScenario.subsubspace.id,
  ];

  await updateSpaceSettings(baseScenario.space.id, {
    privacy: { mode: SpacePrivacyMode.Public },
  });
  await updateSpaceSettings(baseScenario.subspace.id, {
    privacy: { mode: SpacePrivacyMode.Public },
  });

  await adminSearchIngestFromScratch();
  await delay(15000);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Search Spaces - total and pagination', () => {
  test('counts every matching Space and Subspace and ends on the first page when they fit', async () => {
    const response = await searchSpacesPage(terms, TestUser.GLOBAL_ADMIN, {
      size: 3,
    });
    const spaceResults = response.data?.search.spaceResults;

    expect(spaceResults?.total).toBe(3);
    expect(spaceIds(spaceResults?.results).sort()).toEqual(
      [...allSpaceIds].sort()
    );
    expect(spaceResults?.cursor ?? null).toBeNull();
  });

  test('pages through the results with the cursor, returning each result once', async () => {
    const first = await searchSpacesPage(terms, TestUser.GLOBAL_ADMIN, {
      size: 2,
    });
    const firstPage = first.data?.search.spaceResults;

    expect(firstPage?.total).toBe(3);
    expect(firstPage?.results).toHaveLength(2);
    expect(firstPage?.cursor).toBeTruthy();

    const second = await searchSpacesPage(terms, TestUser.GLOBAL_ADMIN, {
      size: 2,
      cursor: firstPage?.cursor,
    });
    const secondPage = second.data?.search.spaceResults;

    expect(secondPage?.total).toBe(3);
    expect(secondPage?.results).toHaveLength(1);
    expect(secondPage?.cursor ?? null).toBeNull();
    expect(
      [...spaceIds(firstPage?.results), ...spaceIds(secondPage?.results)].sort()
    ).toEqual([...allSpaceIds].sort());
  });

  test.each`
    types                          | expectedTotal
    ${[SearchResultType.Space]}    | ${1}
    ${[SearchResultType.Subspace]} | ${2}
  `(
    'narrows the results and the total to types $types',
    async ({ types, expectedTotal }) => {
      const response = await searchSpacesPage(terms, TestUser.GLOBAL_ADMIN, {
        size: 3,
        types,
      });
      const spaceResults = response.data?.search.spaceResults;

      expect(spaceResults?.total).toBe(expectedTotal);
      expect(spaceResults?.results).toHaveLength(expectedTotal);
      expect(
        spaceResults?.results.every(result => types.includes(result.type))
      ).toBe(true);
    }
  );

  test('does not count results when the search is scoped to a Space', async () => {
    const response = await searchSpacesPage(terms, TestUser.GLOBAL_ADMIN, {
      size: 3,
      searchInSpaceFilter: baseScenario.space.id,
    });

    expect(response.data?.search.spaceResults.total).toBe(-1);
  });

  describe('Public Space, Private Subspace', () => {
    beforeAll(async () => {
      // No re-ingest: visibility is checked against the database at query time.
      await updateSpaceSettings(baseScenario.subspace.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });
    });

    afterAll(async () => {
      await updateSpaceSettings(baseScenario.subspace.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test.each`
      userRole                     | expectedTotal
      ${TestUser.GLOBAL_ADMIN}     | ${3}
      ${TestUser.SUBSPACE_MEMBER}  | ${3}
      ${TestUser.NON_SPACE_MEMBER} | ${1}
    `(
      'User "$userRole" is told about the $expectedTotal results they may see',
      async ({ userRole, expectedTotal }) => {
        const response = await searchSpacesPage(terms, userRole, { size: 3 });
        const spaceResults = response.data?.search.spaceResults;

        expect(spaceResults?.total).toBe(expectedTotal);
        expect(spaceResults?.results).toHaveLength(expectedTotal);
      }
    );

    test('a non-member gets a full first page and no cursor to hidden results', async () => {
      const response = await searchSpacesPage(
        terms,
        TestUser.NON_SPACE_MEMBER,
        { size: 1 }
      );
      const spaceResults = response.data?.search.spaceResults;

      expect(spaceIds(spaceResults?.results)).toEqual([baseScenario.space.id]);
      expect(spaceResults?.cursor ?? null).toBeNull();
    });
  });
});
