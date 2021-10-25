import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeEcoverse } from '@test/functional-api/integration/ecoverse/ecoverse.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeProject } from '@test/functional-api/integration/project/project.request.params';
import { removeUser } from '@test/functional-api/user-management/user.request.params';
import { dataGenerator } from '@test/utils/data-generator';
import { createVariablesGetter, getMutation } from '@test/utils/getters';
import {
  grantCredentialsMutation,
  revokeCredentialsMutation,
} from '@test/utils/mutations/authorization-mutation';
import { mutation } from '../../utils/graphql.request';
import { TestUser } from '../../utils/token.helper';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
const forbiddenCode = '"code":"FORBIDDEN"';
const userNotRegistered = 'USER_NOT_REGISTERED';
let projectId: string;
let opportunityId: string;
let challengeId: string;
let ecoverseId: string;
let organizationIdDel: string;
let organizationId: string;
let userIdTwo: string;
let userId: string;

let getVariables: (operationName: string) => string;

beforeAll(async done => {
  let DataModel = await dataGenerator();
  organizationId = DataModel.organizationId;

  await grantCredentialsMutation(
    'non.ecoverse@alkem.io',
    'EcoverseHost',
    organizationId
  );

  getVariables = createVariablesGetter({
    userId: DataModel.userId,
    userIdTwo: DataModel.userIdTwo,
    selfUserId: DataModel.selfUserId,
    applicationId: DataModel.applicationId,
    applicationIdAnotherUser: DataModel.applicationIdAnotherUser,
    userProfileId: DataModel.userProfileId,
    organizationId: DataModel.organizationId,
    organizationIdDel: DataModel.organizationIdDel,
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
  organizationIdDel = DataModel.organizationIdDel;
  organizationId = DataModel.organizationId;
  userIdTwo = DataModel.userIdTwo;
  userId = DataModel.userId;

  done();
});

afterAll(async done => {
  let tests = await revokeCredentialsMutation(
    'non.ecoverse@alkem.io',
    'EcoverseHost',
    organizationId
  );

  await removeProject(projectId);
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationIdDel);
  await deleteOrganization(organizationId);
  await removeUser(userIdTwo);
  await removeUser(userId);
  done();
});
describe.skip('EcoverseHost - authorization test suite', () => {
  describe('EcoverseHost - Create Mutation', () => {
    test.each`
      operation                      | expected
      ${'createUser'}                | ${notAuthorizedCode}
      ${'createOrganization'}        | ${notAuthorizedCode}
      ${'createEcoverse'}            | ${notAuthorizedCode}
      ${'createChallenge'}           | ${notAuthorizedCode}
      ${'createChildChallenge'}      | ${notAuthorizedCode}
      ${'createOpportunity'}         | ${notAuthorizedCode}
      ${'createProject'}             | ${notAuthorizedCode}
      ${'createAspect'}              | ${notAuthorizedCode}
      ${'createActorGroup'}          | ${notAuthorizedCode}
      ${'createActor'}               | ${notAuthorizedCode}
      ${'createGroupOnOrganization'} | ${notAuthorizedCode}
      ${'createGroupOnCommunity'}    | ${notAuthorizedCode}
      ${'createReferenceOnContext'}  | ${notAuthorizedCode}
      ${'createReferenceOnProfile'}  | ${notAuthorizedCode}
      ${'createTagsetOnProfile'}     | ${notAuthorizedCode}
      ${'createRelation'}            | ${notAuthorizedCode}
      ${'createApplication'}         | ${notAuthorizedCode}
      ${'createApplicationSelfUser'} | ${notAuthorizedCode}
    `('$operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.NON_ECOVERSE_MEMBER
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('EcoverseHost - Update Mutation', () => {
    test.each`
      operation               | expected
      ${'updateActor'}        | ${notAuthorizedCode}
      ${'updateAspect'}       | ${notAuthorizedCode}
      ${'updateChallenge'}    | ${notAuthorizedCode}
      ${'updateOpportunity'}  | ${notAuthorizedCode}
      ${'updateEcoverse'}     | ${notAuthorizedCode}
      ${'updateOrganization'} | ${notAuthorizedCode}
      ${'updateProfile'}      | ${notAuthorizedCode}
      ${'updateProject'}      | ${notAuthorizedCode}
      ${'updateUser'}         | ${notAuthorizedCode}
      ${'updateUserSelf'}     | ${notAuthorizedCode}
      ${'updateUserGroup'}    | ${notAuthorizedCode}
    `('$operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.NON_ECOVERSE_MEMBER
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('EcoverseHost - Assign / Remove Mutation', () => {
    test.each`
      operation                    | expected
      ${'assignUserToCommunity'}   | ${notAuthorizedCode}
      ${'removeUserFromCommunity'} | ${notAuthorizedCode}
      ${'assignUserToGroup'}       | ${notAuthorizedCode}
      ${'removeUserFromGroup'}     | ${notAuthorizedCode}
    `('$operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.NON_ECOVERSE_MEMBER
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('EcoverseHost - Event Mutation', () => {
    test.each`
      operation               | expected
      ${'eventOnChallenge'}   | ${notAuthorizedCode}
      ${'eventOnOpportunity'} | ${notAuthorizedCode}
      ${'eventOnProject'}     | ${notAuthorizedCode}
      ${'eventOnApplication'} | ${notAuthorizedCode}
    `('$operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.NON_ECOVERSE_MEMBER
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('EcoverseHost - Grant/Revoke Mutation', () => {
    test.each`
      operation                     | expected
      ${'grantCredentialToUser'}    | ${notAuthorizedCode}
      ${'revokeCredentialFromUser'} | ${notAuthorizedCode}
    `('$operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.NON_ECOVERSE_MEMBER
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });

  describe('EcoverseHost - Delete Mutation', () => {
    test.each`
      operation                             | expected
      ${'deleteActor'}                      | ${notAuthorizedCode}
      ${'deleteActorGroup'}                 | ${notAuthorizedCode}
      ${'deleteUserGroup'}                  | ${notAuthorizedCode}
      ${'deleteUserApplication'}            | ${notAuthorizedCode}
      ${'deleteUserApplicationAnotherUser'} | ${notAuthorizedCode}
      ${'deleteUser'}                       | ${notAuthorizedCode}
      ${'deleteRelation'}                   | ${notAuthorizedCode}
      ${'deleteReference'}                  | ${notAuthorizedCode}
      ${'deleteProject'}                    | ${notAuthorizedCode}
      ${'deleteAspect'}                     | ${notAuthorizedCode}
      ${'deleteOpportunity'}                | ${notAuthorizedCode}
      ${'deleteChallenge'}                  | ${notAuthorizedCode}
      ${'deleteEcoverse'}                   | ${notAuthorizedCode}
      ${'deleteOrganization'}               | ${notAuthorizedCode}
    `('$operation', async ({ operation, expected }) => {
      const response = await mutation(
        getMutation(operation),
        getVariables(operation),
        TestUser.NON_ECOVERSE_MEMBER
      );

      const responseData = JSON.stringify(response.body).replace('\\', '');
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    });
  });
});
