import axios from 'axios';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';
import { delay } from '../../utils/delay';
import { getMails } from '../../utils/mailslurper.rest.requests';

/***
 * Verification flow (link method)
 *
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
 *   uses the link Kratos already sent during registration.
 */
export const verifyInKratosOrFail = async (
  email: string,
  existingFlowId?: string
) => {
  const kratosConfig = new Configuration({
    basePath: testConfiguration.endPoints.kratos.public,
    baseOptions: {
      withCredentials: true, // Important for CORS
      timeout: 30000, // 30 seconds
    },
  });
  const ory = new FrontendApi(kratosConfig);

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
    } = await ory.createNativeVerificationFlow();
    flowId = newFlowId;

    const {
      data: {
        ui: { messages },
      },
    } = await ory.updateVerificationFlow({
      flow: flowId,
      updateVerificationFlowBody: {
        email,
        method: 'link',
      },
    });

    const verifyMessages = messages ?? [];
    const isSent = !!verifyMessages.find(
      x => x.text.indexOf('verification link has been sent') > -1
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
