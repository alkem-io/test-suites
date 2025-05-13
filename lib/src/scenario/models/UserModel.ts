import { TestUser } from "@src/common/enums/test.user";

export type UserModel = {
  id: string;
  nameId: string;
  email: string;
  displayName: string;
  profileId: string;
  agentId: string;
  accountId: string;
  authToken: string;
  type: TestUser;
  RoleNames: string[];
};