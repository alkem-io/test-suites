/* eslint-disable prettier/prettier */
import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData } from '../../communications-helper';
import { sendMessageToOrganization } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsOrganizationAdmin,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';

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

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.spaceAdminId,
      entitiesId.organizationId
    )
  );

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.spaceMemberId,
      entitiesId.organizationId
    )
  );

  receivers = `${users.nonSpaceMemberDisplayName} sent a message to your organization`;
  sender = `You have sent a message to ${firstOrganizationName}!`;

  preferencesConfig = [
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.ORGANIZATION_MESSAGE,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.ORGANIZATION_MESSAGE,
    },
  ];
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
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

  test("User 'A' sends message to Organization(both admins ORGANIZATION_MESSAGE:true) (3 admins) - 4 messages are sent", async () => {
    // Act
    await sendMessageToOrganization(
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
    await changePreferenceUser(
      users.spaceAdminId,
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
    await changePreferenceUser(
      users.spaceAdminId,
      UserPreferenceType.ORGANIZATION_MESSAGE,
      'true'
    );
    await changePreferenceUser(
      users.spaceAdminId,
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
