import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
  assignUserToGroup,
  assignUserToGroupVariablesData,
} from './mutations/assign-mutation';
import {
  grantCredentialToUser,
  grantCredentialToUserVariablesData,
  revokeCredentialFromUser,
  revokeCredentialFromUserVariablesData,
} from './mutations/authorization-mutation';
import {
  actorGroupVariablesData,
  actorVariablesData,
  aspectVariablesData,
  challengeVariablesData,
  createActorGroup,
  createActor,
  createApplication,
  createApplicationVariablesData,
  createAspect,
  createChallenge,
  createChildChallenge,
  createHub,
  createGroupOnCommunity,
  createGroupOnOrganization,
  createOpportunity,
  createOrganization,
  createProject,
  createReferenceOnContext,
  createReferenceOnContextVariablesData,
  createReferenceOnProfile,
  createReferenceOnProfileVariablesData,
  createRelation,
  createRelationVariablesData,
  createTagsetOnProfile,
  createTagsetOnProfileVariablesData,
  createUser,
  createUserVariablesData,
  hubVariablesData,
  groupOncommunityVariablesData,
  groupOnOrganizationVariablesData,
  opportunityVariablesData,
  organizationVariablesData,
  projectVariablesData,
  uniqueId,
} from './mutations/create-mutation';
import {
  deleteActor,
  deleteActorGroup,
  deleteUserGroup,
  deleteUserApplication,
  deleteUser,
  deleteRelation,
  deleteReference,
  deleteProject,
  deleteAspect,
  deleteOpportunity,
  deleteChallenge,
  deleteHub,
  deleteOrganization,
  deleteVariablesData,
} from './mutations/delete-mutation';
import {
  eventOnApplication,
  eventOnApplicationVariablesData,
  eventOnChallenge,
  eventOnChallengeVariablesData,
  eventOnOpportunity,
  eventOnOpportunityVariablesData,
  eventOnProject,
  eventOnProjectVariablesData,
} from './mutations/event-mutation';
import {
  removeUserFromCommunity,
  removeUserFromCommunityVariablesData,
  removeUserFromGroup,
  removeUserFromGroupVariablesData,
} from './mutations/remove-mutation';
import {
  updateActor,
  updateActorVariablesData,
  updateAspect,
  updateAspectVariablesData,
  updateChallenge,
  updateChallengeVariablesData,
  updateHub,
  updateHubVariablesData,
  updateOpportunity,
  updateOpportunityVariablesData,
  updateOrganization,
  updateOrganizationVariablesData,
  updateProfile,
  updateProfileVariablesData,
  updateProject,
  updateProjectVariablesData,
  updateUserGroup,
  updateUserGroupVariablesData,
  updateUser,
  updateUserVariablesData,
} from './mutations/update-mutation';

export const createVariablesGetter = (parameters: Record<string, string>) => {
  return (operationName: string) => {
    switch (operationName) {
      case 'createUser':
        return createUserVariablesData(`userName${uniqueId}`);

      case 'createOrganization':
        return organizationVariablesData(
          `orgName${uniqueId}`,
          `orgnameid${uniqueId}`
        );
      case 'createHub':
        return hubVariablesData(
          `ecoName${uniqueId}`,
          `econameid${uniqueId}`,
          parameters['organizationId']
        );
      case 'createChallenge':
        return challengeVariablesData(
          `chName${uniqueId}`,
          `chnameid${uniqueId}`,
          parameters['hubId']
        );
      case 'createChildChallenge':
        return challengeVariablesData(
          `chChName${uniqueId}`,
          `chchnameid${uniqueId}`,
          parameters['challengeId']
        );
      case 'createOpportunity':
        return opportunityVariablesData(
          `oppName${uniqueId}`,
          `oppnameid${uniqueId}`,
          parameters['challengeId']
        );
      case 'createProject':
        return projectVariablesData(
          parameters['opportunityId'],
          `projectName${uniqueId}`,
          `projnameid${uniqueId}`
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
      case 'createGroupOnOrganization':
        return groupOnOrganizationVariablesData(
          `groupName${uniqueId}`,
          parameters['organizationId']
        );

      case 'createGroupOnCommunity':
        return groupOncommunityVariablesData(
          parameters['hubCommunityId'],
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
          parameters['hubCommunityId'],
          parameters['userId']
        );

      case 'createApplicationSelfUser':
        return createApplicationVariablesData(
          parameters['hubCommunityId'],
          parameters['selfUserId']
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

      case 'updateHub':
        return updateHubVariablesData(
          parameters['hubId'],
          `hubNameUpdate${uniqueId}`
        );

      case 'updateOrganization':
        return updateOrganizationVariablesData(
          parameters['organizationId'],
          `organizationNameUpdate${uniqueId}`
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
          parameters['hubGroupyId'],
          `hubGroupUpdate${uniqueId}`
        );

      case 'assignUserToCommunity':
        return assignUserToCommunityVariablesData(
          parameters['hubCommunityId'],
          parameters['userId']
        );

      case 'removeUserFromCommunity':
        return removeUserFromCommunityVariablesData(
          parameters['hubCommunityId'],
          parameters['userId']
        );

      case 'assignUserToGroup':
        return assignUserToGroupVariablesData(
          parameters['hubGroupyId'],
          parameters['userId']
        );

      case 'removeUserFromGroup':
        return removeUserFromGroupVariablesData(
          parameters['hubGroupyId'],
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
          'non.hub@cherrytwist.org',
          'HubMember',
          parameters['hubId']
        );

      case 'revokeCredentialFromUser':
        return revokeCredentialFromUserVariablesData(
          'non.hub@cherrytwist.org',
          'HubMember',
          parameters['hubId']
        );

      case 'deleteActor':
        return deleteVariablesData(parameters['actorId']);

      case 'deleteActorGroup':
        return deleteVariablesData(parameters['actorGroupId']);

      case 'deleteUserGroup':
        return deleteVariablesData(parameters['hubGroupyId']);

      case 'deleteUserApplication':
        return deleteVariablesData(parameters['applicationId']);

      case 'deleteUserApplicationAnotherUser':
        return deleteVariablesData(parameters['applicationIdAnotherUser']);

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

      case 'deleteHub':
        return deleteVariablesData(parameters['hubId']);

      case 'deleteOrganization':
        return deleteVariablesData(parameters['organizationIdDel']);

      default:
        throw new Error(`Operation ${operationName} is not defined!`);
    }
  };
};

export const getMutation = (operationName: string) => {
  switch (operationName) {
    case 'createUser':
      return createUser;

    case 'createOrganization':
      return createOrganization;

    case 'createHub':
      return createHub;

    case 'createChallenge':
      return createChallenge;

    case 'createChildChallenge':
      return createChildChallenge;

    case 'createOpportunity':
      return createOpportunity;

    case 'createProject':
      return createProject;

    case 'createAspect':
      return createAspect;

    case 'createActorGroup':
      return createActorGroup;

    case 'createActor':
      return createActor;

    case 'createGroupOnOrganization':
      return createGroupOnOrganization;

    case 'createGroupOnCommunity':
      return createGroupOnCommunity;

    case 'createReferenceOnContext':
      return createReferenceOnContext;

    case 'createReferenceOnProfile':
      return createReferenceOnProfile;

    case 'createTagsetOnProfile':
      return createTagsetOnProfile;

    case 'createRelation':
      return createRelation;

    case 'createApplication':
      return createApplication;

    case 'createApplicationSelfUser':
      return createApplication;

    case 'updateActor':
      return updateActor;

    case 'updateAspect':
      return updateAspect;

    case 'updateChallenge':
      return updateChallenge;

    case 'updateOpportunity':
      return updateOpportunity;

    case 'updateHub':
      return updateHub;

    case 'updateOrganization':
      return updateOrganization;

    case 'updateProfile':
      return updateProfile;

    case 'updateProject':
      return updateProject;

    case 'updateUser':
      return updateUser;

    case 'updateUserSelf':
      return updateUser;

    case 'updateUserGroup':
      return updateUserGroup;

    case 'assignUserToCommunity':
      return assignUserToCommunity;

    case 'removeUserFromCommunity':
      return removeUserFromCommunity;

    case 'assignUserToGroup':
      return assignUserToGroup;

    case 'removeUserFromGroup':
      return removeUserFromGroup;

    case 'eventOnChallenge':
      return eventOnChallenge;

    case 'eventOnOpportunity':
      return eventOnOpportunity;

    case 'eventOnProject':
      return eventOnProject;

    case 'eventOnApplication':
      return eventOnApplication;

    case 'grantCredentialToUser':
      return grantCredentialToUser;

    case 'revokeCredentialFromUser':
      return revokeCredentialFromUser;

    case 'deleteActor':
      return deleteActor;

    case 'deleteActorGroup':
      return deleteActorGroup;

    case 'deleteUserGroup':
      return deleteUserGroup;

    case 'deleteUserApplication':
      return deleteUserApplication;

    case 'deleteUserApplicationAnotherUser':
      return deleteUserApplication;

    case 'deleteUser':
      return deleteUser;

    case 'deleteRelation':
      return deleteRelation;

    case 'deleteReference':
      return deleteReference;

    case 'deleteProject':
      return deleteProject;

    case 'deleteAspect':
      return deleteAspect;

    case 'deleteOpportunity':
      return deleteOpportunity;

    case 'deleteChallenge':
      return deleteChallenge;

    case 'deleteHub':
      return deleteHub;

    case 'deleteOrganization':
      return deleteOrganization;

    default:
      throw new Error(`Operation ${operationName} is not defined!`);
  }
};

const OPERATION_CREATE_HUB = 'createHub';
