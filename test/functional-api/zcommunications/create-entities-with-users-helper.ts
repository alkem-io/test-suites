import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
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
  createTestSpace,
  getSpaceData,
  getSpaceDataCodegen,
} from '../integration/space/space.request.params';
import { getOpportunityData } from '../integration/opportunity/opportunity.request.params';
import { createOrganization } from '../integration/organization/organization.request.params';
import { createUserInitSimple } from '../user-management/user.request.params';
import { entitiesId } from './communications-helper';
import {
  RoleType,
  assignCommunityRoleToUser,
} from '../integration/community/community.request.params';

export const createOrgAndSpace = async (
  organizationName: string,
  hostNameId: string,
  spaceName: string,
  spaceNameId: string
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

  const responseEco = await createTestSpace(
    spaceName,
    spaceNameId,
    entitiesId.organizationId
  );
  entitiesId.spaceId = responseEco.body.data.createSpace.id;
  entitiesId.spaceCommunityId = responseEco.body.data.createSpace.community.id;
  entitiesId.spaceCommunicationId =
    responseEco.body.data.createSpace.community.communication.id;

  entitiesId.spaceUpdatesId =
    responseEco.body.data.createSpace.community.communication.updates.id;
  entitiesId.spaceContextId = responseEco.body.data.createSpace.context.id;

  entitiesId.spaceCollaborationId =
    responseEco.body.data.createSpace.collaboration.id;

  const postCallout = await getDefaultSpaceCalloutByNameId(
    entitiesId.spaceId,
    'news'
  );

  entitiesId.spaceCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultSpaceCalloutByNameId(
    entitiesId.spaceId,
    'vision'
  );
  entitiesId.spaceWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultSpaceCalloutByNameId(
    entitiesId.spaceId,
    'general-chat'
  );
  entitiesId.spaceDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.spaceDiscussionCalloutCommentsId =
    discussionCallout[0].comments.id;

  entitiesId.spaceTemplateId = responseEco.body.data.createSpace.templates.id;
  const spaceTempLateOpportunity = await getDefaultSpaceTemplateByType(
    entitiesId.spaceId,
    'OPPORTUNITY'
  );
  entitiesId.spaceInnovationFlowTemplateOppId = spaceTempLateOpportunity[0].id;
  const spaceTempLateChallenge = await getDefaultSpaceTemplateByType(
    entitiesId.spaceId,
    'CHALLENGE'
  );
  entitiesId.spaceInnovationFlowTemplateChId = spaceTempLateChallenge[0].id;
};

export const getDefaultSpaceCalloutByNameId = async (
  spaceId: string,
  nameID: string
) => {
  const calloutsPerSpace = await getSpaceData(spaceId);
  const allCallouts = calloutsPerSpace.body.data.space.collaboration.callouts;
  const filteredCallout = allCallouts.filter((obj: { nameID: string }) =>
    obj.nameID.includes(nameID)
  );
  return filteredCallout;
};

export const getDefaultSpaceTemplateByType = async (
  spaceId: string,
  type: string
) => {
  const templatesPerSpace = await getSpaceDataCodegen(spaceId);
  const allTemplates =
    templatesPerSpace?.data?.space?.templates?.innovationFlowTemplates;
  const filteredTemplate = allTemplates?.filter((obj: { type: string }) => {
    return obj.type === type;
  });
  return filteredTemplate;
};

export const assignUsersToSpaceAndOrgAsMembers = async () => {
  const usersToAssign: string[] = [
    users.spaceAdminId,
    users.spaceMemberId,
    users.challengeAdminId,
    users.challengeMemberId,
    users.opportunityAdminId,
    users.opportunityMemberId,
  ];
  for (const user of usersToAssign) {
    await assignCommunityRoleToUser(
      user,
      entitiesId.spaceCommunityId,
      RoleType.MEMBER
    );
  }
};

export const assignUsersToSpaceAndOrg = async () => {
  await assignUsersToSpaceAndOrgAsMembers();
  await assignCommunityRoleToUser(
    users.spaceAdminId,
    entitiesId.spaceCommunityId,
    RoleType.ADMIN
  );
};

export const createOrgAndSpaceWithUsers = async (
  organizationName: string,
  hostNameId: string,
  spaceName: string,
  spaceNameId: string
) => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await assignUsersToSpaceAndOrg();
};

export const createChallengeForOrgSpace = async (challengeName: string) => {
  const responseChallenge = await mutation(
    createChallenge,
    challengeVariablesData(
      challengeName,
      `chnameid${uniqueId}`,
      entitiesId.spaceId
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
    entitiesId.spaceId,
    entitiesId.challengeId,
    'news'
  );
  entitiesId.challengeCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.spaceId,
    entitiesId.challengeId,
    'stakeholder-map'
  );
  entitiesId.challengeWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultChallengeCalloutByNameId(
    entitiesId.spaceId,
    entitiesId.challengeId,
    'general-chat'
  );
  entitiesId.challengeDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.challengeDiscussionCalloutCommentsId =
    discussionCallout[0].comments.id;
};

export const getDefaultChallengeCalloutByNameId = async (
  spaceId: string,
  challengeId: string,
  nameID: string
) => {
  const calloutsPerChallenge = await getChallengeData(spaceId, challengeId);
  const allCallouts =
    calloutsPerChallenge.body.data.space.challenge.collaboration.callouts;
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
    await assignCommunityRoleToUser(
      user,
      entitiesId.challengeCommunityId,
      RoleType.MEMBER
    );
  }
};

export const assignUsersToChallenge = async () => {
  await assignUsersToChallengeAsMembers();

  await assignCommunityRoleToUser(
    users.challengeAdminId,
    entitiesId.challengeCommunityId,
    RoleType.ADMIN
  );
};

export const createChallengeWithUsers = async (challengeName: string) => {
  await createChallengeForOrgSpace(challengeName);
  await assignUsersToChallenge();
};

export const getDefaultOpportunityCalloutByNameId = async (
  spaceId: string,
  opportunityId: string,
  nameID: string
) => {
  const calloutsPerOpportunity = await getOpportunityData(
    spaceId,
    opportunityId
  );
  const allCallouts =
    calloutsPerOpportunity.body.data.space.opportunity.collaboration.callouts;
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
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'news'
  );
  entitiesId.opportunityCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'needs'
  );
  entitiesId.opportunityWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultOpportunityCalloutByNameId(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'general-chat'
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
    await assignCommunityRoleToUser(
      user,
      entitiesId.opportunityCommunityId,
      RoleType.MEMBER
    );
  }
};

export const assignUsersToOpportunity = async () => {
  await assignUsersToOpportunityAsMembers();
  await assignCommunityRoleToUser(
    users.opportunityAdminId,
    entitiesId.opportunityCommunityId,
    RoleType.ADMIN
  );
};

export const createOpportunityWithUsers = async (opportunityName: string) => {
  await createOpportunityForChallenge(opportunityName);
  await assignUsersToOpportunity();
};

export const registerUsersAndAssignToAllEntitiesAsMembers = async (
  spaceMemberEmail: string,
  challengeMemberEmal: string,
  opportunityMemberEmail: string
) => {
  await createUserInitSimple('space', 'mem', spaceMemberEmail);
  await createUserInitSimple('chal', 'mem', challengeMemberEmal);
  await createUserInitSimple('opp', 'mem', opportunityMemberEmail);

  // Assign users to Space community
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      spaceMemberEmail
    )
  );
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      challengeMemberEmal
    )
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
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
