/* eslint-disable prettier/prettier */
import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';

import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData, users } from '../../communications-helper';
import { sendMessageToCommunityLeads } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import { createOrgAndHubWithUsers } from '../../create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { assignUserAsCommunityLeadFunc } from '@test/utils/mutations/assign-mutation';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const hubName = '111' + uniqueId;
const hubNameId = '111' + uniqueId;

let preferencesConfig: any[] = [];
let receivers = '';
let sender = '';

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );

  await assignUserAsCommunityLeadFunc(
    entitiesId.hubCommunityId,
    users.hubAdminEmail
  );

  await assignUserAsCommunityLeadFunc(
    entitiesId.hubCommunityId,
    users.hubMemberEmail
  );

  receivers = `${users.nonHubDisplayName} sent a message to your community!`;
  sender = `You have sent a message to ${hubName} community!`;

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
  ];
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - user to user messages', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('User \'A\'(pref:true) send message to Private Hub community (2 hosts) - 3 messages are sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.hubCommunityId,
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
          toAddresses: [users.hubAdminEmail],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  // test('User \'A\'(pref:true) send message to user \'B\'(pref:false) - 1 messages are sent', async () => {
  //   // Arrange
  //   await changePreferenceUser(
  //     users.globalAdminId,
  //     UserPreferenceType.COMMUNICATION_MESSAGE,
  //     'false'
  //   );

  //   // Act
  //   await sendMessageToUser(
  //     users.globalAdminId,
  //     'Test message',
  //     TestUser.NON_HUB_MEMBER
  //   );
  //   await delay(3000);

  //   const getEmailsData = await getMailsData();

  //   // Assert
  //   expect(getEmailsData[1]).toEqual(1);
  //   expect(getEmailsData[0]).toEqual(
  //     expect.arrayContaining([
  //       expect.objectContaining({
  //         subject: sender,
  //         toAddresses: [users.nonHubMemberEmail],
  //       }),
  //     ])
  //   );
  // });

  // test('User \'A\'(pref:false) send message to user \'B\'(pref:true) - 2 messages are sent', async () => {
  //   // Arrange
  //   await changePreferenceUser(
  //     users.globalAdminId,
  //     UserPreferenceType.COMMUNICATION_MESSAGE,
  //     'true'
  //   );

  //   await changePreferenceUser(
  //     users.nonHubMemberId,
  //     UserPreferenceType.COMMUNICATION_MESSAGE,
  //     'false'
  //   );

  //   // Act
  //   await sendMessageToUser(
  //     users.globalAdminId,
  //     'Test message',
  //     TestUser.NON_HUB_MEMBER
  //   );
  //   await delay(3000);

  //   const getEmailsData = await getMailsData();

  //   // Assert
  //   expect(getEmailsData[1]).toEqual(2);
  //   expect(getEmailsData[0]).toEqual(
  //     expect.arrayContaining([
  //       expect.objectContaining({
  //         subject: receiver,
  //         toAddresses: [users.globalAdminIdEmail],
  //       }),
  //       expect.objectContaining({
  //         subject: sender,
  //         toAddresses: [users.nonHubMemberEmail],
  //       }),
  //     ])
  //   );
  // });
});
