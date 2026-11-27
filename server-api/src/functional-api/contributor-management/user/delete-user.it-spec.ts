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
import {
  createUserOrFail,
  deleteUser,
  getUserData,
} from './user.request.params';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  NEUTRAL_ERROR_CODE,
  NEUTRAL_ERROR_MESSAGE,
} from '@functional-api/error-response/error-response.constants';

/** A user that is not there is answered with the generic code and sentence. */
const expectUnavailable = (res: {
  error?: { errors: Array<Record<string, unknown>> };
}) => {
  expect(res.error?.errors[0]?.code).toBe(NEUTRAL_ERROR_CODE);
  expect(
    res.error?.errors[0]?.message === NEUTRAL_ERROR_MESSAGE,
    'the answer carries the generic sentence'
  ).toBe(true);
};

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
  const testUniqueId = UniqueIDGenerator.getID();
  userName = `testuser${testUniqueId}`;

  // Resilient to the harness's retry-after-commit race on a ~5 s connection
  // cut (test-suites#563): recovers the committed user by nameID instead of
  // leaving userId '' and failing later on a misleading GraphQL message.
  userId = await createUserOrFail({
    nameID: userName,
    email: 'testEmail' + testUniqueId + '@alkemio.io',
  });
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
    expectUnavailable(res);
  });

  test('should receive a message for deleting unexisting user', async () => {
    // Act
    const res = await deleteUser('180f55ab-2286-415d-952c-c588c5b6f533');

    // Assert
    expectUnavailable(res);
  });

  test('should not get result for quering deleted user', async () => {
    // Arrange
    // The global admin reads the user before the delete; the same read
    // afterwards returns no user and only the generic code. The earlier read
    // shows this token may read the user, so that answer means it is gone.
    const before = await getUserData(userId);
    expect(
      before.error === undefined && before.data?.user?.id === userId,
      'the user is readable before the delete'
    ).toBe(true);
    await deleteUser(userId);

    // Act
    userData = await getUserData(userId);

    // Assert
    expect(userData.data?.user == null, 'no user is returned').toBe(true);
    expectUnavailable(userData);
  });
});
