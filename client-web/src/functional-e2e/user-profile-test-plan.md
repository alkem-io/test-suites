# Alkemio User Profile - Comprehensive Test Plan

## Application Overview

The Alkemio User Profile module provides comprehensive user account management functionality accessible through the "My Account" section. The profile interface is organized into six main tabs, each serving distinct purposes:

- **My profile**: Personal information and profile customization
- **account**: Hosted resources and account management (Wingback integration)
- **membership**: Space and community memberships management
- **organizations**: Organization associations and management
- **notifications**: Granular notification preferences across multiple categories
- **settings**: Privacy and visibility settings

## Test Scenarios

### 1. Navigation and Access

**Seed:** `src/functional-e2e/seed.spec.ts`

#### 1.1 Access User Profile from Dashboard

**Preconditions:**

- User is logged in
- User is on the dashboard page

**Steps:**

1. Locate and click the user icon/avatar in the top navigation bar
2. Click "My Account" from the dropdown menu

**Expected Results:**

- User is redirected to `/user/{username}/settings/account`
- User settings page loads with account tab active
- Page banner displays user's avatar and name
- All six tabs are visible: My profile, account, membership, organizations, notifications, settings

#### 1.2 Direct URL Access to User Profile

**Steps:**

1. Navigate directly to `/user/{username}/settings/profile`

**Expected Results:**

- User profile page loads successfully
- "My profile" tab is active
- Profile editing form is displayed
- User must be logged in to access

#### 1.3 Breadcrumb Navigation

**Steps:**

1. From user settings page, verify breadcrumb navigation
2. Click on "My Dashboard" breadcrumb
3. Click on "Contributors" breadcrumb
4. Click on user name breadcrumb

**Expected Results:**

- Breadcrumbs display: My Dashboard > Contributors > {username} > Settings icon
- Each breadcrumb link navigates to the correct page
- Current location is highlighted appropriately

---

### 2. My Profile Tab - View and Edit

#### 2.1 View Profile Information

**Preconditions:**

- User is on the My profile tab

**Steps:**

1. Review all displayed profile fields
2. Verify avatar image displays correctly
3. Check if all form sections are visible

**Expected Results:**

- Profile avatar is displayed (shows placeholder if not set)
- "Edit" button is visible next to avatar
- All profile fields are visible:
  - First Name (required, filled with current value)
  - Last name (required, filled with current value)
  - Full Name (required, filled with current value)
  - Phone (optional)
  - City (optional)
  - Country (dropdown, optional)
  - Tagline (optional)
  - Bio (rich text editor)
  - Skills (multi-select keywords)
  - Keywords (multi-select)
  - Social links: Linkedin, BlueSky, Github
  - Mail (disabled, shows email)
  - References section
- "Save" button is visible at the bottom

#### 2.2 Edit Profile Avatar

**Steps:**

1. Click on the avatar image or "Edit" button
2. Select a new image file
3. Verify image preview updates
4. Click "Save"

**Expected Results:**

- File picker opens when avatar/Edit button is clicked
- Only image files can be selected
- Avatar preview updates immediately after selection
- Save button becomes enabled
- Success message appears after save
- New avatar displays throughout the application

#### 2.3 Update Basic Information

**Steps:**

1. Click in the "First Name" field
2. Clear existing text and type "TestFirstName"
3. Click in the "Last name" field
4. Clear existing text and type "TestLastName"
5. Verify "Full Name" field auto-updates or can be manually edited
6. Click "Save"

**Expected Results:**

- Fields accept text input
- Full Name may auto-populate from First + Last name
- Required fields show validation indicators (\*)
- Save button becomes enabled after changes
- Success notification appears
- Updated name displays in page banner and throughout application

#### 2.4 Update Location Information

**Steps:**

1. In "City" field, type "Amsterdam"
2. Click "Country" dropdown
3. Select "Netherlands" from the list
4. Click "Save"

**Expected Results:**

- City field accepts text input with placeholder "City name"
- Country dropdown opens with searchable list of countries
- Selected country displays in the field
- Changes are saved successfully
- Location information updates on profile

#### 2.5 Add Profile Description Fields

**Steps:**

1. In "Tagline" field, type "Passionate about innovation"
2. Click in the "Bio" rich text editor
3. Type a multi-line biography
4. Use formatting toolbar to add bold, italic, headers
5. Click "Save"

**Expected Results:**

- Tagline accepts single-line text input
- Bio editor supports rich text formatting
- Formatting toolbar includes: Undo, Redo, Bold, Italic, Headers (H1-H3), Lists (ordered/unordered), Blockquote, Code, Horizontal line, Link, Visuals, Embed Video, Emoticons
- Formatted text renders correctly in editor
- Save is successful
- Bio displays with formatting on profile view

#### 2.6 Add Skills and Keywords

**Steps:**

1. Click in the "Skills" field
2. Type "JavaScript" and press Enter
3. Type "React" and press Enter
4. Add 2-3 more skills
5. Click in "Keywords" field
6. Add several keywords
7. Click "Save"

**Expected Results:**

- Skills field is a multi-select/tag input
- Each skill appears as a separate tag/chip
- Skills can be removed by clicking X on tag
- Keywords function similarly to Skills
- Multiple values can be added
- Save is successful

#### 2.7 Add Social Media Links

**Steps:**

1. In "Linkedin" field, enter a LinkedIn profile URL
2. In "BlueSky" field, enter a BlueSky profile URL
3. In "Github" field, enter a Github profile URL
4. Verify "Mail" field is disabled and shows current email
5. Click "Save"

**Expected Results:**

- Social media fields accept URL input
- Icons are displayed for each social platform
- Mail field is read-only/disabled showing registered email
- URL validation may occur (format checking)
- Links are saved successfully
- Social links may appear on public profile view

#### 2.8 Add Profile Reference

**Steps:**

1. Click "Add Reference" button
2. Fill in reference details (if modal/form appears)
3. Save the reference
4. Verify reference appears in the list

**Expected Results:**

- "Add Reference" button is clickable
- Reference entry form/modal appears
- Reference can include name, description, link
- "No references yet" message disappears after adding first reference
- References display in a list or card format
- References can be edited or deleted

#### 2.9 Required Field Validation

**Steps:**

1. Clear "First Name" field
2. Try to click "Save"
3. Observe validation messages
4. Repeat for "Last name" and "Full Name"

**Expected Results:**

- Required fields marked with asterisk (\*)
- Save button may be disabled if required fields are empty
- Validation error messages display for empty required fields
- Form cannot be submitted with missing required data
- Error messages are clear and helpful

#### 2.10 Cancel/Revert Changes

**Steps:**

1. Make changes to several fields
2. Navigate away from the page without saving
3. Return to My profile tab
4. Verify changes were not saved

**Expected Results:**

- Unsaved changes may trigger a warning dialog
- Navigating away without saving discards changes
- Returning to the page shows original values
- No data is persisted without clicking Save

---

### 3. Account Tab

#### 3.1 View Account Information

**Steps:**

1. Click on "account" tab
2. Review displayed account information

**Expected Results:**

- Account tab becomes active
- URL changes to `/user/{username}/settings/account`
- Informational message: "Here you find all your Spaces, Virtual Contributors, and other hosted resources..."
- Four resource sections displayed:
  - Hosted Spaces (shows count: X/Y)
  - Virtual Contributors (shows count: X/Y)
  - Template Packs (shows count: X/Y)
  - Custom Homepages (shows count: X/Y)
- Each section has an "Add" button

#### 3.2 Wingback Account Integration

**Steps:**

1. Locate "Create a Wingback account" button
2. Click the button
3. Follow Wingback account creation flow (if applicable)

**Expected Results:**

- "Create a Wingback account" button is prominently displayed
- Clicking opens Wingback integration flow
- If Wingback account exists, button state may change
- Integration success/failure is clearly communicated

#### 3.3 View Hosted Resources

**Steps:**

1. Review resource counts for each category
2. Verify Add buttons are enabled/disabled appropriately
3. Check if any resources are listed

**Expected Results:**

- Resource counts show "current/maximum" format (e.g., "0/0")
- Add buttons may be disabled if quota is reached or permissions insufficient
- If resources exist, they display in a list or grid
- Empty state message appears when no resources exist

#### 3.4 Add New Hosted Resource (if enabled)

**Steps:**

1. Click an enabled "Add" button for any resource type
2. Complete the resource creation form
3. Submit the form

**Expected Results:**

- Modal or new page opens for resource creation
- Form includes required fields for the resource type
- Validation works correctly
- Resource is created successfully
- Count updates after creation
- New resource appears in the list

---

### 4. Membership Tab

#### 4.1 View Memberships

**Steps:**

1. Click on "membership" tab
2. Review "My memberships" section
3. Scroll through the list of memberships

**Expected Results:**

- Membership tab becomes active
- URL changes to `/user/{username}/settings/membership`
- Informational message displays
- "My memberships" heading is visible
- Memberships display as cards with:
  - Card banner image
  - Space/Challenge/Opportunity avatar
  - Name/title
  - Tagline/description
  - "Leave" button
- "Pending Applications" section appears below memberships

#### 4.2 View Membership Details

**Steps:**

1. Click on a membership card (not the Leave button)
2. Verify navigation to the space/community

**Expected Results:**

- Clicking card navigates to the respective Space/Challenge/Opportunity
- Opens in same or new tab
- "Contribute" link is clickable
- Full space details are accessible

#### 4.3 Leave a Membership

**Steps:**

1. Identify a test membership to leave
2. Click the "Leave" button on the membership card
3. Confirm the action (if confirmation dialog appears)
4. Verify membership is removed

**Expected Results:**

- "Leave" button is clearly visible on each card
- Clicking triggers confirmation dialog: "Are you sure you want to leave?"
- Confirming removes the membership from the list
- Success message appears
- Card disappears from the membership list
- User loses access to that community

#### 4.4 View Pending Applications

**Steps:**

1. Scroll to "Pending Applications" section
2. Review any pending applications

**Expected Results:**

- "Pending Applications" heading is visible
- Pending applications display in a list or card format
- Each shows: Space name, application date, status
- Empty state message if no pending applications
- Actions available: View details, Cancel application

#### 4.5 Cancel Pending Application

**Steps:**

1. Click "Cancel" or delete icon on a pending application
2. Confirm cancellation
3. Verify application is removed

**Expected Results:**

- Cancellation action is available for pending applications
- Confirmation dialog appears
- Application is removed from pending list
- Cannot be undone (or clear warning given)

---

### 5. Organizations Tab

#### 5.1 View Associated Organizations

**Steps:**

1. Click on "organizations" tab
2. Review "Associated organizations" section
3. Scroll through organization list

**Expected Results:**

- Organizations tab becomes active
- URL changes to `/user/{username}/settings/organizations`
- Informational message: "Here you can see the organizations that your user is associated with"
- "Associated organizations" heading displays
- "Create" button is available
- Organizations display as cards showing:
  - Organization avatar/initial
  - Organization name
  - Associates count
  - "Disassociate" button

#### 5.2 View Organization Details

**Steps:**

1. Click on an organization card
2. Verify navigation to organization page

**Expected Results:**

- Clicking organization card navigates to `/organization/{org-name}`
- Organization profile page loads
- Full organization details are accessible
- User can view organization memberships, spaces, etc.

#### 5.3 Create New Organization

**Steps:**

1. Click "Create" button
2. Fill out organization creation form
3. Submit the form

**Expected Results:**

- Create button opens organization creation modal/page
- Form includes required fields:
  - Organization name (required)
  - Display name
  - Website
  - Description
  - Legal entity details (if applicable)
- Validation works correctly
- Organization is created successfully
- New organization appears in the list
- User becomes associated with the organization

#### 5.4 Disassociate from Organization

**Steps:**

1. Identify a test organization to disassociate from
2. Click "Disassociate" button
3. Confirm the action (if confirmation appears)
4. Verify disassociation

**Expected Results:**

- "Disassociate" button is visible on each organization card
- Clicking triggers confirmation dialog
- Confirming removes association
- Organization card disappears from the list
- User loses organization membership
- Associates count decrements

#### 5.5 Filter or Search Organizations

**Steps:**

1. If search/filter is available, enter organization name
2. Verify filtered results

**Expected Results:**

- Search/filter functionality works correctly
- Results update dynamically
- No results message appears if applicable
- Clear filter returns full list

---

### 6. Notifications Tab

#### 6.1 View Notification Categories

**Steps:**

1. Click on "notifications" tab
2. Review all notification categories

**Expected Results:**

- Notifications tab becomes active
- URL changes to `/user/{username}/settings/notifications`
- Informational message displays
- Four main categories visible:
  - **Space**: Community notifications (member and admin)
  - **User**: Personal notifications
  - **Platform**: Forum and platform-wide notifications
  - **Organization**: Organization-related notifications
  - **Virtual Contributor**: VC-related notifications
- Each category has multiple notification types
- Two toggle columns: "In-app" and "Email"

#### 6.2 View Space Notifications (Member)

**Steps:**

1. Locate "Space" category - member section
2. Review available notification types

**Expected Results:**

- Section message: "This section allows you to select your preferences regarding receiving messages from Spaces you are a member of"
- Notification types include:
  - Post published in community
  - New comment on post
  - New contribution created
  - Comment on post
  - New update shared
  - Calendar notifications
- Each has In-app and Email toggles
- Current settings are reflected in checkbox states

#### 6.3 View Space Notifications (Admin)

**Steps:**

1. Scroll to Space category - admin section
2. Review admin-specific notification types

**Expected Results:**

- Section message: "...regarding receiving messages from Spaces you are an admin of"
- Admin notification types:
  - New application received
  - New member joins community
  - New post created
  - New message received
- Some options may be disabled (shown with lock icon and tooltip)
- Checkboxes reflect current settings

#### 6.4 Toggle Individual Notification

**Steps:**

1. Identify a notification that is currently OFF
2. Click the "In-app" checkbox to enable it
3. Click the "Email" checkbox to enable it
4. Verify changes are auto-saved

**Expected Results:**

- Clicking checkbox toggles it ON (checked state)
- Change is saved automatically (or Save button becomes enabled)
- Visual feedback confirms the change
- User will now receive notifications via selected channel(s)
- No page reload required

#### 6.5 Disable Notification Type

**Steps:**

1. Identify a notification that is currently ON
2. Uncheck both "In-app" and "Email" checkboxes
3. Verify the notification is fully disabled

**Expected Results:**

- Unchecking both boxes disables that notification type
- Changes save automatically
- User will not receive any notifications of that type
- UI reflects disabled state

#### 6.6 Bulk Toggle All Space Notifications

**Steps:**

1. Toggle all Space member notifications OFF
2. Verify all are disabled
3. Toggle all Space member notifications ON
4. Verify all are enabled

**Expected Results:**

- Individual toggles work independently
- If bulk toggle exists, it affects all in the group
- Changes save correctly
- Can selectively enable/disable after bulk action

#### 6.7 View User Notifications

**Steps:**

1. Scroll to "User" category
2. Review personal notification types

**Expected Results:**

- Section message about personal memberships and mentions
- Notification types:
  - Someone replies to my comment
  - I am mentioned
  - Someone sends direct message
  - Invitation to join community
  - Join new Space community
- Some may be disabled (premium/paid features)
- Lock icon indicates disabled/unavailable features

#### 6.8 View Platform Notifications

**Steps:**

1. Scroll to "Platform" category
2. Review platform and forum notifications

**Expected Results:**

- Two subsections: Forum and Platform activities
- Forum notifications:
  - New comment on followed discussion
  - New discussion created
- Platform notifications (likely admin-only):
  - New user signs up
  - User profile removed
  - User global role changed
  - New Space created
- Toggles available for each

#### 6.9 View Organization Notifications

**Steps:**

1. Scroll to "Organization" category
2. Review organization notification types

**Expected Results:**

- Section for organizations user manages
- Notification types:
  - Organization mentioned
  - Direct messages to organization
- Some may be always enabled (shown as checked and disabled)

#### 6.10 View Virtual Contributor Notifications

**Steps:**

1. Scroll to "Virtual Contributor" category
2. Review VC notification types

**Expected Results:**

- Section for VCs user manages
- Notification type:
  - VC invited to join community
- Checkboxes reflect current settings

#### 6.11 Test Locked/Premium Notifications

**Steps:**

1. Identify notifications with lock icons
2. Hover over or click the lock icon
3. Review tooltip or message

**Expected Results:**

- Lock icon clearly indicates unavailable feature
- Tooltip explains why it's locked (e.g., "Premium feature")
- Checkbox is disabled and cannot be toggled
- Upgrade path may be shown (if applicable)

---

### 7. Settings Tab

#### 7.1 View Privacy Settings

**Steps:**

1. Click on "settings" tab
2. Review available privacy settings

**Expected Results:**

- Settings tab becomes active
- URL changes to `/user/{username}/settings/settings`
- Informational message: "Here you can edit the visibility settings of your user"
- "Settings" heading displays
- Privacy options are shown:
  - "Allow other users to message me" (checkbox)
- Current setting states are reflected

#### 7.2 Enable Direct Messaging

**Steps:**

1. If "Allow other users to message me" is OFF, check the box
2. Verify setting is saved
3. Test receiving a message from another user

**Expected Results:**

- Checkbox can be toggled ON
- Change saves automatically or with Save button
- Success feedback appears
- Other users can now send direct messages
- Message button appears on user's profile for others

#### 7.3 Disable Direct Messaging

**Steps:**

1. If "Allow other users to message me" is ON, uncheck the box
2. Verify setting is saved
3. Verify other users cannot send messages

**Expected Results:**

- Checkbox can be toggled OFF
- Change saves successfully
- Other users see messaging disabled
- Message button is hidden or disabled on profile
- Existing conversations may remain accessible

#### 7.4 Additional Privacy Settings (if available)

**Steps:**

1. Check for other privacy/visibility settings
2. Toggle each setting
3. Verify behavior

**Expected Results:**

- All available settings are functional
- Each setting has clear description
- Changes save correctly
- Privacy settings take effect immediately
- Settings don't conflict with each other

---

### 8. Tab Navigation and State Management

#### 8.1 Navigate Between Tabs

**Steps:**

1. Start on "My profile" tab
2. Click each tab in sequence: account → membership → organizations → notifications → settings
3. Navigate backwards through tabs
4. Jump between non-adjacent tabs

**Expected Results:**

- Each tab becomes active on click
- URL updates to reflect current tab
- Tab content loads correctly each time
- Previous tab content is unmounted
- No data loss when switching tabs
- Active tab is visually highlighted
- Navigation is smooth without flicker

#### 8.2 Deep Link to Specific Tab

**Steps:**

1. Copy URL of a specific tab (e.g., `/user/{username}/settings/notifications`)
2. Open URL in new browser tab/window
3. Verify correct tab loads

**Expected Results:**

- Correct tab is active on page load
- Tab content displays correctly
- Other tabs are accessible
- User must be logged in
- Redirects to login if not authenticated

#### 8.3 Browser Back/Forward with Tabs

**Steps:**

1. Navigate from profile → membership → organizations
2. Click browser back button twice
3. Click browser forward button once

**Expected Results:**

- Back button returns to previously viewed tabs
- Forward button moves through tab history
- Correct tab content loads each time
- URL history is maintained
- Tab state is preserved

#### 8.4 Unsaved Changes Warning

**Steps:**

1. On "My profile" tab, make changes to a field
2. Click on another tab without saving
3. Observe warning (if applicable)
4. Choose to discard or cancel

**Expected Results:**

- Warning dialog appears: "You have unsaved changes. Discard?"
- "Discard" button allows navigation
- "Cancel" button returns to current tab
- Changes are preserved if canceled
- Changes are lost if discarded

---

### 9. Responsive Design and Mobile View

#### 9.1 Mobile View - Tab Navigation

**Steps:**

1. Resize browser to mobile viewport (375x667)
2. Access user profile page
3. Navigate between tabs

**Expected Results:**

- Tabs may appear as dropdown or horizontal scroll
- Tab labels may be icons or abbreviated text
- Active tab is clearly indicated
- Content is fully accessible
- No horizontal scrolling required for content

#### 9.2 Mobile View - Form Fields

**Steps:**

1. On mobile viewport, access "My profile" tab
2. Interact with form fields
3. Use the rich text editor

**Expected Results:**

- Form fields stack vertically
- Input fields are appropriately sized
- Mobile keyboard works correctly
- Dropdowns and selectors are mobile-friendly
- Rich text editor is usable (or simplified)
- Save button is easily accessible

#### 9.3 Tablet View

**Steps:**

1. Test at tablet viewport (768x1024)
2. Verify layout and functionality

**Expected Results:**

- Layout adapts to tablet screen size
- Tabs display appropriately
- Multi-column layouts may appear
- Touch targets are appropriately sized
- All functionality remains accessible

---

### 10. Data Persistence and Refresh

#### 10.1 Save and Refresh Profile

**Steps:**

1. Update profile information
2. Click "Save"
3. Refresh the page (F5)
4. Verify changes persist

**Expected Results:**

- Save action completes successfully
- Success message appears
- Page refresh shows updated data
- No data loss occurs
- Timestamps may update

#### 10.2 Logout and Login

**Steps:**

1. Make profile changes and save
2. Log out of the application
3. Log back in
4. Navigate to user profile
5. Verify changes persist

**Expected Results:**

- Changes remain after logout/login cycle
- Data is stored persistently
- All settings are retained
- Session management works correctly

#### 10.3 Concurrent Session Handling

**Steps:**

1. Open user profile in two browser tabs
2. Make changes in tab 1 and save
3. Refresh tab 2
4. Verify updates appear

**Expected Results:**

- Changes from tab 1 appear in tab 2 after refresh
- No data conflicts occur
- Last write wins (or conflict resolution mechanism)
- Warning may appear about concurrent edits

---

### 11. Error Handling

#### 11.1 Network Error During Save

**Steps:**

1. Make profile changes
2. Disconnect network
3. Click "Save"
4. Observe error handling

**Expected Results:**

- Error message appears: "Unable to save changes. Please check your connection."
- Changes are not saved
- User can retry after reconnecting
- Data entered is not lost in the form
- Retry mechanism is available

#### 11.2 Server Error Response

**Steps:**

1. Trigger a server error (if possible via test tools)
2. Attempt to save profile changes
3. Observe error handling

**Expected Results:**

- User-friendly error message displays
- Technical details are logged (not shown to user)
- Retry option is available
- Form data is preserved
- User is not logged out

#### 11.3 Invalid Data Handling

**Steps:**

1. Enter invalid data in profile fields (e.g., special characters in name)
2. Attempt to save
3. Observe validation

**Expected Results:**

- Client-side validation catches invalid data
- Error messages appear inline with fields
- Save is prevented until corrected
- Clear guidance on what's invalid
- Fields are highlighted in error state

#### 11.4 Session Timeout

**Steps:**

1. Leave user profile page open for extended time
2. Attempt to save changes after session expires
3. Observe session handling

**Expected Results:**

- Session timeout is detected
- User is redirected to login page
- Message explains session expired
- After re-login, user returns to profile page
- Option to recover unsaved changes (if possible)

---

### 12. Accessibility Testing

#### 12.1 Keyboard Navigation

**Steps:**

1. Use only keyboard (Tab, Shift+Tab, Enter, Space, Arrow keys)
2. Navigate through all tabs
3. Fill out form fields
4. Activate buttons

**Expected Results:**

- All interactive elements are keyboard accessible
- Tab order is logical
- Focus indicator is clearly visible
- Enter/Space activate buttons
- Dropdowns work with keyboard
- No keyboard traps exist

#### 12.2 Screen Reader Compatibility

**Steps:**

1. Enable screen reader (e.g., NVDA, JAWS, VoiceOver)
2. Navigate through user profile
3. Verify all content is announced

**Expected Results:**

- All text is readable by screen reader
- Form labels are properly associated
- Button purposes are clear
- Tab names are announced
- Required fields are identified
- Error messages are announced
- ARIA labels are present where needed

#### 12.3 Color Contrast and Visual Accessibility

**Steps:**

1. Verify color contrast ratios meet WCAG 2.1 AA standards
2. Test with high contrast mode
3. Test with color blindness simulators

**Expected Results:**

- Text contrast ratio ≥ 4.5:1
- Interactive elements contrast ≥ 3:1
- Color is not the only indicator of state
- High contrast mode is supported
- Content remains usable for color blind users

#### 12.4 Focus Management

**Steps:**

1. Navigate with keyboard through tabs
2. Open modals or dialogs
3. Close modals
4. Verify focus returns appropriately

**Expected Results:**

- Focus moves to new content when tab changes
- Modal traps focus when open
- Focus returns to trigger element when modal closes
- Skip links are available
- No focus lost in navigation

---

### 13. Performance Testing

#### 13.1 Page Load Time

**Steps:**

1. Clear browser cache
2. Navigate to user profile
3. Measure load time using browser DevTools

**Expected Results:**

- Initial page load < 3 seconds on standard connection
- Core content visible within 1 second
- Tabs and navigation load quickly
- Images lazy-load if not immediately visible
- Performance budgets are met

#### 13.2 Large Data Sets

**Steps:**

1. User with many memberships (50+)
2. User with many organizations (20+)
3. Navigate to respective tabs
4. Measure scroll and render performance

**Expected Results:**

- Lists render without lag
- Pagination or virtual scrolling is implemented
- Smooth scrolling performance
- No janky animations
- Memory usage remains reasonable

#### 13.3 Autosave Performance (if applicable)

**Steps:**

1. Make rapid changes to form fields
2. Observe autosave behavior
3. Verify no performance degradation

**Expected Results:**

- Autosave is debounced/throttled
- UI remains responsive during save
- No blocking operations
- Save indicators are clear
- Failed saves are retried

---

### 14. Integration Testing

#### 14.1 Profile Changes Reflect Across Application

**Steps:**

1. Update user name in profile
2. Navigate to different areas of application
3. Verify name displays correctly everywhere

**Expected Results:**

- Name updates in:
  - Top navigation bar
  - User comments and posts
  - Membership cards
  - Space contributor lists
  - @mentions
- Updates appear without re-login
- Cache is invalidated appropriately

#### 14.2 Avatar Changes Propagate

**Steps:**

1. Upload new avatar
2. Check avatar display in multiple locations

**Expected Results:**

- Avatar updates in:
  - Profile page banner
  - Navigation bar icon
  - Comments and posts
  - Member lists
  - Search results
- Image caching works correctly
- Old avatar is no longer shown

#### 14.3 Notification Settings Integration

**Steps:**

1. Disable specific notification type
2. Trigger that notification type
3. Verify notification is not received

**Expected Results:**

- Notification settings are respected
- In-app notifications follow settings
- Email notifications follow settings
- Changes take effect immediately
- Notification center reflects settings

#### 14.4 Membership Leave Integration

**Steps:**

1. Leave a Space membership
2. Verify access is revoked immediately
3. Check if space appears in other areas

**Expected Results:**

- Space removed from "My memberships"
- Space removed from dashboard
- Cannot access space content without permission
- Contributions remain attributed to user
- Re-joining is possible (if allowed)

---

### 15. Security Testing

#### 15.1 Authentication Required

**Steps:**

1. Log out
2. Attempt to access `/user/{username}/settings/profile`
3. Observe redirect

**Expected Results:**

- Unauthenticated users are redirected to login
- Login page includes return URL
- After login, user returns to profile page
- Session is properly established

#### 15.2 Authorization - Own Profile Only

**Steps:**

1. As user A, access user B's settings URL
2. Verify access is denied or redirected

**Expected Results:**

- Users can only access their own settings
- Attempting to access another user's settings fails
- Error message or redirect to own profile
- URL manipulation doesn't bypass security

#### 15.3 XSS Prevention

**Steps:**

1. Attempt to inject script tags in profile fields
2. Enter malicious HTML in Bio field
3. Save and view profile

**Expected Results:**

- Script tags are sanitized or escaped
- HTML is escaped in output
- Rich text editor strips unsafe tags
- No JavaScript execution from user input
- Security warnings may appear

#### 15.4 CSRF Protection

**Steps:**

1. Inspect save/update requests
2. Verify CSRF tokens are present
3. Attempt request without valid token

**Expected Results:**

- CSRF tokens are included in requests
- Requests without valid tokens are rejected
- Tokens are regenerated appropriately
- Cookie security flags are set (HttpOnly, Secure)

#### 15.5 Data Privacy - Email Visibility

**Steps:**

1. View own profile settings
2. Check if email is visible to others
3. Verify email privacy settings work

**Expected Results:**

- Email field in social section is disabled
- Cannot change email from this page
- Email privacy is respected
- Email not shown on public profile (unless explicitly enabled)

---

### 16. Edge Cases and Boundary Testing

#### 16.1 Empty Profile

**Steps:**

1. Create new user account
2. Access profile settings immediately
3. Verify default/empty states

**Expected Results:**

- All optional fields are empty
- Required fields have default values or prompts
- Placeholder text guides user
- "No references yet" message displays
- Empty organization and membership lists show appropriate messages

#### 16.2 Maximum Character Limits

**Steps:**

1. Enter maximum allowed characters in each field
2. Attempt to exceed limits
3. Save and verify

**Expected Results:**

- Character counters display (if available)
- Input is prevented beyond max length
- Validation messages for oversized input
- Saved data doesn't truncate unexpectedly
- UI remains usable with long content

#### 16.3 Special Characters in Profile

**Steps:**

1. Enter names with special characters: O'Brien, François, 李明
2. Use emojis in tagline: "Developer 👨‍💻"
3. Save and verify display

**Expected Results:**

- Unicode characters are supported
- Special characters don't break layout
- Data saves correctly
- Display renders properly throughout app
- Search and sorting work with special chars

#### 16.4 Very Long Lists

**Steps:**

1. User with 100+ memberships
2. User with 50+ organizations
3. Navigate to respective tabs

**Expected Results:**

- Pagination or infinite scroll implemented
- Performance remains acceptable
- All items are accessible
- Load indicators appear for additional data
- Search/filter helps manage long lists

#### 16.5 Rapid Tab Switching

**Steps:**

1. Quickly click through all tabs multiple times
2. Verify no errors occur
3. Check console for warnings

**Expected Results:**

- All tabs load correctly
- No race conditions in data loading
- No memory leaks from mounting/unmounting
- Console is free of errors
- UI remains stable

---

### 17. Internationalization (i18n) Testing

#### 17.1 Language Switching

**Steps:**

1. Change application language (if supported)
2. Navigate to user profile
3. Verify all text is translated

**Expected Results:**

- All UI text appears in selected language
- Field labels are translated
- Button text is translated
- Error messages are translated
- Help text and tooltips are translated
- Date formats follow locale conventions

#### 17.2 RTL Language Support (if applicable)

**Steps:**

1. Switch to RTL language (Arabic, Hebrew)
2. Verify layout mirrors correctly

**Expected Results:**

- Layout flips for RTL languages
- Text alignment is correct
- Icons and buttons flip appropriately
- Navigation flows right-to-left
- Forms are properly mirrored

---

### 18. User Experience Testing

#### 18.1 First-Time User Experience

**Steps:**

1. Create new user account
2. Access profile settings for first time
3. Observe guidance and prompts

**Expected Results:**

- Welcome message or tour may appear
- Required fields are highlighted
- Helpful tooltips guide user
- Call-to-action to complete profile
- Progress indicator shows profile completion

#### 18.2 Loading States

**Steps:**

1. Navigate to each tab
2. Observe loading indicators
3. Simulate slow network

**Expected Results:**

- Loading spinners appear during data fetch
- Skeleton screens show content structure
- Loading doesn't block entire page
- Timeout handling for slow connections
- Graceful degradation on failure

#### 18.3 Success Feedback

**Steps:**

1. Make changes and save
2. Observe success notifications
3. Verify all user actions have feedback

**Expected Results:**

- Success message appears after save: "Profile updated successfully"
- Toast/snackbar notification or modal
- Auto-dismisses after few seconds
- Doesn't block user from continuing
- Confirmation for destructive actions (Leave, Disassociate)

#### 18.4 Empty States

**Steps:**

1. View tabs with no data (memberships, organizations, references)
2. Verify helpful empty state messages

**Expected Results:**

- Empty state illustrations or icons
- Clear message: "No memberships yet"
- Call-to-action: "Join a Space" or "Create organization"
- Not just blank space
- Consistent empty state design

---

## Test Data Requirements

### User Accounts

- **admin@alkem.io**: Existing admin user with full profile
- **test-user-new**: Newly created user with minimal profile
- **test-user-full**: User with complete profile data
- **test-user-many-memberships**: User with 20+ space memberships
- **test-user-many-orgs**: User associated with 10+ organizations

### Spaces and Communities

- Test spaces for membership testing
- Public and private spaces
- Spaces requiring application approval

### Organizations

- Test organizations for association testing
- Organizations with multiple members

### Test Assets

- Valid profile images (JPG, PNG) in various sizes
- Oversized images for validation testing
- Invalid file types for negative testing

---

## Browser and Device Matrix

### Desktop Browsers

- Chrome (latest, latest-1)
- Firefox (latest, latest-1)
- Safari (latest on macOS)
- Edge (latest)

### Mobile Devices

- iOS Safari (iPhone 12, iPhone 13)
- Android Chrome (Samsung Galaxy, Pixel)
- Tablet: iPad (Safari), Android Tablet

### Viewport Sizes

- Mobile: 375x667, 414x896
- Tablet: 768x1024, 1024x768
- Desktop: 1280x720, 1920x1080, 2560x1440

---

## Notes for Test Execution

1. **Test Environment**: All tests assume running against `http://localhost:3000` with seeded data
2. **Authentication**: Tests require valid login credentials configured in environment variables
3. **Data Cleanup**: Tests that modify data should reset state after execution
4. **Screenshots**: Capture screenshots for visual regression testing
5. **Parallel Execution**: Some tests can run in parallel, others require sequential execution
6. **Flaky Test Handling**: Implement retry logic for network-dependent tests
7. **Accessibility Tools**: Use axe-core or similar for automated a11y testing
8. **Performance Monitoring**: Integrate Lighthouse CI for performance regression detection

---

## Success Criteria

A test passes when:

- ✅ All steps execute without errors
- ✅ Expected results match actual results
- ✅ No console errors are logged
- ✅ Data persists correctly across sessions
- ✅ UI responds within acceptable time limits
- ✅ Accessibility standards are met
- ✅ No visual regressions are detected

---

## Test Coverage Summary

| Feature Area        | Scenarios | Priority |
| ------------------- | --------- | -------- |
| Navigation & Access | 3         | High     |
| My Profile Tab      | 10        | High     |
| Account Tab         | 4         | Medium   |
| Membership Tab      | 5         | High     |
| Organizations Tab   | 5         | High     |
| Notifications Tab   | 11        | High     |
| Settings Tab        | 4         | Medium   |
| Tab Navigation      | 4         | High     |
| Responsive Design   | 3         | High     |
| Data Persistence    | 3         | High     |
| Error Handling      | 4         | High     |
| Accessibility       | 4         | High     |
| Performance         | 3         | Medium   |
| Integration         | 4         | High     |
| Security            | 5         | Critical |
| Edge Cases          | 5         | Medium   |
| i18n                | 2         | Low      |
| UX                  | 4         | Medium   |

**Total Scenarios: 83**

---

<!-- ===================== BEGIN client-web#10179 — public profile resource tabs ===================== -->

## Test plan — Profile resource tabs (client-web#10179)

> **Status:** Approved · **Depth:** Light — set explicitly by the requester, and it matches the evidence: one repo, no elevated-risk trigger, an existing surface reshaped rather than a new one · **Story:** [alkem-io/client-web#10179](https://github.com/alkem-io/client-web/issues/10179) · **Diff:** client-web#10424 @ `b1311f68` (develop, merged 2026-10-14)

This section covers the **public** profile pages (`/user/<nameID>` and `/organization/<nameID>`), not the My Account settings tabs described above. #10424 changed the shared `ProfileResourceTabStrip`. The tab order is now Leading, Member of, Other Resources. Leading is hidden when the profile leads no Space, and the page then lands on Member of. "Resources Hosted" is renamed "Other Resources" and now shows VCs, Template Packs and Custom Homepages but no Spaces; it is hidden when empty. Member of always shows. Before this work, no system test checked the tab set, its order or the landing tab on either page. One new spec with 11 cases covers both profile types: 6 for the plan's registered visitor (3 of them skipped on Q4) and 5 owner-viewer twins — 3 that run the same Other Resources assertions live and 2 (PT-2o, PT-5o) that keep the "hidden when empty" half of AC5 falsifiable. One existing anonymous-visitor case failed on a stack with #10424 and is skipped pending Q1.

Tab labels differ by profile type (bundle `crd-profilePages`, en). The tablist is named `Resource sections`.

|              | Leading       | Member of         | Other Resources   |
| ------------ | ------------- | ----------------- | ----------------- |
| User         | `Leading`     | `Member Of`       | `Other Resources` |
| Organisation | `Lead Spaces` | `All Memberships` | `Other Resources` |

### How to run

```bash
cd client-web
pnpm exec playwright test src/functional-e2e/user-profile/profile-resource-tabs.spec.ts
pnpm run test:nightly --project="User Profile"
```

Needs `MAIL_SLURPER_ENDPOINT` (throwaway users are verified by mail) and the harness password. No `@local-stack` cases. The **User Profile** nightly suite lists its files explicitly, not by glob, so the new spec runs nightly only after its path is added to `config/playwright.config.nightly.ts`.

### Risk

| #   | Risk (in user terms)                                                                                                                                                                                                                                                                          | Likelihood                                        | Impact | Level           | Drives                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ | --------------- | ---------------------------------------- |
| R1  | A visitor to a profile that leads Spaces lands on, or first sees, memberships or resources instead of leadership (wrong order or landing tab)                                                                                                                                                 | Low — literal arrays, but duplicated in two pages | Medium | Medium          | PT-1/PT-1o, PT-4/PT-4o                   |
| R2  | A tab is shown empty, or hidden while it has content. The two visibility conditions are inline in each page, untested, and could be swapped; `hasOtherResources` could miss a resource kind, e.g. a VC-only owner loses the tab                                                               | Medium                                            | Medium | **Medium-High** | PT-2, PT-3, PT-5, PT-6/PT-6o             |
| R3  | Member of disappears when empty, leaving a profile with a blank right column                                                                                                                                                                                                                  | Low                                               | Medium | Medium          | PT-2, PT-5                               |
| R4  | The old "Resources Hosted" copy survives, or a locale shows a raw key                                                                                                                                                                                                                         | Low — all 6 locales checked by hand               | Low    | Low             | PT-1o, PT-4o (en only)                   |
| R5  | Spaces leak into Other Resources, or a hosted Space the org does not lead is shown there                                                                                                                                                                                                      | Low — field removed from the type                 | Medium | Low-Medium      | PT-4o, PT-6o (live), PT-4, PT-6          |
| R6  | An **anonymous** visitor sees no leadership on an organisation that leads Spaces, and lands on "Not a member of any Space or Subspace yet." The client skips `rolesOrganization` without `READ_USERS`. This predates the PR; #10424 changes it from an empty Lead Spaces tab to no tab at all | High (deterministic)                              | Medium | **Medium-High** | product question Q1; existing case below |
| R7  | The right column now waits for **both** queries; if the memberships query fails, the tab strip never renders (skeleton forever, no error state)                                                                                                                                               | Low                                               | Medium | Low-Medium      | not automated (gap)                      |

Elevated-risk triggers present: none. ☐ migration ☐ breaking contract (GraphQL query unchanged) ☐ authorization/visibility (viewer gating predates the PR and is unchanged) ☐ cross-repo ☐ infra ☐ data-destructive ☐ performance-sensitive.

### Existing coverage before this work

Search terms: `Resources Hosted|resourcesHosted|Other Resources|Resource sections|All Memberships|Lead Spaces|Member Of|Leading`, `getByRole('tab'`, `goto(.../user/|/organization/)`, across `client-web/src`, `client-web/tests`, `server-api/src` and `lib/src`. Every candidate was opened.

- `user-profile/*.spec.ts` (all 6): **settings** pages only (`/settings/profile|account|security`). They do not touch the public tab strip. Confirmed unaffected.
- `memberships/view-organization-profile-public.spec.ts` › _Authenticated Non-Admin_, and `view-organization-profile-as-admin.spec.ts`: the `Lead Spaces` tab is present, and after clicking it the host org's Space is listed. Org leadership is **covered**. Unaffected: the scenario org is host and therefore Lead of a PUBLIC Space.
- `memberships/view-own-user-profile-public-information.spec.ts`: after clicking the `Member Of` tab, the persona's Space is listed. User membership is **covered**. Unaffected.
- `memberships/view-another-user-profile-public-view.spec.ts`: already `test.skip` (pending a product decision), so it is unaffected.
- `organization-space-membership/us1-membership-tab.spec.ts`: this is the **settings** tablist. It is unaffected, and its `allTextContents` order check is the pattern reused here.
- client-web unit tests (at `b1311f68`): `useResourceTabs.test.ts` covers the landing tab, a kept pick, the fallback when a picked tab disappears, and picks not carrying over to another profile. `publicProfileMapper.test.ts` › `mapAccountHostedResources` covers the 3 buckets (VC, pack, hub). **No** unit test covers the tab list each page builds.
- **Proven absent:** any system assertion on tab order, landing tab, a hidden tab, the "Other Resources" copy, or Other Resources content on either page.

**Reuse:** 5 of 13 scenarios need no new test (S7, S8 at unit level; S9, S11, S12 in E2E). 2 more (S10, S13) are not automated (see gaps). 6 need new cases; S1, S2, S4, S5 and S6 each get a second, owner-viewer case (PT-1o, PT-2o, PT-4o, PT-5o, PT-6o): for S1, S4 and S6 the Other Resources assertions run live while Q4 stands, and for S2 and S5 the AC5 "hidden when empty" half stays falsifiable. 1 existing test needs updating.

**Existing test requiring update.** `memberships/view-organization-profile-public.spec.ts` › _View Organization Profile - Unauthenticated_, step 5: `getByRole('tab', { name: /Lead Spaces/i })` visible for an anonymous visitor. After #10424 that tab is not rendered for anonymous visitors (R6), so this case is **predicted red**. Observed red on 2026-10-15 against a stack at `b1311f68` (`getByRole('tab', { name: /Lead Spaces/i })` not found), and now `test.skip` with the reason in the test (assertion unchanged) until Q1 is answered. Do not weaken it. Once Q1 is answered, either (a) treat it as a defect: `test.skip('anonymous visitor sees the Spaces an organisation leads (alkem-io/client-web#NNN)')` with today's behaviour in a comment (`plans/memberships-test-plan.md` 4.2 already expects "Spaces they lead"), or (b) re-align it to the ruled behaviour.

### Scenario → test mapping

`PT-n` = `user-profile/profile-resource-tabs.spec.ts`. Every PT case asserts the **exact** tab list in DOM order and `aria-selected` on the landing tab. Exact list equality also proves "Resources Hosted" is absent. `PT-no` is the owner-viewer twin of `PT-n`: the same walk function, viewed by the user on their own profile (PT-1o) or by a plain user who administers the organisation (PT-4o, PT-6o), the viewers the server resolves `account` for today. Those are the viewers the QA lead ruled for the Other Resources cases (2026-10-19) while Q4 / server#6670 stands.

| Scenario                                                                                                                                                | Covers                 | Automated by                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Layer |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| S1 User: leads + has resources → `Leading · Member Of · Other Resources`, lands on Leading, Member Of empty but present                                 | AC1, AC3, AC4, AC6     | `user-profile/profile-resource-tabs.spec.ts` › _PT-1o — the same user on their OWN profile sees Leading, Member Of, Other Resources; lands on Leading_ (live green ×2, local stack 2026-10-19; sabotage with the visitor as viewer red on the tab list) · _PT-1_ for the visitor (**built, skipped**, see Q4 and gaps)                                                                                                                                                             | E2E   |
| S2 User: leads nothing, no resources → only `Member Of`, selected, "No memberships yet."                                                                | AC2, AC5, AC6          | `user-profile/profile-resource-tabs.spec.ts` › _PT-2 — a user who leads nothing and owns nothing sees only Member Of, selected and empty_ (live green for AC2/AC6; its AC5 half — Other Resources absent — **cannot fail for this viewer while Q4 stands**: it stayed green with a Template Pack seeded on U3, 2026-10-15) · _PT-2o — the same bare user on their OWN profile sees only Member Of_ pins that AC5 half for a viewer who can see Other Resources (QA-CH, 2026-10-20) | E2E   |
| S3 User: leads (a subspace), no resources → `Leading · Member Of`, no Other Resources                                                                   | AC1, AC5; R2           | `user-profile/profile-resource-tabs.spec.ts` › _PT-3 — a user who leads only a subspace sees Leading and Member Of; the L1 under Leading, the L0 under Member Of_ (live green)                                                                                                                                                                                                                                                                                                     | E2E   |
| S4 Org: leads + pack + hub → `Lead Spaces · All Memberships · Other Resources`; Other Resources has Template Packs + Custom Homepages and **no** Spaces | AC1, AC3, AC4, AC6; R5 | `user-profile/profile-resource-tabs.spec.ts` › _PT-4o — the organisation's own admin sees three tabs on its profile; Other Resources holds no Spaces_ (live green ×2, 2026-10-19; sabotage red) · _PT-4_ for the visitor (**built, skipped**, see Q4 and gaps)                                                                                                                                                                                                                     | E2E   |
| S5 Org: fresh, nothing → only `All Memberships`, selected, empty state                                                                                  | AC2, AC5, AC6          | `user-profile/profile-resource-tabs.spec.ts` › _PT-5 — an organisation with nothing sees only All Memberships, selected and empty_ (live green for AC2/AC6; its AC5 half is vacuous for this viewer while Q4 stands, as for PT-2) · _PT-5o — the bare organisation's own admin sees only All Memberships_ pins it for a viewer who can see Other Resources (QA-CH, 2026-10-20)                                                                                                     | E2E   |
| S6 Org: member not lead + VC → `All Memberships · Other Resources`, lands on All Memberships; the hosted Space is not in Other Resources                | AC2, AC4; R2, R5       | `user-profile/profile-resource-tabs.spec.ts` › _PT-6o — the organisation's own admin lands on All Memberships; Other Resources shows the VC and not the hosted Space_ (live green ×2, 2026-10-19) · _PT-6_ for the visitor (**built, skipped**, see Q4 and gaps)                                                                                                                                                                                                                   | E2E   |
| S7 Landing tab = first visible; pick kept / falls back / not carried across profiles                                                                    | AC2                    | `useResourceTabs.test.ts` (client-web)                                                                                                                                                                                                                                                                                                                                                                                                                                             | Unit  |
| S8 Other Resources mapper: VC, pack, hub buckets                                                                                                        | AC4                    | `publicProfileMapper.test.ts` › `mapAccountHostedResources` (client-web)                                                                                                                                                                                                                                                                                                                                                                                                           | Unit  |
| S9 Signed-in visitor sees the Spaces an org leads                                                                                                       | AC1                    | `memberships/view-organization-profile-public.spec.ts` › Authenticated Non-Admin; `view-organization-profile-as-admin.spec.ts`                                                                                                                                                                                                                                                                                                                                                     | E2E   |
| S10 Rename in all 6 locales                                                                                                                             | AC3                    | not automated here — checked by hand at `b1311f68`, see gaps                                                                                                                                                                                                                                                                                                                                                                                                                       | —     |
| S11 User Member Of lists the user's Space                                                                                                               | AC6                    | `memberships/view-own-user-profile-public-information.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                     | E2E   |
| S12 Org settings tablist unaffected                                                                                                                     | —                      | `organization-space-membership/us1-membership-tab.spec.ts` › US1-AS1                                                                                                                                                                                                                                                                                                                                                                                                               | E2E   |
| S13 Anonymous visitor on an org that leads Spaces                                                                                                       | AC1 (visitor story)    | see Not covered (Q1)                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —     |

### Regression guards

- **Hosted Spaces in Other Resources** (PT-4o, PT-6o live; PT-4, PT-6 skipped). #10424 removed the `hostedSpaces` mapping and the org-only inactive/archived filter. Both walks seed an org whose **account hosts** a Space and assert there is no `Spaces` sub-section heading and no Space name while Other Resources is selected. Each assertion is paired with a positive control (the resource heading and name).

### Not covered — known gaps

| Scenario                                                                                                                          | Why not automated                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Where it belongs                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| S13 / R6 anonymous visitor sees an org's leadership                                                                               | **Deferred: needs a product ruling (Q1, filed as alkem-io/client-web#10433).** Automating today would pin behaviour that may be a defect. The story's second user story is a visitor story, and the memberships plan 4.2 expects "Spaces they lead"                                                                                                                                                                                                                                                                            | Product decision first. Then either a skipped expected-behaviour case plus an issue, or re-align the existing anonymous case |
| S1 / S4 / S6 Other Resources for an ordinary signed-in **visitor** (PT-1, PT-4, PT-6 built but skipped)                           | **Product defect, found while implementing (Q4), filed as alkem-io/server#6670.** The client learns the account id from `User.account` / `Organization.account`; the server resolves both to null unless the viewer is the user, holds `READ_USER_PII`, or holds UPDATE on the organisation. So `non.space` never sees the Other Resources tab. **Closed for the owner viewer (2026-10-19):** PT-1o / PT-4o / PT-6o run the same walks as the profile owner / an org admin and are live green. Only the visitor arm stays open | Fix in client/server, then drop the three `test.skip(true, ...)` calls                                                       |
| S10 locale copy (bg/de/es/fr/nl)                                                                                                  | Standing gap: locale assertions have no home here (`docs/qa-knowledge/harness.md`). Checked by hand: all 6 `profilePages.*.json` have `otherResources`, and none has `resourcesHosted`                                                                                                                                                                                                                                                                                                                                         | client-web unit / i18n parity check                                                                                          |
| R7 memberships query fails → column never renders                                                                                 | Not in the ACs. It needs request interception and would pin a defect. Found by reading the code                                                                                                                                                                                                                                                                                                                                                                                                                                | Raise with the client team (Q3); a `page.route` abort case if they accept it as a defect                                     |
| Mobile horizontal scroll, keyboard arrows over a 1- or 3-tab strip; tablist has no `tabpanel` / `aria-controls` (predates the PR) | No accessibility harness (standing gap). The component's keyboard code is unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                            | Manual: release-checklist row proposed below                                                                                 |
| Perceived latency (column waits for the slower of 2 queries)                                                                      | No load/latency harness (standing gap). Low risk: no new query                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Post-deploy observation                                                                                                      |

Proposed `release-verification-checklist.md` row: _Profile tabs (#10179): on one user and one org profile, tab order Leading → Member of → Other Resources; keyboard ←/→ moves between the visible tabs; at 390 px the strip scrolls and the active tab is in view; nl shows "Overige bronnen"._

**Open questions.**

- **Q1:** Filed as alkem-io/client-web#10433 (2026-10-16). Should an anonymous visitor see the Spaces an organisation leads? The story's visitor user story and the memberships plan 4.2 suggest yes. The client skips `rolesOrganization` without `READ_USERS`.
- **Q2:** The user page counts Space **Admin** as Leading (`[Lead, Admin]`); the org page counts Lead only. This predates the PR. Is it intended?
- **Q4:** Filed as alkem-io/server#6670 (2026-10-16). Should an ordinary signed-in visitor see Other Resources (VCs, Template Packs, Custom Homepages) on someone else's profile? Today they cannot: `User.account` and `Organization.account` are null for them (server `user.resolver.fields.ts`, `organization.resolver.fields.ts`), the client skips the account-resources query, and the tab is hidden. Found 2026-10-15 while building PT-1/PT-4/PT-6; the same data path fed "Resources Hosted" before #10424.
- **Q3:** If the memberships query fails, the right column, including the tab strip, stays a skeleton. Is that a defect?

**What is proven, and what is not.** Once PT-1…PT-6 are built and green, the following is proven end to end for a signed-in visitor on both profile types: the order, Leading hidden and landing on Member of, Other Resources hidden when empty, Member of present when empty, the en rename, and the absence of Spaces in Other Resources. All three resource kinds are rendered across the cases: pack and hub in PT-4, VC in PT-6, pack in PT-1. **Update 2026-10-15:** only PT-2, PT-3 and PT-5 run live (hidden tabs, landing tab, Member Of always present, a subspace lead counted as Leading). PT-1, PT-4 and PT-6, which carry Leading-first order with three tabs and the Other Resources content, are skipped on Q4, so "Leading first" is proven live only for the two-tab case (PT-3), and the Other Resources content and the hosted-Space regression guard are not proven by a running test. **Not proven:** the copy in 5 locales (checked by hand only), and above all what an **anonymous** visitor sees on an organisation. For anonymous visitors, AC1 ("Show Leading first") is not delivered today, and no test can say whether that is correct until Q1 is answered. **Update 2026-10-20:** PT-1o, PT-4o and PT-6o run live as the owner viewer (the profile's own user; a plain user who administers the organisation) and prove, for that viewer, the three-tab Leading-first order, the Other Resources content (pack in PT-1o; pack and hub in PT-4o; VC in PT-6o) and the hosted-Space regression guard. PT-2o and PT-5o prove the AC5 "hidden when empty" rule for a viewer who can see Other Resources. What remains unproven: the same claims for an ordinary signed-in visitor (PT-1, PT-4, PT-6, skipped on server#6670), the 5 locales, and the anonymous case (Q1).

**Update (workspace#089-profile-other-resources, alkem-io/server#6670).** Q4 is resolved: the profile pages read the new viewer-scoped `hostedResources` field instead of `User.account` / `Organization.account`. PUBLIC packs and VCs and every hub are visible to any registered visitor; ACCOUNT ones to the account's user, or the organisation's associates, admins and owners; HIDDEN ones to the user, or the organisation's admins and owners only. `listedInStore` plays no part. PT-1, PT-4 and PT-6 now run live: their seeded pack / VC is set PUBLIC in `beforeAll` (both default to ACCOUNT) and read back. A guest on an organisation profile sees a sign-up notice above the unchanged membership tabs, and no Other Resources. The new cases:

| Scenario | Spec › case | Level |
| --- | --- | --- |
| Unrelated registered visitor sees PUBLIC only; no ACCOUNT / HIDDEN pack, no store-listed ACCOUNT VC, no guest notice | `user-profile/profile-resource-tabs.spec.ts` › _PT-7_ | E2E |
| Organisation associate with no Space role sees PUBLIC + ACCOUNT and the ACCOUNT VC card, not HIDDEN, with no GraphQL error | › _PT-8_ | E2E |
| Organisation admin sees every pack, HIDDEN included, and the VC, with no GraphQL error | › _PT-9_ | E2E |
| Guest sees the sign-up notice (with a return link to the profile) above the membership tab and no Other Resources, on an org with resources and on a bare org | › _PT-10_ | E2E |
| The notice goes away after the guest signs in as an associate | › _PT-11_ | E2E |
| A user whose only resource is an ACCOUNT pack shows a visitor Member Of only (owner twin sees Other Resources) | › _PT-12_ | E2E |
| An organisation whose account owns only an ACCOUNT and a HIDDEN pack shows a visitor All Memberships only: no Other Resources tab | › _PT-13_ | E2E |
| The authorization-dependent rows of the visibility matrix (associate, org admin, unrelated, anonymous null, user-account owner / non-self, Platform Users Admin on a user account and Platform License Manager / Resource Admin on an organisation account (full view incl. a HIDDEN VC, account still resolves), role removal, two-field VC card type, full account still closed) | `server-api/src/functional-api/account/hosted-resources.it-spec.ts` | API |
| User account seen by a non-self registered viewer: only the PUBLIC pack, no HIDDEN pack, no HIDDEN VC; by its owner: PUBLIC + HIDDEN packs and the HIDDEN VC | › _an unrelated registered user sees only a user account's PUBLIC pack…_ / _the owner of a user account sees their own PUBLIC and HIDDEN packs…_ | API |
| A hosted hub is a closed card: introspection lists exactly `id`, `nameID`, `profile`; selecting `innovationHubs { account { innovationPacks } }` as an unrelated registered viewer is a GraphQL validation error on `account` of `AccountHostedInnovationHub`, with no data and no non-PUBLIC id in the response | › _a hosted VC and a hosted hub are closed card types…_ / _a hosted hub offers no way into its account…_ | API |

Follow-ups: hosted Spaces in Other Resources (alkem-io/server#6695); opening the VC page as an associate.

<!-- ====================== END client-web#10179 ====================== -->

---

## Revision History

| Version | Date       | Changes                                                                                                                                                                | Author                  |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1.0     | 2025-01-15 | Initial test plan created                                                                                                                                              | Test Planning Assistant |
| 1.1     | 2026-10-15 | Added the client-web#10179 section (public profile resource tabs, Draft)                                                                                               | qa-test-designer        |
| 1.2     | 2026-10-15 | client-web#10179: PT-1..PT-6 built (3 live, 3 skipped on Q4); mapping, gaps and Q4 updated                                                                             | qa-test-implementer     |
| 1.3     | 2026-10-20 | client-web#10179: owner-viewer twins PT-1o/PT-4o/PT-6o (2026-10-19) and PT-2o/PT-5o (2026-10-20) added; reuse, mapping, gaps and the proven/not-proven summary updated | qa-test-implementer     |
| 1.4     | 2026-10-21 | workspace#089: PT-1/PT-4/PT-6 un-skipped (PUBLIC arrange); visibility-tier and guest walks PT-7..PT-12; hostedResources it-spec mapped | forge implementer |
| 1.5     | 2026-10-21 | workspace#089: PT-13 (org with only non-PUBLIC packs); closed hub card + account-traversal validation rows; user-account PUBLIC pack and VC rows | forge implementer |
