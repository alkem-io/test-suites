import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { cgrud_authRes_sortedPrivileges, sortPrivileges } from '../../common';

const userEmail = `hub${uniqueId}@alkem.io`;
let userId = '';

beforeAll(async () => {
  const res = await createUserWithParams(`user${uniqueId}`, userEmail);
  userId = res.body.data.createUser.id;
});

afterAll(async () => {
  await removeUser(userId);
});

describe('myPrivileges User', () => {
  test('GlobalAdmin privileges to other User', async () => {
    // Act
    const response = await getUser(userEmail);
    const data = response.body.data.user.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(cgrud_authRes_sortedPrivileges);
  });

  test('GlobalAdmin privileges to other User / Profile', async () => {
    // Act
    const response = await getUser(userEmail);
    const data = response.body.data.user.profile.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sortPrivileges);
  });

  test('GlobalAdmin privileges to other User / References', async () => {
    // Act
    const response = await getUser(userEmail);
    const data =
      response.body.data.user.profile.references[0].authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sortPrivileges);
  });

  test('GlobalAdmin privileges to other User / Tagsets', async () => {
    // Act
    const response = await getUser(userEmail);
    const data =
      response.body.data.user.profile.tagsets[0].authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(sortPrivileges);
  });
});
