import { AlkemioClient } from '@alkemio/client-lib';
import { TestUser } from '@test/utils';
import { PathLike } from 'fs';

const server = process.env.ALKEMIO_SERVER || '';
const kratos = process.env.KRATOS_ENDPOINT || '';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';

const generateClientConfig = (user: TestUser) => ({
  apiEndpointPrivateGraphql: server,
  authInfo: {
    credentials: {
      email: `${user}@alkem.io`,
      password: password,
    },
    kratosPublicApiEndpoint: kratos,
  },
});

export const uploadFileOnRef = async (
  path: PathLike,
  refId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const alkemioClient = new AlkemioClient(generateClientConfig(userRole));
  await alkemioClient.enableAuthentication();

  const a = await alkemioClient.uploadFileOnReference(path, refId);

  console.log(a);
};
