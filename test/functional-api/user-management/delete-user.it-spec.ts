import {
  createUserCodegen,
  deleteUserCodegen,
  getUserDataCodegen,
  uniqueId,
} from './user.request.params';
import '@test/utils/array.matcher';

let userName = '';
let userId: string;
let userData;

beforeEach(async () => {
  userName = `testuser${uniqueId}`;

  const response = await createUserCodegen({ nameID: userName });
  userId = response?.data?.createUser?.id ?? '';
});
afterEach(async () => {
  await deleteUserCodegen(userId);
});

describe('Delete user', () => {
  test('should delete created user', async () => {
    // Act
    const res = await deleteUserCodegen(userId);
    // Assert

    expect(res?.data?.deleteUser.id).toEqual(userId);
  });

  test('should receive a message for deleting already deleted user', async () => {
    // Arrange
    await deleteUserCodegen(userId);

    // Act
    const res = await deleteUserCodegen(userId);

    // Assert
    expect(res.error?.errors[0].message).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });

  test('should receive a message for deleting unexisting user', async () => {
    // Act
    const res = await deleteUserCodegen('180f55ab-2286-415d-952c-c588c5b6f533');

    // Assert
    expect(res.error?.errors[0].message).toContain(
      'Unable to find user with given ID: 180f55ab-2286-415d-952c-c588c5b6f533'
    );
  });

  test('should not get result for quering deleted user', async () => {
    // Arrange
    await deleteUserCodegen(userId);

    // Act
    userData = await getUserDataCodegen(userId);

    // Assert
    expect(userData.error?.errors[0].message).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });
});
