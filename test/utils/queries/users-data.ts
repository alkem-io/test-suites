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
});

export const usersSetEmail = {
  globalAdmin: createUserData('admin@alkem.io'),
  globalCommunityAdmin: createUserData('community.admin@alkem.io'),
  globalSpacesAdmin: createUserData('global.spaces@alkem.io'),
  spaceAdmin: createUserData('space.admin@alkem.io'),
  spaceMember: createUserData('space.member@alkem.io'),
  challengeAdmin: createUserData('challenge.admin@alkem.io'),
  challengeMember: createUserData('challenge.member@alkem.io'),
  opportunityAdmin: createUserData('opportunity.admin@alkem.io'),
  opportunityMember: createUserData('opportunity.member@alkem.io'),
  qaUser: createUserData('qa.user@alkem.io'),
  notificationsAdmin: createUserData('notifications@alkem.io'),
  nonSpaceMember: createUserData('non.space@alkem.io'),
  betaTester: createUserData('beta.tester@alkem.io'),
} as const;

export const users = usersSetEmail;

export const getUserDataCodegensIds = async () => {
  for (const key in usersSetEmail) {
    const userKey = key as keyof typeof usersSetEmail; // Ensuring type safety
    const user = usersSetEmail[userKey];
    const userData = await getUserDataCodegen(user.email);
    user.displayName = userData?.data?.user.profile.displayName || '';
    user.id = userData?.data?.user.id || '';
    user.profileId = userData?.data?.user.profile.id || '';
    user.nameId = userData?.data?.user.nameID || '';
    user.agentId = userData?.data?.user.agent.id || '';
  }

  // No need to update the `users` object since it is referencing `usersSetEmail`.
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
