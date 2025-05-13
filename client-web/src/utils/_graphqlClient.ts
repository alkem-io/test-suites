import { getSdk } from '@src/core/generated/graphql';
import dotenv from 'dotenv';
import { GraphQLClient } from 'graphql-request';

dotenv.config();

const apiEndpointPrivateGraphql =
  process.env.ALKEMIO_SERVER ??
  'http://localhost:3000/api/private/non-interactive/graphql';

const graphqlClient = new GraphQLClient(apiEndpointPrivateGraphql);
const graphqlSdkClient = getSdk(graphqlClient);

export const getGraphqlClient = () => {
  return graphqlSdkClient;
};
