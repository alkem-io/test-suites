import { TokenHelper } from './token.helper';

export class TestUtil {
  private static _instance: TestUtil;

  private _userTokenMap!: Map<string, string>;
  public get userTokenMap(): Map<string, string> {
    return this._userTokenMap;
  }
  public set userTokenMap(value: Map<string, string>) {
    this._userTokenMap = value;
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  // Returns data generated in test-data.service.ts
  async bootstrap() {
    await this.getTokensForAllTestUsers();
  }

  async teardown() {
    ///
  }

  private async getTokensForAllTestUsers() {
    const tokenHelper = new TokenHelper();
    this.userTokenMap = await tokenHelper.buildUserTokenMap();
  }
}
