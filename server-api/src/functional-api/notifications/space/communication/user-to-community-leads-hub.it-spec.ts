// /* eslint-disable @typescript-eslint/no-explicit-any */
// import {
//   delay,
//   deleteMailSlurperMails,
//   getMailsData,
//   TestScenarioConfig,
//   TestScenarioFactory,
//   TestUser,
//   TestUserManager,
// } from '@alkemio/tests-lib';
// import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
// import { sendMessageToCommunityLeads } from '@functional-api/communications/communication.params';
// import {
//   removeRoleFromUser,
//   assignRoleToUser,
// } from '@functional-api/roleset/roles-request.params';
// import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
// import { updateUserSettingCommunicationMessage } from '@functional-api/contributor-management/user/user.request.params';
// import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
// import { SpacePrivacyMode } from '@alkemio/client-lib';
// import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

// let usersList: any[] = [];

// const senders = (communityName: string) => {
//   return `You have sent a message to ${communityName} community`;
// };

// const receivers = (senderDisplayName: string) => {
//   return `${senderDisplayName} sent a message to your community`;
// };

// let baseScenario: OrganizationWithSpaceModel;
// const scenarioConfig: TestScenarioConfig = {
//   name: 'messaging-user-to-community-leads-space',
//   space: {
//     community: {
//       admins: [TestUser.SPACE_ADMIN],
//       members: [
//         TestUser.SPACE_MEMBER,
//         TestUser.SPACE_ADMIN,
//         TestUser.SUBSPACE_MEMBER,
//         TestUser.SUBSPACE_ADMIN,
//         TestUser.SUBSUBSPACE_MEMBER,
//         TestUser.SUBSUBSPACE_ADMIN,
//       ],
//       leads: [TestUser.SPACE_ADMIN],
//     },
//   },
// };

// beforeAll(async () => {
//   await deleteMailSlurperMails();

//   baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

//   await removeRoleFromUser(
//     TestUserManager.users.globalAdmin.id,
//     baseScenario.space.community.roleSetId,
//     RoleName.Lead
//   );

//   await assignRoleToUser(
//     TestUserManager.users.spaceAdmin.id,
//     baseScenario.organization.roleSetId,
//     RoleName.Admin
//   );

//   await assignRoleToUser(
//     TestUserManager.users.spaceMember.id,
//     baseScenario.space.community.roleSetId,
//     RoleName.Lead
//   );

//   usersList = [
//     TestUserManager.users.spaceAdmin.id,
//     TestUserManager.users.spaceMember.id,
//   ];
// });

// afterAll(async () => {
//   await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
// });

// describe('Notifications - send messages to Private space hosts', () => {
//   describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)', () => {
//     beforeAll(async () => {
//       for (const userOnList of usersList)
//         await updateUserSettingCommunicationMessage(userOnList.userID, true);

//       await updateSpaceSettings(baseScenario.space.id, {
//         privacy: {
//           mode: SpacePrivacyMode.Private,
//         },
//       });
//     });

//     beforeEach(async () => {
//       await deleteMailSlurperMails();
//     });

//     test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.NON_SPACE_MEMBER
//       );

//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.nonSpaceMember.email],
//           }),
//         ])
//       );
//     });

//     test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.SUBSPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.subspaceMember.email],
//           }),
//         ])
//       );
//     });
//   });

//   describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)', () => {
//     beforeAll(async () => {
//       for (const config of usersList)
//         await changePreferenceUser(config.userID, config.type, 'false');
//     });

//     beforeEach(async () => {
//       await deleteMailSlurperMails();
//     });

//     test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.NON_SPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.nonSpaceMember.email],
//           }),
//         ])
//       );
//     });

//     test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.SUBSPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.subspaceMember.email],
//           }),
//         ])
//       );
//     });
//   });
// });
// describe('Notifications - messages to Public space hosts', () => {
//   beforeAll(async () => {
//     await updateSpaceSettings(baseScenario.space.id, {
//       privacy: {
//         mode: SpacePrivacyMode.Public,
//       },
//     });
//   });
//   describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)', () => {
//     beforeAll(async () => {
//       for (const config of usersList)
//         await changePreferenceUser(config.userID, config.type, 'true');
//     });

//     beforeEach(async () => {
//       await deleteMailSlurperMails();
//     });

//     test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.NON_SPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.nonSpaceMember.email],
//           }),
//         ])
//       );
//     });

//     test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.SUBSPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.subspaceMember.email],
//           }),
//         ])
//       );
//     });
//   });

//   describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)', () => {
//     beforeAll(async () => {
//       for (const config of usersList)
//         await changePreferenceUser(config.userID, config.type, 'false');
//     });

//     beforeEach(async () => {
//       await deleteMailSlurperMails();
//     });

//     test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.NON_SPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.nonSpaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.nonSpaceMember.email],
//           }),
//         ])
//       );
//     });

//     test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
//       // Act
//       await sendMessageToCommunityLeads(
//         baseScenario.space.community.id,
//         'Test message',
//         TestUser.SUBSPACE_MEMBER
//       );
//       await delay(3000);

//       const getEmailsData = await getMailsData();

//       // Assert
//       expect(getEmailsData[1]).toEqual(3);
//       expect(getEmailsData[0]).toEqual(
//         expect.arrayContaining([
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceAdmin.email],
//           }),
//           expect.objectContaining({
//             subject: receivers(
//               TestUserManager.users.subspaceMember.displayName
//             ),
//             toAddresses: [TestUserManager.users.spaceMember.email],
//           }),
//           expect.objectContaining({
//             subject: senders(baseScenario.space.about.profile.displayName),
//             toAddresses: [TestUserManager.users.subspaceMember.email],
//           }),
//         ])
//       );
//     });
//   });
// });

// describe('Notifications - messages to Public space NO hosts', () => {
//   beforeAll(async () => {
//     await updateSpaceSettings(baseScenario.space.id, {
//       privacy: {
//         mode: SpacePrivacyMode.Public,
//       },
//     });

//     await removeRoleFromUser(
//       TestUserManager.users.spaceAdmin.id,
//       baseScenario.space.community.roleSetId,
//       RoleName.Lead
//     );
//     await removeRoleFromUser(
//       TestUserManager.users.spaceMember.id,
//       baseScenario.space.community.roleSetId,
//       RoleName.Lead
//     );
//   });

//   beforeEach(async () => {
//     await deleteMailSlurperMails();
//   });

//   test('NOT space member sends message to Space community (0 hosts) - 1 messages sent', async () => {
//     // Act
//     await sendMessageToCommunityLeads(
//       baseScenario.space.community.id,
//       'Test message',
//       TestUser.NON_SPACE_MEMBER
//     );
//     await delay(3000);

//     const getEmailsData = await getMailsData();

//     // Assert
//     expect(getEmailsData[1]).toEqual(1);
//     expect(getEmailsData[0]).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           subject: senders(baseScenario.space.about.profile.displayName),
//           toAddresses: [TestUserManager.users.nonSpaceMember.email],
//         }),
//       ])
//     );
//   });

//   test('Space member send message to Space community (0 hosts) - 1 messages sent', async () => {
//     // Act
//     await sendMessageToCommunityLeads(
//       baseScenario.space.community.id,
//       'Test message',
//       TestUser.QA_USER
//     );
//     await delay(3000);

//     const getEmailsData = await getMailsData();

//     // Assert
//     expect(getEmailsData[1]).toEqual(1);
//     expect(getEmailsData[0]).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           subject: await senders(baseScenario.space.about.profile.displayName),
//           toAddresses: [TestUserManager.users.qaUser.email],
//         }),
//       ])
//     );
//   });
// });
