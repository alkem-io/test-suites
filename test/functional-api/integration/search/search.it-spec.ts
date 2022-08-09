import { updateUser } from '@test/functional-api/user-management/user.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  createOrgAndHub,
  getUsersIdentifiers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import '@test/utils/array.matcher';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  updateChallenge,
  updateChallengeLocationVariablesData,
  updateHub,
  updateHubLocationVariablesData,
  updateOpportunity,
  updateOpportunityLocationVariablesData,
} from '@test/utils/mutations/update-mutation';
import { removeChallenge } from '../challenge/challenge.request.params';
import { removeHub } from '../hub/hub.request.params';
import { removeOpportunity } from '../opportunity/opportunity.request.params';
import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
} from '../organization/organization.request.params';
import { search } from './search.request.params';

const userName = 'qa user';
const country = 'Bulgaria';
const city = 'Sofia';
let organizationNameText = '';
let organizationIdTest = '';
const typeFilterAll = ['user', 'opportunity', 'organization', 'challenge'];
const filterOnlyUser = ['user'];
const filterNo: never[] = [];
const termUserOnly = ['user'];
const termAll = ['qa'];
const termLocation = ['sofia'];
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
const hubName = 'search-eco-name' + uniqueId;
const hubNameId = 'search-eco-nameid' + uniqueId;
const challengeName = 'search-ch-name' + uniqueId;
const opportunityName = 'search-opp-name' + uniqueId;

const termAllScored = ['qa', 'qa', 'user', 'mm'];

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
  await getUsersIdentifiers();

  organizationNameText = `qa organizationNameText ${uniqueId}`;

  await updateUser(users.qaUserId, 'qa user', '+359777777771', {
    ID: users.qaUserProfileId,
    location: { country: country, city: city },
  });

  await updateOrganization(
    entitiesId.organizationId,
    organizationName,
    'legalEntityName',
    'domain',
    'website',
    'contactEmail@mail.com',
    {
      ID: entitiesId.organizationProfileId,
      location: { country: country, city: city },
    }
  );

  await mutation(
    updateHub,
    updateHubLocationVariablesData(entitiesId.hubId, {
      location: { country: country, city: city },
    }),
    TestUser.GLOBAL_ADMIN
  );

  await mutation(
    updateChallenge,
    updateChallengeLocationVariablesData(entitiesId.challengeId, {
      country: country,
      city: city,
    }),
    TestUser.GLOBAL_ADMIN
  );

  await mutation(
    updateOpportunity,
    updateOpportunityLocationVariablesData(entitiesId.opportunityId, {
      country: country,
      city: city,
    }),
    TestUser.GLOBAL_ADMIN
  );

  const responseCreateOrganization = await createOrganization(
    organizationNameText,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.body.data.createOrganization.id;
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
  await deleteOrganization(organizationIdTest);
});

describe('Search data', () => {
  test('should search with all filters applied', async () => {
    // Act
    const responseSearchData = await search(termAll, typeFilterAll);
    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'User',
        id: users.qaUserId,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'Organization',
        id: `${organizationIdTest}`,
        displayName: `${organizationNameText}`,
      },
    });
  });

  test('should search with location filter applied', async () => {
    // Act
    const responseSearchData = await search(termLocation, typeFilterAll);
    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termLocation,
      score: 10,
      result: {
        __typename: 'User',
        id: users.qaUserId,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: termLocation,
      score: 10,
      result: {
        __typename: 'Opportunity',
        id: entitiesId.opportunityId,
        displayName: opportunityName,
      },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: termLocation,
      score: 10,
      result: {
        __typename: 'Challenge',
        id: entitiesId.challengeId,
        displayName: challengeName,
      },
    });
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termLocation,
      score: 10,
      result: {
        __typename: 'Organization',
        id: entitiesId.organizationId,
        displayName: organizationName,
      },
    });
  });

  test('should search without filters', async () => {
    // Act
    const responseSearchData = await search(filterNo, typeFilterAll);

    // Assert

    expect(responseSearchData.body.data.search).toEqual([]);
  });

  test('should search only for filtered users', async () => {
    // Act
    const responseSearchData = await search(termAll, filterOnlyUser);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'User',
        id: users.qaUserId,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'Organization',
        id: `${organizationIdTest}`,
        displayName: `${organizationNameText}`,
      },
    });
  });

  test('should search users triple score', async () => {
    // Act
    const responseSearchData = await search(termAllScored, typeFilterAll);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['qa', 'user'],
      score: 30,
      result: {
        __typename: 'User',
        id: users.qaUserId,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['qa'],
      score: 20,
      result: {
        __typename: 'Organization',
        id: `${organizationIdTest}`,
        displayName: `${organizationNameText}`,
      },
    });
  });

  test('should search term users only', async () => {
    // Act
    const responseSearchData = await search(termUserOnly, typeFilterAll);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termUserOnly,
      score: 10,
      result: {
        __typename: 'User',
        id: users.qaUserId,
        displayName: `${userName}`,
      },
    });

    expect(responseSearchData.body.data.search).not.toContainObject({
      terms: termUserOnly,
      score: 10,
      result: {
        __typename: 'Organization',
        id: `${organizationIdTest}`,
        displayName: `${organizationNameText}`,
      },
    });
  });

  test('should throw limit error for too many terms', async () => {
    // Act
    const responseSearchData = await search(termTooLong, typeFilterAll);

    // Assert
    expect(responseSearchData.text).toContain(
      'Maximum number of search terms is 10; supplied: 11'
    );
  });

  test('should throw error for invalid filter', async () => {
    // Act
    const responseSearchData = await search(termAll, 'invalid');

    // Assert
    expect(responseSearchData.text).toContain(
      'Not allowed typeFilter encountered: invalid'
    );
  });

  test('should throw error for empty string search', async () => {
    // Act
    const responseSearchData = await search(' ', typeFilterAll);

    // Assert

    expect(responseSearchData.text).toContain(
      'Search: Skipping term below minimum length: '
    );
  });

  test('should not return any results for invalid term', async () => {
    // Act
    const responseSearchData = await search(termNotExisting, typeFilterAll);

    // Assert
    expect(responseSearchData.body.data.search).toEqual([]);
  });
});
