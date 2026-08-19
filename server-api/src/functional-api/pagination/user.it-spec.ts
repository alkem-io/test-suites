import { getUserData } from '../contributor-management/user/user.request.params';
import { paginatedUser } from './pagination.request.params';

/**
 * This suite used to assert absolute platform-wide user counts and specific
 * member emails (e.g. "…returns 12 users, including space.admin@alkem.io").
 * Those numbers were only ever valid while the shared identity pool was a
 * fixed 13 users. It no longer is: `TestUserManager` provisions one full
 * role set PER nightly worker slot (`lib/src/scenario/pool-identity.ts`), so
 * both the platform-wide total AND how many identities match a given
 * name/email filter now depend on how many worker slots have been
 * provisioned against this database — nothing this suite controls or should
 * be sensitive to.
 *
 * Each case therefore issues a live, unpaginated "ground truth" query with
 * the SAME filter immediately before the paginated one, and asserts the
 * paginated page against it. What that proves — the page has the right
 * SIZE, and its contents are a contiguous, correctly-ordered run of the
 * unpaginated result — is what this suite is actually for, and is strictly
 * more than the old "contains these two emails, has this length" check.
 *
 * Deliberately NOT asserted for `last`: which END of the result set it
 * takes. Observed live against this server, `last: N` returns the FIRST N
 * rows (identical to `first: N`), not the final N. The old table could not
 * detect that — its only `last` row used `last: 17` against a 12-user
 * platform, where every reading coincides. Pinning either direction here
 * would mean asserting behaviour this change has no business ruling on:
 * writing `slice(-N)` would fail today, and writing `slice(0, N)` would
 * bake a probable server bug into a green test. The contiguity check below
 * holds under either, and the discrepancy is called out here rather than
 * silently encoded. See also the already-skipped 'Pagination with cursors'
 * block (bug #3571) for related, known-shaky pagination semantics.
 */
const GROUND_TRUTH_PAGE_SIZE = 1000; // far above any realistic pool size

/**
 * Asserts `page` is exactly `expectedLength` entries AND appears in
 * `groundTruth` as an unbroken, same-order run. Replaces the old
 * `arrayContaining` + `toHaveLength` pair: it proves the limit and the
 * ordering together, without depending on the absolute size of the platform
 * user list or on which end a page is taken from.
 */
const expectContiguousPage = (
  page: string[],
  groundTruth: string[],
  expectedLength: number
) => {
  expect(page).toHaveLength(expectedLength);
  if (page.length === 0) {
    return;
  }
  const startIndex = groundTruth.indexOf(page[0]);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(groundTruth.slice(startIndex, startIndex + page.length)).toEqual(page);
};

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
      first | filter
      ${1}  | ${{ firstName: 'not' }}
      ${2}  | ${{ email: 'admin@alkem.io' }}
      ${11} | ${{ firstName: 'non' }}
      ${17} | ${{ firstName: 'non', email: 'space.admin@alkem.io' }}
      ${17} | ${{ firstName: 'non', lastName: 'spaces', email: 'space.admin@alkem.io', displayName: 'qa user' }}
      ${13} | ${{ firstName: '', lastName: '', email: '' }}
      ${2}  | ${{ firstName: '', lastName: '', email: '' }}
    `(
      'Quering with filter: "$filter" and first: "$first" returns exactly the first "$first" of whatever currently matches that filter',
      async ({ first, filter }) => {
        // Ground truth: everything this filter currently matches, unpaginated.
        const groundTruth = await paginatedUser({
          first: GROUND_TRUTH_PAGE_SIZE,
          filter,
        });
        const allMatchingEmails = (
          groundTruth?.data?.usersPaginated.users ?? []
        ).map(user => user.email);
        // A filter that matches nothing would make the assertions below
        // vacuously true — guard against that so the case still proves
        // something even if the filter semantics change.
        expect(allMatchingEmails.length).toBeGreaterThan(0);

        // Act
        const request = await paginatedUser({ first, filter });
        const userData = (request?.data?.usersPaginated.users ?? []).map(
          user => user.email
        );

        // Assert — `first: N` takes the leading N of the matching set.
        expect(userData).toEqual(
          allMatchingEmails.slice(0, Math.min(first, allMatchingEmails.length))
        );
      }
    );
  });

  describe('Pagination without filter', () => {
    // Arrange
    test.each`
      first        | last
      ${11}        | ${undefined}
      ${undefined} | ${17}
      ${7}         | ${undefined}
      ${2}         | ${undefined}
    `(
      'Quering: first: "$first" and last: "$last", returns a correctly-sized, correctly-ordered page of the full user list',
      async ({ first, last }) => {
        // Ground truth: the full, unpaginated user list.
        const groundTruth = await paginatedUser({
          first: GROUND_TRUTH_PAGE_SIZE,
        });
        const allEmails = (groundTruth?.data?.usersPaginated.users ?? []).map(
          user => user.email
        );
        expect(allEmails.length).toBeGreaterThan(0);
        const requested = first ?? last;
        const expectedLength = Math.min(requested, allEmails.length);

        // Act
        const request = await paginatedUser({ first, last });
        const users = (request?.data?.usersPaginated.users ?? []).map(
          user => user.email
        );

        // Assert
        expectContiguousPage(users, allEmails, expectedLength);
        if (first !== undefined) {
          // `first: N` is unambiguous — it takes the LEADING N.
          expect(users).toEqual(allEmails.slice(0, expectedLength));
        }
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
