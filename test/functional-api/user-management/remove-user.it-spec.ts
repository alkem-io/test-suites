import { createUser, getUsersProfile, removeUser } from './user.request.params';
import '@test/utils/array.matcher';

let userName = '';
let userId = '';
let uniqueId = '';
let userData;

beforeEach(async () => {
  uniqueId = Math.random()
    .toString(12)
    .slice(-6);
  userName = `testuser${uniqueId}`;

  const response = await createUser(userName);
  userId = response.body.data.createUser.id;
});
afterEach(async () => {
  await removeUser(userId);
});

describe('Remove user', () => {
  test('should remove created user', async () => {
    // Act
    const responseQuery = await removeUser(userId);
    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.body.data.deleteUser.id).toEqual(userId);
  });

  test('should receive a message for removing already removed user', async () => {
    // Arrange
    await removeUser(userId);

    // Act
    const responseQuery = await removeUser(userId);

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });

  test('should receive a message for removing unexisting user', async () => {
    // Act
    const responseQuery = await removeUser(
      '180f55ab-2286-415d-952c-c588c5b6f533'
    );

    // Assert
    expect(responseQuery.status).toBe(200);
    expect(responseQuery.text).toContain(
      'Unable to find user with given ID: 180f55ab-2286-415d-952c-c588c5b6f533'
    );
  });

  test('should not get result for quering removed user', async () => {
    // Arrange
    await removeUser(userId);

    // Act
    userData = await getUsersProfile(userId);

    // Assert
    expect(userData.status).toBe(200);
    expect(userData.text).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });
});
