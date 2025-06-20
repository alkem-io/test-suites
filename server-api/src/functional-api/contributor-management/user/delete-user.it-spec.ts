/**
 * This file contains integration tests for deleting user accounts within the platform.
 * It includes tests for creating users, deleting them, and verifying the deletion process.
 * The tests cover scenarios such as:
 * - Creating a user with a unique name ID.
 * - Deleting the created user and verifying the deletion.
 * - Handling errors when attempting to delete an already deleted user.
 * - Handling errors when attempting to delete a non-existing user.
 *
 * The tests ensure that the user deletion process works as expected,
 * and that the API responses match the expected values.
 */
import { createUser, deleteUser, getUserData } from './user.request.params';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';

const uniqueId = UniqueIDGenerator.getID();

let userName = '';
let userId: string;
let userData;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'delete-user',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

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
    userData = await getUserData(userId);

    // Assert
    expect(userData.error?.errors[0].message).toContain(
      `Unable to find user with given ID: ${userId}`
    );
  });
});
