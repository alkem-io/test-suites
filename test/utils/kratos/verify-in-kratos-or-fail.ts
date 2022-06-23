import request from 'supertest';
import { kratosDomain } from '../../const';
import { delay } from '../delay';
import { getMails } from '../mailslurper.rest.requests';
import { Configuration, V0alpha2Api } from '@ory/kratos-client';

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
export const verifyInKratosOrFail = async (email: string) => {
  const kratos = new V0alpha2Api(
    new Configuration({
      basePath: kratosDomain,
    })
  );

  const {
    data: { id: flowId },
  } = await kratos.initializeSelfServiceVerificationFlowWithoutBrowser();

  const {
    data: {
      ui: { messages },
    },
  } = await kratos.submitSelfServiceVerificationFlow(flowId, {
    email,
    method: 'link',
  });

  const verifyMessages = messages ?? [];
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

const verifyAccount = async (verificationLink: string): Promise<boolean> =>
  request(verificationLink)
    .get('')
    .set('Accept', 'application/json')
    // i'm pretty sure it has to be 200 for API clients
    .then(x => x.status === 303);

const getVerificationLink = async () =>
  getMails()
    .then(x => x.body.mailItems[0].body as string)
    .then(x => {
      const urlRegex = /(((https?:\/\/)|(https:\/\/)|(www\.))[^\s]+)/g;
      const cleanText = x.replace(/<.*?>/gm, '');
      const url = cleanText.match(urlRegex)?.[0]?.toString() ?? '';
      return url.replace('&amp;', '&');
    })
    .catch(x => {
      throw new Error((x as Error)?.message);
    });
