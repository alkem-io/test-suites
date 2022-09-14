import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';

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
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data = response.body.data.user.authorization;

    // Assert
    expect(data).toEqual(null);
  });

  test('GlobalAdmin privileges to other User / Profile', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data = response.body.data.user.profile.authorization.myPrivileges;

    // Assert
    expect(data).toEqual([]);
  });

  test('GlobalAdmin privileges to other User / References', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data =
      response.body.data.user.profile.references[0].authorization.myPrivileges;

    // Assert
    expect(data).toEqual([]);
  });

  test('GlobalAdmin privileges to other User / Tagsets', async () => {
    // Act
    const response = await getUser(userEmail, TestUser.NON_HUB_MEMBER);
    const data =
      response.body.data.user.profile.tagsets[0].authorization.myPrivileges;

    // Assert
    expect(data).toEqual([]);
  });
});
