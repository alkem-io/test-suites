import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createTestSpaceCodegen,
  getSpaceDataCodegen,
} from '../../functional-api/journey/space/space.request.params';
import { getCalloutsDataCodegen } from '../../functional-api/callout/callouts.request.params';
import { createOrganizationCodegen } from '../../functional-api/organization/organization.request.params';
import { createUserCodegen } from '../../functional-api/user-management/user.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { createChallengeCodegen } from '../mutations/journeys/challenge';
import { CommunityRole } from '@alkemio/client-lib';
import { createOpportunityCodegen } from '../mutations/journeys/opportunity';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/roles/roles-request.params';

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
  const spaceData = responseEco.data?.createSpace;
  entitiesId.spaceId = spaceData?.id ?? '';
  entitiesId.spaceCommunityId = spaceData?.community?.id ?? '';
  entitiesId.spaceCommunicationId =
    spaceData?.community?.communication?.id ?? '';

  entitiesId.spaceUpdatesId =
    spaceData?.community?.communication?.updates.id ?? '';
  entitiesId.spaceContextId = spaceData?.context?.id ?? '';
  entitiesId.spaceProfileId = spaceData?.profile?.id ?? '';

  entitiesId.spaceCollaborationId = spaceData?.collaboration?.id ?? '';

  const postCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'proposals'
  );
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
  const challengeData = responseChallenge.data?.createChallenge;
  entitiesId.challengeId = challengeData?.id ?? '';
  entitiesId.challengeNameId = challengeData?.nameID ?? '';
  entitiesId.challengeCommunityId = challengeData?.community?.id ?? '';
  entitiesId.challengeCommunicationId =
    challengeData?.community?.communication?.id ?? '';
  entitiesId.challengeUpdatesId =
    challengeData?.community?.communication?.updates.id ?? '';
  entitiesId.challengeCollaborationId = challengeData?.collaboration?.id ?? '';
  entitiesId.challengeContextId = challengeData?.context?.id ?? '';
  entitiesId.challengeProfileId = challengeData?.profile?.id ?? '';
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
