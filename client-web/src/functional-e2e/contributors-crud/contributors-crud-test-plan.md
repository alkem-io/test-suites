# Contributors CRUD Test Plan

**Issue:** #1696
**Scope:** Full CRUD operations testing for User, Organization, and Virtual Contributor (VC)
**Test Strategy:** Automated E2E tests using Playwright

## Test Environment Setup

**Seed Spec:** [seed-contributors-crud.spec.ts](./seed-contributors-crud.spec.ts)

**Pre-conditions:**

- Base scenario with verified organization
- Public space with community members (Space Admin, Space Member, Beta Tester)
- Innovation Pack with templates for VC knowledge management
- Platform discussion for VC tagging
- Multiple authenticated sessions for different user roles

**Test Users (from agents.md):**

- Global Admin (GA): Organization creation
- Organization Admin: Organization management
- Space Admin: Space-level operations
- Space Member: Member-level interactions
- Beta Tester: Feature testing

---

## 1. User CRUD Tests

### 1.1 User Registration

**Test:** `User registers successfully with all required fields`

**Reference:** Existing test pattern from 'user successful registration email accept terms and fill all required fields'

**Steps:**

1. Navigate to sign-up page
2. Accept Terms of Use and Privacy Policy checkbox
3. Fill in required fields:
   - Email
   - First Name
   - Last Name
   - Password
4. Submit registration form
5. Verify email confirmation sent
6. Verify user account created

**Expected Result:**

- User account created successfully
- Confirmation email sent
- User can log in with credentials

**Test Roles:** New user (anonymous → registered)

---

### 1.2 User Profile - Update and Verify Display

**Test:** `Update user profile and verify display for self and others`

**Steps:**

1. Log in as registered user
2. Navigate to user profile
3. Update profile fields:
   - Display name
   - Tagline
   - Bio/Description
4. Save changes
5. Verify profile displays correctly in own view
6. Log in as different user
7. Navigate to updated user's profile
8. Verify profile displays correctly for other users

**Expected Result:**

- Profile updates saved successfully
- Changes visible in user's own profile view
- Changes visible to other users
- Avatar displays correctly
- All fields render properly

**Test Roles:** Space Member (profile owner), Space Admin (viewer)

---

## Updated

### 1.3 User Account Tab

**Test:** `Verify account tab components and functionality`

**Steps:**

1. Log in as user
2. Navigate to user profile → Account tab
3. Verify account tab components visible:
   - Hosted Spaces block
   - Virtual Contributors block
   - Template Packs block
   - Custom Homepages block
4. Verify number of used versus available entities (Spaces, VCs, Templates, Homepages)
5. Verify editable fields can be modified

**Expected Result:**

- All account information displayed correctly
  - Hosted Spaces block - 0/0
  - Virtual Contributors block - 0/0
  - Template Packs block - 0/0
  - Custom Homepages block - 0/0
- Read-only fields cannot be edited
- Editable fields update successfully

**Test Roles:** Space Member

---

### 1.4 User Membership Tab

**Test:** `Verify membership tab components`

**Steps:**

1. Log in as user
2. Navigate to user profile → Membership tab
3. Verify membership tab displays:
   - List of Spaces user is member of
   - List of Organizations user belongs to
   - Membership roles for each Space/Organization
4. Verify membership cards are clickable (navigate to Space/Org)
5. Verify role badges display correctly

**Expected Result:**

- All memberships listed correctly
- Roles displayed accurately - NOTE: roles are not displayed for spaces
- Navigation to Spaces/Orgs works
- Membership data is up to date

**Test Roles:** Space Member, Space Admin (with multiple memberships)

---

### 1.5 User Notifications Tab - Verify and Update

**Test:** `Verify notifications tab and update notification preferences`

**Steps:**

1. Log in as user
2. Navigate to user profile → Notifications tab
3. Verify notifications tab components:
   - Notification preferences list
   - Categories (email, platform, etc.)
4. Update notification preferences:
   - Toggle one notification type from each category on the page
5. Save changes
6. Verify preferences saved
7. Refresh page and verify persistence

**Expected Result:**

- All notification preferences displayed
- Toggle switches work correctly
- Changes save successfully
- Preferences persist after refresh

**Test Roles:** Space Member

---

### 1.6 User Settings Tab - Verify and Update

**Test:** `Verify settings tab components and update settings`

**Steps:**

1. Log in as user
2. Navigate to user profile → Settings tab
3. Verify settings tab components:
   - Privacy settings
4. Update settings:
   - Change privacy setting
5. Save changes
6. Verify settings applied

**Expected Result:**

- All settings options displayed
- Settings can be modified
- Changes save successfully
- Settings take effect immediately or after refresh

**Test Roles:** Space Member

---

### 1.7 Organization Deletion - User Membership Verification

**Test:** `Delete organization and verify users no longer have it under memberships`

**Steps:**

1. Log in as Global Admin
2. Navigate to organization profile
3. Note users who are members of the organization
4. Navigate to Global Administration / Organization
5. Initiate organization deletion
6. Confirm deletion
7. Verify organization deleted successfully
8. Log out
9. Log in as user who was organization member (Space Member)
10. Navigate to user profile → Membership tab
11. Verify deleted organization no longer appears in memberships list
12. Log in as different user who was organization admin (Organization Admin)
13. Navigate to user profile → Membership tab
14. Verify deleted organization no longer appears in memberships list

**Expected Result:**

- Organization deleted successfully by Global Admin
- Organization removed from all users' membership lists
- Multiple users verified to no longer show organization membership
- Organization profile no longer accessible
- Users can still access their profiles normally

**Test Roles:** Global Admin (deleter), Space Member (verifier), Organization Admin (verifier)

---

### 1.8 User Role-Based Testing

**Test:** `Verify user profile behaviors across different user roles`

**Steps:**

1. Run profile update tests with Space Admin role
2. Run profile update tests with Org Admin role
3. Run profile update tests with Beta Tester role
4. Run profile update tests with Space Member role
5. Compare behaviors and permissions
6. Verify role-specific features visible/hidden correctly

**Expected Result:**

- All roles can update their own profiles
- Different roles see appropriate UI elements
- Permissions respected across roles
- No unauthorized access to restricted features

**Test Roles:** Space Admin, Org Admin, Beta Tester, Space Member

---

## 2. Organization CRUD Tests

### 2.1 Organization Creation (via Global Admin)

**Test:** `Global Admin creates organization from administration section`

**Steps:**

1. Log in as Global Admin
2. Navigate to Global Administration section
3. Navigate to Organizations management
4. Click "Create Organization"
5. Fill in organization details:
   - Display Name
   - NameID
6. Submit creation form
7. Verify organization created successfully
8. Assign Organization Admin user as owner

**Expected Result:**

- Organization created successfully
- Organization appears in organizations list
- Organization Admin assigned as owner
- Organization profile accessible

**Test Roles:** Global Admin (creator)

---

### 2.2 Organization Profile - Update and Verify Display

**Test:** `Organization Admin updates profile and verifies display`

**Steps:**

1. Log in as Organization Admin
2. Navigate to organization profile
3. Update organization profile:
   - Display name
   - Tagline
   - Description
   - Logo/Avatar
   - Website URL
   - Social links
   - Tags
4. Save changes
5. Verify profile displays correctly in admin view
6. Log out and view as anonymous user
7. Verify public profile displays correctly
8. Log in as different user
9. Verify profile displays correctly for other users

**Expected Result:**

- Profile updates saved successfully
- Changes visible in admin view
- Changes visible to public users
- Changes visible to other authenticated users
- All fields render properly

**Test Roles:** Org Admin (editor), anonymous (viewer), Space Member (viewer)

---

### 2.3 Organization Account Tab

**Test:** `Verify organization account tab components`

**Steps:**

1. Log in as Organization Admin
2. Navigate to organization profile → Account tab
3. Verify account tab components:
   - Hosted Spaces block
   - Virtual Contributors block
   - Template Packs block
   - Custom Homepages block
4. Verify read-only fields display correctly
5. Verify editable fields can be modified

**Expected Result:**

- All account information displayed correctly
  - Hosted Spaces block - 1/3
  - Virtual Contributors block - 0/3
  - Template Packs block - 0/3
  - Custom Homepages block - 0/1
- Read-only fields cannot be edited
- Editable fields update successfully

**Test Roles:** Org Admin

---

### 2.4 Organization Community Tab - Assign and Remove Users

**Test:** `Verify community tab and manage user assignments`

**Steps:**

1. Log in as Organization Admin
2. Navigate to organization profile → Community tab
3. Verify community tab components:
   - List of organization members
   - Member roles
   - Add member button
   - Member search/filter
4. Assign new user to organization:
   - Click "Add Member"
   - Search for user (use Space Member)
   - Select user
   - Assign role
   - Confirm assignment
5. Verify user appears in members list
6. Verify user role displayed correctly
7. Remove user from organization:
   - Select user in members list
   - Click remove/delete
   - Confirm removal
8. Verify user removed from members list

**Expected Result:**

- Community tab displays all members correctly
- User can be added successfully
- User role assigned correctly
- User appears in members list after assignment
- User can be removed successfully
- User disappears from members list after removal

**Test Roles:** Org Admin (manager), Space Member (assignee)

---

### 2.5 Organization Authorization Tab - Manage Permissions

**Test:** `Verify authorization tab and manage user permissions`

**Steps:**

1. Log in as Organization Admin
2. Navigate to organization profile → Authorization tab
3. Verify authorization tab components:
   - List of users with permissions
   - Permission levels/roles
   - Add authorization button
4. Assign authorization to user:
   - Add user as member to Organization (use Space Admin)
   - Click "Add Authorization"
   - Search for user (use Space Admin)
   - Select user
   - Assign permission level
   - Confirm authorization
5. Verify user appears in authorization list
6. Verify permission level displayed correctly
7. Remove authorization from user:
   - Select user in authorization list
   - Click remove/revoke
   - Confirm removal
8. Verify user removed from authorization list

**Expected Result:**

- Authorization tab displays all authorized users
- User can be authorized successfully
- Permission level assigned correctly
- User appears in authorization list
- User authorization can be revoked
- User disappears from authorization list after revocation

**Test Roles:** Org Admin (manager), Space Admin (assignee)

---

### 2.6 Organization Settings Tab

**Test:** `Verify organization settings tab components`

**Steps:**

1. Log in as Organization Admin
2. Navigate to organization profile → Settings tab
3. Verify settings tab components:
   - Other organization settings
4. Update 1 organization setting
5. Save changes
6. Verify settings applied

**Expected Result:**

- All settings options displayed
- Settings can be modified by Org Admin
- Changes save successfully
- Settings take effect

**Test Roles:** Org Admin

---

### 2.7 Organization Deletion and Member Verification

**Test:** `Delete organization and verify member removal`

**Steps:**

1. Log in as Global Admin
2. Navigate to Global Adminstration / Organization profile
3. Note organization members before deletion
4. Initiate organization deletion
5. Confirm deletion (may require password/confirmation)
6. Verify organization deleted successfully
7. Log in as user who was organization member
8. Navigate to user profile → Membership tab
9. Verify deleted organization no longer appears in memberships
10. Attempt to navigate to organization profile URL
11. Verify organization not found error or redirect

**Expected Result:**

- Organization deleted successfully
- Organization removed from all members' profiles
- Organization profile no longer accessible
- Organization does not appear in organizations list
- Former members no longer show organization membership

**Test Roles:** Global Admin (deleter), Organization Admin (former admin, verifier)

---

## 3. Virtual Contributor (VC) CRUD Tests

### 3.1 Virtual Contributor Creation

**Test:** `Create new Virtual Contributor with all required details`

**Steps:**

1. Log in as Organization Admin
2. Go to Dashboard
3. Navigate to personal profile
4. Navigate to associated organization profile
5. Navigate to Settings tab
6. Navigate to Account page
7. Click "Create new Virtual Contributor"
8. Fill in VC details:
   - Upload avatar image
   - Fill in name/display name
   - Fill in description
   - Choose knowledge type: "Written knowledge in text"
9. Click "Create"
10. Verify VC created successfully

**Expected Result:**

- VC creation form displays correctly
- All fields can be filled
- Avatar uploads successfully
- VC created and visible in organization
- VC profile accessible

**Test Roles:** Org Admin

---

### 3.2 Virtual Contributor - Add Knowledge (Post)

**Test:** `Add text post knowledge to Virtual Contributor`

**Steps:**

1. Log in as Organization Admin
2. Navigate to VC profile
3. Navigate to Knowledge/Body of Knowledge (BoK) section
4. Click "Add Post"
5. Fill in post details:
   - Change/add title
   - Paste text content in post body
   - Add formatting if available
6. Click "Add Post" to save
7. Verify post appears in VC knowledge base

**Expected Result:**

- Post creation form displays
- Title and text can be entered
- Post saves successfully
- Post visible in VC Body of Knowledge
- Post displays correctly with formatting

**Test Roles:** Org Admin

---

### 3.3 Virtual Contributor - Add Knowledge (Document)

**Test:** `Add document knowledge to Virtual Contributor`

**Steps:**

1. Log in as Organization Admin
2. Navigate to VC profile
3. Navigate to Knowledge/BoK section
4. Click "Add Document"
5. Fill in document details:
   - Give title/name
   - Upload document file (PDF, DOCX, etc.)
6. Click "Continue" or "Upload"
7. Verify document uploads successfully
8. Verify document appears in VC knowledge base

**Expected Result:**

- Document upload form displays
- Title can be entered
- Document file uploads successfully
- Document visible in VC Body of Knowledge
- Document can be downloaded/viewed

**Test Roles:** Org Admin

---

### 3.4 Virtual Contributor - Space Interaction Setup

**Test:** `Select Space for VC to start interacting`

**Steps:**

1. Log in as Organization Admin
2. Navigate to VC profile
3. Navigate to VC Settings
4. Find "Space Interactions" or "Associated Spaces" section
5. Select Space from dropdown (use CRUD Test Space from scenario)
6. Enable VC interaction with Space
7. Save settings
8. Verify VC associated with Space

**Expected Result:**

- Space selection dropdown displays available spaces
- Space can be selected
- Association saves successfully
- VC appears in Space context
- VC ready to receive mentions/tags

**Test Roles:** Org Admin

---

### 3.5 Virtual Contributor - Tagging in Discussion

**Test:** `Tag Virtual Contributor with question in discussion`

**Steps:**

1. Log in as Space Member
2. Navigate to Space
3. Navigate to Forum/Discussion
4. Open existing discussion (from platform discussion in scenario)
5. Create new comment/post
6. Type "@" to trigger VC mention
7. Search for and select VC
8. Add question text after VC mention
9. Post comment
10. Verify VC tagged successfully
11. Verify VC mention displays correctly
12. (Optional) Check if VC responds based on knowledge

**Expected Result:**

- "@" mention triggers VC search
- VC appears in mention suggestions
- VC can be tagged in comment
- Comment posts successfully
- VC mention displays as link/badge
- VC may generate response based on knowledge

**Test Roles:** Space Member (tagger)

---

### 3.6 Virtual Contributor - Profile Navigation

**Test:** `Navigate to Virtual Contributor profile from mention`

**Steps:**

1. Log in as Space Member
2. Navigate to discussion with VC mention (from previous test)
3. Click on VC mention/link in comment
4. Verify navigation to VC profile
5. Verify VC profile displays:
   - Name and avatar
   - Description
   - Associated organization
   - Body of Knowledge section
   - Interaction history (if visible)

**Expected Result:**

- VC mention is clickable
- Clicking navigates to VC profile
- VC profile displays correctly
- All profile sections visible
- Knowledge base accessible

**Test Roles:** Space Member

---

### 3.7 Virtual Contributor - Settings and Visibility

**Test:** `Change Virtual Contributor visibility to hidden`

**Steps:**

1. Log in as Organization Admin
2. Navigate to VC profile
3. Navigate to VC Settings tab
4. Find "Visibility" or "Privacy" setting
5. Change visibility to "Hidden"
6. Save settings
7. Log out
8. Log in as different user (Space Member)
9. Attempt to navigate to VC profile
10. Verify VC not visible/accessible
11. Verify VC does not appear in search
12. Verify VC does not appear in mention suggestions

**Expected Result:**

- Visibility setting can be changed to hidden
- Setting saves successfully
- Hidden VC not visible to other users
- Hidden VC not searchable
- Hidden VC not available for mentions
- Org Admin can still access hidden VC

**Test Roles:** Org Admin (editor), Space Member (verifier)

---

### 3.8 Virtual Contributor - Body of Knowledge Access

**Test:** `Visit and verify VC Body of Knowledge`

**Steps:**

1. Log in as Space Member
2. Navigate to VC profile (ensure VC is public)
3. Click on "Body of Knowledge" or "Visit BoK" section
4. Verify BoK displays:
   - All posts added previously
   - All documents uploaded previously
   - Knowledge organized by type/category
   - Search/filter functionality (if available)
5. Click on a post to read full content
6. Verify post displays correctly
7. Click on a document to download/view
8. Verify document accessible
9. Close BoK or navigate back

**Expected Result:**

- Body of Knowledge section accessible
- All knowledge items displayed
- Posts readable with full content
- Documents downloadable/viewable
- Navigation and UI work correctly
- Knowledge properly categorized

**Test Roles:** Space Member

---

### 3.9 Virtual Contributor Deletion

**Test:** `Delete Virtual Contributor and verify removal`

**Steps:**

1. Log in as Organization Admin
2. Navigate to VC profile
3. Navigate to VC Settings → Account/Danger Zone
4. Click "Delete Virtual Contributor"
5. Confirm deletion
6. Verify VC deleted successfully
7. Verify VC profile no longer accessible
8. Navigate to organization profile
9. Verify VC no longer listed in organization's VCs
10. Navigate to Space where VC was mentioned
11. Verify VC mentions show as deleted/unavailable
12. Verify VC knowledge no longer accessible

**Expected Result:**

- VC can be deleted by Org Admin
- Deletion confirmation required
- VC removed from organization
- VC profile inaccessible after deletion
- VC mentions show as deleted
- VC knowledge removed/archived

**Test Roles:** Org Admin (deleter), Space Member (verifier)

---

## Test Execution Strategy

### Test Suite Organization

1. **Suite 1: User CRUD** (8 tests)
   - user-crud.spec.ts
   - Covers registration, profile, tabs, deletion

2. **Suite 2: Organization CRUD** (7 tests)
   - organization-crud.spec.ts
   - Covers creation, profile, community, authorization, deletion

3. **Suite 3: Virtual Contributor CRUD** (9 tests)
   - virtual-contributor-crud.spec.ts
   - Covers creation, knowledge, interactions, visibility, deletion

### Test Data Strategy

- Use seed spec to create base scenario before each suite
- Create dedicated test users for each role
- Clean up test data after each suite completes
- Use unique identifiers to avoid conflicts

### Execution Order

1. Run seed spec to create base scenario
2. Run User CRUD tests (can run in parallel within suite)
3. Run Organization CRUD tests (serial execution recommended)
4. Run Virtual Contributor CRUD tests (serial execution recommended)
5. Clean up all test data

### Success Criteria

- All 24 test cases pass
- All CRUD operations verified
- All user roles tested
- No data leaks between tests
- Proper cleanup after test execution

---

## Notes and Considerations

### User Registration

- May require email verification flow
- Consider using test email service or mock
- Password requirements may vary

### Organization Management

- Global Admin should only create organization
- All subsequent changes by Org Admin
- Deletion may have cascading effects

### Virtual Contributor

- Knowledge management may have rate limits
- File upload sizes may be restricted
- VC responses may be async
- Visibility changes may have caching delays

### Cross-Test Dependencies

- Some tests depend on previous test data
- Consider using fixtures for shared state
- Document test dependencies clearly

### Performance Considerations

- File uploads may be slow
- Organization deletion may take time
- Consider appropriate timeouts
- Use parallel execution where safe
