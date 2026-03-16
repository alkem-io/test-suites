import { Configuration, IdentityApi, FrontendApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';

/***
 * Registration Flow (two-step, Kratos v1.3.x)
 * 1. Create a native registration flow
 * 2. Submit traits via the "profile" method (step 1)
 *    — Kratos returns 400 with "Please choose a credential" (expected)
 * 3. Submit password via the "password" method (step 2), re-including traits
 *
 * Falls back to single-step password registration if the profile method
 * is not supported by the deployed Kratos version.
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

  const password = testConfiguration.identities.admin.password;

  // get registration flow
  const {
    data: { id: flowId },
  } = await ory.frontend.createNativeRegistrationFlow();

  // step 1: submit profile traits
  // Kratos v1.3.x multi-step registration returns 400 after the profile
  // step with "Please choose a credential to authenticate yourself with."
  // This is expected — traits are accepted and we proceed to step 2.
  let profileStepAccepted = false;
  try {
    await ory.frontend.updateRegistrationFlow({
      flow: flowId,
      updateRegistrationFlowBody: {
        method: 'profile',
        traits,
      },
    });
    profileStepAccepted = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const messages = e.response?.data?.ui?.messages;
    const isChooseCredential =
      e.response?.status === 400 && Array.isArray(messages);
    if (isChooseCredential) {
      // Expected "choose a credential" response — continue to password step
      profileStepAccepted = true;
    } else {
      // Profile method not supported — fall back to single-step registration
      await ory.frontend.updateRegistrationFlow({
        flow: flowId,
        updateRegistrationFlowBody: {
          method: 'password',
          password,
          traits,
        },
      });
      return;
    }
  }

  // step 2: submit password (traits must be re-included)
  if (profileStepAccepted) {
    await ory.frontend.updateRegistrationFlow({
      flow: flowId,
      updateRegistrationFlowBody: {
        method: 'password',
        password,
        traits,
      },
    });
  }
};
