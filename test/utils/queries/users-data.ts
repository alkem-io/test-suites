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
    profileId: '',
    nameID: '',
  },
  {
    email: 'community.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'global.hubs@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'hub.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'hub.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'challenge.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'challenge.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'opportunity.admin@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'opportunity.member@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'qa.user@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'notifications@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
  {
    email: 'non.hub@alkem.io',
    id: '',
    displayName: '',
    profileId: '',
    nameID: '',
  },
];

export let users: {
  globalAdminEmail: string;
  globalAdminId: string;
  globalAdminDisplayName: string;
  globalAdminNameId: string;
  globalAdminProfileId: string;

  globalCommunityAdminEmail: string;
  globalCommunityAdminId: string;
  globalCommunityAdminDisplayName: string;
  globalCommunityAdminNameId: string;
  globalCommunityAdminProfileId: string;

  globalHubsAdminEmail: string;
  globalHubsAdminId: string;
  globalHubsAdminDisplayName: string;
  globalHubsAdminNameId: string;
  globalHubsAdminProfileId: string;

  hubAdminEmail: string;
  hubAdminId: string;
  hubAdminDisplayName: string;
  hubAdminNameId: string;
  hubAdminProfileId: string;

  hubMemberEmail: string;
  hubMemberId: string;
  hubMemberDisplayName: string;
  hubMemberNameId: string;
  hubMemberProfileId: string;

  challengeAdminEmail: string;
  challengeAdminId: string;
  challengeAdminDisplayName: string;
  challengeAdminNameId: string;
  challengeAdminProfileId: string;

  challengeMemberEmail: string;
  challengeMemberId: string;
  challengeMemberDisplayName: string;
  challengeMemberNameId: string;
  challengeMemberProfileId: string;

  opportunityAdminEmail: string;
  opportunityAdminId: string;
  opportunityAdminDisplayName: string;
  opportunityAdminNameId: string;
  opportunityAdminProfileId: string;

  opportunityMemberEmail: string;
  opportunityMemberId: string;
  opportunityMemberDisplayName: string;
  opportunityMemberNameId: string;
  opportunityMemberProfileId: string;

  qaUserEmail: string;
  qaUserId: string;
  qaUserDisplayName: string;
  qaUserNameId: string;
  qaUserProfileId: string;

  notificationsAdminEmail: string;
  notificationsAdminId: string;
  notificationsAdminDisplayName: string;
  notificationsAdminNameId: string;
  notificationsAdminProfileId: string;

  nonHubMemberEmail: string;
  nonHubMemberId: string;
  nonHubMemberDisplayName: string;
  nonHubMemberNameId: string;
  nonHubMemberProfileId: string;
};

export const getUsersIds = async () => {
  for (user of usersSetEmail) {
    const userData = await getUser(user.email);
    user.displayName = userData.body.data.user.profile.displayName;
    user.id = userData.body.data.user.id;
    user.profileId = userData.body.data.user.profile.id;
    user.nameID = userData.body.data.user.nameID;
  }
  users = {
    globalAdminEmail: usersSetEmail[0].email,
    globalAdminId: usersSetEmail[0].id,
    globalAdminDisplayName: usersSetEmail[0].displayName,
    globalAdminNameId: usersSetEmail[0].nameID,
    globalAdminProfileId: usersSetEmail[0].profileId,

    globalCommunityAdminEmail: usersSetEmail[1].email,
    globalCommunityAdminId: usersSetEmail[1].id,
    globalCommunityAdminDisplayName: usersSetEmail[1].displayName,
    globalCommunityAdminNameId: usersSetEmail[1].nameID,
    globalCommunityAdminProfileId: usersSetEmail[1].profileId,

    globalHubsAdminEmail: usersSetEmail[2].email,
    globalHubsAdminId: usersSetEmail[2].id,
    globalHubsAdminDisplayName: usersSetEmail[2].displayName,
    globalHubsAdminNameId: usersSetEmail[2].nameID,
    globalHubsAdminProfileId: usersSetEmail[2].profileId,

    hubAdminEmail: usersSetEmail[3].email,
    hubAdminId: usersSetEmail[3].id,
    hubAdminDisplayName: usersSetEmail[3].displayName,
    hubAdminNameId: usersSetEmail[3].nameID,
    hubAdminProfileId: usersSetEmail[3].profileId,

    hubMemberEmail: usersSetEmail[4].email,
    hubMemberId: usersSetEmail[4].id,
    hubMemberDisplayName: usersSetEmail[4].displayName,
    hubMemberNameId: usersSetEmail[4].nameID,
    hubMemberProfileId: usersSetEmail[4].profileId,

    challengeAdminEmail: usersSetEmail[5].email,
    challengeAdminId: usersSetEmail[5].id,
    challengeAdminDisplayName: usersSetEmail[5].displayName,
    challengeAdminNameId: usersSetEmail[5].nameID,
    challengeAdminProfileId: usersSetEmail[5].profileId,

    challengeMemberEmail: usersSetEmail[6].email,
    challengeMemberId: usersSetEmail[6].id,
    challengeMemberDisplayName: usersSetEmail[6].displayName,
    challengeMemberNameId: usersSetEmail[6].nameID,
    challengeMemberProfileId: usersSetEmail[6].profileId,

    opportunityAdminEmail: usersSetEmail[7].email,
    opportunityAdminId: usersSetEmail[7].id,
    opportunityAdminDisplayName: usersSetEmail[7].displayName,
    opportunityAdminNameId: usersSetEmail[7].nameID,
    opportunityAdminProfileId: usersSetEmail[7].profileId,

    opportunityMemberEmail: usersSetEmail[8].email,
    opportunityMemberId: usersSetEmail[8].id,
    opportunityMemberDisplayName: usersSetEmail[8].displayName,
    opportunityMemberNameId: usersSetEmail[8].nameID,
    opportunityMemberProfileId: usersSetEmail[8].profileId,

    qaUserEmail: usersSetEmail[9].email,
    qaUserId: usersSetEmail[9].id,
    qaUserDisplayName: usersSetEmail[9].displayName,
    qaUserNameId: usersSetEmail[9].nameID,
    qaUserProfileId: usersSetEmail[9].profileId,

    notificationsAdminEmail: usersSetEmail[10].email,
    notificationsAdminId: usersSetEmail[10].id,
    notificationsAdminDisplayName: usersSetEmail[10].displayName,
    notificationsAdminNameId: usersSetEmail[10].nameID,
    notificationsAdminProfileId: usersSetEmail[10].profileId,

    nonHubMemberEmail: usersSetEmail[11].email,
    nonHubMemberId: usersSetEmail[11].id,
    nonHubMemberDisplayName: usersSetEmail[11].displayName,
    nonHubMemberNameId: usersSetEmail[11].nameID,
    nonHubMemberProfileId: usersSetEmail[11].profileId,
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
