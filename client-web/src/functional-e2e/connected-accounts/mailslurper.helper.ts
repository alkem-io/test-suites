import { APIRequestContext } from '@playwright/test';

// Recipient-scoped, time-floored MailSlurper reader for the recovery
// regression spec (CA-41). Mirrors the link extraction of
// tests-lib lib/src/utils/emails.ts but with two deliberate differences:
//
//  1. NEVER calls deleteMailSlurperMails — this spec must be able to run
//     beside the legacy authentication-password-recovery.spec.ts without
//     destroying its mail.
//  2. Filters by recipient AND by a dateSent baseline taken from MailSlurper's
//     OWN clock. Because nothing here wipes the shared inbox, this spec's own
//     recovery mails accumulate across runs — without the baseline, a poll
//     would resolve a PREVIOUS run's link (silently testing a stale flow, or
//     landing on the recovery-flow-expired screen once the old link ages past
//     Kratos's lifetime). Only mail stamped strictly after the baseline,
//     newest first, qualifies.
//
// Why a MailSlurper-stamp baseline and NOT a Date.now() floor: MailSlurper
// serialises dateSent as 'YYYY-MM-DD HH:mm:ss' with NO timezone marker, and
// which zone that is depends on its deployment (the local dev stack stamps
// UTC). Comparing it against the test host's clock therefore mis-filters by
// the full UTC offset — on a UTC+2 host every fresh mail looked two hours
// "too old" and the poll starved. Comparing two stamps issued by the same
// MailSlurper needs no timezone knowledge at all: the format is
// lexicographically ordered, so plain string comparison is a correct
// time comparison.

const mailSlurperEndpoint = process.env.MAIL_SLURPER_ENDPOINT || 'http://localhost:4437/mail';

type MailItem = {
  subject?: string;
  body?: string;
  toAddresses?: string[];
  /**
   * MailSlurper serialises this as 'YYYY-MM-DD HH:mm:ss' in ITS OWN zone —
   * only ever compare it against other stamps from the same MailSlurper.
   */
  dateSent?: string;
};

const extractRecoveryLink = (emailBody: string): string | undefined => {
  // The link is often only present as an href attribute.
  const hrefMatch = emailBody.match(/href=["']([^"']*self-service\/recovery[^"']*)["']/);
  if (hrefMatch) return hrefMatch[1].replace(/&amp;/g, '&');
  const cleanText = emailBody.replace(/<.*?>/gm, '');
  const textMatch = cleanText.match(/https?:\/\/[^\s"<]*self-service\/recovery[^\s"<]*/);
  return textMatch ? textMatch[0].replace(/&amp;/g, '&') : undefined;
};

const recoveryMailsFor = (payload: { mailItems?: MailItem[] }, email: string): MailItem[] => {
  const wanted = email.toLowerCase();
  return (payload.mailItems ?? []).filter(
    item =>
      (item.subject ?? '').toLowerCase().includes('recover') &&
      (item.toAddresses ?? []).some(address => address.toLowerCase().includes(wanted))
  );
};

/**
 * Returns the dateSent stamp of the NEWEST recovery mail currently addressed
 * to `email` ('' when there is none) — capture this BEFORE submitting a
 * recovery request and pass it to {@link recoveryLinkFor}, so only mail that
 * arrives AFTER the submission (by MailSlurper's own clock) qualifies.
 */
export async function newestRecoveryMailStamp(
  request: APIRequestContext,
  email: string
): Promise<string> {
  const response = await request.get(mailSlurperEndpoint);
  if (!response.ok()) {
    throw new Error(
      `MailSlurper baseline read failed: ${response.status()} from ${mailSlurperEndpoint}`
    );
  }
  const payload = (await response.json()) as { mailItems?: MailItem[] };
  return recoveryMailsFor(payload, email)
    .map(item => item.dateSent ?? '')
    .reduce((newest, stamp) => (stamp > newest ? stamp : newest), '');
}

/**
 * Returns the recovery link from the NEWEST recovery mail addressed to
 * `email` whose dateSent is strictly after `afterStamp` (a stamp previously
 * returned by {@link newestRecoveryMailStamp}), or undefined when no such
 * mail has arrived yet. Read-only — the shared inbox is never pruned.
 * Designed for `expect.poll`.
 */
export async function recoveryLinkFor(
  request: APIRequestContext,
  email: string,
  afterStamp: string
): Promise<string | undefined> {
  const response = await request.get(mailSlurperEndpoint);
  if (!response.ok()) return undefined;
  const payload = (await response.json()) as { mailItems?: MailItem[] };

  const candidates = recoveryMailsFor(payload, email)
    .filter(item => (item.dateSent ?? '') > afterStamp)
    // Lexicographic order IS chronological order for 'YYYY-MM-DD HH:mm:ss'.
    .sort((a, b) => (b.dateSent ?? '').localeCompare(a.dateSent ?? ''));

  for (const item of candidates) {
    const link = extractRecoveryLink(item.body ?? '');
    if (link) return link;
  }
  return undefined;
}
