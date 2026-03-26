import axios from 'axios';
import { Configuration, IdentityApi, FrontendApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';
import { delay } from '../../utils/delay';
import { getMails } from '../../utils/mailslurper.rest.requests';

/**
 * Determines the verification method based on the Kratos endpoint.
 * Local environments use "code", remote environments use "link".
 */
const getVerificationMethod = (): 'code' | 'link' => {
  const kratosUrl = testConfiguration.endPoints.kratos.public;
  return kratosUrl.includes('localhost') ? 'code' : 'link';
};

/***
 * Verification flow (code or link method, depending on environment)
 *
 * Code method (local):
 * 1. Create a native verification flow
 * 2. Submit email with method "code" — Kratos sends a verification code via email
 * 3. Fetch the verification email from mail slurper
 * 4. Extract the code and submit it back to complete verification
 *
 * Link method (remote):
 * 1. Create a native verification flow
 * 2. Submit email with method "link" — Kratos sends a verification link via email
 * 3. Fetch the verification email from mail slurper
 * 4. Extract the link and follow it via HTTP GET to complete verification
 *
 * @see https://www.ory.sh/docs/kratos/self-service/flows/verify-email-account-activation
 */
/**
 * @param email - user email to verify
 * @param existingFlowId - optional flow ID from registration's `continue_with`.
 *   When provided, skips creating a new flow and triggering a new email —
 *   uses the code/link Kratos already sent during registration.
 */
export const verifyInKratosOrFail = async (
  email: string,
  existingFlowId?: string
) => {
  const method = getVerificationMethod();
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

  let flowId: string;

  if (existingFlowId) {
    // Reuse the verification flow that Kratos auto-created during registration.
    // The verification email was already sent — no need to trigger another one.
    flowId = existingFlowId;
  } else {
    // No flow from registration (e.g. user already existed).
    // Create a new verification flow and trigger a verification email.
    const {
      data: { id: newFlowId },
    } = await ory.frontend.createNativeVerificationFlow();
    flowId = newFlowId;

    const {
      data: {
        ui: { messages },
      },
    } = await ory.frontend.updateVerificationFlow({
      flow: flowId,
      updateVerificationFlowBody: {
        email,
        method,
      },
    });

    const verifyMessages = messages ?? [];
    const isSent = !!verifyMessages.find(
      x =>
        x.text.indexOf('verification code has been sent') > -1 ||
        x.text.indexOf('verification link has been sent') > -1
    );

    if (!isSent) {
      const expireMsg = verifyMessages.find(
        x => x.text.indexOf('flow expired')
      );

      if (expireMsg) {
        throw new Error(expireMsg.text);
      }

      const msgs = verifyMessages.map(x => x.text).join('\n');
      throw new Error(`Verification not sent for user '${email}': ${msgs}`);
    }
  }

  // Fetch the verification email from mail slurper
  await delay(1100);

  if (method === 'code') {
    await completeVerificationWithCode(ory, flowId, email);
  } else {
    await completeVerificationWithLink(email);
  }
};

/**
 * Complete verification using the "code" method (local environments).
 * Extracts a 6-digit code from the email and submits it to Kratos.
 */
const completeVerificationWithCode = async (
  ory: { frontend: FrontendApi },
  flowId: string,
  email: string
) => {
  const verificationCode = await getVerificationCode(email);

  if (!verificationCode) {
    throw new Error(
      `Unable to fetch verification code for user '${email}'`
    );
  }

  const submitResult = await ory.frontend.updateVerificationFlow({
    flow: flowId,
    updateVerificationFlowBody: {
      code: verificationCode,
      method: 'code',
    },
  });

  if (submitResult.data.state !== 'passed_challenge') {
    const errorMsgs = (submitResult.data.ui.messages ?? [])
      .map(x => x.text)
      .join('\n');
    throw new Error(
      `Verification code rejected for user '${email}': ${errorMsgs}`
    );
  }
};

/**
 * Complete verification using the "link" method (remote environments).
 * Extracts the verification link from the email and follows it via HTTP GET.
 */
const completeVerificationWithLink = async (email: string) => {
  const verificationLink = await getVerificationLink(email);

  if (!verificationLink) {
    throw new Error(
      `Unable to fetch verification link for user '${email}'`
    );
  }

  // Follow the verification link to complete the flow
  const response = await axios.get(verificationLink, {
    maxRedirects: 5,
    timeout: 30000,
    validateStatus: () => true, // Accept any status — Kratos may redirect
  });

  // Kratos returns 200 or redirects on success; 4xx/5xx indicates failure
  if (response.status >= 400) {
    throw new Error(
      `Verification link request failed for user '${email}': HTTP ${response.status}`
    );
  }
};

/**
 * Fetch verification email for a specific user from mail slurper
 * and extract the 6-digit verification code.
 */
const getVerificationCode = async (email: string): Promise<string> =>
  getVerificationEmailBody(email).then(body => {
    if (!body) return '';
    const codeMatch = body.match(/\b(\d{6})\b/);
    return codeMatch ? codeMatch[1] : '';
  });

/**
 * Fetch verification email for a specific user from mail slurper
 * and extract the verification link URL.
 */
const getVerificationLink = async (email: string): Promise<string> =>
  getVerificationEmailBody(email).then(body => {
    if (!body) return '';
    // Match verification URL — typically contains /self-service/verification with a flow or token param
    const linkMatch = body.match(
      /https?:\/\/[^\s"<]+self-service\/verification[^\s"<]*/
    );
    return linkMatch ? linkMatch[0] : '';
  });

/**
 * Fetch the most recent verification email body for a specific user from mail slurper.
 */
const getVerificationEmailBody = async (email: string): Promise<string> =>
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
    .catch(x => {
      throw new Error((x as Error)?.message);
    });
