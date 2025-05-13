import { AlkemioClient } from '@alkemio/client-lib';

const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
export const getUserToken = async (userEmail: string) => {
  const server = process.env.ALKEMIO_SERVER || '';

  if (!server) {
    throw new Error('server url not provided');
  }

  const alkemioClientConfig = {
    apiEndpointPrivateGraphql: server,
    authInfo: {
      credentials: {
        email: userEmail,
        password: PASSWORD,
      },
    },
  };

  const alkemioClient = new AlkemioClient(alkemioClientConfig);
  await alkemioClient.enableAuthentication();

  return alkemioClient.apiToken;
};
