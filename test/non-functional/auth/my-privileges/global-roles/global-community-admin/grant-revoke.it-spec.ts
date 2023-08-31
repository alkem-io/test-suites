import {
  createUserInitSimple,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';
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
const assignGlobalAdmin = 'assign user global admin:';
const removeGlobalAdmin = 'remove user global admin:';
const assignGlobalCommunityAdmin = 'assign user global communityadmin:';
const removeGlobalCommunityAdmin = 'remove user global community admin:';
const assignGlobalSpaceAdmin = 'assign user global spaces admin:';
const removeGlobalSpaceAdmin = 'remove user global spaces admin:';
// eslint-disable-next-line prettier/prettier
const errorString =
  "Authorization: unable to grant 'grant-global-admins' privilege:";

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
    const { error } = await assignUserAsGlobalAdmin(
      userId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    // Assert
    expect(error?.errors[0].message).toContain(
      `${errorString} ${assignGlobalAdmin} ${userId}`
    );
  });

  test('Revoke user GlobalAdmin privileges', async () => {
    // Act
    const { error } = await removeUserAsGlobalAdmin(
      userId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    // Assert
    expect(error?.errors[0].message).toContain(
      `${errorString} ${removeGlobalAdmin} ${userId}`
    );
  });
});

describe('Grant / Revoke GCA', () => {
  test('Grant user GlobalCommunityAdmin privileges', async () => {
    // Act
    const { error } = await assignUserAsGlobalCommunityAdmin(
      userId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    // Assert
    expect(error?.errors[0].message).toContain(
      `${errorString} ${assignGlobalCommunityAdmin} ${userId}`
    );
  });

  test('Revoke user GlobalCommunityAdmin privileges', async () => {
    // Act
    const { error } = await removeUserAsGlobalCommunityAdmin(
      userId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    // Assert
    expect(error?.errors[0].message).toContain(
      `${errorString} ${removeGlobalCommunityAdmin} ${userId}`
    );
  });
});

describe('Grant / Revoke GHA', () => {
  test('Grant user GlobalSpaceAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalSpacesAdmin(
      userId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    // Assert
    expect(res.text).toContain(
      `${errorString} ${assignGlobalSpaceAdmin} ${userId}`
    );
  });

  test('Revoke user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalSpacesAdmin(
      userId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );

    // Assert
    expect(res.text).toContain(
      `${errorString} ${removeGlobalSpaceAdmin} ${userId}`
    );
  });
});
