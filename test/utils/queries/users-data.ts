import { getUserDataCodegen } from '@test/functional-api/user-management/user.request.params';
import {
  assignPlatformRoleToUser,
  assignUserAsGlobalCommunityAdmin,
  assignUserAsSupport,
} from '../mutations/authorization-mutation';
import { TestUser } from '../token.helper';
import { PlatformRole } from '@alkemio/client-lib';

let user: any;

export const usersSetEmail = [
  {
    email: 'admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'community.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'global.spaces@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'space.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'space.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'challenge.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'challenge.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'opportunity.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'opportunity.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'qa.user@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'notifications@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'non.space@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
  {
    email: 'beta.tester@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
    accountID: '',
  },
];

export let users: {
  globalAdminEmail: string;
  globalAdminId: string;
  globalAdminDisplayName: string;
  globalAdminNameId: string;
  globalAdminProfileId: string;
  globalAdminAccountId: string;

  globalCommunityAdminEmail: string;
  globalCommunityAdminId: string;
  globalCommunityAdminDisplayName: string;
  globalCommunityAdminNameId: string;
  globalCommunityAdminProfileId: string;
  globalCommunityAdminAccountId: string;

  globalSpacesAdminEmail: string;
  globalSpacesAdminId: string;
  globalSpacesAdminDisplayName: string;
  globalSpacesAdminNameId: string;
  globalSpacesAdminProfileId: string;
  globalSpacesAdminAccountId: string;

  spaceAdminEmail: string;
  spaceAdminId: string;
  spaceAdminDisplayName: string;
  spaceAdminNameId: string;
  spaceAdminProfileId: string;
  spaceAdminAccountId: string;

  spaceMemberEmail: string;
  spaceMemberId: string;
  spaceMemberDisplayName: string;
  spaceMemberNameId: string;
  spaceMemberProfileId: string;
  spaceMemberAccountId: string;

  challengeAdminEmail: string;
  challengeAdminId: string;
  challengeAdminDisplayName: string;
  challengeAdminNameId: string;
  challengeAdminProfileId: string;
  challengeAdminAccountId: string;

  challengeMemberEmail: string;
  challengeMemberId: string;
  challengeMemberDisplayName: string;
  challengeMemberNameId: string;
  challengeMemberProfileId: string;
  challengeMemberAccountId: string;

  opportunityAdminEmail: string;
  opportunityAdminId: string;
  opportunityAdminDisplayName: string;
  opportunityAdminNameId: string;
  opportunityAdminProfileId: string;
  opportunityAdminAccountId: string;

  opportunityMemberEmail: string;
  opportunityMemberId: string;
  opportunityMemberDisplayName: string;
  opportunityMemberNameId: string;
  opportunityMemberProfileId: string;
  opportunityMemberAccountId: string;

  qaUserEmail: string;
  qaUserId: string;
  qaUserDisplayName: string;
  qaUserNameId: string;
  qaUserProfileId: string;
  qaUserAccountId: string;

  notificationsAdminEmail: string;
  notificationsAdminId: string;
  notificationsAdminDisplayName: string;
  notificationsAdminNameId: string;
  notificationsAdminProfileId: string;
  notificationsAdminAccountId: string;

  nonSpaceMemberEmail: string;
  nonSpaceMemberId: string;
  nonSpaceMemberDisplayName: string;
  nonSpaceMemberNameId: string;
  nonSpaceMemberProfileId: string;
  nonSpaceMemberAccountId: string;

  betaTesterEmail: string;
  betaTesterId: string;
  betaTesterDisplayName: string;
  betaTesterNameId: string;
  betaTesterProfileId: string;
  betaTesterAccountId: string;
};

export const getUserDataCodegensIds = async () => {
  for (user of usersSetEmail) {
    const userData = await getUserDataCodegen(user.email);
    user.displayName = userData?.data?.user.profile.displayName;
    user.id = userData?.data?.user.id;
    user.profileId = userData?.data?.user.profile.id;
    user.nameID = userData?.data?.user.nameID;
    user.accountID = userData?.data?.user.account.id;
  }
  users = {
    globalAdminEmail: usersSetEmail[0].email,
    globalAdminId: usersSetEmail[0].id,
    globalAdminDisplayName: usersSetEmail[0].displayName,
    globalAdminNameId: usersSetEmail[0].nameID,
    globalAdminProfileId: usersSetEmail[0].profileId,
    globalAdminAccountId: usersSetEmail[0].accountID,

    globalCommunityAdminEmail: usersSetEmail[1].email,
    globalCommunityAdminId: usersSetEmail[1].id,
    globalCommunityAdminDisplayName: usersSetEmail[1].displayName,
    globalCommunityAdminNameId: usersSetEmail[1].nameID,
    globalCommunityAdminProfileId: usersSetEmail[1].profileId,
    globalCommunityAdminAccountId: usersSetEmail[0].accountID,

    globalSpacesAdminEmail: usersSetEmail[2].email,
    globalSpacesAdminId: usersSetEmail[2].id,
    globalSpacesAdminDisplayName: usersSetEmail[2].displayName,
    globalSpacesAdminNameId: usersSetEmail[2].nameID,
    globalSpacesAdminProfileId: usersSetEmail[2].profileId,
    globalSpacesAdminAccountId: usersSetEmail[0].accountID,

    spaceAdminEmail: usersSetEmail[3].email,
    spaceAdminId: usersSetEmail[3].id,
    spaceAdminDisplayName: usersSetEmail[3].displayName,
    spaceAdminNameId: usersSetEmail[3].nameID,
    spaceAdminProfileId: usersSetEmail[3].profileId,
    spaceAdminAccountId: usersSetEmail[0].accountID,

    spaceMemberEmail: usersSetEmail[4].email,
    spaceMemberId: usersSetEmail[4].id,
    spaceMemberDisplayName: usersSetEmail[4].displayName,
    spaceMemberNameId: usersSetEmail[4].nameID,
    spaceMemberProfileId: usersSetEmail[4].profileId,
    spaceMemberAccountId: usersSetEmail[0].accountID,

    challengeAdminEmail: usersSetEmail[5].email,
    challengeAdminId: usersSetEmail[5].id,
    challengeAdminDisplayName: usersSetEmail[5].displayName,
    challengeAdminNameId: usersSetEmail[5].nameID,
    challengeAdminProfileId: usersSetEmail[5].profileId,
    challengeAdminAccountId: usersSetEmail[0].accountID,

    challengeMemberEmail: usersSetEmail[6].email,
    challengeMemberId: usersSetEmail[6].id,
    challengeMemberDisplayName: usersSetEmail[6].displayName,
    challengeMemberNameId: usersSetEmail[6].nameID,
    challengeMemberProfileId: usersSetEmail[6].profileId,
    challengeMemberAccountId: usersSetEmail[0].accountID,

    opportunityAdminEmail: usersSetEmail[7].email,
    opportunityAdminId: usersSetEmail[7].id,
    opportunityAdminDisplayName: usersSetEmail[7].displayName,
    opportunityAdminNameId: usersSetEmail[7].nameID,
    opportunityAdminProfileId: usersSetEmail[7].profileId,
    opportunityAdminAccountId: usersSetEmail[0].accountID,

    opportunityMemberEmail: usersSetEmail[8].email,
    opportunityMemberId: usersSetEmail[8].id,
    opportunityMemberDisplayName: usersSetEmail[8].displayName,
    opportunityMemberNameId: usersSetEmail[8].nameID,
    opportunityMemberProfileId: usersSetEmail[8].profileId,
    opportunityMemberAccountId: usersSetEmail[0].accountID,

    qaUserEmail: usersSetEmail[9].email,
    qaUserId: usersSetEmail[9].id,
    qaUserDisplayName: usersSetEmail[9].displayName,
    qaUserNameId: usersSetEmail[9].nameID,
    qaUserProfileId: usersSetEmail[9].profileId,
    qaUserAccountId: usersSetEmail[0].accountID,

    notificationsAdminEmail: usersSetEmail[10].email,
    notificationsAdminId: usersSetEmail[10].id,
    notificationsAdminDisplayName: usersSetEmail[10].displayName,
    notificationsAdminNameId: usersSetEmail[10].nameID,
    notificationsAdminProfileId: usersSetEmail[10].profileId,
    notificationsAdminAccountId: usersSetEmail[0].accountID,

    nonSpaceMemberEmail: usersSetEmail[11].email,
    nonSpaceMemberId: usersSetEmail[11].id,
    nonSpaceMemberDisplayName: usersSetEmail[11].displayName,
    nonSpaceMemberNameId: usersSetEmail[11].nameID,
    nonSpaceMemberProfileId: usersSetEmail[11].profileId,
    nonSpaceMemberAccountId: usersSetEmail[0].accountID,

    betaTesterEmail: usersSetEmail[12].email,
    betaTesterId: usersSetEmail[12].id,
    betaTesterDisplayName: usersSetEmail[12].displayName,
    betaTesterNameId: usersSetEmail[12].nameID,
    betaTesterProfileId: usersSetEmail[12].profileId,
    betaTesterAccountId: usersSetEmail[0].accountID,
  };
};

beforeAll(async () => {
  await getUserDataCodegensIds();
  await assignUserAsSupport(users.globalSpacesAdminId, TestUser.GLOBAL_ADMIN);
  await assignUserAsGlobalCommunityAdmin(
    users.globalCommunityAdminId,
    TestUser.GLOBAL_ADMIN
  );
  await assignPlatformRoleToUser(users.betaTesterId, PlatformRole.BetaTester);
});
