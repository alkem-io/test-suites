import request from 'supertest';
import { Configuration, IdentityApi, FrontendApi } from '@ory/kratos-client';
import { kratosDomain } from '@common/constants/kratos';
import { getMails } from './mailslurper.rest.requests';
import { delay } from '@alkemio/tests-lib';

/***
 * Verification flow on v0.8.0-alpha3
 * 1. AJAX call to request a verification flow
 * 2. AJAX call submit the data need for the verification flow in the body
 * and flowId in the URL params
 * 3. After a successful claim for a verification Code
 * a message field is attached to the body of the flow, stating
 * that an email is sent to the provided email address
 * 4. GET request on the verification Code in the email verifies the account
 * and the response is 303 (i'm pretty sure it has to be 200 for API clients)
 *
 * Exception can be thrown on
 * <ul>
 *  <li>Verification Code expired</li>
 *  <li>Some other error</li>
 * </ul>
 *
 * @see https://www.ory.sh/docs/kratos/self-service/flows/verify-email-account-activation#verification-for-client-side-ajax-browser-clients
 */
export const verifyInKratosOrFail = async (email: string) => {
  const kratosConfig = new Configuration({
    basePath: kratosDomain,
    baseOptions: {
      withCredentials: true, // Important for CORS
      timeout: 30000, // 30 seconds
    },
  });
  const ory = {
    identity: new IdentityApi(kratosConfig),
    frontend: new FrontendApi(kratosConfig),
  };

  const {
    data: { id: flowId },
  } = await ory.frontend.createNativeVerificationFlow();

  const {
    data: {
      ui: { messages },
    },
  } = await ory.frontend.updateVerificationFlow({
    flow: flowId,
    updateVerificationFlowBody: {
      email,
      method: 'code',
    },
  });

  const verifyMessages = messages ?? [];
  const isCodeSent = !!verifyMessages.find(
    x => x.text.indexOf('verification code has been sent') > -1
  );

  if (!isCodeSent) {
    const expireMsg = verifyMessages.find(x => x.text.indexOf('flow expired'));

    if (expireMsg) {
      throw new Error(expireMsg.text);
    }

    const messages = verifyMessages.map(x => x.text).join('\n');
    throw new Error(`Code is not sent for user '${email}: ${messages}'`);
  }

  // wait for the email to be sent
  await delay(1100);
  const verificationCode = await getVerificationCode();

  if (!verificationCode) {
    throw new Error(`Unable to fetch verification Code for user '${email}'`);
  }

  const isVerified = await verifyAccount(verificationCode, email);

  if (!isVerified) {
    throw new Error(`Unable to verify user from Code for user '${email}'`);
  }
};

const verifyAccount = async (
  verificationCode: string,
  email: string
): Promise<boolean> =>
  request(verificationCode)
    .post('')
    .send({ email, method: 'code' })
    .set('Accept', 'application/json')
    // i'm pretty sure it has to be 200 for API clients
    .then(x => x.status === 200);

const getVerificationCode = async () =>
  getMails()
    .then(
      x =>
        x.body.mailItems
          .filter(
            (x: { subject: string }) =>
              x.subject === '[Alkemio] Please verify your email address!'
          )

          .map((x: { body: string }) => x.body)[0]
    )

    .then(x => {
      const urlRegex = /(((https?:\/\/)|(https:\/\/)|(www\.))[^\s]+)/g;
      const cleanText = x.replace(/<.*?>/gm, '');

      const url = cleanText.match(urlRegex)?.[0]?.toString() ?? '';
      return url.replace('&amp;', '&');
    })
    .catch(x => {
      throw new Error((x as Error)?.message);
    });
