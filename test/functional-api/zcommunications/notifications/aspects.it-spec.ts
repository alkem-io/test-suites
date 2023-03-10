import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
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
import {
  createAspectOnCallout,
  AspectTypes,
  removeAspect,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let hubAspectId = '';
let challengeAspectId = '';
let opportunityAspectId = '';
let aspectDisplayName = '';
let preferencesConfig: any[] = [];

const templatedAdminResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
      toAddresses: [userEmail],
    }),
  ]);
};

const templateMemberResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
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
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - card', () => {
  let aspectNameID = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();

    aspectNameID = `asp-name-id-${uniqueId}`;
    aspectDisplayName = `asp-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_CREATED_ADMIN,
      'false'
    );

    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.ASPECT_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.ASPECT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.ASPECT_CREATED_ADMIN,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await removeAspect(hubAspectId);
    await removeAspect(challengeAspectId);
    await removeAspect(opportunityAspectId);
  });

  test.only('GA create hub card - GA(1), HA (2), HM(6) get notifications', async () => {
    const cardSubjectAdmin = `[${hubName}] New Card created by admin`;
    const cardSubjectMember = `${hubName} - New Card created by admin, have a look!`;

    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
      AspectTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.hubAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        cardSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('HA create hub card - GA(1), HA (1), HM(6) get notifications', async () => {
    const cardSubjectAdmin = `[${hubName}] New Card created by hub`;
    const cardSubjectMember = `${hubName} - New Card created by hub, have a look!`;
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.hubCalloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
      AspectTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.hubAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        cardSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('HA create challenge card - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const cardSubjectAdmin = `[${challengeName}] New Card created by hub`;
    const cardSubjectMember = `${challengeName} - New Card created by hub, have a look!`;
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.challengeCalloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
      AspectTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    challengeAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(8);

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.hubAdminEmail)
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(cardSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        cardSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('OM create opportunity card - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const cardSubjectAdmin = `[${opportunityName}] New Card created by qa`;
    const cardSubjectMember = `${opportunityName} - New Card created by qa, have a look!`;
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.opportunityCalloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
      AspectTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(cardSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.hubAdminEmail)
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(cardSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeAdminEmail)
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(cardSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(cardSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        cardSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('OA create opportunity card - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const resAspectonHub = await createAspectOnCallout(
      entitiesId.opportunityCalloutId,
      aspectNameID,
      { profileData: { displayName: aspectDisplayName } },
      AspectTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_ADMIN
    );
    opportunityAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
