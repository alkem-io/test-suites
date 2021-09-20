import { getUser } from '@test/functional-api/user-management/user.request.params';
import '@test/utils/array.matcher';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverseMutation,
} from '../ecoverse/ecoverse.request.params';
import {
  createOrganizationMutation,
  deleteOrganizationMutation,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import { searchMutation } from './search.request.params';

const userEmail = 'qa.user@alkem.io';
const userName = 'qa user';
let organizationNameText = '';
let organizationIdTest = '';
let uniqueTextId = '';
const typeFilterAll = ['user', 'organization'];
const filterOnlyUser = ['user'];
const filterNo: never[] = [];
const termUserOnly = ['user'];
const termAll = ['qa'];
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
let userId = async (): Promise<string> => {
  const getUserId = await getUser(userEmail);
  let response = getUserId.body.data.user.id;
  return response;
};
const termAllScored = ['qa', 'qa', 'user', 'mm'];
let ecoverseId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganizationMutation(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganizationMutation(organizationId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  organizationNameText = `qa organizationNameText ${uniqueTextId}`;

  // Create organization
  const responseCreateOrganization = await createOrganizationMutation(
    organizationNameText,
    'org' + uniqueTextId
  );
  organizationIdTest =
    responseCreateOrganization.body.data.createOrganization.id;
});

afterEach(async () => {
  await deleteOrganizationMutation(organizationIdTest);
});

describe('Search data', () => {
  test('should search with all filters applied', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, typeFilterAll);
    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
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

  test('should search without filters', async () => {
    // Act
    const responseSearchData = await searchMutation(filterNo, typeFilterAll);

    // Assert

    expect(responseSearchData.body.data.search).toEqual([]);
  });

  test('should search only for filtered users', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, filterOnlyUser);

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termAll,
      score: 10,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
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
    const responseSearchData = await searchMutation(
      termAllScored,
      typeFilterAll
    );

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: ['qa', 'user'],
      score: 30,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
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
    const responseSearchData = await searchMutation(
      termUserOnly,
      typeFilterAll
    );

    // Assert
    expect(responseSearchData.body.data.search).toContainObject({
      terms: termUserOnly,
      score: 10,
      result: {
        __typename: 'User',
        id: `${await userId()}`,
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
    const responseSearchData = await searchMutation(termTooLong, typeFilterAll);

    // Assert
    expect(responseSearchData.text).toContain(
      'Maximum number of search terms is 10; supplied: 11'
    );
  });

  test('should throw error for invalid filter', async () => {
    // Act
    const responseSearchData = await searchMutation(termAll, 'invalid');

    // Assert
    expect(responseSearchData.text).toContain(
      'Not allowed typeFilter encountered: invalid'
    );
  });

  test('should throw error for empty string search', async () => {
    // Act
    const responseSearchData = await searchMutation(' ', typeFilterAll);

    // Assert

    expect(responseSearchData.text).toContain(
      `Search: Skipping term below minimum length: `
    );
  });

  test('should not return any results for invalid term', async () => {
    // Act
    const responseSearchData = await searchMutation(
      termNotExisting,
      typeFilterAll
    );

    // Assert
    expect(responseSearchData.body.data.search).toEqual([]);
  });
});
