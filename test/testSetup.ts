import { config } from 'dotenv';
import request from 'supertest';
import { AlkemioClient } from '@alkemio/client-lib';
import { TestUser } from './utils/token.helper';
import { getMails } from './utils/mailslurper.rest.requests';
import { userData } from './utils/common-params';

config({ path: '.env' });

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const kratosDomain =
  'http://localhost:3000/identity/ory/kratos/public/self-service';
const kratosRegistrationFlowEndpoint = '/registration/api';
const kratosVerificationFlowEndpoint = '/verification/api';

const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const SERVER_URL = process.env.ALKEMIO_SERVER_URL;

type KratosFlow = {
  id: string;
  type: 'api';
  expires_at: string; // Date
  issued_at: string; // Date
  request_url: string;
  ui: {
    action: string;
    method: 'POST';
    nodes: KratosUiNode[];
  };
  messages?: FlowMessage[];
};

type FlowMessage = {
  id: string;
  text: string;
  type: 'error' | 'info';
  context: Record<string, unknown>;
};

type KratosUiNode = {
  type: 'input';
  group: string;
  attributes: UiNodeAttributes;
  messages: [];
  meta: Record<string, string>;
};

type UiNodeAttributes = {
  name: string;
  type: string;
  value?: string;
  required: boolean;
  disabled: boolean;
  node_type: string;
};

type KratosRegistrationParams = {
  'traits.email': string;
  'traits.name.first': string;
  'traits.name.last': string;
  'traits.accepted_terms': boolean;
  password: string;
  method: 'password';
};

type KratosVerificationParams = {
  email: string;
  method: 'link';
};

module.exports = async () => {
  // get all user names to register
  // exclude GLOBAL_ADMIN as he already is created and verified
  // and it's used to create the the users
  const userNames = Object.values(TestUser).filter(
    x => x !== TestUser.GLOBAL_ADMIN
  );
  for (const userName of userNames) {
    const [firstName, lastName] = getUserName(userName);
    const email = `${userName}@alkem.io`;

    try {
      await registerInKratosOrFail(firstName, lastName, email);
    } catch (e) {
      const err = e as Error;
      if (err.message.indexOf('exists already') > -1) {
        console.warn(`Skipping already registered user ${email}`);
        continue;
      } else {
        throw new Error(err.message);
      }
    }
    console.info(`User ${email} registered in Kratos`);
    await verifyInKratosOrFail(email);
    console.info(`User ${email} verified`);
    await registerInAlkemioOrFail(firstName, lastName, email);
    console.info(`User ${email} registered in Alkemio`);
  }
};

/***
 * Registration Flow on v0.8.0-alpha3
 * 1. AJAX call to request a registration flow
 * 2. AJAX call submit the data need for the registration flow in the body
 * and flowId in the URL params
 * 3. After a successful registration you will receive a session_token in the response
 * 4. If an error occurred after submit, a 'messages' field
 * will be attached to the body of the flow in the response with the errors
 *
 * Exception can be thrown on
 * <ul>
 *  <li>User already exists</li>
 *  <li>Some other error</li>
 * </ul>
 *
 * @see https://www.ory.sh/docs/kratos/self-service/flows/user-registration#registration-for-api-clients-and-clients-without-browsers
 */
const registerInKratosOrFail = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  // get registration flow
  const flow = await getKratosRegistrationFlow();
  // the action url to complete the flow with
  const registerActionUrl = flow.ui.action;
  // build the payload
  const registrationPayload: KratosRegistrationParams = {
    'traits.email': email,
    'traits.name.first': firstName,
    'traits.name.last': lastName,
    'traits.accepted_terms': true,
    password: PASSWORD,
    method: 'password',
  };
  // complete the flow
  const registrationResponse = await registerUserInKratos(
    registerActionUrl,
    registrationPayload
  );

  if (!registrationResponse.body.session_token) {
    const msgArray = (registrationResponse.body.ui?.messages ??
      []) as FlowMessage[];

    const existsMessage = msgArray.find(x => x.text.indexOf('exists already'));

    if (existsMessage) {
      throw new Error(existsMessage.text);
    }

    const messages: string = msgArray?.map((x: any) => x.text).join('\n');
    throw new Error(`Unable to register user '${email}': ${messages}`);
  }
};

/***
 * Verification flow on v0.8.0-alpha3
 * 1. AJAX call to request a verification flow
 * 2. AJAX call submit the data need for the verification flow in the body
 * and flowId in the URL params
 * 3. After a successful claim for a verification link
 * a message field is attached to the body of the flow, stating
 * that an email is sent to the provided email address
 * 4. GET request on the verification link in the email verifies the account
 * and the response is 303 (i'm pretty sure it has to be 200 for API clients)
 *
 * Exception can be thrown on
 * <ul>
 *  <li>Verification link expired</li>
 *  <li>Some other error</li>
 * </ul>
 *
 * @see https://www.ory.sh/docs/kratos/self-service/flows/verify-email-account-activation#verification-for-client-side-ajax-browser-clients
 */
const verifyInKratosOrFail = async (email: string) => {
  // get verification flow
  const verifyFlow = await getKratosVerificationFlow();
  // the action url to complete the flow with
  const verifyActionUrl = verifyFlow.ui.action;
  // build the payload
  const verifyPayload: KratosVerificationParams = {
    email,
    method: 'link',
  };
  const verifyResponse = await verificationLinkClaim(
    verifyActionUrl,
    verifyPayload
  );

  const verifyMessages = (verifyResponse.body.ui?.messages ??
    []) as FlowMessage[];
  const isLinkSent = !!verifyMessages.find(
    x => x.text.indexOf('verification link has been sent') > -1
  );

  if (!isLinkSent) {
    const expireMsg = verifyMessages.find(x => x.text.indexOf('flow expired'));

    if (expireMsg) {
      throw new Error(expireMsg.text);
    }

    const messages = verifyMessages.map(x => x.text).join('\n');
    throw new Error(`Link is not sent for user '${email}: ${messages}'`);
  }

  // wait for the email to be sent
  await delay(2500);
  const verificationLink = await getVerificationLink();

  if (!verificationLink) {
    throw new Error(`Unable to fetch verification link for user '${email}'`);
  }

  const isVerified = await verifyAccount(verificationLink);
  if (!isVerified) {
    throw new Error(`Unable to verify user from link for user '${email}'`);
  }
};
const registerInAlkemioOrFail = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const userResponse = await createUserInit(firstName, lastName, email);

  if (!userResponse.body.data.createUser.id) {
    throw new Error(`Unable to register user in Alkemio for user '${email}'`);
  }
};

const getKratosRegistrationFlow = async () =>
  request(kratosDomain + kratosRegistrationFlowEndpoint)
    .get('')
    .set('Accept', 'application/json')
    .then(x => x.body as KratosFlow);

const registerUserInKratos = async (
  actionUrl: string,
  params: KratosRegistrationParams
) => sendFlow(actionUrl, params);

const getKratosVerificationFlow = async () =>
  request(kratosDomain + kratosVerificationFlowEndpoint)
    .get('')
    .set('Accept', 'application/json')
    .then(x => x.body as KratosFlow);

const verificationLinkClaim = async (
  actionUrl: string,
  params: KratosVerificationParams
) => sendFlow(actionUrl, params);

const sendFlow = async (actionUrl: string, params: Record<string, unknown>) =>
  request(actionUrl)
    .post('')
    .set('Accept', 'application/json')
    .send(params);

const getVerificationLink = async () =>
  getMails()
    .then(x => x.body.mailItems[0].body as string)
    .then(x => {
      const urlRegex = /(((https?:\/\/)|(https:\/\/)|(www\.))[^\s]+)/g;
      const cleanText = x.replace(/<.*?>/gm, '');
      const url = cleanText.match(urlRegex)?.[0]?.toString() ?? '';
      return url.replace('&amp;', '&');
    });

const verifyAccount = async (verificationLink: string): Promise<boolean> =>
  request(verificationLink)
    .get('')
    .set('Accept', 'application/json')
    // i'm pretty sure it has to be 200 for API clients
    .then(x => x.status === 303);

const getUserName = (userName: string): [string, string] => {
  const [first, last] = userName.split('.');
  return [first, last];
};

const getAdminToken = async () => {
  const server = process.env.ALKEMIO_SERVER || '';

  if (!server) {
    throw new Error('server url not provided');
  }

  const identifier = `${TestUser.GLOBAL_ADMIN}@alkem.io`;

  const alkemioClientConfig = {
    apiEndpointPrivateGraphql: server,
    authInfo: {
      credentials: {
        email: identifier,
        password: PASSWORD,
      },
    },
  };

  const alkemioClient = new AlkemioClient(alkemioClientConfig);
  await alkemioClient.enableAuthentication();

  return alkemioClient.apiToken;
};

const createUserInit = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData}  }}`,
    variables: {
      userData: {
        firstName,
        lastName,
        email,
        nameID: firstName + lastName,
        displayName: firstName + lastName,
      },
    },
  };

  const adminToken = await getAdminToken();

  return await request(SERVER_URL)
    .post('')
    .send({ ...requestParams })
    .set('Accept', 'application/json')
    .set('Authorization', `Bearer ${adminToken}`);
};
