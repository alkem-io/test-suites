import dotenv from 'dotenv';
import { GraphQLClient } from 'graphql-request';
import { getSdk, Sdk } from '../generated/graphql';

export type UserCredentials = { email: string; password: string };
export type AuthInfo = {
  credentials: UserCredentials;
  kratosPublicApiEndpoint: string;
};

dotenv.config();

const server =
  process.env.API_ENDPOINT_PRIVATE_GRAPHQL ||
  'http://localhost:3000/api/private/non-interactive/graphql';

const config = {
  apiEndpointPrivateGraphql: server,
  authInfo: {
    credentials: {
      email: process.env.AUTH_ADMIN_EMAIL ?? 'admin@alkem.io',
      password: process.env.AUTH_ADMIN_PASSWORD ?? 'test',
    },
    kratosPublicApiEndpoint: 'http://localhost:3000/ory/kratos/public/',
  },
  loggingEnabled: process.env.GRAPHQL_CLIENT_LOGING ?? false,
};

const graphqlClient = new GraphQLClient(config.apiEndpointPrivateGraphql);
const graphqlSdkClient = getSdk(graphqlClient);

export const getGraphqlClient = async (): Promise<Sdk> => {
  return graphqlSdkClient;
};
