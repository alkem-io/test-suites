import axios from 'axios';
import { Configuration, IdentityApi, FrontendApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';
import { delay } from '../../utils/delay';
import { getMails } from '../../utils/mailslurper.rest.requests';

/***
 * Verification flow (link method)
 * 1. Create a native verification flow
 * 2. Submit email with method "link" — Kratos sends a verification link
 * 3. Fetch the verification email from mail slurper
 * 4. Extract the verification URL and GET it to complete verification
 *
 * @see https://www.ory.sh/docs/kratos/self-service/flows/verify-email-account-activation
 */
export const verifyInKratosOrFail = async (email: string) => {
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
      method: 'link',
    },
  });

  const verifyMessages = messages ?? [];
  const isLinkSent = !!verifyMessages.find(
    x =>
      x.text.indexOf('verification link has been sent') > -1 ||
      x.text.indexOf('verification code has been sent') > -1
  );

  if (!isLinkSent) {
    const expireMsg = verifyMessages.find(x => x.text.indexOf('flow expired'));

    if (expireMsg) {
      throw new Error(expireMsg.text);
    }

    const msgs = verifyMessages.map(x => x.text).join('\n');
    throw new Error(`Verification not sent for user '${email}': ${msgs}`);
  }

  // wait for the email to arrive
  await delay(1100);
  const verificationLink = await getVerificationLink(email);

  if (!verificationLink) {
    throw new Error(`Unable to fetch verification link for user '${email}'`);
  }

  const isVerified = await verifyAccount(verificationLink);

  if (!isVerified) {
    throw new Error(`Unable to verify user '${email}' via link`);
  }
};

/**
 * GET the verification link URL to complete verification.
 * Kratos link verification is triggered by visiting the URL.
 * Uses axios instead of supertest since it handles external HTTPS + redirects.
 */
const verifyAccount = async (verificationLink: string): Promise<boolean> =>
  axios
    .get(verificationLink, {
      maxRedirects: 5,
      validateStatus: () => true,
      timeout: 30000,
    })
    .then(res => res.status === 200 || res.status === 303 || res.status === 302);

/**
 * Fetch verification email for a specific user from mail slurper
 * and extract the verification link URL.
 */
const getVerificationLink = async (email: string): Promise<string> =>
  getMails()
    .then(x => {
      const verificationEmail = x.body.mailItems
        .filter(
          (item: { subject: string; toAddresses: string[] }) =>
            item.subject === '[Alkemio] Please verify your email address!' &&
            item.toAddresses?.some(
              (addr: string) => addr.toLowerCase() === email.toLowerCase()
            )
        )
        .sort(
          (a: { dateSent: string }, b: { dateSent: string }) =>
            new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime()
        )[0];

      if (!verificationEmail) {
        return '';
      }
      return verificationEmail.body as string;
    })
    .then(body => {
      if (!body) return '';
      // Extract href URLs from <a> tags and find the verification link
      const hrefs = [...body.matchAll(/href="(https?:\/\/[^"]+)"/gi)]
        .map(m => m[1].replace(/&amp;/g, '&'));
      return hrefs.find(u => u.includes('/self-service/verification')) ?? '';
    })
    .catch(x => {
      throw new Error((x as Error)?.message);
    });
