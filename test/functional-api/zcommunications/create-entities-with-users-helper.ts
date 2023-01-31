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
import { createCalloutOnCollaboration } from '../integration/callouts/callouts.request.params';
import { getChallengeData } from '../integration/challenge/challenge.request.params';
import {
  createTestHub,
  getHubData,
} from '../integration/hub/hub.request.params';
import { getOpportunityData } from '../integration/opportunity/opportunity.request.params';
import { createOrganization } from '../integration/organization/organization.request.params';
import {
  createUserInitSimple,
  getUser,
} from '../user-management/user.request.params';
import { entitiesId, users } from './communications-helper';

export const getUsersIdentifiers = async () => {
  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonHubMemberEmail);
  users.nonHubMemberId = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(users.hubAdminEmail);
  users.hubAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.hubMemberEmail);
  users.hubMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;
  users.qaUserProfileId = reqQaUser.body.data.user.profile.id;
  users.qaUserNameId = reqQaUser.body.data.user.nameId;

  const notificationsAdminUser = await getUser(users.notificationsAdminEmail);
  users.notificationsAdminId = notificationsAdminUser.body.data.user.id;
};

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

  const cardCallout = await getDefaultHubCalloutByNameId(
    entitiesId.hubId,
    'contribute'
  );
  entitiesId.hubCalloutId = cardCallout[0].id;

  const canvasCallout = await getDefaultHubCalloutByNameId(
    entitiesId.hubId,
    'collaboratevisually'
  );
  entitiesId.hubCanvasCalloutId = canvasCallout[0].id;

  const discussionCallout = await getDefaultHubCalloutByNameId(
    entitiesId.hubId,
    'suggestionsquestio'
  );
  entitiesId.hubDiscussionCalloutId = discussionCallout[0].id;

  entitiesId.hubTemplateId = responseEco.body.data.createHub.templates.id;
  const hubTempLateOpportunity = await getDefaultHubTemplateByType(
    entitiesId.hubId,
    'OPPORTUNITY'
  );
  entitiesId.hubLifecycleTemplateOppId = hubTempLateOpportunity[0].id;
  const hubTempLateChallenge = await getDefaultHubTemplateByType(
    entitiesId.hubId,
    'CHALLENGE'
  );
  entitiesId.hubLifecycleTemplateChId = hubTempLateChallenge[0].id;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonHubMemberEmail);
  users.nonHubMemberId = reqNonEco.body.data.user.id;

  const reqEcoAdmin = await getUser(users.hubAdminEmail);
  users.hubAdminId = reqEcoAdmin.body.data.user.id;

  const reqChallengeAdmin = await getUser(users.hubMemberEmail);
  users.hubMemberId = reqChallengeAdmin.body.data.user.id;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;
};

export const getDefaultHubCalloutByNameId = async (
  hubId: string,
  nameID: string
) => {
  const calloutsPerHub = await getHubData(hubId);
  const allTemplates = calloutsPerHub.body.data.hub.collaboration.callouts;
  const filteredCallout = allTemplates.filter((obj: { nameID: string }) => {
    return obj.nameID.includes(nameID);
  });
  return filteredCallout;
};

export const getDefaultHubTemplateByType = async (
  hubId: string,
  type: string
) => {
  const templatesPerHub = await getHubData(hubId);
  const allTemplates =
    templatesPerHub.body.data.hub.templates.lifecycleTemplates;
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === type;
  });
  return filteredTemplate;
};

export const createCalloutToMainHub = async (
  calloutDisplayName: string,
  calloutNameID: string
) => {
  const res = await createCalloutOnCollaboration(
    entitiesId.hubCollaborationId,
    calloutDisplayName,
    calloutNameID
  );
  entitiesId.hubCalloutId = res.body.data.createCalloutOnCollaboration.id;
  return entitiesId.hubCalloutId;
};

export const assignUsersToHubAndOrg = async () => {
  await getUsersIdentifiers();

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.hubAdminId
    )
  );

  await mutation(
    assignHubAdmin,
    userAsHubAdminVariablesData(users.hubAdminId, entitiesId.hubId)
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
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
  const cardCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.hubId,
    entitiesId.challengeId,
    'contribute'
  );
  entitiesId.challengeCalloutId = cardCallout[0].id;

  const canvasCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.hubId,
    entitiesId.challengeId,
    'collaboratevisually'
  );
  entitiesId.challengeCanvasCalloutId = canvasCallout[0].id;

  const discussionCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.hubId,
    entitiesId.challengeId,
    'suggestionsquestio'
  );
  entitiesId.challengeDiscussionCalloutId = discussionCallout[0].id;
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

export const createCalloutToMainChallenge = async (
  calloutDisplayNameChallenge: string,
  calloutNameIDChallenge: string
) => {
  const res = await createCalloutOnCollaboration(
    entitiesId.challengeCollaborationId,
    calloutDisplayNameChallenge,
    calloutNameIDChallenge
  );
  entitiesId.challengeCalloutId = res.body.data.createCalloutOnCollaboration.id;
  return entitiesId.challengeCalloutId;
};

export const assignUsersToChallenge = async () => {
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.challengeCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.challengeCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignChallengeAdmin,
    userAsChallengeAdminVariablesData(users.hubMemberId, entitiesId.challengeId)
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
  const cardCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.hubId,
    entitiesId.opportunityId,
    'contribute'
  );
  entitiesId.opportunityCalloutId = cardCallout[0].id;

  const canvasCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.hubId,
    entitiesId.opportunityId,
    'collaboratevisually'
  );
  entitiesId.opportunityCanvasCalloutId = canvasCallout[0].id;

  const discussionCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.hubId,
    entitiesId.opportunityId,
    'suggestionsquestio'
  );
  entitiesId.opportunityDiscussionCalloutId = discussionCallout[0].id;
};
export const assignUsersToOpportunity = async () => {
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.opportunityCommunityId,
      users.hubMemberId
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.opportunityCommunityId,
      users.qaUserId
    )
  );

  await mutation(
    assignUserAsOpportunityAdmin,
    userAsOpportunityAdminVariablesData(
      users.hubMemberId,
      entitiesId.opportunityId
    )
  );
};

export const createOpportunityWithUsers = async (opportunityName: string) => {
  await createOpportunityForChallenge(opportunityName);
  await assignUsersToOpportunity();
};

export const createCalloutToMainOpportunity = async (
  calloutDisplayNameOpportunity: string,
  calloutNameIDOpportunity: string
) => {
  const res = await createCalloutOnCollaboration(
    entitiesId.opportunityCollaborationId,
    calloutDisplayNameOpportunity,
    calloutNameIDOpportunity
  );
  entitiesId.opportunityCalloutId =
    res.body.data.createCalloutOnCollaboration.id;
  return entitiesId.opportunityCalloutId;
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
