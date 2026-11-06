# Push notifications — behaviour knowledge

_Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/push-notifications/`, 3 files, 65 cases — 14 skip); the specs, issues and docs listed in § Sources. WHAT and WHY only — no mutations, fixtures or request params. Covers the web-push channel: subscriptions, the `alkemio-push-notifications` queue, the shared throttle, delivery, the native device-token bridge (086) and the push leaf on every settings row. Which kinds exist and who their recipients are is in `notifications.md`. Status legend: **proven** = a green legacy case asserts it; **untested** = code and/or spec only, no case; **disputed** = sources disagree, see § Findings; **unknown-why** = the rule holds but no source states the reason — the reviewer fills the why or writes "unknown, ask product". Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`._

_Review load: 7 findings · 3 unknown-why rows · 9 untested rows (gaps) · 21 constants to tick · 5 open questions. Manual points sit in five places: the Findings, the `unknown-why` rows, the `untested` rows (repeated under Gaps), the "product must rule?" column of the constants, and the Open questions._

## Behaviour rules

| ID | Rule the platform guarantees | Why (business reason, origin) | Actors | Sources (code › file:line · test › spec › case · spec › path) | Status |
|---|---|---|---|---|---|
| **### channel & settings** | | | | | |
| PSH-01 | Push is a third channel on every one of the 41 notification settings rows; each row's push flag is stored and updated independently of its email and in-app flags, and a push-only or push-off row is a valid state. | Full parity with in-app kinds (038 FR-002/FR-007); per-channel control. | registered | code › `user.settings.notification.channels.interface.ts:20-25` · `user.settings.service.ts:57-72` · test › `push-notifications-settings` › 28 `should update push …` cases + `Push channel independence` (3) | proven (28 of 41 rows; the 13 rows added since 038 untested here) |
| PSH-02 | A push is produced for a recipient only when the same recipient resolution that governs email admits them for that kind AND their row has push on; the sender / actor exclusions of the kind apply to push as to the other channels. | One recipient pipeline (notifications NTF-10/15). | registered | code › `notification.recipients.service.ts:169-176, 205-210, 263` · adapters' `pushRecipients.filter(...)` · test › `conversation-messages-negative` › `B (push disabled) gets no push while C (default) still does`; `callout-reaction-notifications` › `swap does NOT publish a push` | proven |
| PSH-03 | Delivery is one queue message per ACTIVE browser subscription of each admitted recipient plus one per native device token, published to `alkemio-push-notifications`; a recipient with push on but no subscription or token is skipped silently; one failed publish never stops the others. | Each device receives its own copy; no subscription = nothing to deliver (034 edge case; 086 D-22). | server | code › `notification.push.adapter.ts:98-204` · `push.subscription.service.ts:131-139` · `device.push.token.service.ts:84-89` · test › `callout-reaction-notifications` › `genuine new reaction publishes exactly one push per active subscription of the publisher`; `form-response` › `the subspace admin gets one push publish per active subscription`; `conversation-messages-positive` › `group message produces one push emit per non-sender member…`; `associates` › `… one push emit…` | proven |
| PSH-04 | The push payload carries a server-rendered title and body, a relative url, the kind name, a timestamp and an optional collapse tag; it never carries chat message text; the url is never the bare home path for kinds that have a target. | Clients render verbatim; message text must not reach the OS (034 FR-008/FR-010/FR-024; 086 FR-007 amended 2026-10-20). | server | code › `notification.push.adapter.ts:17-23, 121-129` · `push.notification.message.ts:1-24` · `url.generator.service.ts:114-124` · spec › 034 FR-024 | untested (unit-only; several legacy kinds still push `url: '/'` — see F-6) |
| PSH-05 | Non-chat pushes are rate-limited per user to 10 per minute in a fixed epoch-minute bucket; excess pushes in that minute are dropped silently; a store error lets the push through; chat digest pushes never touch this bucket, so chat volume cannot starve other kinds. | 038 FR-010 (throttle); 034 FR-012 / D-7 / D-21 (independence, fail open, the TTL defect fixed). | server | code › `push.throttle.service.ts:42-103` · `notification.push.adapter.ts:43-96` · test › `messaging-shared-push-throttle-independence` › `after a messaging digest push, a non-messaging push for the same user still publishes` | proven (independence); the cap itself untested |
| PSH-06 | A newer push for the same (kind, callout) or the same chat track replaces the previous unattended one on the device instead of stacking (collapse tag); other kinds stack. | 034 FR-024; 041 FR-012. | registered | code › `notification.space.adapter.ts:1860` · `conversation.digest.track.ts:130-131` · `conversation.digest.copy.ts:66` | untested |
| PSH-07 | With push disabled at the platform (`notifications.push.enabled` off) nothing is published and the VAPID public key reads as null. | Kill switch for environments without push credentials. | server | code › `notification.push.adapter.ts:38-50, 87-89` · `push.subscription.resolver.queries.ts:28-38` | unknown-why |
| **### subscriptions** | | | | | |
| PSH-08 | Any caller can read the platform's VAPID public key; it is the same key for everyone, base64url, at least 80 characters, and the private key is never exposed. | Clients need the key to subscribe (038 US1). | registered (no gate in the resolver) | code › `push.subscription.resolver.queries.ts:22-38` · test › `push-subscriptions-lifecycle` › `VAPID Public Key` (3); `push-subscriptions-security` › `VAPID Key Security` (2) | proven |
| PSH-09 | Subscribing requires an authenticated user and stores an ACTIVE subscription (endpoint, keys, optional user agent); subscribing again with the same endpoint updates that record in place (same id, new keys / agent, re-activated unless DISABLED) — even when the endpoint was previously held by another user, who loses it. | Browsers re-subscribe with the same endpoint; an endpoint belongs to one device. | registered | code › `push.subscription.resolver.mutations.ts:20-35` · `push.subscription.service.ts:34-86` · test › `push-subscriptions-lifecycle` › `should create a new push subscription`, `should update existing subscription when same endpoint is used`, `Subscription fields` (2) | proven (upsert); the cross-user re-bind disputed (F-2) |
| PSH-10 | A user holds at most 10 ACTIVE subscriptions; a new one beyond the cap removes the oldest to make room (also when an endpoint is re-bound from another user). | 038 FR-008. | registered | code › `push.subscription.service.ts:196-217` · spec › server `specs/038-pwa-push-notifications/spec.md` FR-008 | untested (two cases `test.skip`) |
| PSH-11 | Unsubscribing marks the subscription DISABLED (retained, no deliveries); only its owner may do so; a foreign or unknown id fails with the identical "Push subscription not found" error; re-enabling restores only a DISABLED subscription. | 038 FR-005; no enumeration of other users' ids. | registered | code › `push.subscription.service.ts:88-129` · test › `push-subscriptions-lifecycle` › `Unsubscribe` (3); `push-subscriptions-security` › `should return identical error for unauthorized vs nonexistent subscription ID`, `should reject non-UUID subscriptionID…`, `should reject SQL injection…` | proven (enable untested) |
| PSH-12 | A user lists only their own subscriptions — ACTIVE and DISABLED, never EXPIRED — with id, status, created date, user agent and last successful delivery, and never the endpoint or keys. | Subscription management UI; keys are secrets (038 US5). | registered | code › `push.subscription.service.ts:141-151` · `push.subscription.interface.ts:15-47` · `push.subscription.resolver.queries.ts:40-58` · test › `push-subscriptions-lifecycle` › `List (myPushSubscriptions)` (3 live); `push-subscriptions-security` › `should not expose subscription details…` | proven; "DISABLED is listed" disputed (F-3) |
| PSH-13 | A delivery that the push service answers 410 or 404 marks the subscription EXPIRED (no retry); any other failure (429, 401 misconfiguration, network) is logged and dropped without retry and without expiring; a success stamps the last-active date. | RFC 8030 §7.3; a transient error must never kill a live subscription (086 FR-009, X-4); no DLX, so no requeue (038 NFR-003). | server | code › `push.delivery.service.ts:46-158` · spec › `origin/main:specs/086-app-push-mvp/spec.md` FR-009 | untested (unit-only) |
| PSH-14 | Every day at midnight, ACTIVE subscriptions with no successful delivery for 30 days and all EXPIRED subscriptions are deleted. | Keep the table to live devices (038 SC-007). | server | code › `push.subscription.service.ts:169-194` | unknown-why (the 30-day value) |
| PSH-15 | Deleting a user deletes all their subscriptions and device tokens. | 038 FR-014. | server | code › `push.subscription.entity.ts:31-33` · `device.push.token.entity.ts:30-35` | untested |
| PSH-16 | The subscribe input accepts any strings: an empty key, an oversized key, a non-HTTPS, private-network or non-URL endpoint are all stored. | — (the DTO declares validators, but the input is not on the validation allowlist — 086 BF-6). | registered | code › `push.subscription.dto.subscribe.input.ts:11-44` · `src/core/validation/handlers/base/base.handler.ts` (allowlist, see 086 FR-004 note) · test › `push-subscriptions-security` › 4 `Input Validation` + 5 `SSRF` cases all `skip`; `push-subscriptions-lifecycle` › `should fail with invalid subscription data` `skip` | disputed (F-1) |
| **### native devices (086)** | | | | | |
| PSH-17 | An authenticated app user binds a native device token (platform `ios` or `android`) to themselves in one statement; a token already bound to another user is re-bound to the caller; a user holds at most 10 tokens (newest by last update kept); unbinding is self-scoped and a no-op for unknown or foreign tokens. | One row per device so a shared phone never leaks the previous user's notifications (086 FR-001..003, D-1/D-14, SEC-086-01). | registered | code › `device.push.token.resolver.mutations.ts:14-58` · `device.push.token.service.ts:39-77` · `device.push.token.entity.ts:21-38` · spec › 086 FR-002/FR-003 | untested (unit-only, by design: 086 §6(c)) |
| PSH-18 | Native messages travel on the same queue and payload as web push; the consumer branches on `platform`; APNs 410 or 400 `BadDeviceToken` deletes the token (whoever holds it), every other outcome — including every FCM outcome — is logged and dropped; absent credentials disable that platform's transport silently; a native failure can never expire a web subscription. | 086 FR-005..FR-008, D-4/D-17/D-23. | server | code › `push.delivery.service.ts:54-79` · `native.push.sender.service.ts` · `device.push.token.service.ts:98-100` · `alkemio.yml:515-544` | untested (unit-only) |
| **### operations** | | | | | |
| PSH-19 | Push delivery is observable only at the queue: the harness proves "the server published N messages", never that a device received anything; acceptance environments sign with the committed default VAPID pair. | 034 Ruling 3c / R-10; test plan "push is asserted at the emit boundary only". | — | test › `notification.helpers.ts:178-259` · client-web › `messaging-notifications-test-plan.md` § Push is asserted at the emit boundary only · `alkemio.yml:511-514` | unknown-why (ops fact, recorded for the reviewer) |

Numbering note: ids are contiguous.

## Who may (role × action)

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

| action | platform admin roles (which) | organization admin / owner | space admin | space member | registered | anonymous |
|---|---|---|---|---|---|---|
| read the VAPID public key | Y | Y | Y | Y | Y | Y (no gate; null when push is disabled) |
| subscribe / unsubscribe / re-enable a browser subscription | own only | own | own | own | own | N ("Authentication required…") |
| list push subscriptions | own only | own | own | own | own | N |
| register / unregister a native device token | own only | own | own | own | own | N |
| receive a push for a kind | per the kind's recipient rule (notifications § Who may) and the row's push flag | same | same | same | same | – |
| change the push flag on a settings row | PUSA, PCFA (anyone's); others own | own | own | own | own | N |
| read or change another user's subscriptions | N (no surface) | N | N | N | N | N |

Evidence: `push.subscription.resolver.queries.ts:22-58`; `push.subscription.resolver.mutations.ts:15-79`; `device.push.token.resolver.mutations.ts:14-58`; `push.subscription.service.ts:88-151` (every read / write is keyed on the caller's id); `user.resolver.mutations.ts:101-116`; test › `push-subscriptions-lifecycle` › `should not allow unsubscribing another users subscription`, `should not show other users subscriptions`. There is no admin surface over subscriptions; crosscheck has no row for this area.

## Constants the rules depend on (rebaseline candidates)

| Constant | Value today | Source | product must rule? |
|---|---|---|---|
| Queue | `alkemio-push-notifications`, durable, created if missing; direct exchange `''` | `notification.push.adapter.ts:188-192`; `push.delivery.service.ts:46-50` | |
| Push enabled | `notifications.push.enabled` (`PUSH_NOTIFICATIONS_ENABLED`) default true | `alkemio.yml:510` | |
| VAPID | public / private keys and subject `mailto:notifications@alkem.io` with committed defaults (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) | `alkemio.yml:511-514` | |
| Max subscriptions per user | 10 (`PUSH_MAX_SUBSCRIPTIONS_PER_USER`), also the device-token cap | `alkemio.yml:545`; `device.push.token.service.ts:18-20` | |
| Throttle | 10 per minute per user (`PUSH_THROTTLE_MAX_PER_MINUTE`), key `push:throttle:<userId>:<epochMinute>`, TTL 60 s, fail open | `alkemio.yml:546-547`; `push.throttle.service.ts:57-103` | |
| Retry | `max_attempts` 5 (`PUSH_RETRY_MAX_ATTEMPTS`) — `retryCount` is always 0 and never incremented | `alkemio.yml:548-549`; `notification.push.adapter.ts:142`; `push.delivery.service.ts:83-93` | F-4 |
| Stale cleanup | 30 days (`PUSH_CLEANUP_STALE_DAYS`), cron `EVERY_DAY_AT_MIDNIGHT` | `alkemio.yml:550-551`; `push.subscription.service.ts:187-194` | |
| Subscription status | `ACTIVE`, `DISABLED`, `EXPIRED` | `push.subscription.interface.ts:4-8` | |
| Expiring status codes | 410, 404 → EXPIRED; everything else dropped, not expired | `push.delivery.service.ts:120-156` | |
| Native platforms | `ios`, `android`; APNs environment `sandbox` (default) / `production`, closed enum | `alkemio.yml:526-544`; 086 FR-002 | |
| Native permanent failures | APNs 410, APNs 400 `BadDeviceToken` → token deleted; no FCM outcome deletes | `device.push.token.service.ts:91-100`; 086 FR-008 | |
| Payload shape | `{subscriptionId, userId, endpoint, keys{p256dh, auth}, payload{title, body, url, eventType, timestamp, tag?}, retryCount}`; native `{userId, platform, token, payload}` | `push.notification.message.ts` | |
| Collapse tags | reaction `SPACE_COLLABORATION_CALLOUT_REACTION:<calloutId>`; chat `messaging-digest-direct` / `-group`; none elsewhere | `notification.space.adapter.ts:1860`; `conversation.digest.track.ts:130-131` | |
| Legacy bare-home urls | user message, org message / mention / sender copy, platform role changed, user registered, user removed, sign-up welcome push `url: '/'` | `notification.user.adapter.ts:130, 567`; `notification.organization.adapter.ts:123, 191, 247`; `notification.platform.adapter.ts:152, 488, 545` | F-6 |
| Column limits | endpoint `LONG_TEXT_LENGTH`, keys and user agent `MID_TEXT_LENGTH`; endpoint has no unique index (dropped as drift — 086 D-14 note) | `push.subscription.entity.ts:13-26`; `src/migrations/1777000000000-CreateCollaboraDocument.ts:9` | F-2 |
| Error texts | `Authentication required to subscribe to push notifications` / `… unsubscribe …` / `… enable …` / `… view push subscriptions` / `… register a device push token` / `… unregister …`; `Push subscription not found`; `Push subscription not found or not eligible for re-enabling` | resolvers and service cited | |
| Delivery log markers | `Push notifications queued`, `Push notification delivered`, `Push subscription expired (410 Gone)`, `Push notification delivery failed, dropping message`, `Push notification throttled for user`, `Stale push subscription cleanup completed` | `notification.push.adapter.ts:166-175`; `push.delivery.service.ts`; `push.throttle.service.ts:81-84` | |
| GraphQL surface | `vapidPublicKey`, `myPushSubscriptions`, `subscribeToPushNotifications`, `unsubscribeFromPushNotifications`, `enablePushSubscription`, `registerDevicePushToken`, `unregisterDevicePushToken`, `PushSubscription{id, createdDate, status, userAgent, lastActiveDate}`, `PushSubscriptionStatus`, `UserSettingsNotificationChannels.push` | `schema.graphql:5126, 5208, 5308, 5324-5328, 6274-6288` | |
| Settings rows with push on by default | all rows except: five platform-admin rows, `forumDiscussionCreated`, `space.admin.userEmailChanged`, the four poll rows (see notifications § Constants) | `user.service.ts:337-498` | |
| Test-harness push observation | RabbitMQ management API `message_stats.publish` on the queue; synthetic subscriptions `https://fcm.googleapis.com/fcm/send/<unique>` | `notification.helpers.ts:178-259`; `push-notifications.request.params.ts:167-176` | |
| Client contract (not server) | service worker `notificationclick` resolves relative `url` against the origin; app mode never creates a web subscription (086 D-9) | 034 contract C-4; 086 FR-019 | |

## Where this lands in the new core

Push is a transport, not a kind: in the rebuild it sits beside email as a delivery adapter fed by the same resolved recipient set (notifications NTF-10), with one `push_subscription` table that already has the right shape (browser rows and native-token rows differ only in their address) and a per-user cap and throttle as transport policy. Three facts found here should shape the model: (1) the throttle is a per-transport bucket that chat deliberately bypasses — the new core should make "participates in the shared budget" a property of the kind, not a second method on the adapter; (2) expiry and cleanup are transport verdicts (410/404, 30-day idle) and must stay out of the kind registry; (3) the endpoint is the natural key of a browser subscription and today has no uniqueness and no validation (F-1/F-2) — the new core should give it both. Payload copy, tags and the committed VAPID keys are rebaseline rows.

## Findings (sources disagree, or likely defect)

1. **Subscribe input is not validated (PSH-16).** Code: `SubscribeToPushNotificationsInput` carries `@IsUrl`, `@IsNotEmpty`, `@MaxLength`, but the input is not in the validation handler allowlist, so empty or oversized keys and any endpoint string (http, localhost, cloud metadata, `file:`) are stored and later POSTed to by `web-push` from the server pod (SSRF surface). Test: nine cases that would prove validation are `skip`; 086 recorded the missing entry as baseline finding BF-6 and deliberately did not add it (SIMP-402). Spec: 038 says nothing about endpoint validation. Ruling: add the allowlist entry + an endpoint host policy, or accept and record.
2. **An endpoint can be re-bound to another user (PSH-09).** Code: `subscribe` finds by endpoint and overwrites `userId` with the caller (`push.subscription.service.ts:39-65`), so anyone who learns a device's endpoint can take it over; there is no unique index on endpoint either (dropped as drift). Test: `should not allow user A to hijack user B endpoint…` accepts both outcomes (branches on `resB.body.errors`), so it pins nothing. Spec: none. Ruling: keep (device changed hands) with ownership proof, or refuse.
3. **DISABLED subscriptions are listed (PSH-12).** Code: `getUserSubscriptions` returns ACTIVE + DISABLED; the schema description says so. Test: `should not list unsubscribed subscriptions` is `skip` and expects exclusion; the live case `should return no ACTIVE subscriptions…` filters DISABLED out before asserting. Ruling: which is the contract — then un-skip or rewrite the case.
4. **Retry configuration is dead (PSH-13).** Code: `retryCount` is published as 0 and never incremented; the `max_attempts` check can never trigger; every failure is dropped on first attempt, matching 038 NFR-003 ("no automatic retry") but contradicting the `PUSH_RETRY_MAX_ATTEMPTS` knob. Ruling: delete the knob or implement retry.
5. **Awareness platform-admin kinds drop the actor from push only.** See notifications F-3 (`notification.platform.adapter.ts:414-416, 478-480`): push is the one channel on which the acting admin is not told about the sign-up / space they caused. Ruling there.
6. **Eight legacy kinds push `url: '/'`.** Code: user message, org message / mention / sender copy, role changed, user registered / removed, welcome (see Constants). 034 FR-010 and the url generator's own comment call the bare home link an anti-pattern; 086 D-13 proved the invitation kind carries a real url. Ruling: rebaseline each to a target, or accept for kinds with no natural target.
7. **"All 28 events" is stale.** Test: the settings suite enumerates 28 rows; the server has 41 (13 added by 034, 041, 061, 062, 080, 097). Not a product disagreement — a coverage hole on the push leaf of the 13 newer rows.

## Gaps (no legacy case)

Untested rules by id: PSH-04, PSH-06, PSH-07, PSH-10, PSH-13, PSH-14, PSH-15, PSH-17, PSH-18; plus the untested clauses of PSH-01 (13 newer rows), PSH-05 (the 10-per-minute cap and the fail-open), PSH-11 (re-enable), PSH-16 (every validation case is skipped).

Behaviours the area has that neither reading nor tests pinned down:
- The throttle actually dropping the 11th push in a minute, and the next minute starting fresh.
- The 10-subscription cap under sequential and concurrent registration (both cases skipped).
- EXPIRED handling end to end (a 410 from the push service → status EXPIRED → never listed → cleaned up).
- Re-enabling a DISABLED subscription and that an EXPIRED one cannot be re-enabled.
- Push for the classic space kinds (publish, contribution, comment, update, application, join, invitation) — every emit assertion today is on reaction, form response, chat and organization-associate kinds.
- The payload content (title / body / url / tag) — asserted nowhere; only publish counts are observed.
- Push with the platform switch off, and `vapidPublicKey` returning null.
- User deletion cascading subscriptions and tokens.
- Everything native (register / rebind / cap / unregister / APNs-FCM verdicts) — unit-only by the 086 decision; HG-2 real-device delivery is a human gate.
- A subscription with keys that do not decrypt (web-push rejects at send) — what status it ends in.

## Open questions (could not be determined from the three sources)

1. **Is push validation wired anywhere else?** The allowlist in `src/core/validation/handlers/base/base.handler.ts` was not read line by line; 086's text says the live web-push input is absent from it (BF-6). Confirm before filing F-1.
2. **Is the endpoint unique in production data?** The index was dropped as migration drift (086 D-14); whether duplicate endpoint rows exist on ACC/PROD is a W4 probe, not a code fact.
3. **Where are real VAPID keys?** Acceptance signs with the committed defaults (034 R-10 / DIS-6); whether production overrides them is an infra-ops fact.
4. **Does the daily cleanup run on every replica?** The cron is idempotent (034 A-8 says so) but a multi-replica double run was not verified.
5. **Spec 088-app-push-tap-routing** is listed on `origin/main` without a readable `spec.md`; what a tap on a push opens in the app could not be read.

## Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/services/adapters/notification-push-adapter/notification.push.adapter.ts`, `push.throttle.service.ts`, `push.delivery.service.ts`, `push.notification.message.ts`, `native.push.sender.service.ts`
- `src/domain/push-subscription/push.subscription.service.ts`, `push.subscription.resolver.mutations.ts`, `push.subscription.resolver.queries.ts`, `push.subscription.entity.ts`, `push.subscription.interface.ts`, `dto/push.subscription.dto.subscribe.input.ts`, `dto/push.subscription.dto.delete.ts`
- `src/domain/device-push-token/device.push.token.service.ts`, `device.push.token.resolver.mutations.ts`, `device.push.token.entity.ts`
- `src/services/api/notification-recipients/notification.recipients.service.ts` (push channel branch); the five `notification.*.adapter.ts` push blocks; `src/services/event-handlers/internal/message-inbox/conversation.digest.flush.service.ts:364-405`, `conversation.digest.copy.ts`, `conversation.digest.track.ts`
- `src/domain/community/user-settings/user.settings.notification.channels.interface.ts`, `user.settings.service.ts`; `src/domain/community/user/user.service.ts:337-498`
- `src/services/infrastructure/url-generator/url.generator.service.ts:100-148`
- `src/migrations/1772396107069-CreatePushSubscriptionTable.ts`, `1790800000000-CreateDevicePushTokenTable.ts`, `1777000000000-CreateCollaboraDocument.ts:9`
- `alkemio.yml:509-551`, `schema.graphql`
- git: `9f13879f8` (#5884 PWA push), `a0bd03661` (#6334 throttle fix + messaging bypass)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/push-notifications/push-notifications-settings.it-spec.ts`, `push-subscriptions-lifecycle.it-spec.ts`, `push-subscriptions-security.it-spec.ts`, `push-notifications.request.params.ts`
- `server-api/src/functional-api/notifications/notification.helpers.ts` (queue helpers) and the push-emit cases in `callout-reactions/`, `messaging/`, `space/collaboration/form-response.it-spec.ts`, `organization/associates.it-spec.ts` (listed under PSH-03/05)
- client-web walks (list only): `functional-e2e/messaging-notifications/us1-*.spec.ts` › US1-AS1/AS4, `us2-*.spec.ts` › US2-AS1/AS5; `form-callout-framing/us4-notifications.spec.ts` › US4-AS1; plan `messaging-notifications-test-plan.md` § Push is asserted at the emit boundary only
- `CLAUDE.md` § Messaging digest windows

Specs / issues:
- server `specs/038-pwa-push-notifications/spec.md` (FR-001…FR-014, NFR-003, clarifications 2026-03-01)
- `agents-hq/specs/034-messaging-notifications/spec.md` (FR-012, FR-024, D-7, D-21, R-10, DIS-6)
- `origin/main:specs/041-callout-reaction-notifications/spec.md` (FR-012); `086-app-push-mvp/spec.md` (FR-001…FR-009, D-1…D-24, BF-6, SC-006/007/014/015); `065-platform-admin-notification-routing/spec.md` (FR-011/012)
