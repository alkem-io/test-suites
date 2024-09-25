import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  deleteSpace,
  updateSpaceSettings,
} from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib/dist/types/alkemio-schema';

import {
  joinRoleSet,
  assignRoleToUser,
  removeRoleFromUser,
} from '@test/functional-api/roleset/roles-request.params';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { CommunityRoleType } from '@test/generated/graphql';

const organizationName = 'not-app-org-name' + uniqueId;
const hostNameId = 'not-app-org-nameid' + uniqueId;
const spaceName = 'not-app-eco-name' + uniqueId;
const spaceNameId = 'not-app-eco-nameid' + uniqueId;

const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];

const subjectAdminSpace = `user &#34;qa user&#34; joined ${ecoName}`;
const subjectAdminSpaceNon = `user &#34;non space&#34; joined ${ecoName}`;
const subjectAdminChallenge = `user &#34;non space&#34; joined ${challengeName}`;

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await updateSpaceSettings(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Private,
    },
    membership: {
      policy: CommunityMembershipPolicy.Open,
    },
  });

  await createChallengeWithUsersCodegen(challengeName);
  await updateSpaceSettings(entitiesId.challenge.id, {
    membership: {
      policy: CommunityMembershipPolicy.Open,
    },
  });

  preferencesConfig = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationCommunityNewMemberAdmin,
    },
    {
      userID: users.qaUser.id,
      type: UserPreferenceType.NotificationCommunityNewMember,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

// Skip until clear the behavior
describe('Notifications - member join community', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationCommunityNewMemberAdmin,
      'false'
    );
    for (const config of preferencesConfig) {
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
    }
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });
  // skip until bug is resolved: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/notifications/333
  test('Non-space member join a Space - GA, HA and Joiner receive notifications', async () => {
    // Act
    await joinRoleSet(entitiesId.space.roleSetId, TestUser.NON_HUB_MEMBER);
    await delay(10000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminSpaceNon,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subjectAdminSpaceNon,
          toAddresses: [users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: `${ecoName} - Welcome to the Community!`,
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });

  // skip until bug is resolved: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/notifications/333
  test('Non-space member join a Challenge - GA, HA, CA and Joiner receive notifications', async () => {
    // Act
    await joinRoleSet(entitiesId.challenge.roleSetId, TestUser.NON_HUB_MEMBER);

    await delay(10000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminChallenge,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subjectAdminChallenge,
          toAddresses: [users.challengeAdmin.email],
        }),
        expect.objectContaining({
          subject: `${challengeName} - Welcome to the Community!`,
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });

  // skip until bug is resolved: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/notifications/333
  test('Admin adds user to Space community - GA, HA and Joiner receive notifications', async () => {
    // Act
    await assignRoleToUser(
      users.qaUser.id,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member,
      TestUser.GLOBAL_ADMIN
    );

    await delay(10000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdminSpace,
          toAddresses: [users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subjectAdminSpace,
          toAddresses: [users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: `${ecoName} - Welcome to the Community!`,
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });

  test('no notification when Non-space member cannot join a Space - GA, EA and Joiner', async () => {
    // Arrange
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );

    await removeRoleFromUser(
      users.nonSpaceMember.id,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Member
    );

    await removeRoleFromUser(
      users.nonSpaceMember.id,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member
    );

    // Act
    await joinRoleSet(entitiesId.space.roleSetId, TestUser.QA_USER);

    await delay(3000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
