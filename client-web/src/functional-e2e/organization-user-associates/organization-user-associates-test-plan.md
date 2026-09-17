# Test plan — organization user associates (062)

- **Workspace spec:** `specs/062-organization-user-associates/` in `alkem-io/agents-hq` (source of truth for the US/AS ids below)
- **Suites:** `client-web/src/functional-e2e/organization-user-associates/` (acceptance walks). Repository-internal detail (the same scenarios exercised as it-specs) lives in `server-api/src/functional-api/roleset/associates/` — each acceptance spec's header cross-references the matching it-spec file(s).

## How to run

Needs a running app plus the GraphQL API, MailSlurper, and the notification
queue, all reachable from `client-web/.env`.

```bash
cd client-web
UI_HEADLESS=true pnpm exec playwright test --workers=1 src/functional-e2e/organization-user-associates
```

**`--workers=1` is not optional.** The walks each provision up to ten
Kratos identities, and every registration completes by polling one shared
MailSlurper mailbox for its verification link. Run in parallel they saturate
that round-trip and the harness's 30 s axios ceiling starts expiring mid-
`beforeAll`, which surfaces as `timeout of 30000ms exceeded` with a hook that
fails in 0 ms and takes its whole file down as "did not run" — a failure that
says nothing about the product. Serially the same specs pass. Any spec here
that reads the mailbox or registers identities has the same constraint.

These walks are tagged `@forge-acceptance` and require a live stack, so they
stay out of the repo's default (static) gate commands. They ARE collected by
the nightly client run: `.github/workflows/nightly-client-tests.yml` runs
`pnpm test:nightly`, whose config (`client-web/config/playwright.config.nightly.ts`)
registers them as the **"Organization user associates"** project
(`/organization-user-associates/*.spec.ts`, 120 s test / 15 s expect
budgets). That config runs every project with `workers: 1` and
`fullyParallel: false`, which is the serial discipline described above.
Outside nightly, run them explicitly with the command above, or via
`/forge`'s verification phase.

## Scenario map

| Spec                                  | User Story                                                                                        | Scenarios     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `us1-invite-associates.spec.ts`       | US1 — Organization admin or owner invites users to become associates                              | AS1-AS8       | AS3 (role-offer caps), AS4 (pre-existing state), AS6 (email invites rejected), and AS8's API half are pure API acceptance walks — no honest UI path exists for them (defence-in-depth already proven server-side). AS2 → AS7 are deliberately chained on the same persona/invitation (AS7 revokes the row AS2 created).                                                                                                                                                                                                                                      |
| `us2-invitee-responds.spec.ts`        | US2 — The invited user answers the invitation from the organization profile or their pending list | AS2-AS5       | Browser-only halves: the hero "Respond to invitation" action, the dialog's offered role (Associate + Admin) and inviter, accept (both roles granted, both badges on the Associates tab) and decline from it, the distinct Organisation section of the personal pending list (accept returns to the list), and the withheld-role notice (AS5: invited as Associate + Owner while there is headroom, the Owner cap is then filled via the API, and accepting in the UI must show the distinct "could not be granted" sentence). The API halves of AS5/AS6/AS7 live in `organization-associate-invitation.it-spec.ts`.                                                             |
| `us3-apply-and-decide.spec.ts`        | US3 — A user applies to associate; the organization decides                                       | AS1-AS9       | AS9 reproduces a premigration fixture (settings jsonb stripped of `allowApplications`) to prove the `@AfterLoad` default. Every scenario was independently walked live against the running forge-062 stack before this spec was written.                                                                                                                                                                                                                                                                                                                     |
| `us5-associates-editor.spec.ts`       | US5 — The Associates tab replaces the Community and Authorization tabs                            | AS1-AS4       | Browser walks: `/settings/authorization` lands on the Associates tab and the tab strip is exactly Profile / Account / Associates / Invitations / Settings with no Authorisation or Community tab (AS1); an ADMIN who is not an associate is listed with an Admin badge and no Associate badge (AS2, the badged union list); the row editor's three refusals — seventh Admin, fourth Owner, removing the sole Owner — each surface the readable limit copy from `contributorSettings.en.json` (`org.associates.errors.*`) and grant nothing (AS3); the Settings tab's Membership card renders exactly the three membership switches once each while the Associates tab renders none (AS4). AS5/AS6 are exercised by the US1/US3 walks. |
| `us7-pending-lists-integrity.spec.ts` | US7 — Platform integrity: pending lists stay partitioned and confidential                         | AS1-AS6       | Pure API acceptance walks — the spec text is entirely about GraphQL read/mutation behaviour (partitioning, GRANT gating, cascade-on-delete, the reset-loop eligibility signal), with no UI surface of its own to drive.                                                                                                                                                                                                                                                                                                                                      |

Shared fixtures (org creation, role assignment, invitation/application
helpers, the `TestUserManager`/`OrgFixture` scaffolding) live in
`organization-user-associates.helpers.ts`.
