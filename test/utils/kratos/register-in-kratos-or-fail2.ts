import { kratosDomain } from '../../const';
import {
  Configuration,
  OAuth2Api,
  IdentityApi,
  FrontendApi,
} from '@ory/client';

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

  const config = new Configuration({
    basePath: kratosDomain,
  });
  const ory = {
    identity: new IdentityApi(config),
    frontend: new FrontendApi(config),
    oauth2: new OAuth2Api(config),
  };

  // const flow = await ory.frontend
  //   .createBrowserSettingsFlow()
  //   .then(({ data: flow }) => flow);

  const {
    data: { id: flowId },
  } = await ory.frontend.createNativeRegistrationFlow();
  //  .then(({ data: flow }) => flow);
  // console.log(browerFlow);

  // const getFlow = await ory.frontend.getRegistrationFlow({ id});
  // console.log(getFlow);
  console.log(flowId);
  const {
    data: { identity: id, session_token: token },
  } = await ory.frontend.updateRegistrationFlow({
    flow: flowId,
    updateRegistrationFlowBody: {
      method: 'password',
      password: PASSWORD,
      traits: {
        email: email,
        accepted_terms: true,
        name: {
          first: firstName,
          last: lastName,
        },
      },
    },
  });
  const idofid = id.id;
  console.log(id);
  console.log(token);

  return token;

  // const identity = await ory.identity
  //   .updateIdentity({
  //     id: idofid,

  //     updateIdentityBody: {
  //       schema_id: 'default',
  //       state: 'active',
  //       traits: {
  //         email: 'budu248@alkem.io',
  //         accepted_terms: true,
  //         name: { first: 'ku2', last: 'ku2' },
  //       },
  //     },
  //     verifiable_addresses: [
  //       {
  //         verified: trie,
  //       },
  //     ],
  //   })
  //   .then(({ data }) => data);

  //.then(({ data }) => data);

  // const kratos = new V0alpha2Api(
  //   new Configuration({
  //     basePath: kratosDomain,
  //   })
  // );
  // // get registration flow
  // const {
  //   data: { id: flowId },
  // } = await kratos.initializeSelfServiceRegistrationFlowWithoutBrowser();
  // // complete the flow
  // await kratos.submitSelfServiceRegistrationFlow(flowId, {
  //   method: 'password',
  //   password: PASSWORD,
  //   traits: {
  //     email: email,
  //     accepted_terms: true,
  //     name: {
  //       first: firstName,
  //       last: lastName,
  //     },
  //   },
  // });
};

// async function example() {
//   const config = new Configuration({
//     basePath: kratosDomain,
//   });

//   const ory = {
//     identity: new IdentityApi(config),
//     frontend: new FrontendApi(config),
//     oauth2: new OAuth2Api(config),
//   };
//   const {
//     data: { id: flowId },
//   } = await ory.frontend
//     .createBrowserRegistrationFlow()
//     .then(({ data: flow }) => flow);

//   // Browser App
//   const browerFlow = await ory.frontend
//     .createBrowserRegistrationFlow()
//     .then(({ data: flow }) => flow);

//   // Native App
//   const browerFlow = await ory.frontend
//     .createNativeRegistrationFlow()
//     .then(({ data: flow }) => flow);

//   // Get
//   const getFlow = await ory.frontend.getRegistrationFlow({ id: flow.id });

//   // Update / Submit
//   const result = await ory.frontend
//     .updateRegistrationFlow({
//       flow: flow.id,
//       updateRegistrationFlowBody: {
//         method: 'password',
//         password: generatePassword(),
//         traits: { email },
//         // csrf_token: ... - needed in browser apps
//       },
//     })
//     .then(({ data }) => data);
// }
