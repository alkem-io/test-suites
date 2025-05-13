import { TokenHelper } from "./token.helper";

export class TestUtil {
  private static _instance: TestUtil;

  private _userTokenMap!: Map<string, string>;
  public get userTokenMap(): Map<string, string> {
    return TestUtil._instance._userTokenMap;
  }
  public set userTokenMap(value: Map<string, string>) {
    TestUtil._instance._userTokenMap = value;
  }

  public static async Instance() {
    if (TestUtil._instance) return TestUtil._instance;
    TestUtil._instance = new this();
    await TestUtil._instance.getTokensForAllTestUsers();
    return TestUtil._instance;
  }

  private async getTokensForAllTestUsers() {
    const tokenHelper = new TokenHelper();
    TestUtil._instance.userTokenMap = await tokenHelper.buildUserTokenMap();
  }
}
