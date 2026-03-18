/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This file contains integration tests for updating user information within the platform.
 * It includes tests for creating users, updating their details, and verifying the updates.
 * The tests cover scenarios such as:
 * - Creating a user with specific details like name, email, and phone number.
 * - Updating the user's phone number.
 * - Verifying that the user's phone number is updated correctly.
 * - Cleaning up by deleting the created users after tests.
 *
 * The tests ensure that the user update process works as expected,
 * and that the API responses match the expected values.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  createUser,
  deleteUser,
  getUserData,
  getUsersData,
  updateUser,
} from './user.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';

let userName = '';
let userFirstName = '';
let userLastName = '';
let userId: string;
let userPhone = '';
let userEmail = '';
let phoneAfterUpdate = '';
let userData: any;
let userDataCreate: any;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'update-user',
};
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('Update user', () => {
  beforeEach(async () => {
    const uniqueId = UniqueIDGenerator.getID();
    userName = `test-user${uniqueId}`;
    userFirstName = `userFirstName${uniqueId}`;
    userLastName = `userLastName${uniqueId}`;
    userPhone = `0888${uniqueId}`;
    userEmail = `${userName}@test.com`;
    phoneAfterUpdate = `updatePhone${uniqueId}`;

    const responseCreateUser = await createUser({
      firstName: userFirstName,
      lastName: userLastName,
      nameID: userName,
      email: userEmail,
      phone: userPhone,
    });
    userDataCreate = responseCreateUser?.data?.createUser;
    userId = userDataCreate?.id ?? '';
  });

  afterEach(async () => {
    await deleteUser(userId);
  });

  test('should update user "phone" only', async () => {
    // Act
    const responseUpdateUser = await updateUser(userId, '359777777777');
    userData = await getUserData(userId);

    // Assert
    expect(responseUpdateUser.status).toBe(200);
    expect(userDataCreate).not.toEqual(responseUpdateUser?.data?.updateUser);
    expect(userData?.data?.user).toEqual(responseUpdateUser?.data?.updateUser);
  });

  test('should update user "phone" and "location"', async () => {
    // Act
    const responseUpdateUser = await updateUser(userId, phoneAfterUpdate, {
      location: { country: 'test country', city: 'test city' },
      description: 'test description',
    });
    const updatedUserData = responseUpdateUser?.data?.updateUser;
    userData = await getUserData(userId);

    // Assert
    expect(userData?.data.user.profile?.location).toEqual({
      country: 'test country',
      city: 'test city',
    });
    expect(updatedUserData?.profile?.description).toEqual('test description');
    expect(updatedUserData).toEqual(userData?.data?.user);
  });

  test('should update user and be available in "users" query', async () => {
    // Act
    await updateUser(
      TestUserManager.users.spaceAdmin.id,
      userPhone,
      {
        location: { country: 'test country', city: 'test city' },
        description: 'test description',
      },
      TestUser.SPACE_ADMIN
    );
    const usersData = await getUsersData(
      TestUserManager.users.spaceAdmin.id,
      TestUser.GLOBAL_ADMIN
    );

    // Assert;
    expect(usersData?.data?.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: TestUserManager.users.spaceAdmin.email,
          id: TestUserManager.users.spaceAdmin.id,
          phone: userPhone,
        }),
      ])
    );
  });
});
