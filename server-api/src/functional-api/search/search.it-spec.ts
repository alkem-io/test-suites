import { updateUser } from '@functional-api/contributor-management/user/user.request.params';
import { delay, TestUser } from '@alkemio/tests-lib';
import '@utils/array.matcher';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { TestUserManager } from '@src/scenario/TestUserManager';
import { createPostOnCallout } from '../callout/post/post.request.params';
import {
  adminSearchIngestFromScratch,
  // searchContributions,
  // searchContributor,
  searchGlobalSpaces,
  // searchJourney,
} from './search.request.params';
import {
  updateSpaceLocation,
  deleteSpace,
  createSpaceAndGetData,
  updateSpaceSettings,
  updateSpacePlatformSettings,
} from '../journey/space/space.request.params';
import { SpaceVisibility } from '@generated/graphql';
import { SpacePrivacyMode } from '@generated/graphql';
import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { TestScenarioFactory } from '@src/scenario/TestScenarioFactory';
import { OrganizationWithSpaceModel } from '@src/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@src/scenario/config/test-scenario-config';

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
const typeFilterAll = [
  'organization',
  'user',
  'space',
  'subspace',
  'subsubspace',
  'post',
];
const filterOnlyUser = ['user'];
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

const termAllScored = ['qa', 'qa', 'user'];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'search',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
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
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
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
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
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
    baseScenario.space.collaboration.calloutPostId,
    { displayName: postNameIdSpace },
    postNameIdSpace
  );
  postSpaceId = resSpace.data?.createContributionOnCallout.post?.id ?? '';

  const resSubspace = await createPostOnCallout(
    baseScenario.subspace.collaboration.calloutPostId,
    { displayName: postNameIdSubspace },
    postNameIdSubspace
  );
  postSubspaceId = resSubspace.data?.createContributionOnCallout.post?.id ?? '';

  const resSubsubspace = await createPostOnCallout(
    baseScenario.subsubspace.collaboration.calloutPostId,
    { displayName: postNameIdSubsubspace },
    postNameIdSubsubspace
  );
  postSubsubspaceId =
    resSubsubspace.data?.createContributionOnCallout.post?.id ?? '';

  const a = await adminSearchIngestFromScratch();
  await delay(10000);
  console.log('a', a);
});

afterAll(async () => {
  await deleteSpace(secondSpaceId);
  await deleteOrganization(organizationIdTest);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Search', () => {
  describe('Search types', () => {
    // test('should search CONTRIBUTOR data', async () => {
    //   // Act
    //   const responseSearchData = await searchContributor(
    //     termAll,
    //     typeFilterAll
    //   );
    //   const result = responseSearchData.data?.;

    //   // Assert
    //   expect(result?.contributorResultsCount).toEqual(2);
    //   expect(result?.contributorResults).toContainObject({
    //     terms: termAll,
    //    10,
    //     type: 'USER',
    //     user: {
    //       id: TestUserManager.users.qaUser.id,
    //       profile: {
    //         displayName: `${userName}`,
    //       },
    //     },
    //   });

    //   expect(result?.contributorResults).toContainObject({
    //     terms: termAll,
    //    10,
    //     type: 'ORGANIZATION',
    //     organization: {
    //       id: `${organizationIdTest}`,
    //       profile: {
    //         displayName: `${organizationNameText}`,
    //       },
    //     },
    //   });
    // });

    test('should search JOURNEY data', async () => {
      // Act
      const responseSearchData = await searchGlobalSpaces(
        termWord
        // typeFilterAll
      );
      const resultJourney = responseSearchData.data?.search;
      console.log('journeyResults', responseSearchData.error);

      const journeyResults = resultJourney?.spaceResults.results;
      console.log('journeyResults', journeyResults);

      // Assert
      expect(resultJourney?.spaceResults.results).toHaveLength(3);
      expect(journeyResults).toContainObject({
        type: 'SPACE',
        parentSpace: null,
        space: {
          id: baseScenario.space.id,
          level: 'L0',
          visibility: 'ACTIVE',
        },
      });
      expect(journeyResults).toContainObject({
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
      expect(journeyResults).toContainObject({
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

    // test('should search CONTRIBUTION data', async () => {
    //   // Act
    //   const responseSearchData = await searchContributions(
    //     termAll,
    //     typeFilterAll
    //   );
    //   const resultContribution = responseSearchData.data?.search;
    //   const contributionResults = resultContribution?.contributionResults;

    //   // Assert
    //   expect(resultContribution?.contributionResultsCount).toEqual(3);
    //   expect(contributionResults).toContainObject({
    //     terms: termAll,
    //    10,
    //     type: 'POST',
    //     space: {
    //       id: baseScenario.space.id,
    //       profile: {
    //         displayName: baseScenario.space.about.profile.displayName,
    //       },
    //     },
    //     subspace: null,
    //     subsubspace: null,
    //     callout: {
    //       id: baseScenario.space.collaboration.calloutPostId,
    //       framing: {
    //         profile: { displayName: 'Subspace proposals' },
    //       },
    //     },
    //     post: {
    //       id: postSpaceId,
    //       profile: {
    //         displayName: postNameIdSpace,
    //       },
    //     },
    //   });
    //   expect(contributionResults).toContainObject({
    //     terms: termAll,
    //    10,
    //     type: 'POST',
    //     space: {
    //       id: baseScenario.space.id,
    //       profile: {
    //         displayName: baseScenario.space.about.profile.displayName,
    //       },
    //     },
    //     subspace: {
    //       id: baseScenario.subspace.id,
    //       profile: {
    //         displayName: baseScenario.subspace.about.profile.displayName,
    //       },
    //     },
    //     subsubspace: null,
    //     callout: {
    //       id: baseScenario.subspace.collaboration.calloutPostId,
    //       framing: {
    //         profile: { displayName: 'Subsubspace proposals' },
    //       },
    //     },
    //     post: {
    //       id: postSubspaceId,
    //       profile: {
    //         displayName: postNameIdSubspace,
    //       },
    //     },
    //   });
    //   expect(contributionResults).toContainObject({
    //     terms: termAll,
    //    10,
    //     type: 'POST',
    //     space: {
    //       id: baseScenario.space.id,
    //       profile: {
    //         displayName: baseScenario.space.about.profile.displayName,
    //       },
    //     },
    //     subspace: {
    //       id: baseScenario.subspace.id,
    //       profile: {
    //         displayName: baseScenario.subspace.about.profile.displayName,
    //       },
    //     },
    //     subsubspace: {
    //       id: baseScenario.subsubspace.id,
    //       profile: {
    //         displayName: baseScenario.subsubspace.about.profile.displayName,
    //       },
    //     },
    //     callout: {
    //       id: baseScenario.subsubspace.collaboration.calloutPostId,
    //       framing: {
    //         profile: { displayName: 'Relevant news, research or use cases 📰' },
    //       },
    //     },
    //     post: {
    //       id: postSubsubspaceId,
    //       profile: {
    //         displayName: postNameIdSubsubspace,
    //       },
    //     },
    //   });
    // });
  });
  // test('should search with all filters applied', async () => {
  //   // Act
  //   const responseSearchData = await searchContributor(termAll, typeFilterAll);
  //   const result = responseSearchData.data?.search;

  //   // Assert
  //   expect(result?.contributorResultsCount).toEqual(2);
  //   expect(result?.contributorResults).toContainObject({
  //     terms: termAll,
  //    10,
  //     type: 'USER',
  //     user: {
  //       id: TestUserManager.users.qaUser.id,
  //       profile: {
  //         displayName: `${userName}`,
  //       },
  //     },
  //   });

  //   expect(result?.contributorResults).toContainObject({
  //     terms: termAll,
  //    10,
  //     type: 'ORGANIZATION',
  //     organization: {
  //       id: `${organizationIdTest}`,
  //       profile: {
  //         displayName: `${organizationNameText}`,
  //       },
  //     },
  //   });
  // });

  // test('should search by full user name', async () => {
  //   // Act
  //   const responseSearchData = await searchContributor(
  //     termFullUserName,
  //     typeFilterAll
  //   );
  //   const result = responseSearchData.data?.search;

  //   // Assert
  //   expect(result?.contributorResultsCount).toEqual(1);
  //   expect(result?.contributorResults).toContainObject({
  //     terms: termFullUserName,
  //    10,
  //     type: 'USER',
  //     user: {
  //       id: TestUserManager.users.qaUser.id,
  //       profile: {
  //         displayName: `${userName}`,
  //       },
  //     },
  //   });

  //   expect(result?.contributorResults).not.toContainObject({
  //     terms: termFullUserName,
  //    10,
  //     type: 'ORGANIZATION',
  //     organization: {
  //       id: `${organizationIdTest}`,
  //       profile: {
  //         displayName: `${organizationNameText}`,
  //       },
  //     },
  //   });
  // });

  // test('should search with common word filter applied', async () => {
  //   // Act
  //   const responseContributior = await searchContributor(
  //     termWord,
  //     typeFilterAll
  //   );
  //   const resultContrbutor = responseContributior.data?.search;
  //   const contributorResults = resultContrbutor?.contributorResults;

  //   const responseSearchData = await searchGlobalSpaces(termWord, typeFilterAll);
  //   const resultJourney = responseSearchData.data?.search;
  //   const journeyResults = resultJourney?.journeyResults;

  //   // Assert
  //   expect(resultContrbutor?.contributorResultsCount).toEqual(1);
  //   expect(resultJourney?.journeyResultsCount).toEqual(3);
  //   expect(contributorResults).not.toContainObject({
  //     terms: termWord,
  //    10,
  //     type: 'USER',
  //     user: {
  //       id: TestUserManager.users.qaUser.id,
  //       profile: {
  //         displayName: `${userName}`,
  //       },
  //     },
  //   });

  //   expect(contributorResults).toContainObject({
  //     terms: termWord,
  //    10,
  //     type: 'ORGANIZATION',
  //     organization: {
  //       id: baseScenario.organization.id,
  //       profile: {
  //         displayName: baseScenario.organization.profile.displayName,
  //       },
  //     },
  //   });
  //   expect(journeyResults).toContainObject({
  //     terms: termWord,
  //    10,
  //     type: 'SPACE',
  //     space: {
  //       id: baseScenario.space.id,
  //       profile: {
  //         displayName: baseScenario.space.about.profile.displayName,
  //       },
  //     },
  //   });
  //   expect(journeyResults).toContainObject({
  //     terms: termWord,
  //    10,
  //     type: 'CHALLENGE',
  //     subspace: {
  //       id: baseScenario.subspace.id,
  //       profile: {
  //         displayName: baseScenario.subspace.about.profile.displayName,
  //       },
  //     },
  //   });
  //   expect(journeyResults).toContainObject({
  //     terms: termWord,
  //    10,
  //     type: 'OPPORTUNITY',
  //     subsubspace: {
  //       id: baseScenario.subsubspace.id,
  //       profile: {
  //         displayName: baseScenario.subsubspace.about.profile.displayName,
  //       },
  //     },
  //   });
  // });

  // test('should search with location filter applied for all entities', async () => {
  //   // Act
  //   const responseContributior = await searchContributor(
  //     termLocation,
  //     typeFilterAll
  //   );
  //   const resultContrbutor = responseContributior.data?.search;
  //   const contributorResults = resultContrbutor?.contributorResults;

  //   const responseSearchData = await searchGlobalSpaces(termLocation, typeFilterAll);
  //   const result = responseSearchData.data?.search;
  //   const journeyResults = result?.journeyResults;

  //   // Assert
  //   expect(resultContrbutor?.contributorResultsCount).toEqual(2);
  //   expect(result?.journeyResultsCount).toEqual(3);
  //   expect(contributorResults).toContainObject({
  //     terms: termLocation,
  //    10,
  //     type: 'USER',
  //     user: {
  //       id: TestUserManager.users.qaUser.id,
  //       profile: {
  //         displayName: `${userName}`,
  //       },
  //     },
  //   });

  //   expect(contributorResults).toContainObject({
  //     terms: termLocation,
  //    10,
  //     type: 'ORGANIZATION',
  //     organization: {
  //       id: baseScenario.organization.id,
  //       profile: {
  //         displayName: baseScenario.organization.profile.displayName,
  //       },
  //     },
  //   });

  //   expect(journeyResults).toContainObject({
  //     terms: termLocation,
  //    10,
  //     type: 'OPPORTUNITY',
  //     subsubspace: {
  //       id: baseScenario.subsubspace.id,
  //       profile: {
  //         displayName: baseScenario.subsubspace.about.profile.displayName,
  //       },
  //     },
  //   });

  //   expect(journeyResults).toContainObject({
  //     terms: termLocation,
  //    10,
  //     type: 'CHALLENGE',
  //     subspace: {
  //       id: baseScenario.subspace.id,
  //       profile: {
  //         displayName: baseScenario.subspace.about.profile.displayName,
  //       },
  //     },
  //   });

  //   expect(journeyResults).toContainObject({
  //     terms: termLocation,
  //    10,
  //     type: 'SPACE',
  //     space: {
  //       id: baseScenario.space.id,
  //       profile: {
  //         displayName: baseScenario.space.about.profile.displayName,
  //       },
  //     },
  //   });
  // });

  // test('should search without filters', async () => {
  //   // Act
  //   const responseContributior = await searchContributor(
  //     filterNo,
  //     typeFilterAll
  //   );
  //   const responseJourney = await searchGlobalSpaces(filterNo, typeFilterAll);

  //   // Assert
  //   expect(responseContributior.data?.search.contributorResultsCount).toEqual(
  //     0
  //   );

  //   expect(responseJourney.data?.search.journeyResultsCount).toEqual(0);
  // });

  // test('should search only for filtered users', async () => {
  //   // Act
  //   const responseContributior = await searchContributor(
  //     termAll,
  //     filterOnlyUser
  //   );
  //   const resultContrbutor = responseContributior.data?.search;
  //   const contributorResults = resultContrbutor?.contributorResults;

  //   // Assert
  //   expect(resultContrbutor?.contributorResultsCount).toEqual(1);
  //   expect(contributorResults).toContainObject({
  //     terms: termAll,
  //    10,
  //     type: 'USER',
  //     user: {
  //       id: TestUserManager.users.qaUser.id,
  //       profile: {
  //         displayName: `${userName}`,
  //       },
  //     },
  //   });

  //   expect(contributorResults).not.toContainObject({
  //     terms: termAll,
  //    10,
  //     type: 'ORGANIZATION',
  //     organization: {
  //       id: `${organizationIdTest}`,
  //       profile: {
  //         displayName: `${organizationNameText}`,
  //       },
  //     },
  //   });
  // });

  // test('should search users triple score', async () => {
  //   // Act
  //   const responseContributior = await searchContributor(
  //     termAllScored,
  //     filterOnlyUser
  //   );
  //   const resultContrbutor = responseContributior.data?.search;
  //   const contributorResults = resultContrbutor?.contributorResults;

  //   // Assert
  //   expect(resultContrbutor?.contributorResultsCount).toEqual(1);
  //   expect(contributorResults).toContainObject({
  //     terms: ['qa', 'user'],
  //    30,
  //     type: 'USER',
  //     user: {
  //       id: TestUserManager.users.qaUser.id,
  //       profile: {
  //         displayName: `${userName}`,
  //       },
  //     },
  //   });

  //   expect(contributorResults).not.toContainObject({
  //     terms: ['qa'],
  //    20,
  //     type: 'ORGANIZATION',
  //     organization: {
  //       id: `${organizationIdTest}`,
  //       profile: {
  //         displayName: `${organizationNameText}`,
  //       },
  //     },
  //   });
  // });

  // test('should search term users only', async () => {
  //   // Act
  //   const responseContributior = await searchContributor(
  //     termUserOnly,
  //     filterOnlyUser
  //   );
  //   const resultContrbutor = responseContributior.data?.search;
  //   const contributorResults = resultContrbutor?.contributorResults;

  //   // Assert
  //   expect(resultContrbutor?.contributorResultsCount).toEqual(1);
  //   expect(contributorResults).toContainObject({
  //     terms: termUserOnly,
  //    10,
  //     type: 'USER',
  //     user: {
  //       id: TestUserManager.users.qaUser.id,
  //       profile: {
  //         displayName: `${userName}`,
  //       },
  //     },
  //   });

  //   expect(contributorResults).not.toContainObject({
  //     terms: termUserOnly,
  //    10,
  //     type: 'ORGANIZATION',
  //     organization: {
  //       id: `${organizationIdTest}`,
  //       profile: {
  //         displayName: `${organizationNameText}`,
  //       },
  //     },
  //   });
  // });

  // describe('Search negative scenarios', () => {
  //   test('should throw limit error for too many terms', async () => {
  //     // Act
  //     const { error: searchContributorError } = await searchContributor(
  //       termTooLong,
  //       typeFilterAll
  //     );
  //     // Assert
  //     expect(searchContributorError?.errors[0].message).toContain(
  //       'Maximum number of search terms is 10; supplied: 11'
  //     );

  //     const { error: searchJourneyError } = await searchGlobalSpaces(
  //       termTooLong,
  //       typeFilterAll
  //     );
  //     expect(searchJourneyError?.errors[0].message).toContain(
  //       'Maximum number of search terms is 10; supplied: 11'
  //     );
  //   });

  //   test('should throw error for invalid filter', async () => {
  //     // Act
  //     const { error } = await searchContributor(termAll, 'invalid');
  //     // Assert
  //     expect(error?.errors[0].message).toContain(
  //       'Not allowed typeFilter encountered: invalid'
  //     );
  //   });

  //   test('should throw error for empty string search', async () => {
  //     // Act
  //     const { error } = await searchContributor(' ', typeFilterAll);
  //     // Assert
  //     expect(error?.errors[0].message).toContain(
  //       'Search: Skipping term below minimum length: '
  //     );
  //   });

  //   test('should not return any results for invalid term', async () => {
  //     // Act
  //     const responseSearchData = await searchContributor(
  //       termNotExisting,
  //       typeFilterAll
  //     );

  //     // Assert
  //     expect(responseSearchData.data?.search.contributorResults).toEqual([]);
  //   });
  // });

  // describe('Search filtered Space Data', () => {
  //   const secondSpaceName = 'search-space2' + uniqueId;

  //   beforeAll(async () => {
  //     const res = await createSpaceAndGetData(
  //       secondSpaceName,
  //       secondSpaceName,
  //       baseScenario.organization.id
  //     );
  //     secondSpaceId = res.data?.lookup?.space?.id ?? '';
  //   });

  //   afterAll(async () => {
  //     await deleteSpace(secondSpaceId);
  //   });

  //   test('should search JOURNEY data filtered space', async () => {
  //     // Act
  //     const responseSearchData = await searchGlobalSpaces(
  //       termWord,
  //       typeFilterAll,
  //       TestUser.GLOBAL_ADMIN,
  //       baseScenario.space.id
  //     );
  //     const resultJourney = responseSearchData.data?.search;
  //     const journeyResults = resultJourney?.journeyResults;

  //     // Assert
  //     expect(resultJourney?.journeyResultsCount).toEqual(2);
  //     expect(journeyResults).toContainObject({
  //       terms: termWord,
  //      10,
  //       type: 'CHALLENGE',
  //       subspace: {
  //         id: baseScenario.subspace.id,
  //         profile: {
  //           displayName: baseScenario.subspace.about.profile.displayName,
  //         },
  //       },
  //     });
  //     expect(journeyResults).toContainObject({
  //       terms: termWord,
  //      10,
  //       type: 'OPPORTUNITY',
  //       subsubspace: {
  //         id: baseScenario.subsubspace.id,
  //         profile: {
  //           displayName: baseScenario.subsubspace.about.profile.displayName,
  //         },
  //       },
  //     });
  //   });

  //   test('should search JOURNEY data filtered empty space', async () => {
  //     // Act
  //     const responseSearchData = await searchGlobalSpaces(
  //       termWord,
  //       typeFilterAll,
  //       TestUser.GLOBAL_ADMIN,
  //       secondSpaceId
  //     );
  //     const resultJourney = responseSearchData.data?.search;

  //     // Assert
  //     expect(resultJourney?.journeyResultsCount).toEqual(0);
  //   });
  // });

  // describe('Search Archived Space Data', () => {
  //   beforeAll(async () => {
  //     await updateSpacePlatformSettings(
  //       baseScenario.space.id,
  //       baseScenario.space.nameId,
  //       SpaceVisibility.Archived
  //     );
  //   });

  //   test.each`
  //     userRole
  //     ${TestUser.SPACE_ADMIN}
  //     ${TestUser.SPACE_MEMBER}
  //     ${TestUser.NON_SPACE_MEMBER}
  //   `(
  //     'User: "$userRole" should not receive Space / Subspace / Subsubspace data',
  //     async ({ userRole }) => {
  //       const responseSearchData = await searchGlobalSpaces(
  //         termLocation,
  //         typeFilterAll,
  //         userRole
  //       );
  //       const resultJourney = responseSearchData.data?.search;
  //       const journeyResults = resultJourney?.journeyResults;
  //       expect(journeyResults).not.toContainObject({
  //         terms: termLocation,
  //        10,
  //         type: 'OPPORTUNITY',
  //         subsubspace: {
  //           id: baseScenario.subsubspace.id,
  //           profile: {
  //             displayName: baseScenario.subsubspace.about.profile.displayName,
  //           },
  //         },
  //       });

  //       expect(journeyResults).not.toContainObject({
  //         terms: termLocation,
  //        10,
  //         type: 'CHALLENGE',
  //         subspace: {
  //           id: baseScenario.subspace.id,
  //           profile: {
  //             displayName: baseScenario.subspace.about.profile.displayName,
  //           },
  //         },
  //       });

  //       expect(journeyResults).not.toContainObject({
  //         terms: termLocation,
  //        10,
  //         type: 'SPACE',
  //         space: {
  //           id: baseScenario.space.id,
  //           profile: {
  //             displayName: baseScenario.space.about.profile.displayName,
  //           },
  //         },
  //       });
  //     }
  //   );

  //   test('GA get results for archived spaces', async () => {
  //     const responseSearchData = await searchGlobalSpaces(
  //       termLocation,
  //       typeFilterAll,
  //       TestUser.GLOBAL_ADMIN
  //     );
  //     const resultJourney = responseSearchData.data?.search;

  //     // Assert
  //     expect(resultJourney?.journeyResultsCount).toEqual(0);
  //   });
  // });

  // describe('Search IN Public Space Private Subspace Data', () => {
  //   beforeAll(async () => {
  //     await updateSpacePlatformSettings(
  //       baseScenario.space.id,
  //       baseScenario.space.nameId,
  //       SpaceVisibility.Active
  //     );

  //     await updateSpaceSettings(baseScenario.space.id, {
  //       privacy: { mode: SpacePrivacyMode.Public },
  //     });

  //     await updateSpaceSettings(baseScenario.subspace.id, {
  //       privacy: { mode: SpacePrivacyMode.Private },
  //     });
  //   });

  //   test.each`
  //     userRole                       | numberResults
  //     ${TestUser.SPACE_ADMIN}        | ${2}
  //     ${TestUser.SPACE_MEMBER}       | ${0}
  //     ${TestUser.SUBSPACE_ADMIN}     | ${2}
  //     ${TestUser.SUBSPACE_MEMBER}    | ${2}
  //     ${TestUser.SUBSUBSPACE_ADMIN}  | ${2}
  //     ${TestUser.SUBSUBSPACE_MEMBER} | ${2}
  //     ${TestUser.NON_SPACE_MEMBER}   | ${0}
  //   `(
  //     'User: "$userRole" should get "$numberResults" results for Subspace / Subsubspace data',
  //     async ({ userRole, numberResults }) => {
  //       const responseSearchData = await searchGlobalSpaces(
  //         termWord,
  //         typeFilterAll,
  //         userRole,
  //         baseScenario.space.id
  //       );
  //       const resultJourney = responseSearchData.data?.search;
  //       expect(resultJourney?.journeyResultsCount).toEqual(numberResults);
  //     }
  //   );
  // });

  // describe('Search Public Space Private Subspace Data', () => {
  //   beforeAll(async () => {
  //     await updateSpacePlatformSettings(
  //       baseScenario.space.id,
  //       baseScenario.space.nameId,
  //       SpaceVisibility.Active
  //     );

  //     await updateSpaceSettings(baseScenario.space.id, {
  //       privacy: { mode: SpacePrivacyMode.Public },
  //     });

  //     await updateSpaceSettings(baseScenario.subspace.id, {
  //       privacy: { mode: SpacePrivacyMode.Private },
  //     });
  //   });

  //   test.each`
  //     userRole                       | numberResults
  //     ${TestUser.SPACE_ADMIN}        | ${3}
  //     ${TestUser.SPACE_MEMBER}       | ${1}
  //     ${TestUser.SUBSPACE_ADMIN}     | ${3}
  //     ${TestUser.SUBSPACE_MEMBER}    | ${3}
  //     ${TestUser.SUBSUBSPACE_ADMIN}  | ${3}
  //     ${TestUser.SUBSUBSPACE_MEMBER} | ${3}
  //     ${TestUser.NON_SPACE_MEMBER}   | ${1}
  //   `(
  //     'User: "$userRole" should get "$numberResults" results for Space /  Subspace / Subsubspace data',
  //     async ({ userRole, numberResults }) => {
  //       const responseSearchData = await searchGlobalSpaces(
  //         termWord,
  //         typeFilterAll,
  //         userRole
  //       );
  //       const resultJourney = responseSearchData.data?.search;
  //       expect(resultJourney?.journeyResultsCount).toEqual(numberResults);
  //     }
  //   );
  // });

  // describe('Search Private Space Private Subspace Data', () => {
  //   beforeAll(async () => {
  //     await updateSpacePlatformSettings(
  //       baseScenario.space.id,
  //       baseScenario.space.nameId,
  //       SpaceVisibility.Active
  //     );

  //     await updateSpaceSettings(baseScenario.space.id, {
  //       privacy: { mode: SpacePrivacyMode.Private },
  //     });

  //     await updateSpaceSettings(baseScenario.subspace.id, {
  //       privacy: { mode: SpacePrivacyMode.Private },
  //     });
  //   });

  //   test.each`
  //     userRole                       | numberResults
  //     ${TestUser.SPACE_ADMIN}        | ${3}
  //     ${TestUser.SPACE_MEMBER}       | ${1}
  //     ${TestUser.SUBSPACE_ADMIN}     | ${3}
  //     ${TestUser.SUBSPACE_MEMBER}    | ${3}
  //     ${TestUser.SUBSUBSPACE_ADMIN}  | ${3}
  //     ${TestUser.SUBSUBSPACE_MEMBER} | ${3}
  //     ${TestUser.NON_SPACE_MEMBER}   | ${1}
  //   `(
  //     'User: "$userRole" should get "$numberResults" results for Space / Subspace / Subsubspace data',
  //     async ({ userRole, numberResults }) => {
  //       const responseSearchData = await searchGlobalSpaces(
  //         termWord,
  //         typeFilterAll,
  //         userRole
  //       );
  //       const resultJourney = responseSearchData.data?.search;
  //       expect(resultJourney?.journeyResultsCount).toEqual(numberResults);
  //     }
  //   );
  // });
});
