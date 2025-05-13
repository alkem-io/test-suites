
import { UserModel } from './UserModel';

export interface TestUserModels {
  globalAdmin: UserModel;
  globalSupportAdmin: UserModel;
  globalLicenseAdmin: UserModel;
  spaceAdmin: UserModel;
  spaceMember: UserModel;
  subspaceAdmin: UserModel;
  subspaceMember: UserModel;
  subsubspaceAdmin: UserModel;
  subsubspaceMember: UserModel;
  qaUser: UserModel;
  //notificationsAdmin: UserModel;
  nonSpaceMember: UserModel;
  betaTester: UserModel;
}


