# Test plan — user avatars in the chat popup (033)

- **Story:** [alkem-io/client-web#9949](https://github.com/alkem-io/client-web/issues/9949) — *Add avatars of users in group chats*
- **Workspace spec:** `specs/033-chat-avatars/` in `alkem-io/agents-hq` (source of truth for the US/AS/FR/SC ids used below)
- **Product code:** [client-web#10086](https://github.com/alkem-io/client-web/pull/10086) (merged) — UI only, no server or GraphQL change
- **Suite:** `client-web/src/functional-e2e/chat-avatars/`

## How to run

The walks need a running app plus MailSlurper and the GraphQL API, all reachable
from the environment in `client-web/.env`:

```bash
cd client-web
UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/chat-avatars --workers=1
```

`--workers=1` is a convenience, not a requirement — the files are independent and
safe to run in parallel (see *Isolation* below).

In CI these run as the **`Chat avatars`** project of the nightly client build
(`config/playwright.config.nightly.ts`, executed by `nightly-client-tests.yml`
via `pnpm --filter @alkemio/test-suite-client-web run test:nightly`). That
project carries its own `120s / 15s` timeouts because the rest of the nightly
runs at `30s / 5s`, and every scenario here is a multi-user round trip through
the live chat room. It needs no setup project and no shared persona state — each
file creates and removes its own accounts — so it can also be run on its own:

```bash
pnpm exec playwright test --config=config/playwright.config.nightly.ts \
  --project="Chat avatars"
```

### Every scenario stands on its own

The files are `mode: 'serial'` because they share one expensive fixture (the
registered users and their open chat panels), **not** because the scenarios have
to run in order. Each test establishes its own precondition before asserting:

- US1 opens each run itself with `breakRun()` — an own message always breaks a
  sender run, so no scenario inherits whatever message the previous one left at
  the bottom of the thread.
- US2 and US3 normalise the panel view themselves (`ensureConversationList`,
  `openConversation`, `openChatPanel` are all idempotent), and US2-AS3 sets a
  group photo itself if none is present rather than depending on AS2.

That means `--grep`, `--grep-invert`, shards, retries and single-test debugging
all work. Verified: the full 15 pass; US1 minus AS5 passes 7/7; and US1-AS6,
US2-AS3 and US3-AS3 each pass when run completely alone.

Required env: `ALKEMIO_BASE_URL`, `ALKEMIO_SERVER`, `KRATOS_ENDPOINT`,
`MAIL_SLURPER_ENDPOINT`, `AUTH_TEST_HARNESS_PASSWORD`.

### Isolation and data lifecycle

Every walk is **self-contained**: it registers its own users through the real
sign-up + email-verification flow and builds its conversations through the chat
UI. Nothing is seeded through the API, and no pre-existing persona is touched.
The whole suite (15 scenarios, 12 accounts) runs in **~1.6 minutes**.

**Why the sign-up form and not `@alkemio/tests-lib`'s registration helpers.**
`registerInKratosOrFail` / `verifyInKratosOrFail` talk to Kratos directly at
`KRATOS_ENDPOINT` (`/ory/kratos/public`), and on this environment that path is
not routed to Kratos — every self-service endpoint answers `200 text/html` with
the SPA, so `createNativeRegistrationFlow()` returns no flow id and registration
fails outright (verified 2026-08-07). The harness's own persona seeding does not
hit this because `SKIP_USER_REGISTRATION=true` here. If Kratos is ever exposed,
swap `completeSignUp` for the lib pair and delete the form driving — that is the
preferred shape, it just does not work today.

**Only users a walk actually drives are signed in.** `registerAccount` creates a
verified account and throws its browser away; `registerAndSignIn` keeps the
session. US2's five participants exist purely to be findable in the people
picker and to appear in the avatar composite, so they get accounts, not sessions.

**Registration runs concurrently** (`registerAccounts` / `registerAndSignInAll`).
This is safe because each flow has its own browser context and the mailbox lookup
is scoped to its recipient, so concurrent registrations cannot steal each other's
verification link.

- Emails are `chatavatars{1,2,3}-<slot>-<uid>@alkem.io` with a per-run unique id,
  so concurrent runs never collide.
- The verification mail is looked up **scoped to its recipient** and sorted
  newest-first (`getVerificationLinkFor`). The suite never calls
  `deleteMailSlurperMails()` — MailSlurper is shared with every other suite on
  the environment, so wiping it would break anything running alongside.
- `afterAll` closes any browser sessions and then **deletes every account the
  file created** (`teardownAccounts` → `deleteTestUsers`), as platform admin,
  with `deleteIdentity: true` so the Kratos identity goes too. Deletion is by the
  user id captured at registration — no search, so cleanup cannot miss an account
  because a filter behaved unexpectedly — and the deletes run concurrently.
- Cleanup failures are **not** swallowed: a user left behind is environment drift
  the next run inherits, so the suite fails loudly instead. (Same policy as the
  029 language walks.) A user that was never created — a run that died during
  registration — is skipped silently.
- Verified after a green run: the environment returns to its 14 baseline
  personas, zero `chatavatars*` accounts left.

**Residual:** deleting the users removes their accounts and identities. The group
conversations they created are expected to go with them; that cascade is not
independently asserted.

## Scenario → test mapping

| Scenario | Covers | Automated by |
|---|---|---|
| US1-AS1 | A single incoming message shows the sender's avatar **and** name — and the avatar is the picture that sender actually uploaded | `us1-group-thread-sender-avatars.spec.ts` › US1-AS1 |
| US1-AS2 | Consecutive messages from one sender carry exactly **one** avatar and **one** name across the whole run (SC-002) | `us1-…` › US1-AS2 |
| US1-AS3 | Every change of sender restarts a run — both alternations show the new sender | `us1-…` › US1-AS3 |
| US1-AS4 | Own messages unchanged: right-aligned, no avatar, no name, no gutter, no `sr-only` (FR-010) | `us1-…` › US1-AS4 |
| US1-AS5 | A sender who never uploaded a picture gets the **same** treatment in the gutter as in the conversation identity (FR-009) | `us1-…` › US1-AS5 |
| US1-AS6 | A run continuation hides the name visually but keeps it in the DOM, `sr-only`, for assistive technology (FR-008) | `us1-…` › US1-AS6 |
| US1-AS7 | A reaction lands on its own bubble inside an indented run and not on the neighbouring one; the timestamp stays in the same column (FR-012) | `us1-…` › US1-AS7 |
| US1-AS8 | A **live** message from the current run's sender joins it; one from anyone else starts a new run — no reload, subscription push only | `us1-…` › US1-AS8 |
| US2-AS1 | Group without a custom photo: the header composite equals the list row's, image for image and fallback for fallback (FR-002) | `us2-group-header-identity.spec.ts` › US2-AS1 |
| US2-AS2 | Setting a group photo replaces the composite with the photo, in header and list alike | `us2-…` › US2-AS2 |
| US2-AS3 | Changing the photo again updates both surfaces to the new image | `us2-…` › US2-AS3 |
| US2-AS4 | More than four other participants → both surfaces show the same 4-avatar subset, same order | `us2-…` › US2-AS4 |
| US3-AS1 | 1:1 header shows the other person's profile picture, identical to their list row, alongside their name (FR-001) | `us3-direct-thread-header-identity.spec.ts` › US3-AS1 |
| US3-AS2 | 1:1 header for a person who never uploaded a picture uses the **same** treatment as their list row, and shows their identity rather than the other contact's | `us3-…` › US3-AS2 |
| US3-AS3 | 1:1 message bubbles are untouched — no gutter, no avatar, no injected attribution, incoming or outgoing (FR-011) | `us3-…` › US3-AS3 |

## Not covered — known gaps

| Scenario | Why not automated end to end | Where it is covered instead |
|---|---|---|
| The pure initials-**fallback** DOM branch (`avatarUrl` undefined) | Unreachable through the product: the platform assigns every new account an avatar document at registration, and the UI offers no way to remove a profile picture. **US1-AS5** and **US3-AS2** therefore assert treatment *consistency* — the message gutter / thread header uses the same avatar the conversation identity does — which is what FR-009 and FR-001 actually require | client-web unit tests — `ChatMessageBubble.test.tsx`, `ConversationAvatar.test.tsx`, `initials.test.ts` |
| FR-003 — AI Guidance thread header shows the assistant icon | Needs the guidance conversation, which depends on a platform feature flag and a VC being configured on the environment | `ConversationAvatar.test.tsx` (guidance branch); manual QA where the flag is on |
| FR-004 — the conversation-**list** view shows no avatar next to the panel title | Trivially true by construction (`titleAvatar` is only passed in thread view) and would only ever fail together with a header scenario above | Code assessment; `UnifiedChatPanelConnector` |
| FR-013 second half — an authorless/system message breaks a run and never joins one | The chat UI has no way to produce a message without a sender | `messageRuns.test.ts` |
| FR-007 — the Virtual Contributor badge moves to the run head | Needs a VC as a group participant; not creatable from the chat picker | `ChatMessageBubble.test.tsx` |
| Sender who has left the group still shows their avatar/name | Leaving is destructive to the fixture and the assertion adds nothing over US1-AS1 | Manual QA |
| Long conversation names truncate with the avatar present; small-screen layout | Visual/layout properties, not DOM contracts — a screenshot diff would be the right tool, and this suite has none | Manual QA |
| FR-014 / SC-005 — the feature adds no data fetching | A negative performance claim; not observable from the DOM | Code assessment (the PR touches no `.graphql` file) |

## Notes for whoever maintains this

Three things about the product's DOM cost real debugging time — they are encoded
in `chat-avatars.helpers.ts`, but worth stating here:

1. **The panel's accessible name changes.** `ChatPanel` sets
   `aria-label={title}`, and `title` is `"Chat"` only in the conversation-list
   view — once a thread is open the dialog is named after the conversation. Locate
   the panel by the close button it always carries, never by the name `"Chat"`.
   There is also no heading anywhere in the panel; the title is a `<span>`.
2. **`sr-only` is visible to Playwright.** Tailwind's `sr-only` clips the element
   to 1×1 instead of removing it from layout, and Playwright counts any non-empty
   box as visible. `expect(...).not.toBeVisible()` on the continuation attribution
   asserts the opposite of what the DOM does — assert the clipped box instead
   (`expectVisuallyHidden`).
3. **`filter({ has })` is relative.** Passing a panel-rooted locator as `has:`
   (one whose selector starts at `[role="dialog"]`) can never match, and yields a
   silent zero rather than an error.
