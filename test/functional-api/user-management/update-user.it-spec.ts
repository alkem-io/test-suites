import { TestUser } from '@test/utils';
import {
  createUserDetails,
  getUpdatedUserData,
  getUsers,
  removeUser,
  updateUser,
} from './user.request.params';
import '@test/utils/array.matcher';

let userName = '';
let userFirstName = '';
let userLastName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let phoneAfterUpdate = '';
let getUserData;
let userDataCreate: any;
let uniqueId = '';

describe('Update user', () => {
  beforeEach(async () => {
    uniqueId = Math.random()
      .toString(12)
      .slice(-6);
    userName = `test-user${uniqueId}`;
    userFirstName = `userFirstName${uniqueId}`;
    userLastName = `userLastName${uniqueId}`;
    userPhone = `userPhone ${uniqueId}`;
    userEmail = `${userName}@test.com`;
    phoneAfterUpdate = `updatePhone${uniqueId}`;
    const responseCreateUser = await createUserDetails(
      userName,
      userFirstName,
      userLastName,
      userPhone,
      userEmail
    );
    userId = responseCreateUser.body.data.createUser.id;
    userDataCreate = responseCreateUser.body.data.createUser;
  });

  afterEach(async () => {
    await removeUser(userId);
  });

  test('should update user "phone" only', async () => {
    // Act
    const responseUpdateUser = await updateUser(userId, '359777777777');
    getUserData = await getUpdatedUserData(userId);

    // Assert
    expect(responseUpdateUser.status).toBe(200);
    expect(userDataCreate).not.toEqual(responseUpdateUser.body.data.updateUser);
    expect(getUserData.body.data.user).toEqual(
      responseUpdateUser.body.data.updateUser
    );
  });

  test('should update user "phone" and "location"', async () => {
    // Act
    const responseUpdateUser = await updateUser(userId, phoneAfterUpdate, {
      location: { country: 'test country', city: 'test city' },
      description: 'test description',
    });
    getUserData = await getUpdatedUserData(userId);

    // Assert
    expect(responseUpdateUser.body.data.updateUser.profile.location).toEqual({
      country: 'test country',
      city: 'test city',
    });
    expect(responseUpdateUser.body.data.updateUser.profile.description).toEqual(
      'test description'
    );
    expect(responseUpdateUser.body.data.updateUser).toEqual(
      getUserData.body.data.user
    );
  });

  test('should update user and be available in "users" query', async () => {
    // Act
    await updateUser(userId, userPhone);
    const getUsersData = await getUsers(TestUser.GLOBAL_HUBS_ADMIN);
    // Assert
    expect(getUsersData.body.data.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: userEmail,
          id: userId,
          phone: userPhone,
        }),
      ])
    );
  });
});
