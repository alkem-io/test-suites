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
import {
  createUserMutation,
  getUsers,
} from '@test/functional/user-management/user.request.params';
import { createVariablesGetter, getMutation } from '@test/utils/getters';
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
import { createGroupOnCommunityMut, uniqueId } from '../../utils/mutations/create-mutation';
import { TestUser } from '../../utils/token.helper';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
const forbiddenCode = '"code":"FORBIDDEN"';
const userNotRegistered = 'USER_NOT_REGISTERED';

let getVariables: (operationName: string) => string;

beforeAll(async done => {
  const responseOrg = await createOrganisationMutation(
    organisationName,
    hostNameId + 'test'
  );
  // console.log(responseOrg.body);
  const organisationId = responseOrg.body.data.createOrganisation.id;

  const responseEco = await createEcoverseMutation(
    ecoverseName,
    ecoverseNameId,
    organisationId
  );
  const ecoverseId = responseEco.body.data.createEcoverse.id;
  const ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;

  const responseEcoCommunityGroup = await createGroupOnCommunityMutation(
    ecoverseCommunityId,
    'ecoverseCommunityGroupName'    
  );
  console.log(responseEcoCommunityGroup.body)
  const ecoverseGroupyId = responseEcoCommunityGroup.body.data.createGroupOnCommunity.id;


  const responseCh = await createChallangeMutation(
    'testChallengeName',
    challengeNameId,
    ecoverseId
  );
  // console.log(responseCh.body);
  const challengeId = responseCh.body.data.createChallenge.id;

  const responseOpp = await createOpportunityMutation(
    challengeId,
    'opportunityName',
    opportunityNameId
  );
  //console.log(responseOpp.body);
  const opportunityId = responseOpp.body.data.createOpportunity.id;
  const contextId = responseOpp.body.data.createOpportunity.context.id;
  const ecosystemModelId =
    responseOpp.body.data.createOpportunity.context.ecosystemModel.id;

  const responseProject = await createProjectMutation(
    opportunityId,
    'projectName',
    projectNameId
  );
  //console.log(responseProject.body);
  const projectId = responseProject.body.data.createProject.id;

  const responseAcorGroup = await createActorGroupMutation(
    ecosystemModelId,
    'actorGroupName'
  );
  //console.log(responseProject.body);
  const actorGroupId = responseAcorGroup.body.data.createActorGroup.id;

  const responseAcor = await createActorMutation(actorGroupId, 'actorName');
  //console.log(responseProject.body);
  const actorId = responseAcor.body.data.createActor.id;

  const responseCreateUser = await createUserMutation(
    `TestUserName${uniqueId}`
  );
  //console.log(responseCreateUser.body);
  const userId = responseCreateUser.body.data.createUser.id;
  const userProfileId = responseCreateUser.body.data.createUser.profile.id;

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

  getVariables = createVariablesGetter({
    userId: userId,
    selfUserId: selfUserId,
    userProfileId: userProfileId,
    organisationId: organisationId,
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
    projectId: projectId,
  });

  done();
});

describe.skip('Admin Create Mutation', () => {
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

    console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});

describe('Admin Update Mutation', () => {
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

    console.log(response.body);
    const responseData = JSON.stringify(response.body).replace('\\', '');
    expect(response.status).toBe(200);
    expect(responseData).not.toContain(expected);
    expect(responseData).not.toContain(forbiddenCode);
    expect(responseData).not.toContain(userNotRegistered);
  });
});
