# Test plan — second factor for Alkemio accounts, API track (103)

- **Story:** [alkem-io/server#5913](https://github.com/alkem-io/server/issues/5913), *Enable Kratos MFA support (TOTP / WebAuthn)*
- **Workspace spec:** `specs/103-enable-kratos-mfa-support-totp-webauthn/` in `alkem-io/agents-hq` (`spec.md`, `plan.md` Design §5, `tasks/test-suites.md`)
- **Suite:** `server-api/src/functional-api/second-factor/` (project `second-factor`, on demand, never `nightly`). The browser track is `client-web/src/functional-e2e/second-factor/` with its own plan.

## How to run

```bash
cd server-api && pnpm exec vitest run --project second-factor
# then, not at the same time (they share the runner's address and its counter):
cd client-web && pnpm exec playwright test -c config/playwright.config.second-factor.ts
```

Every case needs a live stack. None of them runs in a static gate.

- **Kratos values:** the stack runs this feature's Kratos configuration (totp, lookup_secret and webauthn on, `required_aal: highest_available` on settings and whoami, the settings `profile` method off). Locally that is the server worktree's compose config (`.build/ory/kratos/`); on dev/test/sandbox it is the dev-orchestration values.
- **kratos-webhooks:** this feature's build (`KRATOS_WEBHOOKS_IMAGE` on the compose stack). The re-login and forged-header case and `factor-change-record` are red against the released image by construction. That red belongs to the environment and is not evidence against the product.
- **oidc-service:** this feature's broker (`OIDC_SERVICE_IMAGE`) for the browser track's `acr` case.
- **Harness access:** `KRATOS_ADMIN_URL`, the Kratos public route (`KRATOS_ENDPOINT`, through the login proxy), loopback Redis and Postgres, and Matrix for the room cases. `KRATOS_PUBLIC_DIRECT_URL` (Kratos' own public port, default `http://localhost:4433`) is needed only by the probe.
- **Existing databases:** on any database older than the server slice, `authorizationPolicyResetOnPlatform` must have run once after the server image went live. Without it the reset answers `FORBIDDEN_POLICY` because of the environment, not a product bug.
- **The login proxy's counter:** a successful sign-in no longer clears the runner's address. Every case therefore clears `login_backoff:ip:*` first, and the project clears it before and after seeding its role users. On a stack running this feature's kratos-webhooks build, run these two tracks only: other projects' sign-ins lock the address after the threshold. Clearing removes every address's counter, the only bound on guessing a second-step code, so it refuses unless `KRATOS_ENDPOINT` is loopback (a stack of the runner's own). On a shared cluster it needs `HARNESS_ALLOW_NON_LOOPBACK_INTERNALS=true`: a person's decision, logged on every clear.
- **Identities:** every identity is a throwaway, created through the Kratos admin API and deleted (platform user and identity) after its case. Every organisation is created by a throwaway admin and deleted in `finally`. The platform rule is switched on in grace only, never aged and never switched off: its case refuses to run where the rule is already on. Its stored value is read by SQL first and written back in `finally`.

## Scenario → test mapping

| Scenario | Risk | Technique | Covers | Automated by |
|---|---|---|---|---|
| US1-AS2 | R4 | State transition | Enrolment leaves a `totp` credential at Kratos admin | `factors-totp` › US1-AS2 / US1-AS4 |
| US1-AS4 | R4 | State transition | With an authenticator enrolled, the password alone gives an aal1 session, and whoami answers 403 `session_aal2_required` | `factors-totp` › US1-AS2 / US1-AS4 |
| US1-AS4 | — | Equivalence partitioning | A wrong code is refused with Kratos' invalid-code verdict. The right one gives aal2 with `totp` in the methods | `factors-totp` › US1-AS4 / US1-AS6 |
| US1-AS6 | — | State transition | After `totp_unlink` there is no `totp` credential, and the password alone gives a usable aal1 session | `factors-totp` › US1-AS4 / US1-AS6 |
| R11 (record) | R11 | Exploratory (recorded) | What whoami answers for the session that enrolled: 403 `session_aal2_required` or 200 aal2. Both are accepted. **Found:** not recorded: no run's `[second-factor R11]` line has been kept. Record it from the next track run | `factors-totp` › R11 |
| D28 D34 D36 | R16, R25, R32 | Boundary value | The flow is a password login, a batch of wrong codes, a fresh password login, then the rest, sized from `LOGIN_BACKOFF_MAX_IP_ATTEMPTS`, which must name the stack's threshold (the case refuses to run without it). None of the first *max* submissions answers 429. The next wrong code, and then the correct code, answer 429. Every submission forges a different `True-Client-Ip` and `X-Forwarded-For`. The case is red before kratos-webhooks D34/D36. It is also red where the edge passes a sender's `X-Forwarded-For` through: that red is the environment's (R32), and the per-address bound may not be cited there. **Edge it ran behind / result:** not recorded. Until it is, this case is no evidence for any environment's edge (R32) | `factors-totp` › D28 D34 D36 |
| D41 (c) | R16 | Error guessing | A wrong code sent by `GET`, `PUT` or `PATCH` through the public identity host is not evaluated: its answer carries no invalid-code verdict. A `POST` wrong code is the control, because the same detector sees its verdict. The correct `POST` then signs in at aal2. A red here is a product finding against the proxy (it must then count that method) | `factors-totp` › D41 (c) |
| SC-004 | — | Equivalence partitioning | An identity with no second factor gets a full aal1 session, and `getUserToken` still works | `factors-totp` › SC-004 |
| D2 (record) | R33 | Exploratory (recorded) | Recovery codes requested with no other factor: Kratos' answers, the credentials left, and what the next password login owes. Nothing is asserted. **Found:** not recorded: no run's `[second-factor D2]` line has been kept. Record it from the next track run | `factors-recovery-codes` › D2 |
| US2-AS1 | — | Use case | Codes are returned when generated, and a later settings flow does not show them | `factors-recovery-codes` › US2-AS1 / AS2 |
| US2-AS2 | — | State transition | A code signs in at aal2 with `lookup_secret`. The same code is refused the next time | `factors-recovery-codes` › US2-AS1 / AS2 |
| US2-AS3 | — | State transition | After regenerating, an old code is refused and a new code works | `factors-recovery-codes` › US2-AS3 |
| US2-AS9 | — | State transition | After removing the codes, Kratos admin lists no `lookup_secret`, and a previously valid code is refused | `factors-recovery-codes` › US2-AS9 |
| US2-AS10 (D31) | R28 | Use case | The emailed recovery link (minted through Kratos admin) gives an enrolled identity an aal1 session. A password change on its settings flow owes the second step, and the old password still signs in. After the code, the password changes | `factors-recovery-codes` › US2-AS10 |
| US2-AS5 | R6 | Use case | A Platform Support reset lists what was removed. Kratos admin shows no factor and no session. A BFF session from before the reset answers 401. An open `roomEvents` subscription closes with 4401 and gets nothing | `reset` › US2-AS5 |
| D24 (fence) | R6 | Boundary value | `M` is the marker the reset wrote, read from Redis and never from the wall clock. A session begun at `M - 1` answers 401, and one begun at `M + 1` answers 200 | `reset` › US2-AS5 |
| US2-AS5 (audit) | — | Decision table | There are exactly two `authentication` rows with one `correlationId`: started (`invalidatePassword: false`), then completed (`removedCredentialTypes`, `sessionsRevoked`, `tokenRevocationFailedCount`). No email appears | `reset` › US2-AS5 |
| D6 | — | Decision table | Platform Users Admin may reset. Platform Settings Admin is refused `FORBIDDEN_POLICY`, with no row and nothing removed | `reset` › D6 |
| US2-AS7 | — | Error guessing | A self-target is refused `FORBIDDEN` (not `FORBIDDEN_POLICY`) with no row. A user whose record links no identity is refused `ENTITY_NOT_FOUND` with no row. A stale link is server T021's unit case | `reset` › US2-AS7 |
| D37 | R11 | State transition | When a subscription's session record is gone, the socket closes with 4401 and the next message is not delivered | `reset` › D37 (record gone) |
| US2-AS12 (D44, R32) | R24, R28, R34 | State transition | Enrolling and removing an authenticator, and generating and removing recovery codes, each write one `authentication` / `observed` row for the member within 10 s, with the right `details.method`. The row holds no email, and `requestContext` holds at most `userAgent` (≤ 256 characters). A missing row names its method and "settings hook did not run" | `factor-change-record` |
| US2-AS11 (D43, D46) | R28, R31 | Use case | A reset with `invalidatePassword: true` invalidates the password, as the result and both rows show. The old password is refused with Kratos' invalid-credentials message. No factor and no session remain. The password's last-change time is later than before and equal to the row's `passwordLastChangedAt`. The recovery link's session sets a new password with no second step, and the new password signs in. Afterwards the check no longer matches, which shows it can fail | `reset-compromise` › US2-AS11 |
| D47 (R34) | R34 | Error guessing | A settings `profile` submission is refused with 404, and Kratos admin shows the email, recovery and verifiable addresses unchanged | `reset-compromise` › D47 profile |
| D47 | — | Use case | The two-step sign-up (browser flow, `profile` step, then password) creates an identity that verifies through the mail catcher and signs in | `reset-compromise` › D47 sign-up |
| US4-AS1 (D25, D35) | R26 | State transition | Platform Settings Admin switches the platform rule on, which sets `…Since` and writes one `configuration_changed` row (`scope: platform`, `from: false`, `to: true`) and a `platform_configuration` row naming `security`. On→on writes nothing. The block is returned to the admin and is `null` to an anonymous reader and to a member's session. A role holder's cookie session reads `covered: true` with a future deadline and is served as that user | `requirement` › US4-AS1 |
| US4-AS2 (D25) | — | State transition | The organisation rule writes a row with `subjectOrganizationId`, `scope: organization` and `since` inside the test's window (±60 s skew). Owner/admin and associate are covered with `deadline = since + 14 days`. Switching off uncovers them and writes an on→off row | `requirement` › US4-AS2 |
| US4-AS3, AS9 | — | State transition | In grace, a covered member reads `covered: true`, a future deadline and `satisfied: false` | `requirement` › US4-AS3–AS10 |
| US2-AS8 (D21) | — | State transition | A reset in grace leaves the rule's deadline unchanged, and a fresh session (minted at `M + 1`) is not refused | `requirement` › US4-AS3–AS10 |
| US4-AS4 (D26) | R3 | Decision table (per transport) | After `ageRuleSince(15)`, the very next request is refused. GraphQL `me` answers 200 with `SECOND_FACTOR_REQUIRED` / 11119. A `platform`-only document is answered exactly as the anonymous one. Introspection answers with data and no refusal. The memo PDF answers 403 `second_factor_required`, and so does the calendar ICS, with no `Location`. The memo PDF control answered in grace (the ICS route has no control: for an unknown event it never answers). id-token-hint answers 200 with `second_factor_required: true` and an `id_token` | `requirement` › US4-AS3–AS10 |
| US4-AS4 (D23) | R11 | State transition | A subscription opened in grace (and shown live) gets nothing after aging, and closes with 4403 | `requirement` › US4-AS3–AS10 |
| US4-AS6 | R4 | Equivalence partitioning | A session with `acr: 'aal2'` is not refused | `requirement` › US4-AS3–AS10 |
| US4-AS5 (D10) | — | State transition | A late joiner's session is served once, then refused on the very next request after the associate grant. There is no polling, and a red here is a product finding against the actor-cache invalidation | `requirement` › US4-AS3–AS10 |
| US4-AS7 | R4 | — | There is no case of its own. The session carries `acr` and nothing about how the person signed in (D18), so the `acr: null` cases above are the federated case | — |
| US4-AS8 | — | Equivalence partitioning | Identities covered by no rule, enrolled or not, are never refused and read `covered: false` | `requirement` › US4-AS3–AS10 |
| US4-AS10 (SC-005) | R14 | Equivalence partitioning | A covered member's non-interactive token past the deadline is not refused, and reads the empty status. The Hydra-bearer half is server `hydra-bearer.strategy.spec.ts` and the broker's contract test. Its refused (`aal1`) side is the browser track's ID-token case (client-web T016) | `requirement` › US4-AS3–AS10 |

## Measurements (run once, by path; never a pass or a fail)

| Measurement | Run | Result |
|---|---|---|
| R16 / OG-4 (b): Kratos' own bound on wrong second-step codes past the proxy, then a new flow and a fresh login | `SECOND_FACTOR_MEASURE=1 pnpm exec vitest run --project second-factor-measure kratos-bound` | **Not run.** OG-4 (b) has no input and is unmet until this row holds the count (or "none within 100"), the new flow's verdict and the re-login's verdict. A limit that a new flow or a re-login escapes counts as no bound |
| R22: a hundred cookie sockets on one room under a rule in grace, ten messages | `SECOND_FACTOR_MEASURE=1 pnpm exec vitest run --project second-factor-measure subscription-cost` | **Not run.** To record: wall time per publish and statements per delivered event (or "not available"), which also go into the workspace plan's Performance note |

## Recorded substitutions

- **T001 (the `otpauth` dependency) was dropped.** `lib/src/scenario/second-factor/totp.ts` computes RFC 6238 codes with Node's `crypto` (HMAC-SHA1, six digits, thirty-second steps, Kratos' defaults) in about forty lines. A wrong implementation cannot pass: Kratos checks every code it produces, and every enrolment and sign-in case uses one.
- **T002's documents are inline, not generated.** `lib/src/scenario/second-factor/graphql.ts` sends them raw so the cases can assert on the HTTP status and on `errors[].extensions.code`, which the generated SDK's error wrapper hides. The cost: a schema change surfaces on a live run, not at codegen.

## Not covered here — known gaps

| Scenario | Why not automated here | Where it is covered instead |
|---|---|---|
| US2-AS4 | It is the Security page's disabled action, not Kratos | client-web T011 unit test and the browser track (T012) |
| US2-AS6 | The intent row cannot be written, so no marker is written. Not reproducible from outside | server T021 |
| D43 / D46 window inside one reset | A factor or a password set between two of the server's own calls needs a write inside the reset | server T021b |
| D43 reset of an identity with no password | The admin API accepts a password-less identity, but such an identity cannot sign in, so the server never creates its platform user. A reset needs a user whose record links the identity | server T021a / T021 unit tests |
| US1-AS3 | The 15-minute privileged window cannot be aged from outside Kratos without a fixed wait | client-web T008 unit test and the acceptance walk |
| US4-AS7 — a federated sign-in under a rule | The harness has no federated identity provider, and nothing in the session records how the person signed in (D18) | The `acr: null` cases of `requirement` stand for it; a person walks a federated sign-in on acceptance |
| D37 after the BFF logout route | The route's effect on a session the harness fabricates was never shown, so a case on it skipped itself rather than discriminate. A sign-out ends the session by dropping its record, which `reset` › D37 (record gone) proves | `reset` › D37 (record gone); the browser track's sign-outs |
| webauthn factor-change row | The API track has no virtual authenticator | the browser track's `security-key.spec.ts` › US3-AS1/AS2 |
