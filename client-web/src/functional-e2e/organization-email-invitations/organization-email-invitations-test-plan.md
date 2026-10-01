# Test plan — organization email invitations (081)

- **Workspace spec:** `specs/081-org-email-invitations/` in `alkem-io/agents-hq` (source of truth for the US/AS ids below)
- **Suites:** `client-web/src/functional-e2e/organization-email-invitations/` (acceptance walks). Repository-internal detail (the same scenarios exercised as it-specs) lives in `server-api/src/functional-api/roleset/` (`associates/organization-associate-invitation-external.it-spec.ts`, `associates/organization-email-invitation-registration.it-spec.ts`, `invitations/invitation-external-resend.it-spec.ts`) and `server-api/src/functional-api/notifications/organization/associate-email-invitation.it-spec.ts`.

**Status: executed live.** The walks need a live stack (this workspace feature's server, notifications and client-web builds, MailSlurper, Kratos). They were authored against the source (operator ruling R10) and then executed against the isolated verification stack on 2026-09-30 and 2026-10-01: all 27 acceptance scenarios pass. The roleset and associates it-spec projects ran 119/121; the two failures were a test bug in US1-AS5 (the picked person's address is also typed, so one outcome per chip is expected), fixed in `4db1870c`, and the rerun was 11/11. Selectors are derived from the client-web sources (`InviteMembersDialog.tsx`, `OrgInviteAssociatesDialogConnector.tsx`, `PendingMembershipsTable.tsx`, `CrdPendingMembershipsDialog.tsx`) and the en i18n files. Later review-driven assertion tightenings (resend-mail subject, erasure checks, Dutch-language pin) are statically gated and are re-run live by the orchestrator.

## How to run

Needs a running app plus the GraphQL API, MailSlurper and the notification queue, all reachable from `client-web/.env`.

```bash
cd client-web
UI_HEADLESS=true pnpm exec playwright test --workers=1 src/functional-e2e/organization-email-invitations
```

`--workers=1` is not optional, for the same reason as the 062 walks: every file registers several Kratos identities, each completed by polling one shared MailSlurper mailbox. Every mail assertion here is a per-address delta (invitee addresses are unique per run), so no walk prunes the shared mailbox and no walk reads another walk's mail. The walks are collected by the nightly client run as the **"Organization email invitations"** project (`config/playwright.config.nightly.ts`).

## Scenario map

| Spec | User Story | Scenarios | Notes |
| ---- | ---------- | --------- | ----- |
| `us1-invite-by-email.spec.ts` | US1 — Invite an unregistered address by email | AS1, AS2, AS4, AS5, AS7 (UI); AS3, AS6, AS8 (API) | Driven by an organization admin who is not a platform admin. AS2 → AS4 → AS7 are chained on one address and session. AS5 drives the mixed batch through the dialog (picked user + new address + registered address + the picked user typed) and confirms per-invitee outcomes against the server, not the chip text alone. AS6 fills the Admin cap, then proves an email invitation offering Admin is still created and emailed while the registered-user path keeps its role-limit outcome. AS8 is the authorization matrix: plain associate and registered non-admin refused all four calls; OWNER and platform support allowed. |
| `us2-invitee-signup.spec.ts` | US2 — The invitee receives a dedicated email, signs up and responds | AS1, AS7 (mail); AS2 → AS3 (UI chain); AS4 (API); AS6 (admin UI) | AS1/AS7 read the real email (subject names the organization, message escaped and absent from the subject, call-to-action is the invitations link). AS2 follows that link logged out, lands on sign-up with the return URL kept, registers the invited address through Kratos (the multi-step sign-up form does not drive reliably headless), signs in from the sign-up page and finds the organization invitation in the pending dialog; AS3 accepts and checks both badges. AS4 uses a verified organization with the domain switch on: the same-domain invitee is asked, not auto-joined, a control address with no invitation is. AS5 (withheld Owner) is covered by the it-spec and by the 062 walk. The AS2/AS3 walk asserts Dutch labels, so the invitation's suggested language is pinned to `nl` and the walk skips with a stated reason when the stack does not list `nl` as eligible. The seeded interface language (AS2 tail) is covered by the language-offer suite. |
| `us3-resend.spec.ts` | US3 — Resend a pending email invitation | AS1, AS2, AS3 (UI); AS4, AS5, AS6 (API) | AS1/AS3 in the organization Associates table, AS2 in the Space community table, each through the real Resend control and its toast. The five-minute cooldown cannot be waited out in a walk: "a resend succeeds again after the window" is a server unit assertion; independence of two invitations is asserted here. AS6 reads the recorded inviter straight from the table when the harness can reach Postgres; the API-level check (the recorded inviter is not rewritten to the resender) runs everywhere. AS2 requires every mail to the Space invitee's address to carry the Space subject. |

The flipped 062 pins: `organization-user-associates/us1-invite-associates.spec.ts` — US1-AS1 now asserts the name-or-email search and the suggested-language control, and US1-AS6 asserts that an email address is accepted as a platform invitation (cleaned up afterwards).

## Not covered here (and where it is)

- Account-deletion erasure, the registration precedence rule itself and conversion carrying the message and language: `organization-email-invitation-registration.it-spec.ts`.
- The escaped-markup and subject rules at the mail level without a browser: `associate-email-invitation.it-spec.ts`.
