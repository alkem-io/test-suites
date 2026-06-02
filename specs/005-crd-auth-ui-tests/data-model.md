# Phase 1 Data Model: Selector Inventory & Traceability

For a test-alignment feature, the "data model" is the set of test artifacts under change and their relationships. Two structures govern the work: the **Selector Inventory** (every locator to confirm/replace) and the **Traceability Matrix** (scenario → suite → requirement, ensuring no orphan and no coverage loss).

## Entities

### Selector Helper
A named, exported locator factory in a page-object module.
- **Fields**: name, module, current strategy, target CRD strategy, screen, status (`confirmed` | `replaced` | `gap`).
- **Validation rule** (SC-003): must resolve to **exactly one** element on its screen — no zero-match, no ambiguous multi-match.
- **State transitions**: `unverified → confirmed` (works as-is on CRD) | `unverified → replaced` (selector changed) | `unverified → gap` (no stable hook exists → logged in selector contract per FR-008).

### Navigation Helper
An exported function that drives multi-step movement between auth screens.
- **Fields**: name, module, entry point, step model, status.
- **Validation rule** (FR-003): reaches the intended CRD screen/step; reflects actual routing (URLs unchanged per FR-001).

### Test Scenario
An active Playwright `test(...)` case.
- **Fields**: title, suite file, user story, requirements covered, behavioral assertions (frozen).
- **Validation rule** (FR-004, SC-002): must remain present and active (not `.skip`); its assertions are unchanged (FR-005).

### Test Plan Document
`AUTHENTICATION_TEST_PLAN.md` — the coverage map.
- **Validation rule** (FR-007, SC-005): updated "Last Updated" date, full scenario list intact, selector-strategy changes noted.

## Selector Inventory

Status legend: `confirm` = verify works on CRD as-is; `replace` = expected to change; `gap?` = candidate FR-008 gap to watch.

### `common-authentication-page-elements.ts` (PRIMARY — shared)

| Helper | Current locator | Target CRD strategy | Likely action |
|---|---|---|---|
| `emailField` | `getByLabel('E-Mail *')` | `getByRole('textbox', { name: /e-?mail/i })` | replace (drop `" *"`) |
| `passwordField` | `getByLabel('Password *')` | `getByLabel('Password')` / role+name | replace |
| `firstNameField` | `getByLabel('First Name *')` | `getByLabel('First Name')` | replace |
| `lastNameField` | `getByLabel('Last Name *')` | `getByLabel('Last Name')` | replace |
| `recoveryCodeField` | `getByLabel('Recovery code *')` | confirm CRD label | replace |
| `signInButton` | `getByRole('button', { name: 'Sign in', exact: true })` | same | confirm |
| `signUpButton` | `getByRole('button', { name: 'Sign up', exact: true })` | same | confirm |
| `saveButton` | `getByRole('button', { name: 'Save' })` | confirm (settings/recovery) | confirm |
| `continueButton` | `getByRole('button', { name: 'Continue' })` | same | confirm |
| `nextButton` | `getByRole('button', { name: 'Next' })` | same | confirm |
| `termsCheckbox` | `locator('input[type="checkbox"]')` | `getByRole('checkbox', { name: /terms/i })` | replace (de-genericise) |
| `githubButton` | `locator('button[value="github"]')` | `getByRole('button', { name: /github/i })` | replace |
| `microsoftButton` | `locator('button[value="microsoft"]')` | `getByRole('button', { name: /connect with microsoft/i })` | replace |
| `linkedinButton` | `locator('button[value="linkedin"]')` | `getByRole('button', { name: /connect with linkedin/i })` | replace |
| `signInLink` / `signUpLink` | `getByRole('link', { name: /sign in\|sign up/i })` | confirm | confirm |
| `privacyLink` / `termsLink` | `getByRole('link', { name: /privacy\|terms/i })` | confirm | confirm |
| `forgotPasswordLink` | `getByRole('link', { name: /forgot password/i })` | confirm | confirm |
| `signInSignUpLink` / `returnToDashboardLink` | restricted-page links (shell) | confirm | confirm (shell, likely unchanged) |
| `logoutMenuItem` / `userMenuAvatar` | app-shell menu | confirm | confirm (post-auth shell) |
| `signInHeading` | `getByRole('heading', { name: 'Sign in' })` | confirm CRD title | confirm/replace |
| `accessRestrictedHeading` / `welcomeHeading` | shell | confirm | confirm |
| `cookieConsentBanner` | `getByText('By clicking "Accept All Cookies"…')` | anchor on accept button instead | replace (brittle copy) |
| `acceptAllCookiesButton` | `getByRole('button', { name: 'Accept All Cookies' })` | confirm (note casing vs fixture's `Accept all cookies`) | confirm + unify casing |

### `identity-flows/*` page objects

| Module | Inline locators to confirm/replace |
|---|---|
| `signin-page-objects.ts` | heading `/sign in/i`; provider buttons (via shared) — **consolidate with `-fixed`** |
| `signin-page-objects-fixed.ts` | `getByText('No account?')`, `Connect with LinkedIn/Microsoft` — **merge into canonical, then delete** |
| `registration-page-objects.ts` | heading `'Sign up'`; `input[type="email"]`; `getByLabel('First Name')`/`'Last Name'` (no asterisk — inconsistent with shared helpers, unify); success page `'Nearly there…'`, `'The last step is to verify'`, `'…or continue to the platform'`, `'Sign in here'` |
| `signup-page-objects.ts` | heading `'Sign up'`; `termsCheckbox` not-checked; `nextButton` disabled; body contains `'Terms'` |
| `verify-page-objects.ts` | heading `'Email verification'`, `'To receive a new verification'`; `getByLabel('E-Mail *')`; `Continue` button |

### `space/pages/LoginPage.ts` (DOWNSTREAM — SC-004)

| Step | Current locator | Action |
|---|---|---|
| open menu | `getByTestId('PersonIcon')` | confirm (app shell) |
| menu item | `getByRole('menuitem', { name: 'Log In \| Sign Up' })` | confirm |
| email | `getByRole('textbox', { name: 'E-Mail' })` | unify with `emailField` strategy |
| password | `getByRole('textbox', { name: 'Password' })` | unify with `passwordField` |
| submit | `getByRole('button', { name: 'Sign in', exact: true })` | confirm |
| cookies | `getByRole('button', { name: 'Accept All Cookies' })` | confirm + unify casing |

### Inline locators inside `*.spec.ts` (frozen assertions; locator-only edits permitted)

| Suite | Inline locator |
|---|---|
| `authentication-login.spec.ts` | error regex `/email address or password.*invalid/i`; logout sign-in option `name: /sign up\|sign in/i` |
| `authentication-registration.spec.ts` | verification-pending copy; `link 'Continue'`; heading `'Sign in'`; `text 'You successfully verified'` |
| `authentication-password-recovery.spec.ts` | `link 'Forgot password?'`; heading `'User Settings'`; dashboard `Invitations` / `My Account` / `Create my own Space` |
| `authentication-page-verification.spec.ts` | delegates to identity-flows verifiers (no direct auth locators beyond shared) |

## Traceability Matrix (scenario → suite → user story → requirements)

| Scenario | Suite file | Story | Requirements |
|---|---|---|---|
| Admin login | login | US1 (P1) | FR-001, FR-002, FR-005, SC-001/SC-004/SC-006 |
| Regular-user login | login | US1 | FR-001, FR-002, FR-005 |
| Invalid credentials error | login | US1 | FR-002, FR-005, SC-006 |
| Logout clears session | login | US1 | FR-002, FR-005 |
| Logout + re-authenticate | login | US1 | FR-002, FR-005 |
| Sign-in page elements | page-verification | US1 | FR-002, FR-006, SC-003 |
| Registration + email verify | registration | US2 (P2) | FR-002, FR-003, FR-005, SC-001 |
| Registration alt path (`skip` #8317) | registration | US2 | FR-009 (compile-only; stays skipped) |
| Sign-up / registration / verify page elements | page-verification | US2 | FR-002, FR-006, SC-003 |
| Verify-page resend elements | page-verification | US2 | FR-002, FR-006 |
| Password recovery (code + link) | password-recovery | US3 (P3) | FR-002, FR-003, FR-005 |
| Cookie consent appears/persist (×4) | cookie-consent | US3 | FR-002, FR-005 (shell-level) |
| Restricted access + redirects (×5) | restricted-access | US3 | FR-002, FR-005 (shell-level) |
| Page objects + test plan reflect CRD | (page objects + doc) | US4 (P3) | FR-003, FR-007, FR-008, SC-005/SC-007 |

**Invariant**: every active scenario above maps to ≥1 requirement, and every requirement FR-001…FR-011 is exercised by ≥1 scenario or by the US4 documentation/consolidation work — no orphans (Constitution I).
