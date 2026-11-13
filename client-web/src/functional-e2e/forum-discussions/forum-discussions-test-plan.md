# Test plan — forum: start a discussion, comment, answer in a thread, mention a user (W2 journey 12, part 1)

> **Status:** Built 2026-11-12, uncommitted (branch `qa/w2-journey-12`); rulings R-1 and R-2 provisional, QA lead to confirm · **Depth:** Standard (one trigger: cross-repo contract, because discussions, room messages, threads and mention notifications are shapes the rebuild replaces), capped at the journey: 4 cases · **Source:** `docs/qa/server-rebuild/plan.md` § W2, journey 12; client-net audit rows J2, J3 and E5 (mentions); issue alkem-io/test-suites#721

This journey has no diff. It comes from the plan. The basis is the audit, the plan, and product source read at client-web `origin/develop` @ `f33325b2b` and server `origin/develop` @ `e120d25a1` (2026-11-12). The audit (2026-10-14) rated J2 "STRONG, manual runner only" (`platform-roles/forum-discussion-controls.spec.ts`, no read-back), J3 (reply) and E5 mentions ABSENT. This suite adds a nightly UI create with a server read-back, the first UI comment and thread answer on a discussion, and the first UI mention that is sent and followed to the mentioned user's notification. Every write is read back through a named `@alkemio/tests-lib` function: `readPlatformDiscussion` (new: the discussion with its author, category and every message's sender, text and thread) and `readMyNotifications` (its payload selection now includes the room-message shape that mentions and thread answers use).

## How to run
```bash
cd client-web
pnpm run test:nightly --project="Forum discussions"        # J2-1 only; tier extended
pnpm run test:local-stack --project="Local stack — forum comments"   # all four cases
```
- Both files register their users through public Kratos and verify them by their own mail (`registerVerifiedUser`, as in Contributors CRUD); the mail sink must be reachable.
- `us1-create-and-reply.spec.ts` is `mode: 'serial'`: J2-1 (create) → J3-1 (comment on it) → J3-2 (answer that comment). `us2-mention-in-comment.spec.ts` seeds its own discussion through the lib.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | A user starts a discussion; it is saved under the wrong author, category or without its body | Medium (discussion + profile + room rebuilt) | Medium | Medium | J2-1 |
| R2 | A comment is accepted but not stored, or stored under the wrong sender | Medium (the room write path moves) | High (silent data loss in a public forum) | **High** | J3-1 |
| R3 | An answer in a thread lands top-level (thread link lost), or the commenter is not told | Medium | Medium | Medium | J3-2 |
| R4 | A mention is stored as plain text, resolves to the wrong user, or nobody is notified | High (mention parsing and notification routing are rewritten) | Medium | **High** | E5-1 |
| R5 | The suite leaks a discussion or a user onto a shared environment | Medium | Medium | Medium | teardown design |

Elevated-risk triggers present: [ ] authorization/visibility · [x] cross-repo contract · [ ] migration · [ ] breaking contract · [ ] infra/config · [ ] data-destructive · [ ] performance-sensitive.

## Existing coverage before this work
Searched test-suites `origin/develop` @ `ef405cc0`.
- **J2 create.** `platform-roles/forum-discussion-controls.spec.ts` creates a discussion in the UI as a Feature persona and checks the URL and heading; it has no server read-back and runs only in the manual platform-roles runner. Its subject is who is offered edit/delete (027), which this suite does **not** repeat.
- **J4 recategorise.** `forum-categories/edit-dialog-recategorise.spec.ts` (nightly). Not repeated.
- **API.** `server-api` `communications/forum-discussions/*`, `communications/replies/reply.it-spec.ts` and `notifications/platform/forum-discussions.it-spec.ts` cover the mutations and the forum mails at API level. Nothing walks a comment or a mention through the browser.
- **Mentions.** `contributors-crud/virtual-contributor-crud.spec.ts` › 3.5 types "@" in a Space's comment box and proves a member is offered and inserted (and a VC is not). It never sends. **Reused, not repeated:** which users a Space's "@" list offers stays with 3.5; this suite sends the mention and follows it to the server and the recipient.

## Scenario → test mapping
Techniques: **UC** use-case walk with the postcondition read back · **ST** state transition · **EP** viewer partition · **NC** negative with a positive control.

| ID | Scenario | Technique | Oracle (UI + lib read-back) | Automated by | Layer |
|---|---|---|---|---|---|
| J2-1 | A registered user starts a discussion (title, Q&A, body) | UC, EP, NC | `createDiscussion` answered; lands on `/forum/discussion/<nameID>`; `readPlatformDiscussion`: exact title, exact body, category `HELP`, `createdBy` = the author's id, 0 messages; the admin-only categories (Releases, Newsletter) are not offered, read after the open list shows Q&A (positive control); a second user finds it listed under `/forum/help` and sees title and body | `us1-create-and-reply.spec.ts` › J2-1 a registered user starts a discussion; the server stores its title, body, category and author, and another user finds it in the category | UI + lib |
| J3-1 | A second user comments on it | UC | `sendMessageToRoom` answered, box cleared; after a reload the comment is shown under the commenter's name; `readPlatformDiscussion`: exactly 1 message, exact text, `sender.id` = the commenter | `us1-create-and-reply.spec.ts` › J3-1 another user comments on the discussion; … (`@local-stack`) | UI + lib |
| J3-2 | The author answers that comment in its thread | UC, ST | `sendMessageReplyToRoom` answered; after a reload the answer renders inside the comment's reply list; 2 messages, the answer's `threadID` = the comment's id, `sender.id` = the author; the commenter has exactly one `USER_COMMENT_REPLY` in-app notification for this room | `us1-create-and-reply.spec.ts` › J3-2 the author answers in the comment's thread; … (`@local-stack`) | UI + lib |
| E5-1 | A user picks another user from the "@" list and sends | UC | the "@" list offers exactly one match; the stored message is exactly `[@<name>](<mentioned user's profile URL>) <text>`; after a reload the rendered mention links to that profile; the mentioned user had 0 `USER_MENTIONED` before and exactly 1 after, raised by the sender, addressed to them (`payload.user.id`), for this room, carrying the stored message | `us2-mention-in-comment.spec.ts` › E5-1 a user mentions another user in a comment; … (`@local-stack`) | UI + lib |
| — | Who is offered edit/delete on a discussion | — | — | `platform-roles/forum-discussion-controls.spec.ts` | covered (manual runner) |
| — | Recategorise a discussion | — | — | `forum-categories/edit-dialog-recategorise.spec.ts` | covered |
| — | Which users a Space's "@" list offers | — | — | `contributors-crud/virtual-contributor-crud.spec.ts` › 3.5 | covered |

### Regression guards
- **J2-1:** `createDiscussion` dropping the profile description, mapping the Q&A option to another category, or attributing the discussion to anyone but the caller.
- **J3-1 / J3-2:** a room message stored under the wrong actor; a reply stored top-level (the `threadID` link lost); the reply notification routed to the wrong user or not raised.
- **E5-1:** the mention markup not parsed (plain text), parsed to another user, or the notification not raised / raised for another user or room.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| Mention an organisation (its admins are notified) | Out of this cut; the server path is the same parser with another target | follow-up |
| A mention by a user who may not see the mentioned user (private Space "@" scope) | The scope is the Space's `mentionableContributors`; 3.5 covers the positive; the negative needs a private-Space fixture | follow-up |
| Mention and reply **mails** | In-app is the oracle here; mail per recipient is journey 10's oracle | journey 10 |
| Delete a comment; react to a comment on a discussion | Callout comment reactions are covered (`tests/callout-reactions`); delete is not journey 12 | follow-up |
| A user who is not mentioned gets nothing | A negative needs a settle window from a product constant; the notification has no such constant | — |

## Rulings (provisional; QA lead to confirm)
| Ruling | Provisional default |
|---|---|
| R-1 Comments, thread answers and mentions are `@local-stack` | **Yes, as instructed for journey 12** ("Matrix-backed parts fail on test by environment"). They send through the discussion's Matrix room, and the notifications ride the inbound Matrix event (server `MessageInboxService`). Note for the QA lead: callout comments and reactions, which use the same room path, run in today's nightly on test-alkem.io; if a run on test proves the forum room works there, move J3-1, J3-2 and E5-1 back into the nightly by dropping the tag |
| R-2 Mentions are walked in the forum, not in a Space callout | Yes. The server parses every room message the same way; the forum's "@" list is platform-wide, so no Space membership fixture is needed. The Space-scoped "@" list stays with contributors-crud 3.5 |

## Build notes (2026-11-12, local stack: client-web and server `develop`, Synapse up)
- **Runs.** See the PR description / journey report: the nightly project (J2-1) and the local-stack project (all four) green twice each; teardown logged `discussion '<nameID>' removed` for both files every run.
- **Red-proofs** (each sabotage run once, seen red at the intended line, file restored): E5-1 with the expected mention target swapped for the sender's profile URL → red at the exact stored-message check (`…/crud-mentioner… ` vs `…/crud-mentioned…`). J3-2's first draft looked the answer up as any list item and matched both the comment and the nested answer (strict-mode red): the oracle now requires the answer **inside** the comment's reply list.
- **Observations.** `sender.id` of a room message equals the user's id. A discussion's nameID is its title lowercased with separators dropped (`W2 forum <id>` → `w2forum<id>`), which teardown matches on.
