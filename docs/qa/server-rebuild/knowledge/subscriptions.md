# Live updates (GraphQL subscriptions): behaviour rules

_What the platform does today for live updates pushed to the browser (GraphQL subscriptions): how the connection is signed in, how updates reach every copy of the server, and for each of the 11 kinds of update who may follow it and what reaches whom. This area is recorded, then retired: the rebuild drops GraphQL subscriptions (catalogue OP-3), so the rules are written down to make the retirement explicit. Chat events, room message rules and notification content are in their own files and are only referred to. The file follows the three-section layout: **1. Rules**, **2. Rights**, **3. Open questions**, with the evidence in an **Appendix**._

_Open questions per owner: Product Lead 2 · Technical Lead 9 · Quality Lead 4 · Security Lead 2 · Architecture Lead 1. By state: 15 open · 3 with a suggested answer. Proof of the 22 rules: 4 proven by a test · 18 untested (Appendix A)._

_Whys of the 22 rules: 13 rest on a source · 4 carry a draft for product to decide (SUB-05, SUB-12, SUB-16, SUB-20) · 5 have none, and each already carries an open question (SUB-04, SUB-15, SUB-19, SUB-21, SUB-22; SUB-15 and SUB-21 keep a note on the code)._

**How to read it**

- **Rule** is one or two plain sentences. The exact behaviour, with error messages and limits, is in Appendix A under the same id. The new core is checked against the exact text.
- **Why: business** is what Alkemio needs. **Why: product** is the user story. **Why: technical** is the engineering reason. A rule needs at least one why, and gets a second or third only where it adds something for the decision or the code. "—" means none is given.
- A why that names a spec, issue, pull request, code comment or code line rests on that source. A why ending in _(draft)_ was written by QA and no source states it: product keeps, rewrites or deletes it, and sets **Decided by**. A rule with no why at all carries an open question in section 3.
- **Decided by** names the source of the decision: a spec, a commit or pull request, or an issue. "Not decided: exists in the code" means the behaviour exists in the code and nobody chose it. "Not decided: a defect" means today's behaviour is a fault. Product has not reviewed this file yet.
- A marker in bold at the end of a rule points at section 3: **(open: F3)** means a question on this rule is still open, **(defect: F…)** means today's behaviour is a fault and must not be copied as intended, **(defect in part: F…)** means part of it is. A rule with no marker stands as written. Every rule is logged as the server behaves today, also when that is not the intended end state. Whether a test proves the rule sits in Appendix A as **proven** or **untested**.
- Hard rules are not marked yet. Some rules are choices that a new feature may challenge, and some can never change; a later version will mark the second kind with "(hard rule)" after the why that makes it so. Until then, no marker does not mean a rule is open to change.
- "Follow" means subscribe: the client opens a connection and the server pushes updates over it.

## 1. Rules

### Connection and sign-in

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| SUB-01 | A live-update connection is signed in once, when it opens, with the session cookie or a token sent at that moment. Credentials sent later on the same connection are ignored. **(open: OQ1)** | — | — | A client could otherwise present a token after the upgrade had completed unauthenticated — a side channel past the Passport check ("FR-023 (WS addendum)", `9b6a81eeb` #6143). | Server PR #6143 (FR-023, WS addendum) |
| SUB-02 | A connection that opens without valid credentials is not refused: it runs as a visitor. What a visitor may then follow is decided per kind of update (SUB-05). | — | — | Fail open to anonymous, like an HTTP request without a cookie (109 edge case). | Spec 109 (edge case) |
| SUB-03 | A connection that stays open is closed with "Session expired" once the session's maximum lifetime has passed, at the next update it would have delivered. Token refresh and idle time-outs do not close it. | Sockets authenticate once at connect, so subscriptions outlived their session; the guard closes them at the absolute session ceiling (server PR #6289). | — | The sliding windows self-renew, the absolute ceiling does not (`458adb4cd` #6289). | Server PR #6289 |
| SUB-04 | Two connection protocols are served side by side: the current one and an older one. **(open: F7, Q-SUB-04)** | — | — | — | Not decided: exists in the code |
| SUB-05 | The right to follow something is checked once, when the client starts following. Following a Space, callout, room, poll or virtual contributor needs the right to read it; chat, notifications and the forum need a signed-in user. A refusal comes back as an error and no update follows. | — | — | The subscribe-time check is the only gate — events are filtered by id/type, never re-authorized (except activity children, SUB-10). _(draft)_ | Not decided: exists in the code |
| SUB-06 | A new follower gets only what happens after they started following, never a catch-up of earlier updates. | Consistent across the platform (038 US7 AC10). | — | — | Spec 038 US7 AC10 |
| SUB-07 | An update published on any copy of the server reaches the followers connected to every copy. | — | — | Multi-replica deployments must not split subscribers by pod ("different queues … for different replicas", `subscription.factory.provider.ts:143-144`). | Not decided: exists in the code |
| SUB-08 | When the broker connection behind one kind of update drops, the server keeps running, but that kind of update stays silent until the server restarts. | — | — | A midnight broker blip used to take the whole server down; containment was chosen over reconnect as a documented tradeoff (007 FR-001, `e9319947f`). | Spec 007 FR-001; commit e9319947f |
| SUB-09 | Server processes that serve no live updates open no broker connection. | — | — | One RabbitMQ connection + consumer per topic is wasted on a worker (`subscription.factory.ts:51-56`). | Not decided: exists in the code |

### What reaches whom

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| SUB-10 | A reader following a Space's activity gets every new activity entry there and, on request, from the Subspaces they may read, limited to the kinds asked for. An entry that is hidden later is not announced. **(open: F2, F6, OQ3)** | Live timeline on the space dashboard (`48093883e`, #2741 child activities). | — | — | Commit 48093883e; server #2741 |
| SUB-11 | A reader following a Space gets every Subspace created directly under it, whoever created it. **(open: F1, OQ2)** | Clients refresh subspace lists live (journey table JRN-12). | — | — | Not decided: exists in the code |
| SUB-12 | A reader following a callout gets every post added to it, also on a draft callout. Links, whiteboards, memos and documents are not announced. Following a callout that does not accept posts is refused. **(open: F3)** | Live post collection on the callout page. _(draft)_ | — | The Form callout must never travel a contribution subscription (callout table CAL-49). | The Form clause: `callout.md` CAL-49. The rest is not decided: exists in the code |
| SUB-13 | A reader following a room gets every new, edited and deleted message, every reaction added or removed, and read receipts, in order. Everyone who may read the room gets every update, whoever sent it. | — | — | Matrix is the source of truth for messages (communications table COM-11). | `communications.md` COM-11 |
| SUB-14 | A signed-in user gets the updates of the chats they are a member of at that moment, and nothing for chats they left. | Live chat over subscriptions (040 FR-006/007/019). | — | — | Spec 040 FR-006/007/019 |
| SUB-15 | A signed-in reader following the forum is told when a discussion is created. Edits, deletions and comments are not announced. **(open: F4)** | — | — | — (the publish exists only on create) | Not decided: exists in the code |
| SUB-16 | A reader following a virtual contributor is told when its engine status changes. | The client shows the VC's engine status live. _(draft)_ | — | — | Not decided: exists in the code |
| SUB-17 | A signed-in user gets their own new notifications as they arrive, and their unread count after every change. Nobody gets another user's. | The tab badge always counts unread in-app notifications: "a user who wants quiet still wants to see what is waiting for them" (agents-hq spec 020, clarification). | — | — | Not decided: exists in the code; the client consumer: agents-hq spec 020 |
| SUB-18 | A reader following a poll gets the poll again on every vote, status change and option change. While results are hidden, a reader who has not voted gets no vote updates. | Live polls close the feedback loop; hidden results must not leak through the push (038 US7 AC1–AC10, FR-030). | — | — | Spec 038 US7, FR-030 |

### Housekeeping

| ID | Rule | Why: business | Why: product | Why: technical | Decided by |
|---|---|---|---|---|---|
| SUB-19 | Update ids are random numbers from 0 to 1000 and can repeat. They are used for logging only. **(open: F9, Q-SUB-19)** | — | — | — | Not decided: exists in the code |
| SUB-20 | One kind of update and two queues exist by name, but nothing uses them. **(open: F5)** | — | — | Leftovers (SSI and the removed Excalidraw backend). _(draft)_ | Not decided: exists in the code |
| SUB-21 | When a comment is deleted, followers of the activity feed are not told: the feed keeps showing the comment until it is reloaded. **(open: F6)** | — | — | — ("todo: trigger a subscription to update other clients?") | Not decided: exists in the code |
| SUB-22 | A visitor who is not signed in may follow rooms, new Subspaces, new posts and activity on anything public. **(open: F8, OQ3)** | — | — | — | Not decided: exists in the code |

## 2. Rights

_Y = may · N = refused · – = does not apply. "Follow" means subscribe to the live updates. Conditions are footnotes under the table. Row ids W1–W11 are new. The legacy tests follow only as a platform admin, a Space admin and a Space member. Evidence is in Appendix B._

| ID | Action | Platform roles | Platform License Manager | Account admin or owner | Space admin | Space member | Registered user | Visitor |
|---|---|---|---|---|---|---|---|---|
| W1 | Follow activity, new Subspaces, new posts or a room on a public Space | Y | Y | Y | Y | Y | Y | Y |
| W2 | The same on a private Space | Y¹ | N² | N² | Y | Y | N | N |
| W3 | Follow the activity of Subspaces through their parent | Y³ | Y³ | Y³ | Y | Y | Y⁴ | Y⁴ |
| W4 | Follow forum discussions | Y | Y | Y | Y | Y | Y | N⁵ |
| W5 | Follow one's own chat updates | Y | Y | Y | Y | Y | Y | N |
| W6 | Follow one's own notifications and unread count | Y | Y | Y | Y | Y | Y | N |
| W7 | Follow a poll (votes, options) | Y⁶ | Y⁶ | Y⁶ | Y | Y | Y⁷ | Y⁷ |
| W8 | Get vote updates while results are hidden, without having voted | N | N | N | N | N | N | N |
| W9 | Follow a virtual contributor's updates | Y⁸ | Y⁸ | Y⁸ | Y⁸ | Y⁸ | Y⁸ | Y⁸ |
| W10 | Get another user's chat or notification updates | N | N | N | N | N | N | N |
| W11 | Publish an update by hand | –⁹ | – | – | – | – | – | – |

¹ Platform Content Full Access and the platform spaces reader; other platform roles only with a role in the Space. ² Unless they hold a role in the Space. ³ Only for the Subspaces they may read; a Subspace they may not read is left out, checked for each update. ⁴ Public Subspaces only. ⁵ Refused with error 11109. ⁶ If they may read the poll. ⁷ On a public Space only. ⁸ If they may read the virtual contributor. ⁹ Nobody can: updates come from the actions themselves and from the chat server.

## 3. Open questions

_One section per role, so each owner reads only their own part. **To answer** lists the questions the role owns. **Also involved** repeats questions another role owns where this role has a part; the Owner cell says which part. A question shared by two roles therefore appears under both. **State**: open · suggested (an answer is proposed and the owner confirms it). The full text of each finding and open question, with code lines and data, is in Appendix C under the same id._

### Product Lead

[Product Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Strategy/Sub-circles/Product/Roles/Product%20Lead.md) · Strategy › Product (Simone); Denise decides on her behalf · 2 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F3 | Reach | decision | Posts on a draft callout are sent to its followers. Today only people who may read the draft get them: admins and the creator. Should a draft's posts be sent at all? | Product Lead | — | open |
| F6 | Housekeeping | decision | A deleted comment stays in a live activity feed until reload. Accept until retirement? | Product Lead (Quality Lead: the polling check must see hidden entries disappear on the next poll) | Accept until retirement; note it for the polling check. | suggested |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F8 | Housekeeping | risk | Visitors who are not signed in can open live streams on public content. Is that by design (public is public)? The polling check in the new core must know. | Security Lead, with Product Lead | — | open |

### Technical Lead

[Technical Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Technical%20Lead.md) · Delivery (Anton) · 9 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F4 | Reach | tidy-up | The "discussion updated" update fires only when a discussion is created. Rename or document it, or accept it until retirement? | Technical Lead | — | open |
| F5 | Housekeeping | tidy-up | One kind of update and two queues are named but never used. What happens to them at the rebuild? | Technical Lead | Put them on the expected-loss list. | suggested |
| F7 | Connection | check | Is any client still on the older connection protocol? If not, it is retired with the area. | Technical Lead | — | open |
| F9 | Housekeeping | tidy-up | Update ids are not unique. A client that drops duplicates by id would lose updates. | Technical Lead | Harmless today: the ids are for logging and no client reads them. Note it for retirement. | suggested |
| OQ1 | Connection | check | Where is the spec text "FR-023 (WS addendum)" of server PR #6143? It is needed to confirm the why of SUB-01. | Technical Lead | — | open |
| OQ4 | All | check | Which live updates does the current web client still use? The retirement note needs the list. | Technical Lead | — | open |
| CONST | All | decision | 13 constants are still blank in "product must rule?" (Appendix E): wire shapes, error texts and event kinds for the Technical Lead; the session close for the Security Lead. | Technical Lead, Security Lead | — | open |
| Q-SUB-04 | Connection | decision | Why does this rule exist? No source says why the older protocol is still served (see F7). | Technical Lead | — | open |
| Q-SUB-19 | Housekeeping | decision | Why does this rule exist? No source says why update ids are random and not unique (see F9). | Technical Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Reach | risk | A visitor can follow a public Space's activity live, with people's names, but cannot query the same activity. Align the two, or accept it until live updates are retired? | Security Lead (Technical Lead aligns if not accepted) | — | open |

### Quality Lead

[Quality Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Quality%20Lead.md) · Delivery (Evgeni), with the QA Engineer as the doer · 4 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F1 | Reach | test | The two "Subspace created" test files cannot run against today's schema, so SUB-11 counts as unproven. Fix them, or retire them with the area? | Quality Lead | — | open |
| OQ2 | Reach | test | Are the five legacy cases green on Release/79? The suite is not on the nightly. Run it once on the test environment, or retire the files without running. | Quality Lead | — | open |
| OQ3 | Reach | check | F2 and F8 were only read in the code. Check live: a visitor following a public Space's activity and a public room. | Quality Lead | — | open |
| GAPS | All | test | 18 rules have no test and 8 behaviours were never pinned down (Appendix D). The area is to be retired: which, if any, still get a case? | Quality Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F6 | Housekeeping | decision | A deleted comment stays in a live activity feed until reload. Accept until retirement? | Product Lead (Quality Lead: the polling check must see hidden entries disappear on the next poll) | Accept until retirement; note it for the polling check. | suggested |

### Security Lead

[Security Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Security%20Lead.md) · Delivery (Valentin) · 2 to answer, 1 also involved

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| F2 | Reach | risk | A visitor can follow a public Space's activity live, with people's names, but cannot query the same activity. Align the two, or accept it until live updates are retired? | Security Lead (Technical Lead aligns if not accepted) | — | open |
| F8 | Housekeeping | risk | Visitors who are not signed in can open live streams on public content. Is that by design (public is public)? The polling check in the new core must know. | Security Lead, with Product Lead | — | open |

**Also involved**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| CONST | All | decision | 13 constants are still blank in "product must rule?" (Appendix E): wire shapes, error texts and event kinds for the Technical Lead; the session close for the Security Lead. | Technical Lead, Security Lead | — | open |

### Architecture Lead

[Architecture Lead](https://github.com/alkem-io/organisation/blob/develop/vault/Model/Alkemio/Sub-circles/Delivery/Roles/Architecture%20Lead.md) · Delivery (Anton) · 1 to answer

**To answer**

| ID | Area | Type | Question | Owner | Proposed answer | State |
|---|---|---|---|---|---|---|
| OQ5 | All | contract | For each feature that moves from live updates to polling, how stale may the screen be? Needed before the W2 walks assert that something "appears". | Architecture Lead | — | open |

## Appendix

_The record behind sections 1 to 3. Decisions live in sections 1 and 3; nothing here overrides them._

### A. Exact behaviour and evidence per rule

_**Proof**: **proven** = a green legacy case asserts it · **untested** = code or spec only. Evidence paths are relative to the server repo unless prefixed `test ›`, `spec ›` or `matrix ›`._

| ID | Exact behaviour | Actors | Evidence | Proof |
|---|---|---|---|---|
| SUB-01 | A subscription socket is authenticated once, at the HTTP upgrade — by the session cookie (replayed through the session middleware) or a Bearer header on the upgrade request; credentials offered later in the connection handshake payload are ignored. | all | code › `src/app.module.ts:208-224` · `src/core/auth/oidc/graphql-ws-auth.ts:1-41` · harness › `test › lib/src/utils/subscriptions/subscription-client.ts:34-57` (Bearer on the upgrade header) | untested (the harness proves the header path works, not that the handshake payload is refused) |
| SUB-02 | A socket that carries no valid credential at upgrade runs as an anonymous visitor rather than being refused; what it may then subscribe to is decided per subscription (SUB-05). | anonymous | code › `src/core/authorization/graphql.guard.ts:40-43` · spec › `server/specs/109-redis-session-store-resilience/spec.md:206-209` | untested |
| SUB-03 | A long-lived socket is closed with "Session expired" (close code 4401) the next time an event is about to be delivered after the signed-in session's absolute lifetime has passed; token refresh and idle time-outs are deliberately not enforced on the socket. | registered | code › `app.module.ts:243-266` | untested |
| SUB-04 | Both the current `graphql-ws` protocol and the legacy `subscriptions-transport-ws` protocol are served on the same endpoint, both authenticated from the upgrade request. | all | code › `app.module.ts:227-242` | untested (see F7) |
| SUB-05 | Subscribing is authorized once, when the subscription starts: every subscription on a resource (collaboration, space, callout, room, forum, poll, virtual contributor) requires read on that resource and refuses with an authorization error otherwise; the conversation and in-app subscriptions require a signed-in actor ("User could not be resolved"); the forum subscription requires a signed-in actor ("Subscription requires authentication", code 11109); a "post created" subscription on a callout that does not accept posts is refused as bad input. A refusal is delivered to the client as a subscription error and no event ever follows. | all | code › `src/services/api/activity-log/activity.log.resolver.subscriptions.ts:457-468` · `src/domain/space/space/space.resolver.subscriptions.ts:74-81` · `src/domain/collaboration/callout/callout.resolver.subscriptions.ts:88-103` · `src/domain/communication/room/room.event.resolver.subscription.ts:76-82` · `src/platform/forum/forum.resolver.subscriptions.ts:80-98` · `src/domain/collaboration/poll/poll.resolver.subscriptions.ts:136-143, 223-230` · `src/domain/community/virtual-contributor/virtual.contributor.resolver.subscriptions.ts:54-64` · `src/domain/communication/conversation/conversation.resolver.subscription.ts:147-153` · `src/platform/in-app-notification/in.app.notification.resolver.subscription.ts:283-289, 321-327` · `docs/error-codes.md:78` · test › `callout/form/form-never-appears` › `calloutPostCreated fires for the POST contribution and is refused for the Form callout`; communications › COM-61 | proven for the bad-input refusal and the conversation gate; every read-based refusal is untested |
| SUB-06 | A new subscriber receives only events published after the subscription was established — never a catch-up of earlier ones. | all | code › `src/services/subscriptions/subscription-service/subscription.read.service.ts:36-82` (async iterators) · spec › `server/specs/038-community-polls/spec.md:158` | untested |
| SUB-07 | An event published on any server replica reaches the subscribers connected to every replica: each replica binds its own exclusive queue per topic on a shared direct exchange, and the queue disappears when the replica stops. | server | code › `src/core/microservices/subscription.factory.ts:74-112` · `subscription.factory.provider.ts:146-171` · `subscription.service.module.ts:18-52` · `src/core/microservices/microservices.module.ts:34-52` | untested |
| SUB-08 | If the broker connection behind a topic drops, the server keeps running and logs the loss; that topic stays silent until the next server start (no reconnect, no catch-up). | server | code › `subscription.factory.ts:9-42, 121-127` · spec › `agents-hq/specs/007-connection-resilience/spec.md:52-58, 122-125` | untested |
| SUB-09 | Processes that serve no subscriptions — schema bootstrap, the auth-reset worker, anything started with the subscriptions-disabled flag — use an in-memory bus and open no broker connection. | server | code › `subscription.factory.ts:44-63` | untested |
| SUB-10 | A reader subscribed to a collaboration's activity receives every new entry written there (and, when asked, on the descendants they may read — re-checked for each event), narrowed to the types requested; the event carries the rendered entry with a "happened in a child" flag; entries later hidden by a comment removal are not announced. | space member, registered, anonymous on public | code › `activity.log.resolver.subscriptions.ts:366-502` · `src/services/adapters/activity-adapter/activity.adapter.ts:97, 121, 164, 190, 219, 244, 271, 297, 327, 356, 382, 448` · `subscription.publish.service.ts:57-71` | untested (see F2, F6) |
| SUB-11 | A reader subscribed to a space receives every subspace created directly under it, with the parent id and the new subspace, whoever created it. | space member, registered, anonymous on public | code › `space.resolver.subscriptions.ts:31-86` · `space.resolver.mutations.ts:303-311` · test › `subscriptions/create-subspace` › `receive newly created subspaces` (3 subscribers × 2 creators); `create-subsubspace` › `receive newly created opportunities` | untested (see F1: the two legacy cases cannot run against today's schema) |
| SUB-12 | A reader subscribed to a callout receives every post contributed to it — including on a draft callout — with the contribution id, sort order and the post; links, whiteboards, memos and documents never push; subscribing to a callout that does not accept posts is refused. | space member, registered, anonymous on public | code › `callout.resolver.subscriptions.ts:33-108` · `callout.resolver.mutations.ts:669-689` · test › `callout/form/form-never-appears` › `calloutPostCreated fires for the POST contribution and is refused for the Form callout` | proven; the draft-callout clause is disputed (F-3) |
| SUB-13 | A reader subscribed to a room receives, in order, every message created, edited and deleted and every reaction added and removed in it, and read receipts — as the chat server echoes them, never straight from the mutation — with the message id, text and sender; every subscriber with read on the room gets every event, whoever sent it. | space member, registered, anonymous on public | code › `room.event.resolver.subscription.ts:30-85` · `src/services/event-handlers/internal/message-inbox/message.inbox.service.ts:118-122, 257-262, 303-306, 339-349, 363-370, 620-625` · test › `subscriptions/aspect-comments` › `Space comments subscription › receives message after new comment is created - 3 sender / 3 receivers`, `Subspace comments subscription › …`, `Subsubspace comments subscription › …` | proven for message creation on post rooms at L0/L1/L2; edits, deletions, reactions and receipts untested here (COM-11) |
| SUB-14 | A signed-in user receives the events of the conversations they are a member of at the moment of the event — created, updated, deleted, message received/removed, member added/removed, read receipt — and nothing for conversations they left. | conversation member | code › `conversation.resolver.subscription.ts:46-161` · communications › COM-55…61 · test › `communications/conversations/conversation-subscriptions`, `conversation-message-subscriptions`, `conversation-member-removal` | proven (covered elsewhere: communications) |
| SUB-15 | A signed-in reader subscribed to the forum receives the discussion when a discussion is **created** in it; edits, deletions and comments on discussions do not fire it. | registered | code › `forum.resolver.subscriptions.ts:34-103` · `forum.resolver.mutations.ts:112-127` | untested (see F4) |
| SUB-16 | A reader subscribed to a virtual contributor receives the contributor whenever the AI engine reports a change of its persona/engine state. | VC readers | code › `virtual.contributor.resolver.subscriptions.ts:26-72` · `src/services/ai-server/ai-server/ai.server.service.ts:98-112` | untested |
| SUB-17 | A signed-in user receives their own new in-app notifications as they are stored, and their unread counter after every stored notification, every state change they make, and every bulk update that touched a row; nobody receives another user's. | registered | code › `in.app.notification.resolver.subscription.ts:253-330` · `src/services/adapters/notification-in-app-adapter/notification.in.app.adapter.ts:112-135` · `in.app.notification.resolver.mutations.ts:44-53, 110-120` | untested here (covered elsewhere: notifications) |
| SUB-18 | A reader subscribed to a poll receives the poll — re-read and with results filtered for that reader — on every vote and status change (vote subscription) and on every option add/edit/remove/reorder (options subscription); vote events are withheld from a reader who has not voted while results are hidden; option events always arrive. | space member | code › `poll.resolver.subscriptions.ts:33-233` · `poll.resolver.mutations.ts:313-335` · spec › `server/specs/038-community-polls/spec.md:139-158, 179` | untested |
| SUB-19 | Event identifiers are random numbers between 0 and 1000 and may repeat; they serve logging only. | server | code › `subscription.publish.service.ts:62, 80, 114, 138, 157, 165, 209` | untested (see F9) |
| SUB-20 | The topic "profile verified credential" and the queues "whiteboard content" and "whiteboard saved" exist in the vocabulary but are bound to nothing. | — | code › `src/common/enums/subscription.type.ts:3` · `src/common/enums/messaging.queue.ts:15, 17, 18` | untested (see F5) |
| SUB-21 | When a comment is deleted and its activity entry hidden, no subscriber is told; a live activity feed keeps showing the removed comment until reloaded. | server | code › `activity.adapter.ts:407-424` | untested (see F6) |
| SUB-22 | An anonymous socket may subscribe to room events, subspace creations, post creations and activity on any public resource, because those gates are the resource's read rule, which public spaces grant to visitors. | anonymous | code › gates in SUB-05 · matrix › `access-matrix.md:443-470` (room read CTS for anonymous), `:1600-1640` (collaboration) | untested (see F8) |

### B. Rights: evidence

_The evidence behind section 2, as extracted. The first line is the legend of the role shorthands the extraction used._

_Role shorthands: **PLM** = Platform License Manager · **PCFA** = Platform Content Full Access · **PSA** = Platform Settings Admin · **POA** = Platform Operations Admin · **PRA** = Platform Resource Admin · **support** = Platform Support · **account holder** = the user whose account it is, or an admin of the organisation that owns it. Y = may, N = refused, – = not applicable. The evidence line under the table says where each cell comes from._

Evidence: subscribe gates `activity.log.resolver.subscriptions.ts:457-468`, `space.resolver.subscriptions.ts:74-81`, `callout.resolver.subscriptions.ts:88-103`, `room.event.resolver.subscription.ts:76-82`, `forum.resolver.subscriptions.ts:80-98`, `poll.resolver.subscriptions.ts:86-108, 136-143, 223-230`, `virtual.contributor.resolver.subscriptions.ts:54-64`, `conversation.resolver.subscription.ts:51-77, 147-153`, `in.app.notification.resolver.subscription.ts:258-266, 283-289, 299-307, 321-327`; `graphql.guard.ts:40-43` (anonymous fallback); access matrix `room` (`access-matrix.md:443-470`), `collaboration` (`:1600-1665`), private-variant deltas (read removed for anonymous/guest/registered). The legacy suite subscribes as GLOBAL_ADMIN, SPACE_ADMIN and SPACE_MEMBER only; no anonymous or non-member subscription is attempted anywhere.

### C. Findings and questions in full

_The original text of every finding (F) and open question (OQ), with its evidence. Inside these texts a finding is written "F-3" or "finding 3"; section 3 calls it F3._

#### Findings

- **F1 — The two subspace-created legacy operations cannot validate against the Release/79 schema (SUB-11).** Code/schema: `scalar UUID` only; `subspaceCreated(spaceID: UUID!)`. Test: `subscription-queries.ts:1` declares `$spaceID: UUID_NAMEID!`, `:11` calls `subspaceCreated(subspaceID: …)`. The project is off the nightly, so the inventory's "0 skip" is collection, not execution. Ruling: treat SUB-11 as unproven; fix or retire the two files with the area.
- **F2 — The activity subscription has a weaker gate than the activity query (SUB-10).** Code: `activityCreated` checks read on the collaboration only; `activityLogOnCollaboration` first requires the platform's "read users" privilege (signed-in). Test/spec: none. Ruling: an anonymous visitor can stream a public space's activity (with actor names) it cannot query — align, or accept until retirement.
- **F3 — Posts on draft callouts are pushed (SUB-12).** Code: the post-created event is published before the PUBLISHED check that governs the activity entry and the notification. Test: the Form control only. Spec: CAL-30's "on a published collaboration callout" wording covers activity, not the push. Ruling: whether a draft's posts may reach subscribers (today only those with read on the draft — admins and the creator).
- **F4 — "Discussion updated" fires only on creation (SUB-15).** Code: one publish, in `createDiscussion`. Test/spec: none. Ruling: rename/document, or accept with retirement.
- **F5 — Dead topic and queue constants (SUB-20).** Code: `PROFILE_VERIFIED_CREDENTIAL`, `SUBSCRIPTION_WHITEBOARD_CONTENT`, `SUBSCRIPTION_WHITEBOARD_SAVED` bound to nothing. Ruling: expected-loss list.
- **F6 — Comment removal is never pushed to live activity subscribers (SUB-21, ACT-13).** Code: `messageRemoved` hides the row and leaves the publish commented out ("todo"). Ruling: accept until retirement; note for the polling oracle (hidden rows must disappear on the next poll).
- **F7 — The legacy WebSocket protocol is still served (SUB-04).** Code: `subscriptions-transport-ws` next to `graphql-ws`, both authenticated from the upgrade. Test/spec: none. Ruling: is any client still on the legacy protocol? Retire with the area.
- **F8 — Anonymous visitors may open live streams on public resources (SUB-22).** Code: the gates are the resources' read rules; the matrix grants read on public rooms, collaborations, callouts and spaces to anonymous. Test: no anonymous subscription is attempted. Spec: none. Ruling: by design (public is public) or not — the polling-aware oracle in the new core must know.
- **F9 — Event ids are not unique (SUB-19).** Code: random 0..1000. Harmless (logging only) but a client de-duplicating on `eventID` would drop events. Ruling: note for retirement; no client reads it.

#### Open questions

Read-only extraction against the code, the tests and the specs; nothing below could be settled without a live stack or a source outside the three. Each needs a person to answer it or route it.

- **OQ1 — Where "FR-023 (WS addendum)" lives.** The code and the harness cite it; neither the server `specs/` nor agents-hq `specs/` holds the OIDC IdP spec (`feat/003-alkemio-oidc-idp`, PR #6143) locally. Locate it to sign SUB-01's why.
- **OQ2 — Whether the five legacy cases are green on Release/79.** The project is off the nightly and two of its operations cannot validate; no run artefact was found. Run `pnpm exec vitest run --project subscriptions` against the test env once, or retire the files without running.
- **OQ3 — Live checks for findings 2 and 8.** An anonymous socket subscribing to a public space's activity / room has only been read in code.
- **OQ4 — Which pushes the current client still consumes.** The local client-web clone (`7a37d4c4b`) holds a document for all 11; `develop` may have dropped some (020 hoisted `conversationEvents`; 024 polls the feeds). The retirement note needs the live list.
- **OQ5 — Per-feature replacement oracle.** The catalogue says "polling with backoff" without a staleness bound per feature — ask the rebuild architect before the W2 walks assert live updates.

### D. Test gaps

_For the Quality Lead (row GAPS in section 3)._

Untested rules by id: SUB-01, SUB-02, SUB-03, SUB-06, SUB-07, SUB-08, SUB-09, SUB-16, SUB-17, SUB-18; the unknown-why rows SUB-04, SUB-19; the disputed rows SUB-10, SUB-11, SUB-15, SUB-20, SUB-21, SUB-22; plus the untested clauses of SUB-05 (every read-based refusal), SUB-12 (draft callout posts), SUB-13 (edits, deletions, reactions, receipts — see COM-11).

Behaviours the area has that neither reading nor tests pinned down:
- A credential offered only in the handshake payload being ignored (SUB-01) and a socket without credentials running as anonymous (SUB-02).
- The 4401 "Session expired" close after the absolute session lifetime (SUB-03).
- A non-member refused a private space's activity / subspace / post / room subscription; an anonymous socket accepted on a public one (SUB-05, SUB-22).
- `activityCreated` at all — never subscribed by any test (catalogue CT-12 "unreached"); `includeChild` filtering per event; the type filter.
- A subscriber on one replica receiving an event published on another (SUB-07); behaviour after a broker drop (SUB-08).
- Forum, virtual-contributor and poll subscriptions (SUB-15/16/18) — no server-api case anywhere; polls have no legacy area.
- The in-app subscriptions' delivery to the receiver only (SUB-17) — the notifications area reads the counter through queries, not the push.
- Retirement acceptance: for each client feature that consumed a push (dashboard activity, subspace list, post collection, forum, VC status, bell, polls, chat), the staleness bound the polling oracle will assert.

### E. Constants the rules depend on

_"Rules on it" is pre-filled with the role whose domain covers the value: Product Lead for business values, defaults and user-facing copy; Technical Lead for engineering limits and wire shapes; Security Lead for access and audit values. The "product must rule?" column is as extracted: the reviewer ticks the rows product must rule on._

| Constant | Value today | Source | product must rule? | Rules on it |
|---|---|---|---|---|
| Subscriptions (11) | `activityCreated`, `calloutPostCreated`, `conversationEvents`, `forumDiscussionUpdated`, `inAppNotificationReceived`, `notificationsUnreadCount`, `pollOptionsChanged`, `pollVoteUpdated`, `roomEvents`, `subspaceCreated`, `virtualContributorUpdated` | `schema.graphql:7422-7475` | retire (OP-3) | Technical Lead |
| Topic names (12) | `forumDiscussionUpdated`, `profileVerifiedCredential` (dead), `calloutPostCreated`, `subspaceCreated`, `activityCreated`, `roomEvents`, `virtualContributorUpdated`, `in-app-notification-received`, `in-app-notification-counter`, `conversationEvents`, `pollVoteUpdated`, `pollOptionsChanged` | `subscription.type.ts:1-14` | F-5 | Technical Lead |
| Queue names | `alkemio-subscriptions-<topic>-<appId>`; unused: `-whiteboard-content`, `-whiteboard-saved`, `-profile-verified-credential` | `messaging.queue.ts:15-28`; `subscription.factory.provider.ts:162` | F-5 | Technical Lead |
| Exchange | direct, durable, not auto-deleted; queue exclusive, durable, deleted on dispose; heartbeat 30 s | `subscription.factory.ts:69, 74-111` | | Technical Lead |
| Disable flag | `ALKEMIO_DISABLE_SUBSCRIPTIONS=true` or schema bootstrap → in-memory bus | `subscription.factory.ts:57-63` | | Technical Lead |
| Protocols | `graphql-ws` + `subscriptions-transport-ws` | `app.module.ts:227-266` | F-7 | Technical Lead |
| Session close | code 4401 (`CloseCode.Unauthorized`), reason `Session expired`, on `onNext` when `absoluteExpiry < now` | `app.module.ts:252-262` | | Security Lead |
| Error — not signed in (forum) | `SUBSCRIPTION_USER_NOT_AUTHENTICATED` / 11109 "Subscription requires authentication." (`Subscription attempted to DiscussionsUpdated for non-authenticated user`) | `alkemio.error.status.ts:44`; `docs/error-codes.md:78`; `forum.resolver.subscriptions.ts:80-85` | | Technical Lead |
| Error — not signed in (conversation, in-app) | `User could not be resolved` (Forbidden) | `conversation.resolver.subscription.ts:147-153`; `in.app.notification.resolver.subscription.ts:283-289, 321-327` | | Technical Lead |
| Error — wrong callout | `Unable to subscribe: Callout does not allow Post contributions: <id>` (`BAD_USER_INPUT`) | `callout.resolver.subscriptions.ts:88-97`; `unable.to.subscribe.exception.ts:4-8` | | Technical Lead |
| Error — no read | `Authorization: unable to grant 'read' privilege: subscription to <what>: <id> …` | `authorization.service.ts:44`; each resolver's message string | | Technical Lead |
| Room event kinds | `MutationType` `CREATE`, `UPDATE`, `DELETE` on `message` / `reaction`; `receipt` UPDATE | `schema.graphql:633-637, 6878-6892`; `subscription.publish.service.ts:73-132` | | Technical Lead |
| Conversation event kinds (8) | `CONVERSATION_CREATED`, `CONVERSATION_UPDATED`, `CONVERSATION_DELETED`, `MESSAGE_RECEIVED`, `MESSAGE_REMOVED`, `MEMBER_ADDED`, `MEMBER_REMOVED`, `READ_RECEIPT_UPDATED` | `schema.graphql:413-425` | | Technical Lead |
| Poll event kinds (3) | `POLL_VOTE_UPDATED`, `POLL_STATUS_CHANGED` (both on `pollVoteUpdated`), `POLL_OPTIONS_CHANGED` | `poll.event.type.ts:3-7`; `poll.resolver.mutations.ts:324-333` | | Technical Lead |
| Activity subscription input | `collaborationID`, `includeChild`, `types` (empty = all) | `schema.graphql:8435-8444` | | Technical Lead |
| Subspace payload | `{spaceID, subspace}`; callout post payload `{calloutID, contributionID, sortOrder, post}` | `schema.graphql:7477-7482, 2376-2384` | | Technical Lead |
| Event id | `<prefix>-<random 0..1000>` | `subscription.publish.service.ts:209` | | Technical Lead |
| Legacy operations | `$spaceID: UUID_NAMEID!` and `subspaceCreated(subspaceID:)` in the suite vs `UUID!` / `spaceID` in the schema | `test › subscriptions/subscription-queries.ts:1, 11`; `schema.graphql:32, 7466-7469` | F-1 | Technical Lead |

### F. Where this lands in the new core

Nowhere, by design: catalogue OP-3 marks all 11 GraphQL subscriptions **dead-by-design** — chat goes Matrix-direct from the browser (the core becomes the AppService), and every other live update becomes `node(id)` polling with backoff; the row is the first entry of the W4 expected-loss list (decision 8). So the rules above are recorded to make the retirement explicit, not to be reimplemented. What must survive as a behaviour, re-homed: SUB-13/14 (room and conversation events) become Matrix room timelines read directly by the client — their oracle moves to the Matrix client in the harness (plan § W2 `harness-core`); SUB-10/11/12/15/16 (activity, subspaces, posts, forum, VC state) become polling — the catalogue says "the UI behaviours they fed (live updates) need a polling-aware oracle", so each needs a stated staleness bound before a W2 walk can assert "it appears"; SUB-17 (in-app bell) and SUB-18 (polls) follow the same polling rule with their own areas' content rules; SUB-01/02/03 (socket authentication) disappear with the socket — the equivalent in the new core is the one SQL authorization verdict per request, which also closes F-2 (query vs subscription gate drift) and F-8 (anonymous live streams) by construction. Three facts found here should go to the retirement note: (1) the legacy proof is thin and stale (five cases, two of which cannot validate — F-1; off the nightly), so there is no regression baseline to preserve; (2) the broker-backed fan-out (SUB-07/08) is the only place the server holds raw AMQP connections — their removal is a resilience win in itself (007); (3) the push is not transactional with the write anywhere (fire-and-forget after save, Matrix echo for rooms), so a polling oracle with a bound is no weaker than what exists.

### G. How this file was made

Extracted 2026-11-06 from three sources: server develop @ `eeecf9ddb` (Release/79) code + `schema.graphql`; the legacy server-api suite (`server-api/src/functional-api/subscriptions/`, 3 files, 5 cases, 0 skipped — on demand, not on the nightly); the specs, issues and docs listed in § Sources. Scope: the WebSocket transport and its authentication, the fan-out across server replicas, and for each of the 11 subscriptions who may subscribe, which events reach whom, and what the payload is. Conversation events (COM-55…61), room message rules (COM-11) and in-app notification content (notifications area) are only cross-referenced. This area is **recorded, then retired**: the rebuild drops GraphQL subscriptions (catalogue OP-3). WHAT and WHY only — no mutations, fixtures or request params. Evidence paths are relative to the server repo unless prefixed `test ›` or `spec ›`.

2026-11-19 converted to the three-section layout. The single why of every rule was split over business and technical without rewording; the product why is left for product. The status legend and the review-load line of the old layout were dropped: the counts at the top replace them.

2026-11-20 whys pass: every rule has at least one why, sourced where a spec, issue or code line states it and marked _(draft)_ where QA wrote it. The body of server PR #6289 now carries the why of SUB-03 and agents-hq spec 020 the why of SUB-17.

#### Sources

Server code (worktree `w1-access-matrix/server` @ `eeecf9ddb`):
- `src/app.module.ts` (GraphQL module: context, `subscriptions` block); `src/core/auth/oidc/graphql-ws-auth.ts`; `src/core/authorization/graphql.guard.ts`
- `src/core/microservices/subscription.factory.ts`, `subscription.factory.provider.ts`, `microservices.module.ts`
- `src/services/subscriptions/subscription-service/subscription.publish.service.ts`, `subscription.read.service.ts`, `subscription.service.module.ts`, `typed.pub.sub.engine.ts`, `dto/*`
- `src/common/enums/subscription.type.ts`, `messaging.queue.ts`, `subscriptions/mutation.type.ts`, `poll.event.type.ts`, `alkemio.error.status.ts`; `src/common/decorators/typed.subscription/*`; `src/common/exceptions/subscription.user.not.authenticated.ts`, `subscription/unable.to.subscribe.exception.ts`; `src/common/interfaces/base.subscription.payload.interface.ts`
- `src/services/api/activity-log/activity.log.resolver.subscriptions.ts`; `src/services/adapters/activity-adapter/activity.adapter.ts`
- `src/domain/space/space/space.resolver.subscriptions.ts`, `space.resolver.mutations.ts`; `src/domain/collaboration/callout/callout.resolver.subscriptions.ts`, `callout.resolver.mutations.ts`; `src/domain/communication/room/room.event.resolver.subscription.ts`; `src/domain/communication/conversation/conversation.resolver.subscription.ts`, `conversation.resolver.mutations.ts`; `src/domain/communication/messaging/messaging.service.ts`; `src/platform/forum/forum.resolver.subscriptions.ts`, `forum.resolver.mutations.ts`; `src/domain/community/virtual-contributor/virtual.contributor.resolver.subscriptions.ts`; `src/services/ai-server/ai-server/ai.server.service.ts`; `src/platform/in-app-notification/in.app.notification.resolver.subscription.ts`, `in.app.notification.resolver.mutations.ts`; `src/services/adapters/notification-in-app-adapter/notification.in.app.adapter.ts`; `src/domain/collaboration/poll/poll.resolver.subscriptions.ts`, `poll.resolver.mutations.ts`
- `src/services/event-handlers/internal/message-inbox/message.inbox.service.ts`
- `schema.graphql`; `docs/error-codes.md`
- git: `9b6a81eeb` (#6143), `458adb4cd` (#6289), `e9319947f` (007), `48093883e`, `f7d315d70` (#2741)

Tests (worktree `w1-access-matrix/test-suites`):
- `server-api/src/functional-api/subscriptions/aspect-comments.it-spec.ts`, `create-subspace.it-spec.ts`, `create-subsubspace.it-spec.ts`, `subscription-queries.ts`; `lib/src/utils/subscriptions/subscription-client.ts`
- `server-api/vitest.config.ts:121-123` (project; absent from `nightly` `:193-250`)
- `docs/qa/server-rebuild/knowledge/access-matrix.md` (§ room, § collaboration), `communications.md` (COM-11, COM-55…61), `callout.md` (CAL-49), `journey.md` (JRN-12); `catalogue/README.md` (OP-3, CT-12), `catalogue/root-fields.md` (11 subscription rows)
- Other suites touching the area (list only): dossier § 3

Specs / issues:
- `agents-hq/specs/007-connection-resilience/spec.md` (FR-001; broker guard tradeoff); `agents-hq/specs/020-notifications-sounds/spec.md:39` (client consumer); `agents-hq/specs/024-non-activity-home/spec.md` (feeds polled, no push)
- server `specs/109-redis-session-store-resilience/spec.md:206-209`; `specs/038-community-polls/spec.md` (US7, FR-030); `specs/040-group-conversations/spec.md` (FR-006/007/019)
- server PR #6143 (OIDC IdP, FR-023 WS addendum — spec not local), PR #6289
- server PR #6289 body (sockets outliving their session); `agents-hq/specs/020-notifications-sounds/spec.md` clarification on the tab badge
