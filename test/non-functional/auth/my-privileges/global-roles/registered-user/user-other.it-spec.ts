import {
  createUserCodegen,
  getUserDataCodegen,
  deleteUserCodegen,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';

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
  test('RegisteredUser privileges to other User', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.NON_HUB_MEMBER
    );
    const data = response?.data?.user?.authorization;

    // Assert
    expect(data).toEqual({ myPrivileges: [] });
  });

  test('RegisteredUser privileges to other User / Profile', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response?.data?.user?.profile?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data).toEqual([]);
  });

  test('RegisteredUser privileges to other User / References', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response?.data?.user?.profile?.references?.[0].authorization
        ?.myPrivileges ?? [];

    // Assert
    expect(data).toEqual([]);
  });

  test('RegisteredUser privileges to other User / Tagsets', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response?.data?.user?.profile?.tagsets?.[0].authorization?.myPrivileges;

    // Assert
    expect(data).toEqual([]);
  });

  test('RegisteredUser privileges to my User / Preferences', async () => {
    // Act
    const response = await getUserDataCodegen(
      userEmail,
      TestUser.NON_HUB_MEMBER
    );
    const data = response?.data?.user?.preferences;

    // Assert
    expect(data).toHaveLength(0);
  });
});
