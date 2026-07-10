import { testConfiguration } from '../config/test.configuration';
import { getSdk, Sdk } from '../core/generated/graphql';
import { GraphQLClient } from 'graphql-request';

let graphqlSdkClient: Sdk;

export const getGraphqlClient = (): Sdk => {
  if (!graphqlSdkClient) {
    const graphqlClient = new GraphQLClient(
      testConfiguration.endPoints.graphql.private
    );
    graphqlSdkClient = getSdk(graphqlClient);
  }
  return graphqlSdkClient;
};
