import { testConfiguration } from '../config/test.configuration';
import { getSdk } from '../core/generated/graphql';
import { GraphQLClient } from 'graphql-request';

let graphqlSdkClient: ReturnType<typeof getSdk>;

export const getGraphqlClient = () => {
  if (!graphqlSdkClient) {
    const graphqlClient = new GraphQLClient(
      testConfiguration.endPoints.graphql.private
    );
    graphqlSdkClient = getSdk(graphqlClient);
  }
  return graphqlSdkClient;
};
