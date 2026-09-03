import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { UpdateInnovationFlowStateSettingsInput } from '@alkemio/tests-lib/core/generated/alkemio-schema';

export const getInnovationFlowStatesWithIds = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetInnovationFlowStatesWithIds(
      { spaceId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationFlowState = async (
  innovationFlowStateID: string,
  displayName?: string,
  description?: string,
  settings?: UpdateInnovationFlowStateSettingsInput,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateInnovationFlowState(
      {
        stateData: {
          innovationFlowStateID,
          ...(displayName !== undefined && { displayName }),
          ...(description !== undefined && { description }),
          ...(settings !== undefined && { settings }),
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationFlowCurrentState = async (
  innovationFlowId: string,
  currentStateID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateInnovationFlowCurrentState(
      {
        innovationFlowId,
        currentStateID,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
