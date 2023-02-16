import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  assignUserAsGlobalCommunityAdmin,
  assignUserAsGlobalHubsAdmin,
} from '../mutations/authorization-mutation';
import { TestUser } from '../token.helper';

let user: any;

// const qaUserData = {
//   qaUserEmail: 'qa.user@alkem.io',
//   qaUserProfileId: '',
//   qaUserNameId: '',

// };

export const usersSetEmail = [
  {
    email: 'admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'community.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'global.hubs@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'hub.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'hub.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'challenge.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'challenge.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'opportunity.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'opportunity.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'qa.user@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'notifications@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
  {
    email: 'non.hub@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameId: '',
  },
];

export let users: {
  globalAdminEmail: string;
  globalAdminId: string;
  globalAdminDisplayName: string;

  globalCommunityAdminEmail: string;
  globalCommunityAdminId: string;
  globalCommunityAdminDisplayName: string;

  globalHubsAdminEmail: string;
  globalHubsAdminId: string;
  globalHubsAdminDisplayName: string;

  hubAdminEmail: string;
  hubAdminId: string;
  hubAdminDisplayName: string;

  hubMemberEmail: string;
  hubMemberId: string;
  hubMemberDisplayName: string;

  challengeAdminEmail: string;
  challengeAdminId: string;
  challengeAdminDisplayName: string;

  challengeMemberEmail: string;
  challengeMemberId: string;
  challengeMemberDisplayName: string;

  opportunityAdminEmail: string;
  opportunityAdminId: string;
  opportunityAdminDisplayName: string;

  opportunityMemberEmail: string;
  opportunityMemberId: string;
  opportunityMemberDisplayName: string;

  qaUserEmail: string;
  qaUserId: string;
  qaUserDisplayName: string;
  qaUserProfileId: string;
  qaUserNameId: string;

  notificationsAdminEmail: string;
  notificationsAdminId: string;
  notificationsAdminDisplayName: string;

  nonHubMemberEmail: string;
  nonHubMemberId: string;
  nonHubMemberDisplayName: string;
};

export const getUsersIds = async () => {
  for (user of usersSetEmail) {
    const userData = await getUser(user.email);
    user.displayName = userData.body.data.user.displayName;
    user.id = userData.body.data.user.id;
    user.profileId = userData.body.data.user.profile.id;
    user.nameId = userData.body.data.user.nameId;
  }
  users = {
    globalAdminEmail: usersSetEmail[0].email,
    globalAdminId: usersSetEmail[0].id,
    globalAdminDisplayName: usersSetEmail[0].displayName,

    globalCommunityAdminEmail: usersSetEmail[1].email,
    globalCommunityAdminId: usersSetEmail[1].id,
    globalCommunityAdminDisplayName: usersSetEmail[1].displayName,

    globalHubsAdminEmail: usersSetEmail[2].email,
    globalHubsAdminId: usersSetEmail[2].id,
    globalHubsAdminDisplayName: usersSetEmail[2].displayName,

    hubAdminEmail: usersSetEmail[3].email,
    hubAdminId: usersSetEmail[3].id,
    hubAdminDisplayName: usersSetEmail[3].displayName,

    hubMemberEmail: usersSetEmail[4].email,
    hubMemberId: usersSetEmail[4].id,
    hubMemberDisplayName: usersSetEmail[4].displayName,

    challengeAdminEmail: usersSetEmail[5].email,
    challengeAdminId: usersSetEmail[5].id,
    challengeAdminDisplayName: usersSetEmail[5].displayName,

    challengeMemberEmail: usersSetEmail[6].email,
    challengeMemberId: usersSetEmail[6].id,
    challengeMemberDisplayName: usersSetEmail[6].displayName,

    opportunityAdminEmail: usersSetEmail[7].email,
    opportunityAdminId: usersSetEmail[7].id,
    opportunityAdminDisplayName: usersSetEmail[7].displayName,

    opportunityMemberEmail: usersSetEmail[8].email,
    opportunityMemberId: usersSetEmail[8].id,
    opportunityMemberDisplayName: usersSetEmail[8].displayName,

    qaUserEmail: usersSetEmail[9].email,
    qaUserId: usersSetEmail[9].id,
    qaUserDisplayName: usersSetEmail[9].displayName,
    qaUserProfileId: usersSetEmail[9].profileId,
    qaUserNameId: usersSetEmail[9].nameId,

    notificationsAdminEmail: usersSetEmail[10].email,
    notificationsAdminId: usersSetEmail[10].id,
    notificationsAdminDisplayName: usersSetEmail[10].displayName,

    nonHubMemberEmail: usersSetEmail[11].email,
    nonHubMemberId: usersSetEmail[11].id,
    nonHubMemberDisplayName: usersSetEmail[11].displayName,
  };
};

beforeAll(async () => {
  // const reqQaUser = await getUser(users.qaUserEmail);
  // users.qaUserProfileId = reqQaUser.body.data.user.profile.id;
  // users.qaUserNameId = reqQaUser.body.data.user.nameId;

  await getUsersIds();
  await assignUserAsGlobalHubsAdmin(
    users.globalHubsAdminId,
    TestUser.GLOBAL_ADMIN
  );
  await assignUserAsGlobalCommunityAdmin(
    users.globalCommunityAdminId,
    TestUser.GLOBAL_ADMIN
  );
});
