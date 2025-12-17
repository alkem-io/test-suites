# Alkemio Callouts - Comprehensive Test Plan

**Seed:** `./client-web/src/functional-e2e/seed-public-space.spec.ts`

**GitHub Issue:** https://github.com/alkem-io/alkemio/issues/1732

## Executive Summary

This comprehensive test plan covers callout creation, management, and interaction across the Alkemio platform. Callouts are the primary collaboration mechanism in Alkemio spaces.

**Scope:**

- **10 Major Test Categories** covering 60+ detailed scenarios
- **25 Critical Priority Scenarios** identified for initial implementation
- **5 Test Coverage Areas**: CRUD operations, comments, visibility, role-based access, and callout types

**Key Test Areas:**

1. Callout CRUD Operations (Create, Read, Update, Delete)
2. Callout Types (Post Collection, Whiteboard, Link Collection)
3. Comments Management
4. Visibility and State Management
5. Role-Based Access Control

**Callout Types Available:**

- **Post Collection** - Allows members to contribute posts
- **Whiteboard** - Collaborative visual canvas
- **Link Collection** - Collection of external links
- **Memo** - Rich text content (single callout type)

**Callout Visibility States:**

- `Draft` - Only visible to admins/leads
- `Published` - Visible to all members

**Callout Contribution Settings:**

- `commentsEnabled` - Allow comments on the callout
- `canAddContributions` - Who can contribute (Members, All)
- `allowedTypes` - Types of contributions allowed

---

## Application Overview

This test plan covers callout management in Alkemio Spaces and Subspaces. Callouts are the primary collaboration tools that allow community members to share ideas, collaborate on whiteboards, and collect resources.

### Callout Locations

- **Space (L0)**: `/space/[:spaceNameId]/collaboration/[:calloutNameId]`
- **Subspace (L1)**: `/space/[:spaceNameId]/challenges/[:subspaceNameId]/collaboration/[:calloutNameId]`
- **Subsubspace (L2)**: `/space/[:spaceNameId]/challenges/[:subspaceNameId]/opportunities[:subsubspaceNameId]/collaboration/[:calloutNameId]`

### Test Data Structure (from seed-public-space.spec.ts)

The seed creates:

- **Organization** with admin
- **Space (L0)** - Public
  - Admins: SPACE_ADMIN
  - Members: SPACE_MEMBER, SPACE_ADMIN, SUBSPACE_MEMBER, SUBSPACE_ADMIN, SUBSUBSPACE_MEMBER, SUBSUBSPACE_ADMIN
  - Pre-created callouts:
    - Post Collection Callout (`addPostCollectionCallout: true`)
    - Whiteboard Callout (`addWhiteboardCallout: true`)
    - Tutorial callouts disabled (`addTutorialCallouts: false`)
- **Subspace (L1)** - Public
  - Admins: SUBSPACE_ADMIN
  - Members: SUBSPACE_MEMBER, SUBSPACE_ADMIN, SUBSUBSPACE_MEMBER, SUBSUBSPACE_ADMIN
- **Subsubspace (L2)** - Private
  - Admins: SUBSPACE_ADMIN
  - Members: SUBSPACE_MEMBER, SUBSPACE_ADMIN, SUBSUBSPACE_MEMBER, SUBSUBSPACE_ADMIN

### Personas to Cover

| Persona          | Role                  | Expected Access                                     |
| ---------------- | --------------------- | --------------------------------------------------- |
| SPACE_ADMIN      | Space admin + lead    | Full CRUD on all callouts in space                  |
| SPACE_MEMBER     | Space member          | View published, add contributions, comment          |
| SUBSPACE_ADMIN   | Subspace admin + lead | Full CRUD on subspace callouts, view space callouts |
| SUBSPACE_MEMBER  | Subspace member       | View published, add contributions, comment          |
| NON_SPACE_MEMBER | Not a member          | View public space callouts only (read-only)         |
| GLOBAL_ADMIN     | Platform admin        | Full access everywhere                              |

---

## Test Scenarios

### Category 1: Callout Creation

#### 1.1 Create Post Collection Callout - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Space collaboration page
2. Click "Add Callout" or "+" button
3. Select "Post Collection" type
4. Fill in callout details:
   - Display name
   - Description
5. Configure settings:
   - Comments enabled: Yes
   - Contributions allowed: Members
6. Click "Create" or "Save"

**Expected Results:**

- Callout is created successfully
- Callout appears in collaboration page
- Callout is in "Draft" state by default
- Success notification appears
- Callout card shows correct display name and description

---

#### 1.2 Create Whiteboard Callout - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Space collaboration page
2. Click "Add Callout" or "+" button
3. Select "Whiteboard" type
4. Fill in callout details:
   - Display name
   - Description
5. Configure settings
6. Click "Create" or "Save"

**Expected Results:**

- Whiteboard callout is created
- Whiteboard canvas is available
- Callout appears in collaboration page
- Excalidraw or similar canvas loads correctly

---

#### 1.3 Create Link Collection Callout - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Space collaboration page
2. Click "Add Callout" or "+" button
3. Select "Link Collection" type
4. Fill in callout details:
   - Display name
   - Description
5. Configure settings
6. Click "Create" or "Save"

**Expected Results:**

- Link collection callout is created
- Users can add links as contributions
- Callout appears in collaboration page

---

#### 1.4 Create Callout with Template

**User:** SPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to Space collaboration page
2. Click "Add Callout"
3. Select "Use Template" option
4. Choose a callout template from available templates
5. Customize if needed
6. Click "Create"

**Expected Results:**

- Template selection UI is available
- Selected template pre-fills callout configuration
- Callout is created with template settings
- Can modify template settings before creation

---

#### 1.5 Cannot Create Callout - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Space collaboration page
2. Look for "Add Callout" button

**Expected Results:**

- "Add Callout" button is NOT visible
- No option to create new callouts
- Can only view and interact with existing callouts

---

#### 1.6 Create Callout in Subspace - As Subspace Admin

**User:** SUBSPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Subspace collaboration page
2. Click "Add Callout"
3. Fill in callout details
4. Save callout

**Expected Results:**

- Callout is created in subspace
- Callout is visible to subspace members
- Parent space admin can also view the callout

---

#### 1.7 Cannot Create Callout in Parent Space - As Subspace Admin

**User:** SUBSPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to parent Space collaboration page
2. Attempt to create a callout

**Expected Results:**

- Cannot create callouts in parent space
- Only subspace admin privileges apply to subspace
- "Add Callout" button not visible in parent space

---

### Category 2: Callout Viewing and Discovery

#### 2.1 View Published Callout - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Space collaboration page
2. Locate a published callout
3. Click on the callout to view details

**Expected Results:**

- Published callouts are visible
- Callout details page loads
- Can see callout description, contributions
- Comments section is visible (if enabled)

---

#### 2.2 Cannot View Draft Callout - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Space collaboration page
2. Look for draft callouts

**Expected Results:**

- Draft callouts are NOT visible to regular members
- Only published callouts appear in the list
- Cannot access draft callout via direct URL

---

#### 2.3 View Draft Callout - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to Space collaboration page
2. Look for draft callouts

**Expected Results:**

- Draft callouts ARE visible to admins
- Draft indicator/badge is shown
- Can access and edit draft callouts
- Publish option is available

---

#### 2.4 View Callout - As Non-Member (Public Space)

**User:** NON_SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to public Space collaboration page
2. View available callouts

**Expected Results:**

- Can view published callouts in public spaces
- Cannot add contributions
- Cannot add comments
- "Join to contribute" message may appear

---

#### 2.5 View Callout - Unauthenticated User

**User:** Not logged in
**Priority:** P2

**Steps:**

1. Navigate to public Space collaboration page (not logged in)
2. View available callouts

**Expected Results:**

- Can view published callouts in public spaces
- Cannot interact with callouts
- Login/signup prompts appear for actions
- Read-only access to public content

---

#### 2.6 View Callouts List - Multiple Callouts

**User:** SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to Space with multiple callouts
2. Review callouts list/grid

**Expected Results:**

- All published callouts are displayed
- Callout cards show:
  - Display name
  - Description excerpt
  - Type indicator (Post/Whiteboard/Link)
  - Activity indicator (contribution count)
- Can navigate to each callout

---

### Category 3: Callout Editing and Updates

#### 3.1 Edit Callout Details - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a callout created by admin
2. Click "Edit" or settings icon
3. Modify callout details:
   - Update display name
   - Update description
4. Save changes

**Expected Results:**

- Edit option is available
- Changes are saved successfully
- Updated details appear immediately
- Success notification shown
- Other members see updated content

---

#### 3.2 Edit Callout Settings - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a callout
2. Open callout settings
3. Modify settings:
   - Enable/disable comments
   - Change contribution permissions
4. Save settings

**Expected Results:**

- Settings panel is accessible
- Changes are applied immediately
- Members see updated settings in effect
- Success notification shown

---

#### 3.3 Cannot Edit Callout - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a callout
2. Look for edit options

**Expected Results:**

- No edit button visible
- Cannot access settings
- Cannot modify callout details
- Only contribution/comment actions available

---

#### 3.4 Publish Draft Callout - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a draft callout
2. Click "Publish" button
3. Confirm publication

**Expected Results:**

- "Publish" option is available on draft callouts
- Confirmation dialog may appear
- Callout visibility changes to "Published"
- Callout becomes visible to all members
- Draft indicator is removed

---

#### 3.5 Unpublish Callout (Set to Draft) - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to a published callout
2. Click "Settings" or visibility option
3. Change visibility to "Draft"
4. Confirm change

**Expected Results:**

- Can change published callout to draft
- Callout becomes invisible to regular members
- Existing contributions remain preserved
- Draft indicator appears for admins

---

### Category 4: Callout Deletion

#### 4.1 Delete Callout - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a callout
2. Click "Delete" option in settings
3. Confirm deletion in dialog

**Expected Results:**

- Delete option is available in settings
- Confirmation dialog appears: "Are you sure you want to delete this callout?"
- Warning about losing all contributions
- After confirming:
  - Callout is removed from collaboration page
  - All contributions are deleted
  - Success notification appears

---

#### 4.2 Cannot Delete Callout - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a callout
2. Look for delete options

**Expected Results:**

- Delete option is NOT visible
- Cannot remove callouts as regular member
- Only admins have delete permissions

---

#### 4.3 Delete Callout with Contributions

**User:** SPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to a callout with multiple contributions
2. Attempt to delete the callout
3. Review warning about contributions

**Expected Results:**

- Warning specifically mentions contribution count
- "This will delete X contributions permanently"
- User must explicitly confirm
- All contributions are removed with callout

---

#### 4.4 Delete Callout in Subspace - As Subspace Admin

**User:** SUBSPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to subspace callout
2. Delete the callout

**Expected Results:**

- Subspace admin can delete subspace callouts
- Cannot delete parent space callouts
- Deletion works same as parent space

---

### Category 5: Comments on Callouts

#### 5.1 Add Comment on Callout - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a published callout with comments enabled
2. Locate comments section
3. Type a comment in the input field
4. Click "Post" or "Send" button

**Expected Results:**

- Comment input is visible
- Comment is posted successfully
- Comment appears in the comments list
- Timestamp and author are displayed
- Comment count is updated

---

#### 5.2 Add Comment on Callout - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a callout (draft or published)
2. Add a comment

**Expected Results:**

- Can comment on any callout (including drafts)
- Comment is posted with admin badge/indicator
- Appears in comments thread

---

#### 5.3 Cannot Add Comment - Comments Disabled

**User:** SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to a callout with comments disabled
2. Look for comment functionality

**Expected Results:**

- Comment input is NOT visible
- "Comments are disabled" message may appear
- Existing comments (if any) may still be visible but no new comments allowed

---

#### 5.4 Cannot Add Comment - Non-Member (Public Space)

**User:** NON_SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to public space callout
2. Attempt to add a comment

**Expected Results:**

- Can view existing comments
- Cannot add new comments
- "Join to comment" or login prompt appears
- Comment input is disabled or hidden

---

#### 5.5 View Comments Thread

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a callout with comments
2. View comments section

**Expected Results:**

- Comments are displayed in chronological order
- Each comment shows:
  - Author name and avatar
  - Timestamp
  - Comment content
- Comments are paginated if many exist

---

#### 5.6 Reply to Comment (Thread)

**User:** SPACE_MEMBER
**Priority:** P3

**Steps:**

1. Navigate to a callout with comments
2. Click "Reply" on an existing comment
3. Type reply and submit

**Expected Results:**

- Reply option is available on comments
- Reply appears nested under original comment
- Thread structure is maintained
- Notifications sent to original commenter

---

#### 5.7 Delete Own Comment - As Comment Author

**User:** SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to a callout with own comment
2. Click delete/remove option on own comment
3. Confirm deletion

**Expected Results:**

- Delete option visible only on own comments
- Confirmation dialog appears
- Comment is removed from thread
- Comment count is updated

---

#### 5.8 Delete Any Comment - As Space Admin

**User:** SPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to a callout with comments
2. Delete any user's comment as admin

**Expected Results:**

- Admin can delete any comment (moderation)
- Confirmation dialog appears
- Comment is removed
- Moderation action may be logged

---

### Category 6: Callout Contributions

#### 6.1 Add Post Contribution - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a Post Collection callout
2. Click "Add Post" or contribution button
3. Fill in post details:
   - Title
   - Description/Content
4. Submit the post

**Expected Results:**

- "Add Post" button is visible
- Post creation form/modal appears
- Post is added to the collection
- Post appears in contribution list
- Author and timestamp shown

---

#### 6.2 Add Link Contribution - As Space Member

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Navigate to a Link Collection callout
2. Click "Add Link"
3. Fill in link details:
   - URL
   - Title/Description
4. Submit

**Expected Results:**

- Link is validated (valid URL)
- Link is added to collection
- Link preview may be shown
- Can click link to open in new tab

---

#### 6.3 Add Whiteboard Contribution

**User:** SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to a Whiteboard callout
2. Click "Add Whiteboard" or create contribution
3. Draw/create content on whiteboard
4. Save whiteboard

**Expected Results:**

- Whiteboard canvas loads (Excalidraw)
- Can draw and add elements
- Whiteboard is saved to collection
- Appears as contribution in callout

---

#### 6.4 Edit Own Contribution

**User:** SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to own contribution
2. Click "Edit"
3. Modify content
4. Save changes

**Expected Results:**

- Edit option available on own contributions
- Can modify title, description, content
- Changes are saved
- "Edited" indicator may appear

---

#### 6.5 Delete Own Contribution

**User:** SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to own contribution
2. Click "Delete"
3. Confirm deletion

**Expected Results:**

- Delete option available on own contributions
- Confirmation dialog appears
- Contribution is removed
- Contribution count updates

---

#### 6.6 Cannot Add Contribution - Non-Member

**User:** NON_SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to callout in public space
2. Attempt to add contribution

**Expected Results:**

- "Add" buttons are disabled or hidden
- "Join to contribute" message appears
- Must become member to contribute

---

#### 6.7 Admin Deletes Any Contribution

**User:** SPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to any contribution in space
2. Delete contribution as admin

**Expected Results:**

- Admin can delete any member's contribution
- Confirmation dialog appears
- Contribution is removed
- Moderation capability confirmed

---

### Category 7: Callout Access Control by Role

#### 7.1 Space Admin - Full Access

**User:** SPACE_ADMIN
**Priority:** P1 - Critical

**Steps:**

1. Login as Space Admin
2. Navigate to Space collaboration
3. Verify all capabilities

**Expected Results:**

- Can create callouts (all types)
- Can edit any callout
- Can delete any callout
- Can publish/unpublish callouts
- Can view draft callouts
- Can manage callout settings
- Can moderate comments and contributions

---

#### 7.2 Space Member - Limited Access

**User:** SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Login as Space Member
2. Navigate to Space collaboration
3. Verify capabilities

**Expected Results:**

- Cannot create callouts
- Cannot edit callouts
- Cannot delete callouts (except own contributions)
- Can view published callouts only
- Can add contributions (if enabled)
- Can add comments (if enabled)
- Can edit/delete own contributions

---

#### 7.3 Subspace Admin in Parent Space

**User:** SUBSPACE_ADMIN
**Priority:** P2

**Steps:**

1. Login as Subspace Admin
2. Navigate to parent Space collaboration
3. Verify access level

**Expected Results:**

- Has member-level access in parent space
- Cannot create callouts in parent space
- Can contribute if member of parent space
- Admin privileges only apply to own subspace

---

#### 7.4 Global Admin Override

**User:** GLOBAL_ADMIN
**Priority:** P2

**Steps:**

1. Login as Global Admin
2. Navigate to any Space collaboration
3. Verify capabilities

**Expected Results:**

- Full access to all callouts everywhere
- Can create, edit, delete any callout
- Can moderate any content
- Platform-wide admin privileges

---

#### 7.5 Lead Role Permissions

**User:** SPACE_LEAD (if distinct from admin)
**Priority:** P3

**Steps:**

1. Login as Space Lead
2. Navigate to Space collaboration
3. Verify lead-specific permissions

**Expected Results:**

- Can create callouts
- May have elevated permissions above member
- Access based on role configuration
- Lead badge may appear on contributions

---

### Category 8: Callout Types - Specific Behaviors

#### 8.1 Post Collection - Full Workflow

**User:** SPACE_ADMIN, SPACE_MEMBER
**Priority:** P1 - Critical

**Steps:**

1. Admin creates Post Collection callout
2. Admin publishes callout
3. Member adds post contribution
4. Member comments on callout
5. Admin moderates content

**Expected Results:**

- Post collection workflow functions correctly
- Posts appear in collection grid/list
- Comments visible on callout level
- Each post may have own comments
- Search/filter may be available for posts

---

#### 8.2 Whiteboard - Collaborative Editing

**User:** Multiple users
**Priority:** P2

**Steps:**

1. Admin creates Whiteboard callout
2. Member opens whiteboard
3. Member draws/adds elements
4. Another member views/edits simultaneously

**Expected Results:**

- Whiteboard canvas loads correctly
- Drawing tools available
- Changes are saved
- Collaborative editing may be supported
- Export options may be available

---

#### 8.3 Link Collection - URL Validation

**User:** SPACE_MEMBER
**Priority:** P2

**Steps:**

1. Navigate to Link Collection callout
2. Add link with valid URL
3. Add link with invalid URL
4. View link preview

**Expected Results:**

- Valid URLs are accepted
- Invalid URLs show validation error
- Link preview/metadata may be fetched
- Links open in new tab

---

#### 8.4 Memo Callout - Rich Text

**User:** SPACE_ADMIN
**Priority:** P3

**Steps:**

1. Create Memo callout
2. Add rich text content (formatting, links, images)
3. Publish and verify display

**Expected Results:**

- Rich text editor available
- Formatting preserved on save
- Memo displays correctly to all users
- May support markdown or WYSIWYG

---

### Category 9: Cross-Level Callout Visibility

#### 9.1 View Space Callouts from Subspace

**User:** SUBSPACE_MEMBER
**Priority:** P2

**Steps:**

1. Login as Subspace member (who is also Space member)
2. Navigate to parent Space
3. View callouts

**Expected Results:**

- Can view parent space callouts
- Can contribute to parent space callouts (if member)
- Access depends on space membership
- Clear navigation between levels

---

#### 9.2 Private Subspace Callouts - Non-Member Cannot View

**User:** SPACE_MEMBER (not subspace member)
**Priority:** P2

**Steps:**

1. Login as Space member
2. Attempt to view private subspace callouts

**Expected Results:**

- Cannot access private subspace
- Callouts in private subspace not visible
- Access denied message
- Only subspace members see content

---

#### 9.3 Callout Discovery - Search/Filter

**User:** SPACE_MEMBER
**Priority:** P3

**Steps:**

1. Navigate to space with many callouts
2. Use search/filter functionality
3. Filter by type (Post/Whiteboard/Link)

**Expected Results:**

- Search returns relevant callouts
- Filter by type works correctly
- Results update in real-time
- Empty state shown for no matches

---

### Category 10: Error Handling and Edge Cases

#### 10.1 Create Callout with Missing Required Fields

**User:** SPACE_ADMIN
**Priority:** P2

**Steps:**

1. Open callout creation form
2. Leave display name empty
3. Attempt to create

**Expected Results:**

- Form validation prevents submission
- Error message on required field
- "Display name is required"
- Cannot proceed until fixed

---

#### 10.2 Create Callout with Duplicate Name

**User:** SPACE_ADMIN
**Priority:** P3

**Steps:**

1. Create callout with name "Test Callout"
2. Attempt to create another with same name

**Expected Results:**

- May be allowed (unique nameId generated)
- Or validation error if names must be unique
- Clear feedback to user

---

#### 10.3 Delete Callout with Active Comments

**User:** SPACE_ADMIN
**Priority:** P2

**Steps:**

1. Navigate to callout with many comments
2. Delete callout

**Expected Results:**

- Warning shows comment count
- All comments deleted with callout
- Confirmation required
- Clean deletion without orphaned data

---

#### 10.4 Session Timeout During Edit

**User:** SPACE_ADMIN
**Priority:** P3

**Steps:**

1. Start editing a callout
2. Session times out
3. Attempt to save

**Expected Results:**

- Error message about session
- Redirect to login
- Changes may be lost (or auto-saved)
- Clear recovery path

---

#### 10.5 Concurrent Edit Conflict

**User:** Two admins
**Priority:** P3

**Steps:**

1. Admin A opens callout for edit
2. Admin B opens same callout for edit
3. Admin A saves changes
4. Admin B attempts to save

**Expected Results:**

- Conflict detection or last-write-wins
- User notified of conflict
- Option to reload and retry
- No data corruption

---

## Testing Notes

- **Authentication Required**: Most scenarios require authenticated users from the seed
- **Test Data Isolation**: Each test should verify the specific user's access level
- **Cleanup**: Tests involving creating/deleting callouts should clean up state
- **Cross-Browser**: Test on Chrome, Firefox, Safari, Edge
- **Responsive**: Verify on mobile, tablet, and desktop viewports
- **Performance**: Monitor page load times for collaboration pages with many callouts

---

## Critical Scenarios for Implementation (P1 Priority)

Based on the comprehensive test plan above, the following scenarios are **P1 priority** and should be implemented first.

**Legend:** ✅ Implemented | ⏸️ Skipped (blocked) | ❌ Not implemented

### **Callout Creation (5 scenarios)**

| #   | Scenario                                          | Status | Test File                           |
| --- | ------------------------------------------------- | ------ | ----------------------------------- |
| 1   | **1.1** - Create Post Collection Callout          | ✅     | `callout-creation.spec.ts`          |
| 2   | **1.2** - Create Whiteboard Callout               | ✅     | `callout-creation.spec.ts`          |
| 3   | **1.3** - Create Link Collection Callout          | ✅     | `callout-creation.spec.ts`          |
| 4   | **1.5** - Cannot Create Callout - As Space Member | ✅     | `callout-creation.spec.ts`          |
| 5   | **1.6** - Create Callout in Subspace              | ✅     | `callout-subspace-creation.spec.ts` |

### **Callout Viewing (3 scenarios)**

| #   | Scenario                                        | Status | Test File                 |
| --- | ----------------------------------------------- | ------ | ------------------------- |
| 6   | **2.1** - View Published Callout - As Member    | ✅     | `callout-viewing.spec.ts` |
| 7   | **2.2** - Cannot View Draft Callout - As Member | ✅     | `callout-viewing.spec.ts` |
| 8   | **2.3** - View Draft Callout - As Space Admin   | ✅     | `callout-viewing.spec.ts` |

### **Callout Editing (4 scenarios)**

| #   | Scenario                                         | Status | Test File                 |
| --- | ------------------------------------------------ | ------ | ------------------------- |
| 9   | **3.1** - Edit Callout Details - As Space Admin  | ✅     | `callout-editing.spec.ts` |
| 10  | **3.2** - Edit Callout Settings - As Space Admin | ✅     | `callout-editing.spec.ts` |
| 11  | **3.3** - Cannot Edit Callout - As Space Member  | ✅     | `callout-editing.spec.ts` |
| 12  | **3.4** - Publish Draft Callout - As Space Admin | ✅     | `callout-editing.spec.ts` |

### **Callout Deletion (2 scenarios)**

| #   | Scenario                                          | Status | Test File                  |
| --- | ------------------------------------------------- | ------ | -------------------------- |
| 13  | **4.1** - Delete Callout - As Space Admin         | ✅     | `callout-deletion.spec.ts` |
| 14  | **4.2** - Cannot Delete Callout - As Space Member | ✅     | `callout-deletion.spec.ts` |

### **Comments (3 scenarios)**

| #   | Scenario                                     | Status | Test File                  |
| --- | -------------------------------------------- | ------ | -------------------------- |
| 15  | **5.1** - Add Comment on Callout - As Member | ✅     | `callout-comments.spec.ts` |
| 16  | **5.2** - Add Comment on Callout - As Admin  | ✅     | `callout-comments.spec.ts` |
| 17  | **5.5** - View Comments Thread               | ✅     | `callout-comments.spec.ts` |

### **Contributions (2 scenarios)**

| #   | Scenario                        | Status | Test File                       |
| --- | ------------------------------- | ------ | ------------------------------- |
| 18  | **6.1** - Add Post Contribution | ✅     | `callout-contributions.spec.ts` |
| 19  | **6.2** - Add Link Contribution | ✅     | `callout-contributions.spec.ts` |

### **Access Control (2 scenarios)**

| #   | Scenario                                | Status | Test File                        |
| --- | --------------------------------------- | ------ | -------------------------------- |
| 20  | **7.1** - Space Admin - Full Access     | ✅     | `callout-access-control.spec.ts` |
| 21  | **7.2** - Space Member - Limited Access | ✅     | `callout-access-control.spec.ts` |

### **Type-Specific (1 scenario)**

| #   | Scenario                                | Status | Test File                       |
| --- | --------------------------------------- | ------ | ------------------------------- |
| 22  | **8.1** - Post Collection Full Workflow | ✅     | `callout-full-workflow.spec.ts` |

---

### **P1 Implementation Summary**

| Category               | Total  | ✅ Implemented | ⏸️ Skipped | ❌ Not Implemented |
| ---------------------- | ------ | -------------- | ---------- | ------------------ |
| Callout Creation       | 5      | 5              | 0          | 0                  |
| Callout Viewing        | 3      | 3              | 0          | 0                  |
| Callout Editing        | 4      | 4              | 0          | 0                  |
| Callout Deletion       | 2      | 2              | 0          | 0                  |
| Comments               | 3      | 3              | 0          | 0                  |
| Contributions          | 2      | 2              | 0          | 0                  |
| Access Control         | 2      | 2              | 0          | 0                  |
| Type-Specific          | 1      | 1              | 0          | 0                  |
| **Total P1 Scenarios** | **22** | **22**         | **0**      | **0**              |

**Test Files Location:** `client-web/src/functional-e2e/callouts/`

**Total Test Files:** 8

- `callout-creation.spec.ts` - Tests 1.1, 1.2, 1.3, 1.5
- `callout-subspace-creation.spec.ts` - Test 1.6
- `callout-viewing.spec.ts` - Tests 2.1, 2.2, 2.3
- `callout-editing.spec.ts` - Tests 3.1, 3.2, 3.3, 3.4
- `callout-deletion.spec.ts` - Tests 4.1, 4.2
- `callout-comments.spec.ts` - Tests 5.1, 5.2, 5.5
- `callout-contributions.spec.ts` - Tests 6.1, 6.2
- `callout-access-control.spec.ts` - Tests 7.1, 7.2
- `callout-full-workflow.spec.ts` - Test 8.1

---

## Summary of All Test Scenarios

**Legend:** ✅ Implemented | ⏸️ Skipped (blocked) | ❌ Not implemented

### Category 1: Callout Creation (7 scenarios)

1. **1.1** - Create Post Collection Callout - P1 ✅ `callout-creation.spec.ts`
2. **1.2** - Create Whiteboard Callout - P1 ✅ `callout-creation.spec.ts`
3. **1.3** - Create Link Collection Callout - P1 ✅ `callout-creation.spec.ts`
4. **1.4** - Create Callout with Template - P2 ❌
5. **1.5** - Cannot Create Callout - As Space Member - P1 ✅ `callout-creation.spec.ts`
6. **1.6** - Create Callout in Subspace - P1 ✅ `callout-subspace-creation.spec.ts`
7. **1.7** - Cannot Create Callout in Parent Space - P2 ✅ `callout-subspace-creation.spec.ts`

### Category 2: Callout Viewing and Discovery (6 scenarios)

8. **2.1** - View Published Callout - As Space Member - P1 ✅ `callout-viewing.spec.ts`
9. **2.2** - Cannot View Draft Callout - As Space Member - P1 ✅ `callout-viewing.spec.ts`
10. **2.3** - View Draft Callout - As Space Admin - P1 ✅ `callout-viewing.spec.ts`
11. **2.4** - View Callout - As Non-Member (Public Space) - P2 ❌
12. **2.5** - View Callout - Unauthenticated User - P2 ❌
13. **2.6** - View Callouts List - Multiple Callouts - P2 ❌

### Category 3: Callout Editing and Updates (5 scenarios)

14. **3.1** - Edit Callout Details - As Space Admin - P1 ✅ `callout-editing.spec.ts`
15. **3.2** - Edit Callout Settings - As Space Admin - P1 ✅ `callout-editing.spec.ts`
16. **3.3** - Cannot Edit Callout - As Space Member - P1 ✅ `callout-editing.spec.ts`
17. **3.4** - Publish Draft Callout - As Space Admin - P1 ✅ `callout-editing.spec.ts`
18. **3.5** - Unpublish Callout (Set to Draft) - P2 ❌

### Category 4: Callout Deletion (4 scenarios)

19. **4.1** - Delete Callout - As Space Admin - P1 ✅ `callout-deletion.spec.ts`
20. **4.2** - Cannot Delete Callout - As Space Member - P1 ✅ `callout-deletion.spec.ts`
21. **4.3** - Delete Callout with Contributions - P2 ❌
22. **4.4** - Delete Callout in Subspace - P2 ❌

### Category 5: Comments on Callouts (8 scenarios)

23. **5.1** - Add Comment on Callout - As Space Member - P1 ✅ `callout-comments.spec.ts`
24. **5.2** - Add Comment on Callout - As Space Admin - P1 ✅ `callout-comments.spec.ts`
25. **5.3** - Cannot Add Comment - Comments Disabled - P2 ❌
26. **5.4** - Cannot Add Comment - Non-Member (Public Space) - P1 ❌
27. **5.5** - View Comments Thread - P1 ✅ `callout-comments.spec.ts`
28. **5.6** - Reply to Comment (Thread) - P3 ❌
29. **5.7** - Delete Own Comment - P2 ❌
30. **5.8** - Delete Any Comment - As Space Admin - P2 ❌

### Category 6: Callout Contributions (7 scenarios)

31. **6.1** - Add Post Contribution - As Space Member - P1 ✅ `callout-contributions.spec.ts`
32. **6.2** - Add Link Contribution - As Space Member - P1 ✅ `callout-contributions.spec.ts`
33. **6.3** - Add Whiteboard Contribution - P1 ❌
34. **6.4** - Edit Own Contribution - P1 ❌
35. **6.5** - Delete Own Contribution - P2 ❌
36. **6.6** - Cannot Add Contribution - Non-Member - P2 ❌
37. **6.7** - Admin Deletes Any Contribution - P2 ❌

### Category 7: Callout Access Control by Role (5 scenarios)

38. **7.1** - Space Admin - Full Access - P1 ✅ `callout-access-control.spec.ts`
39. **7.2** - Space Member - Limited Access - P1 ✅ `callout-access-control.spec.ts`
40. **7.3** - Subspace Admin in Parent Space - P2 ❌
41. **7.4** - Global Admin Override - P2 ❌
42. **7.5** - Lead Role Permissions - P3 ❌

### Category 8: Callout Types - Specific Behaviors (4 scenarios)

43. **8.1** - Post Collection - Full Workflow - P1 ✅ `callout-full-workflow.spec.ts`
44. **8.2** - Whiteboard - Collaborative Editing - P2 ❌
45. **8.3** - Link Collection - URL Validation - P2 ❌
46. **8.4** - Memo Callout - Rich Text - P3 ❌

### Category 9: Cross-Level Callout Visibility (3 scenarios)

47. **9.1** - View Space Callouts from Subspace - P2 ❌
48. **9.2** - Private Subspace Callouts - Non-Member Cannot View - P1 ❌
49. **9.3** - Callout Discovery - Search/Filter - P3 ❌

### Category 10: Error Handling and Edge Cases (5 scenarios)

50. **10.1** - Create Callout with Missing Required Fields - P2 ❌
51. **10.2** - Create Callout with Duplicate Name - P3 ❌
52. **10.3** - Delete Callout with Active Comments - P2 ❌
53. **10.4** - Session Timeout During Edit - P3 ❌
54. **10.5** - Concurrent Edit Conflict - P3 ❌

---

## Implementation Statistics

| Category                              | Total  | ✅ Implemented | ⏸️ Skipped | ❌ Not Implemented |
| ------------------------------------- | ------ | -------------- | ---------- | ------------------ |
| 1. Callout Creation                   | 7      | 5              | 0          | 2                  |
| 2. Callout Viewing and Discovery      | 6      | 3              | 0          | 3                  |
| 3. Callout Editing and Updates        | 5      | 4              | 0          | 1                  |
| 4. Callout Deletion                   | 4      | 2              | 0          | 2                  |
| 5. Comments on Callouts               | 8      | 3              | 0          | 5                  |
| 6. Callout Contributions              | 7      | 2              | 0          | 5                  |
| 7. Callout Access Control by Role     | 5      | 2              | 0          | 3                  |
| 8. Callout Types - Specific Behaviors | 4      | 1              | 0          | 3                  |
| 9. Cross-Level Callout Visibility     | 3      | 0              | 0          | 3                  |
| 10. Error Handling and Edge Cases     | 5      | 0              | 0          | 5                  |
| **Total**                             | **54** | **22**         | **0**      | **32**             |

**Test Files Location:** `client-web/src/functional-e2e/callouts/`

**Total Test Files:** 9

---

**Total Test Scenarios: 54**

- **P1 (Critical)**: 22 scenarios (22 implemented ✅)
- **P2 (Important)**: 24 scenarios (0 implemented)
- **P3 (Nice to have)**: 8 scenarios (0 implemented)

---

## Out of Scope for Initial Implementation

- Email notification verification for callout activities (covered in separate notification tests)
- Advanced callout analytics and reporting
- Bulk callout operations
- Callout archiving functionality
- Integration with external collaboration tools
- Detailed audit logging verification
- Performance testing with hundreds of callouts
- Callout templates library management (separate test plan)
