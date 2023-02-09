import { getUser } from '@test/functional-api/user-management/user.request.params';
import {
  assignUserAsGlobalCommunityAdmin,
  assignUserAsGlobalHubsAdmin,
} from '../mutations/authorization-mutation';
import { TestUser } from '../token.helper';

let user: any;

export const usersSetEmail = [
  {
    email: 'admin@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'community.admin@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'global.hubs@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'hub.admin@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'hub.member@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'challenge.admin@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'challenge.member@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'opportunity.admin@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'opportunity.member@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'qa.user@alkem.io',
    id: '',
    displayName: '',
  },
  {
    email: 'notifications@alkem.io',
    id: '',
    displayName: '',
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

  notificationsAdminEmail: string;
  notificationsAdminId: string;
  notificationsAdminDisplayName: string;
};

export const getUsersIds = async () => {
  for (user of usersSetEmail) {
    const userData = await getUser(user.email);
    user.displayName = userData.body.data.user.displayName;
    user.id = userData.body.data.user.id;
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

    hubAdminEmail: usersSetEmail[3].id,
    hubAdminId: usersSetEmail[3].id,
    hubAdminDisplayName: usersSetEmail[3].displayName,

    hubMemberEmail: usersSetEmail[4].id,
    hubMemberId: usersSetEmail[4].id,
    hubMemberDisplayName: usersSetEmail[4].displayName,

    challengeAdminEmail: usersSetEmail[5].id,
    challengeAdminId: usersSetEmail[5].id,
    challengeAdminDisplayName: usersSetEmail[5].displayName,

    challengeMemberEmail: usersSetEmail[6].id,
    challengeMemberId: usersSetEmail[6].id,
    challengeMemberDisplayName: usersSetEmail[6].displayName,

    opportunityAdminEmail: usersSetEmail[7].id,
    opportunityAdminId: usersSetEmail[7].id,
    opportunityAdminDisplayName: usersSetEmail[7].displayName,

    opportunityMemberEmail: usersSetEmail[8].id,
    opportunityMemberId: usersSetEmail[8].id,
    opportunityMemberDisplayName: usersSetEmail[8].displayName,

    qaUserEmail: usersSetEmail[9].id,
    qaUserId: usersSetEmail[9].id,
    qaUserDisplayName: usersSetEmail[9].displayName,

    notificationsAdminEmail: usersSetEmail[10].id,
    notificationsAdminId: usersSetEmail[10].id,
    notificationsAdminDisplayName: usersSetEmail[10].displayName,
  };
};

beforeAll(async () => {
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
