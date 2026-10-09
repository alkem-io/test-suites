# Test plan — organization leaves a Space (083)

> **Status:** Draft — implemented by the /forge 083 run, revised 2026-10-09 after the QA challenge of test-suites#663; awaiting QA lead review · **Depth:** standard — one high-risk authorization widening on a membership-removal operation, two product repos · **Story:** [alkem-io/server#6560](https://github.com/alkem-io/server/issues/6560) · **Spec:** workspace `083-org-leave-space`

An organization's admins and owners see the organization's Space and Subspace
memberships on **Organization → Settings → Membership**
(`/organization/<nameID>/settings/membership`, between *Associates* and
*Invitations*) and can make the organization leave any of them (server#6649,
client-web#10410). The authorization boundary is proven at API level on both
removal operations; the tab is proven by persisted browser walks that read every
outcome back through the API.

## How to run

```bash
cd server-api && pnpm exec vitest run --project roleset src/functional-api/roleset/organization/organization-self-removal.it-spec.ts
cd client-web && UI_HEADLESS=true pnpm exec playwright test src/functional-e2e/organization-space-membership/
```

Both need a stack running the server and client-web builds that ship the
organization self-removal rule and the Membership tab. The nightly runs the walks
as the `Organization space membership` project
(`config/playwright.config.nightly.ts`) and the it-spec through the `nightly`
vitest project. Both walk files are serial inside. The harness admin needs
PLATFORM_SUPPORT, PLATFORM_CONTENT_FULL_ACCESS, PLATFORM_LICENSE_MANAGER and
FEATURE_ORGANIZATION_CREATOR for `TestScenarioFactory` to build scenarios.

**Fixtures.** One scenario per file: organization *A* hosts Space *S* with
Subspace *S1* and sub-subspace *S2*. A hosting organization is Member + Lead of
its Space at creation (`clearHostLead` removes that Lead in the walks). A NEW
organization enters a Space only by invite + accept
(`roleset-entry-role-assign-organization` is held by nobody), so every
membership is seeded that way (`inviteAndAccept`, `ensureOrgMemberOf`). The
walk persona `organization.admin@alkem.io` is ASSOCIATE + ADMIN of *A* and is
also made a user-Member of *S*/*S1*/*S2* because the tab lists only Spaces the
viewer can read (C-5). The it-spec adds organization *B* (admin
`non.space@alkem.io`), an OWNER (`subspace.member`) and a plain ASSOCIATE
(`qa.user`) of *A*.

## Risk

Levels are the 083 risk register's (workspace `specs/083-org-leave-space`,
`forge-run.md`); it rates a level only, so likelihood and impact are not split.

| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R-1 | A stranger, or another organization's admin, ejects an organization from a Space | — | — | high | US3-AS4, US3-AS7, non-host cases, FR-007 |
| R-2 | A plain associate or unrelated user removes the organization | — | — | high | US3-AS3, US3-AS5, SC-002 generic twins |
| R-3 | Leave acts on the wrong role set (parent instead of Subspace) | — | — | high | US2-AS3, US2-AS4, US3-AS1 |
| R-4 | Lead survives Leave (accepted residual, D-2) | — | — | medium | US2-AS5, US3-AS8 |
| R-6 | A failed leave reports success | — | — | medium | US2-AS6 |
| R-7 | "No memberships" flashes before the cards | — | — | medium | US1-AS9 |
| R-10 | The tab is reachable by non-admins | — | — | low | US1-AS7 |

Elevated-risk triggers present: ☑ authorization change · ☐ migration · ☐ schema change (diff 0) · ☐ infra.

## Existing coverage before this work

The Space-side organization removal was covered by
`roleset/organization/organization.it-spec.ts` (*Remove organization as member/lead
from space/subspace/subsubspace*) and `organization-edge.it-spec.ts`, invitation
entry by `roleset/invitations/invitation-organization.it-spec.ts`, and the user
Membership tab by `memberships/access-own-membership-settings.spec.ts`. Proven
absent: any organization-side removal authorization test and any walk of an
organization Membership tab. 0 of 24 acceptance scenarios reused an existing test.

## Scenario → test mapping

US1/US2 rows live in `client-web/src/functional-e2e/organization-space-membership/`;
US3 rows in `server-api/src/functional-api/roleset/organization/organization-self-removal.it-spec.ts`.

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| US1-AS1 | Tab position; S/S1 cards with type and role badges; "Showing 2 of 2" | `us1-membership-tab.spec.ts` › US1-AS1 tab lists the Space and Subspace memberships | E2E |
| US1-AS2 | Search; All / Spaces / Subspaces filter | › US1-AS2 search narrows by name and the filter splits Spaces from Subspaces | E2E |
| US1-AS3 | Filtered empty state; Clear Filters resets | › US1-AS3 nothing matches → No memberships found, Clear Filters resets | E2E |
| US1-AS4 | No memberships → caption only | › US1-AS4 organization with no memberships shows only the empty caption | E2E |
| US1-AS5 | Lead badge | › US1-AS5 Lead role shows the Lead badge | E2E |
| US1-AS6 | View Space | › US1-AS6 View Space opens the Space | E2E |
| US1-AS7 | Plain associate redirected | › US1-AS7 a plain associate is redirected to the public profile | E2E |
| US1-AS8 | Title (after in-app navigation), breadcrumb, no raw keys — **partial**, see gaps | › US1-AS8 title and breadcrumb name the tab; no raw i18n keys | E2E |
| US1-AS9 | Skeleton while `rolesOrganization` is held; no empty caption | › US1-AS9 skeleton while loading, never the empty caption before the cards | E2E (request delayed, not faked) |
| US2-AS1 | Dialog names S1; nothing sent; still Member | `us2-org-leaves-space.spec.ts` › US2-AS1 Leave Subspace opens a destructive confirmation naming the Subspace | E2E + API read |
| US2-AS2 | Cancel changes nothing | › US2-AS2 Cancel changes nothing | E2E + API read |
| US2-AS3 | Leave S1 only; toast within 3 s (SC-001) | › US2-AS3 confirming leaves only the Subspace chosen | E2E + API read |
| US2-AS4 | Leave S cascades to S1/S2 | › US2-AS4 leaving the Space ends its Subspace memberships too | E2E + API read |
| US2-AS5 | Lead survives Leave | › US2-AS5 leaving a Space where the organization is Lead keeps the Lead role | E2E + API read |
| US2-AS6 | Removed meanwhile → error, never success | › US2-AS6 a membership removed meanwhile reports an error, never success | E2E + API read |
| US2-AS7 | Confirmed dialog busy and disabled; one request | › US2-AS7 a second submit is impossible while the leave is in flight | E2E (request delayed) |
| US3-AS1 | Org admin removes A from S1 | › US3-AS1 org admin removes A from S1 | API |
| US3-AS2 | Owner removes A from S; cascade | › US3-AS2 org owner removes A from S (cascade to S2) | API |
| US3-AS3 / AS4 / AS5 | Associate, admin of B, unrelated user denied | › US3-AS3 associate-only of A is denied; US3-AS4 admin of B is denied; US3-AS5 unrelated user is denied | API |
| US3-AS6 | Space-admin path unchanged | › US3-AS6 space admin path unchanged | API |
| US3-AS7 / SC-002 | Generic `removeRole`: admin of A allowed; admin of B, associate, unrelated user denied | › US3-AS7 generic removeRole twin; US3-AS7 generic removeRole: associate-only of A is denied (SC-002); US3-AS7 generic removeRole: unrelated user is denied (SC-002) | API |
| US3-AS8 | Org admin removes A's Lead | › US3-AS8 org admin removes A's LEAD | API |
| FR-007 | The removal grant is per request, never persisted on the Space | › FR-007 the self-removal grant does not stick to the Space role set | API |

### Regression guards

- **Host-account confound** (QA challenge QA-CH-01): *A* hosts *S*, so *A*'s admins
  also administer *S*'s account. › US3-AS1 non-host: admin of organization B
  removes B from S, and › US3-AS4 non-host: admin of host organization A cannot
  remove organization B, fail if the rule is keyed on the Space's host account
  rather than on the organization being removed.
- **Persisted grant** (FR-007): if the extended policy were saved on the role set,
  *A*'s admin could then assign Lead with GRANT alone; the FR-007 case requires
  the denial to name the `grant` privilege.

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| US1-AS8 / FR-012 — copy in all six languages | Switching the UI language persists on the shared persona and would leak into parallel specs; locale assertions have no home here (`harness.md`) | client-web i18n key-parity unit test + manual release check |
| US1-AS8 / FR-001 — title on a cold direct load | Pre-existing race between the settings shell's "Profile" title and each tab's own title: [alkem-io/client-web#10415](https://github.com/alkem-io/client-web/issues/10415). The walk asserts the title after in-app navigation only | client-web; add the cold-load assertion once #10415 ships |
| FR-016 — focus trapped in and returned from the Leave dialog; banner alt text; "Led by" group label | No accessibility harness (`harness.md`). The walks pin only the filter's `aria-pressed` and the menu trigger's accessible name | Manual a11y check; client-web `MembershipsSection.test.tsx` pins `aria-pressed` only |
| C-5 — a Space the viewing admin cannot read is not listed (API leave still allowed) | Every walk makes the persona a user-Member so that its cards render; no case drops that read access | Manual, or a future walk with a non-member admin |
| Archived Spaces excluded from the tab | No scenario archives a Space with an organization member | Manual / server `rolesOrganization` tests |
| SC-004 — the Space-side organization and invitation suites stay green | They run in the same `roleset` project, but 16 of them are red on develop after 027 Slice B (no holder of `roleset-entry-role-assign-organization`), independently of 083 | Fix tracked outside 083; rerun before release |
| US2-AS6 — leave when the Space's community cannot be resolved (C-10) | Only the "removed meanwhile" failure is driven; making the community unresolvable mid-walk needs a read-access change the walk does not make | client-web `useOrgMembershipTabData.test.ts` › rejects without sending the mutation when the role set cannot be resolved, and refreshes the list |

The API matrix proves who may remove an organization on both operations, for a
host and a non-host organization, and that the grant does not outlive the
request. The walks prove the tab's list, filters, Leave flow and failure path
end to end. Languages, accessibility, unreadable and archived Spaces, and the
cold-load title are not proven here.
