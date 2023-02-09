import {
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';

const userEmail = 'non.hub@alkem.io';
let userId = '';

beforeAll(async () => {
  const res = await getUser(userEmail);
  userId = res.body.data.user.id;
});

afterAll(async () => {
  await removeUser(userId);
});

describe('myPrivileges User', () => {
  test('RegisteredUser privileges to my User', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data = response.body.data.user.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(['CREATE', 'READ', 'UPDATE', 'DELETE']);
  });

  test('RegisteredUser privileges to my User / Profile', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data = response.body.data.user.profile.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(['CREATE', 'READ', 'UPDATE', 'DELETE']);
  });

  test('RegisteredUser privileges to my User / References', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data =
      response.body.data.user.profile.references[0].authorization.myPrivileges;

    // Assert
    expect(data).toEqual(['CREATE', 'READ', 'UPDATE', 'DELETE']);
  });

  test('RegisteredUser privileges to my User / Preferences', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data = response.body.data.user.preferences;

    // Assert
    expect(data).toHaveLength(25);
  });
});
