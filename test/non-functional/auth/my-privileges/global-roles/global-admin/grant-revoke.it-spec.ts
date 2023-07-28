import {
  createUserInitSimple,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import {
  assignUserAsGlobalAdmin,
  assignUserAsGlobalCommunityAdmin,
  assignUserAsGlobalSpacesAdmin,
  removeUserAsGlobalAdmin,
  removeUserAsGlobalCommunityAdmin,
  removeUserAsGlobalSpacesAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';

const userEmail = `space${uniqueId}@alkem.io`;
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
  test('Grant user GlobalSpaceAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalSpacesAdmin(userId);
    const data = res.body.data.assignUserAsGlobalSpacesAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });

  test('Revoke user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalSpacesAdmin(userId);
    const data = res.body.data.removeUserAsGlobalSpacesAdmin.email;

    // Assert
    expect(data).toEqual(userEmail);
  });
});
