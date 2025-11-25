# Home Page Menus - Test Plan

## Application Overview

The Alkemio Home Page serves as the central hub for users, providing access to their dashboard, spaces, activities, and various tools. This test plan focuses on verifying the functionality and content of the navigation menus available on the home page.

## Test Scenarios

### 1. Top Navigation Bar - Tools Menu

**Seed:** `client-web/src/functional-e2e/seed-minimal.spec.ts`

#### 1.1 Verify Tools Menu Content

**Steps:**

1. Navigate to the Home Page.
2. Click on the "Tools Menu" button (grid icon) in the top navigation bar.

**Expected Results:**

- The Tools Menu dropdown appears.
- The following menu items are visible:
  - Template Library
  - Alkemio Forum
  - Explore Spaces
  - Find contributors
  - Powered by Alkemio
  - Exit menu

#### 1.2 Verify "Template Library" Navigation

**Steps:**

1. Open the "Tools Menu".
2. Click on "Template Library".

**Expected Results:**

- User is navigated to the Template Library page (`/innovation-library`).
- The page title or header confirms "Alkemio's Template Library".

#### 1.3 Verify "Alkemio Forum" Navigation

**Steps:**

1. Open the "Tools Menu".
2. Click on "Alkemio Forum".

**Expected Results:**

- User is navigated to the Alkemio Forum page (`/forum`).
- The page title or header confirms "Welcome to the Alkemio Forum".

#### 1.4 Verify "Explore Spaces" Navigation

**Steps:**

1. Open the "Tools Menu".
2. Click on "Explore Spaces".

**Expected Results:**

- User is navigated to the Explore Spaces page (`/spaces`).
- The page title or header confirms "Explore Spaces".

#### 1.5 Verify "Find contributors" Navigation

**Steps:**

1. Open the "Tools Menu".
2. Click on "Find contributors".

**Expected Results:**

- User is navigated to the Find Contributors page (`/contributors`).
- The page title or header confirms "Find talent and expertise!".

#### 1.6 Verify "Powered by Alkemio" Link

**Steps:**

1. Open the "Tools Menu".
2. Click on "Powered by Alkemio".

**Expected Results:**

- User is navigated to the Home page (`/home`).

### 2. Top Navigation Bar - User Menu

**Seed:** `client-web/src/functional-e2e/seed-minimal.spec.ts`

#### 2.1 Verify User Menu Content

**Steps:**

1. Navigate to the Home Page.
2. Click on the User Avatar in the top navigation bar.

**Expected Results:**

- The User Menu dropdown appears.
- The user's name and role (e.g., Global Admin) are displayed at the top.
- The following menu items are visible:
  - My Dashboard
  - My profile
  - My Account
  - My Pending Memberships
  - Administration (if user is admin)
  - Change language
  - Get help
  - Sign out
  - Exit menu

#### 2.2 Verify "My Dashboard" Navigation

**Steps:**

1. Open the User Menu.
2. Click on "My Dashboard".

**Expected Results:**

- User is navigated to their Dashboard (Home Page).

#### 2.3 Verify "My profile" Navigation

**Steps:**

1. Open the User Menu.
2. Click on "My profile".

**Expected Results:**

- User is navigated to their Profile page.

#### 2.4 Verify "My Account" Navigation

**Steps:**

1. Open the User Menu.
2. Click on "My Account".

**Expected Results:**

- User is navigated to their Account Settings page.

#### 2.5 Verify "Sign out" Functionality

**Steps:**

1. Open the User Menu.
2. Click on "Sign out".

**Expected Results:**

- User is logged out.
- User is redirected to the Login/Landing page.

### 3. Left Sidebar Menu

**Seed:** `client-web/src/functional-e2e/seed-minimal.spec.ts`

#### 3.1 Verify Sidebar Menu Items

**Steps:**

1. Navigate to the Home Page.
2. Observe the left sidebar menu.

**Expected Results:**

- The following items are visible and clickable:
  - Invitations
  - My Latest Activity
  - Latest Activity In My Spaces
  - Tips & Tricks
  - My Account
  - Create my own Space
  - Activity View (Checkbox)

#### 3.2 Verify "Invitations" Navigation

**Steps:**

1. Click on "Invitations" in the sidebar.

**Expected Results:**

- The main content area updates to show Invitations.

#### 3.3 Verify "My Latest Activity" Navigation

**Steps:**

1. Click on "My Latest Activity" in the sidebar.

**Expected Results:**

- The main content area updates to show the user's latest activity.

#### 3.4 Verify "Latest Activity In My Spaces" Navigation

**Steps:**

1. Click on "Latest Activity In My Spaces" in the sidebar.

**Expected Results:**

- The main content area updates to show activity from the user's spaces.

#### 3.5 Verify "Tips & Tricks" Navigation

**Steps:**

1. Click on "Tips & Tricks" in the sidebar.

**Expected Results:**

- The main content area updates to show Tips & Tricks.

#### 3.6 Verify "Create my own Space" Link

**Steps:**

1. Click on "Create my own Space" in the sidebar.

**Expected Results:**

- User is navigated to the "Want to own a space" page (external link).

#### 3.7 Verify "Activity View" Toggle

**Steps:**

1. Click on the "Activity View" checkbox in the sidebar.

**Expected Results:**

- The view of the activity feed changes (toggles between different views).
