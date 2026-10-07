# Organization Space membership — test plan

**Feature**: an organization's admins and owners see the organization's Space and
Subspace memberships on **Organization → Settings → Membership** and can make the
organization leave any of them (workspace `083-org-leave-space`, story
`alkem-io/server#6560`).

**Route**: `/organization/<nameID>/settings/membership`, tab placed between
*Associates* and *Invitations*.

**Personas**

| Persona | Role in the walks |
|---------|-------------------|
| `organization.admin@alkem.io` | ASSOCIATE + ADMIN of the scenario organization (seeded by `TestScenarioFactory`) — drives every UI walk |
| `qa.user@alkem.io` | plain ASSOCIATE of the scenario organization — redirected away from the tab (US1-AS7) |
| `GLOBAL_ADMIN` (API only) | seeds and strips Space roles, and plays the Space admin who removes the organization meanwhile (US2-AS6) |

**Fixtures**: one scenario per spec file — scenario organization *A* hosting Space
*S* with Subspace *S1* and sub-subspace *S2*. A hosting organization is made
Member + Lead of its Space at creation, so `clearHostLead` removes that Lead
first; `seedOrgMemberships` then makes *A* a plain Member of *S* and *S1* (and
*S2* on request). Teardown strips every remaining Space role before the scenario
is deleted.

## User Story 1 — the organization's memberships are listed

Spec: `us1-membership-tab.spec.ts` (serial).

| ID | Scenario | Automation |
|----|----------|------------|
| US1-AS1 | Tab between Associates and Invitations; cards *S* ("Space") and *S1* ("Subspace"), role "Member"; "Showing 2 of 2 memberships" | automated |
| US1-AS2 | Search by *S1*'s name → 1 card, "Showing 1 of 2"; clear → 2; Subspaces → *S1*; Spaces → *S*; All → 2 | automated |
| US1-AS3 | Search + filter matching nothing → "No memberships found"; *Clear Filters* resets search and filter | automated |
| US1-AS4 | Organization with no memberships → only the muted "not a member of any Space yet" caption; no search, filter or summary | automated (second organization administered by the same persona) |
| US1-AS5 | Organization also Lead of *S* → *S*'s card shows "Lead" | automated |
| US1-AS6 | Card menu → *View Space* lands on the Space page | automated |
| US1-AS7 | Plain associate opening the tab URL is redirected to the organization's public profile | automated |
| US1-AS8 | Page title / breadcrumb name the tab; copy present in all six languages | manual + client-web unit coverage (i18n key-parity test, route/tab tests) |
| US1-AS9 | Skeleton while loading; the empty caption never flashes first | manual + client-web unit coverage (loading-state test of the organization tab) |

## User Story 2 — the organization leaves a Space or Subspace

Spec: `us2-org-leaves-space.spec.ts` (serial; each test builds on the previous state).

| ID | Scenario | Automation |
|----|----------|------------|
| US2-AS1 | *Leave Subspace* on *S1* opens "Leave this membership?" naming *S1*; nothing is sent yet (API: still Member) | automated |
| US2-AS2 | *Cancel* → dialog closes, both cards remain, API still lists the organization in *S1* | automated |
| US2-AS3 | Confirm → "Membership left" toast within 3 s; *S1*'s card gone, *S* remains; API: *S1* excludes, *S* includes | automated |
| US2-AS4 | With *S*, *S1*, *S2* seeded, leaving *S* removes all three cards (empty caption); API: none lists the organization | automated |
| US2-AS5 | Organization Member + Lead of *S* leaves → success; Member removed, Lead kept; card stays with "Lead" (documented behaviour) | automated |
| US2-AS6 | Membership removed by a Space admin while the tab is open → "Couldn't leave — try again", dialog closes, no success toast, card gone after the refresh | automated |
| US2-AS7 | While the removal is in flight the confirm button is disabled with `aria-busy="true"` and Cancel is disabled | automated (removal request delayed via `page.route`) |

## User Story 3 — authorization boundary (API)

Covered by `server-api/src/functional-api/roleset/organization/organization-self-removal.it-spec.ts`
(vitest project `roleset`): own admin and own owner may remove the organization on
both `removeRoleFromOrganization` and the generic `removeRole`, including its Lead
role; a plain associate, an admin of another organization and an unrelated user are
denied; the Space-admin path is unchanged; leaving an L0 Space cascades to its
Subspaces. Regression of the Space-side paths:
`roleset/organization/organization.it-spec.ts`,
`roleset/organization/organization-edge.it-spec.ts`,
`roleset/invitations/invitation-organization.it-spec.ts`.

## Running

```bash
cd client-web && pnpm exec playwright test src/functional-e2e/organization-space-membership/
cd server-api && pnpm exec vitest run --project roleset src/functional-api/roleset/organization/organization-self-removal.it-spec.ts
```

Both need a stack running the server and client-web builds that ship the
organization Membership tab and the organization self-removal rule.
