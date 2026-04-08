import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const convertSpaceL1ToSpaceL0 = async (
  spaceL1ID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.ConvertSpaceL1ToSpaceL0(
      {
        convertData: {
          spaceL1ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const convertSpaceL2ToSpaceL1 = async (
  spaceL2ID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.ConvertSpaceL2ToSpaceL1(
      {
        convertData: {
          spaceL2ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const moveSpaceL1ToSpaceL0 = async (
  spaceL1ID: string,
  targetSpaceL0ID: string,
  options?: {
    autoInvite?: boolean;
    invitationMessage?: string;
  },
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.MoveSpaceL1ToSpaceL0(
      {
        moveData: {
          spaceL1ID,
          targetSpaceL0ID,
          ...(options?.autoInvite !== undefined && {
            autoInvite: options.autoInvite,
          }),
          ...(options?.invitationMessage !== undefined && {
            invitationMessage: options.invitationMessage,
          }),
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const moveSpaceL1ToSpaceL2 = async (
  spaceL1ID: string,
  targetSpaceL1ID: string,
  options?: {
    autoInvite?: boolean;
    invitationMessage?: string;
  },
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.MoveSpaceL1ToSpaceL2(
      {
        moveData: {
          spaceL1ID,
          targetSpaceL1ID,
          ...(options?.autoInvite !== undefined && {
            autoInvite: options.autoInvite,
          }),
          ...(options?.invitationMessage !== undefined && {
            invitationMessage: options.invitationMessage,
          }),
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};
