import { Configuration, IdentityApi, FrontendApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';

/***
 * Registration Flow (two-step, Kratos v1.3.x)
 * 1. Create a native registration flow
 * 2. Submit traits via the "profile" method (step 1)
 * 3. Submit password via the "password" method (step 2), re-including traits
 *
 * Exception can be thrown on
 * <ul>
 *  <li>User already exists</li>
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

  // get registration flow
  const {
    data: { id: flowId },
  } = await ory.frontend.createNativeRegistrationFlow();

  // step 1: submit profile traits
  await ory.frontend.updateRegistrationFlow({
    flow: flowId,
    updateRegistrationFlowBody: {
      method: 'profile',
      traits,
    },
  });

  // step 2: submit password (traits must be re-included)
  await ory.frontend.updateRegistrationFlow({
    flow: flowId,
    updateRegistrationFlowBody: {
      method: 'password',
      password: testConfiguration.identities.admin.password,
      traits,
    },
  });
};
