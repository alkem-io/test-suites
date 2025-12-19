# Space Applications Management - Test Plan v2

## Application Overview

The Alkemio platform provides a multi-level space hierarchy (Space → Subspace → Subsubspace) with application-based membership. The application workflow allows non-members to apply for membership, complete questionnaires, and have their applications reviewed by space administrators with inherited permissions.

**Key Features:**

- **3-Level Space Hierarchy**: Level 0 (Space), Level 1 (Subspace), Level 2 (Subsubspace)
- **Privacy Indicators**: Lock icons indicate private spaces
- **Application Workflow**: Apply → Answer Questions → Review → Approve/Reject/Delete
- **Inherited Admin Permissions**: Admin rights cascade down the hierarchy
- **Notification System**: Real-time notifications for applicants and reviewers
- **Application Management**: View questionnaires, approve, reject, or delete applications

**User Roles:**

- **Applicant**: `${TestUser.NON_SPACE_MEMBER}@alkem.io` - Non-member applying to spaces
- **Level 0 Member**: `${TestUser.SPACE_MEMBER}@alkem.io` - Member of Level 0 only
- **Level 1 Member**: `${TestUser.SUBSPACE_MEMBER}@alkem.io` - Member of Level 1 only
- **Level 2 Member**: `${TestUser.SUBSUBSPACE_MEMBER}@alkem.io` - Member of Level 2 only
- **Level 0 Admin**: `${TestUser.SPACE_ADMIN}@alkem.io` - Admin of all 3 levels
- **Level 1 Admin**: `${TestUser.SUBSPACE_ADMIN}@alkem.io` - Admin of Level 1 & 2
- **Level 2 Admin**: `${TestUser.SUBSUBSPACE_ADMIN}@alkem.io` - Admin of Level 2 only

**Navigation Elements:**

- **Settings Access**: Cog icon in subheader navigation menu
- **Notifications**: Bell icon in upper right corner
- **Community Tab**: Subnavigation within settings
- **Subspaces Section**: Found in subheader navigation on space pages

**Important:**

- **Subspace Visibility**: Subspaces are only visible to **direct members of their parent space**. This means:
  - Non-members can only see Level 0 (root) spaces
  - Level 0 members can see Level 1 subspaces (but NOT Level 2)
  - Level 1 members can see Level 2 subsubspaces (but nothing deeper)
  - Once a user is a member of a space, they can find its direct child subspaces under the `Subspaces` section in the subheader navigation on the space page.
- **Membership is NOT Inherited**: Being a member of a space does NOT automatically make you a member of its child spaces (subspaces). Users must apply separately to each level and have their application approved by an admin for that specific space level. For example, being a member of Level 0 (Space) allows you to see Level 1 (Subspace) cards, but you still need to apply and be approved to become a member of Level 1.

---

## Test Scenarios

**Seed:** `./client-web/src/functional-e2e/applications/seed-applications.spec.ts`

**Test Optimization Notes:**

- For improved performance, sign in users once in `test.beforeAll()` or `test.beforeEach()` hooks and reuse the authenticated browser page/context across multiple tests within the same describe block, rather than signing in separately for each test.
- Tests should create the base scenario using `TestScenarioFactory.createBaseScenario()` in `test.beforeAll()` and use the returned `baseScenario` object to access dynamic space properties (e.g., `baseScenario.space.about.profile.displayName`, `baseScenario.space.nameId`) instead of hardcoded values.
- Remember to clean up the scenario in `test.afterAll()` using `TestScenarioFactory.cleanUpBaseScenario(baseScenario)`.

---

## Level 0 (Space) Test Suite

### 1. Space Discovery and Privacy Indicators

#### 1.1 Submit Application to Level 0 Space

**Prerequisites:**

- User is already signed in as `${TestUser.NON_SPACE_MEMBER}@alkem.io` (reuse authenticated page from previous test)

**Steps:**

1. Navigate to Level 0 Space About page (use `baseScenario.space.nameId`)
2. Locate and click the "Apply" button
3. Verify questionnaire modal/form appears
4. Fill in questionnaire fields with test data:
   - Answer all required questions
   - Example: "I am interested in collaborating on this space"
5. Submit the application
6. Verify success confirmation appears (popup/notification)
7. Verify the Apply button is replaced with "Application Pending" or similar status message

**Expected Results:**

- Apply button is clickable on the About page
- Questionnaire modal/form opens upon clicking Apply
- All form fields are accessible and editable
- Submit button becomes enabled after filling required fields
- Success confirmation popup/notification appears after submission
- Original Apply button is no longer visible
- Page displays "Application Pending" or similar status indicator
- User cannot submit duplicate application to the same space

#### 1.2 View Pending Applications as Space Admin

**Prerequisites:**

- An application has been submitted to Level 0 Space (from test 1.1)

**Steps:**

1. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
2. Navigate to home page
3. Click on the Level 0 Space card to navigate to the space page
4. Locate and click the space settings icon (cog icon from Material UI)
5. Verify navigation to space settings page
6. Under the div with `data-testid="space-settings"`, locate and click the "Community" tab
7. Verify "Pending applications & invitations" section is visible
8. Verify the submitted application from test 1.2 appears in the list

**Expected Results:**

- Space admin can access the space page
- Settings cog icon is visible and clickable
- Settings page displays with `data-testid="space-settings"`
- Community tab is visible and accessible
- "Pending applications & invitations" section displays
- Previously submitted application is visible in the pending list
- Application shows relevant details (applicant name, submission date, etc.)

---

### 2. Application Management

#### 2.1 Reject Application to Level 0 Space

**Prerequisites:**

- Two authenticated browser pages:
  - Non-space member: `${TestUser.NON_SPACE_MEMBER}@alkem.io`
  - Space admin: `${TestUser.SPACE_ADMIN}@alkem.io`

**Steps:**

1. **As Non-Space Member:**

   - Navigate to home page
   - Click on the Level 0 Space card
   - Click the "Apply" button
   - Fill in the required questionnaire fields with test data
   - Submit the application
   - Verify success confirmation appears

2. **As Space Admin:**

   - Navigate to home page
   - Click on the Level 0 Space card to navigate to the space page
   - Click the space settings icon (cog icon)
   - Click the "Community" tab under `data-testid="space-settings"`
   - Locate the pending application from the non-space member in "Pending applications & invitations"
   - Click on the application to view details or locate the reject action
   - Click the "Reject" button/action for the application
   - Verify rejection confirmation (dialog/notification)
   - Confirm the rejection action
   - Verify the application is removed from the pending list or marked as rejected

3. **Verify Notification as Non-Space Member:**
   - Navigate to home page
   - Click the notifications bell icon (button with aria-label "Notifications Button")
   - Verify notification modal/panel appears
   - Verify the notification contains text indicating the application was declined

**Expected Results:**

- Non-space member can successfully submit an application
- Space admin can view the pending application in Community settings
- Reject action/button is visible and accessible for the application
- Rejection confirmation dialog appears when rejecting
- After confirmation, the application is removed from pending list
- Application no longer appears in the pending applications list
- Non-space member receives a notification about the declined application
- Notification bell icon is accessible and clickable
- Notification panel displays with the declined application message
- Non-space member can still see "Apply" button to reapply if desired

#### 2.2 Archive Application to Level 0 Space

**Prerequisites:**

- Two authenticated browser pages:
  - Non-space member: `${TestUser.NON_SPACE_MEMBER}@alkem.io`
  - Space admin: `${TestUser.SPACE_ADMIN}@alkem.io`

**Steps:**

1. **As Non-Space Member:**

   - Navigate to home page
   - Click on the Level 0 Space card
   - Click the "Apply" button
   - Fill in the required questionnaire fields with test data
   - Submit the application
   - Verify success confirmation appears

2. **As Space Admin:**

   - Navigate to home page
   - Click on the Level 0 Space card to navigate to the space page
   - Click the space settings icon (cog icon)
   - Click the "Community" tab under `data-testid="space-settings"`
   - Locate the pending application from the non-space member in "Pending applications & invitations"
   - Click on the application to view details or locate the archive/delete action
   - Click the "Delete" button/action for the application (archives the application)
   - Verify archive confirmation (dialog/notification)
   - Confirm the archive action
   - Verify the application is removed from the pending list

3. **Verify Notification as Non-Space Member:**
   - Navigate to home page
   - Click the notifications bell icon (button with aria-label "Notifications Button")
   - Verify notification modal/panel appears
   - Verify the notification contains text indicating the application was declined

**Expected Results:**

- Non-space member can successfully submit an application
- Space admin can view the pending application in Community settings
- Delete/Archive action/button is visible and accessible for the application
- Archive confirmation dialog appears when deleting
- After confirmation, the application is removed from pending list
- Application no longer appears in the pending applications list
- Non-space member receives a notification about the declined application
- Notification bell icon is accessible and clickable
- Notification panel displays with the declined application message
- Non-space member can still see "Apply" button to reapply if desired

#### 2.3 View and Approve Application to Level 0 Space

**Prerequisites:**

- Two authenticated browser pages:
  - Non-space member: `${TestUser.NON_SPACE_MEMBER}@alkem.io`
  - Space admin: `${TestUser.SPACE_ADMIN}@alkem.io`

**Steps:**

1. **As Non-Space Member:**

   - Navigate to home page
   - Click on the Level 0 Space card
   - Click the "Apply" button
   - Fill in the required questionnaire fields with test data
   - Submit the application
   - Verify success confirmation appears

2. **As Space Admin:**

   - Navigate to home page
   - Click on the Level 0 Space card to navigate to the space page
   - Click the space settings icon (cog icon)
   - Click the "Community" tab under `data-testid="space-settings"`
   - Locate the pending application from the non-space member in "Pending applications & invitations"
   - Click the "View" button (Material UI eye icon - `VisibilityOutlinedIcon`) for the application
   - Verify questionnaire answers modal appears
   - Review the questionnaire responses submitted by the applicant
   - Locate the "Approve" button at the bottom of the modal
   - Click the "Approve" button
   - Verify the modal closes
   - Verify the application status changes to "Application Approved"

3. **Verify Notification as Non-Space Member:**
   - Navigate to home page
   - Click the notifications bell icon (button with aria-label "Notifications Button")
   - Verify notification modal/panel appears
   - Verify the notification contains "Welcome to the community" message

**Expected Results:**

- Non-space member can successfully submit an application
- Space admin can view the pending application in Community settings
- View/Eye icon button is visible and accessible for the application
- Clicking the view button opens a modal displaying questionnaire answers
- Modal shows all questions and the applicant's responses
- Modal has "Approve" and possibly other action buttons at the bottom
- Approve button is clickable
- After approval, the modal closes automatically
- Application status changes to "Application Approved" in the list
- Non-space member receives a "Welcome to the community" notification
- Notification bell icon is accessible and clickable
- Notification panel displays with the welcome message
- Non-space member becomes a member of the space
- Space card/page reflects the user's new membership status

#### 2.4 View and Reject Application to Level 0 Space

**Prerequisites:**

- Two authenticated browser pages:
  - Non-space member: `${TestUser.NON_SPACE_MEMBER}@alkem.io`
  - Space admin: `${TestUser.SPACE_ADMIN}@alkem.io`

**Steps:**

1. **As Non-Space Member:**

   - Navigate to home page
   - Click on the Level 0 Space card
   - Click the "Apply" button
   - Fill in the required questionnaire fields with test data
   - Submit the application
   - Verify success confirmation appears

2. **As Space Admin:**

   - Navigate to home page
   - Click on the Level 0 Space card to navigate to the space page
   - Click the space settings icon (cog icon)
   - Click the "Community" tab under `data-testid="space-settings"`
   - Locate the pending application from the non-space member in "Pending applications & invitations"
   - Click the "View" button (Material UI eye icon - `VisibilityOutlinedIcon`) for the application
   - Verify questionnaire answers modal appears
   - Review the questionnaire responses submitted by the applicant
   - Locate the "Reject" button at the bottom of the modal
   - Click the "Reject" button
   - Verify rejection confirmation dialog appears (if applicable)
   - Confirm the rejection action if needed
   - Verify the modal closes
   - Verify the application status changes to "Application Rejected"

3. **Verify Notification as Non-Space Member:**
   - Navigate to home page
   - Click the notifications bell icon (button with aria-label "Notifications Button")
   - Verify notification modal/panel appears
   - Verify the notification contains text indicating the application was declined

**Expected Results:**

- Non-space member can successfully submit an application
- Space admin can view the pending application in Community settings
- View/Eye icon button is visible and accessible for the application
- Clicking the view button opens a modal displaying questionnaire answers
- Modal shows all questions and the applicant's responses
- Modal has "Reject" and possibly other action buttons at the bottom
- Reject button is clickable
- Rejection confirmation may appear (implementation-dependent)
- After rejection, the modal closes automatically
- Application status changes to "Application Rejected" in the list
- Non-space member receives a notification about the declined application
- Notification bell icon is accessible and clickable
- Notification panel displays with the declined application message
- Non-space member can still see "Apply" button to reapply if desired

#### 2.5 Approve Application Directly from Data Grid

**Prerequisites:**

- Two authenticated browser pages:
  - Non-space member: `${TestUser.NON_SPACE_MEMBER}@alkem.io`
  - Space admin: `${TestUser.SPACE_ADMIN}@alkem.io`

**Steps:**

1. **As Non-Space Member:**

   - Navigate to home page
   - Click on the Level 0 Space card
   - Click the "Apply" button
   - Fill in the required questionnaire fields with test data
   - Submit the application
   - Verify success confirmation appears

2. **As Space Admin:**

   - Navigate to home page
   - Click the notifications bell icon (button with aria-label "Notifications Button")
   - Verify notification panel appears
   - Verify the notification contains text about a new application being received
   - Click on the new application notification
   - Verify navigation to the space settings community page
   - Locate the pending application from the non-space member in "Pending applications & invitations"
   - Click the "Approve" button (Material UI check circle icon - `CheckCircleOutlinedIcon`) directly from the data grid
   - Verify the application status changes to "Application Approved"

3. **Verify Notification as Non-Space Member:**
   - Navigate to home page
   - Click the notifications bell icon (button with aria-label "Notifications Button")
   - Verify notification modal/panel appears
   - Verify the notification contains "Welcome to the community" message

**Expected Results:**

- Non-space member can successfully submit an application
- Space admin receives a notification about the new application
- Notification bell icon is accessible and clickable on the home page
- Notification panel displays with the new application message
- Clicking the notification navigates directly to the space settings community page
- Space admin can view the pending application in Community settings
- Approve/Check circle icon button is visible and accessible directly in the data grid row
- Clicking the approve button directly approves the application without opening a modal
- Application status changes to "Application Approved" in the list
- Non-space member receives a "Welcome to the community" notification
- Notification bell icon is accessible and clickable for the applicant
- Notification panel displays with the welcome message for the applicant
- Non-space member becomes a member of the space
- Space card/page reflects the user's new membership status

---

## Level 1 (Subspace) Test Suite

### 1. Subspace Discovery and Privacy Indicators

#### 1.1 View Private Level 1 Subspace Card as Non-Member

**Prerequisites:**

- User must be a member of the Level 0 (parent) Space to see Level 1 Subspaces

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io` (non-member who becomes Level 0 member first)
2. Navigate to the Level 0 Space page (use `baseScenario.space.nameId`)
3. Click on the "Subspaces" section in the subheader navigation
4. Locate the Level 1 Subspace card
5. Verify the card displays:
   - Subspace information (name, description, banner/avatar)
   - Lock icon (Material UI `LockOutlinedIcon` - verify using `data-testid="LockOutlinedIcon"`)
6. Click on the subspace card
7. Verify navigation to the subspace About page (URL pattern: `/{spaceNameId}/challenges/{subspaceNameId}`)
8. Verify the About page displays:
   - Subspace details and information
   - Apply button or prompt to apply for membership

**Expected Results:**

- Level 1 Subspace card is visible in the Subspaces section
- Lock icon (`LockOutlinedIcon`) is clearly displayed on the card
- Card contains subspace information (display name, tagline, visual elements)
- Clicking the card navigates to the subspace About page with correct URL pattern
- About page shows subspace information and prompts non-member to apply
- Apply button is visible and accessible

#### 1.2 Submit Application to Level 1 Subspace

**Prerequisites:**

- User is already signed in as `${TestUser.NON_SPACE_MEMBER}@alkem.io` (reuse authenticated page from previous test)
- User is a member of Level 0 Space but not Level 1 Subspace

**Steps:**

1. Navigate to Level 1 Subspace About page (use `baseScenario.space.nameId` and `baseScenario.subspace.nameId`)
   - URL pattern: `/{spaceNameId}/challenges/{subspaceNameId}/about`
2. Locate and click the "Apply" button
3. Verify questionnaire modal/form appears
4. Fill in questionnaire fields with test data:
   - Answer all required questions
   - Example: "I am interested in collaborating on this subspace"
5. Submit the application
6. Verify success confirmation appears (popup/notification)
7. Verify the Apply button is replaced with "Application Pending" or similar status message

**Expected Results:**

- Apply button is clickable on the About page
- Questionnaire modal/form opens upon clicking Apply
- All form fields are accessible and editable
- Submit button becomes enabled after filling required fields
- Success confirmation popup/notification appears after submission
- Original Apply button is no longer visible
- Page displays "Application Pending" or similar status indicator
- User cannot submit duplicate application to the same subspace

#### 1.3 View Pending Applications as Subspace Admin

**Prerequisites:**

- An application has been submitted to Level 1 Subspace (from test 1.2)

**Steps:**

1. Sign in as `${TestUser.SUBSPACE_ADMIN}@alkem.io` (admin of Level 1 & 2)
2. Navigate to the Level 1 Subspace page (URL pattern: `/{spaceNameId}/challenges/{subspaceNameId}`)
3. Locate and click the Settings button (button with aria-label "Settings")
4. Verify navigation to subspace settings page
5. Under the div with `data-testid="subspace-settings"`, locate and click the "Community" tab
6. Verify "Pending applications & invitations" section is visible
7. Verify the submitted application from test 1.2 appears in the list

**Expected Results:**

- Subspace admin can access the subspace page
- Settings button is visible and clickable
- Settings page displays with `data-testid="subspace-settings"`
- Community tab is visible and accessible
- "Pending applications & invitations" section displays
- Previously submitted application is visible in the pending list
- Application shows relevant details (applicant name, submission date, etc.)

---

### 2. Subspace Application Management

**Note:** These tests follow the same patterns as Level 0 tests (2.1-2.5) but operate on Level 1 Subspaces with the following key differences:

- **URL Pattern**: `/{spaceNameId}/challenges/{subspaceNameId}` instead of `/{spaceNameId}`
- **Settings Element**: Button with aria-label "Settings" instead of icon with data-testid
- **Settings Container**: `data-testid="subspace-settings"` instead of `data-testid="space-settings"`
- **Applicant**: `${TestUser.NON_SPACE_MEMBER}@alkem.io` (same as Level 0, but must be Level 0 member first to see subspaces)
- **Admin**: `${TestUser.SUBSPACE_ADMIN}@alkem.io` (admin of Level 1 & 2)
- **Data Model**: Use `baseScenario.subspace` instead of `baseScenario.space`

#### 2.1 Reject Application to Level 1 Subspace

Follow the same steps as Level 0 test 2.1, substituting Level 1 Subspace references and using the differences noted above.

#### 2.2 Archive Application to Level 1 Subspace

Follow the same steps as Level 0 test 2.2, substituting Level 1 Subspace references and using the differences noted above.

#### 2.3 View and Approve Application to Level 1 Subspace

Follow the same steps as Level 0 test 2.3, substituting Level 1 Subspace references and using the differences noted above.

#### 2.4 View and Reject Application to Level 1 Subspace

Follow the same steps as Level 0 test 2.4, substituting Level 1 Subspace references and using the differences noted above.

#### 2.5 Approve Application Directly from Data Grid

Follow the same steps as Level 0 test 2.5, substituting Level 1 Subspace references and using the differences noted above. The admin will receive a notification about a new subspace application and can navigate directly to the subspace community settings to approve it.
