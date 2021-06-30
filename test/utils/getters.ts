import {
  assignUserToCommunityMut,
  assignUserToCommunityVariablesData,
  assignUserToGroupMut,
  assignUserToGroupVariablesData,
} from './mutations/assign-mutation';
import {
  grantCredentialToUserMut,
  grantCredentialToUserVariablesData,
  revokeCredentialFromUserMut,
  revokeCredentialFromUserVariablesData,
} from './mutations/authorization-mutation';
import {
  actorGroupVariablesData,
  actorVariablesData,
  aspectVariablesData,
  challengeVariablesData,
  createActorGroupMut,
  createActorMut,
  createApplicationMut,
  createApplicationVariablesData,
  createAspectMut,
  createChallengeMut,
  createChildChallengeMut,
  createEcoverseMut,
  createGroupOnCommunityMut,
  createGroupOnOrganisationMut,
  createOpportunityMut,
  createOrganisationMut,
  createProjectMut,
  createReferenceOnContextMut,
  createReferenceOnContextVariablesData,
  createReferenceOnProfileMut,
  createReferenceOnProfileVariablesData,
  createRelationMut,
  createRelationVariablesData,
  createTagsetOnProfileMut,
  createTagsetOnProfileVariablesData,
  createUserMut,
  createUserVariablesData,
  ecoverseVariablesData,
  groupOncommunityVariablesData,
  groupOnOrganisationVariablesData,
  opportunityVariablesData,
  organisationVariablesData,
  projectVariablesData,
  uniqueId,
} from './mutations/create-mutation';
import {
  deleteActorMut,
  deleteActorGroupMut,
  deleteUserGroupMut,
  deleteUserApplicationMut,
  deleteUserMut,
  deleteRelationMut,
  deleteReferenceMut,
  deleteProjectMut,
  deleteAspectMut,
  deleteOpportunityMut,
  deleteChallengeMut,
  deleteEcoverseMut,
  deleteOrganisationMut,
  deleteVariablesData,
} from './mutations/delete-mutation';
import {
  eventOnApplicationMut,
  eventOnApplicationVariablesData,
  eventOnChallengeMut,
  eventOnChallengeVariablesData,
  eventOnOpportunityMut,
  eventOnOpportunityVariablesData,
  eventOnProjectMut,
  eventOnProjectVariablesData,
} from './mutations/event-mutation';
import {
  removeUserFromCommunityMut,
  removeUserFromCommunityVariablesData,
  removeUserFromGroupMut,
  removeUserFromGroupVariablesData,
} from './mutations/remove-mutation';
import {
  updateActorMut,
  updateActorVariablesData,
  updateAspectMut,
  updateAspectVariablesData,
  updateChallengeMut,
  updateChallengeVariablesData,
  updateEcoverseMut,
  updateEcoverseVariablesData,
  updateOpportunityMut,
  updateOpportunityVariablesData,
  updateOrganisationMut,
  updateOrganisationVariablesData,
  updateProfileMut,
  updateProfileVariablesData,
  updateProjectMut,
  updateProjectVariablesData,
  updateUserGroupMut,
  updateUserGroupVariablesData,
  updateUserMut,
  updateUserVariablesData,
} from './mutations/update-mutation';

export const createVariablesGetter = (parameters: Record<string, string>) => {

  return (operationName: string) => {
    switch (operationName) {
      case 'createUser':
        return createUserVariablesData(`userName${uniqueId}`);

      case 'createOrganisation':
        return organisationVariablesData(
          `orgName${uniqueId}`,
          `orgNameId${uniqueId}`
        );
      case 'createEcoverse':
        return ecoverseVariablesData(
          `ecoName${uniqueId}`,
          `ecoNameId${uniqueId}`,
          parameters['organisationId']
        );
      case 'createChallenge':
        return challengeVariablesData(
          `chName${uniqueId}`,
          `chNameId${uniqueId}`,
          parameters['ecoverseId']
        );
      case 'createChildChallenge':
        return challengeVariablesData(
          `chChName${uniqueId}`,
          `chChNameId${uniqueId}`,
          parameters['challengeId']
        );
      case 'createOpportunity':
        return opportunityVariablesData(
          `oppName${uniqueId}`,
          `oppNameId${uniqueId}`,
          parameters['challengeId']
        );
      case 'createProject':
        return projectVariablesData(
          parameters['opportunityId'],
          `projectName${uniqueId}`,
          `projNameId${uniqueId}`
        );
      case 'createAspect':
        return aspectVariablesData(
          parameters['contextId'],
          `aspectTitle${uniqueId}`,
          `aspectFraming${uniqueId}`
        );
      case 'createActorGroup':
        return actorGroupVariablesData(
          parameters['ecosystemModelId'],
          `actorGroupName${uniqueId}`
        );
      case 'createActor':
        return actorVariablesData(
          parameters['actorGroupId'],
          `actorName${uniqueId}`,
          `actorDescritpion${uniqueId}`,
          `actorValue${uniqueId}`,
          `actorImpact${uniqueId}`
        );
      case 'createGroupOnOrganisation':
        return groupOnOrganisationVariablesData(
          `groupName${uniqueId}`,
          parameters['organisationId']
        );

      case 'createGroupOnCommunity':
        return groupOncommunityVariablesData(
          parameters['ecoverseCommunityId'],
          `groupName${uniqueId}`
        );

      case 'createReferenceOnContext':
        return createReferenceOnContextVariablesData(
          parameters['contextId'],
          `refName${uniqueId}`,
          `refUri${uniqueId}`,
          `refDescription${uniqueId}`
        );

      case 'createReferenceOnProfile':
        return createReferenceOnProfileVariablesData(
          parameters['userProfileId'],
          `refNameP${uniqueId}`,
          `refUriP${uniqueId}`,
          `refDescriptionP${uniqueId}`
        );

      case 'createRelation':
        return createRelationVariablesData(
          parameters['opportunityId'],
          `incoming`,
          `relationDescription`,
          `relationActorName`
        );

      case 'createTagsetOnProfile':
        return createTagsetOnProfileVariablesData(parameters['userProfileId']);

      case 'createApplication':
        return createApplicationVariablesData(
          parameters['ecoverseCommunityId'],
          parameters['userId']
        );

      case 'updateActor':
        return updateActorVariablesData(
          parameters['actorId'],
          `actorNameUpdate${uniqueId}`,
          `actorDescritpionUpdate${uniqueId}`,
          `actorValueUpdate${uniqueId}`,
          `actorImpactUpdate${uniqueId}`
        );

      case 'updateAspect':
        return updateAspectVariablesData(
          parameters['aspectId'],
          `aspectTitleUpdate${uniqueId}`,
          `aspectFramingUpdate${uniqueId}`
        );

      case 'updateChallenge':
        return updateChallengeVariablesData(
          parameters['challengeId'],
          `chNameUpdate${uniqueId}`
        );

      case 'updateOpportunity':
        return updateOpportunityVariablesData(
          parameters['opportunityId'],
          `opportunityNameUpdate${uniqueId}`
        );

      case 'updateEcoverse':
        return updateEcoverseVariablesData(
          parameters['ecoverseId'],
          `ecoverseNameUpdate${uniqueId}`
        );

      case 'updateOrganisation':
        return updateOrganisationVariablesData(
          parameters['organisationId'],
          `organisationNameUpdate${uniqueId}`
        );

      case 'updateProject':
        return updateProjectVariablesData(
          parameters['projectId'],
          `projectDescritpionUpdate${uniqueId}`
        );

      case 'updateProfile':
        return updateProfileVariablesData(
          parameters['userProfileId'],
          `profileDescritpionUpdate${uniqueId}`
        );

      case 'updateUser':
        return updateUserVariablesData(
          parameters['userId'],
          `userPhoneUpdate${uniqueId}`
        );

      case 'updateUserSelf':
        return updateUserVariablesData(
          parameters['selfUserId'],
          `userPhoneUpdateSelf${uniqueId}`
        );

      case 'updateUserGroup':
        return updateUserGroupVariablesData(
          parameters['ecoverseGroupyId'],
          `ecoverseGroupUpdate${uniqueId}`
        );

      case 'assignUserToCommunity':
        return assignUserToCommunityVariablesData(
          parameters['ecoverseCommunityId'],
          parameters['userId']
        );

      case 'removeUserFromCommunity':
        return removeUserFromCommunityVariablesData(
          parameters['ecoverseCommunityId'],
          parameters['userId']
        );

      case 'assignUserToGroup':
        return assignUserToGroupVariablesData(
          parameters['ecoverseGroupyId'],
          parameters['userId']
        );

      case 'removeUserFromGroup':
        return removeUserFromGroupVariablesData(
          parameters['ecoverseGroupyId'],
          parameters['userId']
        );

      case 'eventOnChallenge':
        return eventOnChallengeVariablesData(
          parameters['challengeId'],
          'REFINE'
        );
      case 'eventOnOpportunity':
        return eventOnOpportunityVariablesData(
          parameters['opportunityId'],
          'REFINE'
        );
      case 'eventOnProject':
        return eventOnProjectVariablesData(parameters['projectId'], 'REFINE');
      case 'eventOnApplication':
        return eventOnApplicationVariablesData(
          parameters['applicationId'],
          'REJECT'
        );

      case 'grantCredentialToUser':
        return grantCredentialToUserVariablesData(
          'non.ecoverse@cherrytwist.org',
          parameters['ecoverseId'],
          'EcoverseMember'
        );

      case 'revokeCredentialFromUser':
        return revokeCredentialFromUserVariablesData(
          'non.ecoverse@cherrytwist.org',
          parameters['ecoverseId'],
          'EcoverseMember'
        );

      case 'deleteActor':
        return deleteVariablesData(parameters['actorId']);

      case 'deleteActorGroup':
        return deleteVariablesData(parameters['actorGroupId']);

      case 'deleteUserGroup':
        return deleteVariablesData(parameters['ecoverseGroupyId']);

      case 'deleteUserApplication':
        return deleteVariablesData(parameters['applicationId']);

      case 'deleteUser':
        return deleteVariablesData(parameters['userId']);

      case 'deleteRelation':
        return deleteVariablesData(parameters['relationId']);

      case 'deleteReference':
        return deleteVariablesData(parameters['referenceId']);

      case 'deleteProject':
        return deleteVariablesData(parameters['projectId']);

      case 'deleteAspect':
        return deleteVariablesData(parameters['aspectId']);

      case 'deleteOpportunity':
        return deleteVariablesData(parameters['opportunityId']);

      case 'deleteChallenge':
        return deleteVariablesData(parameters['challengeId']);

      case 'deleteEcoverse':
        return deleteVariablesData(parameters['ecoverseId']);

      case 'deleteOrganisation':
        return deleteVariablesData(parameters['organisationIdDel']);

      default:
        throw new Error(`Operation ${operationName} is not defined!`);
    }
  };
};

export const getMutation = (operationName: string) => {
  switch (operationName) {
    case 'createUser':
      return createUserMut;

    case 'createOrganisation':
      return createOrganisationMut;

    case 'createEcoverse':
      return createEcoverseMut;

    case 'createChallenge':
      return createChallengeMut;

    case 'createChildChallenge':
      return createChildChallengeMut;

    case 'createOpportunity':
      return createOpportunityMut;

    case 'createProject':
      return createProjectMut;

    case 'createAspect':
      return createAspectMut;

    case 'createActorGroup':
      return createActorGroupMut;

    case 'createActor':
      return createActorMut;

    case 'createGroupOnOrganisation':
      return createGroupOnOrganisationMut;

    case 'createGroupOnCommunity':
      return createGroupOnCommunityMut;

    case 'createReferenceOnContext':
      return createReferenceOnContextMut;

    case 'createReferenceOnProfile':
      return createReferenceOnProfileMut;

    case 'createTagsetOnProfile':
      return createTagsetOnProfileMut;

    case 'createRelation':
      return createRelationMut;

    case 'createApplication':
      return createApplicationMut;

    case 'updateActor':
      return updateActorMut;

    case 'updateAspect':
      return updateAspectMut;

    case 'updateChallenge':
      return updateChallengeMut;

    case 'updateOpportunity':
      return updateOpportunityMut;

    case 'updateEcoverse':
      return updateEcoverseMut;

    case 'updateOrganisation':
      return updateOrganisationMut;

    case 'updateProfile':
      return updateProfileMut;

    case 'updateProject':
      return updateProjectMut;

    case 'updateUser':
      return updateUserMut;

    case 'updateUserSelf':
      return updateUserMut;

    case 'updateUserGroup':
      return updateUserGroupMut;

    case 'assignUserToCommunity':
      return assignUserToCommunityMut;

    case 'removeUserFromCommunity':
      return removeUserFromCommunityMut;

    case 'assignUserToGroup':
      return assignUserToGroupMut;

    case 'removeUserFromGroup':
      return removeUserFromGroupMut;

    case 'eventOnChallenge':
      return eventOnChallengeMut;

    case 'eventOnOpportunity':
      return eventOnOpportunityMut;

    case 'eventOnProject':
      return eventOnProjectMut;

    case 'eventOnApplication':
      return eventOnApplicationMut;

    case 'grantCredentialToUser':
      return grantCredentialToUserMut;

    case 'revokeCredentialFromUser':
      return revokeCredentialFromUserMut;

    case 'deleteActor':
      return deleteActorMut;

    case 'deleteActorGroup':
      return deleteActorGroupMut;

    case 'deleteUserGroup':
      return deleteUserGroupMut;

    case 'deleteUserApplication':
      return deleteUserApplicationMut;

    case 'deleteUser':
      return deleteUserMut;

    case 'deleteRelation':
      return deleteRelationMut;

    case 'deleteReference':
      return deleteReferenceMut;

    case 'deleteProject':
      return deleteProjectMut;

    case 'deleteAspect':
      return deleteAspectMut;

    case 'deleteOpportunity':
      return deleteOpportunityMut;

    case 'deleteChallenge':
      return deleteChallengeMut;

    case 'deleteEcoverse':
      return deleteEcoverseMut;

    case 'deleteOrganisation':
      return deleteOrganisationMut;

    default:
      throw new Error(`Operation ${operationName} is not defined!`);
  }
};

const OPERATION_CREATE_ECOVERSE = 'createEcoverse';
