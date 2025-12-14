# Public Space - Non-Member Navigation Test Plan

## Application Overview

This test plan covers navigation and content access scenarios for **non-member users** within a **public space** on the Alkemio platform. A public space (`SpacePrivacyMode.Public`) allows all users to view its tabs and content regardless of their membership status.

### Scope

- **In Scope:** Non-member user navigation, content visibility, whiteboard access, lead profile access
- **Out of Scope:** Member navigation (covered by private space tests), content editing, membership application flows

### Test User Types

| User Type                  | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| Non-member (authenticated) | A logged-in user who is NOT a member of the public space |
| Non-member (anonymous)     | A user who is not logged in (guest)                      |

### Test Environment Setup

- **Seed file:** `seed-public-space.spec.ts`
- **Space configuration:** Public privacy mode with Applications membership policy
- **Space lead:** `TestUser.SPACE_ADMIN`
- **Space has:** Post collection callout, subspace with nested subspace

---

## Test Scenarios

## Automation Coverage Summary

- Summary: Implemented 18/21, Skipped 1/21, Missing 2/21
- Skipped: 5.3 (present but marked `test.skip`)
- Missing: 4.4, 6.2

By Section

- 1. Public Space Discovery and Access:
  - 1.1 Implemented in `non-member-tab-navigation.spec.ts`
  - 1.2 Implemented in `anonymous-user-access-public-space.spec.ts`
- 2. Space Tab Navigation for Non-Members:
  - 2.1–2.5 Implemented in `non-member-tab-navigation.spec.ts`
- 3. Whiteboard Access for Non-Members:
  - 3.1–3.4 Implemented in `non-member-whiteboard-access.spec.ts`
- 4. Space Lead Profile Access:
  - 4.1–4.3 Implemented in `non-member-lead-profile-access.spec.ts`
  - 4.4 Missing (anonymous lead profile access)
- 5. Subspace Navigation for Non-Members:
  - 5.1–5.2 Implemented in `non-member-subspace-navigation.spec.ts`
  - 5.3 Implemented in `non-member-subspace-navigation.spec.ts`
- 6. Edge Cases and Error Handling:
  - 6.1 Implemented in `non-member-edge-cases.spec.ts`
  - 6.2 Missing (navigate back from user profile)
  - 6.3 Implemented in `non-member-edge-cases.spec.ts`

### 1. Public Space Discovery and Access

**Seed:** `client-web/src/functional-e2e/seed-public-space.spec.ts`

#### 1.1 Non-Member Can Navigate to Public Space from Home

**Preconditions:**

- User is logged in as a non-member (e.g., `non.space@alkem.io`)
- Public space exists with content

**Steps:**

1. Navigate to the home page
2. Search for or browse to the public space
3. Click on the space card/link

**Expected Results:**

- Space landing page loads successfully
- Space name, tagline, and description are visible
- No "Space About" dialog is displayed, which is displayed when member has no read access to space

- Status: [x] Implemented in `non-member-tab-navigation.spec.ts` (test "1.1 Non-Member Can Navigate to Public Space from Home")

#### 1.2 Anonymous User Can Access Public Space via Direct URL

**Preconditions:**

- User is NOT logged in
- Public space URL is known

**Steps:**

1. Navigate directly to the public space URL (e.g., `/space/{space-name-id}`)

**Expected Results:**

- Space landing page loads without login prompt
- Space content is visible
- Login/Sign Up option remains available in navigation->profile

- Status: [x] Implemented in `anonymous-user-access-public-space.spec.ts` (test "1.2 Anonymous User Can Access Public Space via Direct URL")

---

### 2. Space Tab Navigation for Non-Members

**Seed:** `client-web/src/functional-e2e/seed-public-space.spec.ts`

#### 2.1 Non-Member Can View All Space Tabs

**Preconditions:**

- User is logged in as a non-member
- Navigated to public space

**Steps:**

1. Observe the space navigation tabs
2. Verify presence of standard tabs (Dashboard, Subspaces, Knowledge Base, Community, etc.)

**Expected Results:**

- All standard navigation tabs are visible
- Tabs are not grayed out or disabled
- No "Members Only" indicators on tabs

- Status: [x] Implemented in `non-member-tab-navigation.spec.ts` (test "2.1 Non-Member Can View All Space Tabs")

#### 2.2 Non-Member Can Navigate to Dashboard Tab

**Preconditions:**

- User is on the public space page

**Steps:**

1. Click on the "Dashboard" tab (or default landing tab)
2. Observe the dashboard content

**Expected Results:**

- Dashboard content loads successfully
- Recent activity or updates are visible (if any)
- Space description/context is displayed

- Status: [x] Implemented in `non-member-tab-navigation.spec.ts` (test "2.2 Non-Member Can Navigate to Dashboard Tab")

#### 2.3 Non-Member Can Navigate to Subspaces Tab

**Preconditions:**

- User is on the public space page
- Space has at least one subspace

**Steps:**

1. Click on the "Subspaces" tab
2. Observe the list of subspaces

**Expected Results:**

- Subspaces list is displayed
- Subspace cards show name, description preview
- Subspaces are clickable

- Status: [x] Implemented in `non-member-tab-navigation.spec.ts` (test "2.3 Non-Member Can Navigate to Subspaces Tab")

#### 2.4 Non-Member Can Navigate to Knowledge Base Tab

**Preconditions:**

- User is on the public space page

**Steps:**

1. Click on the "Knowledge Base" tab
2. Observe the callouts/content

**Expected Results:**

- Knowledge base content loads
- Callouts are visible (e.g., post collection callout)
- Content is readable (not blurred or hidden)

- Status: [x] Implemented in `non-member-tab-navigation.spec.ts` (test "2.4 Non-Member Can Navigate to Knowledge Base Tab")

#### 2.5 Non-Member Can Navigate to Community Tab

**Preconditions:**

- User is on the public space page

**Steps:**

1. Click on the "Community" tab
2. Observe the community members section

**Expected Results:**

- Community tab content loads
- Space leads section is visible
- Member list or member count is displayed

- Status: [x] Implemented in `non-member-tab-navigation.spec.ts` (test "2.5 Non-Member Can Navigate to Community Tab")

---

### 3. Whiteboard Access for Non-Members

**Seed:** `client-web/src/functional-e2e/seed-public-space.spec.ts`

> **Note:** Seed file needs to be updated to include `addWhiteboardCallout: true`

#### 3.1 Non-Member Can View Whiteboard Callout in Space

**Preconditions:**

- User is logged in as a non-member
- Space has a whiteboard callout configured
- Navigated to the Knowledge Base or relevant tab

**Steps:**

1. Locate the whiteboard callout card
2. Observe the whiteboard preview/thumbnail

**Expected Results:**

- Whiteboard callout is visible in the list
- Whiteboard title and description are shown
- "View" or "Open" action is available

- Status: [x] Implemented in `non-member-whiteboard-access.spec.ts` (test "3.1 Non-Member Can View Whiteboard Callout in Space")

#### 3.2 Non-Member Can Open and View Whiteboard Content

**Preconditions:**

- User is on the tab containing the whiteboard callout

**Steps:**

1. Click on the whiteboard callout card
2. Wait for the whiteboard to load
3. Observe the whiteboard content

**Expected Results:**

- Whiteboard opens in view mode (or full-screen modal)
- Whiteboard content (shapes, text, drawings) is visible
- Zoom and pan controls are functional
- User cannot edit the whiteboard (read-only mode)

- Status: [x] Implemented in `non-member-whiteboard-access.spec.ts` (test "3.2 Non-Member Can Open and View Whiteboard Content")

#### 3.3 Non-Member Cannot Edit Whiteboard in Public Space

**Preconditions:**

- User has opened a whiteboard in the public space

**Steps:**

1. Attempt to add a shape or text to the whiteboard
2. Attempt to modify existing elements

**Expected Results:**

- Edit controls are disabled or hidden
- No changes can be made to the whiteboard
- Appropriate message shown if edit is attempted (e.g., "View only" indicator)

- Status: [x] Implemented in `non-member-whiteboard-access.spec.ts` (test "3.3 Non-Member Cannot Edit Whiteboard (Read-Only Access)")

#### 3.4 Anonymous User Can View Whiteboard in Public Space

**Preconditions:**

- User is NOT logged in
- Direct URL to whiteboard or space is available

**Steps:**

1. Navigate to the public space
2. Open the whiteboard callout

**Expected Results:**

- Whiteboard content is visible without login
- Same read-only behavior as authenticated non-member

- Status: [x] Implemented in `non-member-whiteboard-access.spec.ts` (test "3.4 Anonymous User Can View Whiteboard Callout in Public Space")

---

### 4. Space Lead Profile Access

**Seed:** `client-web/src/functional-e2e/seed-public-space.spec.ts`

#### 4.1 Non-Member Can See Space Leads on Community Tab

**Preconditions:**

- User is logged in as a non-member
- Navigated to the public space Community tab
- Space has at least one lead (SPACE_ADMIN)

**Steps:**

1. Navigate to the Community tab
2. Locate the "Leads" or "Admins" section
3. Observe the lead profiles displayed

**Expected Results:**

- Leads section is visible
- Lead user cards show avatar, name
- Lead user cards are clickable

- Status: [x] Implemented in `non-member-lead-profile-access.spec.ts` (test "4.1 Non-Member Can See Space Leads Section on Community Tab")

#### 4.2 Non-Member Can Open Lead User Profile from Space

**Preconditions:**

- User is viewing the Community tab with leads visible

**Steps:**

1. Click on a space lead's avatar or name
2. Wait for the user profile page to load

**Expected Results:**

- User profile page opens successfully
- Profile shows user's public information (name, tagline, bio)
- Profile avatar is displayed
- No "Access Denied" message

- Status: [x] Implemented in `non-member-lead-profile-access.spec.ts` (test "4.2 Non-Member Can Open Lead Profile from Community Tab")

#### 4.3 Non-Member Can View Lead's Profile Details

**Preconditions:**

- User has navigated to a lead's profile page

**Steps:**

1. Observe the profile information displayed
2. Check for presence of: name, tagline, bio, skills, social links

**Expected Results:**

- User's display name is visible
- Tagline (if set) is visible
- Bio/About section is visible
- Skills/Keywords are displayed (if set)
- Social links are displayed (if set)

- Status: [x] Implemented in `non-member-lead-profile-access.spec.ts` (test "4.3 Non-Member Can View Lead's Profile Details")

#### 4.4 Anonymous User Can Access Lead Profile from Public Space

**Preconditions:**

- User is NOT logged in
- Navigated to the public space

**Steps:**

1. Navigate to the Community tab
2. Click on a space lead's profile

**Expected Results:**

- Profile page loads without login requirement
- Public profile information is accessible
- Login prompt does not block profile viewing

- Status: [ ] Not implemented (no anonymous lead profile test yet)

---

### 5. Subspace Navigation for Non-Members

**Seed:** `client-web/src/functional-e2e/seed-public-space.spec.ts`

#### 5.1 Non-Member Can Navigate into Public Subspace

**Preconditions:**

- User is on the parent space's Subspaces tab
- Subspace is also configured as public

**Steps:**

1. Click on a subspace card
2. Wait for the subspace page to load

**Expected Results:**

- Subspace landing page loads successfully
- Subspace tabs are visible and accessible
- Breadcrumb shows parent space > subspace hierarchy

- Status: [x] Implemented in `non-member-subspace-navigation.spec.ts` (test "5.1 Non-Member Can Navigate into Public Subspace")

#### 5.2 Non-Member Sees About Dialog When Accessing Private Sub-subspace

**Preconditions:**

- User is in a public subspace
- Sub-subspace exists but is NOT configured as public (default private)
- Non-member has `read_about` access but not full `read` access

**Steps:**

1. Navigate to the subspace's Subspaces tab
2. Observe that sub-subspace cards are visible
3. Click on a private sub-subspace card

**Expected Results:**

- Sub-subspace cards ARE visible in the list (not hidden)
- Clicking opens the "About Space" dialog (not the full space page)
- Dialog shows sub-subspace name, description, and basic info
- User cannot access the full sub-subspace tabs/content
- Dialog may include option to apply for membership (if applicable)

- Status: [x] Implemented in `non-member-subspace-navigation.spec.ts` (test "5.2 Non-Member Sees About Dialog When Accessing Private Sub-subspace")

#### 5.3 Non-Member Can View Subspace Community and Leads

**Preconditions:**

- User is in a public subspace

**Steps:**

1. Navigate to the subspace Community tab
2. Locate the leads section

**Expected Results:**

- Subspace leads are displayed (SUBSPACE_ADMIN)
- Lead profiles are clickable
- Community members are visible

- Status: [ ] Skipped in `non-member-subspace-navigation.spec.ts` (test is marked with `test.skip`)

---

### 6. Edge Cases and Error Handling

**Seed:** `client-web/src/functional-e2e/seed-public-space.spec.ts`

#### 6.1 Non-Member Sees Appropriate UI When Space Has No Content

**Preconditions:**

- User navigates to a public space with minimal content

**Steps:**

1. Navigate to each tab in the space
2. Observe empty state messages

**Expected Results:**

- Empty states are user-friendly (not error messages)
- No broken UI elements
- Navigation remains functional

- Status: [x] Implemented in `non-member-edge-cases.spec.ts` (test "6.1 Non-Member Sees Appropriate UI When Space Has Default Callout")

#### 6.2 Non-Member Can Navigate Back to Space from User Profile

**Preconditions:**

- User has navigated to a lead's profile from the public space

**Steps:**

1. Use browser back button or breadcrumb navigation
2. Return to the public space

**Expected Results:**

- User returns to the space successfully
- Space context is maintained
- No navigation errors

- Status: [ ] Not implemented as specified (related coverage: `non-member-edge-cases.spec.ts` has breadcrumb return from Subspace)

#### 6.3 Session Expiry Does Not Block Public Space Access

**Preconditions:**

- User was logged in and viewing public space
- Session expires or user logs out

**Steps:**

1. Continue browsing the public space after logout
2. Navigate between tabs

**Expected Results:**

- Public content remains accessible
- User is not forcefully redirected to login
- Private actions (if any) prompt for login

- Status: [x] Implemented in `non-member-edge-cases.spec.ts` (test "6.3 Session Expiry Does Not Block Public Space Access")

---

## Test Data Requirements

### Seed File Updates Required

The `seed-public-space.spec.ts` needs the following additions:

```typescript
collaboration: {
  addTutorialCallouts: false,
  addPostCollectionCallout: true,
  addWhiteboardCallout: true,  // ADD THIS
},
```

### Test Users

| User                     | Email                  | Role                                          |
| ------------------------ | ---------------------- | --------------------------------------------- |
| Non-member authenticated | `non.space@alkem.io`   | Platform user, not a member of the test space |
| Space Lead               | `space.admin@alkem.io` | Space admin/lead                              |
| Anonymous                | N/A                    | Not logged in                                 |

---

## Success Criteria

- [ ] All non-member navigation scenarios pass (pending 4.4, 5.3, 6.2)
- [x] Whiteboard viewing works for non-members
- [x] Lead profiles are accessible from public spaces (verified for non-members)
- [x] No access denied errors for public content (covered in 4.2 and others)
- [ ] Anonymous users have equivalent access to authenticated non-members (partial: community + whiteboard)
- [x] UI clearly indicates read-only/view-only mode where applicable (whiteboard)
