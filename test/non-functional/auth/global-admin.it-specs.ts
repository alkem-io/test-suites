import { removeChallangeMutation } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeEcoverseMutation } from '@test/functional-api/integration/ecoverse/ecoverse.request.params';
import { removeOpportunityMutation } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganisationMutation } from '@test/functional-api/integration/organisation/organisation.request.params';
import { removeProjectMutation } from '@test/functional-api/integration/project/project.request.params';
import { removeUserMutation } from '@test/functional-api/user-management/user.request.params';
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
let ecoverseId: string;
let organisationIdDel: string;
let organisationId: string;
let userIdTwo: string;
let userId: string;

let getVariables: (operationName: string) => string;

beforeAll(async done => {
  let DataModel = await dataGenerator();

  getVariables = createVariablesGetter({
    userId: DataModel.userId,
    userIdTwo: DataModel.userIdTwo,
    selfUserId: DataModel.selfUserId,
    applicationId: DataModel.applicationId,
    applicationIdAnotherUser: DataModel.applicationIdAnotherUser,
    userProfileId: DataModel.userProfileId,
    organisationId: DataModel.organisationId,
    organisationIdDel: DataModel.organisationIdDel,
    ecoverseId: DataModel.ecoverseId,
    ecoverseCommunityId: DataModel.ecoverseCommunityId,
    ecoverseGroupyId: DataModel.ecoverseGroupyId,
    challengeId: DataModel.challengeId,
    opportunityId: DataModel.opportunityId,
    contextId: DataModel.contextId,
    ecosystemModelId: DataModel.ecosystemModelId,
    actorGroupId: DataModel.actorGroupId,
    actorId: DataModel.actorId,
    aspectId: DataModel.aspectId,
    relationId: DataModel.relationId,
    referenceId: DataModel.referenceId,
    projectId: DataModel.projectId,
  });
  projectId = DataModel.projectId;
  opportunityId = DataModel.opportunityId;
  challengeId = DataModel.challengeId;
  ecoverseId = DataModel.ecoverseId;
  organisationIdDel = DataModel.organisationIdDel;
  organisationId = DataModel.organisationId;
  userIdTwo = DataModel.userIdTwo;
  userId = DataModel.userId;

  done();
});

afterAll(async done => {
  await removeProjectMutation(projectId);
  await removeOpportunityMutation(opportunityId);
  await removeChallangeMutation(challengeId);
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganisationMutation(organisationIdDel);
  await deleteOrganisationMutation(organisationId);
  await removeUserMutation(userIdTwo);
  await removeUserMutation(userId);
  done();
});

describe.skip('GlobalAdmin - authorization test suite', () => {
  describe('Global Admin - Create Mutation', () => {
    test.each`
      operation                      | expected
      ${'createUser'}                | ${notAuthorizedCode}
      ${'createOrganisation'}        | ${notAuthorizedCode}
      ${'createEcoverse'}            | ${notAuthorizedCode}
      ${'createChallenge'}           | ${notAuthorizedCode}
      ${'createChildChallenge'}      | ${notAuthorizedCode}
      ${'createOpportunity'}         | ${notAuthorizedCode}
      ${'createProject'}             | ${notAuthorizedCode}
      ${'createAspect'}              | ${notAuthorizedCode}
      ${'createActorGroup'}          | ${notAuthorizedCode}
      ${'createActor'}               | ${notAuthorizedCode}
      ${'createGroupOnOrganisation'} | ${notAuthorizedCode}
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
      ${'updateAspect'}       | ${notAuthorizedCode}
      ${'updateChallenge'}    | ${notAuthorizedCode}
      ${'updateOpportunity'}  | ${notAuthorizedCode}
      ${'updateEcoverse'}     | ${notAuthorizedCode}
      ${'updateOrganisation'} | ${notAuthorizedCode}
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
      ${'deleteAspect'}          | ${notAuthorizedCode}
      ${'deleteOpportunity'}     | ${notAuthorizedCode}
      ${'deleteChallenge'}       | ${notAuthorizedCode}
      ${'deleteEcoverse'}        | ${notAuthorizedCode}
      ${'deleteOrganisation'}    | ${notAuthorizedCode}
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
