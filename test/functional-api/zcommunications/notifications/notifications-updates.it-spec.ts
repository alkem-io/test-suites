import { mutation } from '@test/utils/graphql.request';
import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';

let organizationName = 'not-up-org-name' + uniqueId;
let hostNameId = 'not-up-org-nameid' + uniqueId;
let hubName = 'not-up-eco-name' + uniqueId;
let hubNameId = 'not-up-eco-nameid' + uniqueId;
let ecoName = hubName;
let challengeName = `chName${uniqueId}`;
let opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - updates', () => {
  beforeAll(async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create hub update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.hubUpdatesId,
        'GA hub update '
      )
    );

    await delay(2500);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[1]).toEqual(5);
  });

  test('EA create hub update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.hubUpdatesId,
        'EA hub update '
      ),
      TestUser.HUB_ADMIN
    );

    // Assert
    await delay(3500);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[1]).toEqual(5);
  });

  test('CA create challenge update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.challengeUpdatesId,
        'CA challenge update '
      ),
      TestUser.HUB_MEMBER
    );

    // Assert
    await delay(3500);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[1]).toEqual(5);
  });

  test('OA create opportunity update - GA(1), EA (1), EM(1), CA(1) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.opportunityUpdatesId,
        'OA opportunity update '
      ),
      TestUser.HUB_MEMBER
    );

    // Assert
    await delay(3500);
    var mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}`,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}`,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}`,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[1]).toEqual(5);
  });

  test('OA create opportunity update - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.opportunityUpdatesId,
        'OA opportunity update 2'
      ),
      TestUser.HUB_MEMBER
    );

    // Assert
    await delay(1500);
    var mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
