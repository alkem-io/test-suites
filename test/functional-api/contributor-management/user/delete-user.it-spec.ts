import {
  createUser,
  deleteUser,
  getUserDataCodegen,
} from './user.request.params';
import '@test/utils/array.matcher';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let userName = '';
let userId: string;
let userData;

beforeEach(async () => {
  userName = `testuser${uniqueId}`;

  const response = await createUser({ nameID: userName });
  userId = response?.data?.createUser?.id ?? '';
});
afterEach(async () => {
  await deleteUser(userId);
});

describe('Delete user', () => {
  test('should delete created user', async () => {
    // Act
    const res = await deleteUser(userId);
    // Assert

    expect(res?.data?.deleteUser.id).toEqual(userId);
  });

  test('should receive a message for deleting already deleted user', async () => {
    // Arrange
    await deleteUser(userId);

    // Act
    const res = await deleteUser(userId);

    // Assert
    expect(res.error?.errors[0].message).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });

  test('should receive a message for deleting unexisting user', async () => {
    // Act
    const res = await deleteUser('180f55ab-2286-415d-952c-c588c5b6f533');

    // Assert
    expect(res.error?.errors[0].message).toContain(
      'Unable to find user with given ID: 180f55ab-2286-415d-952c-c588c5b6f533'
    );
  });

  test('should not get result for quering deleted user', async () => {
    // Arrange
    await deleteUser(userId);

    // Act
    userData = await getUserDataCodegen(userId);

    // Assert
    expect(userData.error?.errors[0].message).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });
});
