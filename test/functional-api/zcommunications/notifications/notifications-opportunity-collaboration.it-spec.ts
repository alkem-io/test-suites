import { mutation } from '@test/utils/graphql.request';
import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
  createOpportunityForChallenge,
} from '../create-entities-with-users-helper';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import {
  createRelation,
  removeRelation,
} from '@test/functional-api/integration/relations/relations.request.params';
import {
  assignUserAsOpportunityAdmin,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';

const organizationName = `test org name ${uniqueId}`;
const hostNameId = `test-org-${uniqueId}`;
const hubName = `test hub ${uniqueId}`;
const hubNameId = `test-hub-${uniqueId}`;
const challengeName = `test challenge ${uniqueId}`;
const opportunityName = `test opportunity ${uniqueId}`;
const relationType = 'incoming';
const relationDescription = `relation description ${uniqueId}`;
const relationActorName = `relation actor name ${uniqueId}`;
const relationActorType = `relationActorType-${uniqueId}`;
const relationActorRole = `relationActorRole-${uniqueId}`;
const subjectAdmin = 'New user is interested to collaborate on opportunity';
const subjectUser = 'Your interest to collaborate was received!';
const preferencesConfig = [
  {
    userID: users.qaUserId,
    type: UserPreferenceType.INTERESTED_IN_COLLABORATION_ADMIN,
  },
  {
    userID: users.hubMemberId,
    type: UserPreferenceType.INTERESTED_IN_COLLABORATION_USER,
  },
];

let relationId = '';

beforeAll(async () => {
  await changePreferenceUser(
    users.globalAdminId,
    UserPreferenceType.INTERESTED_IN_COLLABORATION_ADMIN,
    'false'
  );
  for (const config of preferencesConfig) {
    await changePreferenceUser(config.userID, config.type, 'false');
  }

  await deleteMailSlurperMails();

  // Hub:
  //  Members:users.hubAdminId, users.hubMemberId, users.qaUserId
  //  Admins: users.hubAdminId
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  // Challenge:
  //  Members: users.hubMemberId, users.qaUserId
  //  Admins: users.hubMemberId
  await createChallengeWithUsers(challengeName);
  // Opportunity:
  //  Members: users.qaUserId
  //  Admins: users.qaUserId
  await createOpportunityForChallenge(opportunityName);
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.opportunityCommunityId,
      users.qaUserId
    )
  );
  await mutation(
    assignUserAsOpportunityAdmin,
    userAsOpportunityAdminVariablesData(
      users.qaUserId,
      entitiesId.opportunityId
    )
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

afterEach(async () => {
  await removeRelation(relationId);
});

describe('Preferences enabled for Admin and User interested', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig) {
      await changePreferenceUser(config.userID, config.type, 'true');
    }
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test.only('User member of a Hub registers interest in collaboration on Opp (child of Challenge / child of Hub)- Opp admin gets notification, User gets notification', async () => {
    // Act
    const createRelationResponse = await createRelation(
      entitiesId.opportunityId,
      relationType,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole,
      TestUser.HUB_MEMBER
    );

    relationId = createRelationResponse.body.data.createRelation.id;
    await delay(4000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subjectAdmin,
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: subjectUser,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );
  });

  // test('User member of a Challenge registers interest in collaboration on Opp - Opp admin gets notification, User gets notification', async () => {});

  // test('no notification when Non-hub member cannot join a Hub - GA, EA and Joiner', async () => {});
});

// describe('Preferences disabled for Community Admin and User interested', () => {});
