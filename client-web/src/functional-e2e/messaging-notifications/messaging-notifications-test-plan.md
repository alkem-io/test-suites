# Test plan — conversation-message notifications (034)

- **Story:** [#522](https://github.com/alkem-io/test-suites/issues/522)
- **Workspace spec:** `specs/034-messaging-notifications/` in `alkem-io/agents-hq` (source of truth for the US/AS/FR/SC ids below)
- **Depends on:** [alkem-io/server#6334](https://github.com/alkem-io/server/pull/6334), [alkem-io/notifications#567](https://github.com/alkem-io/notifications/pull/567)
- **Suites:** `client-web/src/functional-e2e/messaging-notifications/` (acceptance walks) and `server-api/src/functional-api/notifications/messaging/` (the it-spec matrix)

## What Operator Ruling R4 changed, and why it dominates this plan

Notifications are **not** sent when a message arrives. Arrival only *arms* a
per-`(recipient, channel, kind)` track; a sweep flushes it once the track's
quiet period elapses with no further message, or at the latest once its max
delay elapses since the first un-notified message. Reading the conversation
before the timer fires **cancels** the pending digest outright.

Every wait in both suites therefore derives from
`digestWindow(channel, kind)` (`lib/src/utils/messaging-digest-windows.ts`).
The failure mode this guards is a negative assertion that passes because
nothing arrived **yet** rather than because nothing will **ever** arrive —
invisible when it happens, and easy to reintroduce with any hard-coded wait.

## How to run

Needs a running app plus MailSlurper, the GraphQL API and the **RabbitMQ
management API**, all reachable from `client-web/.env` / `server-api/.env`.

```bash
# Acceptance walks
cd client-web
UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/messaging-notifications --workers=1

# The it-spec matrix
cd server-api
pnpm exec vitest run src/functional-api/notifications/messaging
```

`--workers=1` is a **requirement**, not a convenience — see *Isolation* below.

### The nine digest variables must be set on BOTH sides

`MESSAGING_DIGEST_*` (eight window variables plus the sweep interval — the
table is in the repo `CLAUDE.md`) must carry the **same** values on the server
under test and on the harness, or every wait is measured against a window the
server is not using.

An unset variable falls back to the **production** window, never to the short
test value. That direction is deliberate: a harness pointed at a
production-windowed stack then waits slowly, rather than waiting four seconds,
seeing nothing, and passing. If these walks suddenly take minutes per scenario,
the stack is not exporting them — that is the symptom, and it is the safe one.

Other required env: `ALKEMIO_BASE_URL`, `ALKEMIO_SERVER`, `KRATOS_ENDPOINT`,
`MAIL_SLURPER_ENDPOINT`, `AUTH_TEST_HARNESS_PASSWORD`,
`RABBITMQ_MANAGEMENT_ENDPOINT` / `_USER` / `_PASSWORD`.

### Push is asserted at the emit boundary only

Operator Ruling 3c. The acceptance overlay ships no VAPID keys, so real browser
delivery is unobservable. Both suites assert on the cumulative
`message_stats.publish` counter of the `alkemio-push-notifications` queue, via
the RabbitMQ management API, diffed against a baseline taken before the action.
A green push assertion means *the server published the notification*, never
*the browser received it*.

Every recipient in a push assertion is given a synthetic push subscription
first. Without one the server's push adapter no-ops, so a negative assertion
would pass for the wrong reason — the helpers throw rather than proceed if the
subscription is not created.

### Isolation and data lifecycle

The walks register every persona **inline** through the real sign-up flow
rather than reusing the session fixtures in `.auth/`. That is load-bearing:
US3-AS1 asserts the mandated settings defaults of a brand-new account, and
every digest assertion needs read state and digest tracks that start empty. A
persisted session carries both from previous runs.

Persona display names carry a run-unique suffix — not only the email — because
the people-picker lookups locate a person by accessible name, and against a
never-reset dev stack a fixed name resolves to a stale persona from an earlier
run.

**Why `--workers=1`.** These suites assert on two process-wide shared sinks: the
MailSlurper inbox (cleared with `deleteMailSlurperMails()` between scenarios)
and the queue's cumulative publish counter. Anything else publishing or
emailing concurrently lands inside another scenario's delta. The files are also
`mode: 'serial'` — they share one conversation and later scenarios depend on
earlier ones' settings state.

**Residual:** unlike the 033 walks, these do **not** delete the accounts they
create. Each run leaves its personas behind; the run-unique naming is what keeps
that from breaking the next run. Worth fixing if this suite joins the nightly.

## Scenario → test mapping

### Acceptance walks (`client-web`)

| Scenario | Covers | Automated by |
|---|---|---|
| US1-AS1 | Default settings — a direct message produces a push emit once the quiet period elapses, and zero email | `us1-direct-message-notifications.spec.ts` › US1-AS1 |
| US1-AS2 | Recipient enables direct email → exactly one email naming the sender; no message text, deep link and settings link present, no participant address disclosed | `us1-…` › US1-AS2 |
| US1-AS3 | A burst of 5 produces **nothing** during the quiet period, then exactly one digest, and a later message starts a fresh cycle | `us1-…` › US1-AS3 |
| US1-AS4 | The sender is never notified of her own message — publish delta stays 1 even though she *has* an active subscription | `us1-…` › US1-AS4 |
| US1-AS5 | Hostile content (quotes, newlines, HTML-like markup) never reaches the email subject or body | `us1-…` › US1-AS5 |
| US2-AS1 | Group defaults — one push emit per non-sender member (exactly 2, never 3), zero email | `us2-group-message-notifications.spec.ts` › US2-AS1 |
| US2-AS2 | Member enables group email → exactly one email naming the **conversation** | `us2-…` › US2-AS2 |
| US2-AS3 | A non-member with the channel enabled receives nothing while a real member does | `us2-…` › US2-AS3 |
| US2-AS4 | Removing a member reduces the recipient count by exactly one for subsequent messages | `us2-…` › US2-AS4 |
| US2-AS5 | A member who disables group push receives no push emit (scope-limited — see gaps) | `us2-…` › US2-AS5 |
| US3-AS1 | A freshly registered account shows both rows at the mandated defaults: email OFF, push ON, in-app locked OFF with its caption | `us3-messaging-settings-rows.spec.ts` › US3-AS1 |
| US3-AS2 | A pre-existing account loads notification settings without error, same defaults | `us3-…` › US3-AS2 |
| US3-AS3 | Forcing the stored in-app flag on through the public API still produces no in-app notification — enforcement is at the platform boundary | `us3-…` › US3-AS3 |
| US3-AS4 | Toggling email persists across reload and is honoured for the next message | `us3-…` › US3-AS4 |
| US3-AS5 | The chat panel's settings shortcut lands on notification settings with both rows visible | `us3-…` › US3-AS5 |

### It-spec matrix (`server-api`)

| Scenario | Covers | Automated by |
|---|---|---|
| US1-AS1 / US2-AS1 | Default settings: push emit, no email, direct and group | `conversation-messages-positive.it-spec.ts` |
| US1-AS2 / US2-AS2 | Email opt-in: exactly one email, no message text, deep link + settings footer | `conversation-messages-positive.it-spec.ts` |
| US1-AS5 / SC-004 | Hostile content leaks into neither subject nor body | `conversation-messages-positive.it-spec.ts` |
| US1-AS3 / SC-003 | A burst inside one quiet period yields **zero** emails before the quiet period, then exactly one reporting a count of 5 | `conversation-messages-digest.it-spec.ts` |
| US1-AS8 | Unread from two counterparts aggregates into ONE per-recipient email listing both — no pre-R4 equivalent | `conversation-messages-digest.it-spec.ts` |
| US2-AS6 | Unread in two groups aggregates into ONE email listing both | `conversation-messages-digest.it-spec.ts` |
| US2-AS7 | Direct and group email tracks run on independent schedules — the direct one is not held back by the longer group window | `conversation-messages-digest.it-spec.ts` |
| US1-AS7 / SC-009 | The max-delay cap bounds a debounce that never settles | `conversation-messages-digest.it-spec.ts` |
| US1-AS6 / SC-008 | Reading before the timer fires cancels **every** channel — zero emails and zero push publishes | `conversation-messages-read-state.it-spec.ts` |
| US5-AS4 | Reading two of three conversations leaves a digest naming only the third | `conversation-messages-read-state.it-spec.ts` |
| US5-AS3 | Reading after a digest was dispatched starts a fresh cycle | `conversation-messages-read-state.it-spec.ts` |
| US2-AS3 | Non-member receives nothing even with the channel enabled | `conversation-messages-negative.it-spec.ts` |
| US2-AS4 | Removed member stops receiving — membership re-read at send time | `conversation-messages-negative.it-spec.ts` |
| US1-AS4 | Sender never appears as a recipient of their own message | `conversation-messages-negative.it-spec.ts` |
| US2-AS5 | A disabled channel yields zero emits **while another member on defaults still receives** — the comparative half US2-AS5's walk cannot show | `conversation-messages-negative.it-spec.ts` |
| US3-AS1 | Mandated defaults on a freshly created account | `conversation-messages-settings.it-spec.ts` |
| FR-017 | Settings merge field-by-field — touching the direct row leaves the group row untouched | `conversation-messages-settings.it-spec.ts` |
| US3-AS3 / FR-003 | In-app permanently OFF regardless of the stored preference | `conversation-messages-settings.it-spec.ts` |
| US4-AS2 / FR-012 | A messaging digest never decrements the shared push throttle | `messaging-shared-push-throttle-independence.it-spec.ts` |

## Not covered — known gaps

| Scenario | Why not automated end to end | Where it is covered instead |
|---|---|---|
| US5-AS1 / US5-AS2 — whether a **backgrounded** tab advances the read receipt | A client-side question about tab focus. Asserting it API-side by simply not calling the read mutation would be a tautology — it proves the test's own restraint, not the product's | Documented in `conversation-messages-read-state.it-spec.ts`; manual QA |
| US2-AS5's comparative half — "B disabled gets nothing **while others still do**" | By the time the walk reaches AS5, AS4 has removed C, so no other member remains and the comparison is unprovable there | `conversation-messages-negative.it-spec.ts`, which keeps two members precisely so the comparison is real |
| Exact digest **counts** in the walks | The walks run serially against one conversation and nobody reads it, so unread totals accumulate across scenarios — a digest reports what is unread at fire time, not what arrived since the last email. The walks assert the subject *shape* (both single-entry forms) instead | The it-specs, where read state is drained between describes |
| Real browser push delivery | No VAPID keys in the acceptance overlay (risk R-10) | Emit/queue boundary only, per Operator Ruling 3c |
| US3-AS2's actual backfill migration | Proving it needs a destructive `migration:revert` + `migration:run` cycle over the whole table — not appropriate in a repeatable regression spec | The walk guards the observable symptom (no non-nullable-field error, rows at backfilled defaults); the migration cycle itself is a manual acceptance step |
| **US2-AS4's second clause** — a conversation the recipient has lost access to is dropped from an **already-pending** digest | Not covered anywhere, in this repo or upstream. The negative matrix sets up the opposite case and says so at the assertion: C had *no* pending group digest when removed. Reaching the real case needs a message → removal inside one quiet period, then a flush | **Nothing.** This is a genuine hole, not a delegation — the pruning path is unverified |
| US4-AS1 (bot sender), US4-AS3 (legacy-room classification), US4-AS4 (redelivery idempotency), US5-AS5 (unread signal unavailable → fail open) | Not reachable from a black-box, API-only harness: no VC engine in the verification stack, no way to create an untyped legacy room through the public API, no way to force a broker redelivery or an unread-signal outage | `server`: `conversation.notification.service.spec.ts`, `conversation.notification.classification.spec.ts`, `conversation.notification.dedupe.service.spec.ts`, `conversation.digest.flush.service.spec.ts` |
| US4-AS5 — bounded redelivery on total delivery failure | Lives in the delivery service, which this harness does not drive directly | `notifications`: `notification.service.ts` + `notification.service.spec.ts` |

## Notes for whoever maintains this

1. **Never hard-code a messaging wait.** Derive it from `digestWindow(...)`.
   Use `quietGraceMs` to wait *for* a digest and `maxDelayGraceMs` for every
   load-bearing negative assertion — the latter is the strongest bound the
   design offers, so "no email arrived" means "none ever will" rather than
   "none has arrived *yet*". Per-test timeouts come from `testTimeoutMs` /
   `digestTestTimeoutMs([...])`, which scale with the windows the test waits on.

2. **"Wait until N" cannot prove "exactly N".** `waitForMailsCountAtLeast` and
   `waitForQueuePublishIncrease` return at the first observation meeting the
   threshold. An exact-count or exact-delta assertion straight after one of them
   proves only *at least* N, sampled early — and under R4 a leaked recipient's
   digest is armed on **their own** track and fires on their own schedule, so it
   can land long after the intended one. Settle past the relevant track's
   `maxDelayGraceMs` and re-read first: that is what `settledPushDelta` and
   `waitForMailsCountAtLeast`'s `settleMs` option are for.

3. **The group email subject is a deliberate copy change.** An R4 group digest
   names the conversation, not the sender (`New message in {group}`). The
   assertions expecting it fail until notifications#567 lands.

4. **The queue counter never resets.** Always assert on a *delta* against a
   baseline captured before the action. Asserting the raw `publishedTotal`
   against a literal passes the moment anything has ever published to the queue.

5. **Never assert an exact digest count on a direct conversation without
   draining its unread state first.** R4 introduced a second axis of shared
   state besides timing, and it bites differently: `createDirectConversation`
   is deduped per actor pair and a DIRECT conversation cannot be left, so the
   same room comes back on every call and on every *run*. Under FR-018a the
   count in the subject comes from the fire-time unread signal, which
   accumulates whatever that room is holding — regardless of notification
   settings, and regardless of whether a digest was ever armed. The failure
   mode is nastier than an ordering bug: the suite is **green on a fresh stack
   and red on the second run**, so it survives review and breaks nightly on day
   two. Observed exactly that way — `sent you a message` on run one,
   `sent you 2 messages` on run two.

   Drain by sending a throwaway message, `markConversationRead`-ing it as the
   recipient, then waiting `maxDelayGraceMs` so the track the drain armed has
   been swept and found nothing unread. Waiting only `quietGraceMs` lets that
   flush land inside the measured window and break the "exactly one" count. Add
   a cycle to the test timeout (`digestTestTimeoutMs(w, { cycles: 3 })`) to pay
   for the extra wait. `conversation-messages-digest.it-spec.ts` factors this
   into a `drainRecipientUnread()` helper — copy that shape rather than the
   inline version.

6. **A person-to-person email path needs `allowOtherUsersToContactViaEmail`,
   not `allowOtherUsersToSendMessages`.** `sendMessageToUsers` gates on the
   email-consent flag, which is off by default and is a different setting from
   the chat one. Without it the mutation throws `MessagingNotEnabledException`,
   no notification is ever emitted, and any assertion downstream fails on a
   missing trigger rather than on the property under test — which is how the
   shared-push-throttle independence check (US4-AS2/FR-012) spent its whole
   life failing without ever exercising a throttle.
