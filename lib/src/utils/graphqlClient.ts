import { testConfiguration } from '@src/config/test.configuration';
import { getSdk } from '@src/core/generated/graphql';
import { GraphQLClient } from 'graphql-request';

const graphqlClient = new GraphQLClient(testConfiguration.endPoints.graphql.private);
const graphqlSdkClient = getSdk(graphqlClient);

export const getGraphqlClient = () => {
  return graphqlSdkClient;
};
