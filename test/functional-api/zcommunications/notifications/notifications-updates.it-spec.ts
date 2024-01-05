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
import { entitiesId, getMailsData } from '../communications-helper';
import { deleteOpportunityCodegen } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';

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
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.nonSpaceMemberId,
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
      userID: users.spaceAdminId,
      type: UserPreferenceType.UPDATES,
    },
    {
      userID: users.spaceAdminId,
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

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
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

  test('GA create space update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.spaceUpdatesId,
        'GA space update '
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
    await mutation(
      sendCommunityUpdate,
      sendCommunityUpdateVariablesData(
        entitiesId.spaceUpdatesId,
        'EA space update '
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
