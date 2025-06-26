/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestSetupUtils,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';

import { delay } from '@alkemio/tests-lib';
import { deleteUser } from '@functional-api/contributor-management/user/user.request.params';
import {
  createDiscussion,
  sendMessageToRoom,
} from '@functional-api/communications/communication.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

const spaceName = 'not-disc-eco-name' + uniqueId;
const ecoName = spaceName;
const subspaceName = `chName${uniqueId}`;
let preferencesConfig: any[] = [];
const spaceMemOnly = `spacemem${uniqueId}@alkem.io`;
const subspaceAndSpaceMemOnly = `chalmem${uniqueId}@alkem.io`;
const subsubspaceAndSubspaceAndSpaceMem = `oppmem${uniqueId}@alkem.io`;
const spaceDiscussionSubjectText = `${ecoName} - New discussion created: Default title, have a look!`;
const spaceDiscussionSubjectTextAdmin = `[${ecoName}] New discussion created: Default title`;
const subspaceDiscussionSubjectText = `${subspaceName} - New discussion created: Default title, have a look!`;
const subspaceDiscussionSubjectTextAdmin = `[${subspaceName}] New discussion created: Default title`;

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-discussions',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await TestSetupUtils.registerUsersAndAssignToAllEntitiesAsMembers(
    baseScenario,
    spaceMemOnly,
    subspaceAndSpaceMemOnly,
    subsubspaceAndSubspaceAndSpaceMem
  );

  preferencesConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: TestUserManager.users.spaceMember.id,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: TestUserManager.users.qaUser.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },

    {
      userID: TestUserManager.users.qaUser.id,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: spaceMemOnly,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: spaceMemOnly,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: subspaceAndSpaceMemOnly,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: subspaceAndSpaceMemOnly,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },

    {
      userID: subsubspaceAndSubspaceAndSpaceMem,
      type: PreferenceType.NotificationForumDiscussionCreated,
    },
    {
      userID: subsubspaceAndSubspaceAndSpaceMem,
      type: PreferenceType.NotificationCommunicationDiscussionCreatedAdmin,
    },
  ];
});

afterAll(async () => {
  for (const config of preferencesConfig)
    await changePreferenceUser(config.userID, config.type, 'false');
  await deleteUser(spaceMemOnly);
  await deleteUser(subspaceAndSpaceMemOnly);
  await deleteUser(subsubspaceAndSubspaceAndSpaceMem);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// skipping the tests as they need to be updated
describe.skip('Notifications - discussions', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('GA create space discussion and send message - GA(1), HA(1), HM(6) get notifications', async () => {
    // Act
    const res = await createDiscussion(baseScenario.space.communication.id);
    // TODO: may not be the right usage
    baseScenario.space.collaboration.calloutPostCommentsId =
      res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'test message'
    );

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectTextAdmin,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [spaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [subspaceAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [subsubspaceAndSubspaceAndSpaceMem],
        }),
      ])
    );
  });

  test('EM create space discussion and send message - GA(1), HA(1), HM(6) get notifications', async () => {
    // Act
    const res = await createDiscussion(
      baseScenario.space.communication.id,
      TestUser.QA_USER
    );
    baseScenario.space.collaboration.calloutPostCommentsId =
      res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'test message'
    );

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(8);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectTextAdmin,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [spaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [subspaceAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: spaceDiscussionSubjectText,
          toAddresses: [subsubspaceAndSubspaceAndSpaceMem],
        }),
      ])
    );
  });

  test('GA create subspace discussion and send message - GA(1), HA(1), CA(1), CM(4) get notifications', async () => {
    // Act
    const res = await createDiscussion(baseScenario.subspace.communication.id);
    baseScenario.space.collaboration.calloutPostCommentsId =
      res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'test message'
    );

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    // Note: TestUserManager.users.globalAdmin.idEmail receives email twice, as it member and admin for the entity. Only ones is asserted as the subject of the mail is the same
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subspaceDiscussionSubjectTextAdmin,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [subspaceAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [subsubspaceAndSubspaceAndSpaceMem],
        }),
      ])
    );
  });

  // Note: TestUserManager.users.globalAdmin.idEmail receives email twice, as it member and admin for the entity. Only ones is asserted as the subject of the mail is the same
  test('EM create subspace discussion and send message - GA(1), HA(1), CA(1), CM(4), get notifications', async () => {
    // Act
    const res = await createDiscussion(
      baseScenario.subspace.communication.id,
      TestUser.QA_USER
    );
    baseScenario.space.collaboration.calloutPostCommentsId =
      res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'test message'
    );

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(6);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subspaceDiscussionSubjectTextAdmin,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [subspaceAndSpaceMemOnly],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: subspaceDiscussionSubjectText,
          toAddresses: [subsubspaceAndSubspaceAndSpaceMem],
        }),
      ])
    );
  });

  // ToDo - add discussions notifications tests for subsubspace

  test('EM create space discussion and send message to space - all roles with notifications disabled', async () => {
    // Arrange

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    const res = await createDiscussion(
      baseScenario.space.communication.id,
      TestUser.QA_USER
    );
    baseScenario.space.collaboration.calloutPostCommentsId =
      res?.data?.createDiscussion.id ?? '';

    await sendMessageToRoom(
      baseScenario.space.collaboration.calloutPostCommentsId,
      'test message'
    );

    // Act
    await delay(1500);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
