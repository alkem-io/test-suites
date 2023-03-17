import {
  createUserInitSimple,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import {
  assignUserAsGlobalAdmin,
  assignUserAsGlobalCommunityAdmin,
  assignUserAsGlobalHubsAdmin,
  removeUserAsGlobalAdmin,
  removeUserAsGlobalCommunityAdmin,
  removeUserAsGlobalHubsAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const userEmail = `hub${uniqueId}@alkem.io`;
const firstName = `fn${uniqueId}`;
const lastName = `ln${uniqueId}`;
let userId = '';

beforeAll(async () => {
  const res = await createUserInitSimple(firstName, lastName, userEmail);
  userId = res.body.data.createUser.id;
});

afterAll(async () => {
  await removeUser(userId);
});

describe('Grant / Revoke GA', () => {
  test('Grant user GlobalAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalAdmin(userId);
    const data = res.body.data.assignUserAsGlobalAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });

  test('Revoke user GlobalAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalAdmin(userId);
    const data = res.body.data.removeUserAsGlobalAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });
});

describe('Grant / Revoke GCA', () => {
  test('Grant user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalCommunityAdmin(userId);
    const data = res.body.data.assignUserAsGlobalCommunityAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });

  test('Revoke user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalCommunityAdmin(userId);
    const data = res.body.data.removeUserAsGlobalCommunityAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });
});

describe('Grant / Revoke GHA', () => {
  test('Grant user GlobalHubAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalHubsAdmin(userId);
    const data = res.body.data.assignUserAsGlobalHubsAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });

  test('Revoke user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalHubsAdmin(userId);
    const data = res.body.data.removeUserAsGlobalHubsAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });
});
