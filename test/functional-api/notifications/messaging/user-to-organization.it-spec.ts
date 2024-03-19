/* eslint-disable prettier/prettier */


import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { assignUserAsOrganizationAdminCodegen } from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToOrganizationCodegen } from '@test/functional-api/communications/communication.params';
import { entitiesId, getMailsData } from '@test/functional-api/roles/community/communications-helper';

const firstOrganizationName = 'sample-org-name' + uniqueId;
const hostNameId = 'sample-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;

let preferencesConfig: any[] = [];
let receivers = '';
let sender = '';

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    firstOrganizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await assignUserAsOrganizationAdminCodegen(
    users.spaceAdminId,
    entitiesId.organizationId
  );

  await assignUserAsOrganizationAdminCodegen(
    users.spaceMemberId,
    entitiesId.organizationId
  );

  receivers = `${users.nonSpaceMemberDisplayName} sent a message to your organization`;
  sender = `You have sent a message to ${firstOrganizationName}!`;

  preferencesConfig = [
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationOrganizationMessage,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationOrganizationMessage,
    },
  ];
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - user to organization messages', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test("User 'A' sends message to Organization(both admins ORGANIZATION_MESSAGE:true) (3 admins) - 4 messages are sent", async () => {
    // Act
    await sendMessageToOrganizationCodegen(
      entitiesId.organizationId,
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.spaceAdminEmail],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.spaceMemberEmail],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test("User 'A' sends message to Organization (3 admins, one admin has ORGANIZATION_MESSAGE:false) - 3 messages are sent", async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.spaceAdminId,
      UserPreferenceType.NotificationOrganizationMessage,
      'false'
    );
    // Act
    await sendMessageToOrganizationCodegen(
      entitiesId.organizationId,
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.spaceMemberEmail],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  // first admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:true
  // second admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false
  test("User 'A' sends message to Organization (3 admins, one admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false) - 4 messages are sent", async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.spaceAdminId,
      UserPreferenceType.NotificationOrganizationMessage,
      'true'
    );
    await changePreferenceUserCodegen(
      users.spaceAdminId,
      UserPreferenceType.NotificationCommunicationMessage,
      'false'
    );
    // Act
    await sendMessageToOrganizationCodegen(
      entitiesId.organizationId,
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.spaceAdminEmail],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.spaceMemberEmail],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });
});
