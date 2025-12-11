# Authentication Test Plan

## Overview

This document outlines the comprehensive test coverage for authentication flows in the Alkemio platform. The goal is to ensure critical authentication scenarios are covered without excessive redundancy that would lead to long test execution times.

## Test Location

- **Primary Test File**: `client-web/src/functional-e2e/authentication/authentication-flows.spec.ts`
- **Supporting Files**:
  - `login-page-objects.ts` - Navigation helpers
  - `../identity-flows/registration-page-objects.ts` - Registration helpers
  - `../identity-flows/signin-page-objects.ts` - Sign-in helpers
  - `../identity-flows/verify-page-objects.ts` - Verification helpers

---

## Current Test Coverage ✅

### 1. Page Element Verification

- ✅ **Registration page elements** - Verifies all required form fields (email, firstName, lastName, Next button)
- ✅ **Sign-up page elements** - Verifies terms acceptance page
- ✅ **Login page elements** - Verifies sign-in form
- ✅ **Verification page elements** - Verifies email verification form

### 2. Authentication Flows

- ✅ **User login** - Admin user successful authentication (`admin@alkem.io`)
- ✅ **User registration (full flow)** - Register → Verify email → Sign in → Welcome dashboard
- ⏭️ **User registration (skip)** - Alternative flow (currently skipped due to bug #8317)
- ✅ **Password recovery** - Forgot password → Recovery code via email → Reset password → Settings page

### 3. Email Verification

- ✅ **Verification page with send again** - Tests email resend functionality
- ✅ **Email verification in registration flow** - Full verification workflow

---

## Missing Test Coverage 🔴

### 1. Cookie Consent Persistence

**Priority**: HIGH
**Status**: NOT IMPLEMENTED

#### Scenarios:

- **Test 1.1**: Cookie consent banner appears on first visit

  - Navigate to platform as unauthenticated user
  - Verify cookie consent banner is visible
  - Accept cookies
  - Verify banner disappears

- **Test 1.2**: Cookie consent persists across sessions

  - Accept cookie consent
  - Refresh page
  - Verify banner does not appear again

- **Test 1.3**: Cookie consent rejection
  - Navigate to platform
  - Reject cookies
  - Verify appropriate cookies are NOT set
  - Verify platform still functional (with limitations)

---

### 2. Restricted Access & Redirects

**Priority**: HIGH
**Status**: NOT IMPLEMENTED

#### Scenarios:

##### 2.1 Unauthenticated Access to Restricted Pages

- **Test 2.1.1**: Access admin area without authentication

  - Navigate directly to `/admin/spaces` (unauthenticated)
  - Verify "Restricted Access" page is shown
  - Verify "Sign In" option is available

- **Test 2.1.2**: Access private space without authentication
  - Navigate directly to a private space URL (unauthenticated)
  - Verify redirect to sign-in page
  - Verify return URL is preserved

##### 2.2 Authenticated but Unauthorized Access

- **Test 2.2.1**: Regular user tries to access admin area

  - Sign in as regular user (`non.space@alkem.io`)
  - Navigate to `/admin/spaces`
  - Verify "No Access" page is shown
  - Verify automatic redirect to home dashboard

- **Test 2.2.2**: Sign in after restricted page attempt

  - Navigate to `/admin/spaces` (unauthenticated)
  - Click "Sign In" from restricted page
  - Sign in as regular user
  - Verify redirect to "No Access" page
  - Verify redirect to home dashboard

- **Test 2.2.3**: Admin user accesses admin area (positive test)
  - Sign in as global admin (`admin@alkem.io`)
  - Navigate to `/admin/spaces`
  - Verify admin interface is accessible

---

### 3. Logout Flow

**Priority**: MEDIUM
**Status**: NOT IMPLEMENTED

#### Scenarios:

- **Test 3.1**: User logout and session cleanup

  - Sign in as any user
  - Navigate to user menu
  - Click logout
  - Verify redirect to landing page
  - Verify user is logged out (try accessing protected page)

- **Test 3.2**: Logout and re-authentication
  - Sign in → Logout → Sign in again
  - Verify smooth re-authentication flow

---

### 4. Role-Based Authentication

**Priority**: MEDIUM
**Status**: PARTIAL (only admin tested)

#### Scenarios by Role (per agents.md personas):

##### 4.1 Global Admin (`admin@alkem.io`)

- ✅ **Login test exists**
- 🔴 Access to admin areas (not yet tested)

##### 4.2 Regular User (`non.space@alkem.io`)

- ✅ **Password recovery test exists**
- 🔴 Login flow (not explicitly tested)
- 🔴 Access restrictions (not tested)

##### 4.3 Space Admin / Facilitator

- 🔴 Login and access to space settings (not tested)
- 🔴 Access to own space vs other spaces (not tested)

##### 4.4 New User / Unauthenticated

- ✅ **Registration flow tested**
- 🔴 Public vs private content access (not tested)

---

### 5. Session Management

**Priority**: LOW (can be deferred)
**Status**: NOT IMPLEMENTED

#### Scenarios:

- Session timeout after inactivity
- Multiple tabs/windows session sharing
- Session refresh on activity

---

### 6. Error Handling

**Priority**: MEDIUM
**Status**: PARTIAL

#### Scenarios:

- **Test 6.1**: Invalid credentials

  - Sign in with wrong password
  - Verify error message

- **Test 6.2**: Non-existent user

  - Sign in with non-existent email
  - Verify appropriate error

- **Test 6.3**: Email already registered

  - Try to register with existing email
  - Verify error message

- **Test 6.4**: Invalid email format

  - Try to register with invalid email
  - Verify validation error

- **Test 6.5**: Weak password
  - Try to register with weak password
  - Verify password requirements message

---

## Recommended Implementation Priority

### Phase 1: Critical Flows (High Priority)

1. **Cookie consent persistence** (Tests 1.1, 1.2)
2. **Restricted redirects** (Tests 2.1.1, 2.2.1, 2.2.2)
3. **Logout flow** (Test 3.1)
4. **Error handling - invalid credentials** (Test 6.1)

### Phase 2: Role Coverage (Medium Priority)

5. **Regular user login** (Test 4.2)
6. **Admin area access** (Tests 2.2.3, 4.1)
7. **Error handling - registration errors** (Tests 6.3, 6.4, 6.5)

### Phase 3: Nice-to-Have (Low Priority)

8. **Cookie consent rejection** (Test 1.3)
9. **Logout and re-authentication** (Test 3.2)
10. **Space admin role tests** (Test 4.3)

---

## Test Data Requirements

### Users Required:

- `admin@alkem.io` - Global admin (existing)
- `non.space@alkem.io` - Regular user (existing)
- `test+{uniqueId}@alkem.io` - New registration (dynamically generated)
- Space admin user (to be determined)

### Test Spaces/Resources:

- Public space URL (for public access tests)
- Private space URL (for restricted access tests)
- Admin route: `/admin/spaces` (for admin access tests)

---

## Test Execution Strategy

### Serial vs Parallel:

- **Serial execution** for tests that share state (current: `test.describe.configure({ mode: 'serial' })`)
- Cookie-based tests should run serially
- Independent page verification tests can run in parallel

### Test Isolation:

- Each test clears cookies: `beforeEach(async ({ context }) => { await context.clearCookies(); })`
- Email cleanup: `await deleteMailSlurperMails();`

### Timeouts:

- Default: 5000ms (Playwright default)
- Extended: 30000ms for email-dependent tests
- Consider increasing for slow environments

---

## Success Criteria

A test scenario is considered complete when:

1. ✅ Test code is implemented
2. ✅ Page object helpers exist
3. ✅ Test passes consistently (3+ consecutive runs)
4. ✅ Error messages are meaningful
5. ✅ Test data is properly cleaned up
6. ✅ Execution time is reasonable (<5s for simple flows, <30s for email-dependent flows)

---

## Notes & Limitations

### Known Issues:

- Test "user successful registration email accept terms first" is skipped due to [bug #8317](https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/client-web/8317)

### Design Decisions:

- Registration form now requires all fields (email, firstName, lastName) to be filled before "Next" button is enabled
- Password recovery generates new recovery codes via email
- Email verification uses temporary verification codes

### Future Considerations:

- Social login testing (LinkedIn, Microsoft) - currently removed from element verification
- Two-factor authentication (if implemented)
- Account deletion/deactivation flows
- User profile updates affecting authentication

---

## Maintenance

**Last Updated**: December 11, 2025
**Reviewed By**: Development Team
**Next Review**: After major authentication feature changes
