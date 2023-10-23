import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { getChallengeDataCodegen } from '../../functional-api/integration/challenge/challenge.request.params';
import {
  createTestSpaceCodegen,
  getSpaceDataCodegen,
} from '../../functional-api/integration/space/space.request.params';
import { getOpportunityDataCodegen } from '../../functional-api/integration/opportunity/opportunity.request.params';
import { getCalloutsDataCodegen } from '../../functional-api/integration/callouts/callouts.request.params';

import { createOrganizationCodegen } from '../../functional-api/integration/organization/organization.request.params';
import { createUserInitSimple } from '../../functional-api/user-management/user.request.params';
import { entitiesId } from '../../functional-api/zcommunications/communications-helper';
import { assignCommunityRoleToUserCodegen } from '../../functional-api/integration/community/community.request.params';
import { createChallengeCodegen } from '../mutations/journeys/challenge';
import { CommunityRole } from '@alkemio/client-lib';
import { createOpportunityCodegen } from '../mutations/journeys/opportunity';

export const createOrgAndSpaceCodegen = async (
  organizationName: string,
  hostNameId: string,
  spaceName: string,
  spaceNameId: string
) => {
  const responseOrg = await createOrganizationCodegen(
    organizationName,
    hostNameId
  );
  entitiesId.organizationId = responseOrg.data?.createOrganization.id ?? '';
  entitiesId.organizationVerificationId =
    responseOrg.data?.createOrganization.verification.id ?? '';
  entitiesId.organizationProfileId =
    responseOrg.data?.createOrganization.profile.id ?? '';
  entitiesId.organizationDisplayName =
    responseOrg.data?.createOrganization.profile.displayName ?? '';
  entitiesId.organizationNameId =
    responseOrg.data?.createOrganization.nameID ?? '';

  const responseEco = await createTestSpaceCodegen(
    spaceName,
    spaceNameId,
    entitiesId.organizationId
  );
  entitiesId.spaceId = responseEco.data?.createSpace.id ?? '';
  entitiesId.spaceCommunityId =
    responseEco.data?.createSpace.community?.id ?? '';
  entitiesId.spaceCommunicationId =
    responseEco.data?.createSpace.community?.communication?.id ?? '';

  entitiesId.spaceUpdatesId =
    responseEco.data?.createSpace.community?.communication?.updates.id ?? '';
  entitiesId.spaceContextId = responseEco.data?.createSpace.context?.id ?? '';

  entitiesId.spaceCollaborationId =
    responseEco.data?.createSpace.collaboration?.id ?? '';

  const postCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'proposals'
  );
  console.log(postCallout);
  entitiesId.spaceCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'vision'
  );
  entitiesId.spaceWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'general-chat'
  );
  entitiesId.spaceDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.spaceDiscussionCalloutCommentsId =
    discussionCallout[0].comments?.id ?? '';

  entitiesId.spaceTemplateId =
    responseEco.data?.createSpace.templates?.id ?? '';
  const spaceTempLateOpportunity = await getDefaultSpaceTemplateByTypeCodegen(
    entitiesId.spaceId,
    'OPPORTUNITY'
  );
  entitiesId.spaceInnovationFlowTemplateOppId = spaceTempLateOpportunity[0].id;
  const spaceTempLateChallenge = await getDefaultSpaceTemplateByTypeCodegen(
    entitiesId.spaceId,
    'CHALLENGE'
  );
  entitiesId.spaceInnovationFlowTemplateChId = spaceTempLateChallenge[0].id;
};

export const getDefaultSpaceCalloutByNameIdCodegen = async (
  spaceId: string,
  nameID: string
) => {
  const calloutsPerSpace = await getCalloutsDataCodegen(
    spaceId,
    true,
    false,
    false
  );
  const allCallouts =
    calloutsPerSpace.data?.space.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );
  return filteredCallout;
};

export const getDefaultSpaceTemplateByTypeCodegen = async (
  spaceId: string,
  type: string
) => {
  const templatesPerSpace = await getSpaceDataCodegen(spaceId);
  const allTemplates =
    templatesPerSpace.data?.space.templates?.innovationFlowTemplates ?? [];
  const filteredTemplate = allTemplates.filter((obj: { type: string }) => {
    return obj.type === type;
  });
  return filteredTemplate;
};

export const assignUsersToSpaceAndOrgAsMembersCodegen = async () => {
  const usersToAssign: string[] = [
    users.spaceAdminId,
    users.spaceMemberId,
    users.challengeAdminId,
    users.challengeMemberId,
    users.opportunityAdminId,
    users.opportunityMemberId,
  ];
  for (const user of usersToAssign) {
    await assignCommunityRoleToUserCodegen(
      user,
      entitiesId.spaceCommunityId,
      CommunityRole.Member
    );
  }
};

export const assignUsersToSpaceAndOrgCodegen = async () => {
  await assignUsersToSpaceAndOrgAsMembersCodegen();
  await assignCommunityRoleToUserCodegen(
    users.spaceAdminId,
    entitiesId.spaceCommunityId,
    CommunityRole.Admin
  );
};

export const createOrgAndSpaceWithUsersCodegen = async (
  organizationName: string,
  hostNameId: string,
  spaceName: string,
  spaceNameId: string
) => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await assignUsersToSpaceAndOrgCodegen();
};

export const createChallengeForOrgSpaceCodegen = async (
  challengeName: string
) => {
  const responseChallenge = await createChallengeCodegen(
    challengeName,
    `chnameid${uniqueId}`,
    entitiesId.spaceId
  );
  entitiesId.challengeId = responseChallenge.data?.createChallenge.id ?? '';
  entitiesId.challengeNameId =
    responseChallenge.data?.createChallenge.nameID ?? '';
  entitiesId.challengeCommunityId =
    responseChallenge.data?.createChallenge.community?.id ?? '';
  entitiesId.challengeCommunicationId =
    responseChallenge.data?.createChallenge.community?.communication?.id ?? '';
  entitiesId.challengeUpdatesId =
    responseChallenge.data?.createChallenge.community?.communication?.updates
      .id ?? '';
  entitiesId.challengeCollaborationId =
    responseChallenge.data?.createChallenge.collaboration?.id ?? '';
  entitiesId.challengeContextId =
    responseChallenge.data?.createChallenge.context?.id ?? '';
  const postCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.challengeId,
    'proposals'
  );
  entitiesId.challengeCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,

    entitiesId.challengeId,
    'stakeholder-map'
  );
  entitiesId.challengeWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,

    entitiesId.challengeId,
    'general-chat'
  );
  entitiesId.challengeDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.challengeDiscussionCalloutCommentsId =
    discussionCallout[0].comments?.id ?? '';
};

export const getDefaultChallengeCalloutByNameIdCodegen = async (
  spaceId: string,
  challengeId: string,
  nameID: string
) => {
  const calloutsPerSpace = await getCalloutsDataCodegen(
    spaceId,
    false,
    true,
    false,
    challengeId
  );
  const allCallouts =
    calloutsPerSpace.data?.space?.challenge?.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );
  return filteredCallout;
};

// export const getDefaultChallengeCalloutByNameIdCodegen = async (
//   challengeId: string,
//   nameID: string
// ) => {
//   const calloutsPerChallenge = await getChallengeDataCodegen(challengeId);
//   const allCallouts =
//     calloutsPerChallenge.data?.lookup.challenge?.collaboration?.callouts ?? [];
//   const filteredCallout = allCallouts.filter((obj: { nameID: string }) => {
//     return obj.nameID.includes(nameID);
//   });
//   return filteredCallout;
// };

export const assignUsersToChallengeAsMembersCodegen = async () => {
  const usersToAssign: string[] = [
    users.challengeAdminId,
    users.challengeMemberId,
    users.opportunityAdminId,
    users.opportunityMemberId,
  ];
  for (const user of usersToAssign) {
    await assignCommunityRoleToUserCodegen(
      user,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );
  }
};

export const assignUsersToChallengeCodegen = async () => {
  await assignUsersToChallengeAsMembersCodegen();

  await assignCommunityRoleToUserCodegen(
    users.challengeAdminId,
    entitiesId.challengeCommunityId,
    CommunityRole.Admin
  );
};

export const createChallengeWithUsersCodegen = async (
  challengeName: string
) => {
  await createChallengeForOrgSpaceCodegen(challengeName);
  await assignUsersToChallengeCodegen();
};

// export const getDefaultOpportunityCalloutByNameIdCodegen = async (
//   opportunityId: string,
//   nameID: string
// ) => {
//   const calloutsPerOpportunity = await getOpportunityDataCodegen(opportunityId);
//   const allCallouts =
//     calloutsPerOpportunity.data?.space.opportunity?.collaboration?.callouts ??
//     [];
//   const filteredCallout = allCallouts.filter((obj: { nameID: string }) => {
//     return obj.nameID.includes(nameID);
//   });
//   return filteredCallout;
// };

export const getDefaultOpportunityCalloutByNameIdCodegen = async (
  spaceId: string,
  opportunityId: string,
  nameID: string
) => {
  const calloutsPerSpace = await getCalloutsDataCodegen(
    spaceId,
    false,
    false,
    true,
    undefined,
    opportunityId
  );
  const allCallouts =
    calloutsPerSpace.data?.space?.opportunity?.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );
  return filteredCallout;
};

export const createOpportunityForChallengeCodegen = async (
  opportunityName: string
) => {
  const responseOpportunity = await createOpportunityCodegen(
    opportunityName,
    `opp-${uniqueId}`,
    entitiesId.challengeId
  );
  console.log(responseOpportunity?.error?.errors);
  entitiesId.opportunityId =
    responseOpportunity.data?.createOpportunity.id ?? '';
  entitiesId.opportunityNameId =
    responseOpportunity.data?.createOpportunity.nameID ?? '';
  entitiesId.opportunityCommunityId =
    responseOpportunity.data?.createOpportunity.community?.id ?? '';
  entitiesId.opportunityCommunicationId =
    responseOpportunity.data?.createOpportunity.community?.communication?.id ??
    '';
  entitiesId.opportunityUpdatesId =
    responseOpportunity.data?.createOpportunity.community?.communication
      ?.updates.id ?? '';
  entitiesId.opportunityCollaborationId =
    responseOpportunity.data?.createOpportunity.collaboration?.id ?? '';
  entitiesId.opportunityContextId =
    responseOpportunity.data?.createOpportunity.context?.id ?? '';
  const postCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'news'
  );
  console.log(postCallout);
  entitiesId.opportunityCalloutId = postCallout[0].id;

  const whiteboardCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'needs'
  );
  entitiesId.opportunityWhiteboardCalloutId = whiteboardCallout[0].id;

  const discussionCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'general-chat'
  );
  entitiesId.opportunityDiscussionCalloutId = discussionCallout[0].id;
  entitiesId.opportunityDiscussionCalloutCommentsId =
    discussionCallout[0].comments?.id ?? '';
};

export const assignUsersToOpportunityAsMembersCodegen = async () => {
  const usersToAssign: string[] = [
    users.opportunityAdminId,
    users.opportunityMemberId,
  ];
  for (const user of usersToAssign) {
    await assignCommunityRoleToUserCodegen(
      user,
      entitiesId.opportunityCommunityId,
      CommunityRole.Member
    );
  }
};

export const assignUsersToOpportunityCodegen = async () => {
  await assignUsersToOpportunityAsMembersCodegen();
  await assignCommunityRoleToUserCodegen(
    users.opportunityAdminId,
    entitiesId.opportunityCommunityId,
    CommunityRole.Admin
  );
};

export const createOpportunityWithUsersCodegen = async (
  opportunityName: string
) => {
  await createOpportunityForChallengeCodegen(opportunityName);
  await assignUsersToOpportunityCodegen();
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
  await assignCommunityRoleToUserCodegen(
    spaceMemberEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );
  await assignCommunityRoleToUserCodegen(
    challengeMemberEmal,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );
  await assignCommunityRoleToUserCodegen(
    opportunityMemberEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );

  // Assign users to Challenge community
  await assignCommunityRoleToUserCodegen(
    opportunityMemberEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Member
  );
  await assignCommunityRoleToUserCodegen(
    challengeMemberEmal,
    entitiesId.challengeCommunityId,
    CommunityRole.Member
  );

  // Assign users to Opportunity community
  await assignCommunityRoleToUserCodegen(
    opportunityMemberEmail,
    entitiesId.opportunityCommunityId,
    CommunityRole.Member
  );
};
