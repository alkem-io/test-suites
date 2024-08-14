import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { createSpaceAndGetData } from '../../functional-api/journey/space/space.request.params';
import {
  createCalloutOnCollaborationCodegen,
  createWhiteboardCalloutOnCollaborationCodegen,
  getCalloutDetailsCodegen,
  getCollaborationCalloutsDataCodegen,
  updateCalloutVisibilityCodegen,
} from '../../functional-api/callout/callouts.request.params';
import { createOrganizationCodegen } from '../../functional-api/organization/organization.request.params';
import { createUserCodegen } from '../../functional-api/user-management/user.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { createChallengeCodegen } from '../mutations/journeys/challenge';
import { createOpportunityCodegen } from '../mutations/journeys/opportunity';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/roles/roles-request.params';
import {
  CalloutType,
  CalloutVisibility,
  CommunityRole,
} from '@test/generated/alkemio-schema';
import { TestUser } from '../token.helper';
import { delay } from '../delay';

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
  entitiesId.organization.agentId =
    responseOrg.data?.createOrganization.agent.id ?? '';
  entitiesId.organization.id = responseOrg.data?.createOrganization.id ?? '';
  entitiesId.organization.verificationId =
    responseOrg.data?.createOrganization.verification.id ?? '';
  entitiesId.organization.profileId =
    responseOrg.data?.createOrganization.profile.id ?? '';
  entitiesId.organization.displayName =
    responseOrg.data?.createOrganization.profile.displayName ?? '';
  entitiesId.organization.nameId =
    responseOrg.data?.createOrganization.nameID ?? '';

  const responseEco = await createSpaceAndGetData(
    spaceName,
    spaceNameId,
    entitiesId.organization.id
  );
  const spaceData = responseEco.data?.space;
  entitiesId.accountId = spaceData?.account.id ?? '';
  entitiesId.spaceId = spaceData?.id ?? '';

  entitiesId.space.communityId = spaceData?.community?.id ?? '';
  entitiesId.space.communicationId =
    spaceData?.community?.communication?.id ?? '';

  entitiesId.space.updatesId =
    spaceData?.community?.communication?.updates.id ?? '';
  entitiesId.space.contextId = spaceData?.context?.id ?? '';
  entitiesId.space.profileId = spaceData?.profile?.id ?? '';
  entitiesId.space.collaborationId = spaceData?.collaboration?.id ?? '';

  entitiesId.space.innovationFlowTemplateChId =
    spaceData?.account.library?.innovationFlowTemplates[0].id ?? '';
  entitiesId.space.innovationFlowTemplateOppId =
    spaceData?.account.library?.innovationFlowTemplates[0].id ?? '';
  entitiesId.space.templateSetId = spaceData?.account.library?.id ?? '';

  const callForPostCalloutData = await createCalloutOnCollaborationCodegen(
    entitiesId.space.collaborationId,
    {
      framing: {
        profile: {
          displayName: 'callForPostCalloutData-Initial',
          description: 'Aspect - initial',
        },
      },
      type: CalloutType.PostCollection,
    }
  );

  entitiesId.space.calloutId =
    callForPostCalloutData?.data?.createCalloutOnCollaboration?.id ?? '';

  await updateCalloutVisibilityCodegen(
    entitiesId.space.calloutId,
    CalloutVisibility.Published
  );

  const whiteboardCalloutData = await createWhiteboardCalloutOnCollaborationCodegen(
    entitiesId.space.collaborationId,
    {
      framing: {
        profile: {
          displayName: 'whiteboard callout space-Initial',
          description: 'Whiteboard - initial',
        },
      },
      type: CalloutType.WhiteboardCollection,
    },
    TestUser.GLOBAL_ADMIN
  );

  entitiesId.space.whiteboardCalloutId =
    whiteboardCalloutData?.data?.createCalloutOnCollaboration?.id ?? '';

  await updateCalloutVisibilityCodegen(
    entitiesId.space.whiteboardCalloutId,
    CalloutVisibility.Published
  );

  const discussionCallout = await getDefaultSpaceCalloutByNameIdCodegen(
    entitiesId.spaceId,
    'cleaning-up'
  );
  entitiesId.space.discussionCalloutId =
    discussionCallout?.data?.lookup?.callout?.id ?? '';
  entitiesId.space.discussionCalloutCommentsId =
    discussionCallout.data?.lookup?.callout?.comments?.id ?? '';

  entitiesId.space.templateId =
    responseEco.data?.space.account.library?.innovationFlowTemplates[0].id ??
    '';
};

export const getDefaultSpaceCalloutByNameIdCodegen = async (
  collaborationId: string,
  nameID: string
) => {
  delay(100);
  const calloutsPerSpace = await getCollaborationCalloutsDataCodegen(
    (collaborationId = entitiesId.space.collaborationId)
  );

  const allCallouts =
    calloutsPerSpace.data?.lookup.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );

  const colloutDetails = await getCalloutDetailsCodegen(filteredCallout[0].id);
  return colloutDetails;
};

export const assignUsersToSpaceAndOrgAsMembersCodegen = async () => {
  const usersToAssign: string[] = [
    users.spaceAdmin.id,
    users.spaceMember.id,
    users.challengeAdmin.id,
    users.challengeMember.id,
    users.opportunityAdmin.id,
    users.opportunityMember.id,
  ];
  for (const user of usersToAssign) {
    await assignCommunityRoleToUserCodegen(
      user,
      entitiesId.space.communityId,
      CommunityRole.Member
    );
  }
};

export const assignUsersToSpaceAndOrgCodegen = async () => {
  await assignUsersToSpaceAndOrgAsMembersCodegen();
  await assignCommunityRoleToUserCodegen(
    users.spaceAdmin.id,
    entitiesId.space.communityId,
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
  entitiesId.challenge.id = subspaceData?.id ?? '';
  entitiesId.challenge.nameId = subspaceData?.nameID ?? '';
  entitiesId.challenge.communityId = subspaceData?.community?.id ?? '';
  entitiesId.challenge.communicationId =
    subspaceData?.community?.communication?.id ?? '';
  entitiesId.challenge.updatesId =
    subspaceData?.community?.communication?.updates.id ?? '';
  entitiesId.challenge.collaborationId = subspaceData?.collaboration?.id ?? '';
  entitiesId.challenge.contextId = subspaceData?.context?.id ?? '';
  entitiesId.challenge.profileId = subspaceData?.profile?.id ?? '';
  const postCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.challenge.id,
    'news'
  );
  entitiesId.challenge.calloutId = postCallout?.data?.lookup?.callout?.id ?? '';

  const whiteboardCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,

    entitiesId.challenge.id,
    'stakeholder-map'
  );
  entitiesId.challenge.whiteboardCalloutId =
    whiteboardCallout?.data?.lookup?.callout?.id ?? '';

  const discussionCallout = await getDefaultChallengeCalloutByNameIdCodegen(
    entitiesId.spaceId,

    entitiesId.challenge.id,
    'general-chat'
  );
  entitiesId.challenge.discussionCalloutId =
    discussionCallout?.data?.lookup?.callout?.id ?? '';
  entitiesId.challenge.discussionCalloutCommentsId =
    discussionCallout?.data?.lookup?.callout?.comments?.id ?? '';
};

export const getDefaultChallengeCalloutByNameIdCodegen = async (
  spaceId: string,
  collaborationId: string,
  nameID: string
) => {
  const calloutsPerCollaboration = await getCollaborationCalloutsDataCodegen(
    (collaborationId = entitiesId.challenge.collaborationId)
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
    users.challengeAdmin.id,
    users.challengeMember.id,
    users.opportunityAdmin.id,
    users.opportunityMember.id,
  ];
  for (const user of usersToAssign) {
    await assignCommunityRoleToUserCodegen(
      user,
      entitiesId.challenge.communityId,
      CommunityRole.Member
    );
  }
};

export const assignUsersToChallengeCodegen = async () => {
  await assignUsersToChallengeAsMembersCodegen();

  await assignCommunityRoleToUserCodegen(
    users.challengeAdmin.id,
    entitiesId.challenge.communityId,
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
    (collaborationId = entitiesId.opportunity.collaborationId)
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
    entitiesId.challenge.id
  );

  entitiesId.opportunity.id = responseOpportunity.data?.createSubspace.id ?? '';
  entitiesId.opportunity.nameId =
    responseOpportunity.data?.createSubspace.nameID ?? '';
  entitiesId.opportunity.communityId =
    responseOpportunity.data?.createSubspace.community?.id ?? '';
  entitiesId.opportunity.communicationId =
    responseOpportunity.data?.createSubspace.community?.communication?.id ?? '';
  entitiesId.opportunity.updatesId =
    responseOpportunity.data?.createSubspace.community?.communication?.updates
      .id ?? '';
  entitiesId.opportunity.collaborationId =
    responseOpportunity.data?.createSubspace.collaboration?.id ?? '';
  entitiesId.opportunity.contextId =
    responseOpportunity.data?.createSubspace.context?.id ?? '';
  const postCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunity.id,
    'news'
  );
  entitiesId.opportunity.calloutId = postCallout?.id ?? '';

  const whiteboardCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunity.id,
    'stakeholder-map'
  );
  entitiesId.opportunity.whiteboardCalloutId =
    whiteboardCallout?.contributionDefaults?.id ?? '';

  const discussionCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
    entitiesId.spaceId,
    entitiesId.opportunity.id,
    'general-chat'
  );
  entitiesId.opportunity.discussionCalloutId = discussionCallout?.id ?? '';
  entitiesId.opportunity.discussionCalloutCommentsId =
    discussionCallout?.comments?.id ?? '';
};

export const assignUsersToOpportunityAsMembersCodegen = async () => {
  const usersToAssign: string[] = [
    users.opportunityAdmin.id,
    users.opportunityMember.id,
  ];
  for (const user of usersToAssign) {
    await assignCommunityRoleToUserCodegen(
      user,
      entitiesId.opportunity.communityId,
      CommunityRole.Member
    );
  }
};

export const assignUsersToOpportunityCodegen = async () => {
  await assignUsersToOpportunityAsMembersCodegen();
  await assignCommunityRoleToUserCodegen(
    users.opportunityAdmin.id,
    entitiesId.opportunity.communityId,
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
    entitiesId.space.communityId,
    CommunityRole.Member
  );
  await assignCommunityRoleToUserCodegen(
    challengeMemberEmal,
    entitiesId.space.communityId,
    CommunityRole.Member
  );
  await assignCommunityRoleToUserCodegen(
    opportunityMemberEmail,
    entitiesId.space.communityId,
    CommunityRole.Member
  );

  // Assign users to Challenge community
  await assignCommunityRoleToUserCodegen(
    opportunityMemberEmail,
    entitiesId.challenge.communityId,
    CommunityRole.Member
  );
  await assignCommunityRoleToUserCodegen(
    challengeMemberEmal,
    entitiesId.challenge.communityId,
    CommunityRole.Member
  );

  // Assign users to Opportunity community
  await assignCommunityRoleToUserCodegen(
    opportunityMemberEmail,
    entitiesId.opportunity.communityId,
    CommunityRole.Member
  );
};
