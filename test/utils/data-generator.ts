import { createActorGroup } from '@test/functional-api/integration/actor-groups/actor-groups.request.params';
import { createActor } from '@test/functional-api/integration/actor/actor.request.params';
import { createAspectOnOpportunity } from '@test/functional-api/integration/aspect/aspect.request.params';
import {
  createChallengeMutation,
  challengeNameId,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { createGroupOnCommunity } from '@test/functional-api/integration/community/community.request.params';
import {
  createEcoverseMutation,
  ecoverseName,
  ecoverseNameId,
  ecoverseId,
} from '@test/functional-api/integration/ecoverse/ecoverse.request.params';
import {
  createOpportunity,
  opportunityNameId,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import {
  createOrganization,
  organizationName,
  hostNameId,
} from '@test/functional-api/integration/organization/organization.request.params';
import {
  createProject,
  projectNameId,
} from '@test/functional-api/integration/project/project.request.params';
import { createReferenceOnContext } from '@test/functional-api/integration/references/references.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import {
  createUser,
  getUsers,
} from '@test/functional-api/user-management/user.request.params';
import { createVariablesGetter } from './getters';
import { mutation } from './graphql.request';
import { grantCredentialsMutation } from './mutations/authorization-mutation';
import {
  uniqueId,
  createApplication,
  createApplicationVariablesData,
} from './mutations/create-mutation';
import { TestUser } from './token.helper';

export const dataGenerator = async () => {
  const responseOrgDel = await createOrganization(
    `orgToDelName${uniqueId}`,
    `orgdel${uniqueId}`
  );

  const organizationIdDel = responseOrgDel.body.data.createOrganization.id;
  console.log(responseOrgDel.body);

  const responseOrg = await createOrganization(
    organizationName,
    hostNameId + 'test'
  );

  const organizationId = responseOrg.body.data.createOrganization.id;

  const responseEco = await createEcoverseMutation(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  const ecoverseId = responseEco.body.data.createEcoverse.id;
  const ecoverseCommunityId = responseEco.body.data.createEcoverse.community.id;

  const responseEcoCommunityGroup = await createGroupOnCommunity(
    ecoverseCommunityId,
    'ecoverseCommunityGroupName'
  );
  const ecoverseGroupyId =
    responseEcoCommunityGroup.body.data.createGroupOnCommunity.id;

  const responseCh = await createChallengeMutation(
    'testChallengeName',
    challengeNameId,
    ecoverseId
  );
  const challengeId = responseCh.body.data.createChallenge.id;

  const responseOpp = await createOpportunity(
    challengeId,
    'opportunityName',
    opportunityNameId
  );
  const opportunityId = responseOpp.body.data.createOpportunity.id;
  const contextId = responseOpp.body.data.createOpportunity.context.id;
  const ecosystemModelId =
    responseOpp.body.data.createOpportunity.context.ecosystemModel.id;

  const responseProject = await createProject(
    opportunityId,
    'projectName',
    projectNameId
  );
  const projectId = responseProject.body.data.createProject.id;

  const responseAcorGroup = await createActorGroup(
    ecosystemModelId,
    'actorGroupName'
  );
  const actorGroupId = responseAcorGroup.body.data.createActorGroup.id;

  const responseAcor = await createActor(actorGroupId, 'actorName');
  const actorId = responseAcor.body.data.createActor.id;

  const responseCreateUser = await createUser(`TestUserName${uniqueId}`);
  const userId = responseCreateUser.body.data.createUser.id;
  const userProfileId = responseCreateUser.body.data.createUser.profile.id;

  const responseCreateUserTwo = await createUser(
    `TestUserNameUser2${uniqueId}`
  );
  const userIdTwo = responseCreateUserTwo.body.data.createUser.id;

  let users = await getUsers();
  let usersArray = users.body.data.users;
  function usersData(entity: { nameID: string }) {
    return entity.nameID === 'non_ecoverse';
  }

  const selfUserId = usersArray.find(usersData).id;
  const responseCreateAspect = await createAspectOnOpportunity(
    contextId,
    `aspectTitleB${uniqueId}`
  );
  const aspectId = responseCreateAspect.body.data.createAspect.id;

  const responseCreateRlation = await createRelation(opportunityId, `incoming`);
  const relationId = responseCreateRlation.body.data.createRelation.id;

  const responseCreateReferenceOnContext = await createReferenceOnContext(
    contextId,
    `refNames${uniqueId}`
  );
  const referenceId =
    responseCreateReferenceOnContext.body.data.createReferenceOnContext.id;

  // const responseCreateApplication = await createApplication(
  //   ecoverseCommunityId,
  //   'non_ecoverse'
  // );
  // const applicationId =
  //   responseCreateApplication.body.data.createApplication.id;

  // const responseCreateApplicationAnotherUser = await mutation(
  //   createApplication,
  //   createApplicationVariablesData(ecoverseCommunityId, 'qa_user'),
  //   TestUser.QA_USER
  // );
  // const applicationIdAnotherUser =
  //   responseCreateApplicationAnotherUser.body.data.createApplication.id;

  return {
    userId,
    userIdTwo,
    selfUserId,
    // applicationId,
    // applicationIdAnotherUser,
    userProfileId,
    organizationId,
    organizationIdDel,
    ecoverseId,
    ecoverseCommunityId,
    ecoverseGroupyId,
    challengeId,
    opportunityId,
    contextId,
    ecosystemModelId,
    actorGroupId,
    actorId,
    aspectId,
    relationId,
    referenceId,
    projectId,
  };
};
