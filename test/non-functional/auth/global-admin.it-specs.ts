import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeProject } from '@test/functional-api/integration/project/project.request.params';
import { removeUser } from '@test/functional-api/user-management/user.request.params';
import { dataGenerator } from '@test/utils/data-generator';
import { createVariablesGetter, getMutation } from '@test/utils/getters';
import { mutation } from '../../utils/graphql.request';
import { TestUser } from '../../utils/token.helper';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
const forbiddenCode = '"code":"FORBIDDEN"';
const userNotRegistered = 'USER_NOT_REGISTERED';
let projectId: string;
let opportunityId: string;
let challengeId: string;
let hubId: string;
let organizationIdDel: string;
let organizationId: string;
let userIdTwo: string;
let userId: string;

let getVariables: (operationName: string) => string;

beforeAll(async done => {
  const DataModel = await dataGenerator();

  getVariables = createVariablesGetter({
    userId: DataModel.userId,
    userIdTwo: DataModel.userIdTwo,
    selfUserId: DataModel.selfUserId,
    applicationId: DataModel.applicationId,
    applicationIdAnotherUser: DataModel.applicationIdAnotherUser,
    userProfileId: DataModel.userProfileId,
    organizationId: DataModel.organizationId,
    organizationIdDel: DataModel.organizationIdDel,
    hubId: DataModel.hubId,
    hubCommunityId: DataModel.hubCommunityId,
    hubGroupyId: DataModel.hubGroupyId,
    challengeId: DataModel.challengeId,
    opportunityId: DataModel.opportunityId,
    contextId: DataModel.contextId,
    ecosystemModelId: DataModel.ecosystemModelId,
    actorGroupId: DataModel.actorGroupId,
    actorId: DataModel.actorId,
    postId: DataModel.postId,
    relationId: DataModel.relationId,
    referenceId: DataModel.referenceId,
    projectId: DataModel.projectId,
  });
  projectId = DataModel.projectId;
  opportunityId = DataModel.opportunityId;
  challengeId = DataModel.challengeId;
  hubId = DataModel.hubId;
  organizationIdDel = DataModel.organizationIdDel;
  organizationId = DataModel.organizationId;
  userIdTwo = DataModel.userIdTwo;
  userId = DataModel.userId;

  done();
});

afterAll(async done => {
  await removeProject(projectId);
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
  await removeHub(hubId);
  await deleteOrganization(organizationIdDel);
  await deleteOrganization(organizationId);
  await removeUser(userIdTwo);
  await removeUser(userId);
  done();
});

describe.skip('GlobalAdmin - authorization test suite', () => {
  describe('Global Admin - Create Mutation', () => {
    test.each`
      operation                      | expected
      ${'createUser'}                | ${notAuthorizedCode}
      ${'createOrganization'}        | ${notAuthorizedCode}
      ${'createHub'}                 | ${notAuthorizedCode}
      ${'createChallenge'}           | ${notAuthorizedCode}
      ${'createChildChallenge'}      | ${notAuthorizedCode}
      ${'createOpportunity'}         | ${notAuthorizedCode}
      ${'createProject'}             | ${notAuthorizedCode}
      ${'createPost'}                | ${notAuthorizedCode}
      ${'createActorGroup'}          | ${notAuthorizedCode}
      ${'createActor'}               | ${notAuthorizedCode}
      ${'createGroupOnOrganization'} | ${notAuthorizedCode}
      ${'createGroupOnCommunity'}    | ${notAuthorizedCode}
      ${'createReferenceOnContext'}  | ${notAuthorizedCode}
      ${'createReferenceOnProfile'}  | ${notAuthorizedCode}
      ${'createTagsetOnProfile'}     | ${notAuthorizedCode}
      ${'createRelation'}            | ${notAuthorizedCode}
      ${'createApplication'}         | ${notAuthorizedCode}
    `('global admin: $operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.GLOBAL_ADMIN
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('Global Admin - Update Mutation', () => {
    test.each`
      operation               | expected
      ${'updateActor'}        | ${notAuthorizedCode}
      ${'updatePost'}         | ${notAuthorizedCode}
      ${'updateChallenge'}    | ${notAuthorizedCode}
      ${'updateOpportunity'}  | ${notAuthorizedCode}
      ${'updateHub'}          | ${notAuthorizedCode}
      ${'updateOrganization'} | ${notAuthorizedCode}
      ${'updateProfile'}      | ${notAuthorizedCode}
      ${'updateProject'}      | ${notAuthorizedCode}
      ${'updateUser'}         | ${notAuthorizedCode}
      ${'updateUserSelf'}     | ${notAuthorizedCode}
      ${'updateUserGroup'}    | ${notAuthorizedCode}
    `('global admin: $operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.GLOBAL_ADMIN
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('Global Admin - Assign / Remove Mutation', () => {
    test.each`
      operation                    | expected
      ${'assignUserToCommunity'}   | ${notAuthorizedCode}
      ${'removeUserFromCommunity'} | ${notAuthorizedCode}
      ${'assignUserToGroup'}       | ${notAuthorizedCode}
      ${'removeUserFromGroup'}     | ${notAuthorizedCode}
    `('global admin: $operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.GLOBAL_ADMIN
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('Global Admin - Event Mutation', () => {
    test.each`
      operation               | expected
      ${'eventOnChallenge'}   | ${notAuthorizedCode}
      ${'eventOnOpportunity'} | ${notAuthorizedCode}
      ${'eventOnProject'}     | ${notAuthorizedCode}
      ${'eventOnApplication'} | ${notAuthorizedCode}
    `('global admin: $operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.GLOBAL_ADMIN
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('Global Admin - Grant/Revoke Mutation', () => {
    test.each`
      operation                     | expected
      ${'grantCredentialToUser'}    | ${notAuthorizedCode}
      ${'revokeCredentialFromUser'} | ${notAuthorizedCode}
    `('global admin: $operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.GLOBAL_ADMIN
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('Global Admin - Delete Mutation', () => {
    test.each`
      operation                  | expected
      ${'deleteActor'}           | ${notAuthorizedCode}
      ${'deleteActorGroup'}      | ${notAuthorizedCode}
      ${'deleteUserGroup'}       | ${notAuthorizedCode}
      ${'deleteUserApplication'} | ${notAuthorizedCode}
      ${'deleteUser'}            | ${notAuthorizedCode}
      ${'deleteRelation'}        | ${notAuthorizedCode}
      ${'deleteReference'}       | ${notAuthorizedCode}
      ${'deleteProject'}         | ${notAuthorizedCode}
      ${'deletePost'}            | ${notAuthorizedCode}
      ${'deleteOpportunity'}     | ${notAuthorizedCode}
      ${'deleteChallenge'}       | ${notAuthorizedCode}
      ${'deleteHub'}             | ${notAuthorizedCode}
      ${'deleteOrganization'}    | ${notAuthorizedCode}
    `('global admin: $operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.GLOBAL_ADMIN
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });
});
