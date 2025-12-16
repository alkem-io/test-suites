# Space Applications Management Test Suite

This directory contains end-to-end tests for the Space Applications Management feature, organized by space hierarchy level.

## Test Structure

The test suite is organized into 4 main test files based on the reorganized test plan:

### 1. Level 0 (Space) Tests - `level-0-space.spec.ts`

Tests for root-level space applications management.

**Coverage:**

- Space Discovery and Privacy Indicators (2 tests)
- Application Submission (2 tests)
- Admin Notifications (2 tests)
- Application Review (1 test for admin access)

**Total: ~7 scenarios**

### 2. Level 1 (Subspace) Tests - `level-1-subspace.spec.ts`

Tests for subspace applications management with simplified review testing.

**Coverage:**

- Level 1 Discovery (2 tests)
- Application Submission (1 test)
- Admin Notifications (3 tests)
- Application Review - Simplified (3 tests for access and button visibility only)

**Total: ~9 scenarios**

### 3. Level 2 (Subsubspace) Tests - `level-2-subsubspace.spec.ts`

Tests for subsubspace applications management with simplified review testing.

**Coverage:**

- Level 2 Discovery (2 tests)
- Application Submission (1 test)
- Admin Notifications (4 tests)
- Application Review - Simplified (3 tests for access and button visibility only)

**Total: ~10 scenarios**

### 4. Cross-Level Tests - `cross-level.spec.ts`

Tests that span multiple space levels or test edge cases.

**Coverage:**

- Applicant Notifications (3 tests)
- Edge Cases and Error Handling (6 tests)
- UI/UX Validation (4 tests)

**Total: ~13 scenarios**

## Seed File

**`seed-applications.spec.ts`** - Sets up the test environment with:

- 3-level space hierarchy (Space → Subspace → Subsubspace)
- Privacy mode: Private at all levels
- Membership policy: Applications at all levels
- Configured test users:
  - `SPACE_ADMIN` (Level 0 admin)
  - `SPACE_MEMBER` (Level 0 member only)
  - `SUBSPACE_ADMIN` (Level 1 admin)
  - `SUBSPACE_MEMBER` (Level 1 member only)
  - `SUBSUBSPACE_ADMIN` (Level 2 admin)
  - `SUBSUBSPACE_MEMBER` (Level 2 member only)
  - `NON_SPACE_MEMBER` (not a member of any space)

## Important Visibility Rules

### Parent-Only Visibility Model

Subspaces are only visible to **direct members of their parent space**:

- **Non-members**: Can see only Level 0 (root spaces)
- **Level 0 members**: Can see Level 0 + Level 1 (NOT Level 2)
- **Level 1 members**: Can see Level 1 + Level 2 (NOT Level 0 unless also members)
- **Level 2 members**: Can see Level 2 only (unless also members of parent levels)

### Membership Non-Inheritance

Membership at one level does **NOT** grant membership at child or parent levels:

- Must apply and be approved separately for each level
- Being a Level 0 member does NOT make you a Level 1 or Level 2 member
- Being approved for Level 1 does NOT automatically approve you for Level 0

## Test Data

Each level uses specific questionnaire responses:

- **Level 0**:

  - Q1: "I am interested in collaborating on this space"
  - Q2: "5 years of experience in the field"

- **Level 1**:

  - Q1: "Interested in Level 1 collaboration"
  - Q2: "Relevant Level 1 experience"

- **Level 2**:
  - Q1: "Interested in Level 2 work"
  - Q2: "Level 2 expertise"

## Running the Tests

### Run all application tests:

```bash
npx playwright test src/functional-e2e/applications
```

### Run specific test suite:

```bash
npx playwright test src/functional-e2e/applications/level-0-space.spec.ts
npx playwright test src/functional-e2e/applications/level-1-subspace.spec.ts
npx playwright test src/functional-e2e/applications/level-2-subsubspace.spec.ts
npx playwright test src/functional-e2e/applications/cross-level.spec.ts
```

### Run with UI mode for debugging:

```bash
npx playwright test src/functional-e2e/applications --ui
```

### Run in headed mode:

```bash
npx playwright test src/functional-e2e/applications --headed
```

## Test Plan Reference

Full test plan: `test-plan-applications-reorganized.md`

The test plan contains 42 detailed scenarios organized by level with:

- Step-by-step test procedures
- Expected results for each step
- User roles and permissions
- Visibility and membership rules

## Notes

- Level 1 and Level 2 application review tests are simplified to only verify admin access and button visibility
- Full workflow testing (approve, reject, delete) is only performed at Level 0
- This structure reduces redundancy while maintaining comprehensive coverage of the applications feature
- Some edge case tests (concurrent review, network errors) are placeholder tests that verify basic access rather than full scenarios
