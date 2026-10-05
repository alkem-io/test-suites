import { delay, getMailsData } from '@alkemio/tests-lib';
import {
  MailItem,
  waitForMailsWhere,
} from '@functional-api/notifications/notification.helpers';

/** Delivery is fire-and-forget; a "no mail" claim only means something after
 * this quiet period. */
const QUIET_PERIOD_MS = 4_000;
/** Lets a just-delivered mail's siblings land, so "exactly one" is a count. */
const SETTLE_MS = 2_500;

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
 * Runs `action` and returns the mail that arrived for `address` DURING it: a
 * per-address delta (the mails to the address before the action are noted, the
 * ones after it that were not there before are returned). Addresses are unique
 * per run, so the shared inbox is never emptied and no other spec's mail is
 * touched or read. With `expected > 0` it waits for that many (and then a short
 * settle so a surplus shows up); with `expected === 0` it holds for a full quiet
 * period so an absence cannot pass vacuously.
 */
export const mailsToAfter = async (
  action: () => Promise<unknown>,
  address: string,
  expected: number
): Promise<MailItem[]> => {
  const seen = new Set((await mailsFor(address)).map(mailKey));
  const arrived = async () =>
    (await mailsFor(address)).filter(m => !seen.has(mailKey(m)));
  await action();
  if (expected > 0) {
    await waitForMailsWhere(
      items =>
        items.filter(m => addressedTo(m, address) && !seen.has(mailKey(m)))
          .length >= expected,
      { timeout: 20_000 }
    );
    await delay(SETTLE_MS);
  } else {
    await delay(QUIET_PERIOD_MS);
  }
  return arrived();
};

/** Subject and recipient of every mail, for assertion messages. */
export const mailSummary = (mails: MailItem[]): string =>
  JSON.stringify(mails.map(m => [m.toAddresses, m.subject]));

/**
 * Waits for the mail an invitation just triggered to land, then lets the
 * pipeline settle. Call it after creating an invitation and BEFORE the step
 * whose mail count is asserted: the creation mail is asynchronous and would
 * otherwise arrive after the inbox prune and be counted as that step's mail.
 */
export const drainMailsTo = async (address: string): Promise<void> => {
  await waitForMailsWhere(
    items => items.some(m => addressedTo(m, address)),
    { timeout: 20_000 }
  );
  await delay(SETTLE_MS);
};
