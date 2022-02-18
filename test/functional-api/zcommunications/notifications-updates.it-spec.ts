import '../../utils/array.matcher';
import {
  createTestEcoverse,
  hubName,
  hubNameId,
  removeEcoverse,
} from '../integration/hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import { getUser } from '@test/functional-api/user-management/user.request.params';

import {
  PreferenceType,
  changePreference,
} from '@test/utils/mutations/user-preferences-mutation';
import {
  assignChallengeAdmin,
  assignEcoverseAdmin,
  assignUserAsOpportunityAdmin,
  userAsChallengeAdminVariablesData,
  userAsEcoverseAdminVariablesData,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  challengeVariablesData,
  createChallenge,
  createOpportunity,
  opportunityVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { removeChallenge } from '../integration/challenge/challenge.request.params';
import { TestUser } from '@test/utils/token.helper';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import {
  delay,
  entitiesId,
  getMailsData,
  users,
} from './communications-helper';
import { removeOpportunity } from '../integration/opportunity/opportunity.request.params';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';

let ecoName = hubName;
let challengeName = `chName${uniqueId}`;
let opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];

beforeAll(async () => {
  await deleteMailSlurperMails();

  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;

  let responseEco = await createTestEcoverse(
    hubName,
    hubNameId,
    entitiesId.organizationId
  );

  entitiesId.hubId = responseEco.body.data.createEcoverse.id;
  entitiesId.hubCommunityId = responseEco.body.data.createEcoverse.community.id;
  entitiesId.hubUpdatesId =
    responseEco.body.data.createEcoverse.community.communication.updates.id;

  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `chnameid${uniqueId}`,
      entitiesId.hubId
    )
  );
  entitiesId.challengeId = responseChallenge.body.data.createChallenge.id;
  entitiesId.challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;
  entitiesId.challengeUpdatesId =
    responseChallenge.body.data.createChallenge.community.communication.updates.id;

  const responseOpportunity = await mutation(
    createOpportunity,
    opportunityVariablesData(
      opportunityName,
      `opnameid${uniqueId}`,
      entitiesId.challengeId
    )
  );
  entitiesId.opportunityId = responseOpportunity.body.data.createOpportunity.id;
  entitiesId.opportunityCommunityId =
    responseOpportunity.body.data.createOpportunity.community.id;
  entitiesId.opportunityUpdatesId =
    responseOpportunity.body.data.createOpportunity.community.communication.updates.id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonEcoverseMemberEmail);
  users.nonEcoverseMemberId = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(users.hubAdminEmail);
  users.hubAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.hubMemberEmail);
  users.hubMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.hubCommunityId,
      users.hubAdminId
    )
  );

  await mutation(
    assignEcoverseAdmin,
    userAsEcoverseAdminVariablesData(users.hubAdminId, entitiesId.hubId)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.hubCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
  );
  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.challengeCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(users.hubMemberId, entitiesId.challengeId)
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.opportunityCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
      entitiesId.opportunityCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignUserAsOpportunityAdmin,
    userAsOpportunityAdminVariablesData(
      users.hubMemberId,
      entitiesId.opportunityId
    )
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: PreferenceType.UPDATES,
    },
    {
      userID: users.globalAdminId,
      type: PreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.hubAdminId,
      type: PreferenceType.UPDATES,
    },
    {
      userID: users.hubAdminId,
      type: PreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.hubMemberId,
      type: PreferenceType.UPDATES,
    },
    {
      userID: users.hubMemberId,
      type: PreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.qaUserId,
      type: PreferenceType.UPDATES,
    },
    {
      userID: users.qaUserId,
      type: PreferenceType.UPDATE_SENT_ADMIN,
    },
    {
      userID: users.nonEcoverseMemberId,
      type: PreferenceType.UPDATES,
    },
    {
      userID: users.nonEcoverseMemberId,
      type: PreferenceType.UPDATE_SENT_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeEcoverse(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - updates', () => {
  beforeAll(async () => {
    preferencesConfig.forEach(
      async config => await changePreference(config.userID, config.type, 'true')
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

    expect(mails[1]).toEqual(4);
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

    expect(mails[1]).toEqual(4);
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

    expect(mails[1]).toEqual(4);
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

    expect(mails[1]).toEqual(4);
  });

  test('OA create opportunity update - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreference(config.userID, config.type, 'false')
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
