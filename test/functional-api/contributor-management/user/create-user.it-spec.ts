import {
  createUser,
  deleteUser,
  getUserData,
  registerVerifiedUser,
} from '../user.request.params';
import '@test/utils/array.matcher';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let userName = '';
let userId = '';

beforeEach(() => {
  userName = `testuser${uniqueId}`;
});

describe('Create User', () => {
  afterEach(async () => {
    await deleteUser(userId);
  });

  test('should create a user', async () => {
    // Act
    const response = await createUser({
      profileData: { displayName: userName },
    });

    userId = response?.data?.createUser.id ?? '';

    // Assert
    expect(response?.data?.createUser?.profile.displayName).toEqual(userName);
    expect(response?.data?.createUser?.authorization?.credentialRules).not.toBe(
      ''
    );
  });

  test('should throw error - same user is created twice', async () => {
    // Arrange
    const response = await createUser({
      nameID: userName,
    });
    userId = response?.data?.createUser.id ?? '';

    // Act
    const responseSecondTime = await createUser({
      nameID: userName,
    });

    // Assert
    expect(responseSecondTime.error?.errors[0].message).toContain(
      `The provided nameID is already taken: ${userName}`
    );
  });

  test('should query created user', async () => {
    // Arrange
    const response = await createUser({
      profileData: { displayName: userName },
    });
    const userData = response?.data?.createUser;
    userId = userData?.id ?? '';

    // Act
    const getUserData = await getUserData(userId);

    // Assert
    expect(getUserData?.data?.user).toEqual(userData);
  });

  test('should throw error - create user with LONG NAME', async () => {
    // Act
    const response = await createUser({
      // nameID: 'taka',
      profileData: {
        displayName:
          'very loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong name',
      },
    });

    // Assert
    expect(response.error?.errors[0].message).toContain(
      'property profileData.displayName has failed the following constraints: maxLength'
    );
  });

  test('should throw error - create user with invalid email', async () => {
    // Act
    const response = await createUser({ email: 'testEmail' });

    // Assert
    expect(response.error?.errors[0].message).toContain(
      'property email has failed the following constraints: isEmail'
    );
  });
});
