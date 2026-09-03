/**
 * This file contains integration tests for creating user accounts within the platform.
 * It includes tests for creating users with specific details and verifying the creation process.
 * The tests cover scenarios such as:
 * - Creating a user with a unique display name.
 * - Verifying that the user is created successfully and the profile data matches the input.
 * - Handling errors when attempting to create a user with a duplicate name.
 * - Cleaning up by deleting the created users after tests.
 *
 * The tests ensure that the user creation process works as expected,
 * and that the API responses match the expected values.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  createUser,
  createUserDataOrFail,
  deleteUser,
  getUserData,
} from './user.request.params';

const uniqueId = UniqueIDGenerator.getID();

let userName = '';
let userId = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'user-create',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

beforeEach(() => {
  userName = `testuser${uniqueId}`;
});

describe('Create User', () => {
  afterEach(async () => {
    const a = await deleteUser(userId);
    console.log('delete user response', a.error, a.data);
  });

  test('should create a user', async () => {
    // Act — resilient to the harness retry-after-commit race (test-suites#563)
    const user = await createUserDataOrFail({
      profileData: { displayName: userName },
    });
    userId = user.id;

    // Assert
    expect(user.profile?.displayName).toEqual(userName);
    expect(user.authorization?.credentialRules).not.toBe('');
  });

  test('should throw error - same user is created twice', async () => {
    // Arrange
    const email = 'testEmail' + uniqueId + '@alkemio.io';

    const response = await createUser({
      nameID: userName,
      email: email,
    });
    userId = response?.data?.createUser.id ?? '';

    // Act
    const responseSecondTime = await createUser({
      nameID: userName,
      email: email,
    });

    // Assert
    expect(responseSecondTime.error?.errors[0].message).toContain(
      `The provided nameID is already taken: ${userName}`
    );
  });

  test('should query created user', async () => {
    // Arrange
    const userData = await createUserDataOrFail({
      profileData: { displayName: userName },
    });
    userId = userData.id;

    // Act
    const { data } = await getUserData(userId);

    // Assert
    expect(data?.user).toEqual(userData);
  });

  test('should throw error - create user with LONG NAME', async () => {
    // Act
    const response = await createUser({
      // nameID: 'taka',
      profileData: {
        displayName:
          'very looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong',
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
