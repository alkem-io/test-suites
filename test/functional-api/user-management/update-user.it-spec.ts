import { TestUser } from '@test/utils';
import {
  createUserCodegen,
  deleteUserCodegen,
  getUserDataCodegen,
  getUsersDataCodegen,
  updateUserCodegen,
} from './user.request.params';
import '@test/utils/array.matcher';
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
let getUserData;
let userDataCreate: any;

describe('Update user', () => {
  beforeEach(async () => {
    userName = `test-user${uniqueId}`;
    userFirstName = `userFirstName${uniqueId}`;
    userLastName = `userLastName${uniqueId}`;
    userPhone = `userPhone ${uniqueId}`;
    userEmail = `${userName}@test.com`;
    phoneAfterUpdate = `updatePhone${uniqueId}`;

    const responseCreateUser = await createUserCodegen({
      firstName: userFirstName,
      lastName: userLastName,
      email: userEmail,
      phone: userPhone,
    });
    userDataCreate = responseCreateUser?.data?.createUser;
    userId = userDataCreate?.id ?? '';
  });

  afterEach(async () => {
    await deleteUserCodegen(userId);
  });

  test('should update user "phone" only', async () => {
    // Act
    const responseUpdateUser = await updateUserCodegen(userId, '359777777777');
    getUserData = await getUserDataCodegen(userId);

    // Assert
    expect(responseUpdateUser.status).toBe(200);
    expect(userDataCreate).not.toEqual(responseUpdateUser?.data?.updateUser);
    expect(getUserData?.data?.user).toEqual(
      responseUpdateUser?.data?.updateUser
    );
  });

  test('should update user "phone" and "location"', async () => {
    // Act
    const responseUpdateUser = await updateUserCodegen(
      userId,
      phoneAfterUpdate,
      {
        location: { country: 'test country', city: 'test city' },
        description: 'test description',
      }
    );
    const userData = responseUpdateUser?.data?.updateUser;
    getUserData = await getUserDataCodegen(userId);

    // Assert
    expect(userData?.profile?.location).toEqual({
      country: 'test country',
      city: 'test city',
    });
    expect(userData?.profile?.description).toEqual('test description');
    expect(userData).toEqual(getUserData?.data?.user);
  });

  // ToDo - review why the test somethimes fails when run in parallel
  test.skip('should update user and be available in "users" query', async () => {
    // Act
    await updateUserCodegen(userId, userPhone);

    const getUsersData = await getUsersDataCodegen(
      userId,
      TestUser.GLOBAL_ADMIN
    );
    // Assert
    expect(getUsersData?.data?.users).toEqual(
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
