import { TestUser } from '@test/utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const getUserCommunityPrivilegeCodegen = async (
  communityId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CommunityUserPrivileges(
      {
        communityId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getUserCommunityPrivilegeToOpportunityCodegen = async (
  spaceId: string,
  opportunityId: string,
  includeDetails: boolean,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CommunityUserPrivilegesToOpportunity(
      {
        spaceId,
        opportunityId,
        includeDetails,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getUserCommunityPrivilegeToChallengeCodegen = async (
  spaceId: string,
  challengeId: string,
  includeDetails: boolean,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CommunityUserPrivilegesToChallenge(
      {
        spaceId,
        challengeId,
        includeDetails,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getChallengeCommunityDataCodegen = async (
  spaceId: string,
  challengeId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getChallengeCommunity(
      {
        spaceId,
        challengeId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const dataSpaceMemberTypes = async (
  spaceId: string
): Promise<[
  any | undefined,
  any | undefined,
  any | undefined,
  any | undefined
]> => {
  const responseQuery = await getSpaceCommunityAvailableUsersDataCodegen(
    spaceId
  );

  const community = responseQuery?.data?.space?.community;

  const spaceUesrsMembers = community?.memberUsers;
  const spaceOrganizationMembers = community?.memberOrganizations;
  const spaceLeadUsers = community?.leadUsers;
  const spaceLeadOrganizations = community?.leadOrganizations;

  return [
    spaceUesrsMembers,
    spaceOrganizationMembers,
    spaceLeadUsers,
    spaceLeadOrganizations,
  ];
};

export const dataChallengeMemberTypes = async (
  spaceId: string,
  challengeId: string
): Promise<[
  any | undefined,
  any | undefined,
  any | undefined,
  any | undefined
]> => {
  const responseQuery = await getChallengeCommunityAvailableUsersDataCodegen(
    spaceId,
    challengeId
  );

  const community = responseQuery?.data?.space?.challenge?.community;
  const challengeUesrsMembers = community?.memberUsers;
  const challengeOrganizationMembers = community?.memberOrganizations;
  const challengeLeadUsers = community?.leadUsers;
  const challengeLeadOrganizations = community?.leadOrganizations;

  return [
    challengeUesrsMembers,
    challengeOrganizationMembers,
    challengeLeadUsers,
    challengeLeadOrganizations,
  ];
};

export const dataOpportunityMemberTypes = async (
  spaceId: string,
  opportunityId: string
): Promise<[
  any | undefined,
  any | undefined,
  any | undefined,
  any | undefined
]> => {
  const responseQuery = await getOpportunityCommunityAvailableUsersDataCodegen(
    spaceId,
    opportunityId
  );
  const community = responseQuery?.data?.space?.opportunity?.community;
  const opportunityUsersMembers = community?.memberUsers;
  const opportunityOrganizationMembers = community?.memberOrganizations;
  const opportunityLeadUsers = community?.leadUsers;
  const opportunityLeadOrganizations = community?.leadOrganizations;

  return [
    opportunityUsersMembers,
    opportunityOrganizationMembers,
    opportunityLeadUsers,
    opportunityLeadOrganizations,
  ];
};

export const dataSpaceAvailableMemberUsers = async (
  spaceId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const query = await getSpaceCommunityAvailableUsersDataCodegen(spaceId);

  const res = query?.data?.space?.community?.memberUsers || [];
  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

export const dataSpaceAvailableLeadUsers = async (
  spaceId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const query = await getSpaceCommunityAvailableUsersDataCodegen(spaceId);

  const res = query?.data?.space?.community?.leadUsers || [];
  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

export const dataChallengeAvailableMemberUsers = async (
  spaceId: string,
  challengeId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const query = await getChallengeCommunityAvailableUsersDataCodegen(
    spaceId,
    challengeId
  );

  const res = query?.data?.space?.challenge?.community?.memberUsers || [];
  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

export const dataChallengeAvailableLeadUsers = async (
  spaceId: string,
  challengeId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const query = await getChallengeCommunityAvailableUsersDataCodegen(
    spaceId,
    challengeId
  );

  const res = query?.data?.space?.challenge?.community?.leadUsers || [];
  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

export const dataOpportunityAvailableMemberUsers = async (
  spaceId: string,
  opportunityId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const query = await getOpportunityCommunityAvailableUsersDataCodegen(
    spaceId,
    opportunityId
  );

  const res = query?.data?.space?.opportunity?.community?.memberUsers || [];

  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

export const dataOpportunityAvailableLeadUsers = async (
  spaceId: string,
  opportunityId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const query = await getOpportunityCommunityAvailableUsersDataCodegen(
    spaceId,
    opportunityId
  );

  const res = query?.data?.space?.opportunity?.community?.leadUsers || [];
  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

export const getChallengeCommunityAvailableUsersDataCodegen = async (
  spaceId: string,
  challengeId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetChallengeAvailableMembers(
      {
        spaceId,
        challengeId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getOpportunityCommunityAvailableUsersDataCodegen = async (
  spaceId: string,
  opportunityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOpportunityAvailableMembers(
      {
        spaceId,
        opportunityId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceCommunityAvailableUsersDataCodegen = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceAvailableMembers(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
