import { createActorGroupMutation } from '@test/functional/integration/actor-groups/actor-groups.request.params';
import { createActorMutation } from '@test/functional/integration/actor/actor.request.params';
import { createAspectOnOpportunityMutation } from '@test/functional/integration/aspect/aspect.request.params';
import { createGroupOnCommunityMutation } from '@test/functional/integration/community/community.request.params';
import {
  createOpportunityMutation,
  opportunityNameId,
} from '@test/functional/integration/opportunity/opportunity.request.params';
import {
  createProjectMutation,
  projectNameId,
} from '@test/functional/integration/project/project.request.params';
import { createReferenceOnContextMutation } from '@test/functional/integration/references/references.request.params';
import { createRelationMutation } from '@test/functional/integration/relations/relations.request.params';
import { createApplicationMutation } from '@test/functional/user-management/application/application.request.params';
import {
  createUserMutation,
  getUsers,
} from '@test/functional/user-management/user.request.params';
import { createVariablesGetter, getMutation } from '@test/utils/getters';
import {
  grantCredentialsMutation,
  revokeCredentialsMutation,
} from '@test/utils/mutations/authorization-mutation';
import {
  challengeNameId,
  createChallangeMutation,
} from '../../functional/integration/challenge/challenge.request.params';
import {
  createEcoverseMutation,
  ecoverseName,
  ecoverseNameId,
} from '../../functional/integration/ecoverse/ecoverse.request.params';
import {
  createOrganisationMutation,
  organisationName,
  hostNameId,
} from '../../functional/integration/organisation/organisation.request.params';
import { mutation } from '../../utils/graphql.request';
import {
  createGroupOnCommunityMut,
  uniqueId,
} from '../../utils/mutations/create-mutation';
import { TestUser } from '../../utils/token.helper';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
const forbiddenCode = '"code":"FORBIDDEN"';
const userNotRegistered = 'USER_NOT_REGISTERED';
let ecoverseId: string;

let getVariables: (operationName: string) => string;

beforeAll(async done => {
  const responseOrgDel = await createOrganisationMutation(
    'orgToDelName',
    `orgdel${uniqueId}`
  );
  const organisationIdDel = responseOrgDel.body.data.createOrganisation.id;

  const responseOrg = await createOrganisationMutation(
    organisationName,
    hostNameId + 'test'
  );
  const organisationId = responseOrg.body.data.createOrganisation.id;

  const responseEco = await createEcoverseMutation(
    ecoverseName,
    ecoverseNameId,
    organisationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
  const ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;

  const responseEcoCommunityGroup = await createGroupOnCommunityMutation(
    ecoverseCommunityId,
    'ecoverseCommunityGroupName'
  );
  const ecoverseGroupyId =
    responseEcoCommunityGroup.body.data.createGroupOnCommunity.id;

  const responseCh = await createChallangeMutation(
    'testChallengeName',
    challengeNameId,
    ecoverseId
  );
  const challengeId = responseCh.body.data.createChallenge.id;

  const responseOpp = await createOpportunityMutation(
    challengeId,
    'opportunityName',
    opportunityNameId
  );
  const opportunityId = responseOpp.body.data.createOpportunity.id;
  const contextId = responseOpp.body.data.createOpportunity.context.id;
  const ecosystemModelId =
    responseOpp.body.data.createOpportunity.context.ecosystemModel.id;

  const responseProject = await createProjectMutation(
    opportunityId,
    'projectName',
    projectNameId
  );
  const projectId = responseProject.body.data.createProject.id;

  const responseAcorGroup = await createActorGroupMutation(
    ecosystemModelId,
    'actorGroupName'
  );
  const actorGroupId = responseAcorGroup.body.data.createActorGroup.id;

  const responseAcor = await createActorMutation(actorGroupId, 'actorName');
  const actorId = responseAcor.body.data.createActor.id;

  const responseCreateUser = await createUserMutation(
    `TestUserName${uniqueId}`
  );
  const userId = responseCreateUser.body.data.createUser.id;
  const userProfileId = responseCreateUser.body.data.createUser.profile.id;

  const responseCreateUserTwo = await createUserMutation(
    `TestUserNameUser2${uniqueId}`
  );
  const userIdTwo = responseCreateUserTwo.body.data.createUser.id;

  let users = await getUsers();
  let usersArray = users.body.data.users;
  function usersData(entity: { nameID: string }) {
    return entity.nameID === 'admin_cherrytwist';
  }

  const selfUserId = usersArray.find(usersData).id;
  const responseCreateAspect = await createAspectOnOpportunityMutation(
    contextId,
    `aspectTitleB${uniqueId}`
  );
  const aspectId = responseCreateAspect.body.data.createAspect.id;

  const responseCreateRlation = await createRelationMutation(
    opportunityId,
    `incoming`
  );
  const relationId = responseCreateRlation.body.data.createRelation.id;

  const responseCreateReferenceOnContext = await createReferenceOnContextMutation(
    contextId,
    `refNames${uniqueId}`
  );
  const referenceId =
    responseCreateReferenceOnContext.body.data.createReferenceOnContext.id;

  const responseCreateApplication = await createApplicationMutation(
    ecoverseCommunityId,
    'non_ecoverse'
  );
  const applicationId =
    responseCreateApplication.body.data.createApplication.id;

  let tests = await grantCredentialsMutation(
    'non.ecoverse@cherrytwist.org',
    'EcoverseAdmin',
    ecoverseId
  );
  console.log(tests.body);
  getVariables = createVariablesGetter({
    userId: userId,
    userIdTwo: userIdTwo,
    selfUserId: selfUserId,
    applicationId: applicationId,
    userProfileId: userProfileId,
    organisationId: organisationId,
    organisationIdDel: organisationIdDel,
    ecoverseId: ecoverseId,
    ecoverseCommunityId: ecoverseCommunityId,
    ecoverseGroupyId: ecoverseGroupyId,
    challengeId: challengeId,
    opportunityId: opportunityId,
    contextId: contextId,
    ecosystemModelId: ecosystemModelId,
    actorGroupId: actorGroupId,
    actorId: actorId,
    aspectId: aspectId,
    relationId: relationId,
    referenceId: referenceId,
    projectId: projectId,
  });

  done();
});

afterAll(async () => {
  let tests = await revokeCredentialsMutation(
    'non.ecoverse@cherrytwist.org',
    'EcoverseAdmin',
    ecoverseId
  );
  console.log(tests.body);
});

describe('EcoverseAdmin - Create Mutation', () => {
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
  `('EcoverseAdmin: $operation', async ({ operation, expected }) => {
    const response = await mutation(
      getMutation(operation),
      getVariables(operation),
      TestUser.NON_ECOVERSE_MEMBER
    );

    //console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});

describe('EcoverseAdmin - Update Mutation', () => {
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
  `('EcoverseAdmin: $operation', async ({ operation, expected }) => {
    const response = await mutation(
      getMutation(operation),
      getVariables(operation),
      TestUser.NON_ECOVERSE_MEMBER
    );

    //console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});

describe('EcoverseAdmin - Assign / Remove Mutation', () => {
  test.each`
    operation                    | expected
    ${'assignUserToCommunity'}   | ${notAuthorizedCode}
    ${'removeUserFromCommunity'} | ${notAuthorizedCode}
    ${'assignUserToGroup'}       | ${notAuthorizedCode}
    ${'removeUserFromGroup'}     | ${notAuthorizedCode}
  `('EcoverseAdmin: $operation', async ({ operation, expected }) => {
    const response = await mutation(
      getMutation(operation),
      getVariables(operation),
      TestUser.NON_ECOVERSE_MEMBER
    );

    //console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});

describe('EcoverseAdmin - Event Mutation', () => {
  test.each`
    operation               | expected
    ${'eventOnChallenge'}   | ${notAuthorizedCode}
    ${'eventOnOpportunity'} | ${notAuthorizedCode}
    ${'eventOnProject'}     | ${notAuthorizedCode}
    ${'eventOnApplication'} | ${notAuthorizedCode}
  `('EcoverseAdmin: $operation', async ({ operation, expected }) => {
    const response = await mutation(
      getMutation(operation),
      getVariables(operation),
      TestUser.NON_ECOVERSE_MEMBER
    );

    // console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});

describe('EcoverseAdmin - Grant/Revoke Mutation', () => {
  test.each`
    operation                     | expected
    ${'grantCredentialToUser'}    | ${notAuthorizedCode}
    ${'revokeCredentialFromUser'} | ${notAuthorizedCode}
  `('EcoverseAdmin: $operation', async ({ operation, expected }) => {
    const response = await mutation(
      getMutation(operation),
      getVariables(operation),
      TestUser.NON_ECOVERSE_MEMBER
    );

    // console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});

describe('EcoverseAdmin - Delete Mutation', () => {
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
  `('EcoverseAdmin: $operation', async ({ operation, expected }) => {
    const response = await mutation(
      getMutation(operation),
      getVariables(operation),
      TestUser.NON_ECOVERSE_MEMBER
    );

    // console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});
