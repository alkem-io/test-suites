/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
} from '@alkemio/tests-lib';
import { updateUserSettingsWithPush } from '@functional-api/push-notifications/push-notifications.request.params';
import { notifWithPush, notifPush } from '@functional-api/notifications/notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'push-notification-settings',
};

// Accessor for the notification settings from the raw GraphQL response
const getSettings = (res: any) => {
  expect(res.body.errors ?? []).toHaveLength(0);
  return res.body.data?.updateUserSettings?.settings?.notification;
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('Push Notification Settings - All 28 events', () => {
  describe('Platform notification settings', () => {
    test('should update push setting for platform.forumDiscussionCreated', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            platform: {
              forumDiscussionCreated: notifPush(true, true),
              forumDiscussionComment: notifWithPush(false),
              admin: {
                userProfileCreated: notifWithPush(false),
                userProfileRemoved: notifWithPush(false),
                spaceCreated: notifWithPush(false),
                userGlobalRoleChanged: notifWithPush(false),
              },
            },
          },
        }
      );

      const platform = getSettings(res)?.platform;
      expect(platform?.forumDiscussionCreated?.push).toBe(true);
      expect(platform?.forumDiscussionCreated?.email).toBe(true);
      expect(platform?.forumDiscussionCreated?.inApp).toBe(true);
    });

    test('should update push setting for platform.forumDiscussionComment', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            platform: {
              forumDiscussionComment: notifPush(false, true),
              forumDiscussionCreated: notifWithPush(false),
              admin: {
                userProfileCreated: notifWithPush(false),
                userProfileRemoved: notifWithPush(false),
                spaceCreated: notifWithPush(false),
                userGlobalRoleChanged: notifWithPush(false),
              },
            },
          },
        }
      );

      const platform = getSettings(res)?.platform;
      expect(platform?.forumDiscussionComment?.push).toBe(true);
      expect(platform?.forumDiscussionComment?.email).toBe(false);
    });

    test('should update push setting for platform.admin.userProfileCreated', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            platform: {
              forumDiscussionComment: notifWithPush(false),
              forumDiscussionCreated: notifWithPush(false),
              admin: {
                userProfileCreated: notifPush(false, true),
                userProfileRemoved: notifWithPush(false),
                spaceCreated: notifWithPush(false),
                userGlobalRoleChanged: notifWithPush(false),
              },
            },
          },
        }
      );

      const admin = getSettings(res)?.platform?.admin;
      expect(admin?.userProfileCreated?.push).toBe(true);
      expect(admin?.userProfileCreated?.email).toBe(false);
    });

    test('should update push setting for platform.admin.userProfileRemoved', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            platform: {
              forumDiscussionComment: notifWithPush(false),
              forumDiscussionCreated: notifWithPush(false),
              admin: {
                userProfileCreated: notifWithPush(false),
                userProfileRemoved: notifPush(false, true),
                spaceCreated: notifWithPush(false),
                userGlobalRoleChanged: notifWithPush(false),
              },
            },
          },
        }
      );

      const admin = getSettings(res)?.platform?.admin;
      expect(admin?.userProfileRemoved?.push).toBe(true);
    });

    test('should update push setting for platform.admin.spaceCreated', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            platform: {
              forumDiscussionComment: notifWithPush(false),
              forumDiscussionCreated: notifWithPush(false),
              admin: {
                userProfileCreated: notifWithPush(false),
                userProfileRemoved: notifWithPush(false),
                spaceCreated: notifPush(false, true),
                userGlobalRoleChanged: notifWithPush(false),
              },
            },
          },
        }
      );

      const admin = getSettings(res)?.platform?.admin;
      expect(admin?.spaceCreated?.push).toBe(true);
    });

    test('should update push setting for platform.admin.userGlobalRoleChanged', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            platform: {
              forumDiscussionComment: notifWithPush(false),
              forumDiscussionCreated: notifWithPush(false),
              admin: {
                userProfileCreated: notifWithPush(false),
                userProfileRemoved: notifWithPush(false),
                spaceCreated: notifWithPush(false),
                userGlobalRoleChanged: notifPush(false, true),
              },
            },
          },
        }
      );

      const admin = getSettings(res)?.platform?.admin;
      expect(admin?.userGlobalRoleChanged?.push).toBe(true);
    });
  });

  describe('Organization notification settings', () => {
    test('should update push setting for organization.adminMessageReceived', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            organization: {
              adminMessageReceived: notifPush(false, true),
              adminMentioned: notifWithPush(false),
            },
          },
        }
      );

      const org = getSettings(res)?.organization;
      expect(org?.adminMessageReceived?.push).toBe(true);
      expect(org?.adminMessageReceived?.email).toBe(false);
    });

    test('should update push setting for organization.adminMentioned', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            organization: {
              adminMessageReceived: notifWithPush(false),
              adminMentioned: notifPush(false, true),
            },
          },
        }
      );

      const org = getSettings(res)?.organization;
      expect(org?.adminMentioned?.push).toBe(true);
    });
  });

  describe('Space notification settings', () => {
    const spaceSettingsBase = {
      admin: {
        communityApplicationReceived: notifWithPush(false),
        communityNewMember: notifWithPush(false),
        collaborationCalloutContributionCreated: notifWithPush(false),
        communicationMessageReceived: notifWithPush(false),
      },
      collaborationCalloutPublished: notifWithPush(false),
      communicationUpdates: notifWithPush(false),
      collaborationCalloutPostContributionComment: notifWithPush(false),
      collaborationCalloutContributionCreated: notifWithPush(false),
      collaborationCalloutComment: notifWithPush(false),
      communityCalendarEvents: notifWithPush(false),
      collaborationPollVoteCastOnOwnPoll: notifWithPush(false),
      collaborationPollVoteCastOnPollIVotedOn: notifWithPush(false),
      collaborationPollModifiedOnPollIVotedOn: notifWithPush(false),
      collaborationPollVoteAffectedByOptionChange: notifWithPush(false),
    };

    const updateSpaceSetting = async (override: Record<string, any>) => {
      return updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            space: { ...spaceSettingsBase, ...override },
          },
        }
      );
    };

    const updateSpaceAdminSetting = async (
      override: Record<string, any>
    ) => {
      return updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            space: {
              ...spaceSettingsBase,
              admin: { ...spaceSettingsBase.admin, ...override },
            },
          },
        }
      );
    };

    test('should update push for space.admin.communityApplicationReceived', async () => {
      const res = await updateSpaceAdminSetting({
        communityApplicationReceived: notifPush(false, true),
      });
      const admin = getSettings(res)?.space?.admin;
      expect(admin?.communityApplicationReceived?.push).toBe(true);
    });

    test('should update push for space.admin.communityNewMember', async () => {
      const res = await updateSpaceAdminSetting({
        communityNewMember: notifPush(false, true),
      });
      const admin = getSettings(res)?.space?.admin;
      expect(admin?.communityNewMember?.push).toBe(true);
    });

    test('should update push for space.admin.communicationMessageReceived', async () => {
      const res = await updateSpaceAdminSetting({
        communicationMessageReceived: notifPush(false, true),
      });
      const admin = getSettings(res)?.space?.admin;
      expect(admin?.communicationMessageReceived?.push).toBe(true);
    });

    test('should update push for space.admin.collaborationCalloutContributionCreated', async () => {
      const res = await updateSpaceAdminSetting({
        collaborationCalloutContributionCreated: notifPush(false, true),
      });
      const admin = getSettings(res)?.space?.admin;
      expect(admin?.collaborationCalloutContributionCreated?.push).toBe(true);
    });

    test('should update push for space.communicationUpdates', async () => {
      const res = await updateSpaceSetting({
        communicationUpdates: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.communicationUpdates?.push).toBe(true);
    });

    test('should update push for space.collaborationCalloutContributionCreated', async () => {
      const res = await updateSpaceSetting({
        collaborationCalloutContributionCreated: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationCalloutContributionCreated?.push).toBe(true);
    });

    test('should update push for space.collaborationCalloutPostContributionComment', async () => {
      const res = await updateSpaceSetting({
        collaborationCalloutPostContributionComment: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationCalloutPostContributionComment?.push).toBe(
        true
      );
    });

    test('should update push for space.collaborationCalloutComment', async () => {
      const res = await updateSpaceSetting({
        collaborationCalloutComment: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationCalloutComment?.push).toBe(true);
    });

    test('should update push for space.collaborationCalloutPublished', async () => {
      const res = await updateSpaceSetting({
        collaborationCalloutPublished: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationCalloutPublished?.push).toBe(true);
    });

    test('should update push for space.communityCalendarEvents', async () => {
      const res = await updateSpaceSetting({
        communityCalendarEvents: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.communityCalendarEvents?.push).toBe(true);
    });

    test('should update push for space.collaborationPollVoteCastOnOwnPoll', async () => {
      const res = await updateSpaceSetting({
        collaborationPollVoteCastOnOwnPoll: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationPollVoteCastOnOwnPoll?.push).toBe(true);
    });

    test('should update push for space.collaborationPollVoteCastOnPollIVotedOn', async () => {
      const res = await updateSpaceSetting({
        collaborationPollVoteCastOnPollIVotedOn: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationPollVoteCastOnPollIVotedOn?.push).toBe(true);
    });

    test('should update push for space.collaborationPollModifiedOnPollIVotedOn', async () => {
      const res = await updateSpaceSetting({
        collaborationPollModifiedOnPollIVotedOn: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationPollModifiedOnPollIVotedOn?.push).toBe(true);
    });

    test('should update push for space.collaborationPollVoteAffectedByOptionChange', async () => {
      const res = await updateSpaceSetting({
        collaborationPollVoteAffectedByOptionChange: notifPush(false, true),
      });
      const space = getSettings(res)?.space;
      expect(space?.collaborationPollVoteAffectedByOptionChange?.push).toBe(
        true
      );
    });
  });

  describe('User notification settings', () => {
    test('should update push setting for user.mentioned', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: notifPush(false, true),
              commentReply: notifWithPush(false),
              messageReceived: notifWithPush(false),
              membership: {
                spaceCommunityInvitationReceived: notifWithPush(false),
                spaceCommunityJoined: notifWithPush(false),
              },
            },
          },
        }
      );

      const user = getSettings(res)?.user;
      expect(user?.mentioned?.push).toBe(true);
      expect(user?.mentioned?.email).toBe(false);
    });

    test('should update push setting for user.commentReply', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: notifWithPush(false),
              commentReply: notifPush(false, true),
              messageReceived: notifWithPush(false),
              membership: {
                spaceCommunityInvitationReceived: notifWithPush(false),
                spaceCommunityJoined: notifWithPush(false),
              },
            },
          },
        }
      );

      const user = getSettings(res)?.user;
      expect(user?.commentReply?.push).toBe(true);
    });

    test('should update push setting for user.messageReceived', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: notifWithPush(false),
              commentReply: notifWithPush(false),
              messageReceived: notifPush(false, true),
              membership: {
                spaceCommunityInvitationReceived: notifWithPush(false),
                spaceCommunityJoined: notifWithPush(false),
              },
            },
          },
        }
      );

      const user = getSettings(res)?.user;
      expect(user?.messageReceived?.push).toBe(true);
    });

    test('should update push for user.membership.spaceCommunityInvitationReceived', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: notifWithPush(false),
              commentReply: notifWithPush(false),
              messageReceived: notifWithPush(false),
              membership: {
                spaceCommunityInvitationReceived: notifPush(false, true),
                spaceCommunityJoined: notifWithPush(false),
              },
            },
          },
        }
      );

      const membership = getSettings(res)?.user?.membership;
      expect(membership?.spaceCommunityInvitationReceived?.push).toBe(true);
    });

    test('should update push for user.membership.spaceCommunityJoined', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: notifWithPush(false),
              commentReply: notifWithPush(false),
              messageReceived: notifWithPush(false),
              membership: {
                spaceCommunityInvitationReceived: notifWithPush(false),
                spaceCommunityJoined: notifPush(false, true),
              },
            },
          },
        }
      );

      const membership = getSettings(res)?.user?.membership;
      expect(membership?.spaceCommunityJoined?.push).toBe(true);
    });
  });

  describe('Virtual Contributor notification settings', () => {
    test('should update push for virtualContributor.adminSpaceCommunityInvitation', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            virtualContributor: {
              adminSpaceCommunityInvitation: notifPush(false, true),
            },
          },
        }
      );

      const vc = getSettings(res)?.virtualContributor;
      expect(vc?.adminSpaceCommunityInvitation?.push).toBe(true);
    });
  });

  describe('Push channel independence', () => {
    test('should enable push while keeping email and inApp disabled', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: { email: false, inApp: false, push: true },
              commentReply: notifWithPush(false),
              messageReceived: notifWithPush(false),
              membership: {
                spaceCommunityInvitationReceived: notifWithPush(false),
                spaceCommunityJoined: notifWithPush(false),
              },
            },
          },
        }
      );

      const user = getSettings(res)?.user;
      expect(user?.mentioned?.push).toBe(true);
      expect(user?.mentioned?.email).toBe(false);
      expect(user?.mentioned?.inApp).toBe(false);
    });

    test('should disable push while keeping email and inApp enabled', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: { email: true, inApp: true, push: false },
              commentReply: notifWithPush(false),
              messageReceived: notifWithPush(false),
              membership: {
                spaceCommunityInvitationReceived: notifWithPush(false),
                spaceCommunityJoined: notifWithPush(false),
              },
            },
          },
        }
      );

      const user = getSettings(res)?.user;
      expect(user?.mentioned?.push).toBe(false);
      expect(user?.mentioned?.email).toBe(true);
      expect(user?.mentioned?.inApp).toBe(true);
    });

    test('should enable all three channels simultaneously', async () => {
      const res = await updateUserSettingsWithPush(
        TestUserManager.users.globalAdmin.id,
        {
          notification: {
            user: {
              mentioned: notifWithPush(true),
              commentReply: notifWithPush(true),
              messageReceived: notifWithPush(true),
              membership: {
                spaceCommunityInvitationReceived: notifWithPush(true),
                spaceCommunityJoined: notifWithPush(true),
              },
            },
          },
        }
      );

      const user = getSettings(res)?.user;
      expect(user?.mentioned?.push).toBe(true);
      expect(user?.mentioned?.email).toBe(true);
      expect(user?.mentioned?.inApp).toBe(true);
      expect(user?.commentReply?.push).toBe(true);
      expect(user?.messageReceived?.push).toBe(true);
      expect(user?.membership?.spaceCommunityInvitationReceived?.push).toBe(
        true
      );
      expect(user?.membership?.spaceCommunityJoined?.push).toBe(true);
    });
  });
});
