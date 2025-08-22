// /* eslint-disable @typescript-eslint/no-explicit-any */
// import {
//   deleteMailSlurperMails,
//   getMailsData,
//   TestScenarioConfig,
//   TestScenarioFactory,
//   TestUser,
//   TestUserManager,
// } from '@alkemio/tests-lib';
// import '@utils/array.matcher';
// import { delay } from '@alkemio/tests-lib';
// import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
// import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
// import { changePreferenceUser } from '@functional-api/contributor-management/user/user.request.params';
// import { sendMessageToRoom } from '../../communications/communication.params';

// export let preferencesDiscussionCommentCreatedConfig: any[] = [];

// const expectedDataSpace = async (toAddresses: any[]) => {
//   return expect.arrayContaining([
//     expect.objectContaining({
//       subject: `${baseScenario.space.about.profile.displayName} - New comment received on Callout \u0026#34;discussion-comments-notification - post\u0026#34;, have a look!`,
//       toAddresses,
//     }),
//   ]);
// };

// const expectedDataChal = async (toAddresses: any[]) => {
//   return expect.arrayContaining([
//     expect.objectContaining({
//       subject: `${baseScenario.subspace.about.profile.displayName} - New comment received on Callout \u0026#34;discussion-comments-notification - post\u0026#34;, have a look!`,
//       toAddresses,
//     }),
//   ]);
// };

// const expectedDataOpp = async (toAddresses: any[]) => {
//   return expect.arrayContaining([
//     expect.objectContaining({
//       subject: `${baseScenario.subsubspace.about.profile.displayName} - New comment received on Callout \u0026#34;discussion-comments-notification - post\u0026#34;, have a look!`,
//       toAddresses,
//     }),
//   ]);
// };

// let baseScenario: OrganizationWithSpaceModel;
// const scenarioConfig: TestScenarioConfig = {
//   name: 'discussion-comments-notification',
//   space: {
//     collaboration: {
//       addPostCallout: true,
//       addPostCollectionCallout: true,
//       addWhiteboardCallout: true,
//       addTutorialCallouts: false,
//     },
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
//     },
//     subspace: {
//       collaboration: {
//         addPostCallout: true,
//         addPostCollectionCallout: true,
//         addWhiteboardCallout: true,
//         addTutorialCallouts: false,
//       },
//       community: {
//         admins: [TestUser.SUBSPACE_ADMIN],
//         members: [
//           TestUser.SUBSPACE_MEMBER,
//           TestUser.SUBSPACE_ADMIN,
//           TestUser.SUBSUBSPACE_MEMBER,
//           TestUser.SUBSUBSPACE_ADMIN,
//         ],
//       },
//       subspace: {
//         collaboration: {
//           addPostCallout: true,
//           addPostCollectionCallout: true,
//           addWhiteboardCallout: true,
//           addTutorialCallouts: false,
//         },
//         community: {
//           admins: [TestUser.SUBSUBSPACE_ADMIN],
//           members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
//         },
//       },
//     },
//   },
// };

// beforeAll(async () => {
//   await deleteMailSlurperMails();

//   baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

//   preferencesDiscussionCommentCreatedConfig = [
//     {
//       userID: TestUserManager.users.globalAdmin.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },

//     {
//       userID: TestUserManager.users.spaceMember.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },

//     {
//       userID: TestUserManager.users.subspaceMember.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },

//     {
//       userID: TestUserManager.users.subsubspaceMember.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },

//     {
//       userID: TestUserManager.users.spaceAdmin.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },

//     {
//       userID: TestUserManager.users.spaceAdmin.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },

//     {
//       userID: TestUserManager.users.subspaceAdmin.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },

//     {
//       userID: TestUserManager.users.subsubspaceAdmin.id,
//       type: PreferenceType.NotificationDiscussionCommentCreated,
//     },
//   ];
// });

// afterAll(async () => {
//   await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
// });

// describe('Notifications - callout comments', () => {
//   beforeEach(async () => {
//     await deleteMailSlurperMails();
//   });

//   beforeAll(async () => {
//     preferencesDiscussionCommentCreatedConfig.forEach(
//       async config =>
//         await changePreferenceUser(config.userID, config.type, 'true')
//     );
//   });

//   test('GA create space callout comment - HM(7) get notifications', async () => {
//     // Act
//     await sendMessageToRoom(
//       baseScenario.space.collaboration.calloutPostCommentsId,
//       'comment on discussion callout',
//       TestUser.GLOBAL_ADMIN
//     );

//     await delay(6000);
//     const mails = await getMailsData();

//     expect(mails[1]).toEqual(7);
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.globalAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.spaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.spaceMember.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subspaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subspaceMember.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subsubspaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subsubspaceMember.email])
//     );
//   });

//   test('HA create space callout comment - HM(7) get notifications', async () => {
//     // Act
//     await sendMessageToRoom(
//       baseScenario.space.collaboration.calloutPostCommentsId,
//       'comment on discussion callout',
//       TestUser.SPACE_ADMIN
//     );

//     await delay(6000);
//     const mails = await getMailsData();

//     expect(mails[1]).toEqual(7);
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.globalAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.spaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.spaceMember.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subspaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subspaceMember.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subsubspaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataSpace([TestUserManager.users.subsubspaceMember.email])
//     );
//   });

//   test('HA create subspace callout comment - HM(5),  get notifications', async () => {
//     // Act
//     await sendMessageToRoom(
//       baseScenario.subspace.collaboration.calloutPostCommentsId,
//       'comment on discussion callout',
//       TestUser.SPACE_ADMIN
//     );

//     await delay(6000);
//     const mails = await getMailsData();

//     expect(mails[1]).toEqual(5);

//     expect(mails[0]).toEqual(
//       await expectedDataChal([TestUserManager.users.globalAdmin.email])
//     );
//     // HA don't get notification as is member only of HUB
//     expect(mails[0]).not.toEqual(
//       await expectedDataChal([TestUserManager.users.spaceAdmin.email])
//     );
//     // Space member does not reacive email

//     expect(mails[0]).not.toEqual(
//       await expectedDataChal([TestUserManager.users.spaceMember.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataChal([TestUserManager.users.subspaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataChal([TestUserManager.users.subspaceMember.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataChal([TestUserManager.users.subsubspaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataChal([TestUserManager.users.subsubspaceMember.email])
//     );
//   });

//   test('OM create subsubspace callout comment - HM(3), get notifications', async () => {
//     // Act
//     await sendMessageToRoom(
//       baseScenario.subsubspace.collaboration.calloutPostCommentsId,
//       'comment on discussion callout',
//       TestUser.SUBSUBSPACE_MEMBER
//     );

//     await delay(6000);
//     const mails = await getMailsData();

//     expect(mails[1]).toEqual(3);
//     expect(mails[0]).toEqual(
//       await expectedDataOpp([TestUserManager.users.globalAdmin.email])
//     );
//     // HA don't get notification as is member only of HUB
//     expect(mails[0]).not.toEqual(
//       await expectedDataOpp([TestUserManager.users.spaceAdmin.email])
//     );
//     // Space member does not reacive email
//     expect(mails[0]).not.toEqual(
//       await expectedDataOpp([TestUserManager.users.spaceMember.email])
//     );
//     // Subspace admin does not reacive email
//     expect(mails[0]).not.toEqual(
//       await expectedDataOpp([TestUserManager.users.subspaceAdmin.email])
//     );
//     // Subspace member does not reacive email
//     expect(mails[0]).not.toEqual(
//       await expectedDataOpp([TestUserManager.users.subspaceMember.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataOpp([TestUserManager.users.subsubspaceAdmin.email])
//     );
//     expect(mails[0]).toEqual(
//       await expectedDataOpp([TestUserManager.users.subsubspaceMember.email])
//     );
//   });

//   test('OA create subsubspace callout comment - 0 notifications - all roles with notifications disabled', async () => {
//     preferencesDiscussionCommentCreatedConfig.forEach(
//       async config =>
//         await changePreferenceUser(config.userID, config.type, 'false')
//     );
//     // Act
//     await sendMessageToRoom(
//       baseScenario.subsubspace.collaboration.calloutPostCommentsId,
//       'comment on discussion callout',
//       TestUser.SUBSUBSPACE_ADMIN
//     );

//     // Assert
//     await delay(1500);
//     const mails = await getMailsData();

//     expect(mails[1]).toEqual(0);
//   });
// });
