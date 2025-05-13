import { TestUser } from '@src/common/enums/test.user';
import { TestUserManager } from '@src/scenario/TestUserManager';

export const buildConnectionParams = async (user: TestUser) => {
  const testUserModel = TestUserManager.getUserModelByType(user);
  const token = testUserModel.authToken;

  if (!token) {
    throw Error(`Unable to authenticate with user ${user}`);
  }

  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
};
