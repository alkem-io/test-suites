import { delay } from "./delay";
import { getMails } from "./mailslurper.rest.requests";

/**
 * Returns 3 values:
 ** 1st: if email doesn't contain link - the message
 ** 2nd: if email contains URL - the link
 ** 3rd: always returns number of all emails
 */
export const getEmails = async (): Promise<
  [string | undefined, string, number]
> => {
  const response = await getMails();
  const lastEmailBody = response.body.mailItems[0].body as string;

  function detectUrl(text: string) {
    const cleanText = text.replace(/<.*?>/gm, "");
    const urlRegex = /(((https?:\/\/)|(https:\/\/)|(www\.))[^\s,]+)/;
    const url = cleanText.match(urlRegex);
    return (url && url[0]?.toString()) || undefined;
  }

  const url = detectUrl(lastEmailBody);
  const emailsCount = response.body.totalRecords;

  return [url, lastEmailBody, emailsCount];
};

/**
 * Returns 3 values:
 ** 1st: if email doesn't contain link - the message
 ** 2nd: if email contains URL - the link
 ** 3rd: always returns number of all emails
 */
export const getRecoveryCode = async (): Promise<
  [string | undefined, string, number]
> => {
  const response = await getMails();
  const lastEmailBody = response.body.mailItems[0].body as string;

  function detectRecoveryCode(text: string): string | undefined {
    const cleanText = text.replace(/<.*?>/gm, "");
    const match = cleanText.match(/\b\d{6}\b/);

    if (match) {
      return match[0];
    }

    console.error("Recovery code not found.");
    return undefined;
  }

  const recoveryCode = detectRecoveryCode(lastEmailBody);
  const emailsCount = response.body.totalRecords;

  return [recoveryCode, lastEmailBody, emailsCount];
};

/**
 * Extracts a recovery link from the recovery email.
 * Searches all emails for one with a recovery-related subject,
 * then extracts the self-service/recovery URL from it.
 *
 * Pass `recipientEmail` to only match mail addressed to that account. On the
 * shared MailSlurper inbox, multiple suites can request recovery links for
 * different personas concurrently — without the filter, a caller can pick up
 * another suite's mail and complete recovery for the wrong account, silently
 * corrupting that persona's harness credential for the rest of the run.
 */
export const getRecoveryLink = async (
  recipientEmail?: string
): Promise<string | undefined> => {
  const response = await getMails();
  const items = response.body.mailItems as Array<{
    subject: string;
    body: string;
    toAddresses?: string[];
  }>;
  const recoveryEmail = items.find(
    (item) =>
      item.subject.toLowerCase().includes("recover") &&
      (recipientEmail === undefined ||
        (item.toAddresses ?? []).some((address) =>
          address.toLowerCase().includes(recipientEmail.toLowerCase())
        ))
  );
  if (!recoveryEmail) return undefined;
  return extractKratosLink(recoveryEmail.body, "self-service/recovery");
};

/**
 * Extracts a verification link from the verification email.
 * Searches all emails for one with a verification-related subject,
 * then extracts the self-service/verification URL from it.
 */
export const getVerificationLink = async (): Promise<string | undefined> => {
  const response = await getMails();
  const items = response.body.mailItems as Array<{ subject: string; body: string }>;
  const verificationEmail = items.find(
    (item) => item.subject.toLowerCase().includes("verify")
  );
  if (!verificationEmail) return undefined;
  return extractKratosLink(verificationEmail.body, "self-service/verification");
};

/**
 * Extracts a Kratos self-service link from an email body.
 * First checks href attributes (links may only exist in HTML tags),
 * then falls back to plain text matching.
 * Decodes HTML entities (e.g. &amp; → &) in the extracted URL.
 */
function extractKratosLink(
  emailBody: string,
  pathFragment: string
): string | undefined {
  // Try href attributes first — the link is often only in <a href="...">
  const hrefRegex = new RegExp(
    `href=["']([^"']*${pathFragment.replace("/", "\\/")}[^"']*)["']`
  );
  const hrefMatch = emailBody.match(hrefRegex);
  if (hrefMatch) {
    return hrefMatch[1].replace(/&amp;/g, "&");
  }

  // Fall back to plain text
  const cleanText = emailBody.replace(/<.*?>/gm, "");
  const textRegex = new RegExp(
    `https?:\\/\\/[^\\s"<]*${pathFragment.replace("/", "\\/")}[^\\s"<]*`
  );
  const textMatch = cleanText.match(textRegex);
  return textMatch ? textMatch[0].replace(/&amp;/g, "&") : undefined;
}
