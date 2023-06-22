import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignChallengeAdmin,
  assignHubAdmin,
  assignUserAsOpportunityAdmin,
  userAsChallengeAdminVariablesData,
  userAsHubAdminVariablesData,
  userAsOpportunityAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  challengeVariablesData,
  createChallenge,
  createOpportunity,
  opportunityVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { getChallengeData } from '../integration/challenge/challenge.request.params';
import {
  createTestHub,
  getHubData,
} from '../integration/hub/hub.request.params';
import { getOpportunityData } from '../integration/opportunity/opportunity.request.params';
import { createOrganization } from '../integration/organization/organization.request.params';
import { createUserInitSimple } from '../user-management/user.request.params';
import { entitiesId } from './communications-helper';

export const createOrgAndHub = async (
  organizationName: string,
  hostNameId: string,
  hubName: string,
  hubNameId: string
) => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organizationId = responseOrg.body.data.createOrganization.id;
  entitiesId.organizationVerificationId =
    responseOrg.body.data.createOrganization.verification.id;
  entitiesId.organizationProfileId =
    responseOrg.body.data.createOrganization.profile.id;
  entitiesId.organizationDisplayName =
    responseOrg.body.data.createOrganization.profile.displayName;
  entitiesId.organizationNameId =
    responseOrg.body.data.createOrganization.nameID;

  const responseEco = await createTestHub(
    hubName,
    hubNameId,
    entitiesId.organizationId
  );
  entitiesId.hubId = responseEco.body.data.createHub.id;
  entitiesId.hubCommunityId = responseEco.body.data.createHub.community.id;
  entitiesId.hubCommunicationId =
    responseEco.body.data.createHub.community.communication.id;

  entitiesId.hubUpdatesId =
    responseEco.body.data.createHub.community.communication.updates.id;
  entitiesId.hubContextId = responseEco.body.data.createHub.context.id;

  entitiesId.hubCollaborationId =
    responseEco.body.data.createHub.collaboration.id;

  const postCallout = await getDefaultHubCalloutByNameId(
    entitiesId.hubId,
    'post-collection-default'
  );

  entitiesId.hubCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultHubCalloutByNameId(
    entitiesId.hubId,
    'whiteboard-collection-default'
  );
  entitiesId.hubWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultHubCalloutByNameId(
    entitiesId.hubId,
    'suggestions'
  );
  entitiesId.hubDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.hubDiscussionCalloutCommentsId = discussionCallout[0].comments.id;

  entitiesId.hubTemplateId = responseEco.body.data.createHub.templates.id;
  const hubTempLateOpportunity = await getDefaultHubTemplateByType(
    entitiesId.hubId,
    'OPPORTUNITY'
  );
  entitiesId.hubInnovationFlowTemplateOppId = hubTempLateOpportunity[0].id;
  const hubTempLateChallenge = await getDefaultHubTemplateByType(
    entitiesId.hubId,
    'CHALLENGE'
  );
  entitiesId.hubInnovationFlowTemplateChId = hubTempLateChallenge[0].id;
};

export const getDefaultHubCalloutByNameId = async (
  hubId: string,
  nameID: string
) => {
  const calloutsPerHub = await getHubData(hubId);
  const allCallouts = calloutsPerHub.body.data.hub.collaboration.callouts;
  const filteredCallout = allCallouts.filter((obj: { nameID: string }) =>
    obj.nameID.includes(nameID)
  );
  return filteredCallout;
};

export const getDefaultHubTemplateByType = async (
  hubId: string,
  type: string
) => {
  const templatesPerHub = await getHubData(hubId);
  const allTemplates =
    templatesPerHub.body.data.hub.templates.innovationFlowTemplates;
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === type;
  });
  return filteredTemplate;
};

export const assignUsersToHubAndOrgAsMembers = async () => {
  const usersToAssign: string[] = [
    users.hubAdminId,
    users.hubMemberId,
    users.challengeAdminId,
    users.challengeMemberId,
    users.opportunityAdminId,
    users.opportunityMemberId,
  ];
  for (const user of usersToAssign) {
    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(entitiesId.hubCommunityId, user)
    );
  }
};

export const assignUsersToHubAndOrg = async () => {
  await assignUsersToHubAndOrgAsMembers();

  await mutation(
    assignHubAdmin,
    userAsHubAdminVariablesData(users.hubAdminId, entitiesId.hubId)
  );
};

export const createOrgAndHubWithUsers = async (
  organizationName: string,
  hostNameId: string,
  hubName: string,
  hubNameId: string
) => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await assignUsersToHubAndOrg();
};

export const createChallengeForOrgHub = async (challengeName: string) => {
  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `chnameid${uniqueId}`,
      entitiesId.hubId
    )
  );
  entitiesId.challengeId = responseChallenge.body.data.createChallenge.id;
  entitiesId.challengeNameId =
    responseChallenge.body.data.createChallenge.nameID;
  entitiesId.challengeCommunityId =
    responseChallenge.body.data.createChallenge.community.id;
  entitiesId.challengeCommunicationId =
    responseChallenge.body.data.createChallenge.community.communication.id;
  entitiesId.challengeUpdatesId =
    responseChallenge.body.data.createChallenge.community.communication.updates.id;
  entitiesId.challengeCollaborationId =
    responseChallenge.body.data.createChallenge.collaboration.id;
  entitiesId.challengeContextId =
    responseChallenge.body.data.createChallenge.context.id;
  const postCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.hubId,
    entitiesId.challengeId,
    'post-collection-default'
  );
  entitiesId.challengeCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.hubId,
    entitiesId.challengeId,
    'whiteboard-collection-default'
  );
  entitiesId.challengeWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.hubId,
    entitiesId.challengeId,
    'suggestions'
  );
  entitiesId.challengeDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.challengeDiscussionCalloutCommentsId =
    discussionCallout[0].comments.id;
};

export const getDefaultChallengeCalloutByNameId = async (
  hubId: string,
  challengeId: string,
  nameID: string
) => {
  const calloutsPerChallenge = await getChallengeData(hubId, challengeId);
  const allCallouts =
    calloutsPerChallenge.body.data.hub.challenge.collaboration.callouts;
  const filteredCallout = allCallouts.filter((obj: { nameID: string }) => {
    return obj.nameID.includes(nameID);
  });
  return filteredCallout;
};

export const assignUsersToChallengeAsMembers = async () => {
  const usersToAssign: string[] = [
    users.challengeAdminId,
    users.challengeMemberId,
    users.opportunityAdminId,
    users.opportunityMemberId,
  ];
  for (const user of usersToAssign) {
    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.challengeCommunityId,
        user
      )
    );
  }
};

export const assignUsersToChallenge = async () => {
  await assignUsersToChallengeAsMembers();

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(
      users.challengeAdminId,
      entitiesId.challengeId
    )
  );
};

export const createChallengeWithUsers = async (challengeName: string) => {
  await createChallengeForOrgHub(challengeName);
  await assignUsersToChallenge();
};

export const getDefaultOpportunityCalloutByNameId = async (
  hubId: string,
  opportunityId: string,
  nameID: string
) => {
  const calloutsPerOpportunity = await getOpportunityData(hubId, opportunityId);
  const allCallouts =
    calloutsPerOpportunity.body.data.hub.opportunity.collaboration.callouts;
  const filteredCallout = allCallouts.filter((obj: { nameID: string }) => {
    return obj.nameID.includes(nameID);
  });
  return filteredCallout;
};

export const createOpportunityForChallenge = async (
  opportunityName: string
) => {
  const responseOpportunity = await mutation(
    createOpportunity,
    opportunityVariablesData(
      opportunityName,
      `opnameid${uniqueId}`,
      entitiesId.challengeId
    )
  );
  entitiesId.opportunityId = responseOpportunity.body.data.createOpportunity.id;
  entitiesId.opportunityNameId =
    responseOpportunity.body.data.createOpportunity.nameID;
  entitiesId.opportunityCommunityId =
    responseOpportunity.body.data.createOpportunity.community.id;
  entitiesId.opportunityCommunicationId =
    responseOpportunity.body.data.createOpportunity.community.communication.id;
  entitiesId.opportunityUpdatesId =
    responseOpportunity.body.data.createOpportunity.community.communication.updates.id;
  entitiesId.opportunityCollaborationId =
    responseOpportunity.body.data.createOpportunity.collaboration.id;
  entitiesId.opportunityContextId =
    responseOpportunity.body.data.createOpportunity.context.id;
  const postCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.hubId,
    entitiesId.opportunityId,
    'post-collection-default'
  );
  entitiesId.opportunityCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.hubId,
    entitiesId.opportunityId,
    'whiteboard-collection-default'
  );
  entitiesId.opportunityWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.hubId,
    entitiesId.opportunityId,
    'suggestions'
  );
  entitiesId.opportunityDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.opportunityDiscussionCalloutCommentsId =
    discussionCallout[0].comments.id;
};

export const assignUsersToOpportunityAsMembers = async () => {
  const usersToAssign: string[] = [
    users.opportunityAdminId,
    users.opportunityMemberId,
  ];
  for (const user of usersToAssign) {
    await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(
        entitiesId.opportunityCommunityId,
        user
      )
    );
  }
};

export const assignUsersToOpportunity = async () => {
  await assignUsersToOpportunityAsMembers();
  await mutation(
    assignUserAsOpportunityAdmin,
    userAsOpportunityAdminVariablesData(
      users.opportunityAdminId,
      entitiesId.opportunityId
    )
  );
};

export const createOpportunityWithUsers = async (opportunityName: string) => {
  await createOpportunityForChallenge(opportunityName);
  await assignUsersToOpportunity();
};

export const registerUsersAndAssignToAllEntitiesAsMembers = async (
  hubMemberEmail: string,
  challengeMemberEmal: string,
  opportunityMemberEmail: string
) => {
  await createUserInitSimple('hub', 'mem', hubMemberEmail);
  await createUserInitSimple('chal', 'mem', challengeMemberEmal);
  await createUserInitSimple('opp', 'mem', opportunityMemberEmail);

  // Assign users to Hub community
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      hubMemberEmail
    )
  );
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      challengeMemberEmal
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      opportunityMemberEmail
    )
  );

  // Assign users to Challenge community
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.challengeCommunityId,
      challengeMemberEmal
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.challengeCommunityId,
      opportunityMemberEmail
    )
  );

  // Assign users to Opportunity community
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.opportunityCommunityId,
      opportunityMemberEmail
    )
  );
};
