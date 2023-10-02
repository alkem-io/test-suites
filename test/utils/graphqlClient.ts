import dotenv from 'dotenv';
import { GraphQLClient } from 'graphql-request';
import { getSdk } from '../generated/graphql';

dotenv.config();

const apiEndpointPrivateGraphql =
  process.env.ALKEMIO_SERVER ??
  'http://localhost:3000/api/private/non-interactive/graphql';

const graphqlClient = new GraphQLClient(apiEndpointPrivateGraphql);
const graphqlSdkClient = getSdk(graphqlClient);

export const getGraphqlClient = () => {
  return graphqlSdkClient;
};
