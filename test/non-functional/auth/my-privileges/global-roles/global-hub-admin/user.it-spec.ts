import {
  createUserCodegen,
  getUserDataCodegen,
  deleteUserCodegen,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  sorted__create_read_update_delete_authorizationReset,
  sorted__create_read_update_delete,
} from '../../common';

const userEmail = `space${uniqueId}@alkem.io`;
let userId = '';

beforeAll(async () => {
  const res = await createUserCodegen({ email: userEmail });
  userId = res?.data?.createUser.id ?? '';
});

afterAll(async () => {
  await deleteUserCodegen(userId);
});

describe('myPrivileges User', () => {
  test('GlobalSpaceAdmin privileges to other User', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data = response?.data?.user?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_authorizationReset
    );
  });

  test('GlobalSpaceAdmin privileges to other User / Profile', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response?.data?.user?.profile?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete);
  });

  test('GlobalSpaceAdmin privileges to other User / References', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response?.data?.user?.profile?.references?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete);
  });

  test('GlobalSpaceAdmin privileges to other User / Tagsets', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response?.data?.user?.profile?.tagsets?.[0].authorization?.myPrivileges ??
      [];

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete);
  });

  test('RegisteredUser privileges to my User / Preferences', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data = response?.data?.user?.preferences;

    // Assert
    expect(data).toHaveLength(28);
  });
});
