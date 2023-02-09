import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';
import {
  assignUserAsGlobalCommunityAdmin,
  removeUserAsGlobalCommunityAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { sorted__create_read_update_delete } from '../../common';

const userEmail = `hub${uniqueId}@alkem.io`;

let userId = '';
let userIdAdmin = '';

beforeAll(async () => {
  const res = await createUserWithParams(`user${uniqueId}`, userEmail);
  userId = res.body.data.createUser.id;
  const response = await getUser('hub.member@alkem.io');
  userIdAdmin = response.body.data.user.id;
  await assignUserAsGlobalCommunityAdmin(userIdAdmin);
});

afterAll(async () => {
  await removeUser(userId);
  await removeUserAsGlobalCommunityAdmin(userIdAdmin);
});

describe('myPrivileges User', () => {
  test('GlobalCommunityAdmin privileges to other User', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_MEMBER);
    const data = response.body.data.user.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete);
  });

  test('GlobalCommunityAdmin privileges to other User / Profile', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_MEMBER);
    const data = response.body.data.user.profile.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete);
  });

  test('GlobalCommunityAdmin privileges to other User / References', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_MEMBER);
    const data =
      response.body.data.user.profile.references[0].authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete);
  });

  test('GlobalCommunityAdmin privileges to other User / Tagsets', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_MEMBER);
    const data =
      response.body.data.user.profile.tagsets[0].authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sorted__create_read_update_delete);
  });

  test('RegisteredUser privileges to my User / Preferences', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.HUB_MEMBER);
    const data = response.body.data.user.preferences;

    // Assert
    expect(data).toHaveLength(25);
  });
});
