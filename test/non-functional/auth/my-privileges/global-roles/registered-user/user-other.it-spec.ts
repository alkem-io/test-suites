import {
  createUser,
  getUserData,
  deleteUser,
} from '@test/functional-api/contributor-management/user/user.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const userEmail = `space${uniqueId}@alkem.io`;
let userId = '';

beforeAll(async () => {
  const res = await createUser({ email: userEmail });
  userId = res?.data?.createUser.id ?? '';
});

afterAll(async () => {
  await deleteUser(userId);
});

describe('myPrivileges User', () => {
  test('RegisteredUser privileges to other User', async () => {
    // Act
    const response = await getUserData(
      userEmail,
      TestUser.NON_HUB_MEMBER
    );
    const data = response?.data?.user?.authorization;

    // Assert
    expect(data).toEqual({ myPrivileges: [] });
  });

  test('RegisteredUser privileges to other User / Profile', async () => {
    // Act
    const response = await getUserData(
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
    const response = await getUserData(
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
    const response = await getUserData(
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
    const response = await getUserData(
      userEmail,
      TestUser.NON_HUB_MEMBER
    );
    const data = response?.data?.user?.preferences;

    // Assert
    expect(data).toHaveLength(0);
  });
});
