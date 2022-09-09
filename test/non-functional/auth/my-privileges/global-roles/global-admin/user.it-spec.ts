import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const userEmail = `hub${uniqueId}@alkem.io`;
const cgrud = ['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE'];
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
    expect(data).toEqual([
      'CREATE',
      'GRANT',
      'READ',
      'UPDATE',
      'DELETE',
      'AUTHORIZATION_RESET',
    ]);
  });

  test('GlobalAdmin privileges to other User / Profile', async () => {
    // Act
    const response = await getUser(userEmail);
    const data = response.body.data.user.profile.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalAdmin privileges to other User / References', async () => {
    // Act
    const response = await getUser(userEmail);
    const data =
      response.body.data.user.profile.references[0].authorization.myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });

  test('GlobalAdmin privileges to other User / Tagsets', async () => {
    // Act
    const response = await getUser(userEmail);
    const data =
      response.body.data.user.profile.tagsets[0].authorization.myPrivileges;

    // Assert
    expect(data).toEqual(cgrud);
  });
});
