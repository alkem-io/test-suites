import { UserModel } from "./models/UserModel";
import { TestUserModels } from "./models/TestUserModels";
import { getUserToken } from "./registration/get-user-token";
import { TestUser } from "../common/enums/test.user";
import { getGraphqlClient } from "../utils/graphqlClient";

/**
 * The wire shape `TestUserManager.serialize()` hands to `globalSetup`'s
 * `project.provide('alkemioUserModels', …)` and every worker rehydrates via
 * `inject('alkemioUserModels')` — the vitest-provided-context transport for
 * the once-per-run mint hoist.
 */
export interface SerializedTestUserModels {
  emailEntries: [string, UserModel][];
  typeEntries: [string, UserModel][];
  users: TestUserModels;
}

export class TestUserManager {
  private static userModelMapEmail: Map<string, UserModel>;
  private static userModelMapType: Map<string, UserModel>;
  private static populated = false;

  public static users: TestUserModels;

  /**
   * Mints each core test user's token ONCE per run and caches it (the class is a
   * module singleton under Vitest `isolate:false`). It used to re-mint every
   * user on every scenario setup — a full Kratos native login flow per user per
   * file (~users × files ≈ hundreds of logins). Under that load Kratos
   * rate-limits (429), which the server maps to `invalid_credentials`, failing
   * setups intermittently mid-run (test-suites#563). Non-interactive-login
   * tokens live 4h — far longer than a run — so a single mint per user is safe.
   * The `populated` flag flips only after a full pass, so a partial failure
   * (e.g. an early rate-limit) is retried in full rather than left incomplete.
   */
  public static async populateUserModelMap() {
    if (this.populated) {
      return;
    }
    this.userModelMapEmail = new Map<string, UserModel>();
    this.userModelMapType = new Map<string, UserModel>();

    for (const user of Object.keys(TestUser)) {
      const userValue = TestUser[user as keyof typeof TestUser];
      // Create a user model for each test user
      const email = this.buildIdentifier(userValue);
      const userModel = this.createEmptyUserModel(email, userValue);

      // Populate the authentication token
      userModel.authToken = await getUserToken(userModel.email);

      // Populate the user model with details from the api
      await this.populateUserModelFromApi(userModel);

      this.userModelMapEmail.set(userModel.email, userModel);
      this.userModelMapType.set(userModel.type, userModel);
    }
    // Finally ensure the exposed users field is populated
    this.populateUsers();

    // Cache is complete — subsequent scenario setups reuse these tokens.
    this.populated = true;

    // logElapsedTime('populateUserModels', start);
  }

  /**
   * Snapshots the cached user models for the `globalSetup` -> worker
   * hand-off. Only ever called after `populateUserModelMap()` has minted —
   * a worker that hydrates from this never mints its own tokens.
   */
  public static serialize(): SerializedTestUserModels {
    return {
      emailEntries: [...this.userModelMapEmail.entries()],
      typeEntries: [...this.userModelMapType.entries()],
      users: this.users,
    };
  }

  /**
   * Restores the cached user models from the data `globalSetup` provided,
   * without minting anything. Idempotent — safe to call from every worker's
   * `beforeAll` even though the underlying module state is a per-worker
   * singleton (`pool: 'threads'`, `isolate: false`) that only needs it once.
   */
  public static hydrateFromProvided(data: SerializedTestUserModels): void {
    this.userModelMapEmail = new Map(data.emailEntries);
    this.userModelMapType = new Map(data.typeEntries);
    this.users = data.users;
    this.populated = true;
  }

  private static createEmptyUserModel(
    email: string,
    testUser: TestUser
  ): UserModel {
    const result: UserModel = {
      email,
      id: "",
      displayName: "",
      profileId: "",
      nameId: "",
      agentId: "",
      accountId: "",
      authToken: "",
      type: testUser,
      RoleNames: [],
    };
    return result;
  }

  private static populateUsers() {
    this.users = {
      globalAdmin: TestUserManager.getUserModelByEmail("admin@alkem.io"),
      globalSupportAdmin: TestUserManager.getUserModelByEmail(
        "global.support@alkem.io"
      ),
      globalLicenseAdmin: TestUserManager.getUserModelByEmail(
        "global.license@alkem.io"
      ),
      spaceAdmin: TestUserManager.getUserModelByEmail("space.admin@alkem.io"),
      spaceMember: TestUserManager.getUserModelByEmail("space.member@alkem.io"),
      subspaceAdmin: TestUserManager.getUserModelByEmail(
        "subspace.admin@alkem.io"
      ),
      subspaceMember: TestUserManager.getUserModelByEmail(
        "subspace.member@alkem.io"
      ),
      subsubspaceAdmin: TestUserManager.getUserModelByEmail(
        "subsubspace.admin@alkem.io"
      ),
      subsubspaceMember: TestUserManager.getUserModelByEmail(
        "subsubspace.member@alkem.io"
      ),
      qaUser: TestUserManager.getUserModelByEmail("qa.user@alkem.io"),
      // notificationsAdmin: TestUserManager.getUserModelByEmail(
      //   "notifications@alkem.io"
      // ),
      nonSpaceMember: TestUserManager.getUserModelByEmail("non.space@alkem.io"),
      betaTester: TestUserManager.getUserModelByEmail("beta.tester@alkem.io"),
      organizationAdmin: TestUserManager.getUserModelByEmail(
        "organization.admin@alkem.io"
      ),
    };
  }

  /**
   * Refreshes the cached UserModel for a given email by re-fetching
   * the auth token and user data from the API.
   * Use after deleting and re-registering a test user.
   */
  public static async refreshUserModel(email: string): Promise<UserModel> {
    const userModel = this.userModelMapEmail.get(email);
    if (!userModel) {
      throw new Error(`UserModel with email ${email} not found`);
    }
    userModel.authToken = await getUserToken(email);
    await this.populateUserModelFromApi(userModel);
    return userModel;
  }

  public static getUserModelByEmail(userEmail: string): UserModel {
    const userModel = this.userModelMapEmail.get(userEmail);
    if (!userModel) {
      throw new Error(`UserModel with email ${userEmail} not found`);
    }
    return userModel;
  }

  public static getUserModelByType(userType: TestUser): UserModel {
    const userModel = this.userModelMapType.get(userType);

    if (!userModel) {
      throw new Error(`UserModel with type ${userType} not found`);
    }
    return userModel;
  }

  private static async populateUserModelFromApi(
    userModel: UserModel
  ): Promise<void> {
    const userData = await this.getUserData(userModel.authToken);
    const userInfo = userData?.data?.me.user;
    userModel.displayName = userInfo?.profile?.displayName || "";
    userModel.id = userInfo?.id || "";
    userModel.profileId = userInfo?.profile?.id || "";
    userModel.nameId = userInfo?.nameID || "";
    userModel.agentId = userInfo?.actor?.id || "";
    userModel.accountId = userInfo?.account?.id || "";

    const RoleNames = userData?.data?.platform?.roleSet.myRoles || [];
    userModel.RoleNames = RoleNames;
  }

  private static async getUserData(authToken: string) {
    const graphqlClient = getGraphqlClient();
    const result = graphqlClient.getMyUserInfo(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
    return result;
  }

  private static buildIdentifier(user: string) {
    const userUpn = `${user}@alkem.io`;

    return userUpn;
  }
}
