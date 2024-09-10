import {
  createUserCodegen,
  deleteUserCodegen,
  getUserDataCodegen,
  registerVerifiedUser,
} from './user.request.params';
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
    await deleteUserCodegen(userId);
  });

  test('should create a user', async () => {
    // Act
    const response = await createUserCodegen({
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
    const response = await createUserCodegen({
      nameID: userName,
    });
    userId = response?.data?.createUser.id ?? '';

    // Act
    const responseSecondTime = await registerVerifiedUser(
      `testuser2${uniqueId}@alkem.io`,
      userName + 1,
      userName + 1
    );

    // Assert
    expect(responseSecondTime.error?.errors[0].message).toContain(
      `The provided nameID is already taken: ${userName}`
    );
  });

  test('should query created user', async () => {
    // Arrange
    const response = await createUserCodegen({
      profileData: { displayName: userName },
    });
    const userData = response?.data?.createUser;
    userId = userData?.id ?? '';

    // Act
    const getUserData = await getUserDataCodegen(userId);

    // Assert
    expect(getUserData?.data?.user).toEqual(userData);
  });

  test('should throw error - create user with LONG NAME', async () => {
    // Act
    const response = await createUserCodegen({
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
    const response = await createUserCodegen({ email: 'testEmail' });

    // Assert
    expect(response.error?.errors[0].message).toContain(
      'property email has failed the following constraints: isEmail'
    );
  });
});
