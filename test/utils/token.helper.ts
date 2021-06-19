import { CherrytwistClient } from '@cherrytwist/client-lib';

const dev = 'https://dev.cherrytwist.org/admin/graphql';
const localhosts = 'http://localhost:4455/admin/graphql';
export class TokenHelper {
  private users = Object.values(TestUser);

  private buildIdentifier(user: string) {
    const userUpn = `${user}@cherrytwist.org`;

    return userUpn;
  }

  private getPassword() {
    return process.env.AUTH_TEST_HARNESS_PASSWORD || '';
  }

  /**
   * Builds a map with access tokens for each user in the TestUser enum.
   * Uses ROPC client flow to authenticate the users.
   *
   * @api public
   * @returns Returns a map in the form of <username, access_token>.
   */
  async buildUserTokenMap() {
    const userTokenMap: Map<string, string> = new Map<string, string>();
    const password = this.getPassword();
    const ctClient = new CherrytwistClient({
      graphqlEndpoint: process.env.CT_SERVER || '',
    });

    for (const user of this.users) {
      const identifier = this.buildIdentifier(user);
      ctClient.config.authInfo = {
        credentials: {
          email: identifier,
          password: password,
        },
      };

      await ctClient.enableAuthentication();

      userTokenMap.set(user, ctClient.apiToken);
    }

    return userTokenMap;
  }
}

/**
 * Enum with CT users used for testing different auth scenarios.
 * These users need to be created in CT Client (so both Profile and Account are created)
 * in order to add new test users / roles for API tests for auth, add the users here and
 * create them in CT client - all with the same password. Add the password to .env
 * to AUTH_TEST_HARNESS_PASSWORD env variable. AUTH_AAD_UPN_DOMAIN also needs to be
 * set to the domain against whom tests will be ran.
 */
export enum TestUser {
  GLOBAL_ADMIN = 'admin',
  // ECOVERSE_ADMIN = 'ecoverse.admin',
  // COMMUNITY_ADMIN = 'community.admin',
  // ECOVERSE_MEMBER = 'ecoverse.member',
  NON_ECOVERSE_MEMBER = 'non.ecoverse',
}
