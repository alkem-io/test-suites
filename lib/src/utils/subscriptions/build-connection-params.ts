import { TestUser } from '../../common/enums/test.user';
import { TestUserManager } from '../../scenario/TestUserManager';

/**
 * Build the HTTP-upgrade headers used to authenticate a graphql-ws connection.
 *
 * Server (post-OIDC, FR-023 WS addendum) resolves auth on the HTTP upgrade only;
 * the `connection_init` payload (a.k.a. `connectionParams`) is deliberately
 * ignored to close a Bearer-smuggling side channel. So the bearer must travel
 * on the upgrade request, not in connection_init.
 */
export const buildConnectionParams = async (
  user: TestUser
): Promise<Record<string, string>> => {
  const testUserModel = TestUserManager.getUserModelByType(user);
  const token = testUserModel.authToken;

  if (!token) {
    throw Error(`Unable to authenticate with user ${user}`);
  }

  return {
    authorization: `Bearer ${token}`,
  };
};
