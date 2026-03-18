import { updateUser } from '@functional-api/contributor-management/user/user.request.params';
import {
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { createPostOnCallout } from '../callout/post/post.request.params';
import {
  adminSearchIngestFromScratch,
  searchContributors,
  searchResponses,
  searchSpaces,
  // searchJourney,
} from './search.request.params';
import {
  updateSpaceLocation,
  deleteSpace,
  createSpaceAndGetData,
  updateSpaceSettings,
  updateSpacePlatformSettings,
} from '../journey/space/space.request.params';

import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { SpaceVisibility, SpacePrivacyMode } from '@alkemio/client-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

let secondSpaceId = '';
const userName = 'qa user';
const country = 'Bulgaria';
const city = 'Sofia';
let organizationNameText = '';
let organizationIdTest = '';
const postNameIdSpace = 'qa-space' + uniqueId;
let postSpaceId = '';
let postSubspaceId = '';
let postSubsubspaceId = '';
const postNameIdSubspace = 'qa-chal' + uniqueId;
const postNameIdSubsubspace = 'qa-opp' + uniqueId;

//const filterOnlyUser = ['user'];
const filterNo: never[] = [];
const termUserOnly = ['user'];
const termAll = ['qa'];
const termFullUserName = ['qa user'];
const termLocation = ['sofia'];
const termWord = ['search'];
const termNotExisting = ['notexisting'];
const termTooLong = [
  'qa',
  'user',
  'qa',
  'user',
  'qa',
  'user',
  'qa',
  'user',
  'qa',
  'user',
  'qa',
];

//const termAllScored = ['qa', 'qa', 'user'];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'search',
  space: {
    collaboration: {
      addPostCollectionCallout: true,
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addPostCollectionCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {
        collaboration: {
          addPostCollectionCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};
beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  organizationNameText = `qa organizationNameText ${uniqueId}`;

  await updateUser(TestUserManager.users.qaUser.id, '+359777777771', {
    location: { country: country, city: city },
  });

  await updateOrganization(baseScenario.organization.id, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'website',
    contactEmail: 'contactEmail@mail.com',
    profileData: {
      location: { country: country, city: city },
    },
  });
  await updateSpaceLocation(
    baseScenario.space.id,
    country,
    city,
    TestUser.GLOBAL_ADMIN
  );
  await updateSpaceLocation(
    baseScenario.subspace.id,
    country,
    city,
    TestUser.GLOBAL_ADMIN
  );
  await updateSpaceLocation(
    baseScenario.subsubspace.id,
    country,
    city,
    TestUser.GLOBAL_ADMIN
  );

  const responseCreateOrganization = await createOrganization(
    organizationNameText,
    'qa-org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.data?.createOrganization.id ?? '';

  const resSpace = await createPostOnCallout(
    baseScenario.space.collaboration.calloutPostCollectionId,
    { displayName: postNameIdSpace },
    postNameIdSpace
  );
  postSpaceId = resSpace.data?.createContributionOnCallout.post?.id ?? '';

  const resSubspace = await createPostOnCallout(
    baseScenario.subspace.collaboration.calloutPostCollectionId,
    { displayName: postNameIdSubspace },
    postNameIdSubspace
  );
  postSubspaceId = resSubspace.data?.createContributionOnCallout.post?.id ?? '';

  const resSubsubspace = await createPostOnCallout(
    baseScenario.subsubspace.collaboration.calloutPostCollectionId,
    { displayName: postNameIdSubsubspace },
    postNameIdSubsubspace
  );
  postSubsubspaceId =
    resSubsubspace.data?.createContributionOnCallout.post?.id ?? '';

  await adminSearchIngestFromScratch();
  await delay(15000);
});

afterAll(async () => {
  await deleteSpace(secondSpaceId);
  await deleteOrganization(organizationIdTest);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Search', () => {
  describe('Search types', () => {
    test('should search CONTRIBUTOR data', async () => {
      // Act
      const responseSearchData = await searchContributors(termAll);
      const result = responseSearchData.data?.search;

      // Assert
      expect(result?.actorResults.results).toHaveLength(2);
      expect(result?.actorResults.results).toContainObject({
        type: 'USER',
        user: {
          id: TestUserManager.users.qaUser.id,
          profile: {
            displayName: `${userName}`,
          },
        },
      });

      expect(result?.actorResults.results).toContainObject({
        type: 'ORGANIZATION',
        organization: {
          id: `${organizationIdTest}`,
          profile: {
            displayName: `${organizationNameText}`,
          },
        },
      });
    });

    test('should search JOURNEY data', async () => {
      // Act
      const responseSearchData = await searchSpaces(termWord);
      const resultJourney =
        responseSearchData.data?.search.spaceResults.results;

      // Assert
      expect(resultJourney).toHaveLength(3);
      expect(resultJourney).toContainObject({
        type: 'SPACE',
        parentSpace: null,
        space: {
          id: baseScenario.space.id,
          level: 'L0',
          visibility: 'ACTIVE',
        },
      });
      expect(resultJourney).toContainObject({
        type: 'SUBSPACE',
        parentSpace: {
          id: baseScenario.space.id,
          level: 'L0',
          visibility: 'ACTIVE',
        },
        space: {
          id: baseScenario.subspace.id,
          level: 'L1',
          visibility: 'ACTIVE',
        },
      });
      expect(resultJourney).toContainObject({
        type: 'SUBSPACE',
        parentSpace: {
          id: baseScenario.subspace.id,
          level: 'L1',
          visibility: 'ACTIVE',
        },
        space: {
          id: baseScenario.subsubspace.id,
          level: 'L2',
          visibility: 'ACTIVE',
        },
      });
    });

    test('should search CONTRIBUTION data', async () => {
      // Act
      const responseSearchData = await searchResponses(termAll);
      const resultContribution = responseSearchData.data?.search;
      const contributionResults =
        resultContribution?.contributionResults.results;

      // Assert
      expect(resultContribution?.contributionResults.results).toHaveLength(3);
      expect(contributionResults).toContainObject({
        type: 'POST',
        space: {
          id: baseScenario.space.id,
          level: 'L0',
          visibility: 'ACTIVE',
        },

        callout: {
          id: baseScenario.space.collaboration.calloutPostCollectionId,
          framing: {
            profile: { displayName: 'postCollectionCallout-search' },
          },
        },
        post: {
          id: postSpaceId,
          profile: {
            displayName: postNameIdSpace,
          },
        },
      });
      expect(contributionResults).toContainObject({
        type: 'POST',
        space: {
          id: baseScenario.subspace.id,
          level: 'L1',
          visibility: 'ACTIVE',
        },

        callout: {
          id: baseScenario.subspace.collaboration.calloutPostCollectionId,
          framing: {
            profile: { displayName: 'postCollectionCallout-search' },
          },
        },
        post: {
          id: postSubspaceId,
          profile: {
            displayName: postNameIdSubspace,
          },
        },
      });
      expect(contributionResults).toContainObject({
        type: 'POST',

        space: {
          id: baseScenario.subsubspace.id,
          level: 'L2',
          visibility: 'ACTIVE',
        },

        callout: {
          id: baseScenario.subsubspace.collaboration.calloutPostCollectionId,
          framing: {
            profile: { displayName: 'postCollectionCallout-search' },
          },
        },
        post: {
          id: postSubsubspaceId,
          profile: {
            displayName: postNameIdSubsubspace,
          },
        },
      });
    });
  });
  test('should search with all filters applied', async () => {
    // Act
    const responseSearchData = await searchContributors(termAll);
    const result = responseSearchData.data?.search.actorResults.results;

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContainObject({
      type: 'USER',
      user: {
        id: TestUserManager.users.qaUser.id,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(result).toContainObject({
      type: 'ORGANIZATION',
      organization: {
        id: `${organizationIdTest}`,
        profile: {
          displayName: `${organizationNameText}`,
        },
      },
    });
  });

  test('should search by full user name', async () => {
    // Act
    const responseSearchData = await searchContributors(termFullUserName);
    const result = responseSearchData.data?.search.actorResults.results;

    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContainObject({
      type: 'USER',
      user: {
        id: TestUserManager.users.qaUser.id,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(result).toContainObject({
      type: 'ORGANIZATION',
      organization: {
        id: `${organizationIdTest}`,
        profile: {
          displayName: `${organizationNameText}`,
        },
      },
    });
  });

  test('should search with common word filter applied', async () => {
    // Act
    const responseContributior = await searchContributors(termWord);
    const resultContrbutor =
      responseContributior.data?.search.actorResults.results;
    const responseSearchData = await searchSpaces(termWord);
    const resultJourney = responseSearchData.data?.search.spaceResults.results;

    // Assert
    expect(resultContrbutor).toHaveLength(1);
    expect(resultJourney).toHaveLength(3);
    expect(resultContrbutor).not.toContainObject({
      type: 'USER',
      user: {
        id: TestUserManager.users.qaUser.id,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(resultContrbutor).toContainObject({
      type: 'ORGANIZATION',
      organization: {
        id: baseScenario.organization.id,
        profile: {
          displayName: baseScenario.organization.profile.displayName,
        },
      },
    });
    expect(resultJourney).toContainObject({
      type: 'SPACE',
      space: {
        id: baseScenario.space.id,
        level: 'L0',
        visibility: 'ACTIVE',
      },
    });
    expect(resultJourney).toContainObject({
      type: 'SUBSPACE',
      space: {
        id: baseScenario.subspace.id,
        level: 'L1',
        visibility: 'ACTIVE',
      },
    });
    expect(resultJourney).toContainObject({
      type: 'SUBSPACE',
      space: {
        id: baseScenario.subsubspace.id,
        level: 'L2',
        visibility: 'ACTIVE',
      },
    });
  });

  test('should search with location filter applied for all entities', async () => {
    // Act
    const responseContributior = await searchContributors(termLocation);
    const resultContrbutor =
      responseContributior.data?.search.actorResults.results;
    const responseSearchData = await searchSpaces(termLocation);
    const journeyResults = responseSearchData.data?.search.spaceResults.results;

    // Assert
    expect(resultContrbutor).toHaveLength(2);
    expect(journeyResults).toHaveLength(3);
    expect(resultContrbutor).toContainObject({
      type: 'USER',
      user: {
        id: TestUserManager.users.qaUser.id,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(resultContrbutor).toContainObject({
      type: 'ORGANIZATION',
      organization: {
        id: baseScenario.organization.id,
        profile: {
          displayName: baseScenario.organization.profile.displayName,
        },
      },
    });

    expect(journeyResults).toContainObject({
      type: 'SUBSPACE',
      space: {
        id: baseScenario.subsubspace.id,
        level: 'L2',
        visibility: 'ACTIVE',
      },
    });

    expect(journeyResults).toContainObject({
      type: 'SUBSPACE',
      space: {
        id: baseScenario.subspace.id,
        level: 'L1',
        visibility: 'ACTIVE',
      },
    });

    expect(journeyResults).toContainObject({
      type: 'SPACE',
      space: {
        id: baseScenario.space.id,
        level: 'L0',
        visibility: 'ACTIVE',
      },
    });
  });

  // now returns results up to the limit - to be verified if new expectation is correct
  test.skip('should search without filters', async () => {
    // Act
    const responseContributior = await searchContributors(filterNo);
    const responseJourney = await searchSpaces(filterNo);

    // Assert
    expect(
      responseContributior.data?.search.actorResults.results
    ).toHaveLength(3);

    expect(responseJourney.data?.search.spaceResults.results).toHaveLength(0);
  });

  test('should search term users only', async () => {
    // Act
    const responseContributior = await searchContributors(termUserOnly);
    const resultContrbutor =
      responseContributior.data?.search.actorResults.results;

    // Assert
    expect(resultContrbutor).toHaveLength(3);
    expect(resultContrbutor).toContainObject({
      type: 'USER',
      user: {
        id: TestUserManager.users.qaUser.id,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(resultContrbutor).not.toContainObject({
      type: 'ORGANIZATION',
      organization: {
        id: `${organizationIdTest}`,
        profile: {
          displayName: `${organizationNameText}`,
        },
      },
    });
  });

  describe('Search negative scenarios', () => {
    test('should throw limit error for too many terms', async () => {
      // Act
      const { error: searchContributorError } =
        await searchContributors(termTooLong);
      // Assert
      expect(searchContributorError?.errors[0].message).toContain(
        'Maximum number of search terms is 10; supplied: 11'
      );

      const { error: searchJourneyError } = await searchSpaces(termTooLong);
      expect(searchJourneyError?.errors[0].message).toContain(
        'Maximum number of search terms is 10; supplied: 11'
      );
    });

    // now returns results up to the limit - to be verified if new expectation is correct
    test.skip('should throw error for empty string search', async () => {
      // Act
      const { error } = await searchContributors(' ');
      // Assert
      expect(error?.errors[0].message).toContain(
        'Search: Skipping term below minimum length: '
      );
    });

    test('should not return any results for invalid term', async () => {
      // Act
      const responseSearchData = await searchContributors(termNotExisting);

      // Assert
      expect(
        responseSearchData.data?.search.actorResults.results
      ).toEqual([]);
    });
  });

  describe('Search filtered Space Data', () => {
    const secondSpaceName = 'search-space2' + uniqueId;

    beforeAll(async () => {
      const res = await createSpaceAndGetData(
        secondSpaceName,
        secondSpaceName,
        baseScenario.organization.accountId
      );
      secondSpaceId = res.data?.lookup?.space?.id ?? '';
    });

    afterAll(async () => {
      await deleteSpace(secondSpaceId);
    });

    // skip until bug is fixed: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/5114
    test.skip('should search JOURNEY data filtered space', async () => {
      // Act
      const responseSearchData = await searchSpaces(
        [secondSpaceName],
        TestUser.GLOBAL_ADMIN,
        baseScenario.space.id
      );
      const resultJourney =
        responseSearchData.data?.search.spaceResults.results;
      // const journeyResults = resultJourney?.journeyResults;

      // Assert
      expect(resultJourney).toHaveLength(2);
      expect(resultJourney).toContainObject({
        type: 'SUBSPACE',
        space: {
          id: baseScenario.subspace.id,
          level: 'L1',
          visibility: 'ACTIVE',
        },
      });
      expect(resultJourney).toContainObject({
        type: 'SUBSPACE',
        space: {
          id: baseScenario.subsubspace.id,
          level: 'L2',
          visibility: 'ACTIVE',
        },
      });
    });

    test('should search JOURNEY data filtered empty space', async () => {
      // Act
      const responseSearchData = await searchSpaces(
        termWord,
        TestUser.GLOBAL_ADMIN,
        secondSpaceId
      );
      const resultJourney =
        responseSearchData.data?.search.spaceResults.results;

      // Assert
      expect(resultJourney).toHaveLength(0);
    });
  });

  describe('Search Archived Space Data', () => {
    beforeAll(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        baseScenario.space.nameId,
        SpaceVisibility.Archived
      );
    });

    test.each`
      userRole
      ${TestUser.SPACE_ADMIN}
      ${TestUser.SPACE_MEMBER}
      ${TestUser.NON_SPACE_MEMBER}
    `(
      'User: "$userRole" should not receive Space / Subspace / Subsubspace data',
      async ({ userRole }) => {
        const responseSearchData = await searchSpaces(
          termLocation,

          userRole
        );
        const resultJourney =
          responseSearchData.data?.search.spaceResults.results;

        expect(resultJourney).not.toContainObject({
          type: 'SUBSPACE',
          space: {
            id: baseScenario.subsubspace.id,
            level: 'L2',
            visibility: 'ACTIVE',
          },
        });

        expect(resultJourney).not.toContainObject({
          type: 'SUBSPACE',
          space: {
            id: baseScenario.subspace.id,
            level: 'L1',
            visibility: 'ACTIVE',
          },
        });

        expect(resultJourney).not.toContainObject({
          type: 'SPACE',
          space: {
            id: baseScenario.space.id,
            level: 'L0',
            visibility: 'ACTIVE',
          },
        });
      }
    );

    test('GA get results for archived spaces', async () => {
      const responseSearchData = await searchSpaces(
        termLocation,

        TestUser.GLOBAL_ADMIN
      );
      const resultJourney =
        responseSearchData.data?.search.spaceResults.results;

      // Assert
      expect(resultJourney).toHaveLength(3);
    });
  });

  describe.skip('Search IN Public Space Private Subspace Data', () => {
    beforeAll(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        baseScenario.space.nameId,
        SpaceVisibility.Active
      );

      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });

      await updateSpaceSettings(baseScenario.subspace.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });
    });

    // skip until bug is fixed: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/5114
    test.skip.each`
      userRole                       | numberResults
      ${TestUser.SPACE_ADMIN}        | ${2}
      ${TestUser.SPACE_MEMBER}       | ${0}
      ${TestUser.SUBSPACE_ADMIN}     | ${2}
      ${TestUser.SUBSPACE_MEMBER}    | ${2}
      ${TestUser.SUBSUBSPACE_ADMIN}  | ${2}
      ${TestUser.SUBSUBSPACE_MEMBER} | ${2}
      ${TestUser.NON_SPACE_MEMBER}   | ${0}
    `(
      'User: "$userRole" should get "$numberResults" results for Subspace / Subsubspace data',
      async ({ userRole, numberResults }) => {
        const responseSearchData = await searchSpaces(
          termWord,
          userRole,
          baseScenario.space.id
        );
        const resultJourney =
          responseSearchData.data?.search.spaceResults.results;
        expect(resultJourney).toHaveLength(numberResults);
      }
    );
  });

  describe('Search Public Space Private Subspace Data', () => {
    beforeAll(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        baseScenario.space.nameId,
        SpaceVisibility.Active
      );

      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });

      await updateSpaceSettings(baseScenario.subspace.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });
    });

    test.each`
      userRole                       | numberResults
      ${TestUser.SPACE_ADMIN}        | ${3}
      ${TestUser.SPACE_MEMBER}       | ${1}
      ${TestUser.SUBSPACE_ADMIN}     | ${3}
      ${TestUser.SUBSPACE_MEMBER}    | ${3}
      ${TestUser.SUBSUBSPACE_ADMIN}  | ${3}
      ${TestUser.SUBSUBSPACE_MEMBER} | ${3}
      ${TestUser.NON_SPACE_MEMBER}   | ${1}
    `(
      'User: "$userRole" should get "$numberResults" results for Space /  Subspace / Subsubspace data',
      async ({ userRole, numberResults }) => {
        const responseSearchData = await searchSpaces(termWord, userRole);
        const resultJourney =
          responseSearchData.data?.search.spaceResults.results;
        expect(resultJourney).toHaveLength(numberResults);
      }
    );
  });

  describe('Search Private Space Private Subspace Data', () => {
    beforeAll(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        baseScenario.space.nameId,
        SpaceVisibility.Active
      );

      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });

      await updateSpaceSettings(baseScenario.subspace.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });
    });

    test.each`
      userRole                       | numberResults
      ${TestUser.SPACE_ADMIN}        | ${3}
      ${TestUser.SPACE_MEMBER}       | ${1}
      ${TestUser.SUBSPACE_ADMIN}     | ${3}
      ${TestUser.SUBSPACE_MEMBER}    | ${3}
      ${TestUser.SUBSUBSPACE_ADMIN}  | ${3}
      ${TestUser.SUBSUBSPACE_MEMBER} | ${3}
      ${TestUser.NON_SPACE_MEMBER}   | ${1}
    `(
      'User: "$userRole" should get "$numberResults" results for Space / Subspace / Subsubspace data',
      async ({ userRole, numberResults }) => {
        const responseSearchData = await searchSpaces(
          termWord,

          userRole
        );
        const resultJourney =
          responseSearchData.data?.search.spaceResults.results;
        expect(resultJourney).toHaveLength(numberResults);
      }
    );
  });
});
