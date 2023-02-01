/* eslint-disable prettier/prettier */
import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';

import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData, users } from '../../communications-helper';
import { sendMessageToOrganization } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import { createOrgAndHubWithUsers } from '../../create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { assignUserAsCommunityLeadFunc } from '@test/utils/mutations/assign-mutation';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsOrganizationAdmin,
  assignUserAsOrganizationOwner,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';

const firstOrganizationName = 'sample-org-name' + uniqueId;
const hostNameId = 'sample-org-nameid' + uniqueId;
const hubName = '111' + uniqueId;
const hubNameId = '111' + uniqueId;

let preferencesConfig: any[] = [];
let receivers = '';
let sender = '';

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    firstOrganizationName,
    hostNameId,
    hubName,
    hubNameId
  );

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.hubAdminId,
      entitiesId.organizationId
    )
  );

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.hubMemberId,
      entitiesId.organizationId
    )
  );

  receivers = `${users.nonHubDisplayName} sent a message to your organization!`;
  sender = `You have sent a message to ${firstOrganizationName}!`;

  preferencesConfig = [
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ORGANIZATION_MESSAGE,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ORGANIZATION_MESSAGE,
    },
  ];
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - user to organization messages', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test("User 'A' sends message to Organization(both admins ORGANIZATION_MESSAGE:true) (2 admins) - 3 messages are sent", async () => {
    // Act
    await sendMessageToOrganization(
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

  test("User 'A' sends message to Organization (2 admins, one admin has ORGANIZATION_MESSAGE:false) - 2 messages are sent", async () => {
    // Arrange
    await changePreferenceUser(
      users.hubAdminId,
      UserPreferenceType.ORGANIZATION_MESSAGE,
      'false'
    );
    // Act
    await sendMessageToOrganization(
      entitiesId.organizationId,
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
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

  // first admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:true
  // second admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false
  test("User 'A' sends message to Organization (2 admins, one admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false) - 3 messages are sent", async () => {
    // Arrange
    await changePreferenceUser(
      users.hubAdminId,
      UserPreferenceType.ORGANIZATION_MESSAGE,
      'true'
    );
    await changePreferenceUser(
      users.hubAdminId,
      UserPreferenceType.COMMUNICATION_MESSAGE,
      'false'
    );
    // Act
    await sendMessageToOrganization(
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
});
