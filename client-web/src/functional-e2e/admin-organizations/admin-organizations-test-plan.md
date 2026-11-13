# Test plan — Administration › Organisations: verify, edit (W2 journey 12, part 3)

> **Status:** Built 2026-11-12, uncommitted (branch `qa/w2-journey-12`) · **Depth:** Light-to-standard (authorization of the admin surface is covered elsewhere; the risk here is lost writes), capped at the journey: 2 cases · **Source:** `docs/qa/server-rebuild/plan.md` § W2, journey 12; client-net audit rows L2 (organisations admin) and H5 (verify an organisation); issue alkem-io/test-suites#721

The audit (2026-10-14) rated L2 ABSENT. Since then `contributors-crud` (2026-11-04) covers the platform admin creating and deleting an organisation in Administration (2.1, 1.7) and an organisation admin editing name, tagline and website (2.2). This suite adds what is still unwalked on that admin surface: the **verification toggle** (also audit H5, ABSENT as a UI write) and the **admin edit form**'s identity and contact fields (legal entity name, domain, contact email), which the organisation's own settings do not edit. Product source read at client-web `origin/develop` @ `f33325b2b`.

## How to run
```bash
cd client-web && pnpm run test:nightly --project="Admin organisations"   # tier extended, ~35 s
```
- The organisation is self-seeded **unverified** (`createBaseScenarioOrganization` without the verification option). Only the platform admin acts on it. The two cases are independent.

## Risk
| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |
|---|---|---|---|---|---|
| R1 | The admin verifies an organisation, but the status is not stored (or cannot be reset) | Medium (lifecycle machine rewritten) | Medium (the verified badge is a trust signal) | Medium | L2-1 |
| R2 | An admin edit of name, legal entity, domain or contact email is lost, or renames the alias | Medium | Medium | Medium | L2-2 |
| R3 | The admin list still finds the organisation under its old name | Low | Low | Low | L2-2 |

## Existing coverage before this work
- `contributors-crud/organization-crud.spec.ts` 2.1 (admin create + delete), 2.2 (org admin name/tagline/website), `user-crud.spec.ts` 1.7 (admin delete, associate's view). **Reused, not repeated**; the list-row and delete helpers come from `contributors-crud.helpers.ts`.
- `platform-roles/admin-sections-per-role.spec.ts` covers who sees the Organisations section (manual runner). Not repeated.
- Verification: the factory verifies over the lib (`applyOrganizationVerificationSequence`); no UI write.

## Scenario → test mapping
| ID | Scenario | Technique | Oracle | Automated by | Layer |
|---|---|---|---|---|---|
| L2-1 | Toggle verification on, then off | ST | read-back NOT_VERIFIED first and the row says "Not verified"; after the toggle `eventOnOrganizationVerification` answered, read-back VERIFIED_MANUAL_ATTESTATION and the reloaded row says "Verified" (and not "Not verified"); after the second toggle NOT_VERIFIED and "Not verified" again | `us1-verify-and-edit.spec.ts` › L2-1 … | UI + lib |
| L2-2 | Edit display name, legal entity name, domain, contact email on `/admin/organizations/<id>/edit` | UC, NC | empty fields read back first; `updateOrganization` answered; back on the list; `readOrganization`: exact four values and the alias unchanged; search finds the new name (1 row) and the old name nothing ("Showing 0 of 0"); the reopened form holds the four values | `us1-verify-and-edit.spec.ts` › L2-2 … | UI + lib |
| — | Admin creates / deletes an organisation | — | — | `contributors-crud` 2.1, 1.7 | covered |
| — | Org admin edits name, tagline, website | — | — | `contributors-crud` 2.2 | covered |

## Not covered — known gaps
| Scenario | Why | Where |
|---|---|---|
| Assign / revoke a licence plan from the organisations list | Licence management is L7 (lib only today) | follow-up |
| The verified badge on the organisation's public profile | Rendering of a stored state; the read-back is the oracle | follow-up |
| Non-admin refused on `/admin/organizations` | Authorization, covered by platform-roles (manual runner) | platform-roles |

## Build notes (2026-11-12, local stack)
- **Red-proof:** L2-1 with a lib RESET right after the first toggle → red at the VERIFIED read-back poll (restored).
- The toggle first sends `VERIFICATION_REQUEST` (errors swallowed by the client) and then `MANUALLY_VERIFY`; on the local stack the first one answers cleanly, which the mutation wait relies on.
