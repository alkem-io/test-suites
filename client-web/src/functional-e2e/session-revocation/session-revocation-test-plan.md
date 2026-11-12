# Test plan — session revocation when an account is deleted (A7, server#6315)

> **Status:** Built 2026-11-12 for W2 Tier 0 item 2, not yet run against test-alkem.io · **Depth:** standard (an authentication/session gate, data-destructive; the 11 scenarios are inherited, only the oracles changed) · **Source:** the story plan `docs/qa/6315-session-revocation-test-plan.md` § 2.2 (Stream B, scenarios SRB-*), `docs/qa/server-rebuild/client-net-audit/README.md` § 4 item 2 and `g1-identity.md` (verdict NOT-A-NET: strong design, unregistered, server-internal oracles)

When an account is deleted, every browser session it holds must stop working on the very next request, loudly (refused, not quietly turned into an anonymous visitor), and nobody else's session may be touched. The story plan specified this against the server's internals: a Kratos-side `error_code`, the `alkemio_session` cookie by name and wire format, the anonymous actor's `me-` id and the BFF's `id-token-hint` route. None of that survives the server rebuild, and the `id-token-hint` route is served on the identity subdomain, not the app origin. This plan keeps the 11 scenarios and their intent and re-states every oracle as a GraphQL outcome read through `@alkemio/tests-lib` or as what the user sees.

## How to run
```bash
cd client-web && pnpm exec playwright test src/functional-e2e/session-revocation/
pnpm run test:nightly --project="Session revocation"          # tier extended, capture off
```
- Disposable identities only: public Kratos registration, verification mail read by recipient (lib readers, never a mail API directly). No Kratos admin API, no DB, no Redis.
- Both files are serial: the cascade shares one subject across a one-way door; blast radius shares one fixture of three subjects.
- The cascade keeps the subject's Kratos identity (SRB-E2 signs in again), so its teardown deletes whatever user that email signs in as afterwards, together with the identity, and fails loudly if it cannot.

## The credential and the oracle
- **Credential** = the browser context's cookie jar snapshotted as a lib actor (`credentialOf` → `sessionActor`). A snapshot taken before the deletion and replayed afterwards is the stale session, whatever the server names its cookies. The lib sends it on its own client, so probing never changes the browser's jar.
- **Oracle** = `readMyUserRaw` (`me { id user { id } }` on the session endpoint):
  - *resolves to U*: 200, no errors, `me.user.id === U`.
  - *refused*: 401, at least one GraphQL error, `me` not resolved. The client branches on `extensions.code` `UNAUTHENTICATED` (asserted once, SRB-G2); the server's own reason string is not.
  - *not U*: refused, or anonymous (200, no errors, no user). Used only where the story plan allowed both.

## Risk
| # | Risk (in user terms) | L | I | Level | Drives |
|---|---|---|---|---|---|
| R1 | A deleted user's open browser keeps working (stolen laptop, shared PC) | M | H | **high** | SRB-G1, SRB-E1 |
| R2 | The ended session is silently served as an anonymous visitor instead of refused, so the client never sends the user to sign in (the server#6315 bug) | M | H | **high** | SRB-R1, SRB-R2, SRB-G2 |
| R3 | Deleting one account signs other people out | L | H | medium | SRB-E3 |
| R4 | The app shows a half-signed-in state after the account is gone | M | M | medium | SRB-G3 |
| R5 | Revocation becomes a ban: the same email can never sign in again | L | M | medium | SRB-E2 |
| R6 | Token material or the deleted user's PII is echoed on the wire | L | H | medium | SRB-N1 |
| R7 | The session boundary tells an attacker whether a session id ever existed | L | M | low | SRB-N2 |
| R8 | Deleting a user whose session already ended errors | L | M | low | SRB-E4 |

## Scenario → test mapping
| ID | Scenario | Oracle (was → now) | Automated by |
|---|---|---|---|
| SRB-G1 | Deleting the account revokes the live session on the next request, no polling | `id-token-hint` 200 → 401 `{"error":"unauthenticated"}` → **C1 resolves to the subject before; refused on the first request after** | `session-revocation-cascade.spec.ts` › SRB-G1 |
| SRB-G2 | The GraphQL gate refuses with an authentication error | 401 + `error_code ∈ {account_deleted, subject_revoked}` → **refused + `extensions.code` UNAUTHENTICATED** | `session-revocation-cascade.spec.ts` › SRB-G2 |
| SRB-R1 | The session does not come back on repeated use | `id-token-hint` ×3, 2 s `waitForTimeout` apart → **refused ×3, no wait** | `session-revocation-cascade.spec.ts` › SRB-R1 |
| SRB-R2 | Never served as an anonymous visitor | `me.id !== 'me-'` (vacuous on a 401) → **not the anonymous answer, with a positive control: the same read with no credential IS anonymous (200, `me` resolved, no user)** | `session-revocation-cascade.spec.ts` › SRB-R2 |
| SRB-E1 | Three concurrent sessions, all die | `id-token-hint` per context → **each resolved to the subject before, each refused after** | `session-revocation-cascade.spec.ts` › SRB-E1 |
| SRB-G3a | SPA reload after the deletion | The reload's API traffic is captured for SRB-N1, and the browser's own credential after the reload is not the subject | `session-revocation-cascade.spec.ts` › SRB-G3a |
| SRB-G3 | Clean signed-out state in the app | "Log in" visible, then the signed-in-only Notifications control absent (positive first, so a blank page cannot pass) | `session-revocation-cascade.spec.ts` › SRB-G3, **`test.skip`**: reproduced defect on test-suites#724 — the revoked cookie gets 401 `account_deleted` on the public `platform` query and the client renders a blank page |
| SRB-N1 | No token material or PII on the wire | markers incl. server key names; `length > 0` → **generic token names, the subject's email and first name, over ≥ 10 captured bodies including the SPA reload** | `session-revocation-cascade.spec.ts` › SRB-N1 |
| SRB-E2 | A session created after the revocation is not refused | `id-token-hint` 200 → **200, no errors, and not the deleted user** | `session-revocation-cascade.spec.ts` › SRB-E2 |
| SRB-E3 | Blast radius: an unrelated user is untouched | conditional `me-` branch → **victim refused; bystander still resolves to itself over the API and its browser still shows the signed-in banner after a reload** | `session-revocation-blast-radius.spec.ts` › SRB-E3 |
| SRB-E4 | Deleting an already-signed-out user is a clean no-op | UI sign-out with a silent fallback to `/api/auth/oidc/logout` → **UI sign-out only (A3), then: not the user before and after the deletion, no 5xx** | `session-revocation-blast-radius.spec.ts` › SRB-E4 |
| SRB-N2 | No existence oracle at the session boundary | fabricated `alkemio_session=s%3A…` vs none, `me-` → **the HttpOnly cookies of a real signed-in context (positive control: they resolve to that user) forged with random values vs no cookie: byte-identical anonymous answer** | `session-revocation-blast-radius.spec.ts` › SRB-N2 |

### Regression guards
- **SRB-G1/E1/R1:** `deleteUser` stops revoking (or revokes only the newest session).
- **SRB-R2/G2:** a `destroy()` instead of a tombstone: the stale credential becomes an anonymous 200.
- **SRB-E3:** a keyspace-wide sweep instead of the per-subject index.
- **SRB-E2:** the revocation marker compared as a flag, not a timestamp.

## Not covered — known gaps
| Scenario | Why not automated | Where it belongs |
|---|---|---|
| The exact refusal reason (`account_deleted` vs `subject_revoked`) and the audit trail of the revocation | Server internals with no client contract | server unit/it-specs (Stream A, `server-api`) |
| Revocation latency as a wall-clock number | "The first request after the mutation is refused" is stronger and deterministic | — |
| A self-service deletion's revocation | Covered by the account-deletion walks (`account-deletion/us1` AS3: the browser lands signed out) | account-deletion |

## Build notes
- Live run on the local develop stack 2026-11-12 (server e120d25a1, client-web 25ded1467): (1) the client does **not** re-sign C1 in — it renders a blank page (SRB-G3 defect above); (2) SRB-N2's HttpOnly precondition held locally. test-alkem.io confirmation still pending.
