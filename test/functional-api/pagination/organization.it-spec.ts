import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
  getOrganizationData,
} from '../integration/organization/organization.request.params';
import { getOrganizationDataCodegen } from '../organization/organization.request.params';
import { OrganizationFilter } from './organization-filter';
import { paginationFnOrganization } from './pagination.request.params';

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
    await createOrganizationCodegen(
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
    await deleteOrganizationCodegen(config.orgNameId);
  }
});

describe('Pagination - organization', () => {
  // skipped due to bug: BUG: Authorization is null for organizationsPaginated and userPaginated#2152
  test.skip('query filtered organization and verify data', async () => {
    // Act

    const requestPagination = await paginationFnOrganization<
      OrganizationFilter
    >({ first: 2 }, { nameID: 'eco1host' });
    console.log(requestPagination.body);

    const requestOrganization = await getOrganizationDataCodegen('eco1host');

    // Assert
    expect(
      requestPagination.body.data.organizationsPaginated.organization[0]
    ).toEqual(requestOrganization?.data?.organization);
  });

  describe('Pagination with filter', () => {
    // Arrange

    test.each`
      pagination       | filter                                          | result1                 | result2                 | organizationsCount
      ${{ first: 1 }}  | ${{ displayName: 'org1' }}                      | ${'org1-email@test.io'} | ${'org1-email@test.io'} | ${1}
      ${{ first: 2 }}  | ${{ contactEmail: 'email@test.io' }}            | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${2}
      ${{ first: 11 }} | ${{ website: 'org' }}                           | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${5}
      ${{ first: 17 }} | ${{ nameID: 'org5', website: 'org4-website' }}  | ${'org4-email@test.io'} | ${'org5-email@test.io'} | ${2}
      ${{ first: 7 }}  | ${{ nameID: '', domain: '', contactEmail: '' }} | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${6}
      ${{ first: 2 }}  | ${{ nameID: '', domain: '', contactEmail: '' }} | ${''}                   | ${'org1-email@test.io'} | ${2}
    `(
      'Quering: "$pagination" with filter: "$filter", returns organizations: "$result1","$result2", and organizationsCount: "$organizationsCount" ',
      async ({ pagination, filter, result1, result2, organizationsCount }) => {
        // Act
        const request = await paginationFnOrganization<OrganizationFilter>(
          pagination,
          filter
        );

        const organizationData =
          request.body.data.organizationsPaginated.organization;

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
      pagination       | result1                 | result2                 | organizationsCount
      ${{ first: 11 }} | ${'org1-email@test.io'} | ${'org2-email@test.io'} | ${6}
      ${{ last: 17 }}  | ${'org3-email@test.io'} | ${'org4-email@test.io'} | ${6}
      ${{ first: 7 }}  | ${'org4-email@test.io'} | ${'org5-email@test.io'} | ${6}
      ${{ first: 2 }}  | ${''}                   | ${'org1-email@test.io'} | ${2}
    `(
      'Quering: "$pagination", returns organizations: "$result1","$result2", and organizationsCount: "$organizationsCount" ',
      async ({ pagination, result1, result2, organizationsCount }) => {
        // Act

        const request = await paginationFnOrganization(pagination);
        const organizations =
          request.body.data.organizationsPaginated.organization;

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

  describe('Pagination with cursors', () => {
    // Arrange
    let startCursor = '';
    let endCursor = '';
    beforeAll(async () => {
      const request = await paginationFnOrganization({
        first: 2,
      });
      startCursor =
        request.body.data.organizationsPaginated.pageInfo.startCursor;
      endCursor = request.body.data.organizationsPaginated.pageInfo.endCursor;
    });

    test('query organization with parameter: first: "1", after = startCursor ', async () => {
      // Act
      const request = await paginationFnOrganization({
        first: 1,
        after: startCursor,
      });

      // Assert
      expect(
        request.body.data.organizationsPaginated.organization
      ).toHaveLength(1);
      expect(request.body.data.organizationsPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor:
            request.body.data.organizationsPaginated.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor:
            request.body.data.organizationsPaginated.pageInfo.startCursor,
        })
      );
    });

    test('query organization with parameter: first: "2", after = startCursor ', async () => {
      // Act
      const request = await paginationFnOrganization({
        first: 2,
        after: startCursor,
      });

      // Assert
      expect(
        request.body.data.organizationsPaginated.organization
      ).toHaveLength(2);
      expect(request.body.data.organizationsPaginated.pageInfo).toEqual(
        expect.objectContaining({
          hasNextPage: true,
          hasPreviousPage: true,
        })
      );
    });

    test('query organization with parameter: first: "1", after = endCursor ', async () => {
      // Act
      const request = await paginationFnOrganization({
        first: 1,
        after: endCursor,
      });

      // Assert
      expect(
        request.body.data.organizationsPaginated.organization
      ).toHaveLength(1);
      expect(request.body.data.organizationsPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor:
            request.body.data.organizationsPaginated.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor:
            request.body.data.organizationsPaginated.pageInfo.startCursor,
        })
      );
    });

    test('query organization with parameter: first: "2", after = endCursor ', async () => {
      // Act
      const request = await paginationFnOrganization({
        first: 2,
        after: endCursor,
      });

      // Assert
      expect(
        request.body.data.organizationsPaginated.organization
      ).toHaveLength(2);
      expect(request.body.data.organizationsPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor:
            request.body.data.organizationsPaginated.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor:
            request.body.data.organizationsPaginated.pageInfo.startCursor,
        })
      );
    });

    test('query organization with parameter: first: "4", after = endCursor ', async () => {
      // Act
      const request = await paginationFnOrganization({
        first: 4,
        after: endCursor,
      });

      // Assert
      expect(
        request.body.data.organizationsPaginated.organization
      ).toHaveLength(4);
      expect(request.body.data.organizationsPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor:
            request.body.data.organizationsPaginated.pageInfo.endCursor,
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor:
            request.body.data.organizationsPaginated.pageInfo.startCursor,
        })
      );
    });
  });

  describe('Invalid pagination queries', () => {
    // Arrange
    test.each`
      paginationParams                                                        | error
      ${{ first: 1, last: 1 }}                                                | ${'Using both \\"first\\" and \\"last\\" parameters is discouraged.'}
      ${{ first: 1, before: '71010bea-e4bd-464d-ab05-30dc4bb00dcb' }}         | ${'Cursor \\"before\\" requires having \\"last\\" parameter.'}
      ${{ first: 1, last: 1, after: '71010bea-e4bd-464d-ab05-30dc4bb00dcb' }} | ${'Using both \\"first\\" and \\"last\\" parameters is discouraged.'}
      ${{ last: 1, after: '71010bea-e4bd-464d-ab05-30dc4bb00dcb' }}           | ${'Cursor \\"after\\" requires having \\"first\\" parameter.'}
    `(
      'Quering: "$paginationParams", returns error: "$error" ',
      async ({ paginationParams, error }) => {
        // Act
        const request = await paginationFnOrganization(paginationParams);

        // Assert
        expect(request.text).toContain(error);
      }
    );
  });
});
