import { paginationFn, UserFilter } from './pagination.request.params';

beforeAll(async () => {
  // create 30 users
});

afterAll(async () => {
  // remove 30 users
});

describe('Pagination - user', () => {
  test.only('query filtered user data', async () => {
    const a = await paginationFn<UserFilter>(
      { first: 1 },
      { lastname: '' }
      );
    console.log(a.body);
    console.log(a.body.data.usersPaginated);

    // Act

    // Assert
    expect(a.body.data.usersPaginated.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'notifications@alkem.io',
        }),
      ])
    );
    expect(a.body.data.usersPaginated.users).toHaveLength(1);
  });

  test('query users with parameter: first: "n"', async () => {
    // Act
  });

  test('query users with parameter: last: "n"', async () => {
    // Act
  });

  test('query users with parameters: first: "n" and after: ""', async () => {
    // Act
  });

  test('query users with parameters: last: "n" and before: ""', async () => {
    // Act
  });

  test('query users with parameters: first: "n" and after: "" and filter: ""', async () => {
    // Act
  });

  test('query users with parameters: last: "n" and before: "" and filter: ""', async () => {
    // Act
  });
});
