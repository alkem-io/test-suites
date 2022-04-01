import request from 'supertest';
import { FlowMessage, KratosFlow, KratosRegistrationParams } from '../../types';
import { kratosDomain, kratosRegistrationFlowEndpoint } from '../../const';
import { sendKratosFlow } from './send-kratos-flow';

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
export const registerInKratosOrFail = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
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

const getKratosRegistrationFlow = async () =>
  request(kratosDomain + kratosRegistrationFlowEndpoint)
    .get('')
    .set('Accept', 'application/json')
    .then(x => x.body as KratosFlow);

export const registerUserInKratos = async (
  actionUrl: string,
  params: KratosRegistrationParams
) => sendKratosFlow(actionUrl, params);
