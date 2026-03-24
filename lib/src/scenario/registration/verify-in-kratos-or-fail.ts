import { Configuration, IdentityApi, FrontendApi } from '@ory/kratos-client';
import { testConfiguration } from '../../config/test.configuration';
import { delay } from '../../utils/delay';
import { getMails } from '../../utils/mailslurper.rest.requests';

/***
 * Verification flow (code method)
 * 1. Create a native verification flow
 * 2. Submit email with method "code" — Kratos sends a verification code via email
 * 3. Fetch the verification email from mail slurper
 * 4. Extract the code and submit it back to complete verification
 *
 * @see https://www.ory.sh/docs/kratos/self-service/flows/verify-email-account-activation
 */
/**
 * @param email - user email to verify
 * @param existingFlowId - optional flow ID from registration's `continue_with`.
 *   When provided, skips creating a new flow and triggering a new email —
 *   uses the code Kratos already sent during registration.
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
        method: 'code',
      },
    });

    const verifyMessages = messages ?? [];
    const isCodeSent = !!verifyMessages.find(
      x =>
        x.text.indexOf('verification code has been sent') > -1 ||
        x.text.indexOf('verification link has been sent') > -1
    );

    if (!isCodeSent) {
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

  // Fetch the verification code from mail slurper
  await delay(1100);
  const verificationCode = await getVerificationCode(email);

  if (!verificationCode) {
    throw new Error(
      `Unable to fetch verification code for user '${email}'`
    );
  }

  // Submit the code to complete verification
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
 * Fetch verification email for a specific user from mail slurper
 * and extract the 6-digit verification code.
 */
const getVerificationCode = async (email: string): Promise<string> =>
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
      // Extract 6-digit verification code from the email body
      const codeMatch = body.match(/\b(\d{6})\b/);
      return codeMatch ? codeMatch[1] : '';
    })
    .catch(x => {
      throw new Error((x as Error)?.message);
    });
