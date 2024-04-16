import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { createSpaceAndGetData } from '../../functional-api/journey/space/space.request.params';
import {
  getCalloutDetailsCodegen,
  getCollaborationCalloutsDataCodegen,
} from '../../functional-api/callout/callouts.request.params';
import { createOrganizationCodegen } from '../../functional-api/organization/organization.request.params';
import { createUserCodegen } from '../../functional-api/user-management/user.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { createChallengeCodegen } from '../mutations/journeys/challenge';
import { createOpportunityCodegen } from '../mutations/journeys/opportunity';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/roles/roles-request.params';
import { CommunityRole } from '@test/generated/alkemio-schema';

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

  const responseEco = await createSpaceAndGetData(
    spaceName,
    spaceNameId,
    entitiesId.organizationId
  );
  const spaceData = responseEco.data?.space;
  entitiesId.accountId = spaceData?.account.id ?? '';
  entitiesId.spaceId = spaceData?.id ?? '';

  //const spaceDataGet = await getSpaceDataCodegen(entitiesId.spaceId);
  // const spaceData = spaceDataGet.data?.space;

  entitiesId.spaceCommunityId = spaceData?.community?.id ?? '';
  entitiesId.spaceCommunicationId =
    spaceData?.community?.communication?.id ?? '';

  entitiesId.spaceUpdatesId =
    spaceData?.community?.communication?.updates.id ?? '';
  entitiesId.spaceContextId = spaceData?.context?.id ?? '';
  entitiesId.spaceProfileId = spaceData?.profile?.id ?? '';
  entitiesId.spaceCollaborationId = spaceData?.collaboration?.id ?? '';

  entitiesId.spaceInnovationFlowTemplateChId =
    spaceData?.account.library?.innovationFlowTemplates[0].id ?? '';
  entitiesId.spaceInnovationFlowTemplateOppId =
    spaceData?.account.library?.innovationFlowTemplates[0].id ?? '';

  entitiesId.spaceTemplateSetId = spaceData?.account.library?.id ?? '';
  console.log(entitiesId.spaceTemplateId);

  const postCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'proposals'
  );
  entitiesId.spaceCalloutId = postCallout?.data?.lookup?.callout?.id ?? '';

  const whiteboardCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'vision'
  );
  entitiesId.spaceWhiteboardCalloutId =
    whiteboardCallout?.data?.lookup?.callout?.id ?? '';

  const discussionCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'general-chat'
  );
  entitiesId.spaceDiscussionCalloutId =
    discussionCallout?.data?.lookup?.callout?.id ?? '';
  entitiesId.spaceDiscussionCalloutCommentsId =
    discussionCallout.data?.lookup?.callout?.comments?.id ?? '';

  entitiesId.spaceTemplateId =
    responseEco.data?.space.account.library?.innovationFlowTemplates[0].id ??
    '';
};

export const getDefaultSpaceCalloutByNameIdCodegen = async (
  collaborationId: string,
  nameID: string
) => {
  const calloutsPerSpace = await getCollaborationCalloutsDataCodegen(
    (collaborationId = entitiesId.spaceCollaborationId)
  );
  const allCallouts =
    calloutsPerSpace.data?.lookup.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );

  const colloutDetails = await getCalloutDetailsCodegen(filteredCallout[0].id);
  return colloutDetails;
};

// export const getDefaultSpaceTemplateByTypeCodegen = async (
//   spaceId: string,
//   displayName: string
// ) => {
//   const templatesPerSpace = await getSpaceDataCodegen(spaceId);
//   const allTemplates =
//     templatesPerSpace.data?.space.account.library?.innovationFlowTemplates ??
//     [];
//   const filteredTemplate = allTemplates.filter(
//     (obj: { profile: { displayName: string } }) => {
//       return obj.profile.displayName === displayName;
//     }
//   );
//   return filteredTemplate;
// };

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
  const subspaceData = responseChallenge.data?.createSubspace;
  entitiesId.challengeId = subspaceData?.id ?? '';
  entitiesId.challengeNameId = subspaceData?.nameID ?? '';
  entitiesId.challengeCommunityId = subspaceData?.community?.id ?? '';
  entitiesId.challengeCommunicationId =
    subspaceData?.community?.communication?.id ?? '';
  entitiesId.challengeUpdatesId =
    subspaceData?.community?.communication?.updates.id ?? '';
  entitiesId.challengeCollaborationId = subspaceData?.collaboration?.id ?? '';
  entitiesId.challengeContextId = subspaceData?.context?.id ?? '';
  entitiesId.challengeProfileId = subspaceData?.profile?.id ?? '';
  const postCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.challengeId,
    'news'
  );
  entitiesId.challengeCalloutId = postCallout?.data?.lookup?.callout?.id ?? '';

  const whiteboardCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,

    entitiesId.challengeId,
    'stakeholder-map'
  );
  entitiesId.challengeWhiteboardCalloutId =
    whiteboardCallout?.data?.lookup?.callout?.id ?? '';

  const discussionCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,

    entitiesId.challengeId,
    'general-chat'
  );
  entitiesId.challengeDiscussionCalloutId =
    discussionCallout?.data?.lookup?.callout?.id ?? '';
  entitiesId.challengeDiscussionCalloutCommentsId =
    discussionCallout?.data?.lookup?.callout?.comments?.id ?? '';
};

export const getDefaultChallengeCalloutByNameIdCodegen = async (
  spaceId: string,
  collaborationId: string,
  nameID: string
) => {
  const calloutsPerCollaboration = await getCollaborationCalloutsDataCodegen(
    (collaborationId = entitiesId.challengeCollaborationId)
  );
  const allCallouts =
    calloutsPerCollaboration.data?.lookup?.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );
  const colloutDetails = await getCalloutDetailsCodegen(filteredCallout[0]?.id);
  return colloutDetails;
};

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

export const getDefaultOpportunityCalloutByNameIdCodegen = async (
  spaceId: string,
  collaborationId: string,
  nameID: string
) => {
  const calloutsPerCollaboration = await getCollaborationCalloutsDataCodegen(
    (collaborationId = entitiesId.opportunityCollaborationId)
  );

  const allCallouts =
    calloutsPerCollaboration.data?.lookup?.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );
  const colloutDetails = await getCalloutDetailsCodegen(filteredCallout[0]?.id);
  return colloutDetails?.data?.lookup?.callout;
};

export const createOpportunityForChallengeCodegen = async (
  opportunityName: string
) => {
  const responseOpportunity = await createOpportunityCodegen(
    opportunityName,
    `opp-${uniqueId}`,
    entitiesId.challengeId
  );

  entitiesId.opportunityId = responseOpportunity.data?.createSubspace.id ?? '';
  entitiesId.opportunityNameId =
    responseOpportunity.data?.createSubspace.nameID ?? '';
  entitiesId.opportunityCommunityId =
    responseOpportunity.data?.createSubspace.community?.id ?? '';
  entitiesId.opportunityCommunicationId =
    responseOpportunity.data?.createSubspace.community?.communication?.id ?? '';
  entitiesId.opportunityUpdatesId =
    responseOpportunity.data?.createSubspace.community?.communication?.updates
      .id ?? '';
  entitiesId.opportunityCollaborationId =
    responseOpportunity.data?.createSubspace.collaboration?.id ?? '';
  entitiesId.opportunityContextId =
    responseOpportunity.data?.createSubspace.context?.id ?? '';
  const postCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'news'
  );
  entitiesId.opportunityCalloutId = postCallout?.id ?? '';

  const whiteboardCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'needs'
  );
  entitiesId.opportunityWhiteboardCalloutId =
    whiteboardCallout?.contributionDefaults?.id ?? '';

  const discussionCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunityId,
    'general-chat'
  );
  entitiesId.opportunityDiscussionCalloutId = discussionCallout?.id ?? '';
  entitiesId.opportunityDiscussionCalloutCommentsId =
    discussionCallout?.comments?.id ?? '';
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
  await createUserCodegen({
    firstName: 'space',
    lastName: 'mem',
    email: spaceMemberEmail,
  });
  await createUserCodegen({
    firstName: 'chal',
    lastName: 'mem',
    email: challengeMemberEmal,
  });
  await createUserCodegen({
    firstName: 'opp',
    lastName: 'mem',
    email: opportunityMemberEmail,
  });

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
