import { PlatformRole } from '@alkemio/client-lib';
import { getUserDataCodegen } from '@test/functional-api/user-management/user.request.params';
import {
  assignUserAsSupport,
  assignUserAsGlobalCommunityAdmin,
  assignPlatformRoleToUser,
} from '../mutations/authorization-mutation';
import { TestUser } from '../token.helper';

interface UserData {
  email: string;
  id: string;
  displayName: string;
  profileId: string;
  nameId: string;
  agentId: string;
  accountId: string;
}

interface Users {
  globalAdmin: UserData;
  globalCommunityAdmin: UserData;
  globalSpacesAdmin: UserData;
  spaceAdmin: UserData;
  spaceMember: UserData;
  challengeAdmin: UserData;
  challengeMember: UserData;
  opportunityAdmin: UserData;
  opportunityMember: UserData;
  qaUser: UserData;
  notificationsAdmin: UserData;
  nonSpaceMember: UserData;
  betaTester: UserData;
}

const createUserData = (email: string): UserData => ({
  email,
  id: '',
  displayName: '',
  profileId: '',
  nameId: '',
  agentId: '',
  accountId: '',
});

export const usersSetEmail: UserData[] = [
  createUserData('admin@alkem.io'),
  createUserData('community.admin@alkem.io'),
  createUserData('global.spaces@alkem.io'),
  createUserData('space.admin@alkem.io'),
  createUserData('space.member@alkem.io'),
  createUserData('challenge.admin@alkem.io'),
  createUserData('challenge.member@alkem.io'),
  createUserData('opportunity.admin@alkem.io'),
  createUserData('opportunity.member@alkem.io'),
  createUserData('qa.user@alkem.io'),
  createUserData('notifications@alkem.io'),
  createUserData('non.space@alkem.io'),
  createUserData('beta.tester@alkem.io'),
];

export const users: Users = {
  globalAdmin: usersSetEmail[0],
  globalCommunityAdmin: usersSetEmail[1],
  globalSpacesAdmin: usersSetEmail[2],
  spaceAdmin: usersSetEmail[3],
  spaceMember: usersSetEmail[4],
  challengeAdmin: usersSetEmail[5],
  challengeMember: usersSetEmail[6],
  opportunityAdmin: usersSetEmail[7],
  opportunityMember: usersSetEmail[8],
  qaUser: usersSetEmail[9],
  notificationsAdmin: usersSetEmail[10],
  nonSpaceMember: usersSetEmail[11],
  betaTester: usersSetEmail[12],
};

export const getUserDataCodegensIds = async () => {
  for (const user of usersSetEmail) {
    const userData = await getUserDataCodegen(user.email);
    user.displayName = userData?.data?.user.profile.displayName || '';
    user.id = userData?.data?.user.id || '';
    user.profileId = userData?.data?.user.profile.id || '';
    user.nameId = userData?.data?.user.nameID || '';
    user.agentId = userData?.data?.user.agent.id || '';
    user.accountId = userData?.data?.user.account.id || '';
  }

  // If necessary, this block can update the `users` object. However, since
  // `users` is directly referencing `usersSetEmail`, it will automatically be updated.
};

beforeAll(async () => {
  await getUserDataCodegensIds();
  await assignUserAsSupport(users.globalSpacesAdmin.id, TestUser.GLOBAL_ADMIN);
  await assignUserAsGlobalCommunityAdmin(
    users.globalCommunityAdmin.id,
    TestUser.GLOBAL_ADMIN
  );
  await assignPlatformRoleToUser(users.betaTester.id, PlatformRole.BetaTester);
});
