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
  registerUsersAndAssignToAllEntitiesAsMembers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { removeUser } from '@test/functional-api/user-management/user.request.params';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const ecoName = hubName;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];
const hubMemOnly = `hubmem${uniqueId}@alkem.io`;
const challengeAndHubMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndHubMem = `oppmem${uniqueId}@alkem.io`;

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
  await registerUsersAndAssignToAllEntitiesAsMembers(
    hubMemOnly,
    challengeAndHubMemOnly,
    opportunityAndChallengeAndHubMem
  );

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
      userID: hubMemOnly,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: hubMemOnly,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: opportunityAndChallengeAndHubMem,
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
  await removeUser(hubMemOnly);
  await removeUser(challengeAndHubMemOnly);
  await removeUser(opportunityAndChallengeAndHubMem);
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - updates', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.UPDATES,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.UPDATE_SENT_ADMIN,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create hub update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.hubUpdatesId,
        'GA hub update '
      )
    );

    await delay(6000);
    const mails = await getMailsData();

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

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );

    expect(mails[1]).toEqual(8);
  });

  test('HA create hub update - GA(1), HA (1), HM(6) get notifications', async () => {
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
    await delay(6000);
    const mails = await getMailsData();

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

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [hubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${ecoName}`,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );

    expect(mails[1]).toEqual(8);
  });

  test('CA create challenge update - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
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
    await delay(6000);
    const mails = await getMailsData();

    // Asserts that Hub Admin doesn't receive mail
    expect(mails[0]).not.toEqual(
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
          subject: `New update shared with community ${challengeName}!`,
          toAddresses: [users.globalAdminIdEmail],
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

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${challengeName}`,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );

    expect(mails[1]).toEqual(6);
  });

  test('OA create opportunity update - GA(1), HA(1), CA(1), OA(1), OM(1), get notifications', async () => {
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
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}!`,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).not.toEqual(
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

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New update shared with community ${opportunityName}`,
          toAddresses: [opportunityAndChallengeAndHubMem],
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
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
