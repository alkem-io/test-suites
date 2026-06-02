# CRD Auth Selector Contract & Gap Log

For a UI-test feature there is no API contract. The analogous "contract" is the set of **stable, accessible hooks the CRD authentication screens must expose** for the suite to target without brittle selectors. This file is both the target contract and the running **gap log** required by FR-008 / SC-007: any required hook the CRD build does not provide is recorded here as a finding rather than worked around silently.

## How to use this file

1. During implementation, for each row, inspect the running CRD screen (Playwright codegen / accessibility snapshot).
2. Set **Status**: `OK` (hook present and stable), `ALT` (different but acceptable stable hook found — note it), or `GAP` (no stable accessible hook — file a finding).
3. Every `GAP` row is a reviewable follow-up (e.g. a client-web issue requesting a `data-testid` or accessible name). The count of `GAP` rows is reported at verification (SC-007).

## Contract: required hooks per CRD screen

### Sign-in screen
| Element | Required hook (preferred) | Status | Note |
|---|---|---|---|
| Email field | textbox, accessible name matching `/e-?mail/i` | _TBD_ | |
| Password field | textbox/label `Password` | _TBD_ | |
| Password show/hide toggle | button with accessible name (spec FR-013) | _TBD_ | keyboard-operable |
| Sign-in submit | button name `Sign in` | _TBD_ | |
| Forgot-password link | link `/forgot password/i` | _TBD_ | |
| Sign-up cross-link | link `/sign up/i` or `No account?` text | _TBD_ | |
| Provider buttons | button per advertised provider, e.g. `/connect with (microsoft|linkedin|github)/i`, in backend order | _TBD_ | order asserted (spec FR-010) |
| Heading | heading, confirmed CRD title | _TBD_ | |

### Sign-up (terms) screen
| Element | Required hook | Status | Note |
|---|---|---|---|
| Terms checkbox | checkbox with accessible name `/terms/i` | _TBD_ | not generic `input[type=checkbox]` |
| Next button | button `Next`, disabled until terms ticked + fields valid | _TBD_ | gating asserted (spec FR-011 client) |
| Terms / Privacy links | link `/terms/i`, `/privacy/i` | _TBD_ | |
| Sign-in cross-link | link `/sign in/i` | _TBD_ | |

### Full registration screen
| Element | Required hook | Status | Note |
|---|---|---|---|
| Email / First / Last name | textbox/labels (no MUI ` *` suffix) | _TBD_ | |
| Next / submit | button `Next` | _TBD_ | |
| Password step field | label `Password` | _TBD_ | |
| Verification-pending copy | heading/text confirming "verify your email" | _TBD_ | |

### Recovery + set-new-password screens
| Element | Required hook | Status | Note |
|---|---|---|---|
| Recovery email field | textbox `/e-?mail/i` | _TBD_ | |
| Recovery code field (local env) | label, confirmed CRD text | _TBD_ | |
| Continue button | button `Continue` | _TBD_ | |
| New-password field | label `Password` | _TBD_ | |
| Save button | button `Save` | _TBD_ | |

### Email-verification screen
| Element | Required hook | Status | Note |
|---|---|---|---|
| Heading | heading `Email verification` (confirmed) | _TBD_ | |
| Resend email field | textbox `/e-?mail/i` | _TBD_ | |
| Continue / resend button | button `Continue` | _TBD_ | |
| Verified-success copy | text confirming success | _TBD_ | |

### Shell-level (likely unchanged — confirm only)
| Element | Required hook | Status | Note |
|---|---|---|---|
| Cookie banner accept | button `/accept all cookies/i` | _TBD_ | unify casing across `LoginPage`/shared |
| Entry menu | `data-testid=PersonIcon` → menuitem `Log In | Sign Up` | _TBD_ | app shell, not auth card |
| Restricted-access page | heading `Access Restricted`; links `Sign in / Sign up`, `Return to Dashboard` | _TBD_ | |
| User menu / logout | avatar `User Menu`; menuitem `Sign out` | _TBD_ | |

## Gap Log (FR-008 / SC-007)

> Findings from the implementation pass (2026-06-01). These are not selector
> gaps (the CRD screens expose good accessible names/roles throughout) but
> behavior/dependency findings surfaced while aligning the suite.

| # | Screen / element | Finding | Proposed follow-up | Status in suite |
|---|---|---|---|---|
| 1 | Restricted-access → sign-in | `returnUrl` no longer honored: CRD redirects to `/home` instead of the originally requested page after signing in from the restricted prompt | Confirm with client-web whether returnUrl preservation is intended; if a regression, file upstream | Test re-asserts authenticated `/home`, annotated in `authentication-restricted-access.spec.ts` |
| 2 | Password recovery | Runs end-to-end via the **link** flow (test env). Two sub-findings: (a) the local **code** flow depends on `@alkemio/tests-lib` `getRecoveryCode`, which has a pre-existing bug (`lib/src/utils/emails.ts:53` returns an out-of-scope `const`) — lib is out of scope for feature 005; (b) CRD set-password rejects reusing the current password, so the old reuse-same-password idempotency no longer works | (a) Fix `getRecoveryCode` in a lib-scoped change to enable the local code branch; (b) handled in-test | Active: sets temp password then restores shared default in a `finally`; local code branch ready |
| 3 | Post-login shell | One-time "A fresh new Alkemio is here" dialog overlays the shell after sign-in. The suite opts **into** the new design ("Take me to the new design"), so the authenticated shell is the new CRD design: user menu = avatar/name button at end of header banner; logout = "Log out" (was "Sign out"); authenticated restricted page (`/restricted`) = "Go to Home" button (was "Return to Dashboard" link) | None needed (handled by `dismissNewLookDialog` + updated post-login selectors); informational | Handled in helpers + `common-authentication-page-elements.ts` |

**Selector-hook assessment:** No `GAP` rows. Every CRD auth screen inspected
(sign-in, sign-up, registration, recovery, verify, restricted) exposes stable
accessible names/roles or persistent labels sufficient for the suite — no
position-based or copy-fragile fallback was required.

**Reporting rule**: At verification, report the total count of `GAP` rows. A non-empty gap log does not block the alignment, but each gap must be visible and have a proposed follow-up — no gap may be hidden behind a position-based or copy-fragile selector.
