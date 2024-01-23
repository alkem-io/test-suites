import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/zcommunications/communications-helper';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const ecoName = spaceName;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];

export const templatedAsAdminResult = async (
  entityName: string,
  userEmail: string
) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${entityName}: New update shared`,
      toAddresses: [userEmail],
    }),
  ]);
};

const templatedAsMemberResult = async (
  entityName: string,
  userEmail: string
) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${entityName} - New update, have a look!`,
      toAddresses: [userEmail],
    }),
  ]);
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
  ];
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - updates', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationCommunicationUpdates,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
      'false'
    );

    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationCommunicationUpdates,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create space update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.spaceUpdatesId,
      'GA space update '
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityMemberEmail)
    );
  });

  test('HA create space update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.spaceUpdatesId,
      'EA space update ',
      TestUser.HUB_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityMemberEmail)
    );
  });

  test('CA create challenge update - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.challengeUpdatesId,
      'CA challenge update ',
      TestUser.CHALLENGE_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(challengeName, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(challengeName, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.globalAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(challengeName, users.spaceAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(challengeName, users.spaceMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.opportunityMemberEmail)
    );
  });

  test('OA create opportunity update - GA(1), HA(1), CA(1), OA(1), OM(1), get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.opportunityUpdatesId,
      'OA opportunity update ',
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(opportunityName, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(opportunityName, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(opportunityName, users.globalAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.spaceAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.spaceMemberEmail)
    );

    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.challengeAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.challengeMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        opportunityName,
        users.opportunityAdminEmail
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        opportunityName,
        users.opportunityMemberEmail
      )
    );
  });

  test('OA create opportunity update - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.opportunityUpdatesId,
      'OA opportunity update 2',
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
