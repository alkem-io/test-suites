# Test plan — organization space invitations (061)

- **Workspace spec:** `specs/061-organization-space-invitations/` in `alkem-io/agents-hq` (source of truth for the US/AS ids below)
- **Suites:** `client-web/src/functional-e2e/organization-space-invitations/` (acceptance walks). Server-side validation-only scenarios that the unified invite dialog can never drive (an Admin role or a non-actor id offered to an organization) are covered instead by `server-api/src/functional-api/roleset/invitations/invitation-organization.it-spec.ts` — each acceptance spec's header cross-references that file for the AS ids it defers.

## How to run

Needs a running app plus the GraphQL API, MailSlurper, and the notification
queue, all reachable from `client-web/.env`.

```bash
cd client-web
UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/organization-space-invitations
```

These walks are tagged `@forge-acceptance` and require a live stack, so they
stay out of the repo's default gate commands (there is no CI job that
discovers `functional-e2e/**`) — run them explicitly, or via `/forge`'s
verification phase.

## Scenario map

| Spec | User Story | Scenarios | Notes |
|---|---|---|---|
| `us1-invite-organization.spec.ts` | US1 — Space admin invites an organization | AS1-AS9 | AS7/AS8 (validation errors) are API-only — see server-api cross-reference above. Includes a regression walk (AS2) for the invite-dialog search-exclusion defect found during acceptance verification. |
| `us2-org-admins-notified.spec.ts` | US2 — Organization admins are told their organization was invited | AS1-AS7 | Covers the email/in-app/push notification artifacts, plus the zero-admin and muted-admin edge cases. |
| `us3-org-accepts-declines.spec.ts` | US3 — Organization admin accepts or declines on behalf of the organization | AS1-AS8 | Gate 0 (the ACCOUNT_ADMIN-derived accept privilege) is also proven server-side against a mocked-then-live authorization graph. |

Shared fixtures (org creation, role assignment, invitation helpers, the
`TestUserManager`/`OrgFixture` scaffolding) live in
`organization-space-invitations.helpers.ts`.
