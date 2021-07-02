import { createActorGroupMutation } from '@test/functional/integration/actor-groups/actor-groups.request.params';
import { createActorMutation } from '@test/functional/integration/actor/actor.request.params';
import { createAspectOnOpportunityMutation } from '@test/functional/integration/aspect/aspect.request.params';
import {
  createChallangeMutation,
  challengeNameId,
} from '@test/functional/integration/challenge/challenge.request.params';
import { createGroupOnCommunityMutation } from '@test/functional/integration/community/community.request.params';
import {
  createEcoverseMutation,
  ecoverseName,
  ecoverseNameId,
  ecoverseId,
} from '@test/functional/integration/ecoverse/ecoverse.request.params';
import {
  createOpportunityMutation,
  opportunityNameId,
} from '@test/functional/integration/opportunity/opportunity.request.params';
import {
  createOrganisationMutation,
  organisationName,
  hostNameId,
} from '@test/functional/integration/organisation/organisation.request.params';
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
import { createVariablesGetter } from './getters';
import { mutation } from './graphql.request';
import { grantCredentialsMutation } from './mutations/authorization-mutation';
import {
  uniqueId,
  createApplicationMut,
  createApplicationVariablesData,
} from './mutations/create-mutation';
import { TestUser } from './token.helper';

export const dataGenerator = async () => {
  const responseOrgDel = await createOrganisationMutation(
    'orgToDelName',
    `orgdel${uniqueId}`
  );
  console.log(responseOrgDel.body);
  const organisationIdDel = responseOrgDel.body.data.createOrganisation.id;

  const responseOrg = await createOrganisationMutation(
    organisationName,
    hostNameId + 'test'
  );
  console.log(responseOrg.body);
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
    return entity.nameID === 'non_ecoverse';
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

  const responseCreateApplicationAnotherUser = await mutation(
    createApplicationMut,
    createApplicationVariablesData(ecoverseCommunityId, 'QA_User'),
    TestUser.QA_USER
  );
  const applicationIdAnotherUser =
    responseCreateApplicationAnotherUser.body.data.createApplication.id;

  return {
    userId,
    userIdTwo,
    selfUserId,
    applicationId,
    applicationIdAnotherUser,
    userProfileId,
    organisationId,
    organisationIdDel,
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
