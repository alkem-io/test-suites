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

> Record each `GAP` here as it is found. Empty at planning time.

| # | Screen / element | Why no stable hook | Proposed follow-up | Interim selector used |
|---|---|---|---|---|
| _(none yet)_ | | | | |

**Reporting rule**: At verification, report the total count of `GAP` rows. A non-empty gap log does not block the alignment, but each gap must be visible and have a proposed follow-up — no gap may be hidden behind a position-based or copy-fragile selector.
