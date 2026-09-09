# Test plan — organization user associates (062)

- **Workspace spec:** `specs/062-organization-user-associates/` in `alkem-io/agents-hq` (source of truth for the US/AS ids below)
- **Suites:** `client-web/src/functional-e2e/organization-user-associates/` (acceptance walks). Repository-internal detail (the same scenarios exercised as it-specs) lives in `server-api/src/functional-api/roleset/associates/` — each acceptance spec's header cross-references the matching it-spec file(s).

## How to run

Needs a running app plus the GraphQL API, MailSlurper, and the notification
queue, all reachable from `client-web/.env`.

```bash
cd client-web
UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/organization-user-associates
```

These walks are tagged `@forge-acceptance` and require a live stack, so they
stay out of the repo's default gate commands (there is no CI job that
discovers `functional-e2e/**`) — run them explicitly, or via `/forge`'s
verification phase.

## Scenario map

| Spec | User Story | Scenarios | Notes |
|---|---|---|---|
| `us1-invite-associates.spec.ts` | US1 — Organization admin or owner invites users to become associates | AS1-AS8 | AS3 (role-offer caps), AS4 (pre-existing state), AS6 (email invites rejected), and AS8's API half are pure API acceptance walks — no honest UI path exists for them (defence-in-depth already proven server-side). AS2 → AS7 are deliberately chained on the same persona/invitation (AS7 revokes the row AS2 created). |
| `us3-apply-and-decide.spec.ts` | US3 — A user applies to associate; the organization decides | AS1-AS9 | AS9 reproduces a premigration fixture (settings jsonb stripped of `allowApplications`) to prove the `@AfterLoad` default. Every scenario was independently walked live against the running forge-062 stack before this spec was written. |
| `us7-pending-lists-integrity.spec.ts` | US7 — Platform integrity: pending lists stay partitioned and confidential | AS1-AS6 | Pure API acceptance walks — the spec text is entirely about GraphQL read/mutation behaviour (partitioning, GRANT gating, cascade-on-delete, the reset-loop eligibility signal), with no UI surface of its own to drive. |

Shared fixtures (org creation, role assignment, invitation/application
helpers, the `TestUserManager`/`OrgFixture` scaffolding) live in
`organization-user-associates.helpers.ts`.
