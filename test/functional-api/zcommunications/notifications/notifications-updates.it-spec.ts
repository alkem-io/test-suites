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
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const ecoName = hubName;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];

export const templatedAsAdminResult = async (
  entityName: string,
  userEmail: string
) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `[${entityName}] New update shared`,
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
      userID: users.nonHubMemberId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.opportunityMemberId,
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
      userID: users.challengeAdminId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
  ];
});

// afterAll(async () => {
//   await removeOpportunity(entitiesId.opportunityId);
//   await removeChallenge(entitiesId.challengeId);
//   await removeHub(entitiesId.hubId);
//   await deleteOrganization(entitiesId.organizationId);
// });

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

    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.UPDATES,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
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

  test.only('GA create hub update - GA(1), HA (1), HM(6) get notifications', async () => {
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

    // Assert
    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.hubAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.hubMemberEmail)
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

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(ecoName, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.hubAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(ecoName, users.hubMemberEmail)
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
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.challengeUpdatesId,
        'CA challenge update '
      ),
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
      await templatedAsAdminResult(challengeName, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(challengeName, users.globalAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(challengeName, users.hubAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(challengeName, users.hubMemberEmail)
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
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.opportunityUpdatesId,
        'OA opportunity update '
      ),
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
      await templatedAsAdminResult(opportunityName, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(opportunityName, users.globalAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.hubAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(opportunityName, users.hubMemberEmail)
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
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.opportunityUpdatesId,
        'OA opportunity update 2'
      ),
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
