import { getUserData } from '@test/functional-api/contributor-management/user/user.request.params';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';

describe('myPrivileges User', () => {
  test('RegisteredUser privileges to my User', async () => {
    // Act
    const response = await getUserData(
      users.nonSpaceMember.email,
      TestUser.NON_HUB_MEMBER
    );
    const data = response?.data?.user?.authorization?.myPrivileges;

    // Assert
    expect(data).toEqual(['CREATE', 'READ', 'UPDATE', 'DELETE']);
  });

  test('RegisteredUser privileges to my User / Profile', async () => {
    // Act
    const response = await getUserData(
      users.nonSpaceMember.email,
      TestUser.NON_HUB_MEMBER
    );
    const data = response?.data?.user?.profile?.authorization?.myPrivileges;

    // Assert
    expect(data).toEqual(['CREATE', 'READ', 'UPDATE', 'DELETE']);
  });

  test('RegisteredUser privileges to my User / References', async () => {
    // Act
    const response = await getUserData(
      users.nonSpaceMember.email,
      TestUser.NON_HUB_MEMBER
    );
    const data =
      response?.data?.user?.profile?.references?.[0].authorization
        ?.myPrivileges;

    // Assert
    expect(data).toEqual(['CREATE', 'READ', 'UPDATE', 'DELETE']);
  });

  test('RegisteredUser privileges to my User / Preferences', async () => {
    // Act
    const response = await getUserData(
      users.nonSpaceMember.email,
      TestUser.NON_HUB_MEMBER
    );
    const data = response?.data?.user?.preferences;

    // Assert
    expect(data).toHaveLength(28);
  });
});
