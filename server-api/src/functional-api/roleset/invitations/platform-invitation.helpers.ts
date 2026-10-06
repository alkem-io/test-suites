import { delay, getMailsData } from '@alkemio/tests-lib';
import { MailItem } from '@functional-api/notifications/notification.helpers';

/** How often the inbox is re-read while a step waits on mail. */
const POLL_INTERVAL_MS = 500;
/** Delivery is fire-and-forget; a "no mail" claim only means something once
 * nothing has arrived for the address for this long. */
const QUIET_PERIOD_MS = 4_000;
/** Once the expected mail is in, its siblings have this long to show up, so
 * "exactly one" is a count and not a race. */
const SETTLE_MS = 2_500;
/** Upper bound on waiting for mail that is expected to arrive at all. */
const DELIVERY_TIMEOUT_MS = 20_000;

export const THROTTLED_CODE = 'ROLESET_INVITATION_RESEND_THROTTLED';
/** The typed refusal (`RoleSetInvitationException`) for resending a consumed
 * email invitation (FR-016). The same code also covers a platform-level role
 * set, so callers pin the message too. */
export const INVITATION_REFUSED_CODE = 'ROLESET_INVITATION';

const addressedTo = (mail: MailItem, address: string): boolean =>
  Array.isArray(mail.toAddresses) &&
  mail.toAddresses.some(to => to.toLowerCase() === address.toLowerCase());

/** Identity of one mail within the inbox: MailSlurper's own id where present. */
const mailKey = (mail: MailItem): string =>
  String(mail.id ?? `${mail.subject}|${mail.body}`);

const mailsFor = async (address: string): Promise<MailItem[]> => {
  const [items] = (await getMailsData()) as [MailItem[], number];
  return items.filter(m => addressedTo(m, address));
};

/**
 * The one wait this file has: polls the mails to `address` that are not in
 * `seen` until there are at least `atLeast` of them AND their number has not
 * changed for `stableMs`. With `exact`, more than `atLeast` ends the poll at
 * once — the count claim is already broken, there is nothing left to wait for.
 * Bounded by `timeoutMs`; returns whatever is there at the end, so the caller's
 * own assertion carries the message. There is no fixed sleep: an absence
 * claim ends after one quiet period, a count claim ends once the expected mail
 * has landed and its settle period has passed, and a late or surplus mail
 * surfaces as soon as it lands.
 */
const pollMailsTo = async (
  address: string,
  {
    seen = new Set<string>(),
    atLeast = 0,
    exact = false,
    stableMs,
    timeoutMs = DELIVERY_TIMEOUT_MS,
  }: {
    seen?: Set<string>;
    atLeast?: number;
    exact?: boolean;
    stableMs: number;
    timeoutMs?: number;
  }
): Promise<MailItem[]> => {
  const read = async () =>
    (await mailsFor(address)).filter(m => !seen.has(mailKey(m)));
  const deadline = Date.now() + timeoutMs;
  let mails = await read();
  let stableSince = Date.now();
  for (;;) {
    const now = Date.now();
    if (exact && mails.length > atLeast) return mails;
    if (mails.length >= atLeast && now - stableSince >= stableMs) return mails;
    if (now >= deadline) return mails;
    await delay(POLL_INTERVAL_MS);
    const next = await read();
    if (next.length !== mails.length) stableSince = Date.now();
    mails = next;
  }
};

/**
 * Runs `action` and returns the mail that arrived for `address` DURING it: a
 * per-address delta (the mails to the address before the action are noted, the
 * ones after it that were not there before are returned). Addresses are unique
 * per run, so the shared inbox is never emptied and no other spec's mail is
 * touched or read. With `expected > 0` it waits for that many and then for the
 * count to hold through a settle period (a surplus ends it at once); with
 * `expected === 0` it holds for a full quiet period so an absence cannot pass
 * vacuously, and ends the moment a mail does arrive.
 */
export const mailsToAfter = async (
  action: () => Promise<unknown>,
  address: string,
  expected: number
): Promise<MailItem[]> => {
  const seen = new Set((await mailsFor(address)).map(mailKey));
  await action();
  return pollMailsTo(address, {
    seen,
    atLeast: expected,
    exact: true,
    stableMs: expected > 0 ? SETTLE_MS : QUIET_PERIOD_MS,
  });
};

/** Subject and recipient of every mail, for assertion messages. */
export const mailSummary = (mails: MailItem[]): string =>
  JSON.stringify(mails.map(m => [m.toAddresses, m.subject]));

/**
 * Waits for the mail an invitation just triggered to land, then for the
 * pipeline to settle. Call it after creating an invitation and BEFORE the step
 * whose mail count is asserted: the creation mail is asynchronous and would
 * otherwise arrive during that step and be counted as its mail.
 */
export const drainMailsTo = async (address: string): Promise<void> => {
  await pollMailsTo(address, { atLeast: 1, stableMs: SETTLE_MS });
};

/**
 * Returns the mails to `address` once nothing new has arrived for a full
 * quiet period: the mail a previous step (a registration, say) may still be
 * delivering has landed, so a later per-address count starts from a settled
 * baseline. Bounded by the delivery timeout.
 */
export const settledMailsTo = async (address: string): Promise<MailItem[]> =>
  pollMailsTo(address, { stableMs: QUIET_PERIOD_MS });
