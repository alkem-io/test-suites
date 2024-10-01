import { getUserData } from '../contributor-management/user/user.request.params';
import { paginatedUser } from './pagination.request.params';

// In order the tests to work, the state of the DB must be clean

describe('Pagination - user', () => {
  test('query filtered user and verify data', async () => {
    // Act
    const requestPagination = await paginatedUser({
      first: 2,
      filter: { email: 'admin@alkem.io' },
    });

    const requestUser = await getUserData('admin@alkem.io');

    // Assert
    expect(requestPagination?.data?.usersPaginated.users[0]).toEqual(
      requestUser?.data?.user
    );
  });

  describe('Pagination with filter', () => {
    // Arrange
    test.each`
      first | filter                                                                                             | result1                       | result2                     | usersCount
      ${1}  | ${{ firstName: 'not' }}                                                                            | ${'notifications@alkem.io'}   | ${'notifications@alkem.io'} | ${1}
      ${2}  | ${{ email: 'admin@alkem.io' }}                                                                     | ${'community.admin@alkem.io'} | ${'admin@alkem.io'}         | ${2}
      ${11} | ${{ firstName: 'non' }}                                                                            | ${'non.space@alkem.io'}       | ${'non.space@alkem.io'}     | ${1}
      ${17} | ${{ firstName: 'non', email: 'space.admin@alkem.io' }}                                             | ${'space.admin@alkem.io'}     | ${'non.space@alkem.io'}     | ${2}
      ${17} | ${{ firstName: 'non', lastName: 'spaces', email: 'space.admin@alkem.io', displayName: 'qa user' }} | ${'qa.user@alkem.io'}         | ${'non.space@alkem.io'}     | ${4}
      ${13} | ${{ firstName: '', lastName: '', email: '' }}                                                      | ${'space.admin@alkem.io'}     | ${'admin@alkem.io'}         | ${12}
      ${2}  | ${{ firstName: '', lastName: '', email: '' }}                                                      | ${'notifications@alkem.io'}   | ${'admin@alkem.io'}         | ${2}
    `(
      'Quering: "$pagination" with filter: "$filter", returns users: "$result1","$result2", and userCount: "$usersCount" ',
      async ({ first, filter, result1, result2, usersCount }) => {
        // Act
        const request = await paginatedUser({
          first,
          filter,
        });
        const userData = request?.data?.usersPaginated.users;

        // Assert
        expect(userData).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: result1,
            }),
          ])
        );
        expect(userData).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: result2,
            }),
          ])
        );
        expect(userData).toHaveLength(usersCount);
      }
    );
  });

  describe('Pagination without filter', () => {
    // Arrange
    test.each`
      first        | last         | result1                     | result2                 | usersCount
      ${11}        | ${undefined} | ${'non.space@alkem.io'}     | ${'non.space@alkem.io'} | ${11}
      ${undefined} | ${17}        | ${'space.admin@alkem.io'}   | ${'non.space@alkem.io'} | ${12}
      ${7}         | ${undefined} | ${'space.admin@alkem.io'}   | ${'admin@alkem.io'}     | ${7}
      ${2}         | ${undefined} | ${'notifications@alkem.io'} | ${'admin@alkem.io'}     | ${2}
    `(
      'Quering: first: "$first" and last: "$last", returns users: "$result1","$result2", and userCount: "$usersCount" ',
      async ({ first, last, result1, result2, usersCount }) => {
        // Act

        const request = await paginatedUser({
          first,
          last,
        });
        const users = request?.data?.usersPaginated.users;

        // Assert
        expect(users).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: result1,
            }),
          ])
        );
        expect(users).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              email: result2,
            }),
          ])
        );
        expect(users).toHaveLength(usersCount);
      }
    );
  });

  // Skip test due to bug: #3571
  describe.skip('Pagination with cursors', () => {
    // Arrange
    let startCursor = '';
    let endCursor = '';
    beforeAll(async () => {
      const request = await paginatedUser({
        first: 2,
      });
      const returnedData = request?.data?.usersPaginated.pageInfo;
      startCursor = returnedData?.startCursor ?? '';
      endCursor = returnedData?.endCursor ?? '';
    });

    test('query users with parameter: first: "1", after = startCursor ', async () => {
      // Act
      const request = await paginatedUser({
        first: 1,
        after: startCursor,
      });
      const returnedData = request?.data?.usersPaginated;

      // Assert
      expect(returnedData?.users).toHaveLength(1);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: returnedData?.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: returnedData?.pageInfo.startCursor,
        })
      );
    });

    test('query users with parameter: first: "2", after = startCursor ', async () => {
      // Act
      const request = await paginatedUser({
        first: 2,
        after: startCursor,
      });
      const returnedData = request?.data?.usersPaginated;

      // Assert
      expect(returnedData?.users).toHaveLength(2);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          hasNextPage: true,
          hasPreviousPage: true,
        })
      );
    });

    test('query users with parameter: first: "1", after = endCursor ', async () => {
      // Act
      const request = await paginatedUser({
        first: 1,
        after: endCursor,
      });
      const returnedData = request?.data?.usersPaginated;

      // Assert
      expect(returnedData?.users).toHaveLength(1);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: returnedData?.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: returnedData?.pageInfo.startCursor,
        })
      );
    });

    test('query users with parameter: first: "2", after = endCursor ', async () => {
      // Act
      const request = await paginatedUser({
        first: 2,
        after: endCursor,
      });
      const returnedData = request?.data?.usersPaginated;

      // Assert
      expect(returnedData?.users).toHaveLength(2);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: returnedData?.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: returnedData?.pageInfo.startCursor,
        })
      );
    });

    test('query users with parameter: first: "4", after = endCursor ', async () => {
      // Act
      const request = await paginatedUser({
        first: 4,
        after: endCursor,
      });
      const returnedData = request?.data?.usersPaginated;

      // Assert
      expect(returnedData?.users).toHaveLength(4);
      expect(returnedData?.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: returnedData?.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: returnedData?.pageInfo.startCursor,
        })
      );
    });

    test('query users with parameter: first: "12", after = endCursor ', async () => {
      // Act
      const request = await paginatedUser({
        first: 12,
        after: endCursor,
      });
      const returnedData = request?.data?.usersPaginated;

      // Assert
      expect(returnedData?.users).toHaveLength(10);
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
        const request = await paginatedUser({
          first,
          last,
          before,
          after,
        });

        // Assert
        expect(request.error?.errors[0].message).toContain(error);
      }
    );
  });
});
