import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { getOrganizationData } from '../organization/organization.request.params';
import { paginatedOrganization } from './pagination.request.params';

let organizationDataConf: any[] = [];

beforeAll(async () => {
  organizationDataConf = [
    {
      orgName: 'org1-dn',
      orgNameId: 'org1-ni',
      legalEntityName: 'org1-legal',
      domain: 'org1-domain',
      website: 'org1-website',
      contactEmail: 'org1-email@test.io',
    },
    {
      orgName: 'org2-dn',
      orgNameId: 'org2-ni',
      legalEntityName: 'org2-legal',
      domain: 'org2-domain',
      website: 'org2-website',
      contactEmail: 'org2-email@test.io',
    },
    {
      orgName: 'org3-dn',
      orgNameId: 'org3-ni',
      legalEntityName: 'org3-legal',
      domain: 'org3-domain',
      website: 'org3-website',
      contactEmail: 'org3-email@test.io',
    },
    {
      orgName: 'org4-dn',
      orgNameId: 'org4-ni',
      legalEntityName: 'org4-legal',
      domain: 'org4-domain',
      website: 'org4-website',
      contactEmail: 'org4-email@test.io',
    },
    {
      orgName: 'org5-dn',
      orgNameId: 'org5-ni',
      legalEntityName: 'org5-legal',
      domain: 'org5-domain',
      website: 'org5-website',
      contactEmail: 'org5-email@test.io',
    },
  ];

  for (const config of organizationDataConf) {
    await createOrganization(
      config.orgName,
      config.orgNameId,
      config.legalEntityName,
      config.domain,
      config.website,
      config.contactEmail
    );
  }
});
afterAll(async () => {
  for (const config of organizationDataConf) {
    await deleteOrganization(config.orgNameId);
  }
});

// In order the tests to work, the state of the DB must be clean

describe('Pagination - organization', () => {
  test('query filtered organization and verify data', async () => {
    // Act

    const requestPagination = await paginatedOrganization({
      first: 2,
      filter: { nameID: 'eco1host' },
    });
    const requestOrganization = await getOrganizationData('eco1host');

    // Assert
    expect(
      requestPagination?.data?.organizationsPaginated.organization[0]
    ).toEqual(requestOrganization?.data?.organization);
  });

  describe('Pagination with filter', () => {
    // Arrange

    test.each`
      first | filter                                          | result1                 | result2                 | organizationsCount
      ${1}  | ${{ displayName: 'org1' }}                      | ${'org1-email@test.io'} | ${'org1-email@test.io'} | ${1}
      ${2}  | ${{ contactEmail: 'email@test.io' }}            | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${2}
      ${11} | ${{ website: 'org' }}                           | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${5}
      ${17} | ${{ nameID: 'org5', website: 'org4-website' }}  | ${'org4-email@test.io'} | ${'org5-email@test.io'} | ${2}
      ${7}  | ${{ nameID: '', domain: '', contactEmail: '' }} | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${6}
      ${2}  | ${{ nameID: '', domain: '', contactEmail: '' }} | ${''}                   | ${'org1-email@test.io'} | ${2}
    `(
      'Quering: "$first" with filter: "$filter", returns organizations: "$result1","$result2", and organizationsCount: "$organizationsCount" ',
      async ({ first, filter, result1, result2, organizationsCount }) => {
        // Act
        const request = await paginatedOrganization({
          first: first,
          filter: filter,
        });
        const organizationData =
          request?.data?.organizationsPaginated.organization;

        // Assert
        expect(organizationData).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              contactEmail: result1,
            }),
          ])
        );
        expect(organizationData).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              contactEmail: result2,
            }),
          ])
        );
        expect(organizationData).toHaveLength(organizationsCount);
      }
    );
  });

  describe('Pagination without filter', () => {
    // Arrange
    test.each`
      first        | last         | result1                 | result2                 | organizationsCount
      ${11}        | ${undefined} | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${6}
      ${undefined} | ${17}        | ${'org3-email@test.io'} | ${'org4-email@test.io'} | ${6}
      ${7}         | ${undefined} | ${'org4-email@test.io'} | ${'org5-email@test.io'} | ${6}
      ${2}         | ${undefined} | ${''}                   | ${'org1-email@test.io'} | ${2}
    `(
      'Quering: first: "$first", last: "$last", returns organizations: "$result1","$result2", and organizationsCount: "$organizationsCount" ',
      async ({ first, last, result1, result2, organizationsCount }) => {
        // Act
        const request = await paginatedOrganization({
          first: first,
          last: last,
        });
        const organizations =
          request?.data?.organizationsPaginated.organization;

        // Assert
        expect(organizations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              contactEmail: result1,
            }),
          ])
        );
        expect(organizations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              contactEmail: result2,
            }),
          ])
        );
        expect(organizations).toHaveLength(organizationsCount);
      }
    );
  });

  // Skip test due to bug: #3571
  describe.skip('Pagination with cursors', () => {
    // Arrange
    let startCursor = '';
    let endCursor = '';
    beforeAll(async () => {
      const request = await paginatedOrganization({
        first: 2,
      });
      const returnedData = request?.data?.organizationsPaginated.pageInfo;
      startCursor = returnedData?.startCursor ?? '';
      endCursor = returnedData?.endCursor ?? '';
    });

    test('query organization with parameter: first: "1", after = startCursor ', async () => {
      // Act
      const request = await paginatedOrganization({
        first: 1,
        after: startCursor,
      });

      expect(request?.data?.organizationsPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: request?.data?.organizationsPaginated.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor:
            request?.data?.organizationsPaginated.pageInfo.startCursor,
        })
      );
    });

    test('query organization with parameter: first: "2", after = startCursor ', async () => {
      // Act
      const request = await paginatedOrganization({
        first: 2,
        after: startCursor,
      });
      const returnedData = request?.data?.organizationsPaginated;

      // Assert
      expect(returnedData?.organization).toHaveLength(2);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          hasNextPage: true,
          hasPreviousPage: true,
        })
      );
    });

    test('query organization with parameter: first: "1", after = endCursor ', async () => {
      // Act
      const request = await paginatedOrganization({
        first: 1,
        after: endCursor,
      });
      const returnedData = request?.data?.organizationsPaginated;

      // Assert
      expect(returnedData?.organization).toHaveLength(1);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: returnedData?.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: returnedData?.pageInfo.startCursor,
        })
      );
    });

    test('query organization with parameter: first: "2", after = endCursor ', async () => {
      // Act
      const request = await paginatedOrganization({
        first: 2,
        after: endCursor,
      });
      const returnedData = request?.data?.organizationsPaginated;

      // Assert
      expect(returnedData?.organization).toHaveLength(2);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: returnedData?.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: returnedData?.pageInfo.startCursor,
        })
      );
    });

    test('query organization with parameter: first: "4", after = endCursor ', async () => {
      // Act
      const request = await paginatedOrganization({
        first: 4,
        after: endCursor,
      });
      const returnedData = request?.data?.organizationsPaginated;

      // Assert
      expect(returnedData?.organization).toHaveLength(4);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: returnedData?.pageInfo.endCursor,
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: returnedData?.pageInfo.startCursor,
        })
      );
    });
  });

  describe('Invalid pagination queries', () => {
    // Arrange
    test.each`
      first        | last         | before                                    | after                                     | error
      ${1}         | ${1}         | ${undefined}                              | ${undefined}                              | ${'Using both "first" and "last" parameters is discouraged.'}
      ${1}         | ${undefined} | ${'71010bea-e4bd-464d-ab05-30dc4bb00dcb'} | ${undefined}                              | ${'Cursor "before" requires having "last" parameter.'}
      ${1}         | ${1}         | ${undefined}                              | ${'71010bea-e4bd-464d-ab05-30dc4bb00dcb'} | ${'Using both "first" and "last" parameters is discouraged.'}
      ${undefined} | ${1}         | ${undefined}                              | ${'71010bea-e4bd-464d-ab05-30dc4bb00dcb'} | ${'Cursor "after" requires having "first" parameter.'}
    `(
      'Quering: first: "$first", last: "$last", before: "$before", after: "$after" returns error: "$error" ',
      async ({ first, last, before, after, error }) => {
        // Act
        const request = await paginatedOrganization({
          first: first,
          last: last,
          before: before,
          after: after,
        });

        // Assert
        expect(request.error?.errors[0].message).toContain(error);
      }
    );
  });
});
