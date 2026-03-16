import { Configuration, IdentityApi, FrontendApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';

/***
 * Registration Flow — single-step password registration.
 * Creates a native registration flow, then submits traits + password
 * in one call using the "password" method.
 *
 * Exception can be thrown on
 * <ul>
 *  <li>User already exists (error ID 4000007)</li>
 *  <li>Some other error</li>
 * </ul>
 *
 * @see https://www.ory.sh/docs/kratos/self-service/flows/user-registration
 */
export const registerInKratosOrFail = async (
  firstName: string,
  lastName: string,
  email: string
) => {
  const kratosConfig = new Configuration({
    basePath: testConfiguration.endPoints.kratos.public,
    baseOptions: {
      withCredentials: true, // Important for CORS
      timeout: 30000, // 30 seconds
    },
  });
  const ory = {
    identity: new IdentityApi(kratosConfig),
    frontend: new FrontendApi(kratosConfig),
  };

  const traits = {
    email: email,
    accepted_terms: true,
    name: {
      first: firstName,
      last: lastName,
    },
  };

  // create registration flow
  const {
    data: { id: flowId },
  } = await ory.frontend.createNativeRegistrationFlow();

  // submit traits + password in a single step
  await ory.frontend.updateRegistrationFlow({
    flow: flowId,
    updateRegistrationFlowBody: {
      method: 'password',
      password: testConfiguration.identities.admin.password,
      traits,
    },
  });
};
