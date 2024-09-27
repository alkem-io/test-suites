import { TestUser } from '@test/utils';
import {
  createUser,
  deleteUser,
  getUserData,
  getUsersData,
  updateUser,
} from './user.request.params';
import '@test/utils/array.matcher';
import { users } from '@test/utils/queries/users-data';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let userName = '';
let userFirstName = '';
let userLastName = '';
let userId: string;
let userPhone = '';
let userEmail = '';
let phoneAfterUpdate = '';
let userData: any;
let userDataCreate: any;

describe('Update user', () => {
  beforeEach(async () => {
    userName = `test-user${uniqueId}`;
    userFirstName = `userFirstName${uniqueId}`;
    userLastName = `userLastName${uniqueId}`;
    userPhone = `0888${uniqueId}`;
    userEmail = `${userName}@test.com`;
    phoneAfterUpdate = `updatePhone${uniqueId}`;

    const responseCreateUser = await createUser({
      firstName: userFirstName,
      lastName: userLastName,
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
    expect(userData?.profile?.location).toEqual({
      country: 'test country',
      city: 'test city',
    });
    expect(updatedUserData?.profile?.description).toEqual('test description');
    expect(updatedUserData).toEqual(userData?.data?.user);
  });

  test('should update user and be available in "users" query', async () => {
    // Act
    await updateUser(
      users.spaceAdmin.id,
      userPhone,
      {
        location: { country: 'test country', city: 'test city' },
        description: 'test description',
      },
      TestUser.HUB_ADMIN
    );
    const usersData = await getUsersData(
      users.spaceAdmin.id,
      TestUser.GLOBAL_ADMIN
    );

    // Assert;
    expect(usersData?.data?.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: users.spaceAdmin.email,
          id: users.spaceAdmin.id,
          phone: userPhone,
        }),
      ])
    );
  });
});
