# Space Management - Comprehensive Test Plan

## Application Overview

The Alkemio platform provides Space management functionality that serves as the primary organizational container for collaboration. A Space represents a collaborative environment where users can work together on challenges, opportunities, and innovations. The Space functionality includes:

- **Space Creation**: Create new spaces with customizable settings including name, description, and visibility
- **Space Settings**: Configure collaboration settings, membership policies, and privacy modes (Public/Private)
- **Space Navigation**: Tab-based navigation including Home, Community, and Subspaces
- **Access Control**: Role-based permissions including Space Admins and Space Members
- **Subspace Management**: Create and manage hierarchical subspaces within a parent space
- **Collaboration Features**: Posts, callouts, and other collaborative tools
- **Community Management**: Member invitations, roles, and community building features

## Test Scenarios

### 1. Space Creation and Basic Setup

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 1.1 Create New Space with Valid Data

**Prerequisite:** User is logged in as an authorized user

**Steps:**

1. Navigate to the platform home page
2. Click on "Create my own Space" button or navigate to space creation page
3. Enter valid space name (e.g., "Innovation Hub")
4. Enter valid space nameID/handle (e.g., "innovation-hub")
5. Enter space tagline (e.g., "A space for collaborative innovation")
6. Enter detailed description in the "About" field
7. Click "Create Space" or "Submit" button

**Expected Results:**

- Space is created successfully
- User is redirected to the newly created space's home page
- Space name is displayed in the header
- Space tagline appears correctly
- User who created the space is automatically assigned as Space Admin
- Default tabs (Home, Community, Subspaces) are visible and functional

#### 1.2 Create Space with Minimum Required Fields

**Steps:**

1. Navigate to space creation page
2. Enter only required fields (space name and nameID)
3. Leave optional fields blank
4. Click "Create Space"

**Expected Results:**

- Space is created successfully with minimal information
- Default values are applied to optional fields
- Space is accessible and functional

#### 1.3 Attempt to Create Space with Duplicate NameID

**Steps:**

1. Create a space with nameID "test-space"
2. Navigate to create another space
3. Enter a different name but use the same nameID "test-space"
4. Attempt to create the space

**Expected Results:**

- Validation error message appears indicating nameID is already in use
- Space is not created
- User remains on the creation form with data preserved
- Clear error message explains the issue

#### 1.4 Create Space with Invalid Characters in NameID

**Steps:**

1. Navigate to space creation page
2. Enter valid space name
3. Enter nameID with invalid characters (e.g., "test space!", "test@space", "TEST_SPACE")
4. Attempt to create space

**Expected Results:**

- Validation error appears for nameID field
- Error message indicates allowed characters (lowercase letters, numbers, hyphens)
- Space is not created until valid nameID is provided

#### 1.5 Create Space with Excessively Long Name

**Steps:**

1. Navigate to space creation page
2. Enter a space name exceeding maximum character limit (e.g., 500 characters)
3. Attempt to create space

**Expected Results:**

- Field validation prevents entry beyond maximum length OR
- Error message appears indicating maximum length exceeded
- Space is not created with invalid data

#### 1.6 Cancel Space Creation

**Steps:**

1. Navigate to space creation page
2. Fill in some fields with data
3. Click "Cancel" or navigate away
4. Return to space creation page

**Expected Results:**

- No space is created
- User is returned to previous page or home page
- No partial data is saved
- Form is clean when returning

---

### 2. Space Privacy and Visibility Settings

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 2.1 Create Public Space

**Steps:**

1. Navigate to space creation page
2. Fill in required space information
3. In settings/privacy section, select "Public" privacy mode
4. Create the space
5. Log out
6. Browse as anonymous user to the space URL

**Expected Results:**

- Space is created with Public privacy mode
- Anonymous users can view the space
- Public space appears in space listings/search results
- Basic information is visible without authentication

#### 2.2 Create Private Space

**Steps:**

1. Navigate to space creation page
2. Fill in required space information
3. In settings/privacy section, select "Private" privacy mode
4. Create the space
5. Log out
6. Attempt to access the space URL as anonymous user

**Expected Results:**

- Space is created with Private privacy mode
- Anonymous users cannot access the space
- Access attempt redirects to login page or shows access denied message
- Private space does not appear in public listings

#### 2.3 Change Space from Public to Private

**Prerequisite:** Public space exists

**Steps:**

1. Navigate to existing public space
2. Go to Space Settings (as Space Admin)
3. Change privacy setting from "Public" to "Private"
4. Save changes
5. Log out and attempt to access space

**Expected Results:**

- Privacy setting is updated successfully
- Previously accessible space is now restricted
- Existing members retain access
- Non-members cannot access space
- Space disappears from public listings

#### 2.4 Change Space from Private to Public

**Prerequisite:** Private space exists

**Steps:**

1. Navigate to existing private space
2. Go to Space Settings (as Space Admin)
3. Change privacy setting from "Private" to "Public"
4. Save changes
5. Log out and verify space is accessible

**Expected Results:**

- Privacy setting is updated successfully
- Space becomes publicly accessible
- Space appears in public space listings
- Content is visible to anonymous users (where appropriate)

---

### 3. Space Navigation and Tabs

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 3.1 Navigate to Home Tab

**Prerequisite:** Space exists and user is logged in

**Steps:**

1. Navigate to a space
2. Click on "Home" tab

**Expected Results:**

- Home tab is selected/highlighted
- Home content is displayed (overview, about section, key information)
- URL updates to reflect home tab
- Other tabs are not selected

#### 3.2 Navigate to Community Tab

**Steps:**

1. Navigate to a space
2. Click on "Community" tab

**Expected Results:**

- Community tab is selected/highlighted
- Community content is displayed (members list, roles, invitations)
- URL updates to reflect community tab
- Member count is visible
- Admin and member lists are accessible

#### 3.3 Navigate to Subspaces Tab

**Steps:**

1. Navigate to a space
2. Click on "Subspaces" tab

**Expected Results:**

- Subspaces tab is selected/highlighted
- Subspaces content is displayed (list of subspaces or empty state)
- URL updates to reflect subspaces tab
- If no subspaces exist, appropriate empty state message is shown
- Option to create subspace is available (if user has permission)

#### 3.4 Direct URL Navigation to Specific Tab

**Steps:**

1. Open browser and directly navigate to space URL with tab parameter (e.g., `/space-name?tab=2` for Community)
2. Verify correct tab is loaded

**Expected Results:**

- Page loads with specified tab active
- Tab content is displayed correctly
- Navigation state is consistent
- URL parameter is preserved

#### 3.5 Tab Navigation Persistence on Page Refresh

**Steps:**

1. Navigate to a space and select Community tab
2. Refresh the browser page

**Expected Results:**

- After refresh, Community tab remains selected
- Tab content is re-loaded correctly
- User's position in the space is maintained

---

### 4. Space Membership and Community Management

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 4.1 View Space Members as Admin

**Prerequisite:** Space exists with multiple members

**Steps:**

1. Log in as Space Admin
2. Navigate to space
3. Click on "Community" tab
4. View members list

**Expected Results:**

- All space members are listed
- Member roles are clearly indicated (Admin, Member)
- Member profile information is visible (name, avatar)
- Admin has options to manage members

#### 4.2 Invite User to Space

**Prerequisite:** User is Space Admin

**Steps:**

1. Navigate to space Community tab
2. Click "Invite" or "Add Member" button
3. Enter user email or search for existing user
4. Select user role (Member or Admin)
5. Add optional invitation message
6. Send invitation

**Expected Results:**

- Invitation is sent successfully
- Invited user receives notification
- Pending invitation appears in invitations list
- Invitation email is sent (if applicable)

#### 4.3 Accept Space Invitation

**Prerequisite:** User has received space invitation

**Steps:**

1. Log in as invited user
2. Navigate to notifications or invitations section
3. View space invitation
4. Click "Accept" invitation

**Expected Results:**

- User is added to space community
- User appears in space members list with appropriate role
- User can now access space content according to role permissions
- Invitation is removed from pending list

#### 4.4 Decline Space Invitation

**Prerequisite:** User has received space invitation

**Steps:**

1. Log in as invited user
2. Navigate to invitations section
3. View space invitation
4. Click "Decline" or "Reject" invitation

**Expected Results:**

- Invitation is declined
- User is not added to space
- Invitation is removed from user's pending list
- Space admin is notified of declined invitation (optional)

#### 4.5 Remove Member from Space

**Prerequisite:** User is Space Admin, space has multiple members

**Steps:**

1. Log in as Space Admin
2. Navigate to space Community tab
3. Locate a space member in the members list
4. Click "Remove" or member management option
5. Confirm removal action

**Expected Results:**

- Member is removed from space
- Removed member no longer appears in members list
- Removed member loses access to private space content
- Removed member receives notification of removal

#### 4.6 Promote Member to Admin

**Prerequisite:** User is Space Admin, space has regular members

**Steps:**

1. Log in as Space Admin
2. Navigate to space Community tab
3. Select a space member
4. Change role from "Member" to "Admin"
5. Save changes

**Expected Results:**

- Member role is updated to Admin
- Updated member now has admin permissions
- Updated member can access admin features
- Role change is reflected in members list

#### 4.7 Demote Admin to Member

**Prerequisite:** Space has multiple admins

**Steps:**

1. Log in as Space Admin
2. Navigate to space Community tab
3. Select another admin
4. Change role from "Admin" to "Member"
5. Save changes

**Expected Results:**

- Admin role is changed to Member
- User loses admin permissions
- User retains member access to space
- At least one admin must remain (validation)

---

### 5. Subspace Management

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 5.1 Create Subspace within Space

**Prerequisite:** Parent space exists, user is Space Admin

**Steps:**

1. Navigate to parent space
2. Go to Subspaces tab
3. Click "Create Subspace" button
4. Enter subspace name (e.g., "Q1 Innovation Projects")
5. Enter subspace nameID (e.g., "q1-innovation")
6. Enter subspace description
7. Create subspace

**Expected Results:**

- Subspace is created successfully
- Subspace appears in parent space's Subspaces tab
- Subspace has its own URL under parent space
- Subspace inherits some settings from parent
- Creator is admin of the subspace

#### 5.2 Navigate to Subspace from Parent Space

**Prerequisite:** Subspace exists within parent space

**Steps:**

1. Navigate to parent space
2. Go to Subspaces tab
3. Click on a subspace from the list

**Expected Results:**

- User is navigated to the subspace
- Subspace loads with its own content
- Breadcrumb navigation shows hierarchy (Parent > Subspace)
- Subspace has its own tabs (Home, Community, Subspaces)

#### 5.3 Create Nested Subspace (Subspace within Subspace)

**Prerequisite:** Subspace exists

**Steps:**

1. Navigate to existing subspace
2. Go to Subspaces tab
3. Create a new subspace within current subspace
4. Fill in required information
5. Create nested subspace

**Expected Results:**

- Nested subspace is created successfully
- Hierarchy is maintained (Space > Subspace > Nested Subspace)
- Breadcrumb navigation reflects full hierarchy
- Navigation between levels is functional

#### 5.4 View Empty Subspaces List

**Prerequisite:** Space exists with no subspaces

**Steps:**

1. Navigate to space
2. Go to Subspaces tab

**Expected Results:**

- Empty state message is displayed
- Message indicates no subspaces exist
- Call-to-action to create first subspace is present (if user has permission)
- Page layout is clean and informative

#### 5.5 Delete Subspace

**Prerequisite:** Subspace exists, user is Space Admin

**Steps:**

1. Navigate to subspace or parent space settings
2. Access subspace management/settings
3. Select "Delete" option for subspace
4. Confirm deletion action
5. Verify deletion

**Expected Results:**

- Confirmation dialog appears with warning about permanent deletion
- After confirmation, subspace is deleted
- Subspace is removed from parent's subspaces list
- Subspace URL becomes inaccessible
- Associated data is removed or archived per policy

---

### 6. Space Settings and Configuration

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 6.1 Access Space Settings as Admin

**Prerequisite:** User is Space Admin

**Steps:**

1. Navigate to space
2. Click on "Settings" or configuration icon
3. View settings page

**Expected Results:**

- Settings page is accessible
- Multiple setting categories are available (General, Privacy, Membership, Collaboration)
- Current settings values are displayed
- Edit options are available

#### 6.2 Update Space Name

**Prerequisite:** User is Space Admin

**Steps:**

1. Navigate to space settings
2. Go to General settings
3. Update space name to new value
4. Save changes
5. Return to space home page

**Expected Results:**

- Space name is updated successfully
- New name appears in space header
- New name appears in all space references
- Update confirmation message is shown

#### 6.3 Update Space Description

**Steps:**

1. Navigate to space settings
2. Update "About" or description field
3. Save changes
4. View space home page

**Expected Results:**

- Description is updated successfully
- New description appears on home page
- Changes are immediately visible
- Formatting is preserved (if rich text)

#### 6.4 Configure Collaboration Settings

**Steps:**

1. Navigate to space settings
2. Go to Collaboration settings section
3. Enable/disable collaboration features:
   - Post collection callouts
   - Tutorial callouts
   - Other collaboration tools
4. Save settings

**Expected Results:**

- Settings are saved successfully
- Enabled features become available in space
- Disabled features are hidden/removed
- Changes take effect immediately

#### 6.5 Configure Membership Settings

**Steps:**

1. Navigate to space settings
2. Go to Membership settings section
3. Configure membership policies:
   - Open membership vs. approval required
   - Member invitation permissions
   - Member visibility settings
4. Save settings

**Expected Results:**

- Membership settings are updated
- New policies are enforced immediately
- Appropriate users can invite members based on settings
- Membership flow follows configured policy

#### 6.6 Attempt to Access Settings as Non-Admin

**Prerequisite:** User is Space Member (not Admin)

**Steps:**

1. Log in as regular space member
2. Navigate to space
3. Attempt to access settings

**Expected Results:**

- Settings option is not visible OR
- Access is denied with appropriate message
- User cannot modify space settings
- Read-only view may be available for some settings

---

### 7. Space Content and Collaboration

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 7.1 View Space Home Page Content

**Prerequisite:** Space exists with content

**Steps:**

1. Navigate to space
2. View Home tab content

**Expected Results:**

- Space overview is displayed
- Space description/about section is visible
- Key metrics or statistics are shown (if configured)
- Featured content or callouts are displayed
- Layout is clean and professional

#### 7.2 View Post Collection Callout

**Prerequisite:** Space has post collection callout enabled

**Steps:**

1. Navigate to space with post callout enabled
2. Locate post collection section
3. View existing posts

**Expected Results:**

- Post collection callout is visible
- Existing posts are listed
- Post creation option is available (if user has permission)
- Posts display author, date, and content preview

#### 7.3 Create Post in Space

**Prerequisite:** User is space member, post callout exists

**Steps:**

1. Navigate to space
2. Locate post collection callout
3. Click "Create Post" or similar button
4. Enter post title
5. Enter post content
6. Add tags or categories (if available)
7. Submit post

**Expected Results:**

- Post is created successfully
- Post appears in collection
- Post shows correct author and timestamp
- Other space members can view the post

#### 7.4 View Tutorial Callouts

**Prerequisite:** Space has tutorial callouts enabled

**Steps:**

1. Navigate to space as new user
2. Observe tutorial callouts or guidance

**Expected Results:**

- Tutorial callouts are displayed appropriately
- Callouts guide user through space features
- Callouts can be dismissed
- Dismissed callouts don't reappear unnecessarily

---

### 8. Space Search and Discovery

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 8.1 Search for Public Space

**Steps:**

1. Navigate to platform home or spaces listing page
2. Use search functionality
3. Enter space name or keywords
4. View search results

**Expected Results:**

- Public spaces matching search criteria are displayed
- Search results include space name, tagline, and description
- Results are relevant to search query
- Results can be filtered/sorted
- Private spaces are not shown to non-members

#### 8.2 Browse Space Listings

**Steps:**

1. Navigate to spaces directory or listing page
2. Browse available spaces

**Expected Results:**

- Public spaces are listed
- Each space shows key information (name, tagline, member count)
- Spaces can be filtered by category or type
- Pagination is available if many spaces exist
- User can click to view space details

#### 8.3 Search Within Space Content

**Prerequisite:** User is space member

**Steps:**

1. Navigate to space
2. Use in-space search feature
3. Search for posts, content, or members
4. View search results

**Expected Results:**

- Search functionality is available within space
- Results are filtered to current space
- Different content types are searchable (posts, members, documents)
- Results are relevant and accurate

---

### 9. Space Permissions and Access Control

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 9.1 Verify Admin Permissions

**Prerequisite:** User is Space Admin

**Steps:**

1. Log in as Space Admin
2. Navigate to space
3. Verify available actions:
   - Edit space settings
   - Manage members
   - Create/delete subspaces
   - Manage content
   - View analytics (if available)

**Expected Results:**

- All admin actions are available
- Settings and management options are accessible
- Admin can perform privileged operations
- Admin UI elements are visible

#### 9.2 Verify Member Permissions

**Prerequisite:** User is Space Member (not Admin)

**Steps:**

1. Log in as Space Member
2. Navigate to space
3. Attempt various actions:
   - View space content
   - Create posts
   - View community members
   - Attempt to edit settings

**Expected Results:**

- Member can view space content
- Member can create content (posts, comments) where permitted
- Member can view community information
- Member cannot access admin functions
- Admin options are hidden or disabled

#### 9.3 Verify Non-Member Access to Private Space

**Prerequisite:** Private space exists, user is not member

**Steps:**

1. Log in as user who is not space member
2. Attempt to navigate to private space URL
3. Attempt to find space in listings

**Expected Results:**

- Direct URL access is denied
- Access denied message or redirect to login
- Space does not appear in search results
- User cannot view space content

#### 9.4 Verify Non-Member Access to Public Space

**Prerequisite:** Public space exists, user is not member

**Steps:**

1. Log in as user who is not space member
2. Navigate to public space
3. View available content and actions

**Expected Results:**

- User can view public space content
- Limited actions are available (viewing only)
- User can see option to request membership or join
- Some features may be restricted to members

---

### 10. Space Lifecycle and State Management

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 10.1 Archive Space

**Prerequisite:** User is Space Admin, archival feature exists

**Steps:**

1. Navigate to space settings
2. Locate archive or deactivate option
3. Confirm space archival
4. Verify space state

**Expected Results:**

- Space is archived successfully
- Archived space is read-only
- Archived space may be hidden from active listings
- Space content is preserved but not editable
- Archived status is clearly indicated

#### 10.2 Restore Archived Space

**Prerequisite:** Archived space exists

**Steps:**

1. Access archived spaces list
2. Select archived space
3. Choose restore/reactivate option
4. Confirm restoration

**Expected Results:**

- Space is restored to active state
- Space becomes editable again
- Space reappears in active listings
- All content and settings are preserved

#### 10.3 Handle Space Name Conflicts

**Steps:**

1. Create space with name "Test Space" and nameID "test-space"
2. Attempt to create another space with same nameID
3. Verify validation

**Expected Results:**

- System prevents duplicate nameID
- Clear error message is shown
- First space maintains its nameID
- Alternative nameIDs are suggested

---

### 11. Edge Cases and Error Handling

**Seed:** `client-web/src/functional-e2e/space-test/seed.spec.ts`

#### 11.1 Access Deleted Space

**Steps:**

1. Note URL of an existing space
2. Delete the space (as admin)
3. Attempt to access the noted URL

**Expected Results:**

- 404 or "Space not found" error is displayed
- Appropriate error message explains space no longer exists
- User is offered navigation options
- No server errors occur

#### 11.2 Handle Network Interruption During Space Creation

**Steps:**

1. Begin space creation process
2. Fill in space information
3. Simulate network interruption
4. Attempt to create space
5. Restore network and verify

**Expected Results:**

- Appropriate error message is shown
- User can retry submission
- No partial space is created
- Form data is preserved for retry

#### 11.3 Concurrent Space Edits by Multiple Admins

**Prerequisite:** Multiple admins, space exists

**Steps:**

1. Admin A opens space settings
2. Admin B opens same space settings
3. Admin A updates space name and saves
4. Admin B updates space description and saves

**Expected Results:**

- Both changes are saved appropriately OR
- Conflict resolution is handled (last write wins or merge)
- No data loss occurs
- Appropriate messaging about concurrent edits

#### 11.4 Special Characters in Space Content

**Steps:**

1. Create space with special characters in name and description:
   - Unicode characters
   - Emojis
   - HTML/XML special characters (<, >, &, ", ')
   - Markdown syntax
2. Save and view space

**Expected Results:**

- Special characters are properly encoded/escaped
- No XSS vulnerabilities exist
- Content displays correctly
- No rendering issues occur

#### 11.5 Maximum Subspace Depth

**Steps:**

1. Create deeply nested subspace hierarchy
2. Continue creating subspaces within subspaces
3. Test navigation at maximum depth

**Expected Results:**

- System enforces reasonable depth limit OR
- Deep nesting is supported but performant
- Navigation remains functional at all levels
- Breadcrumbs handle deep hierarchies gracefully

#### 11.6 Space with No Admins

**Steps:**

1. Create space with single admin
2. Attempt to remove or demote the last admin

**Expected Results:**

- System prevents removal of last admin
- Validation message explains at least one admin required
- Admin transfer process is available
- Space cannot be left without administrator

---

## Cross-Browser Testing Notes

All scenarios should be tested across:

- Chrome (Desktop)
- Firefox (Desktop)
- Safari (Desktop)
- Edge (Desktop)
- Mobile browsers (Chrome Mobile, Safari Mobile)

## Performance Considerations

- Space listing pages should load within 3 seconds
- Space navigation should be instant (client-side routing)
- Space creation should complete within 5 seconds
- Member operations should be responsive (<2 seconds)

## Accessibility Requirements

- All space features should be keyboard navigable
- Screen readers should announce space names and states clearly
- Color contrast should meet WCAG AA standards
- Focus indicators should be visible on all interactive elements

## Security Considerations

- Test authentication on all privileged operations
- Verify authorization checks for space admin actions
- Test for XSS vulnerabilities in user-generated content
- Verify CSRF protection on state-changing operations
- Test API rate limiting on space operations

## Test Data Requirements

For comprehensive testing, prepare:

- Multiple test user accounts with different roles
- Spaces with various privacy settings
- Spaces with different numbers of members (1, 10, 100+)
- Spaces with various collaboration settings enabled/disabled
- Nested subspace hierarchies of different depths
- Spaces with rich content (posts, callouts, documents)

## Known Limitations and Future Enhancements

Document any known issues, limitations, or planned features that are not yet implemented:

- Bulk member operations
- Advanced space templates
- Space cloning/duplication
- Space analytics dashboard
- Advanced permission granularity

---

## Test Execution Summary Template

When executing these tests, document results using:

| Test ID | Test Scenario                | Status    | Notes | Defects |
| ------- | ---------------------------- | --------- | ----- | ------- |
| 1.1     | Create Space with Valid Data | Pass/Fail |       |         |
| 1.2     | Create Space Minimum Fields  | Pass/Fail |       |         |
| ...     | ...                          | ...       | ...   | ...     |

---

_Test Plan Version:_ 1.0
_Last Updated:_ October 15, 2025
_Test Environment:_ dev-alkem.io
_Prepared By:_ QA Team
