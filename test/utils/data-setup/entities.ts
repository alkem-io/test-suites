import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { createSpaceAndGetData } from '../../functional-api/journey/space/space.request.params';
import { createUser } from '../../functional-api/contributor-management/user/user.request.params';
import { createOpportunity } from '../mutations/journeys/opportunity';
import { assignRoleToUser } from '@test/functional-api/roleset/roles-request.params';
import {
  CalloutType,
  CalloutVisibility,
  CommunityRoleType,
} from '@test/generated/alkemio-schema';
import { TestUser } from '../token.helper';
import { delay } from '../delay';
import { createOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { entitiesId } from '@test/types/entities-helper';
import {
  createCalloutOnCollaboration,
  createWhiteboardCalloutOnCollaboration,
  getCalloutDetails,
  getCollaborationCalloutsData,
  updateCalloutVisibility,
} from '@test/functional-api/callout/callouts.request.params';
import { createChallenge } from '../mutations/journeys/challenge';

export const createOrgAndSpace = async (
  organizationName: string,
  hostNameId: string,
  spaceName: string,
  spaceNameId: string
) => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  entitiesId.organization.agentId =
    responseOrg.data?.createOrganization.agent.id ?? '';
  entitiesId.organization.accountId =
    responseOrg.data?.createOrganization.account?.id ?? '';
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
    entitiesId.organization.accountId
  );
  const spaceData = responseEco.data?.space;
  entitiesId.accountId = spaceData?.account.id ?? '';
  entitiesId.spaceId = spaceData?.id ?? '';

  entitiesId.space.communityId = spaceData?.community?.id ?? '';
  entitiesId.space.roleSetId = spaceData?.community?.roleSet?.id ?? '';

  entitiesId.space.communicationId =
    spaceData?.community?.communication?.id ?? '';

  entitiesId.space.updatesId =
    spaceData?.community?.communication?.updates.id ?? '';
  entitiesId.space.contextId = spaceData?.context?.id ?? '';
  entitiesId.space.profileId = spaceData?.profile?.id ?? '';
  entitiesId.space.collaborationId = spaceData?.collaboration?.id ?? '';
  entitiesId.space.templateSetId =
    spaceData?.templatesManager?.templatesSet?.id ?? '';
    console.log(entitiesId.space.templateSetId)

  const callForPostCalloutData = await createCalloutOnCollaboration(
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

  await updateCalloutVisibility(
    entitiesId.space.calloutId,
    CalloutVisibility.Published
  );

  const whiteboardCalloutData = await createWhiteboardCalloutOnCollaboration(
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

  await updateCalloutVisibility(
    entitiesId.space.whiteboardCalloutId,
    CalloutVisibility.Published
  );

  const creatPostCallout = await createCalloutOnCollaboration(
    entitiesId.space.collaborationId,
    {
      framing: {
        profile: { displayName: 'Space Post Callout' },
      },
    }
  );
  const postCalloutData = creatPostCallout.data?.createCalloutOnCollaboration;

  entitiesId.space.discussionCalloutId = postCalloutData?.id ?? '';
  entitiesId.space.discussionCalloutCommentsId =
    postCalloutData?.comments?.id ?? '';
  await updateCalloutVisibility(
    entitiesId.space.discussionCalloutId,
    CalloutVisibility.Published
  );
};

export const getDefaultSpaceCalloutByNameId = async (
  collaborationId: string,
  nameID: string
) => {
  delay(100);
  const calloutsPerSpace = await getCollaborationCalloutsData(
    (collaborationId = entitiesId.space.collaborationId)
  );

  const allCallouts =
    calloutsPerSpace.data?.lookup.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );

  const colloutDetails = await getCalloutDetails(filteredCallout[0].id);
  return colloutDetails;
};

export const assignUsersToSpaceAndOrgAsMembers = async () => {
  const usersIdsToAssign: string[] = [
    users.spaceAdmin.id,
    users.spaceMember.id,
    users.challengeAdmin.id,
    users.challengeMember.id,
    users.opportunityAdmin.id,
    users.opportunityMember.id,
  ];
  for (const userId of usersIdsToAssign) {
    await assignRoleToUser(
      userId,
      entitiesId.space.roleSetId,
      CommunityRoleType.Member
    );
  }
};

export const assignUsersToSpaceAndOrg = async () => {
  await assignUsersToSpaceAndOrgAsMembers();
  await assignRoleToUser(
    users.spaceAdmin.id,
    entitiesId.space.roleSetId,
    CommunityRoleType.Admin
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
  const responseChallenge = await createChallenge(
    challengeName,
    `chnameid${uniqueId}`,
    entitiesId.spaceId
  );

  const subspaceData = responseChallenge.data?.createSubspace;
  entitiesId.challenge.id = subspaceData?.id ?? '';
  entitiesId.challenge.nameId = subspaceData?.nameID ?? '';
  entitiesId.challenge.communityId = subspaceData?.community?.id ?? '';
  entitiesId.challenge.roleSetId = subspaceData?.community?.roleSet?.id ?? '';
  entitiesId.challenge.communicationId =
    subspaceData?.community?.communication?.id ?? '';
  entitiesId.challenge.updatesId =
    subspaceData?.community?.communication?.updates.id ?? '';
  entitiesId.challenge.collaborationId = subspaceData?.collaboration?.id ?? '';
  entitiesId.challenge.contextId = subspaceData?.context?.id ?? '';
  entitiesId.challenge.profileId = subspaceData?.profile?.id ?? '';
  const callForPostCalloutData = await createCalloutOnCollaboration(
    entitiesId.challenge.collaborationId,
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

  entitiesId.challenge.calloutId =
    callForPostCalloutData?.data?.createCalloutOnCollaboration?.id ?? '';

  await updateCalloutVisibility(
    entitiesId.challenge.calloutId,
    CalloutVisibility.Published
  );

  const whiteboardCalloutData = await createWhiteboardCalloutOnCollaboration(
    entitiesId.challenge.collaborationId,
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

  entitiesId.challenge.whiteboardCalloutId =
    whiteboardCalloutData?.data?.createCalloutOnCollaboration?.id ?? '';

  await updateCalloutVisibility(
    entitiesId.challenge.whiteboardCalloutId,
    CalloutVisibility.Published
  );

  const creatPostCallout = await createCalloutOnCollaboration(
    entitiesId.challenge.collaborationId,
    {
      framing: {
        profile: { displayName: 'Challenge Post Callout' },
      },
    }
  );
  const postCalloutData = creatPostCallout.data?.createCalloutOnCollaboration;

  entitiesId.challenge.discussionCalloutId = postCalloutData?.id ?? '';
  entitiesId.challenge.discussionCalloutCommentsId =
    postCalloutData?.comments?.id ?? '';
  await updateCalloutVisibility(
    entitiesId.challenge.discussionCalloutId,
    CalloutVisibility.Published
  );
};

export const getDefaultChallengeCalloutByNameId = async (
  spaceId: string,
  collaborationId: string,
  nameID: string
) => {
  const calloutsPerCollaboration = await getCollaborationCalloutsData(
    (collaborationId = entitiesId.challenge.collaborationId)
  );
  const allCallouts =
    calloutsPerCollaboration.data?.lookup?.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );
  const colloutDetails = await getCalloutDetails(filteredCallout[0]?.id);
  return colloutDetails;
};

export const assignUsersToChallengeAsMembers = async () => {
  const usersIdsToAssign: string[] = [
    users.challengeAdmin.id,
    users.challengeMember.id,
    users.opportunityAdmin.id,
    users.opportunityMember.id,
  ];
  for (const userID of usersIdsToAssign) {
    await assignRoleToUser(
      userID,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Member
    );
  }
};

export const assignUsersToChallenge = async () => {
  await assignUsersToChallengeAsMembers();

  await assignRoleToUser(
    users.challengeAdmin.id,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Admin
  );
};

export const createChallengeWithUsers = async (challengeName: string) => {
  await createChallengeForOrgSpace(challengeName);
  await assignUsersToChallenge();
};

export const getDefaultOpportunityCalloutByNameId = async (
  spaceId: string,
  collaborationId: string,
  nameID: string
) => {
  const calloutsPerCollaboration = await getCollaborationCalloutsData(
    (collaborationId = entitiesId.opportunity.collaborationId)
  );

  const allCallouts =
    calloutsPerCollaboration.data?.lookup?.collaboration?.callouts ?? [];
  const filteredCallout = allCallouts.filter(
    callout => callout.nameID.includes(nameID) || callout.id === nameID
  );
  const colloutDetails = await getCalloutDetails(filteredCallout[0]?.id);
  return colloutDetails?.data?.lookup?.callout;
};

export const createOpportunityForChallenge = async (
  opportunityName: string
) => {
  const responseOpportunity = await createOpportunity(
    opportunityName,
    `opp-${uniqueId}`,
    entitiesId.challenge.id
  );

  entitiesId.opportunity.id = responseOpportunity.data?.createSubspace.id ?? '';
  entitiesId.opportunity.nameId =
    responseOpportunity.data?.createSubspace.nameID ?? '';
  entitiesId.opportunity.communityId =
    responseOpportunity.data?.createSubspace.community?.id ?? '';
  entitiesId.opportunity.roleSetId =
    responseOpportunity.data?.createSubspace.community?.roleSet.id ?? '';
  entitiesId.opportunity.communicationId =
    responseOpportunity.data?.createSubspace.community?.communication?.id ?? '';
  entitiesId.opportunity.updatesId =
    responseOpportunity.data?.createSubspace.community?.communication?.updates
      .id ?? '';
  entitiesId.opportunity.collaborationId =
    responseOpportunity.data?.createSubspace.collaboration?.id ?? '';
  entitiesId.opportunity.contextId =
    responseOpportunity.data?.createSubspace.context?.id ?? '';
  const callForPostCalloutData = await createCalloutOnCollaboration(
    entitiesId.opportunity.collaborationId,
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

  entitiesId.opportunity.calloutId =
    callForPostCalloutData?.data?.createCalloutOnCollaboration?.id ?? '';

  await updateCalloutVisibility(
    entitiesId.opportunity.calloutId,
    CalloutVisibility.Published
  );

  const whiteboardCalloutData = await createWhiteboardCalloutOnCollaboration(
    entitiesId.opportunity.collaborationId,
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

  entitiesId.opportunity.whiteboardCalloutId =
    whiteboardCalloutData?.data?.createCalloutOnCollaboration?.id ?? '';

  await updateCalloutVisibility(
    entitiesId.opportunity.whiteboardCalloutId,
    CalloutVisibility.Published
  );

  const creatPostCallout = await createCalloutOnCollaboration(
    entitiesId.opportunity.collaborationId,
    {
      framing: {
        profile: { displayName: 'Opportunity Post Callout' },
      },
    }
  );
  const postCalloutData = creatPostCallout.data?.createCalloutOnCollaboration;

  entitiesId.opportunity.discussionCalloutId = postCalloutData?.id ?? '';
  entitiesId.opportunity.discussionCalloutCommentsId =
    postCalloutData?.comments?.id ?? '';
  await updateCalloutVisibility(
    entitiesId.opportunity.discussionCalloutId,
    CalloutVisibility.Published
  );
};

export const assignUsersToOpportunityAsMembers = async () => {
  const usersToAssign: string[] = [
    users.opportunityAdmin.id,
    users.opportunityMember.id,
  ];
  for (const user of usersToAssign) {
    await assignRoleToUser(
      user,
      entitiesId.opportunity.roleSetId,
      CommunityRoleType.Member
    );
  }
};

export const assignUsersToOpportunity = async () => {
  await assignUsersToOpportunityAsMembers();
  await assignRoleToUser(
    users.opportunityAdmin.id,
    entitiesId.opportunity.roleSetId,
    CommunityRoleType.Admin
  );
};

export const createOpportunityWithUsers = async (opportunityName: string) => {
  await createOpportunityForChallenge(opportunityName);
  await assignUsersToOpportunity();
};

export const registerUsersAndAssignToAllEntitiesAsMembers = async (
  spaceMemberEmail: string,
  challengeMemberEmail: string,
  opportunityMemberEmail: string
) => {
  const createSpaceMember = await createUser({
    firstName: 'space',
    lastName: 'mem',
    email: spaceMemberEmail,
  });
  const spaceMemberId = createSpaceMember.data?.createUser.id ?? '';
  const createChallengeMember = await createUser({
    firstName: 'chal',
    lastName: 'mem',
    email: challengeMemberEmail,
  });
  const challengeMemberId = createChallengeMember.data?.createUser.id ?? '';

  const createOpportunityMember = await createUser({
    firstName: 'opp',
    lastName: 'mem',
    email: opportunityMemberEmail,
  });
  const opportunityMemberId = createOpportunityMember.data?.createUser.id ?? '';

  // Assign users to Space community
  await assignRoleToUser(
    spaceMemberId,
    entitiesId.space.roleSetId,
    CommunityRoleType.Member
  );
  await assignRoleToUser(
    challengeMemberId,
    entitiesId.space.roleSetId,
    CommunityRoleType.Member
  );
  await assignRoleToUser(
    opportunityMemberId,
    entitiesId.space.roleSetId,
    CommunityRoleType.Member
  );

  // Assign users to Challenge community
  await assignRoleToUser(
    opportunityMemberId,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Member
  );
  await assignRoleToUser(
    challengeMemberId,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Member
  );

  // Assign users to Opportunity community
  await assignRoleToUser(
    opportunityMemberId,
    entitiesId.opportunity.roleSetId,
    CommunityRoleType.Member
  );
};
