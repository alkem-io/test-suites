import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';
import {
  assignUserAsGlobalHubsAdmin,
  removeUserAsGlobalHubsAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  crud_authRes_sortedPrivileges,
  crud_sortPrivileges,
} from '../../common';

const userEmail = `hub${uniqueId}@alkem.io`;
let userId = '';
let userIdAdmin = '';

beforeAll(async () => {
  const res = await createUserWithParams(`user${uniqueId}`, userEmail);
  userId = res.body.data.createUser.id;
  const response = await getUser('hub.admin@alkem.io');
  userIdAdmin = response.body.data.user.id;
  await assignUserAsGlobalHubsAdmin(userIdAdmin);
});

afterAll(async () => {
  await removeUser(userId);
  await removeUserAsGlobalHubsAdmin(userIdAdmin);
});

describe('myPrivileges User', () => {
  test('GlobalHubAdmin privileges to other User', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_ADMIN);
    const data = response.body.data.user.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(crud_authRes_sortedPrivileges);
  });

  test('GlobalHubAdmin privileges to other User / Profile', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_ADMIN);
    const data = response.body.data.user.profile.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(crud_sortPrivileges);
  });

  test('GlobalHubAdmin privileges to other User / References', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_ADMIN);
    const data =
      response.body.data.user.profile.references[0].authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(crud_sortPrivileges);
  });

  test('GlobalHubAdmin privileges to other User / Tagsets', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_ADMIN);
    const data =
      response.body.data.user.profile.tagsets[0].authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(crud_sortPrivileges);
  });
});
