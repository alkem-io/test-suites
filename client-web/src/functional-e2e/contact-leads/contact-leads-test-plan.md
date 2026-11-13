# Test plan — message the leads of an organisation or a Space, and a notification setting that persists across reload (W2 journey 10)

> **Status:** Built 2026-11-12, stacked on the Tier 0 messaging branch (PR #734, `qa/w2-tier0-messaging`) for the lib's all-pages mail readers (QA lead Comoque1 to review) · **Live:** 5 of 6 cases (M1-2 skipped on reproduced product defect J10-D1, not filed); C3-1 and C3-2 are `@local-stack` · **Depth:** Standard, capped at the journey (one trigger: the cross-repo notification contract, because recipient resolution and the mail templates are what the rebuild replaces) · **Source:** `docs/qa/server-rebuild/plan.md` § W2, journey 10; client-net audit rows F3 and F4 (and § 4 item 26); issue alkem-io/test-suites#721

This journey has no diff. It comes from the plan. The basis is the audit and product source read at client-web `develop` and server `develop` @ `e120d25a1` (2026-11-12). Two things changed since the audit (2026-10-14) wrote F3 as "message community leads / org — toast only":

- **There is no longer an email path to a Space's leads in the UI.** The CRD Space sidebar's **Contact Leads** (`ContactLeadsDialogConnector`) calls `sendDirectMessageToUsers`: it opens a private 1:1 **chat** with each lead. The old `sendMessageToCommunityLeads` mutation (lead email, subject "… sent a message to your community") has no caller in client-web; it is covered at API level only (server-api `notifications/space/communication/user-to-community-leads-*.it-spec.ts`). So the Space half of F3 is a chat walk, whose mail is the 034 direct-message **digest**, which is off by default and opted into per user.
- **Messaging an organisation is still email.** The organisation page's **Message** opens "Send an email — Delivered to the organisation's administrators." and calls `sendMessageToOrganization`.

F4 (notification settings persist across reload) is covered for the organisation row this journey uses: "Receive direct messages to my organisation". The messaging rows (direct/group chat) are owned by `messaging-notifications/us3-messaging-settings-rows.spec.ts` (registration in flight on the Tier 0 messaging branch) and are not repeated.

## How to run
```bash
cd client-web && pnpm exec playwright test --config=config/playwright.config.nightly.ts --project="Contact leads"   # tier long; C3-* excluded
pnpm run test:local-stack --project="Local stack — contact Space leads"                                              # C3-1, C3-2
```
- Every user is a disposable identity registered through public Kratos and verified by its **own** mail (`registerDisposableUser`), deleted with its identity in a file-level `afterAll`. The organisations and the Space are seeded through the lib and deleted there too.
- Mail is read through the lib's recipient-scoped readers (`markMailbox` / `getMailsToSince`, every page of the sink, PR #734): each recipient's box is marked right before the action, and only mail since the mark with the run-unique subject (the sender's display name carries the run id) counts. The shared inbox is never pruned. For the immediate organisation mails, "exactly one" and "none" are read after `MAIL_QUIET_MS` (the house reader's quiet period, `settleImmediateMail`); for the digest, after `digestWindow('email','direct').maxDelayGraceMs`.
- C3-* need Matrix (synapse + matrix-adapter). C3-2 also needs the nine `MESSAGING_DIGEST_*` variables at the test values on the server and the harness (locally: the coordinator's `run-local-msg.sh`); on production windows it is correct but takes about 35 minutes.
- All three files are `mode: 'serial'`; files share nothing.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A message to an organisation reaches nobody, or not every admin, while the sender is told it was sent | Medium (recipient resolution is rewritten) | High (a contact channel silently dead) | **High** | M1-1, M1-2 |
| R2 | A message to an organisation reaches people who are not its admins (associates) | Medium | Medium (privacy, noise) | Medium | M1-1 |
| R3 | The mail arrives without the message text, or twice | Low | Medium | Medium | M1-1 |
| R4 | A user switches a notification off, it looks off, but the server never stored it (or stored another channel) | Medium (settings JSON reshaped) | Medium | **High** | N1-1, N1-3 |
| R5 | The stored "off" is not honoured by the next notification | Medium | Medium | Medium | N1-2 |
| R6 | "Contact Leads" messages the wrong people, a group instead of 1:1s, or loses the text | Medium (chat moves to the new core) | High | **High** | C3-1 |
| R7 | A lead who opted into chat mail is mailed twice, or a non-lead is mailed | Low | Medium | Medium | C3-2 |
| R8 | The suite leaves users, organisations or a Space behind on a shared environment | Medium | Medium | Medium | teardown design |

Elevated-risk triggers present: [ ] authorization/visibility · [x] cross-repo contract · [ ] migration · [ ] breaking contract · [ ] infra/config · [ ] data-destructive · [ ] performance-sensitive.

## Existing coverage before this work
- **Organisation message.** `contributors-callout/us3-card-menu` US3-AS3 sends from the callout card menu and checks the toast only. server-api `notifications/organization/user-to-organization.it-spec.ts` sends through the API to admins who are also associates and asserts all-inbox counts after `deleteMailSlurperMails()`. **No UI send has a mail oracle.**
- **Space leads.** No client-web case opens Contact Leads. The legacy email mutation is covered by server-api only (see above); the chat fan-out has a client unit test (`ContactLeadsDialogConnector.test.tsx`) and server unit tests (`messaging.service.spec.ts` › sendDirectMessageToUsers), no end-to-end case.
- **Settings.** `organization-space-invitations/us2-org-admins-notified` US2-AS6 toggles the "invited to join a Space" row on a shared persona (restored in `finally`). `messaging-notifications/us3` covers the chat rows (unregistered on develop). Nothing toggles "Receive direct messages to my organisation".

## Scenario → test mapping
Techniques: **UC** use-case walk · **EP** recipient partition (admin+associate / admin only / associate only / sender / non-lead member) · **ST** state transition (on → off → on) · **NC** negative with a positive control · **EG** error guess.

| ID | Scenario | Technique | Oracle | Automated by | Layer |
|---|---|---|---|---|---|
| M1-1 | A user messages an organisation from its page | UC, EP, NC | `sendMessageToOrganization` answered without errors; toast "Your message has been sent."; admins A and B (Associate + Admin) each have **exactly one** mail with subject `<sender> sent a message to your organization` whose body contains the run-unique text; the sender has exactly one `You have sent a message to <org>!` and no admin mail; the associate (not admin) has none. Every recipient's org-message email channel is read back as on first (`readUserSettings`), so each negative is falsifiable | `us1-message-organisation.spec.ts` › M1-1 | UI + lib + mail |
| M1-2 | An admin who is not an associate is mailed too | EP, EG | exactly one mail to the admin-only user. **Reproduced red** (J10-D1) | `us1-message-organisation.spec.ts` › M1-2 (**`test.skip`**, J10-D1, alkem-io/test-suites#724) | UI + mail |
| N1-1 | An admin switches the email channel of "Receive direct messages to my organisation" off | ST | server value read first (on); switch checked → unchecked; `readUserSettings` polls to email off; after reload the switch is unchecked and In-App unchanged; read-back equals the before-state with only `email` flipped | `us2-organisation-message-setting.spec.ts` › N1-1 | UI + lib |
| N1-2 | The stored "off" is honoured | NC | the next UI message to the organisation gives the other admin (settings untouched) exactly one mail; the admin who switched email off has none | `us2-organisation-message-setting.spec.ts` › N1-2 | UI + mail |
| N1-3 | The admin switches it back on | ST | unchecked → checked; server email on; after reload checked; read-back equals the before-state exactly | `us2-organisation-message-setting.spec.ts` › N1-3 | UI + lib |
| C3-1 | A member uses "Contact Leads" on a Space | UC, EP, NC | the dialog's recipients are exactly the two leads (the Space's lead set read back as exactly those two); `sendDirectMessageToUsers` answered; "Message sent" without "Not reached"; each lead's own `me.conversations` (lib `readMyConversations`, own bearer) has exactly one conversation with the sender, whose members are exactly {lead, sender} (a 1:1, not a group), one message, last message = the text; the non-lead member has no conversation with the sender | `us3-contact-space-leads.spec.ts` › C3-1 (`@local-stack`) | UI + lib |
| C3-2 | Leads who opted into direct-message email get one digest each | EP, NC | leads and the non-lead member opted in (read back); each lead gets `<sender> sent you a message`; after `digestWindow('email','direct').maxDelayGraceMs` each lead has exactly one, the member none naming the sender | `us3-contact-space-leads.spec.ts` › C3-2 (`@local-stack`) | mail |
| — | Legacy lead email (`sendMessageToCommunityLeads`) | — | — | server-api `user-to-community-leads-*.it-spec.ts` | covered (API) |
| — | Organisation message from the contributors callout card | — | — | `contributors-callout/us3-card-menu` US3-AS3 | covered (toast only) |
| — | Chat notification rows (direct/group) persist | — | — | `messaging-notifications/us3-messaging-settings-rows` | covered (registration in flight) |

### Regression guards
- **M1-1:** recipient resolution sends to associates, drops an admin, or loses the message body; a duplicate dispatch (exactly one per admin); the sender copy goes missing or the sender gets the admin mail.
- **N1-1 / N1-3:** a settings write that flips another channel or row; a UI that shows the toggle without saving it (read-back and reload both catch it). Both directions are exercised, so a stored value stuck at the default is caught.
- **N1-2:** the recipient filter ignoring `organization.adminMessageReceived.email`.
- **C3-1:** a group conversation instead of 1:1s; a lead skipped; a non-lead reached; the text lost.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| An admin who is not an associate gets the organisation message (M1-2) | **Built and skipped**: reproduced product defect J10-D1 (below), recorded on alkem-io/test-suites#724, not filed against server | server fix, then drop the skip |
| The legacy "message the community leads" email from the UI | No UI caller exists any more (the CRD sidebar opens chats). API coverage exists | server-api; product to decide whether to delete the mutation |
| Contact Leads on the shared test cluster | Matrix fails there for environmental reasons, so C3-* are `@local-stack` | nightly once the cluster's Matrix works; then drop the tag |
| A lead who disabled direct messages ("Not reached" in the confirmation) | `BLOCKED_NO_CONSENT` path; server unit tests cover it | follow-up case in C3 |
| In-app and push channels of the organisation message | Mail is this journey's oracle; push needs `RABBITMQ_MANAGEMENT_*` | `organization-space-invitations` pattern, follow-up |
| Composer guards (empty, discard prompt, failed send keeps the draft) | Covered by `contributors-callout/us3-card-menu` US3-AS3 for the same composer | covered |

**Non-functional.** Security: recipient sets are the negative controls above; no case asserts another user's address is hidden in the body (the messaging suite does). Accessibility: not in scope. Performance: one message per case.

## Defect drafts (not filed)

**J10-D1 — A message to an organisation is not delivered to an admin who is not also an associate** (server, `develop` @ `e120d25a1`)
- *Steps:* create an organisation; make user D an **Admin** but not an **Associate** (users A, B are Associate + Admin); as user S open `/organization/<nameID>`, Message, send a text.
- *Expected:* every administrator gets "S sent a message to your organization" (the composer says "Delivered to the organisation's administrators").
- *Actual:* A and B get it; D gets nothing. D does receive the other organisation-admin notifications in the same run ("… has joined <org>"), so D's admin standing and email are fine.
- *Cause (code read):* `notification.recipients.service.ts` resolves `ORGANIZATION_ADMIN_MESSAGE` and `ORGANIZATION_ADMIN_MENTIONED` with `getOrganizationCredentialCriteria` (ORGANIZATION_ASSOCIATE credentials, then filtered by RECEIVE_NOTIFICATIONS_ADMIN), while the other organisation-admin events use `getOrganizationAdminCredentialCriteria` (admin standing, 061 R17b). The criteria date from server#5285 (2025-08-22).
- *Reach:* an Admin who is not an Associate exists whenever the admin role is granted without (or after removing) the associate role; the API allows it and `organization-space-invitations` US2-AS3 relies on that topology. Likely also affects "my organisation was mentioned" (same criteria, not run).
- *Evidence:* local stack 2026-11-12, M1-1 run with the M1-2 recipient in place; redacted record (no addresses kept here).
- *Pinned by:* M1-2 (`test.skip`, titled with alkem-io/test-suites#724). Swap in the server issue number when filed.

**J10-D2 — A notification event with a partial delivery failure drops the failed recipients' mails without retry** (notifications, `develop` @ `220befb`; reliability, to confirm severity with the QA lead)
- *Observed:* local stack 2026-11-12, run 7 of M1-1. The server handed the notifications service both admins (event payload lists A and B); B's mail was delivered, A's never was. The service log shows `notifme reported status=error: {"email":"Client network socket disconnected before secure TLS connection was established"}` for that send and no retry.
- *Cause (code read):* `service/src/services/notification/notification.service.ts` (~l.205-215): when **all** sends of an event fail it requeues with back-off (max 3 attempts); when **some** fail it `nack`s without requeue, discarding the failed recipients' mails by design ("dead-lettered / discarded").
- *Reach:* any transient SMTP or relay error during a multi-recipient event in production silently costs those recipients their mail, while the log reports a partial failure only at VERBOSE/WARN.
- *Expected:* a failed recipient is retried (per-recipient retry or requeue of the failed subset), or the loss is surfaced as an error.
- *Test impact:* none needed. M1-1 and N1-2 go red ("never reached …") when it happens, which is the correct signal. The local stack's SMTP hop to the mail sink failed about 30% of attempts that hour (1,899 TLS disconnects to 4,212 successes, all suites together), which is how runs 1 and 7 lost a mail.

## Rebaseline register
- Copy: "Message", "Send an email", "Delivered to the organisation's administrators.", "Your message has been sent."; "Contact Leads" (button), "Contact the leads" (dialog), "Message sent", "Your message has been sent as a private chat.", "Not reached"; settings row "Receive direct messages to my organisation", switches "Toggle Email notification for: …".
- Subjects: `<sender> sent a message to your organization`; `You have sent a message to <org>!` (sender copy); `<sender> sent you a message` (direct-chat digest, one message).
- A Space allows at most two user leads (`ROLESET_POLICY_ROLE_LIMITS_VIOLATED`); the creating platform admin takes one, so C3 frees it before assigning.
- The organisation is seeded the product way: a disposable user granted Feature Organization Creator creates it (and so is its first Associate + Admin) and assigns every other role with its own token, through the new lib `assignUserRoleOnRoleSet` (selects only the user id; the lib's `assignRoleToUser` selects the user's settings, which an organisation admin may not read, so it reports a refusal for a write that succeeded).

## Build notes (2026-11-12, local stack, client-web `develop`, server `develop` @ `e120d25a1`)

**Runs (final code, stacked on PR #734 @ `be2b5c89`, local stack with the server and the harness on the test digest windows).**
- Nightly project `Contact leads`: 4 passed, 1 skipped (M1-2), in two consecutive runs.
- Local-stack project `Local stack — contact Space leads`: C3-1 and C3-2 passed, in two consecutive runs.
- Gates: lib build, client-web `tsc --noEmit`, eslint on the area and both configs, server-api `tsc --noEmit`, lib contract test (`vitest --project contract`) 38/38.
- Earlier, on develop's readers (before the rebase): the nightly project went red three times with "never reached" when the stack's SMTP hop to MailSlurper dropped one recipient of a send (J10-D2, traced in the notifications log), and C3-2 went red twice after its 30-minute settle on production windows because develop's reader saw only the newest 50 mails. Both are gone from the final runs; J10-D2 remains a real gap and can still turn a run red.

**Red-proofs** (each oracle broken once, seen red at the intended line, file restored byte-identical):

| Case | Mutation | Result |
|---|---|---|
| M1-1 | expect the admin mail body to contain `<text>-x` | red at the body assertion; the received body holds the real text |
| N1-1 | expect the Email switch **checked** after the reload | red: received unchecked (the off state persisted) |

**Seeding history (why the organisation is built by a user).** The first build seeded the organisation as the platform admin and removed it again, assigning roles through the lib's organisation-admin fallback. Two of four runs failed in set-up for that reason alone: once the fallback found no admin to act as, and once one admin, read back as Associate + Admin, was left out of the server's message recipients (the notifications log shows one recipient). Under the hardening gate this is a harness path, not a product producer, so it was replaced (delete, not guard) by the product path above. J10-D1 reproduces identically under the product path.

**Digest windows on this stack.** On 2026-11-12 the local server first ran with the production digest windows (direct email quiet 300 s; the digests arrived about five minutes after the send). The final runs had the server and the harness on the test values (quiet 4 s, max delay 15 s).

**Mail reader.** develop's `getMailsData` reads only the newest 50 mails (MailSlurper page 1); on the shared stack a run's mail fell to page 15 within minutes, which turned C3-2's 30-minute re-read red. The area now reads through the lib's `markMailbox` / `getMailsToSince` (every page), so it depends on PR #734.
