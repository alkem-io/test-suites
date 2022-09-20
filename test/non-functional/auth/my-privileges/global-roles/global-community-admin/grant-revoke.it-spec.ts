import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import { TestUser } from '@test/utils';
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
const displayName = `user${uniqueId}`;
let userId = '';
let userIdAdmin = '';
const assignGlobalAdmin = 'assign user global admin:';
const removeGlobalAdmin = 'remove user global admin:';
const assignGlobalCommunityAdmin = 'assign user global communityadmin:';
const removeGlobalCommunityAdmin = 'remove user global community admin:';
const assignGlobalHubAdmin = 'assign user global hubs admin:';
const removeGlobalHubAdmin = 'remove user global hubs admin:';
// eslint-disable-next-line prettier/prettier
const error = 'Authorization: unable to grant \'grant-global-admins\' privilege:';

beforeAll(async () => {
  const res = await createUserWithParams(displayName, userEmail);
  userId = res.body.data.createUser.id;
  const response = await getUser('hub.member@alkem.io');
  userIdAdmin = response.body.data.user.id;
  await assignUserAsGlobalCommunityAdmin(userIdAdmin);
});

afterAll(async () => {
  await removeUser(userId);
  await removeUserAsGlobalCommunityAdmin(userIdAdmin);
});

describe('Grant / Revoke GA', () => {
  test('Grant user GlobalAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalAdmin(userId, TestUser.HUB_MEMBER);

    // Assert
    expect(res.text).toContain(`${error} ${assignGlobalAdmin} ${userId}`);
  });

  test('Revoke user GlobalAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalAdmin(userId, TestUser.HUB_MEMBER);

    // Assert
    expect(res.text).toContain(`${error} ${removeGlobalAdmin} ${userId}`);
  });
});

describe('Grant / Revoke GCA', () => {
  test('Grant user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalCommunityAdmin(
      userId,
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(res.text).toContain(
      `${error} ${assignGlobalCommunityAdmin} ${userId}`
    );
  });

  test('Revoke user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalCommunityAdmin(
      userId,
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(res.text).toContain(
      `${error} ${removeGlobalCommunityAdmin} ${userId}`
    );
  });
});

describe('Grant / Revoke GHA', () => {
  test('Grant user GlobalHubAdmin privileges', async () => {
    // Act
    const res = await assignUserAsGlobalHubsAdmin(userId, TestUser.HUB_MEMBER);

    // Assert
    expect(res.text).toContain(`${error} ${assignGlobalHubAdmin} ${userId}`);
  });

  test('Revoke user GlobalCommunityAdmin privileges', async () => {
    // Act
    const res = await removeUserAsGlobalHubsAdmin(userId, TestUser.HUB_MEMBER);

    // Assert
    expect(res.text).toContain(`${error} ${removeGlobalHubAdmin} ${userId}`);
  });
});
