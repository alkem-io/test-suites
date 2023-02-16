import { resourceLimits } from 'worker_threads';
import { getUser } from '../user-management/user.request.params';
import { users } from '../zcommunications/communications-helper';
import { paginationFn } from './pagination.request.params';
import { UserFilter } from './user-filter';

// skipping until updated
describe.skip('Pagination - user', () => {
  // skipped due to bug: BUG: Authorization is null for organizationsPaginated and userPaginated#2152
  test.skip('query filtered user and verify data', async () => {
    // Act

    const requestPagination = await paginationFn<UserFilter>(
      { first: 2 },
      { email: 'admin@alkem.io' }
    );

    const requestUser = await getUser('admin@alkem.io');

    // Assert
    expect(requestPagination.body.data.usersPaginated.users[0]).toEqual(
      requestUser.body.data.user
    );
  });

  describe('Pagination with filter', () => {
    // Arrange
    test.each`
      pagination       | filter                                               | result1                     | result2                     | usersCount
      ${{ first: 1 }}  | ${{ firstName: 'not' }}                              | ${'notifications@alkem.io'} | ${'notifications@alkem.io'} | ${1}
      ${{ first: 2 }}  | ${{ email: 'admin@alkem.io' }}                       | ${'hub.admin@alkem.io'}     | ${'admin@alkem.io'}         | ${2}
      ${{ first: 11 }} | ${{ firstName: 'non' }}                              | ${'non.hub@alkem.io'}       | ${'non.hub@alkem.io'}       | ${1}
      ${{ first: 17 }} | ${{ firstName: 'non', email: 'hub.admin@alkem.io' }} | ${'hub.admin@alkem.io'}     | ${'non.hub@alkem.io'}       | ${2}
      ${{ first: 7 }}  | ${{ firstName: '', lastName: '', email: '' }}        | ${'hub.admin@alkem.io'}     | ${'admin@alkem.io'}         | ${6}
      ${{ first: 2 }}  | ${{ firstName: '', lastName: '', email: '' }}        | ${'notifications@alkem.io'} | ${'admin@alkem.io'}         | ${2}
    `(
      'Quering: "$pagination" with filter: "$filter", returns users: "$result1","$result2", and userCount: "$usersCount" ',
      async ({ pagination, filter, result1, result2, usersCount }) => {
        // Act
        const request = await paginationFn<UserFilter>(pagination, filter);
        const userData = request.body.data.usersPaginated.users;

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
      pagination       | result1                     | result2               | usersCount
      ${{ first: 11 }} | ${'non.hub@alkem.io'}       | ${'non.hub@alkem.io'} | ${6}
      ${{ last: 17 }}  | ${'hub.admin@alkem.io'}     | ${'non.hub@alkem.io'} | ${6}
      ${{ first: 7 }}  | ${'hub.admin@alkem.io'}     | ${'admin@alkem.io'}   | ${6}
      ${{ first: 2 }}  | ${'notifications@alkem.io'} | ${'admin@alkem.io'}   | ${2}
    `(
      'Quering: "$pagination", returns users: "$result1","$result2", and userCount: "$usersCount" ',
      async ({ pagination, result1, result2, usersCount }) => {
        // Act

        const request = await paginationFn(pagination);
        const users = request.body.data.usersPaginated.users;

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

  describe('Pagination with cursors', () => {
    // Arrange
    let startCursor = '';
    let endCursor = '';
    beforeAll(async () => {
      const request = await paginationFn({
        first: 2,
      });
      startCursor = request.body.data.usersPaginated.pageInfo.startCursor;
      endCursor = request.body.data.usersPaginated.pageInfo.endCursor;
    });

    test('query users with parameter: first: "1", after = startCursor ', async () => {
      // Act
      const request = await paginationFn({
        first: 1,
        after: startCursor,
      });

      // Assert
      expect(request.body.data.usersPaginated.users).toHaveLength(1);
      expect(request.body.data.usersPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: request.body.data.usersPaginated.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: request.body.data.usersPaginated.pageInfo.startCursor,
        })
      );
    });

    test('query users with parameter: first: "2", after = startCursor ', async () => {
      // Act
      const request = await paginationFn({
        first: 2,
        after: startCursor,
      });

      // Assert
      expect(request.body.data.usersPaginated.users).toHaveLength(2);
      expect(request.body.data.usersPaginated.pageInfo).toEqual(
        expect.objectContaining({
          hasNextPage: true,
          hasPreviousPage: true,
        })
      );
    });

    test('query users with parameter: first: "1", after = endCursor ', async () => {
      // Act
      const request = await paginationFn({
        first: 1,
        after: endCursor,
      });

      // Assert
      expect(request.body.data.usersPaginated.users).toHaveLength(1);
      expect(request.body.data.usersPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: request.body.data.usersPaginated.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: request.body.data.usersPaginated.pageInfo.startCursor,
        })
      );
    });

    test('query users with parameter: first: "2", after = endCursor ', async () => {
      // Act
      const request = await paginationFn({
        first: 2,
        after: endCursor,
      });

      // Assert
      expect(request.body.data.usersPaginated.users).toHaveLength(2);
      expect(request.body.data.usersPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: request.body.data.usersPaginated.pageInfo.endCursor,
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: request.body.data.usersPaginated.pageInfo.startCursor,
        })
      );
    });

    test('query users with parameter: first: "4", after = endCursor ', async () => {
      // Act
      const request = await paginationFn({
        first: 4,
        after: endCursor,
      });

      // Assert
      expect(request.body.data.usersPaginated.users).toHaveLength(4);
      expect(request.body.data.usersPaginated.pageInfo).toEqual(
        expect.objectContaining({
          endCursor: request.body.data.usersPaginated.pageInfo.endCursor,
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: request.body.data.usersPaginated.pageInfo.startCursor,
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
        const request = await paginationFn(paginationParams);

        // Assert
        expect(request.text).toContain(error);
      }
    );
  });
});
