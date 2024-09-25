import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

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

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  preferencesConfig = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

// Skip tests due to bug: #193
describe.skip('Notifications - updates', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationCommunicationUpdates,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationCommunicationUpdateSentAdmin,
      'false'
    );

    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationCommunicationUpdates,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
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
      entitiesId.space.updatesId,
      'GA space update '
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.globalAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityMember.email)
    );
  });

  test('HA create space update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.space.updatesId,
      'EA space update ',
      TestUser.HUB_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.globalAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.opportunityMember.email)
    );
  });

  test('CA create challenge update - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.challenge.updatesId,
      'CA challenge update ',
      TestUser.CHALLENGE_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(challengeName, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(challengeName, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.globalAdmin.email)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(challengeName, users.spaceAdmin.email)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(challengeName, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.opportunityAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        challengeName,
        users.opportunityMember.email
      )
    );
  });

  test('OA create opportunity update - GA(1), HA(1), CA(1), OA(1), OM(1), get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.opportunity.updatesId,
      'OA opportunity update ',
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(opportunityName, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(opportunityName, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(opportunityName, users.globalAdmin.email)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.spaceAdmin.email)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.spaceMember.email)
    );

    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.challengeAdmin.email)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        opportunityName,
        users.challengeMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        opportunityName,
        users.opportunityAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        opportunityName,
        users.opportunityMember.email
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
      entitiesId.opportunity.updatesId,
      'OA opportunity update 2',
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
