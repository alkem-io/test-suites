# Space Applications Management - Comprehensive Test Plan

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
- **Level 0 Admin**: `${TestUser.SPACE_ADMIN}@alkem.io` - Admin of all 3 levels
- **Level 1 Admin**: `${TestUser.SUBSPACE_ADMIN}@alkem.io` - Admin of Level 1 & 2
- **Level 2 Admin**: `${TestUser.SUBSUBSPACE_ADMIN}@alkem.io` - Admin of Level 2 only

**Navigation Elements:**

- **Settings Access**: Cog icon in subheader navigation menu
- **Notifications**: Bell icon in upper right corner
- **Community Tab**: Subnavigation within settings

---

## Test Scenarios

### 1. Space Discovery and Privacy Indicators

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 1.1 View Private Space Hierarchy as Non-Member

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Navigate to the main spaces listing page
3. Locate the 3-level space tree structure
4. Observe privacy indicators for each level

**Expected Results:**

- Level 0 (Space) displays with lock icon indicating private status
- Level 1 (Subspace) displays with lock icon indicating private status
- Level 2 (Subsubspace) displays with lock icon indicating private status
- All three levels show "Apply" or "Join" button available
- Non-member cannot directly access space content

#### 1.2 Verify Space Hierarchy Structure

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Navigate to spaces listing
3. Identify parent-child relationships in the tree

**Expected Results:**

- Space (Level 0) is the root
- Subspace (Level 1) appears nested under Space
- Subsubspace (Level 2) appears nested under Subspace
- Tree structure clearly indicates hierarchy

---

### 2. Application Submission Process

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 2.1 Apply to Level 0 Space

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Navigate to the Level 0 Space
3. Click the "Apply" button
4. Verify questionnaire modal/form appears
5. Fill in questionnaire with test answers:
   - Question 1: "I am interested in collaborating on this space"
   - Question 2: "5 years of experience in the field"
6. Submit the application

**Expected Results:**

- Apply button is visible and clickable on Level 0 space
- Questionnaire modal opens with application questions
- All form fields are editable
- Submit button becomes enabled after completing required fields
- Success message appears after submission
- Application status changes from "Apply" to "Application Pending" or similar

#### 2.2 Apply to Level 1 Subspace

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Navigate to the Level 1 Subspace
3. Click the "Apply" button
4. Fill in questionnaire with test answers:
   - Question 1: "I want to contribute to this specific subspace"
   - Question 2: "Expert in relevant technologies"
5. Submit the application

**Expected Results:**

- Apply button is visible on Level 1 subspace
- Questionnaire appears specific to the subspace
- Application is successfully submitted
- Confirmation message is displayed

#### 2.3 Apply to Level 2 Subsubspace

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Navigate to the Level 2 Subsubspace
3. Click the "Apply" button
4. Fill in questionnaire with test answers:
   - Question 1: "I have specific skills for this subsubspace"
   - Question 2: "Available 10 hours per week"
5. Submit the application

**Expected Results:**

- Apply button is visible on Level 2 subsubspace
- Questionnaire opens correctly
- Application is successfully submitted
- User receives confirmation

#### 2.4 Prevent Duplicate Applications

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Apply to Level 0 Space (if not already done)
3. Attempt to apply again to the same space

**Expected Results:**

- Apply button is disabled or replaced with "Application Pending"
- System prevents duplicate application submission
- Clear status indicator shows existing application

---

### 3. Notification System - Applicant Perspective

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 3.1 Receive Application Confirmation Notification

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Submit application to Level 0 Space
3. Click the bell icon in the upper right corner
4. Check notifications list

**Expected Results:**

- Bell icon shows notification badge (red dot or number)
- Notifications list contains application confirmation
- Notification includes space name and application status
- Timestamp is displayed

#### 3.2 Receive Application Status Update Notifications

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Wait for admin to review application (approved/rejected)
3. Click the bell icon
4. View the notification

**Expected Results:**

- Notification appears for application status change
- Message clearly states: "Your application to [Space Name] has been approved" or "rejected"
- Notification includes reviewer action timestamp
- Clicking notification navigates to relevant space or shows details

---

### 4. Notification System - Level 0 Admin

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 4.1 Receive Notification for Level 0 Application

**Steps:**

1. Applicant (`${TestUser.NON_SPACE_MEMBER}@alkem.io`) submits application to Level 0 Space
2. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
3. Click the bell icon in the upper right corner
4. View notifications list

**Expected Results:**

- Bell icon shows new notification badge
- Notification displays applicant name (`${TestUser.NON_SPACE_MEMBER}`)
- Notification shows space name (Level 0 Space)
- Message format: "[User Name] has applied to [Space Name]"

#### 4.2 Receive Notification for Level 1 Application

**Steps:**

1. Applicant submits application to Level 1 Subspace
2. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
3. Check bell icon notifications

**Expected Results:**

- Notification appears for Level 1 Subspace application
- Contains applicant name and subspace name
- Level 0 admin receives notification due to inherited permissions

#### 4.3 Receive Notification for Level 2 Application

**Steps:**

1. Applicant submits application to Level 2 Subsubspace
2. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
3. Check bell icon notifications

**Expected Results:**

- Notification appears for Level 2 Subsubspace application
- Contains applicant name and subsubspace name
- Level 0 admin receives notification due to inherited permissions

#### 4.4 Navigate from Notification to Application Management

**Steps:**

1. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
2. Click bell icon to view notifications
3. Click on a specific application notification

**Expected Results:**

- User is navigated to the space settings page
- Settings page shows cog icon active in subheader
- Community tab is automatically selected in subnavigation
- Applications list is visible with the specific application highlighted

---

### 5. Notification System - Level 1 Admin

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 5.1 No Notification for Level 0 Application

**Steps:**

1. Applicant submits application to Level 0 Space
2. Sign in as `${TestUser.SUBSPACE_ADMIN}@alkem.io`
3. Check bell icon for notifications

**Expected Results:**

- Bell icon shows no new notifications for Level 0 application
- Level 1 admin does not receive notifications for parent space
- Notifications list is empty or shows only Level 1/2 applications

#### 5.2 Receive Notification for Level 1 Application

**Steps:**

1. Applicant submits application to Level 1 Subspace
2. Sign in as `${TestUser.SUBSPACE_ADMIN}@alkem.io`
3. Click bell icon

**Expected Results:**

- Notification appears for Level 1 Subspace application
- Contains applicant name and subspace name
- Level 1 admin can access the notification

#### 5.3 Receive Notification for Level 2 Application

**Steps:**

1. Applicant submits application to Level 2 Subsubspace
2. Sign in as `${TestUser.SUBSPACE_ADMIN}@alkem.io`
3. Check notifications

**Expected Results:**

- Notification appears for Level 2 Subsubspace application
- Level 1 admin receives due to inherited permissions

---

### 6. Notification System - Level 2 Admin

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 6.1 No Notification for Level 0 or Level 1 Applications

**Steps:**

1. Applicant submits applications to Level 0 and Level 1
2. Sign in as `${TestUser.SUBSUBSPACE_ADMIN}@alkem.io`
3. Check bell icon

**Expected Results:**

- No notifications for Level 0 Space application
- No notifications for Level 1 Subspace application
- Bell icon shows no badge or only Level 2 notifications

#### 6.2 Receive Notification for Level 2 Application Only

**Steps:**

1. Applicant submits application to Level 2 Subsubspace
2. Sign in as `${TestUser.SUBSUBSPACE_ADMIN}@alkem.io`
3. Click bell icon

**Expected Results:**

- Notification appears for Level 2 Subsubspace application
- Contains applicant name and subsubspace name
- Only Level 2 applications are visible

---

### 7. Application Review - Access Control

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 7.1 Level 0 Admin Access to All Applications

**Steps:**

1. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
2. Navigate to Level 0 Space
3. Click cog icon in subheader navigation
4. Click Community tab in subnavigation
5. Locate Applications section
6. Repeat for Level 1 and Level 2

**Expected Results:**

- Level 0 admin can access applications for Level 0 Space
- Level 0 admin can access applications for Level 1 Subspace
- Level 0 admin can access applications for Level 2 Subsubspace
- All applications lists are visible and manageable

#### 7.2 Level 1 Admin Access Restrictions

**Steps:**

1. Sign in as `${TestUser.SUBSPACE_ADMIN}@alkem.io`
2. Attempt to navigate to Level 0 Space settings
3. Navigate to Level 1 Subspace settings → Community tab
4. Navigate to Level 2 Subsubspace settings → Community tab

**Expected Results:**

- Level 1 admin cannot access Level 0 Space application management (or settings are restricted)
- Level 1 admin can access Level 1 Subspace applications
- Level 1 admin can access Level 2 Subsubspace applications

#### 7.3 Level 2 Admin Access Restrictions

**Steps:**

1. Sign in as `${TestUser.SUBSUBSPACE_ADMIN}@alkem.io`
2. Attempt to navigate to Level 0 and Level 1 settings
3. Navigate to Level 2 Subsubspace settings → Community tab

**Expected Results:**

- Level 2 admin cannot access Level 0 Space applications
- Level 2 admin cannot access Level 1 Subspace applications
- Level 2 admin can access only Level 2 Subsubspace applications

---

### 8. Application Review - View Questionnaire

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 8.1 View Application Questionnaire

**Steps:**

1. Applicant submits application to Level 0 Space with filled questionnaire
2. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
3. Navigate to Level 0 Space → Settings (cog icon) → Community tab
4. Locate the application from `${TestUser.NON_SPACE_MEMBER}@alkem.io`
5. Click "View" or application row to open details

**Expected Results:**

- Modal or detail panel opens showing application
- Applicant name is displayed
- All questionnaire questions are shown
- All applicant answers are visible
- Answers match what applicant submitted
- Timestamp of application submission is shown

#### 8.2 View Multiple Applications

**Steps:**

1. Multiple users submit applications to Level 1 Subspace
2. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
3. Navigate to Level 1 Subspace → Settings → Community
4. View applications list
5. Click each application to view details

**Expected Results:**

- All applications are listed
- Each application can be opened independently
- Questionnaire responses are distinct for each applicant
- No data mixing between applications

---

### 9. Application Review - Approve Applications

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 9.1 Approve Level 0 Application

**Steps:**

1. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
2. Navigate to Level 0 Space → Settings → Community
3. Locate application from `${TestUser.NON_SPACE_MEMBER}@alkem.io`
4. Click "Approve" button
5. Confirm approval if confirmation dialog appears

**Expected Results:**

- Approve button is visible and clickable
- Confirmation dialog may appear asking for confirmation
- After approval, application status changes to "Approved"
- Application is removed from pending list or marked as processed
- Success notification appears
- Applicant receives notification of approval

#### 9.2 Verify Approved User Gains Access

**Steps:**

1. Admin approves application for Level 0 Space
2. Sign out and sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
3. Navigate to Level 0 Space

**Expected Results:**

- Lock icon is no longer displayed (or user has access)
- User can now view space content
- User appears in members list
- Apply button is no longer shown

#### 9.3 Level 1 Admin Approves Level 1 Application

**Steps:**

1. Sign in as `${TestUser.SUBSPACE_ADMIN}@alkem.io`
2. Navigate to Level 1 Subspace → Settings → Community
3. Approve an application

**Expected Results:**

- Approval is successful
- Applicant gains access to Level 1 Subspace
- Notification is sent to applicant

#### 9.4 Level 2 Admin Approves Level 2 Application

**Steps:**

1. Sign in as `${TestUser.SUBSUBSPACE_ADMIN}@alkem.io`
2. Navigate to Level 2 Subsubspace → Settings → Community
3. Approve an application

**Expected Results:**

- Approval is successful
- Applicant gains access to Level 2 Subsubspace
- Notification is sent to applicant

---

### 10. Application Review - Reject Applications

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 10.1 Reject Level 0 Application

**Steps:**

1. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
2. Navigate to Level 0 Space → Settings → Community
3. Locate application from `${TestUser.NON_SPACE_MEMBER}@alkem.io`
4. Click "Reject" button
5. Confirm rejection if confirmation dialog appears

**Expected Results:**

- Reject button is visible and clickable
- Confirmation dialog may appear
- After rejection, application status changes to "Rejected"
- Application is removed from pending list or marked as rejected
- Success notification appears
- Applicant receives notification of rejection

#### 10.2 Verify Rejected User Does Not Gain Access

**Steps:**

1. Admin rejects application for Level 1 Subspace
2. Sign out and sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
3. Navigate to Level 1 Subspace

**Expected Results:**

- Lock icon still displayed
- User cannot access space content
- User is not in members list
- Apply button may be available again or shows "Application Rejected"

#### 10.3 Rejection Notification Content

**Steps:**

1. Admin rejects application
2. Sign in as applicant
3. Click bell icon
4. View rejection notification

**Expected Results:**

- Notification clearly states rejection
- Space name is included
- Timestamp is shown
- User understands application was rejected

---

### 11. Application Review - Delete Applications

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 11.1 Delete Application

**Steps:**

1. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
2. Navigate to Level 0 Space → Settings → Community
3. Locate an application
4. Click "Delete" button
5. Confirm deletion if confirmation dialog appears

**Expected Results:**

- Delete button is visible
- Confirmation dialog appears warning about permanent deletion
- After deletion, application is completely removed from list
- No notification is sent to applicant (or system notification is sent)
- Action is irreversible

#### 11.2 Verify Deleted Application Cannot Be Recovered

**Steps:**

1. Admin deletes an application
2. Refresh the page
3. Search for the deleted application

**Expected Results:**

- Deleted application does not appear in any list
- Application data is permanently removed
- No way to restore the application

---

### 12. Application Management - Bulk Operations

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 12.1 Multiple Applications Display

**Steps:**

1. Have 3+ applicants apply to Level 0 Space
2. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
3. Navigate to Level 0 Space → Settings → Community
4. View applications list

**Expected Results:**

- All applications are displayed in a list or table
- Each application shows applicant name
- Application date/time is shown
- Actions (View, Approve, Reject, Delete) are available for each
- List is sortable or filterable

#### 12.2 Mixed Actions on Multiple Applications

**Steps:**

1. Admin approves one application
2. Admin rejects another application
3. Admin deletes a third application
4. Refresh the page

**Expected Results:**

- Each action is processed independently
- List updates to reflect changes
- Approved application is removed or marked
- Rejected application is removed or marked
- Deleted application is gone
- All applicants receive appropriate notifications

---

### 13. Edge Cases and Error Handling

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 13.1 Submit Application with Empty Questionnaire

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Navigate to Level 0 Space
3. Click Apply button
4. Leave questionnaire fields empty
5. Attempt to submit

**Expected Results:**

- Submit button is disabled until required fields are filled
- Validation errors appear for empty required fields
- Application is not submitted
- User remains on questionnaire form

#### 13.2 Navigate Away During Application

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. Start filling application questionnaire
3. Navigate to different page without submitting
4. Return to space

**Expected Results:**

- Unsaved application data may be lost (or browser may warn)
- Apply button is still available
- No partial application is saved
- User can start fresh application

#### 13.3 Concurrent Application Review

**Steps:**

1. Open same application in two admin browsers
2. Admin 1 approves the application
3. Admin 2 attempts to approve the same application

**Expected Results:**

- System prevents duplicate action
- Second admin sees application already processed
- Error message or status update appears
- No duplicate approval occurs

#### 13.4 Network Error During Application Submission

**Steps:**

1. Sign in as applicant
2. Fill questionnaire
3. Simulate network disconnection
4. Submit application
5. Restore network

**Expected Results:**

- Error message appears indicating submission failure
- Application data is retained in form
- User can retry submission
- No partial application is created

#### 13.5 Permission Changes During Session

**Steps:**

1. Sign in as `${TestUser.SUBSPACE_ADMIN}@alkem.io`
2. Another admin removes Level 1 admin privileges
3. Attempt to review Level 1 application

**Expected Results:**

- Access denied or error message
- User is redirected or notified of permission change
- No unauthorized access to applications

---

### 14. UI/UX Validation

**Seed:** `./client-web/src/functional-e2e/seed-applications.spec.ts`

#### 14.1 Lock Icon Visibility

**Steps:**

1. Sign in as `${TestUser.NON_SPACE_MEMBER}@alkem.io`
2. View space tree hierarchy
3. Verify lock icons on all private spaces

**Expected Results:**

- Lock icons are clearly visible
- Icons appear next to or near space names
- Visual indicator is consistent across all levels
- Icon disappears after user gains access

#### 14.2 Notification Badge Updates

**Steps:**

1. Sign in as admin
2. Check bell icon (no notifications)
3. Have applicant submit application
4. Refresh or wait for real-time update

**Expected Results:**

- Bell icon shows badge immediately (or within seconds)
- Badge count increments correctly
- Clicking bell shows new notifications at top
- Badge disappears after viewing notifications

#### 14.3 Settings Navigation

**Steps:**

1. Sign in as `${TestUser.SPACE_ADMIN}@alkem.io`
2. Navigate to space
3. Click cog icon in subheader
4. Verify Community tab

**Expected Results:**

- Cog icon is clearly visible in subheader
- Clicking cog opens settings page
- Community tab is visible in subnavigation
- Applications section is easily found

#### 14.4 Responsive Design

**Steps:**

1. Resize browser to mobile width
2. Navigate through application workflow
3. Test on actual mobile device if possible

**Expected Results:**

- All elements remain accessible
- Questionnaire is readable and fillable
- Buttons are touch-friendly
- Notifications are accessible
- No horizontal scrolling required

---

## Test Data Summary

### Users and Roles

| User Email                               | Role          | Access Level    |
| ---------------------------------------- | ------------- | --------------- |
| `${TestUser.NON_SPACE_MEMBER}@alkem.io`  | Applicant     | None (applying) |
| `${TestUser.SPACE_ADMIN}@alkem.io`       | Level 0 Admin | Levels 0, 1, 2  |
| `${TestUser.SUBSPACE_ADMIN}@alkem.io`    | Level 1 Admin | Levels 1, 2     |
| `${TestUser.SUBSUBSPACE_ADMIN}@alkem.io` | Level 2 Admin | Level 2 only    |

### Space Hierarchy

```
Level 0: Space (Private, Applications Required)
  └── Level 1: Subspace (Private, Applications Required)
        └── Level 2: Subsubspace (Private, Applications Required)
```

### Sample Questionnaire Responses

**Level 0 Application:**

- Q1: "I am interested in collaborating on this space"
- Q2: "5 years of experience in the field"

**Level 1 Application:**

- Q1: "I want to contribute to this specific subspace"
- Q2: "Expert in relevant technologies"

**Level 2 Application:**

- Q1: "I have specific skills for this subsubspace"
- Q2: "Available 10 hours per week"

---

## Execution Notes

1. **Test Execution Order**: Tests can be run independently, but some scenarios build on previous ones (e.g., approval tests require applications to exist)

2. **Data Cleanup**: After each test run, consider resetting applications to ensure consistent test environment

3. **Browser State**: The seed file keeps browsers open for manual testing; for automated runs, remove the timeout promise

4. **Notification Timing**: Some tests may require brief waits for notifications to appear (real-time vs polling)

5. **Inherited Permissions Testing**: Pay special attention to scenarios 4-6 which validate the permission inheritance model

6. **Cross-Browser Testing**: Run critical paths on Chrome, Firefox, and Safari to ensure consistency

7. **Accessibility**: Validate that keyboard navigation works for all application workflows (Tab, Enter, Escape)

8. **Frontend Caching**: The Settings → Community page may cache data. If expected information (applications, notifications, member lists) is missing or not updated, **refresh the page first** before reporting a bug. This is especially important after:

   - Submitting a new application
   - Approving/rejecting/deleting an application
   - Changing user permissions
   - Receiving notifications that data has changed

9. **Using baseScenario for Navigation**: The `baseScenario` variable (of type `OrganizationWithSpaceModel`) contains the space tree created for the test run. When implementing automated tests, use this structure to navigate to specific spaces programmatically:

   ```typescript
   // baseScenario structure:
   baseScenario.space; // Level 0 Space (contains id, nameId, community.id, etc.)
   baseScenario.subspace; // Level 1 Subspace
   baseScenario.subsubspace; // Level 2 Subsubspace

   // Example navigation using space display names from cards:
   // All spaces are listed as cards on the home page with their display names
   // Space cards contain: avatar, banner, title (h2), and lock icon (for private spaces)
   const spaceDisplayName = baseScenario.space.profile.displayName;

   // Click on the card link (the entire card is clickable):
   await page.getByRole('link', { name: spaceDisplayName }).click();

   // Alternative: use the heading if more specific targeting is needed
   await page
     .getByRole('heading', { name: spaceDisplayName, level: 2 })
     .click();

   // Navigate to subspace (from within space):
   const subspaceDisplayName = baseScenario.subspace.profile.displayName;
   await page.getByRole('link', { name: subspaceDisplayName }).click();

   // Navigate to subsubspace (from within subspace):
   const subsubspaceDisplayName = baseScenario.subsubspace.profile.displayName;
   await page.getByRole('link', { name: subsubspaceDisplayName }).click();

   // Access IDs for API calls or verification:
   const spaceId = baseScenario.space.id;
   const communityId = baseScenario.space.community.id;
   const applicationId = baseScenario.space.community.applicationId;
   ```

   **Note**: Space cards are rendered as links containing the display name (h2 heading), avatar, banner image, and a lock icon (`LockOutlinedIcon`) for private spaces. The entire card is clickable and navigates to the space page.

---

## Success Criteria

All test scenarios should pass with:

- No broken links or navigation errors
- Correct permission enforcement at each level
- Accurate notification delivery
- Proper application state management
- Clear user feedback for all actions
- Consistent UI across different screen sizes
- Accessible interface for keyboard and screen reader users
