# Test plan — detect signup language & persist it as a user setting (029)

- **Story:** [alkem-io/alkemio#2017](https://github.com/alkem-io/alkemio/issues/2017) — *Detect the user's language and offer to adopt it as part of sign up*
- **Workspace spec:** `specs/029-detect-signup-language/` in `alkem-io/agents-hq` (source of truth for FR/SC ids)
- **Product code:** [server#6299](https://github.com/alkem-io/server/pull/6299), [client-web#10079](https://github.com/alkem-io/client-web/pull/10079)
- **Suites:**
  - UI walks — `client-web/src/functional-e2e/language-offer/`, run with `config/playwright.config.language-offer.ts` locally, and as the `Language offer` project of the nightly build (`config/playwright.config.nightly.ts`)
  - API contract — `server-api/src/functional-api/language/`, run with `pnpm --filter @alkemio/test-suite-server-api run test:language`

## How to run

Against a running app on the **same origin** as the API (not the `:3001` vite dev
origin — it fails CORS, so the config never resolves and no banner can appear):

```bash
cd client-web
ALKEMIO_BASE_URL=http://localhost:3000 \
  pnpm exec playwright test --config=config/playwright.config.language-offer.ts
```

In CI these same walks run as part of the nightly Playwright build, where the
`auth-setup` project is named `Language offer setup` and the walks `Language
offer`; that config carries its own 90s/15s timeouts because the rest of the
nightly runs at 30s/5s.

The `auth-setup` project logs the personas in once and persists their sessions to
`.auth/`; the walks consume those with `test.use({ storageState })`. Browser
language per file comes from `test.use({ locale })`, which sets
`navigator.languages` — exactly what `detectBrowserLanguage()` reads.

Personas: `admin@alkem.io` (inviter), `non.space@alkem.io` (account settings).
The eligible language set is read from the platform Config query at run time, so
the assertions follow the environment rather than a hard-coded `nl`.

## Scenario → test mapping

| Scenario | Covers | Automated by | Layer |
|---|---|---|---|
| US1-AS5 | `de-DE` browser is not eligible → no offer | `us1-signup-offer.spec.ts` › US1-AS5 | UI |
| US1-AS6 | `nl-BE` maps to `nl` → Dutch offered | `us1-signup-offer.spec.ts` › US1-AS6 | UI |
| US1-AS7 | English top-ranked → no offer | `us1-signup-offer.spec.ts` › US1-AS7 | UI |
| US2-AS3 | Stored account language beats a differing browser language; no offer | `us2-cross-device-persistence.spec.ts` › US2-AS3 | UI |
| US2-AS5 | Settings change is served to a fresh device (account-level, not browser-level) | `us2-cross-device-persistence.spec.ts` › US2-AS5 | UI |
| US3-AS1 | Anonymous Dutch visitor is offered Dutch, in Dutch (FR-007) | `us3-anonymous-offer.spec.ts` › US3-AS1 | UI |
| US3-AS2 | Accept renders Dutch for the session; nothing stored; reload re-offers | `us3-anonymous-offer.spec.ts` › US3-AS2 | UI |
| US3-AS2a | Accept writes **zero** language keys to browser storage (SC-001c) | `us3-anonymous-offer.spec.ts` › US3-AS2a | UI |
| US3-AS2b | No language offer before cookie consent is answered (FR-013b-ii) | `us3-anonymous-offer.spec.ts` › US3-AS2b | UI |
| US3-AS3 | Decline stays English, nothing stored, not re-shown this session | `us3-anonymous-offer.spec.ts` › US3-AS3 | UI |
| US3-SC005 | Pre-answer display is the platform default — detection never silently switches the UI (FR-004/DL-6) | `us3-anonymous-offer.spec.ts` › US3-SC005 | UI |
| corr-client-2 | A malformed `accepted_cookies` cookie does not crash the SPA (FR-013e) | `us3b-review-fixes.spec.ts` | UI |
| corr-client-4 | The anonymous choice is in-memory only — a full reload re-offers | `us3b-review-fixes.spec.ts` | UI |
| US5-AS1 | Inviter marks the invitee as expecting Dutch → the invitation **records** it (FR-014/FR-014a) | `us5-invite-suggestion.spec.ts` › US5-AS1 | UI + GraphQL read-back |
| US5-AS6 | Control is optional → invitation records **no** language (FR-015) | `us5-invite-suggestion.spec.ts` › US5-AS6 | UI + GraphQL read-back |
| US1-AS2 | Accepting the offer is **recorded on the account** (language written, offer latched answered) | `language/user-language-settings.it-spec.ts` | API |
| US1-AS3 | Declining is recorded as answered **without** choosing a language | `language/user-language-settings.it-spec.ts` | API |
| US2 (server half) | The preference lives on the account and is served back on any later read | `language/user-language-settings.it-spec.ts` | API |
| US4 / US5-AS2/AS3/AS4 | A person invited with a suggested language **registers already set to it** | `language/invitation-language-seeding.it-spec.ts` | API |
| US5-AS7 | The suggestion fans out onto **both** `Invitation` and `PlatformInvitation` in one batch | `language/invitation-language-seeding.it-spec.ts` | API |
| SC-008 (server) | A non-eligible language is refused at compose time, regardless of client | `language/invitation-language-seeding.it-spec.ts` | API |
| One-time offer | `languageOfferAnswered` is a one-way latch — it cannot be re-armed | `language/user-language-settings.it-spec.ts` | API |
| R-8 kill switch | The platform advertises its eligible set + default; an empty set disables offers | both API specs (read at run time) | API |

### Regression guards

Two defects found during live verification are pinned by tests, both boot-order
problems that the component unit tests could not see:

1. The anonymous UI silently switched to Dutch *before* the visitor answered
   (`navigator` was in the i18next detector order) → guarded by **US3-SC005**.
2. The offer banner never rendered for any anonymous visitor (reconciliation
   never latched `reconcileComplete` when unauthenticated) → guarded by **US3-AS1**.

## Not covered — known gaps

| Scenario | Why not automated | Where it belongs |
|---|---|---|
| US1-AS1 | The *browser* sign-up journey itself (Kratos terms → details → password → MailSlurper verification) does not drive reliably headless. The **outcome** it produces — the account's stored language — is covered by the API specs above | Manual QA for the visual flow; the contract is covered |
| US1-AS8 | External IdP sign-up — no test IdP on the stack | Manual QA |
| US5-AS8 | The invitation email itself is unchanged | Code assessment (FR-016a/DL-12) |
| "latest-created eligible suggestion wins" (full form) | Needs **two different** eligible languages; environments currently configure a single eligible language (`nl`), so the ordering rule cannot be distinguished end-to-end. The partial form (a later invitation *without* a suggestion does not cancel an earlier one) **is** covered | Server unit tests (`registration.service.spec.ts`); re-check here if a second eligible language is ever configured |
| "a non-fresh account is never re-seeded" | Not reachable through the API — seeding only runs during registration finalization, and an account cannot be registered twice | Server unit tests (`registration.service.spec.ts`) |
| corr-client-4 (client-side navigation form) | The anonymous surface exposes no SPA-internal cross-route-group link — every anonymous navigation is a full document load | Kept as an explicit `test.skip` recording why; the fix is verified structurally in `App.tsx` |

The story's headline — *"the language would need to be stored per user, not just
per web client"* — is now proven end to end at the API layer: invite an address
with a suggested language, register that person, and their account comes back
already set to it (`invitation-language-seeding.it-spec.ts`). What remains
unautomated is the *visual* sign-up journey, not the contract behind it.
