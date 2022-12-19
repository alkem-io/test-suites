// import { kratosDomain } from '../../const';
// import { Configuration, V0alpha2Api } from '@ory/kratos-client';

// /***
//  * Registration Flow on v0.8.0-alpha3
//  * 1. AJAX call to request a registration flow
//  * 2. AJAX call submit the data need for the registration flow in the body
//  * and flowId in the URL params
//  * 3. After a successful registration you will receive a session_token in the response
//  * 4. If an error occurred after submit, a 'messages' field
//  * will be attached to the body of the flow in the response with the errors
//  *
//  * Exception can be thrown on
//  * <ul>
//  *  <li>User already exists</li>
//  *  <li>Some other error</li>
//  * </ul>
//  *
//  * @see https://www.ory.sh/docs/kratos/self-service/flows/user-registration#registration-for-api-clients-and-clients-without-browsers
//  */
// export const registerInKratosOrFail = async (
//   firstName: string,
//   lastName: string,
//   email: string
// ) => {
//   const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || '';

//   const kratos = new V0alpha2Api(
//     new Configuration({
//       basePath: kratosDomain,
//     })
//   );
//   // get registration flow
//   const {
//     data: { id: flowId },
//   } = await kratos.initializeSelfServiceRegistrationFlowWithoutBrowser();
//   // complete the flow
//   await kratos.submitSelfServiceRegistrationFlow(flowId, {
//     method: 'password',
//     password: PASSWORD,
//     traits: {
//       email: email,
//       accepted_terms: true,
//       name: {
//         first: firstName,
//         last: lastName,
//       },
//     },
//   });
// };
