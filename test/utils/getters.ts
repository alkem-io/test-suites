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
  // const uniqueId = parameters['uniqueId'];

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

    default:
      throw new Error(`Operation ${operationName} is not defined!`);
  }
};

const OPERATION_CREATE_ECOVERSE = 'createEcoverse';
