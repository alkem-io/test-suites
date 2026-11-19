# Push notifications: behaviour rules

_What the platform does today for push notifications: the push switch on every notification setting, browser subscriptions, the per-person limit, delivery, and push to the phone app: what it does, why, who may, and what is still to answer. Which kinds of notification exist and who receives them is in `notifications.md`. The layout is the one piloted in `communications.md`: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 7 · Technical Lead 3 · Quality Lead 5 · Security Lead 2 · Service Operations Lead 2. By state: 19 open · 0 with a suggested answer. Proof of the 19 rules: 8 proven by a test · 11 untested (Appendix A)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason, when there is one. "—" means no source states one. The product review has not been through this file yet; it fills the business why and the user story where they are missing.
- **Decided by** names the source of the decision: a spec with its requirement, a server pull request or commit, an issue or a document. "Not decided: exists in the code" means the behaviour is there and nobody chose it. "Not decided: a defect" means today's behaviour is a fault.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: F1)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F6)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.

## 1. Rules

### Channel and settings

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PSH-01 | Push is a third channel, next to email and in-app, on each of the 41 notification settings. The push switch of a setting is stored and changed on its own; push only, or push off, is a valid choice. **(open: F7)** | Full parity with in-app kinds (038 FR-002/FR-007); per-channel control. | — | — | Spec 038 FR-002, FR-007 |
| PSH-02 | A person gets a push only when they would also receive that notification by email and their push switch for it is on. Whoever is left out of a notification, such as its sender, is left out of the push too. **(open: F5)** | — | — | One recipient pipeline (notifications NTF-10/15). | Notifications rules NTF-10 and NTF-15 (`notifications.md`) |
| PSH-03 | Each active browser and each phone of a person gets its own copy of a push. Someone with push on but no browser or phone registered is skipped silently, and one failed send never stops the others. | Each device receives its own copy; no subscription = nothing to deliver (034 edge case; 086 D-22). | — | — | Spec 034 (edge case); spec 086 D-22 |
| PSH-04 | A push carries a title and a text written by the server, a link, the kind of notification, a time and sometimes a grouping tag. It never carries the text of a chat message. The link is never just the home page when the notification has a target. **(defect in part: F6)** | message text must not reach the OS (034 FR-008/FR-010/FR-024; 086 FR-007 amended 2026-10-20). | — | Clients render verbatim | Spec 034 FR-008, FR-010, FR-024; spec 086 FR-007 |
| PSH-05 | Pushes other than chat are limited to 10 per minute per person; more in the same minute are dropped silently. If the counter cannot be reached, the push is sent. Chat pushes do not count towards the limit, so chat cannot crowd out other notifications. | — | — | 038 FR-010 (throttle); 034 FR-012 / D-7 / D-21 (independence, fail open, the TTL defect fixed). | Spec 038 FR-010; spec 034 FR-012, D-7, D-21 |
| PSH-06 | A newer push about reactions on the same callout, or about the same chat, replaces the earlier unread one on the device instead of piling up. Other kinds pile up. | — | — | — | Spec 034 FR-024; spec 041 FR-012. |
| PSH-07 | When push is switched off for the whole platform, nothing is sent and browsers get no key to subscribe with. **(open: Q-PSH-07)** | — | — | Kill switch for environments without push credentials. | Not decided: exists in the code |

### Browser subscriptions

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PSH-08 | Anyone, signed in or not, can read the platform's public push key. It is the same key for everyone, and the private key is never shown. | — | — | Clients need the key to subscribe (038 US1). | Spec 038 US1 |
| PSH-09 | Subscribing needs a signed-in user and stores the browser as an active subscription. Subscribing again from the same browser updates that record, also when it was held by another user, who then loses it. **(open: F2a, OQ2)** | — | — | Browsers re-subscribe with the same endpoint; an endpoint belongs to one device. | Not decided: exists in the code |
| PSH-10 | A person has at most 10 active browser subscriptions. One more removes the oldest to make room. | — | — | — | Spec 038 FR-008. |
| PSH-11 | Unsubscribing switches a subscription off but keeps it, and only its owner can do that. Someone else's subscription and one that does not exist give the same "not found" answer. Only a switched-off subscription can be switched on again. | 038 FR-005; no enumeration of other users' ids. | — | — | Spec 038 FR-005 |
| PSH-12 | A person lists only their own subscriptions: the active and the switched-off ones, never the expired ones, and never the technical address or keys. **(open: F3)** | Subscription management UI; keys are secrets (038 US5). | — | — | Spec 038 US5 |
| PSH-13 | When the push service answers that a subscription is gone, it is marked expired and not tried again. Any other failed send is logged and dropped: no second attempt, and the subscription stays. A successful send records the date. **(open: F4)** | — | — | RFC 8030 §7.3; a transient error must never kill a live subscription (086 FR-009, X-4); no DLX, so no requeue (038 NFR-003). | RFC 8030 §7.3; spec 086 FR-009; spec 038 NFR-003 |
| PSH-14 | Every day at midnight, active subscriptions with no successful send for 30 days and all expired subscriptions are deleted. **(open: Q-PSH-14, OQ4)** | — | — | Keep the table to live devices (038 SC-007). | Spec 038 SC-007; the 30-day value is not decided |
| PSH-15 | Deleting a user deletes all their browser subscriptions and phone registrations. | — | — | — | Spec 038 FR-014. |
| PSH-16 | The subscribe request is not checked: an empty or oversized key and any address, including non-secure and internal ones, are stored. **(defect: F1, OQ1)** | — | — | the DTO declares validators, but the input is not on the validation allowlist — 086 BF-6 | Not decided: a defect |

### Phones (the native app)

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PSH-17 | A signed-in app user registers their phone for push. A phone that was registered to another user moves to the new user. A person has at most 10 phones registered. Removing a registration only works on one's own. | One row per device so a shared phone never leaks the previous user's notifications (086 FR-001..003, D-1/D-14, SEC-086-01). | — | — | Spec 086 FR-001 to FR-003, D-1, D-14, SEC-086-01 |
| PSH-18 | Phone pushes use the same queue and content as browser pushes. A phone registration is deleted only when Apple reports the phone's token as gone or invalid; every other failure, and every Android failure, is logged and dropped. A phone failure never expires a browser subscription. | — | — | — | Spec 086 FR-005..FR-008, D-4/D-17/D-23. |

### Operations

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| PSH-19 | Tests can only see that the server queued a push, never that a device received it. Acceptance environments sign pushes with the default key pair that sits in the code repository. **(open: Q-PSH-19, OQ3)** | — | — | 034 Ruling 3c / R-10; test plan "push is asserted at the emit boundary only". | Spec 034 Ruling 3c, R-10 |

Numbering note: ids are contiguous.

## 2. Rights

_Y = may · N = refused · – = does not apply. Conditions are footnotes under the table. Evidence is in Appendix B._

| ID | Action | Signed-in user | Platform Users Admin | Platform Content Full Access | Other platform roles | Visitor |
|---|---|---|---|---|---|---|
| W1 | Read the public push key | Y | Y | Y | Y | Y¹ |
| W2 | Subscribe, unsubscribe or switch a browser subscription back on | Y² | Y² | Y² | Y² | N |
| W3 | List push subscriptions | Y² | Y² | Y² | Y² | N |
| W4 | Register or remove a phone for push | Y² | Y² | Y² | Y² | N |
| W5 | Receive a push for a kind of notification | Y³ | Y³ | Y³ | Y³ | – |
| W6 | Change the push switch on a notification setting | Y² | Y⁴ | Y⁴ | Y² | N |
| W7 | Read or change another user's subscriptions | N | N | N | N | N |

"Signed-in user" includes organisation admins and owners, space admins and space members: no space or organisation role adds a right here. There is no admin screen or call over other people's subscriptions (W7).
¹ No sign-in is needed. The key is empty when push is switched off for the platform. ² Their own only. ³ As the recipient rule of that kind allows (the rights section of `notifications.md`), and only with the push switch of that setting on. ⁴ Anyone's. The former table wrote "PUSA, PCFA (anyone's)"; "PUSA" is read here as Platform Users Admin, which is question W6.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). Ids: F = finding, OQ = open question, Q-PSH-nn = a rule whose reason no source states, GAPS and CONST = the test gaps and the constants. The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 7 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Subscriptions | decision | Should a person's list show the subscriptions they switched off? The server shows them; a skipped test expects them hidden. | Product Lead (Quality Lead then un-skips or rewrites the case) | — | open |
| F5 | Channel | decision | On push only, the acting admin is not told about the sign-up or the Space they caused. This is decided with finding F3 of `notifications.md`. | Product Lead | — | open |
| F6 | Channel | decision | Eight older kinds of push open the home page instead of a target (user message, organisation message, mention and sender copy, role changed, user registered, user removed, welcome). Give each a target, or accept it for kinds with no natural target? | Product Lead (Technical Lead makes the change) | — | open |
| Q-PSH-07 | Channel | decision | Why does this rule exist? The only reason found is a switch for environments without push credentials. Must the new core keep a platform-wide off switch? | Product Lead | — | open |
| Q-PSH-14 | Subscriptions | decision | Why 30 days? No source states why a subscription is deleted after 30 days without a successful send. | Product Lead | — | open |
| Q-PSH-19 | Operations | decision | Why does this rule exist? It records how push is tested and signed on acceptance, not something a user sees. Is it a rule the new core must keep, or only a note for testers? | Product Lead | — | open |
| CONST | All | decision | 18 constants have no answer yet in "product must rule?" (Appendix E). Which must product rule on? "Rules on it" proposes a role per row. | Product Lead (Technical Lead and Security Lead rule on their own rows) | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 3 to answer, 4 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Subscriptions | tidy-up | The retry setting does nothing: every failed push is dropped at the first attempt. Remove the setting or build the retry? | Technical Lead | — | open |
| OQ1 | Subscriptions | check | Is the subscribe request checked anywhere else? Read the validation list line by line before F1 is filed. | Technical Lead | — | open |
| OQ5 | Phones | spec | Spec 088 (what a tap on a push opens in the app) is listed without a readable text. Where is it, and what should a tap open? | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Subscriptions | defect | The subscribe request is not checked, so any address is stored and the server later sends to it, internal addresses included. Add the check and a policy on allowed addresses, or accept the risk and record it? | Security Lead, then Technical Lead | — | open |
| F2a | Subscriptions | risk | Anyone who learns the push address of a browser can take that subscription over. Keep the hand-over (a device changes hands) but ask for proof of ownership, or refuse it? | Security Lead, then Technical Lead | — | open |
| F6 | Channel | decision | Eight older kinds of push open the home page instead of a target (user message, organisation message, mention and sender copy, role changed, user registered, user removed, welcome). Give each a target, or accept it for kinds with no natural target? | Product Lead (Technical Lead makes the change) | — | open |
| CONST | All | decision | 18 constants have no answer yet in "product must rule?" (Appendix E). Which must product rule on? "Rules on it" proposes a role per row. | Product Lead (Technical Lead and Security Lead rule on their own rows) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 5 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2b | Subscriptions | test | The case "should not allow user A to hijack user B endpoint…" accepts both outcomes, so it proves nothing. Fix it once F2a is answered. | Quality Lead | — | open |
| F7 | Channel | test | The settings test covers 28 of the 41 notification settings. Add the push switch of the 13 newer ones. | Quality Lead | — | open |
| OQ2 | Subscriptions | check | Do two subscriptions with the same push address exist in the acceptance or production data? The rule that kept them unique was dropped. | Quality Lead | — | open |
| W6 | Channel | check | May a Platform Users Admin change the push switch of another user? The former who-may table says "PUSA, PCFA (anyone's)"; `contributor-management.md` CM-19 names only the user and Platform Content Full Access. | Quality Lead | — | open |
| GAPS | All | test | 9 rules and parts of 4 more have no test, and 10 behaviours were never pinned down (Appendix D). Which get a case before the acceptance checklist is drawn from this file? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Subscriptions | decision | Should a person's list show the subscriptions they switched off? The server shows them; a skipped test expects them hidden. | Product Lead (Quality Lead then un-skips or rewrites the case) | — | open |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 2 to answer, 2 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Subscriptions | defect | The subscribe request is not checked, so any address is stored and the server later sends to it, internal addresses included. Add the check and a policy on allowed addresses, or accept the risk and record it? | Security Lead, then Technical Lead | — | open |
| F2a | Subscriptions | risk | Anyone who learns the push address of a browser can take that subscription over. Keep the hand-over (a device changes hands) but ask for proof of ownership, or refuse it? | Security Lead, then Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Operations | check | Does production sign pushes with its own key pair, or with the default pair that sits in the code repository, as acceptance does? | Service Operations Lead (Security Lead rules on it if the default pair is in use) | — | open |
| CONST | All | decision | 18 constants have no answer yet in "product must rule?" (Appendix E). Which must product rule on? "Rules on it" proposes a role per row. | Product Lead (Technical Lead and Security Lead rule on their own rows) | — | open |

### Service Operations Lead

[Service Operations Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Sub-circles/Operational%20Services/Roles/Service%20Operations%20Lead.md) · Delivery › Operational Services (Valentin) · 2 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ3 | Operations | check | Does production sign pushes with its own key pair, or with the default pair that sits in the code repository, as acceptance does? | Service Operations Lead (Security Lead rules on it if the default pair is in use) | — | open |
| OQ4 | Operations | check | Does the nightly clean-up run safely when several copies of the server run at the same time? | Service Operations Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`. The Actors column uses the role shorthands listed in Appendix B._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| PSH-01 | Push is a third channel on every one of the 41 notification settings rows; each row's push flag is stored and updated independently of its email and in-app flags, and a push-only or push-off row is a valid state. | registered | code › `user.settings.notification.channels.interface.ts:20-25` · `user.settings.service.ts:57-72` · test › `push-notifications-settings` › 28 `should update push …` cases + `Push channel independence` (3) | proven (28 of 41 rows; the 13 rows added since 038 untested here) |
| PSH-02 | A push is produced for a recipient only when the same recipient resolution that governs email admits them for that kind AND their row has push on; the sender / actor exclusions of the kind apply to push as to the other channels. | registered | code › `notification.recipients.service.ts:169-176, 205-210, 263` · adapters' `pushRecipients.filter(...)` · test › `conversation-messages-negative` › `B (push disabled) gets no push while C (default) still does`; `callout-reaction-notifications` › `swap does NOT publish a push` | proven |
| PSH-03 | Delivery is one queue message per ACTIVE browser subscription of each admitted recipient plus one per native device token, published to `alkemio-push-notifications`; a recipient with push on but no subscription or token is skipped silently; one failed publish never stops the others. | server | code › `notification.push.adapter.ts:98-204` · `push.subscription.service.ts:131-139` · `device.push.token.service.ts:84-89` · test › `callout-reaction-notifications` › `genuine new reaction publishes exactly one push per active subscription of the publisher`; `form-response` › `the subspace admin gets one push publish per active subscription`; `conversation-messages-positive` › `group message produces one push emit per non-sender member…`; `associates` › `… one push emit…` | proven |
| PSH-04 | The push payload carries a server-rendered title and body, a relative url, the kind name, a timestamp and an optional collapse tag; it never carries chat message text; the url is never the bare home path for kinds that have a target. | server | code › `notification.push.adapter.ts:17-23, 121-129` · `push.notification.message.ts:1-24` · `url.generator.service.ts:114-124` · spec › 034 FR-024 | untested (unit-only; several legacy kinds still push `url: '/'` — see F6) |
| PSH-05 | Non-chat pushes are rate-limited per user to 10 per minute in a fixed epoch-minute bucket; excess pushes in that minute are dropped silently; a store error lets the push through; chat digest pushes never touch this bucket, so chat volume cannot starve other kinds. | server | code › `push.throttle.service.ts:42-103` · `notification.push.adapter.ts:43-96` · test › `messaging-shared-push-throttle-independence` › `after a messaging digest push, a non-messaging push for the same user still publishes` | proven (independence); the cap itself untested |
| PSH-06 | A newer push for the same (kind, callout) or the same chat track replaces the previous unattended one on the device instead of stacking (collapse tag); other kinds stack. | registered | code › `notification.space.adapter.ts:1860` · `conversation.digest.track.ts:130-131` · `conversation.digest.copy.ts:66` | untested |
| PSH-07 | With push disabled at the platform (`notifications.push.enabled` off) nothing is published and the VAPID public key reads as null. | server | code › `notification.push.adapter.ts:38-50, 87-89` · `push.subscription.resolver.queries.ts:28-38` | untested |
| PSH-08 | Any caller can read the platform's VAPID public key; it is the same key for everyone, base64url, at least 80 characters, and the private key is never exposed. | registered (no gate in the resolver) | code › `push.subscription.resolver.queries.ts:22-38` · test › `push-subscriptions-lifecycle` › `VAPID Public Key` (3); `push-subscriptions-security` › `VAPID Key Security` (2) | proven |
| PSH-09 | Subscribing requires an authenticated user and stores an ACTIVE subscription (endpoint, keys, optional user agent); subscribing again with the same endpoint updates that record in place (same id, new keys / agent, re-activated unless DISABLED) — even when the endpoint was previously held by another user, who loses it. | registered | code › `push.subscription.resolver.mutations.ts:20-35` · `push.subscription.service.ts:34-86` · test › `push-subscriptions-lifecycle` › `should create a new push subscription`, `should update existing subscription when same endpoint is used`, `Subscription fields` (2) | proven (upsert); the cross-user re-bind in question (see F2) |
| PSH-10 | A user holds at most 10 ACTIVE subscriptions; a new one beyond the cap removes the oldest to make room (also when an endpoint is re-bound from another user). | registered | code › `push.subscription.service.ts:196-217` · spec › server `specs/038-pwa-push-notifications/spec.md` FR-008 | untested (two cases `test.skip`) |
| PSH-11 | Unsubscribing marks the subscription DISABLED (retained, no deliveries); only its owner may do so; a foreign or unknown id fails with the identical "Push subscription not found" error; re-enabling restores only a DISABLED subscription. | registered | code › `push.subscription.service.ts:88-129` · test › `push-subscriptions-lifecycle` › `Unsubscribe` (3); `push-subscriptions-security` › `should return identical error for unauthorized vs nonexistent subscription ID`, `should reject non-UUID subscriptionID…`, `should reject SQL injection…` | proven (enable untested) |
| PSH-12 | A user lists only their own subscriptions — ACTIVE and DISABLED, never EXPIRED — with id, status, created date, user agent and last successful delivery, and never the endpoint or keys. | registered | code › `push.subscription.service.ts:141-151` · `push.subscription.interface.ts:15-47` · `push.subscription.resolver.queries.ts:40-58` · test › `push-subscriptions-lifecycle` › `List (myPushSubscriptions)` (3 live); `push-subscriptions-security` › `should not expose subscription details…` | proven; "DISABLED is listed" in question (see F3) |
| PSH-13 | A delivery that the push service answers 410 or 404 marks the subscription EXPIRED (no retry); any other failure (429, 401 misconfiguration, network) is logged and dropped without retry and without expiring; a success stamps the last-active date. | server | code › `push.delivery.service.ts:46-158` · spec › `origin/main:specs/086-app-push-mvp/spec.md` FR-009 | untested (unit-only) |
| PSH-14 | Every day at midnight, ACTIVE subscriptions with no successful delivery for 30 days and all EXPIRED subscriptions are deleted. | server | code › `push.subscription.service.ts:169-194` | untested (the 30-day value) |
| PSH-15 | Deleting a user deletes all their subscriptions and device tokens. | server | code › `push.subscription.entity.ts:31-33` · `device.push.token.entity.ts:30-35` | untested |
| PSH-16 | The subscribe input accepts any strings: an empty key, an oversized key, a non-HTTPS, private-network or non-URL endpoint are all stored. | registered | code › `push.subscription.dto.subscribe.input.ts:11-44` · `src/core/validation/handlers/base/base.handler.ts` (allowlist, see 086 FR-004 note) · test › `push-subscriptions-security` › 4 `Input Validation` + 5 `SSRF` cases all `skip`; `push-subscriptions-lifecycle` › `should fail with invalid subscription data` `skip` | untested (see F1) |
| PSH-17 | An authenticated app user binds a native device token (platform `ios` or `android`) to themselves in one statement; a token already bound to another user is re-bound to the caller; a user holds at most 10 tokens (newest by last update kept); unbinding is self-scoped and a no-op for unknown or foreign tokens. | registered | code › `device.push.token.resolver.mutations.ts:14-58` · `device.push.token.service.ts:39-77` · `device.push.token.entity.ts:21-38` · spec › 086 FR-002/FR-003 | untested (unit-only, by design: 086 §6(c)) |
| PSH-18 | Native messages travel on the same queue and payload as web push; the consumer branches on `platform`; APNs 410 or 400 `BadDeviceToken` deletes the token (whoever holds it), every other outcome — including every FCM outcome — is logged and dropped; absent credentials disable that platform's transport silently; a native failure can never expire a web subscription. | server | code › `push.delivery.service.ts:54-79` · `native.push.sender.service.ts` · `device.push.token.service.ts:98-100` · `alkemio.yml:515-544` | untested (unit-only) |
| PSH-19 | Push delivery is observable only at the queue: the harness proves "the server published N messages", never that a device received anything; acceptance environments sign with the committed default VAPID pair. | — | test › `notification.helpers.ts:178-259` · client-web › `messaging-notifications-test-plan.md` § Push is asserted at the emit boundary only · `alkemio.yml:511-514` | untested (ops fact, recorded for the reviewer) |

### B. Rights: evidence

_The legend of the former who-may table (its shorthands are still used in Appendix A), then the evidence for section 2._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: `push.subscription.resolver.queries.ts:22-58`; `push.subscription.resolver.mutations.ts:15-79`; `device.push.token.resolver.mutations.ts:14-58`; `push.subscription.service.ts:88-151` (every read / write is keyed on the caller's id); `user.resolver.mutations.ts:101-116`; test › `push-subscriptions-lifecycle` › `should not allow unsubscribing another users subscription`, `should not show other users subscriptions`. There is no admin surface over subscriptions; crosscheck has no row for this area.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence and its ask. The text keeps the old spelling of the ids ("F-3" is F3). F2 appears twice in section 3 (a and b) because it holds two questions for two owners._

#### Findings

- **F1 — Subscribe input is not validated (PSH-16).** Code: `SubscribeToPushNotificationsInput` carries `@IsUrl`, `@IsNotEmpty`, `@MaxLength`, but the input is not in the validation handler allowlist, so empty or oversized keys and any endpoint string (http, localhost, cloud metadata, `file:`) are stored and later POSTed to by `web-push` from the server pod (SSRF surface). Test: nine cases that would prove validation are `skip`; 086 recorded the missing entry as baseline finding BF-6 and deliberately did not add it (SIMP-402). Spec: 038 says nothing about endpoint validation. Ruling: add the allowlist entry + an endpoint host policy, or accept and record.
- **F2 — An endpoint can be re-bound to another user (PSH-09).** Code: `subscribe` finds by endpoint and overwrites `userId` with the caller (`push.subscription.service.ts:39-65`), so anyone who learns a device's endpoint can take it over; there is no unique index on endpoint either (dropped as drift). Test: `should not allow user A to hijack user B endpoint…` accepts both outcomes (branches on `resB.body.errors`), so it pins nothing. Spec: none. Ruling: keep (device changed hands) with ownership proof, or refuse.
- **F3 — DISABLED subscriptions are listed (PSH-12).** Code: `getUserSubscriptions` returns ACTIVE + DISABLED; the schema description says so. Test: `should not list unsubscribed subscriptions` is `skip` and expects exclusion; the live case `should return no ACTIVE subscriptions…` filters DISABLED out before asserting. Ruling: which is the contract — then un-skip or rewrite the case.
- **F4 — Retry configuration is dead (PSH-13).** Code: `retryCount` is published as 0 and never incremented; the `max_attempts` check can never trigger; every failure is dropped on first attempt, matching 038 NFR-003 ("no automatic retry") but contradicting the `PUSH_RETRY_MAX_ATTEMPTS` knob. Ruling: delete the knob or implement retry.
- **F5 — Awareness platform-admin kinds drop the actor from push only.** See notifications F-3 (`notification.platform.adapter.ts:414-416, 478-480`): push is the one channel on which the acting admin is not told about the sign-up / space they caused. Ruling there.
- **F6 — Eight legacy kinds push `url: '/'`.** Code: user message, org message / mention / sender copy, role changed, user registered / removed, welcome (see Constants). 034 FR-010 and the url generator's own comment call the bare home link an anti-pattern; 086 D-13 proved the invitation kind carries a real url. Ruling: rebaseline each to a target, or accept for kinds with no natural target.
- **F7 — "All 28 events" is stale.** Test: the settings suite enumerates 28 rows; the server has 41 (13 added by 034, 041, 061, 062, 080, 097). Not a product disagreement — a coverage hole on the push leaf of the 13 newer rows.

#### Open questions

- **OQ1 — Is push validation wired anywhere else?** The allowlist in `src/core/validation/handlers/base/base.handler.ts` was not read line by line; 086's text says the live web-push input is absent from it (BF-6). Confirm before filing F-1.
- **OQ2 — Is the endpoint unique in production data?** The index was dropped as migration drift (086 D-14); whether duplicate endpoint rows exist on ACC/PROD is a W4 probe, not a code fact.
- **OQ3 — Where are real VAPID keys?** Acceptance signs with the committed defaults (034 R-10 / DIS-6); whether production overrides them is an infra-ops fact.
- **OQ4 — Does the daily cleanup run on every replica?** The cron is idempotent (034 A-8 says so) but a multi-replica double run was not verified.
- **OQ5 — Spec 088-app-push-tap-routing** is listed on `origin/main` without a readable `spec.md`; what a tap on a push opens in the app could not be read.

### D. Test gaps

_For the Quality Lead (question GAPS in section 3)._

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

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, plan constants and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for security limits. The "product must rule?" column is unchanged: tick the rows product must rule on (question CONST in section 3)._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Queue | `alkemio-push-notifications`, durable, created if missing; direct exchange `''` | `notification.push.adapter.ts:188-192`; `push.delivery.service.ts:46-50` | | Technical Lead |
| Push enabled | `notifications.push.enabled` (`PUSH_NOTIFICATIONS_ENABLED`) default true | `alkemio.yml:510` | | Technical Lead |
| VAPID | public / private keys and subject `mailto:notifications@alkem.io` with committed defaults (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) | `alkemio.yml:511-514` | | Security Lead |
| Max subscriptions per user | 10 (`PUSH_MAX_SUBSCRIPTIONS_PER_USER`), also the device-token cap | `alkemio.yml:545`; `device.push.token.service.ts:18-20` | | Product Lead |
| Throttle | 10 per minute per user (`PUSH_THROTTLE_MAX_PER_MINUTE`), key `push:throttle:<userId>:<epochMinute>`, TTL 60 s, fail open | `alkemio.yml:546-547`; `push.throttle.service.ts:57-103` | | Product Lead |
| Retry | `max_attempts` 5 (`PUSH_RETRY_MAX_ATTEMPTS`) — `retryCount` is always 0 and never incremented | `alkemio.yml:548-549`; `notification.push.adapter.ts:142`; `push.delivery.service.ts:83-93` | F-4 | Technical Lead |
| Stale cleanup | 30 days (`PUSH_CLEANUP_STALE_DAYS`), cron `EVERY_DAY_AT_MIDNIGHT` | `alkemio.yml:550-551`; `push.subscription.service.ts:187-194` | | Product Lead |
| Subscription status | `ACTIVE`, `DISABLED`, `EXPIRED` | `push.subscription.interface.ts:4-8` | | Technical Lead |
| Expiring status codes | 410, 404 → EXPIRED; everything else dropped, not expired | `push.delivery.service.ts:120-156` | | Technical Lead |
| Native platforms | `ios`, `android`; APNs environment `sandbox` (default) / `production`, closed enum | `alkemio.yml:526-544`; 086 FR-002 | | Technical Lead |
| Native permanent failures | APNs 410, APNs 400 `BadDeviceToken` → token deleted; no FCM outcome deletes | `device.push.token.service.ts:91-100`; 086 FR-008 | | Technical Lead |
| Payload shape | `{subscriptionId, userId, endpoint, keys{p256dh, auth}, payload{title, body, url, eventType, timestamp, tag?}, retryCount}`; native `{userId, platform, token, payload}` | `push.notification.message.ts` | | Technical Lead |
| Collapse tags | reaction `SPACE_COLLABORATION_CALLOUT_REACTION:<calloutId>`; chat `messaging-digest-direct` / `-group`; none elsewhere | `notification.space.adapter.ts:1860`; `conversation.digest.track.ts:130-131` | | Technical Lead |
| Legacy bare-home urls | user message, org message / mention / sender copy, platform role changed, user registered, user removed, sign-up welcome push `url: '/'` | `notification.user.adapter.ts:130, 567`; `notification.organization.adapter.ts:123, 191, 247`; `notification.platform.adapter.ts:152, 488, 545` | F-6 | Product Lead |
| Column limits | endpoint `LONG_TEXT_LENGTH`, keys and user agent `MID_TEXT_LENGTH`; endpoint has no unique index (dropped as drift — 086 D-14 note) | `push.subscription.entity.ts:13-26`; `src/migrations/1777000000000-CreateCollaboraDocument.ts:9` | F-2 | Technical Lead |
| Error texts | `Authentication required to subscribe to push notifications` / `… unsubscribe …` / `… enable …` / `… view push subscriptions` / `… register a device push token` / `… unregister …`; `Push subscription not found`; `Push subscription not found or not eligible for re-enabling` | resolvers and service cited | | Product Lead |
| Delivery log markers | `Push notifications queued`, `Push notification delivered`, `Push subscription expired (410 Gone)`, `Push notification delivery failed, dropping message`, `Push notification throttled for user`, `Stale push subscription cleanup completed` | `notification.push.adapter.ts:166-175`; `push.delivery.service.ts`; `push.throttle.service.ts:81-84` | | Technical Lead |
| GraphQL surface | `vapidPublicKey`, `myPushSubscriptions`, `subscribeToPushNotifications`, `unsubscribeFromPushNotifications`, `enablePushSubscription`, `registerDevicePushToken`, `unregisterDevicePushToken`, `PushSubscription{id, createdDate, status, userAgent, lastActiveDate}`, `PushSubscriptionStatus`, `UserSettingsNotificationChannels.push` | `schema.graphql:5126, 5208, 5308, 5324-5328, 6274-6288` | | Technical Lead |
| Settings rows with push on by default | all rows except: five platform-admin rows, `forumDiscussionCreated`, `space.admin.userEmailChanged`, the four poll rows (see notifications § Constants) | `user.service.ts:337-498` | | Product Lead |
| Test-harness push observation | RabbitMQ management API `message_stats.publish` on the queue; synthetic subscriptions `https://fcm.googleapis.com/fcm/send/<unique>` | `notification.helpers.ts:178-259`; `push-notifications.request.params.ts:167-176` | | Technical Lead |
| Client contract (not server) | service worker `notificationclick` resolves relative `url` against the origin; app mode never creates a web subscription (086 D-9) | 034 contract C-4; 086 FR-019 | | Technical Lead |

### F. Where this lands in the new core

Push is a transport, not a kind: in the rebuild it sits beside email as a delivery adapter fed by the same resolved recipient set (notifications NTF-10), with one `push_subscription` table that already has the right shape (browser rows and native-token rows differ only in their address) and a per-user cap and throttle as transport policy. Three facts found here should shape the model: (1) the throttle is a per-transport bucket that chat deliberately bypasses — the new core should make "participates in the shared budget" a property of the kind, not a second method on the adapter; (2) expiry and cleanup are transport verdicts (410/404, 30-day idle) and must stay out of the kind registry; (3) the endpoint is the natural key of a browser subscription and today has no uniqueness and no validation (F-1/F-2) — the new core should give it both. Payload copy, tags and the committed VAPID keys are rebaseline rows.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/push-notifications/`, 3 files, 65 cases — 14 skip); the specs, issues and docs listed in § Sources. WHAT and WHY only — no mutations, fixtures or request params. Covers the web-push channel: subscriptions, the `alkemio-push-notifications` queue, the shared throttle, delivery, the native device-token bridge (086) and the push leaf on every settings row. Which kinds exist and who their recipients are is in `notifications.md`. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout: the single why was split in three, each rule got a plain-words sentence (the exact text moved to Appendix A), the who-may table became section 2, and every finding, open question and rule without a stated reason was routed to an organisation role in section 3.

#### Sources

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
