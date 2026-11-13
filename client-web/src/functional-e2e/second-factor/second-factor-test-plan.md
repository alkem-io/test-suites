# Test plan — second factor in the browser (103)

- **Story:** [alkem-io/server#5913](https://github.com/alkem-io/server/issues/5913), *Enable Kratos MFA support (TOTP / WebAuthn)*
- **Workspace spec:** `specs/103-enable-kratos-mfa-support-totp-webauthn/` in `alkem-io/agents-hq` (FR-015, FR-021, D14, D21–D24); tasks `tasks/test-suites.md` T005, T006, T008, T009, T012–T014, T016.
- **Suite:** `client-web/src/functional-e2e/second-factor/`. The API track is `server-api/src/functional-api/second-factor/` and has its own plan.

## How to run

```bash
# from client-web/ — never at the same time as the API track (one per-address counter at the login proxy)
pnpm exec playwright test -c config/playwright.config.second-factor.ts
```

- Needs a stack booted with the feature's Kratos values (authenticator app, recovery codes, security keys, `required_aal: highest_available`), the Kratos admin API (`KRATOS_ADMIN_URL`) and loopback Redis/Postgres. Every case needs that live stack; none runs in CI.
- Each walk creates its own identities through the Kratos admin API and deletes them in `afterAll`. Refusal cases use an **organisation** rule on a throwaway organisation, aged by SQL (`ageRuleSince`); the platform rule is never touched from this track.
- Every spec clears the login proxy's per-address counters in `beforeEach`, and the runner clears them once before anything else: a successful sign-in no longer clears its address (D34), so the walks' own sign-ins would otherwise reach the threshold. Clearing removes every address's counter, the only bound on guessing a second-step code, so it refuses unless `KRATOS_ENDPOINT` is loopback. That check cannot tell a stack of the runner's own from a shared cluster port-forwarded to loopback, which it passes silently. **Run these tracks only against a stack of the runner's own.** Running them against a shared cluster (port-forwarded, or with `HARNESS_ALLOW_NON_LOOPBACK_INTERNALS=true`) resets every other sender's counter there at each case; no person has ruled that acceptable, so it is not.
- No screenshot, trace or video: the authenticator key, its QR code and the recovery codes are on screen.
- One worker, files in sequence.

## Scenario → test mapping

| Scenario | Risk / decision | ISTQB technique | Covers | Automated by |
|---|---|---|---|---|
| US1-AS1 | — | Use-case testing | Security → Two-step verification shows the QR code and the key for an identity with no factor | `totp-security-section.spec.ts` › US1-AS1/AS2 |
| US1-AS2 | — | Use-case testing | A code computed from the key on screen makes the app active, with "Remove"; Kratos admin holds a `totp` credential afterwards and not before | `totp-security-section.spec.ts` › US1-AS1/AS2 |
| US1-AS4 | — | State transition | The next sign-in asks for the code; a wrong code is refused with the identity provider's message (on the field or as an alert of the second step's form, never any alert on the page) and keeps the second step; the right one lands on the restricted page the sign-in started from, signed in | `totp-security-section.spec.ts` › US1-AS4/AS7 |
| US1-AS7 | R4 | Use-case testing | `me.secondFactorRequirement.satisfied` is `true` through the signed-in browser — the only end-to-end proof that the broker's `acr` reaches the BFF session | `totp-security-section.spec.ts` › US1-AS4/AS7 |
| FR-007 | R4 | Use-case testing | `GET /api/auth/oidc/refresh` answers 204 and the session still reads `satisfied: true` | `totp-security-section.spec.ts` › US1-AS4/AS7 |
| US1-AS6 | — | State transition | Removing the app (confirmation dialog) brings the setup form back, Kratos admin holds no `totp`, and the next sign-in is password alone with `satisfied: false` | `totp-security-section.spec.ts` › US1-AS6 |
| US2-AS4 | — | Decision table | With no factor, "Generate recovery codes" is disabled and its explanation is shown (beside the rendered setup form as positive control) | `recovery-and-reset.spec.ts` › US2-AS4 |
| US2-AS1 | — | Use-case testing | Generated codes are shown with the "shown once" notice and "Copy codes" (→ "Copied", Chromium), confirmed with "I have saved these codes", and not shown again; Kratos admin holds `lookup_secret` | `recovery-and-reset.spec.ts` › US2-AS1/AS9 |
| US2-AS9 | — | State transition | "Remove recovery codes" (confirmation dialog) → "Generate recovery codes" is offered again and enabled | `recovery-and-reset.spec.ts` › US2-AS1/AS9 |
| US2-AS2 | — | Use-case testing | Newly generated codes sign in through "Use a recovery code"; the session reads `satisfied: true` | `recovery-and-reset.spec.ts` › US2-AS2 |
| US2-AS8, US4-AS6 | R3, D24 | State transition | An organisation rule past its deadline, the member reset by Platform Support: a password sign-in lands on `/second-factor` with exactly one notice and no toast; `/home` sends it back there and the API answers `SECOND_FACTOR_REQUIRED`; a wrong code resumes on `/second-factor` with the identity provider's message; enrolling shows "Your second factor is set up…"; "Sign in again" with both steps opens the platform (`covered: true, satisfied: true`); no request of the page failed at the network level | `recovery-and-reset.spec.ts` › US2-AS8/US4-AS6 |
| US3-AS1 | — | Use-case testing | A named security key (CDP virtual authenticator) is listed with its name and "Remove <name>"; Kratos admin holds `webauthn` | `security-key.spec.ts` › US3-AS1/AS2 |
| US3-AS2 | — | Use-case testing | The next sign-in offers "Use a security key" and no code field (no app enrolled); the key signs in, and the session reads `satisfied: true`; the key is removed again, and Kratos admin then holds no key | `security-key.spec.ts` › US3-AS1/AS2 |
| US2-AS12 (D44) | R32 | State transition | Adding the key, then removing it, each write one `authentication` / `observed` row with `details.method` `webauthn` for the member, read over loopback SQL within 10 s; a missing row says "settings hook did not run". The `totp` and `lookup_secret` rows are the API track's `factor-change-record` | `security-key.spec.ts` › US3-AS1/AS2 |
| US3-AS3 | R8 | State transition | A passkey signs in without a password; after an authenticator app is enrolled, the code is asked after the passkey, and that sign-in reads `satisfied: true`. A red here is a Kratos behaviour finding against risk R8 | `security-key.spec.ts` › US3-AS3 |
| US4-AS2 | D25 | Use-case testing | The organisation's "Require two-step verification for members" switch, turned off and on again by its admin, persists across a reload and is what the server stores; turning it off asks for confirmation first, and dismissing the question leaves the rule on | `requirement.spec.ts` › step US4-AS2 |
| US4-AS3 | — | Use-case testing | In grace the reminder shows the deadline (the server's, formatted `PPP`) and "Set it up" links to Security › two-step verification; dismissed, it stays gone after a reload in the same browser session (asserted once the reloaded page's requirement read has been answered), and a new browser session (a fresh context, signed in again) shows it again | `requirement.spec.ts` › step US4-AS3 |
| US4-AS4 | FR-015 | State transition | Past the deadline (aged by SQL, no wait), the next in-app navigation of a signed-in session lands on `/second-factor` with one notice and no toast | `requirement.spec.ts` › step US4-AS4 (navigation) |
| US4-AS4 | FR-015 | State transition | A fresh sign-in past the deadline lands on `/second-factor` at start-up, with one notice and no toast | `requirement.spec.ts` › step US4-AS4/D22 |
| D22 | R14 | Equivalence partitioning | That refused sign-in's ID token from `/api/auth/oidc/id-token-hint` (`second_factor_required: true`), sent as a bearer with no cookie: GraphQL answers 200 with `SECOND_FACTOR_REQUIRED`, the memo PDF route answers 403 `error_code: second_factor_required`. Control: the member's non-interactive token is served as that member on GraphQL, and the PDF route answers it 404 for the unknown memo (a token it rejected would be 401) | `requirement.spec.ts` › step US4-AS4/D22 |

## Recorded reasons

- **US2-AS8 — the sign-in waits for the reset's marker.** The reset writes a subject-revocation marker `M`, and the server rejects a sign-in that began in or before second `M` (D24). The walk reads `M` over loopback Redis and starts the sign-in only once the runner's clock has passed second `M + 1`, a condition bounded at five seconds, not a fixed wait. The extra second is for clock skew: `M` and the sign-in's start are both the server's clock, so a runner up to one second ahead of the server is still safe. The bound assumes the two clocks agree to within a second. A real member that close to a reset is asked to sign in again, which OG-3's fresh sign-in covers.
- **US2-AS8 — the cross-origin resume is not proven here.** The isolated stack and development mode serve the identity routes on the app's own origin. On a two-origin environment the resume onto `/second-factor` is proven by client-web's `settingsFlowSecurityReturn` unit cases and by the acceptance walk after OG-1.
- **US4-AS4 — the toast opt-out path.** FR-015 also names an operation that opts out of the global error toast. No page of the product could be named that issues such an operation for a member in this state, so that path is pinned by client-web's `useErrorHandlerLink.test.ts` (the refusal routes before the opt-out is honoured). This track walks the ordinary query path and the start-up probe. Its "no toast" check is best-effort: it is asserted as soon as the `/second-factor` page shows its notice, with no settle condition, so a toast that mounts later would pass it. The unit test is what carries the opt-out.

## Not covered — manual or elsewhere

| Scenario | Why not automated here | Where it is covered instead |
|---|---|---|
| US1-AS3 — password re-confirmation after the 15-minute privileged window | **Manual-only.** The window cannot be aged from outside Kratos without a fixed wait, and the behaviour is Security's existing privileged-session handling | client-web T008's unit test, and the acceptance walk |
| US1-AS5 — the second step in the app | The app shell is not driven by this suite | Left to a person on acceptance |
| US3 with a hardware key | A virtual authenticator stands in for the hardware | Left to a person on acceptance |
| A Hydra bearer with `acr: aal2` (the satisfied side of D22) | The harness has no browserless Hydra sign-in | server `hydra-bearer.strategy.spec.ts` and the broker's contract test (risk R14) |
