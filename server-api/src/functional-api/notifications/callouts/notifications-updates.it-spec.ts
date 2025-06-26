/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';

const uniqueId = UniqueIDGenerator.getID();

const spaceName = 'not-up-eco-name' + uniqueId;
const ecoName = spaceName;
const subspaceName = `chName${uniqueId}`;
const subsubspaceName = `opName${uniqueId}`;
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

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-updates',
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
      subspace: {
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  preferencesConfig = [
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: TestUserManager.users.globalAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: TestUserManager.users.subspaceMember.id,
      type: PreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: TestUserManager.users.subsubspaceMember.id,
      type: PreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdates,
    },
    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationCommunicationUpdateSentAdmin,
    },
  ];
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// Skip tests due to bug: #193
describe.skip('Notifications - updates', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationCommunicationUpdates,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationCommunicationUpdateSentAdmin,
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
    await sendMessageToRoom(
      baseScenario.space.communication.updatesId,
      'GA space update '
    );

    await delay(6000);
    const mails = await getMailsData();

    // Assert
    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        ecoName,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        ecoName,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('HA create space update - GA(1), HA (1), HM(6) get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.space.communication.updatesId,
      'EA space update ',
      TestUser.SPACE_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        ecoName,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        ecoName,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        ecoName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('CA create subspace update - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.subspace.communication.updatesId,
      'CA subspace update ',
      TestUser.SUBSPACE_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        subspaceName,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        subspaceName,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subspaceName,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        subspaceName,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        subspaceName,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subspaceName,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subspaceName,
        TestUserManager.users.subspaceMember.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subspaceName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subspaceName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OA create subsubspace update - GA(1), HA(1), CA(1), OA(1), OM(1), get notifications', async () => {
    // Act
    await sendMessageToRoom(
      baseScenario.subsubspace.communication.updatesId,
      'OA subsubspace update ',
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        subsubspaceName,
        TestUserManager.users.globalAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsAdminResult(
        subsubspaceName,
        TestUserManager.users.spaceAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subsubspaceName,
        TestUserManager.users.globalAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        subsubspaceName,
        TestUserManager.users.spaceAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        subsubspaceName,
        TestUserManager.users.spaceMember.email
      )
    );

    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        subsubspaceName,
        TestUserManager.users.subspaceAdmin.email
      )
    );
    expect(mails[0]).not.toEqual(
      await templatedAsMemberResult(
        subsubspaceName,
        TestUserManager.users.subspaceMember.email
      )
    );

    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subsubspaceName,
        TestUserManager.users.subsubspaceAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templatedAsMemberResult(
        subsubspaceName,
        TestUserManager.users.subsubspaceMember.email
      )
    );
  });

  test('OA create subsubspace update - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    await sendMessageToRoom(
      baseScenario.subsubspace.communication.updatesId,
      'OA subsubspace update 2',
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
