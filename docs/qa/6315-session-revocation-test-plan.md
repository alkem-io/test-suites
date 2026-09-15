# Test plan — OIDC/BFF session revocation cascade (server#6315)

**Feature under test**: [alkem-io/server#6324](https://github.com/alkem-io/server/pull/6324) — story [server#6315](https://github.com/alkem-io/server/issues/6315)
**SDD spec**: `server/specs/107-oidc-session-revocation/` (spec.md, `contracts/{session-revocation-service,redis-keyspace,audit-events,graphql-me-degradation}.md`)
**Design input**: `agents-hq/docs/oidc-session-revocation-handover.md`
**Test branch**: `test/6315-session-revocation` (worktree `test-suites-6315-session-revocation`)
**Author**: QA strategy pass, 2026-07-31
**Status**: scenario specification + work partition. No test code written yet.

---

## 0. How to run this, and what must be up

### Services

Both streams require a **full local stack**, not a partial one. This feature lives
in the session/cookie layer, so the usual "server + Postgres" subset is not enough.

| Service | Needed by | Why |
|---|---|---|
| Postgres | A, B | user rows |
| **Redis** | A, B | the session store, the `alkemio:sub:*` index and the `alkemio:subrevoked:*` marker. Nothing under test works without it. |
| RabbitMQ | A, B | server boot |
| **Kratos** (public + self-service) | A, B | disposable identity provisioning and the real login form |
| **Hydra / `oidc-service`** | **B only** | the authorization-code flow that mints an `alkemio_session`. Stream A never touches it. |
| **client-web SPA** behind Traefik on `http://localhost:3000` | **B only** | Playwright drives the real login form |
| MailSlurper (`:4437`) | A, B | Kratos email verification of the disposable users both streams create |
| Alkemio server | A, B | with `ENABLE_NON_INTERACTIVE_LOGIN=true`, `NON_INTERACTIVE_LOGIN_SIGNING_KEY=<32+ bytes>`, non-production `NODE_ENV` — otherwise every token mint returns HTTP 404 (`lib/src/scenario/registration/get-user-token.ts`) |

The server must be running the **PR#6324 build**, i.e. the
`story/6315-oidc-session-revocation-cascade` branch, not `develop`. Several
scenarios below (`SRA-G1`–`SRA-G4` in particular) are **expected to fail on
`develop`** — that is their point.

### Setup

```bash
cd /home/svetoslav/Documents/alkemio/test-suites-6315-session-revocation
pnpm install
pnpm --filter @alkemio/tests-lib run build

cp server-api/.env.default server-api/.env     # then fill AUTH_TEST_HARNESS_PASSWORD
cp client-web/.env.default client-web/.env     # then fill AUTH_TEST_HARNESS_PASSWORD
pnpm --filter @alkemio/test-suite-client-web exec playwright install   # stream B only, once
```

### Stream A — server-api (Vitest)

```bash
# one file at a time (fastest inner loop)
cd server-api
pnpm exec vitest run src/functional-api/graphql-guard/me-degradation-anonymous.it-spec.ts
pnpm exec vitest run src/functional-api/contributor-management/user/deleted-user-session-orphan.it-spec.ts

# by project (both spec files land inside existing projects — see §4.4)
pnpm exec vitest run --project graphql-guard --fileParallelism=false
pnpm exec vitest run --project contributor-management --fileParallelism=false

# lint gate
cd .. && pnpm --filter @alkemio/test-suite-server-api run lint
```

### Stream B — client-web (Playwright)

```bash
cd client-web
pnpm exec playwright test src/functional-e2e/session-revocation/
pnpm exec playwright test src/functional-e2e/session-revocation/session-revocation-cascade.spec.ts --headed   # debugging

cd .. && pnpm --filter @alkemio/test-suite-client-web run lint
```

---

## 1. Testability assessment — read this before writing a line of code

I read the harness rather than assuming it. The short version: **the majority of
this feature is not observable from `test-suites`, and the two halves that *are*
observable live in two different packages using two different auth mechanisms.**

### 1.1 The decisive fact: the server-api harness does not use the session cookie

`server-api` authenticates with an **HS256 bearer JWT** minted by
`POST {ALKEMIO_BASE_URL}/api/auth/non-interactive-login`
(`lib/src/scenario/registration/get-user-token.ts`), sent as
`Authorization: Bearer …` to
`http://localhost:3000/api/private/non-interactive/graphql`
(`lib/src/utils/graphql.request.ts`, `lib/src/utils/graphql.wrapper.ts`,
`lib/src/config/create-config-using-envvars.ts`). There is no cookie jar
anywhere in `lib/`, `server-api/` or the generated SDK.

That bearer is validated by `NonInteractiveLoginStrategy`
(`server/src/core/auth/non-interactive-login/non-interactive-login.strategy.ts`).
I grepped the whole server tree: **`getSubRevokedAt` has exactly one caller,
`CookieSessionStrategy`** (`server/src/core/auth/oidc/strategies/cookie-session.strategy.ts:229`).
Neither `NonInteractiveLoginStrategy`, nor `HydraBearerStrategy`, nor the MCP
strategies read the revocation marker.

**Therefore: no `server-api` Vitest suite can ever observe the revocation
control.** Not with more effort, not with a cleverer helper — the code path it
exercises does not contain the check. Any scenario asserting "deleted user's
request is now 401" written in `server-api` would be asserting a behaviour the
server does not implement on that path, and would fail forever.

> **Finding worth filing separately (not a defect in this PR).** A deleted user's
> already-issued **Hydra** access token also keeps authenticating until its own
> expiry, degrading to HTTP 200 anonymous — which is exactly the silent
> anonymous fall-through §1 of the handover argues against. The cascade covers
> the cookie path only. Out of scope for #6315; recommend an issue.

### 1.2 What the server-api harness *can* observe

Two things, both real and both valuable:

1. **`me` graceful degradation for an anonymous caller.** The
   `graphql-me-degradation.md` contract says it outright: `createAnonymous()`
   sets `actorID = ''`, so *every* one of the seven guards fires for **any
   anonymous visitor today**. `me { notificationsUnreadCount }` from a
   no-Authorization-header request is an error response on `develop` and a `0`
   on the PR build. The `graphql-guard` suite already issues unauthenticated
   requests exactly this way
   (`graphqlErrorWrapper(callback)` with no role —
   `graphql-guard-authorization.it-spec.ts`, "Anonymous user access"). Fully
   observable, cheap, deterministic.
2. **The orphaned-actor state itself, over the bearer path.** Mint a disposable
   user's token, delete the user, replay the token: the JWT still verifies, but
   `AuthenticationService.createActorContext` cannot load the actor and returns
   `createAnonymous()` (`server/src/core/authentication/authentication.service.ts:80-89`).
   The request therefore reaches the `me` resolvers with `actorID === ''` — the
   **exact** state User Story 2 exists for, reachable end-to-end with the tools
   the harness already has. This is the closest legitimate reproduction of the
   orphaned session available in `server-api`, and it is the honest one: it
   tests the degradation, not the revocation.

### 1.3 The cookie path *is* observable — but only from Playwright

`client-web/src/functional-e2e/fixtures/authenticated-session.fixture.ts` drives
the real SPA login form (`helpers/login.helper.ts`) and persists
`context.storageState()`. That storage state contains the real
`alkemio_session` and `ory_kratos_session` cookies. A Playwright
`BrowserContext` therefore **does** hold a genuine BFF session, and
`context.request` / `page.request` share its cookie jar.

Which means these are all observable from `client-web`:

| Question | Observable? | How |
|---|---|---|
| Can a suite hold a real `alkemio_session`? | **Yes** | `BrowserContext` after `loginViaCrd` / `ensurePersonaState` |
| Can it drive `/api/auth/oidc/id-token-hint`? | **Yes** | `context.request.get(baseUrl + '/api/auth/oidc/id-token-hint')`. Route confirmed: `@Controller('api/auth/oidc')` + `@Get('id-token-hint')`, `oidc.controller.ts:619`. Returns `200 {id_token}` or `401 {"error":"unauthenticated"}` |
| Can it assert 401 vs anonymous 200 on GraphQL? | **Yes** | `POST {base}/api/private/graphql`. `AuthInterceptor` maps `CookieSessionInvalidError` to `AuthenticationException` which sets `extensions.http.status = 401`, so Apollo emits **wire-level HTTP 401** plus `extensions.code: "UNAUTHENTICATED"` and `extensions.error_code` (`auth.interceptor.ts:59-90`). The distinction the whole feature turns on is directly assertable. |
| Can it create/delete a disposable user? | **Yes** | `registerInKratosOrFail` + `verifyInKratosOrFail` from `@alkemio/tests-lib` (a `workspace:*` dep of `client-web`), then a `deleteUser` mutation with the global-admin bearer from `getUserToken('admin@alkem.io')` over `axios` (a direct `client-web` dep). |
| Can it read Redis? | **No** — see below |
| Can it read the audit stream? | **No** — see below |

Expected `error_code` on the 401: `'account_deleted'` for a session the index
knew about (the tombstone branch at `cookie-session.strategy.ts:102` runs before
the marker branch at `:140`), or `'subject_revoked'` if the tombstone was
overwritten by an in-flight request. **Assert the set `{account_deleted,
subject_revoked}`, not one literal** — pinning one value makes the spec flake on
the very race the marker exists to cover.

### 1.4 What is genuinely NOT observable, by category

Each of these is excluded from the plan. They are not "hard"; they are
**impossible with this harness**, and pretending otherwise would produce a suite
that never goes green.

| Category | Why not | Where it *is* covered |
|---|---|---|
| **Redis keyspace** — index membership, the TTL roll, invariants I1–I6, tombstone contents, `request_context_cache: null` (SC-003), refresh-lock cleanup (FR-011) | The harness has **zero** Redis capability. I grepped `lib/`, `server-api/`, `client-web/` and the root `package.json` for `redis`/`ioredis`: no dependency, no client, no endpoint in `AlkemioTestConfig`, no env var. Adding one would mean giving the test runner direct access to the production-shaped session store — a change to the harness's security posture, not a test. | `server/src/core/auth/oidc/session-index.redis.spec.ts` (423 lines) |
| **Audit events** — FR-018–FR-022, SC-005, and the full form of SC-006 | `emitAudit` writes newline-delimited JSON to the **server process stdout** (`audit-events.md`). The harness is an HTTP client with no log sink, no container access, no APM query. | `oidc-session-revocation.service.spec.ts`, `revocation-ends-access.spec.ts` |
| **Fault injection** — SC-004 (deletion survives total revocation failure), FR-013 (remote leg fails, local stands), FR-012a (3 s timeout, no retry, no breaker), "metadata not discovered" | Requires breaking Redis or Hydra mid-test from inside the runner. No such control exists. | `user.service.delete.spec.ts`, `oidc-session-revocation.service.spec.ts` |
| **`exceptSid` / partial-failure report / per-session outcomes** — FR-008, FR-014, US3, SC-011 | **This change wires no caller for them.** There is no mutation, no REST route, no message. Nothing to drive from outside the process. | `oidc-session-revocation.service.spec.ts` (C7, C8) |
| **Pre-index session self-heal** — SC-011a, FR-002a | Needs a session minted by a build *without* the index, then upgraded underneath it. Not reproducible against one deployed build. | `cookie-session.strategy.index.spec.ts` |
| **"Zero measurable latency"** — SC-011b | A deliberately unawaited fire-and-forget write. There is no signal to observe, and a wall-clock assertion would be pure flake. | `cookie-session.strategy.index.spec.ts` |
| **Post-commit ordering / rollback** — FR-026, US1-AS8 | Requires forcing the deletion transaction to roll back. | `user.service.delete.spec.ts` |
| **Kratos SSO invalidation** — FR-024, US1-AS4 | Asserting the Kratos session is gone needs the Kratos **admin** API. `KRATOS_ADMIN_URL` is empty locally and only set on CI via an in-cluster port-forward (`create-config-using-envvars.ts`). Worse, post-#6288 the Kratos session gates nothing observable on the API path, so even a successful assertion would prove nothing about access. | `user.service.delete.spec.ts` |
| **Schema stability** — SC-010 | A server-repo exit gate (`pnpm schema:diff`). | server repo CI |
| **Degradation log lines** — FR-030 | Server stdout. Not reachable. *(See §5 — the implementation also diverges from the contract here.)* | `me.resolver.fields.spec.ts` |

### 1.5 Honest bottom line

> **Roughly a third of this feature is E2E-testable, and the third that is
> matters most.** The audit-evidence chain an ISO 27001 / SOC 2 auditor asks
> for — *"deletion event → audit record → proof the session was terminated →
> proof the next request was rejected"* — has **four** links, and this harness
> can prove exactly one of them: **the last one**, which the `audit-events.md`
> contract itself calls out as *"the one that is usually missing, and… the one
> that is actually load-bearing."*
>
> That is a good trade. Twenty-four scenarios below, all of them executable.
> Nothing aspirational.

---

## 2. Scenarios

Every scenario is one file's worth of a `test()`, uses only capabilities verified
in §1, and traces to a requirement. Groups: **G** green · **R** red · **E** edge ·
**N** negative/abuse. Prefix `SRA-` = Stream A (server-api), `SRB-` = Stream B
(client-web).

### 2.1 Stream A — `me` degradation and the orphaned actor (server-api, Vitest)

Shared precondition for all SRA scenarios: the standard global setup has run
(`globalTestsSetup.ts` → identities provisioned, `verifyEnvPrerequisites` green).

#### Green

**SRA-G1 — Anonymous `me` degrades across all seven guards instead of erroring**
- *Preconditions*: none beyond global setup.
- *Steps*: issue one composite query with **no** `Authorization` header:
  ```graphql
  query { me { id
               notificationsUnreadCount
               communityInvitationsCount
               communityInvitations(states: []) { id }
               communityApplications(states: []) { id }
               notifications { total inAppNotifications { id } pageInfo { hasNextPage } }
               conversations { conversations { id } } } }
  ```
- *Expected*: HTTP 200. `body.errors` is **absent** (not "empty" — absent).
  `me.notificationsUnreadCount === 0`, `me.communityInvitationsCount === 0`,
  `me.communityInvitations` and `me.communityApplications` are `[]`,
  `me.notifications.total === 0`, `me.conversations.conversations` is `[]`,
  `me.id === "me-"`.
- *Traces*: FR-029, FR-031, SC-008, US2-AS1/AS2/AS3; `graphql-me-degradation.md` "Acceptance".
- *Note*: **fails on `develop`** with `ValidationException`/`ForbiddenException`. That is the regression fence.

**SRA-G2 — Degraded paginated field returns the contract's exact empty page**
- *Steps*: anonymous request for
  `me { notifications { total inAppNotifications { id } pageInfo { hasNextPage hasPreviousPage startCursor endCursor } } }`.
- *Expected*: no errors; `total === 0`; `inAppNotifications === []`;
  `hasNextPage === false`; `hasPreviousPage === false`; `startCursor` and
  `endCursor` are `null`/absent.
- *Traces*: FR-029a, clarification pass 1 Q5, `graphql-me-degradation.md` "Empty page shape".
- *Note*: guard 1 threw `ForbiddenException`, a different type from the other six. It is the guard an exception-type sweep would miss — assert it explicitly.

**SRA-G3 — The nested conversations resolver degrades, not just its container**
- *Steps*: anonymous `me { conversations { conversations { id } } }`.
- *Expected*: no errors; `conversations.conversations === []`.
- *Traces*: guard 7, `graphql-me-degradation.md` ("Guard 7 is the one that matters most" — relaxing the container alone leaves the real thrower in `me.conversations.resolver.fields.ts` intact and a shallow test passes while the client query still fails).

**SRA-G4 — Authenticated behaviour is unchanged**
- *Preconditions*: `TestUser.SPACE_MEMBER` (from the standard fixtures).
- *Steps*: the SRA-G1 composite query, authenticated as `SPACE_MEMBER`.
- *Expected*: no errors; `me.user.id` is a non-empty UUID; `me.id === "me-" + actorID` and is **not** `"me-"`; counts and lists are the caller's real values (assert types/shape, not magic numbers, so the spec does not couple to fixture data).
- *Traces*: FR-031, SC-010, US2-AS5; `graphql-me-degradation.md` "Behaviour for authenticated callers".

**SRA-G5 — An orphaned actor (deleted user, live token) degrades identically**
- *Preconditions*: a disposable verified user created via the existing
  `registerVerifiedUser(email, first, last)` helper
  (`server-api/src/functional-api/contributor-management/user/user.request.params.ts`),
  with its bearer minted by `getUserToken(email)` **before** deletion.
- *Steps*: (1) sanity-check the token resolves `me.user.id`; (2) delete the user as `GLOBAL_ADMIN`; (3) replay **the same token** on the SRA-G1 composite query.
- *Expected*: HTTP 200, no errors, every field degraded exactly as in SRA-G1, `me.user === null`, `me.id === "me-"`.
- *Traces*: SC-008, US2 Independent Test; the "orphaned session" state of the User Story 2 narrative.
- *Note*: this is the reachable analogue of the orphaned session — the JWT still verifies, the actor row is gone, `createActorContext` falls back to anonymous. It tests the **degradation**, and only the degradation. It deliberately does **not** claim to test revocation (§1.1).

#### Red

**SRA-R1 — No `BAD_USER_INPUT` / `FORBIDDEN` from the anonymous `me`**
- *Steps*: SRA-G1's request; inspect the raw response body.
- *Expected*: `body.errors` is `undefined`. Additionally assert that the serialised body contains none of `BAD_USER_INPUT`, `FORBIDDEN`, `Unable to retrieve`, `no userID provided` — the literal strings the old exceptions carried.
- *Traces*: SC-008, US2 acceptance; handover §2.6.

**SRA-R2 — Same for the orphaned-token request**
- *Steps*: SRA-G5 step 3; same assertions as SRA-R1.
- *Traces*: SC-008.

**SRA-R3 — A second user is untouched by the first user's deletion (blast radius)**
- *Preconditions*: **two** disposable verified users, tokens for both minted up front.
- *Steps*: delete user 1 as `GLOBAL_ADMIN`; then issue `me { user { id nameID } }` with user 2's token.
- *Expected*: user 2 still resolves a full `me.user` with their own id; no errors; no degradation.
- *Traces*: FR-005 (blast radius is exactly one account), SC-007, spec edge case "a person is deleted while another person's request is in flight".

#### Edge

**SRA-E1 — A user with no identity reference deletes cleanly, revocation skipped**
- *Preconditions*: a user created via the `createUser` **mutation** (existing `createUser` helper) — this creates an Alkemio user row with **no** Kratos identity, therefore `authenticationID = NULL`.
- *Steps*: delete it as `GLOBAL_ADMIN`.
- *Expected*: `deleteUser.id` equals the created id; `errors` absent; no internal/auth error of any kind.
- *Traces*: FR-017, FR-028, US1-AS6, `session-revocation-service.md` C1, trap 8.
- *Note*: this is the documented residual gap in the negative — it proves the `if (user.authenticationID)` guard does not throw on the NULL branch.

**SRA-E2 — Repeated deletion is an ordinary not-found, never a revocation error**
- *Steps*: create a disposable verified user; delete; delete again.
- *Expected*: the second call returns exactly `Unable to find user with given ID: <id>` (the existing `delete-user.it-spec.ts` contract). Assert the message does **not** mention revocation, Redis, session or token — i.e. the new code path did not leak a new failure mode into an idempotent retry.
- *Traces*: FR-015, SC-009 (partial — the "zero additional state changes" half is unobservable), US1-AS7.

**SRA-E3 — Deletion with `deleteIdentity: false` still succeeds**
- *Steps*: create a disposable verified user; delete with `deleteData: { ID, deleteIdentity: false }`.
- *Expected*: `deleteUser.id` equals the id; no errors.
- *Traces*: FR-025 (the cascade is unconditional — it must not be able to fail the mutation on the branch where the identity survives), FR-027, US1-AS4.
- *Note*: the shared `deleteUser` helper **hardcodes `deleteIdentity: true`**. This scenario needs the stream's own variant (§4.1).

#### Negative / abuse

**SRA-N1 — No token material on the deletion response surface**
- *Steps*: capture the full `deleteUser` mutation response for a disposable verified user and `JSON.stringify` it.
- *Expected*: the serialised body contains none of `access_token`, `id_token`, `refresh_token`, `Bearer `, `alkemio_session`, `terminated_at`, `alkemio:sid:`, `alkemio:sub:`.
- *Traces*: FR-021, SC-006 (**response-surface slice only** — the audit/log half is unobservable, §1.4), `session-revocation-service.md` C10.

**SRA-N2 — No existence oracle across bearer classes**
- *Steps*: issue `me { id notificationsUnreadCount }` three ways — (a) a random non-JWT garbage bearer, (b) a syntactically well-formed but unknown/unsigned HS256 bearer, (c) the valid-but-orphaned token of the SRA-G5 deleted user.
- *Expected*: all three produce **identical** HTTP status and identical response bodies (200, degraded, no errors). No field, code or message lets a caller distinguish "this token never existed" from "this token belonged to a deleted account".
- *Traces*: handover §5.6.7 (uniform response shape, no existence oracle); `NonInteractiveLoginStrategy` returns `null` on every invalid-token branch by design.

*(Stream A total: 5 green, 3 red, 3 edge, 2 negative = **13**.)*

---

### 2.2 Stream B — the revocation cascade over the real session cookie (client-web, Playwright)

Shared precondition for all SRB scenarios: a **disposable** verified Kratos
identity, provisioned in-spec (never a shared persona — these tests delete their
subject). Log it in through the real SPA form so a genuine `alkemio_session` is
minted by the OIDC callback and indexed at `oidc.controller.ts:~370`.

> **Do not reuse `TestUserManager` personas for anything deleted.** Deleting
> `space.member@alkem.io` would poison every other suite in the monorepo.

#### Green

**SRB-G1 — Deleting the account revokes the live BFF session on the next request**
- *Preconditions*: disposable user logged in in browser context C1; `GET {base}/api/auth/oidc/id-token-hint` from C1 → **200** with an `id_token` (the pre-condition assertion — prove the session was real before claiming it died).
- *Steps*: delete the user as global admin over GraphQL (out of band, `deleteIdentity: false`); immediately, with **no polling and no retry**, re-issue `id-token-hint` from C1.
- *Expected*: **HTTP 401**, body exactly `{"error":"unauthenticated"}`.
- *Traces*: SC-001, SC-002, FR-009, FR-023; ISO/IEC 27001 A.5.18 + A.5.16, SOC 2 CC6.2, GDPR Art. 17.
- *Note*: "no polling" **is** the SC-002 assertion. A wall-clock threshold would be a flake generator; "the first request after the mutation resolves is already refused" is the stronger and deterministic property, and it is what FR-026a's awaited-in-line design guarantees.

**SRB-G2 — The GraphQL gate refuses too, with the right code**
- *Steps*: from C1 after the deletion, `POST {base}/api/private/graphql` with `{ me { id } }`.
- *Expected*: **wire-level HTTP 401**; `errors[0].extensions.code === 'UNAUTHENTICATED'`; `errors[0].extensions.error_code ∈ { 'account_deleted', 'subject_revoked' }`.
- *Traces*: FR-009, `audit-events.md` "the trace an auditor asks for" — the *proof the next request was rejected* link.
- *Note*: accept the **set**, not one literal (§1.3).

**SRB-G3 — The application renders a clean signed-out state**
- *Steps*: reload the SPA in C1 (`page.goto(baseUrl)`) after the deletion.
- *Expected*: the unauthenticated shell — the header "Log in" link is visible; no authenticated-user affordance is rendered. No "signed in with no account" half-state.
- *Traces*: User Story 1 narrative; handover §1 ("a 401 deterministically flips client-web to logged-out"); A-09.
- *Note*: assert on the same `Log in` link locator `helpers/login.helper.ts` already uses, so a CRD markup change breaks one shared expectation rather than two.

#### Red

**SRB-R1 — The session must not survive, and must not silently fall through**
- *Steps*: after the deletion, call `id-token-hint` from C1 three times, spaced ~2 s.
- *Expected*: **401 every time**. Explicitly assert `status !== 200` — the failure mode being fenced is `destroy()` instead of `markTerminated()`, which yields a silent anonymous 200 and reproduces #6315 in a new costume.
- *Traces*: A-03, FR-009, `session-revocation-service.md` C3 ("the single most important assertion in the feature"), trap 1.

**SRB-R2 — No anonymous 200 on the GraphQL path either**
- *Steps*: same request as SRB-G2.
- *Expected*: status is 401 and the body carries an `errors` array. Assert it is **not** a 200 with `data.me.id === "me-"` — which is precisely what a `destroy()`-based implementation would return, and what would make this feature look fixed while being broken.
- *Traces*: A-03, FR-009, trap 1.

#### Edge

**SRB-E1 — Three concurrent sessions, all die**
- *Preconditions*: the same disposable user logged in in **three independent** browser contexts C1/C2/C3 (three separate `browser.newContext()` + real logins, so three distinct sids all indexed under one `sub`).
- *Steps*: verify all three read 200 on `id-token-hint`; delete the user once; re-issue from all three.
- *Expected*: all three → 401. None survives.
- *Traces*: US1-AS2, FR-023, SC-001 ("100% of that account's sessions").

**SRB-E2 — A session created *after* the revocation still works**
- *Preconditions*: the disposable user was deleted with **`deleteIdentity: false`**, so the Kratos identity survives.
- *Steps*: in a **fresh** context C4, log in again through the SPA as the same email; call `id-token-hint`.
- *Expected*: **200**. The subject marker holds a `revoked_at` timestamp, not a ban; a session whose `created_at` is later is unaffected.
- *Traces*: FR-009a, `redis-keyspace.md` "Why a timestamp and not a flag"; the spec edge case "a session established before this capability shipped" read in the negative.
- *Risk*: **highest-risk scenario in the plan.** `deleteUser` also runs `clearIdentityActorMetadata`, so the re-minted session carries `alkemio_actor_id: null` — the login succeeds and the session is valid, but it resolves to no actor. The assertion is therefore **"the request is not refused"** (200 on `id-token-hint`), *not* "the user is fully signed in". Do not assert on `me.user`. If the re-login itself cannot complete in this environment, drop the scenario and record why — do not weaken it into something that passes vacuously.

**SRB-E3 — Blast radius: a second, unrelated user is untouched**
- *Preconditions*: a **second** disposable user logged in in context CX, in parallel with the first.
- *Steps*: delete user 1; from CX call `id-token-hint` and `POST /api/private/graphql` with `{ me { user { id } } }`.
- *Expected*: 200 on both; `me.user.id` still resolves. CX is not disturbed in any way.
- *Traces*: FR-005, SC-007, spec edge case "a person is deleted while another person's request is in flight"; handover §5.6.3 (bounded blast radius, never a keyspace scan).

**SRB-E4 — An already-signed-out session: deletion is still a clean no-op**
- *Steps*: in context C5, log the disposable user in, then sign out through the SPA (so the sid is `destroy()`d and pruned from the index); then delete the user.
- *Expected*: the deletion mutation succeeds and returns the id; C5 continues to read 401/anonymous; no error surfaces from the mutation.
- *Traces*: FR-015, spec edge cases "the per-account listing contains a session that no longer exists" (→ `already_absent`, no tombstone) and "an account whose sessions all expired already".
- *Risk*: depends on the SPA logout affordance being stable. If the logout control cannot be driven reliably, substitute `context.request.get(base + '/api/auth/oidc/logout')` — the route exists (`oidc.controller.ts:635`) and its idempotent branch is documented. If neither works, drop it: it is the lowest-value scenario here.

#### Negative / abuse

**SRB-N1 — No token material anywhere on the wire after revocation**
- *Steps*: capture the bodies of every response C1 receives from the deletion onward (`id-token-hint` 401, the GraphQL 401 envelope, the SPA reload's API calls).
- *Expected*: none contains `id_token`, `access_token`, `refresh_token`, the `alkemio_session` cookie value, or the disposable user's display name / email. The `id-token-hint` 401 body is exactly `{"error":"unauthenticated"}`; the GraphQL 401 envelope carries a code and an `error_code` and nothing else identifying.
- *Traces*: FR-021, SC-006 (wire slice), `session-revocation-service.md` C10; GDPR Art. 17 — the PII half of the tombstone rationale, asserted where it is observable.

**SRB-N2 — No existence oracle at the cookie boundary**
- *Steps*: from a **clean** context, `POST {base}/api/private/graphql` with `{ me { id } }` — (a) with no cookies at all, and (b) with a fabricated `alkemio_session` cookie holding a plausible but never-issued sid.
- *Expected*: **byte-identical** responses — HTTP 200, anonymous, `me.id === "me-"`, no errors. An attacker cannot learn from the response whether a given sid ever existed.
- *Traces*: handover §5.6.7; `cookie-session.strategy.ts:95` (`if (!payload) return null` → anonymous, deliberately **not** 401, so "never existed" is indistinguishable from "no cookie").
- *Note*: contrast this with SRB-G1's 401. The pair together is the actual security property: *ended* sessions are loudly refused; *unknown* sessions are silently anonymous. Assert both or you have asserted neither.

*(Stream B total: 3 green, 2 red, 4 edge, 2 negative = **11**.)*

---

## 3. Explicitly out of scope

One line each, with the reason.

| Excluded | Reason |
|---|---|
| Any Redis assertion (index membership, TTL roll, tombstone body, `request_context_cache: null`, refresh-lock DEL) | The harness has no Redis client, dependency, endpoint or credential — adding one changes the harness's security posture. Covered by `session-index.redis.spec.ts`. |
| Any audit-event assertion (FR-018–FR-022, SC-005) | `emitAudit` writes NDJSON to server stdout; the harness has no log sink. Covered by `oidc-session-revocation.service.spec.ts`. |
| SC-006 in full | Only the *response/wire* slice is observable (SRA-N1, SRB-N1). The audit + log slice is not. |
| SC-003 (zero PII left in the session store) | Requires reading `alkemio:sid:<sid>`. See row 1. |
| SC-004 (deletion succeeds when every revocation path fails) | Needs fault injection into Redis/Hydra. Unit-level. |
| SC-007 (index read is O(account), not O(keyspace)) | Requires asserting the issued Redis command list. Unit-level; SRA-R3/SRB-E3 test its *effect*, not its mechanism. |
| SC-009's "zero additional state changes" half | State is in Redis. Only the "same successful result" half is testable (SRA-E2). |
| SC-011, FR-008, FR-014, US3 (`exceptSid`, partial-failure report) | **No caller is wired in this change.** There is no external surface to drive. |
| SC-011a / FR-002a (self-heal of pre-index sessions) | Requires a session minted by a pre-index build. Not reproducible against one deployment. |
| SC-011b (fire-and-forget adds no latency) | No observable signal; a timing assertion would be pure flake. |
| FR-012a (3 s timeout, no retry, no circuit breaker) | Requires a slow/hostile authorization server. Unit-level. |
| FR-013 (remote revocation fails, local teardown stands) | Same. Unit-level. |
| FR-024 / US1-AS4 (Kratos SSO sessions ended) | Needs the Kratos **admin** API (`KRATOS_ADMIN_URL` is empty locally). And post-#6288 the Kratos session gates nothing observable, so a green assertion would prove nothing about access. |
| FR-026 / US1-AS8 (post-commit ordering; rolled-back deletion signs nobody out) | Requires forcing a transaction rollback. Unit-level. |
| FR-030 (one warn line per degraded field) | Server stdout. Also see §5 — the implementation and the contract disagree on the level. |
| SC-010 (`schema:diff` reports zero breaking changes) | A server-repo exit gate, not a test-suites concern. |
| Client-web unit/component tests for the signed-out render | `A-09`/`WS4`: no client change ships with this feature. SRB-G3 covers the observable outcome. |
| The password-change, admin-email-change and self-service-revoke cascades | Explicitly out of scope in the spec ("Out of Scope"); no caller exists. |
| Back-channel logout across RPs | Recorded as target architecture, not built. |
| Anything under `testOld/` | Deprecated; `CLAUDE.md` forbids adding to it. |

---

## 4. Work partition — two streams, zero file overlap

The two streams are split along the **package boundary**, which is also the
**auth-mechanism boundary** (§1). That is not a convenience: it is the only split
where the two halves genuinely cannot collide, because they share no source file,
no config file, no fixture and no test runner.

### 4.1 Stream A — `server-api` / Vitest / bearer path

**Owns**: `me` graceful degradation and the orphaned-actor state.

**Files it creates (3, all new):**

| Path | Contents |
|---|---|
| `server-api/src/functional-api/graphql-guard/me-degradation.request.params.ts` | The stream's own helpers: the composite `me` query document as a string; a raw `axios` POST to `testConfiguration.endPoints.graphql.private` accepting **an arbitrary bearer or none** (the existing `graphqlErrorWrapper` only takes a `TestUser` and cannot carry a disposable user's token, and the codegen'd SDK has no operation covering `notificationsUnreadCount` / `communityInvitationsCount` / `notifications`); a `deleteUserWithOptions(userId, { deleteIdentity })` variant. |
| `server-api/src/functional-api/graphql-guard/me-degradation-anonymous.it-spec.ts` | `SRA-G1`, `SRA-G2`, `SRA-G3`, `SRA-G4`, `SRA-R1`, `SRA-N2` |
| `server-api/src/functional-api/contributor-management/user/deleted-user-session-orphan.it-spec.ts` | `SRA-G5`, `SRA-R2`, `SRA-R3`, `SRA-E1`, `SRA-E2`, `SRA-E3`, `SRA-N1` |

**Scenario IDs owned**: `SRA-G1`, `SRA-G2`, `SRA-G3`, `SRA-G4`, `SRA-G5`, `SRA-R1`, `SRA-R2`, `SRA-R3`, `SRA-E1`, `SRA-E2`, `SRA-E3`, `SRA-N1`, `SRA-N2` — **13**.

**Imports only (must not edit):**
`@alkemio/tests-lib` (`TestUser`, `TestUserManager`, `UniqueIDGenerator`, `getUserToken`, `testConfiguration`, `getGraphqlClient`),
`@alkemio/tests-lib/utils/graphql.wrapper`,
`@functional-api/contributor-management/user/user.request.params` (`registerVerifiedUser`, `createUser`, `deleteUser`, `getUserData`).

**Notes for the implementer:**
- Use `axios` (a direct `server-api` dependency) for the raw calls. Do **not** reach for `supertest` — it is a `lib` dependency, not a `server-api` one, and only resolves by hoisting accident.
- `TestScenarioFactory.createBaseScenarioEmpty({ name: … })` in `beforeAll` mirrors `delete-user.it-spec.ts`; no space hierarchy is needed.
- Disposable users must use `UniqueIDGenerator.getID()` in the email. Clean up in `afterEach`/`afterAll` with a tolerant delete (already-deleted is fine).
- Assert on the **raw HTTP body**, not through `graphqlErrorWrapper` — the wrapper swallows `BAD_USER_INPUT` and `FORBIDDEN_POLICY` into a synthetic `error` object, which would mask exactly the regression SRA-R1 is fencing.

### 4.2 Stream B — `client-web` / Playwright / cookie path

**Owns**: the revocation cascade itself, over a real `alkemio_session`.

**Files it creates (3, all new):**

| Path | Contents |
|---|---|
| `client-web/src/functional-e2e/session-revocation/session-revocation.helpers.ts` | The stream's own helpers: provision + verify a disposable Kratos identity (`registerInKratosOrFail` + `verifyInKratosOrFail` from `@alkemio/tests-lib`); resolve its Alkemio user id and delete it as global admin via `axios` + `getUserToken('admin@alkem.io')` against `testConfiguration.endPoints.graphql.private`, with a `deleteIdentity` flag; `probeIdTokenHint(context)` and `probePrivateGraphql(context, query)` wrappers over `context.request`. |
| `client-web/src/functional-e2e/session-revocation/session-revocation-cascade.spec.ts` | `SRB-G1`, `SRB-G2`, `SRB-G3`, `SRB-R1`, `SRB-R2`, `SRB-E1`, `SRB-E2`, `SRB-N1` |
| `client-web/src/functional-e2e/session-revocation/session-revocation-blast-radius.spec.ts` | `SRB-E3`, `SRB-E4`, `SRB-N2` |

**Scenario IDs owned**: `SRB-G1`, `SRB-G2`, `SRB-G3`, `SRB-R1`, `SRB-R2`, `SRB-E1`, `SRB-E2`, `SRB-E3`, `SRB-E4`, `SRB-N1`, `SRB-N2` — **11**.

**Imports only (must not edit):**
`@alkemio/tests-lib` (`registerInKratosOrFail`, `verifyInKratosOrFail`, `getUserToken`, `testConfiguration`, `UniqueIDGenerator`),
`@src/functional-e2e/helpers/login.helper` (`loginViaCrd`),
`@src/functional-e2e/helpers/cookies.helper` (`acceptCookiesIfVisible`).

**Notes for the implementer:**
- Do **not** use `createPersonaTest` / `ensurePersonaState` / the `.auth/persona.*.json` cache. Those are keyed by email and shared across the run; a deleted subject would poison them. Build contexts explicitly with `browser.newContext()` + `loginViaCrd(page, disposableEmail)`.
- Mark the cascade spec `test.describe.configure({ mode: 'serial' })`. The scenarios share one disposable subject and its deletion is a one-way door.
- Always `context.close()` in `afterAll`, including on failure — leaked contexts hold live sessions and will confuse the next run.
- `context.request` inherits the context's cookie jar; that is the whole mechanism. Do not construct a bare `APIRequestContext`.
- The GraphQL origin for cookie-borne assertions is `ALKEMIO_BASE_URL + '/api/private/graphql'`. `ALKEMIO_SERVER` in `.env` points at the **non-interactive** path and carries no cookie semantics — use it only for the admin bearer mutations.

### 4.3 No shared new file, and therefore no dependency

Each stream builds its own helper module, in its own package, using primitives
that already exist and that neither stream modifies. There is **no** ordering
dependency: A and B can start at the same minute and merge in either order.

This is deliberate. A single shared "session fixture" would have to straddle two
packages with different module systems (`server-api` is ESM, `client-web` is
CommonJS), two runners and two auth mechanisms — it would be a coupling with no
payoff. The small duplication (each stream writes ~30 lines of disposable-user
provisioning) is the correct trade.

### 4.4 Shared files — READ-ONLY for both streams

Neither stream may modify any of these. Any change here is a merge conflict by
construction and must be raised rather than made:

- `server-api/vitest.config.ts` — **the one file that would collide.** No edit is
  needed: `src/functional-api/graphql-guard/**` is already covered by the
  `graphql-guard` project, and
  `src/functional-api/contributor-management/**` by both `contributor-management`
  and `nightly`. Both Stream A files land inside an existing project glob on
  purpose.
- `client-web/playwright.config.ts` and `client-web/config/global-setup.ts` —
  `testDir: './src/functional-e2e'` already picks up the new directory.
- `lib/**` — no new operation, no codegen run. Both streams use inline query
  strings over `axios` precisely to avoid touching `lib/` and its generated
  artefacts, which would be an unavoidable collision.
- `server-api/src/functional-api/contributor-management/user/user.request.params.ts`
  — imported by Stream A, edited by nobody. Its `deleteUser` hardcodes
  `deleteIdentity: true`; Stream A adds its own variant in its own file rather
  than changing this one.
- `server-api/src/setupTests.ts`, `server-api/src/globalTestsSetup.ts`,
  `**/package.json`, `**/.env*`.

### 4.5 Effort balance

| | Stream A | Stream B |
|---|---|---|
| New files | 3 | 3 |
| Scenarios | 13 | 11 |
| Cost per scenario | low — one HTTP call, no browser | high — real browser contexts, real login |
| Setup complexity | medium — disposable user + pre-minted token | high — 3–5 browser contexts, disposable identity, admin mutation |
| Flake exposure | low | medium |
| Runtime | seconds | minutes |

Deliberately unbalanced in scenario count to compensate for cost per scenario.
Estimated wall-clock effort is close to even.

### 4.6 Definition of done, per stream

1. Every owned scenario has a `test()` that **passes against the PR#6324 build**.
2. `SRA-G1`–`SRA-G4` **fail against `develop`** — verify this once and record it in the PR body. A degradation test that passes on both builds is testing nothing.
3. The stream's lint gate is green (`pnpm --filter … run lint`, which runs `tsc --noEmit` first).
4. No file outside the stream's own three paths is modified — `git status` proves it.
5. Every scenario ID appears verbatim in its test title, e.g. `test('SRA-G1 — anonymous me degrades …')`, so the plan and the suite stay traceable.
6. Any scenario that cannot be made to pass is **deleted with a one-line reason in the PR body**, not skipped, not weakened. A `test.skip` in a security suite is a lie with a green tick next to it.

---

## 5. Findings surfaced while writing this plan

Not test scenarios — observations for the PR author. Recording them here because
they were found by reading the diff against its own contracts.

1. **FR-030 / contract says `warn`, the implementation logs `verbose`.**
   `graphql-me-degradation.md` states *"Every degraded field emits exactly one
   **warn**-level line"*, and gives two reasons it is mandatory rather than
   optional (constitution principle 5; and that without it the degradation
   *hides* a genuine authorization regression behind a plausible empty
   response). The shipped code uses `this.logger.verbose?.(…)` in all seven
   places (`me.resolver.fields.ts`, `me.conversations.resolver.fields.ts`).
   `verbose` is typically filtered out in every deployed environment, so the
   safeguard the contract argues for does not exist in practice. Either the
   contract or the code should move.
2. **Guard 6 was removed rather than relaxed.** The contract lists seven guards
   including the `conversations` container; the implementation deletes that
   guard entirely (with a reasoned comment). Defensible, but it means
   `me { conversations }` on its own now emits **zero** degradation log lines,
   which reads against FR-030's "one line per degraded field".
3. **The revocation marker covers the cookie path only.** `getSubRevokedAt` has
   exactly one caller. `HydraBearerStrategy`, `NonInteractiveLoginStrategy` and
   the MCP strategies never consult it, so a deleted user's already-issued
   bearer keeps authenticating (degrading to anonymous HTTP 200) until its own
   expiry. For Hydra tokens in production that is a real residual window on a
   real path. Out of scope for #6315 — but it is the same stale-authority
   pattern the handover's §4.6 warns will otherwise recur, and it deserves its
   own issue rather than silence.
