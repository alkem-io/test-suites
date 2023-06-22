import { updateUser } from '@test/functional-api/user-management/user.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import '@test/utils/array.matcher';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  ChallengePreferenceType,
  changePreferenceChallenge,
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  updateChallenge,
  updateChallengeLocationVariablesData,
  updateHub,
  updateHubLocationVariablesData,
  updateOpportunity,
  updateOpportunityLocationVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  PostTypes,
  createPostOnCallout,
} from '../integration/post/post.request.params';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import {
  createTestHub,
  HubVisibility,
  removeHub,
  updateHubVisibility,
} from '../integration/hub/hub.request.params';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';
import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
} from '../integration/organization/organization.request.params';
import {
  searchContributions,
  searchContributor,
  searchJourney,
} from './search.request.params';

let secondHubId = '';
const userName = 'qa user';
const country = 'Bulgaria';
const city = 'Sofia';
let organizationNameText = '';
let organizationIdTest = '';
const postNameIdHub = 'qa-hub' + uniqueId;
let postHubId = '';
let postChallengeId = '';
let postOpportunityId = '';
const postNameIdChallenge = 'qa-chal' + uniqueId;
const postNameIdOpportunity = 'qa-opp' + uniqueId;
const typeFilterAll = [
  'organization',
  'user',
  'hub',
  'challenge',
  'opportunity',
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
const organizationName = 'search-org-name' + uniqueId;
const hostNameId = 'search-org-nameid' + uniqueId;
const hubName = 'search-hub' + uniqueId;
const hubNameId = 'search-hub-nameid' + uniqueId;
const challengeName = 'search-ch-name' + uniqueId;
const opportunityName = 'search-opp-name' + uniqueId;

const termAllScored = ['qa', 'qa', 'user'];

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  organizationNameText = `qa organizationNameText ${uniqueId}`;

  await updateUser(users.qaUserId, '+359777777771', {
    location: { country: country, city: city },
  });

  await updateOrganization(
    entitiesId.organizationId,
    'legalEntityName',
    'domain',
    'website',
    'contactEmail@mail.com',
    {
      location: { country: country, city: city },
    }
  );

  await mutation(
    updateHub,
    updateHubLocationVariablesData(entitiesId.hubId, country, city),
    TestUser.GLOBAL_ADMIN
  );

  await mutation(
    updateChallenge,
    updateChallengeLocationVariablesData(entitiesId.challengeId, country, city),
    TestUser.GLOBAL_ADMIN
  );

  await mutation(
    updateOpportunity,
    updateOpportunityLocationVariablesData(
      entitiesId.opportunityId,
      country,
      city
    ),
    TestUser.GLOBAL_ADMIN
  );

  const responseCreateOrganization = await createOrganization(
    organizationNameText,
    'qa-org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.body.data.createOrganization.id;

  const resHub = await createPostOnCallout(
    entitiesId.hubCalloutId,
    postNameIdHub,
    { profileData: { displayName: postNameIdHub } },
    PostTypes.KNOWLEDGE
  );
  postHubId = resHub.body.data.createPostOnCallout.id;

  const resChallenge = await createPostOnCallout(
    entitiesId.challengeCalloutId,
    postNameIdChallenge,
    { profileData: { displayName: postNameIdChallenge } },
    PostTypes.KNOWLEDGE
  );
  postChallengeId = resChallenge.body.data.createPostOnCallout.id;

  const resOpportunity = await createPostOnCallout(
    entitiesId.opportunityCalloutId,
    postNameIdOpportunity,
    { profileData: { displayName: postNameIdOpportunity } },
    PostTypes.KNOWLEDGE
  );
  postOpportunityId = resOpportunity.body.data.createPostOnCallout.id;
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await removeHub(secondHubId);
  await deleteOrganization(entitiesId.organizationId);
  await deleteOrganization(organizationIdTest);
});

describe('Search', () => {
  describe('Search types', () => {
    test('should search CONTRIBUTOR data', async () => {
      // Act
      const responseSearchData = await searchContributor(
        termAll,
        typeFilterAll
      );
      const result = responseSearchData.body.data.search;

      // Assert
      expect(result.contributorResultsCount).toEqual(2);
      expect(result.contributorResults).toContainObject({
        terms: termAll,
        score: 10,
        type: 'USER',
        user: {
          id: users.qaUserId,
          profile: {
            displayName: `${userName}`,
          },
        },
      });

      expect(result.contributorResults).toContainObject({
        terms: termAll,
        score: 10,
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
      const responseSearchData = await searchJourney(termWord, typeFilterAll);
      const resultJourney = responseSearchData.body.data.search;
      const journeyResults = resultJourney.journeyResults;

      // Assert
      expect(resultJourney.journeyResultsCount).toEqual(3);
      expect(journeyResults).toContainObject({
        terms: termWord,
        score: 10,
        type: 'HUB',
        hub: {
          id: entitiesId.hubId,
          profile: {
            displayName: hubName,
          },
        },
      });
      expect(journeyResults).toContainObject({
        terms: termWord,
        score: 10,
        type: 'CHALLENGE',
        challenge: {
          id: entitiesId.challengeId,
          profile: {
            displayName: challengeName,
          },
        },
      });
      expect(journeyResults).toContainObject({
        terms: termWord,
        score: 10,
        type: 'OPPORTUNITY',
        opportunity: {
          id: entitiesId.opportunityId,
          profile: {
            displayName: opportunityName,
          },
        },
      });
    });

    test('should search CONTRIBUTION data', async () => {
      // Act
      const responseSearchData = await searchContributions(
        termAll,
        typeFilterAll
      );
      const resultContribution = responseSearchData.body.data.search;
      const contributionResults = resultContribution.contributionResults;

      // Assert
      expect(resultContribution.contributionResultsCount).toEqual(3);
      expect(contributionResults).toContainObject({
        terms: termAll,
        score: 10,
        type: 'POST',
        hub: {
          id: entitiesId.hubId,
          profile: {
            displayName: hubName,
          },
        },
        challenge: null,
        opportunity: null,
        callout: {
          id: entitiesId.hubCalloutId,
          profile: { displayName: 'Contribute' },
        },
        post: {
          id: postHubId,
          profile: {
            displayName: postNameIdHub,
          },
        },
      });
      expect(contributionResults).toContainObject({
        terms: termAll,
        score: 10,
        type: 'POST',
        hub: {
          id: entitiesId.hubId,
          profile: {
            displayName: hubName,
          },
        },
        challenge: {
          id: entitiesId.challengeId,
          profile: {
            displayName: challengeName,
          },
        },
        opportunity: null,
        callout: {
          id: entitiesId.challengeCalloutId,
          profile: { displayName: 'Contribute' },
        },
        post: {
          id: postChallengeId,
          profile: {
            displayName: postNameIdChallenge,
          },
        },
      });
      expect(contributionResults).toContainObject({
        terms: termAll,
        score: 10,
        type: 'POST',
        hub: {
          id: entitiesId.hubId,
          profile: {
            displayName: hubName,
          },
        },
        challenge: {
          id: entitiesId.challengeId,
          profile: {
            displayName: challengeName,
          },
        },
        opportunity: {
          id: entitiesId.opportunityId,
          profile: {
            displayName: opportunityName,
          },
        },
        callout: {
          id: entitiesId.opportunityCalloutId,
          profile: { displayName: 'Contribute' },
        },
        post: {
          id: postOpportunityId,
          profile: {
            displayName: postNameIdOpportunity,
          },
        },
      });
    });
  });
  test('should search with all filters applied', async () => {
    // Act
    const responseSearchData = await searchContributor(termAll, typeFilterAll);
    const result = responseSearchData.body.data.search;

    // Assert
    expect(result.contributorResultsCount).toEqual(2);
    expect(result.contributorResults).toContainObject({
      terms: termAll,
      score: 10,
      type: 'USER',
      user: {
        id: users.qaUserId,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(result.contributorResults).toContainObject({
      terms: termAll,
      score: 10,
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
    const responseSearchData = await searchContributor(
      termFullUserName,
      typeFilterAll
    );
    const result = responseSearchData.body.data.search;

    // Assert
    expect(result.contributorResultsCount).toEqual(1);
    expect(result.contributorResults).toContainObject({
      terms: termFullUserName,
      score: 10,
      type: 'USER',
      user: {
        id: users.qaUserId,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(result.contributorResults).not.toContainObject({
      terms: termFullUserName,
      score: 10,
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
    const responseContributior = await searchContributor(
      termWord,
      typeFilterAll
    );
    const resultContrbutor = responseContributior.body.data.search;
    const contributorResults = resultContrbutor.contributorResults;

    const responseSearchData = await searchJourney(termWord, typeFilterAll);
    const resultJourney = responseSearchData.body.data.search;
    const journeyResults = resultJourney.journeyResults;

    // Assert
    expect(resultContrbutor.contributorResultsCount).toEqual(1);
    expect(resultJourney.journeyResultsCount).toEqual(3);
    expect(contributorResults).not.toContainObject({
      terms: termWord,
      score: 10,
      type: 'USER',
      user: {
        id: users.qaUserId,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(contributorResults).toContainObject({
      terms: termWord,
      score: 10,
      type: 'ORGANIZATION',
      organization: {
        id: entitiesId.organizationId,
        profile: {
          displayName: organizationName,
        },
      },
    });
    expect(journeyResults).toContainObject({
      terms: termWord,
      score: 10,
      type: 'HUB',
      hub: {
        id: entitiesId.hubId,
        profile: {
          displayName: hubName,
        },
      },
    });
    expect(journeyResults).toContainObject({
      terms: termWord,
      score: 10,
      type: 'CHALLENGE',
      challenge: {
        id: entitiesId.challengeId,
        profile: {
          displayName: challengeName,
        },
      },
    });
    expect(journeyResults).toContainObject({
      terms: termWord,
      score: 10,
      type: 'OPPORTUNITY',
      opportunity: {
        id: entitiesId.opportunityId,
        profile: {
          displayName: opportunityName,
        },
      },
    });
  });

  test('should search with location filter applied for all entities', async () => {
    // Act
    const responseContributior = await searchContributor(
      termLocation,
      typeFilterAll
    );
    const resultContrbutor = responseContributior.body.data.search;
    const contributorResults = resultContrbutor.contributorResults;

    const responseSearchData = await searchJourney(termLocation, typeFilterAll);
    const result = responseSearchData.body.data.search;
    const journeyResults = result.journeyResults;

    // Assert
    expect(resultContrbutor.contributorResultsCount).toEqual(2);
    expect(result.journeyResultsCount).toEqual(3);
    expect(contributorResults).toContainObject({
      terms: termLocation,
      score: 10,
      type: 'USER',
      user: {
        id: users.qaUserId,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(contributorResults).toContainObject({
      terms: termLocation,
      score: 10,
      type: 'ORGANIZATION',
      organization: {
        id: entitiesId.organizationId,
        profile: {
          displayName: organizationName,
        },
      },
    });

    expect(journeyResults).toContainObject({
      terms: termLocation,
      score: 10,
      type: 'OPPORTUNITY',
      opportunity: {
        id: entitiesId.opportunityId,
        profile: {
          displayName: opportunityName,
        },
      },
    });

    expect(journeyResults).toContainObject({
      terms: termLocation,
      score: 10,
      type: 'CHALLENGE',
      challenge: {
        id: entitiesId.challengeId,
        profile: {
          displayName: challengeName,
        },
      },
    });

    expect(journeyResults).toContainObject({
      terms: termLocation,
      score: 10,
      type: 'HUB',
      hub: {
        id: entitiesId.hubId,
        profile: {
          displayName: hubName,
        },
      },
    });
  });

  test('should search without filters', async () => {
    // Act
    const responseContributior = await searchContributor(
      filterNo,
      typeFilterAll
    );
    const responseJourney = await searchJourney(filterNo, typeFilterAll);

    // Assert
    expect(
      responseContributior.body.data.search.contributorResultsCount
    ).toEqual(0);

    expect(responseJourney.body.data.search.journeyResultsCount).toEqual(0);
  });

  test('should search only for filtered users', async () => {
    // Act
    const responseContributior = await searchContributor(
      termAll,
      filterOnlyUser
    );
    const resultContrbutor = responseContributior.body.data.search;
    const contributorResults = resultContrbutor.contributorResults;

    // Assert
    expect(resultContrbutor.contributorResultsCount).toEqual(1);
    expect(contributorResults).toContainObject({
      terms: termAll,
      score: 10,
      type: 'USER',
      user: {
        id: users.qaUserId,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(contributorResults).not.toContainObject({
      terms: termAll,
      score: 10,
      type: 'ORGANIZATION',
      organization: {
        id: `${organizationIdTest}`,
        profile: {
          displayName: `${organizationNameText}`,
        },
      },
    });
  });

  test('should search users triple score', async () => {
    // Act
    const responseContributior = await searchContributor(
      termAllScored,
      filterOnlyUser
    );
    const resultContrbutor = responseContributior.body.data.search;
    const contributorResults = resultContrbutor.contributorResults;

    // Assert
    expect(resultContrbutor.contributorResultsCount).toEqual(1);
    expect(contributorResults).toContainObject({
      terms: ['qa', 'user'],
      score: 30,
      type: 'USER',
      user: {
        id: users.qaUserId,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(contributorResults).not.toContainObject({
      terms: ['qa'],
      score: 20,
      type: 'ORGANIZATION',
      organization: {
        id: `${organizationIdTest}`,
        profile: {
          displayName: `${organizationNameText}`,
        },
      },
    });
  });

  test('should search term users only', async () => {
    // Act
    const responseContributior = await searchContributor(
      termUserOnly,
      filterOnlyUser
    );
    const resultContrbutor = responseContributior.body.data.search;
    const contributorResults = resultContrbutor.contributorResults;

    // Assert
    expect(resultContrbutor.contributorResultsCount).toEqual(1);
    expect(contributorResults).toContainObject({
      terms: termUserOnly,
      score: 10,
      type: 'USER',
      user: {
        id: users.qaUserId,
        profile: {
          displayName: `${userName}`,
        },
      },
    });

    expect(contributorResults).not.toContainObject({
      terms: termUserOnly,
      score: 10,
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
      const responsecontributors = await searchContributor(
        termTooLong,
        typeFilterAll
      );
      const responseJourney = await searchJourney(termTooLong, typeFilterAll);

      // Assert
      expect(responsecontributors.text).toContain(
        'Maximum number of search terms is 10; supplied: 11'
      );
      expect(responseJourney.text).toContain(
        'Maximum number of search terms is 10; supplied: 11'
      );
    });

    test('should throw error for invalid filter', async () => {
      // Act
      const responseSearchData = await searchContributor(termAll, 'invalid');

      // Assert
      expect(responseSearchData.text).toContain(
        'Not allowed typeFilter encountered: invalid'
      );
    });

    test('should throw error for empty string search', async () => {
      // Act
      const responseSearchData = await searchContributor(' ', typeFilterAll);

      // Assert

      expect(responseSearchData.text).toContain(
        'Search: Skipping term below minimum length: '
      );
    });

    test('should not return any results for invalid term', async () => {
      // Act
      const responseSearchData = await searchContributor(
        termNotExisting,
        typeFilterAll
      );

      // Assert
      expect(responseSearchData.body.data.search.contributorResults).toEqual(
        []
      );
    });
  });

  describe('Search filtered Hub Data', () => {
    const secondHubName = 'search-hub2' + uniqueId;

    beforeAll(async () => {
      const res = await createTestHub(
        secondHubName,
        secondHubName,
        entitiesId.organizationId
      );
      secondHubId = res.body.data.createHub.id;
    });

    afterAll(async () => {
      await removeHub(secondHubId);
    });

    test('should search JOURNEY data filtered hub', async () => {
      // Act
      const responseSearchData = await searchJourney(
        termWord,
        typeFilterAll,
        TestUser.GLOBAL_ADMIN,
        entitiesId.hubId
      );
      const resultJourney = responseSearchData.body.data.search;
      const journeyResults = resultJourney.journeyResults;

      // Assert
      expect(resultJourney.journeyResultsCount).toEqual(2);
      expect(journeyResults).toContainObject({
        terms: termWord,
        score: 10,
        type: 'CHALLENGE',
        challenge: {
          id: entitiesId.challengeId,
          profile: {
            displayName: challengeName,
          },
        },
      });
      expect(journeyResults).toContainObject({
        terms: termWord,
        score: 10,
        type: 'OPPORTUNITY',
        opportunity: {
          id: entitiesId.opportunityId,
          profile: {
            displayName: opportunityName,
          },
        },
      });
    });

    test('should search JOURNEY data filtered empty hub', async () => {
      // Act
      const responseSearchData = await searchJourney(
        termWord,
        typeFilterAll,
        TestUser.GLOBAL_ADMIN,
        secondHubId
      );
      const resultJourney = responseSearchData.body.data.search;

      // Assert
      expect(resultJourney.journeyResultsCount).toEqual(0);
    });
  });

  describe('Search Archived Hub Data', () => {
    beforeAll(async () => {
      await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);
    });

    test.each`
      userRole
      ${TestUser.HUB_ADMIN}
      ${TestUser.HUB_MEMBER}
      ${TestUser.NON_HUB_MEMBER}
    `(
      'User: "$userRole" should not receive Hub / Challenge / Opportunity data',
      async ({ userRole }) => {
        const responseSearchData = await searchJourney(
          termLocation,
          typeFilterAll,
          userRole
        );
        const resultJourney = responseSearchData.body.data.search;
        const journeyResults = resultJourney.journeyResults;
        expect(journeyResults).not.toContainObject({
          terms: termLocation,
          score: 10,
          type: 'OPPORTUNITY',
          opportunity: {
            id: entitiesId.opportunityId,
            profile: {
              displayName: opportunityName,
            },
          },
        });

        expect(journeyResults).not.toContainObject({
          terms: termLocation,
          score: 10,
          type: 'CHALLENGE',
          challenge: {
            id: entitiesId.challengeId,
            profile: {
              displayName: challengeName,
            },
          },
        });

        expect(journeyResults).not.toContainObject({
          terms: termLocation,
          score: 10,
          type: 'HUB',
          hub: {
            id: entitiesId.hubId,
            profile: {
              displayName: hubName,
            },
          },
        });
      }
    );
    test('GA get results for archived hubs', async () => {
      const responseSearchData = await searchJourney(
        termLocation,
        typeFilterAll,
        TestUser.GLOBAL_ADMIN
      );
      const resultJourney = responseSearchData.body.data.search;
      const journeyResults = resultJourney.journeyResults;

      // Assert
      expect(resultJourney.journeyResultsCount).toEqual(3);
      expect(journeyResults).toContainObject({
        terms: termLocation,
        score: 10,
        type: 'OPPORTUNITY',
        opportunity: {
          id: entitiesId.opportunityId,
          profile: {
            displayName: opportunityName,
          },
        },
      });

      expect(journeyResults).toContainObject({
        terms: termLocation,
        score: 10,
        type: 'CHALLENGE',
        challenge: {
          id: entitiesId.challengeId,
          profile: {
            displayName: challengeName,
          },
        },
      });
      expect(journeyResults).toContainObject({
        terms: termLocation,
        score: 10,
        type: 'HUB',
        hub: {
          id: entitiesId.hubId,
          profile: {
            displayName: hubName,
          },
        },
      });
    });
  });

  describe('Search IN Public Hub Private Challenge Data', () => {
    beforeAll(async () => {
      await updateHubVisibility(entitiesId.hubId, HubVisibility.ACTIVE);
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'true'
      );
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
        'false'
      );
    });

    test.each`
      userRole                       | numberResults
      ${TestUser.HUB_ADMIN}          | ${2}
      ${TestUser.HUB_MEMBER}         | ${0}
      ${TestUser.CHALLENGE_ADMIN}    | ${2}
      ${TestUser.CHALLENGE_MEMBER}   | ${2}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${2}
      ${TestUser.OPPORTUNITY_MEMBER} | ${2}
      ${TestUser.NON_HUB_MEMBER}     | ${0}
    `(
      'User: "$userRole" should get "$numberResults" results for Challenge / Opportunity data',
      async ({ userRole, numberResults }) => {
        const responseSearchData = await searchJourney(
          termWord,
          typeFilterAll,
          userRole,
          entitiesId.hubId
        );
        const resultJourney = responseSearchData.body.data.search;
        expect(resultJourney.journeyResultsCount).toEqual(numberResults);
      }
    );
  });

  describe('Search Public Hub Private Challenge Data', () => {
    beforeAll(async () => {
      await updateHubVisibility(entitiesId.hubId, HubVisibility.ACTIVE);
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'true'
      );
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
        'false'
      );
    });

    test.each`
      userRole                       | numberResults
      ${TestUser.HUB_ADMIN}          | ${3}
      ${TestUser.HUB_MEMBER}         | ${1}
      ${TestUser.CHALLENGE_ADMIN}    | ${3}
      ${TestUser.CHALLENGE_MEMBER}   | ${3}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${3}
      ${TestUser.OPPORTUNITY_MEMBER} | ${3}
      ${TestUser.NON_HUB_MEMBER}     | ${1}
    `(
      'User: "$userRole" should get "$numberResults" results for Hub /  Challenge / Opportunity data',
      async ({ userRole, numberResults }) => {
        const responseSearchData = await searchJourney(
          termWord,
          typeFilterAll,
          userRole
        );
        const resultJourney = responseSearchData.body.data.search;
        expect(resultJourney.journeyResultsCount).toEqual(numberResults);
      }
    );
  });

  describe('Search Private Hub Private Challenge Data', () => {
    beforeAll(async () => {
      await updateHubVisibility(entitiesId.hubId, HubVisibility.ACTIVE);
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'false'
      );
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
        'false'
      );
    });

    test.each`
      userRole                       | numberResults
      ${TestUser.HUB_ADMIN}          | ${3}
      ${TestUser.HUB_MEMBER}         | ${1}
      ${TestUser.CHALLENGE_ADMIN}    | ${3}
      ${TestUser.CHALLENGE_MEMBER}   | ${3}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${3}
      ${TestUser.OPPORTUNITY_MEMBER} | ${3}
      ${TestUser.NON_HUB_MEMBER}     | ${1}
    `(
      'User: "$userRole" should get "$numberResults" results for Hub / Challenge / Opportunity data',
      async ({ userRole, numberResults }) => {
        const responseSearchData = await searchJourney(
          termWord,
          typeFilterAll,
          userRole
        );
        const resultJourney = responseSearchData.body.data.search;
        expect(resultJourney.journeyResultsCount).toEqual(numberResults);
      }
    );
  });
});
