# Support Navigation Flow - Comprehensive Test Plan

## Application Overview

The Alkemio platform provides support and documentation access through the Support dialog. The core navigation flow includes:

- **Support Dialog**: Accessible from the footer "Support" link, provides access to documentation
  - Explore Documentation (opens `/docs` page)
- **Documentation System**: Embedded documentation viewer with iframe-based content
  - Contains "How to..." section with "Inviting People to a Space" tutorial
  - Navigates to `/docs/how-to/inviting` for invitation instructions

## Test Scenarios

### 1. Support Dialog Access and Navigation

**Seed:** `./client-web/src/functional-e2e/seed-docs.spec.ts`

#### 1.1 Open Support Dialog from Dashboard

**Pre-conditions:**

- User is logged in
- User is on dashboard page (`/home`)

**Steps:**

1. Navigate to dashboard page (`http://localhost:3000/home`)
2. Scroll to footer section
3. Locate "Support" text element in footer
4. Click on "Support" element

**Expected Results:**

- Support dialog opens with heading "Looking for help?"
- Dialog displays descriptive text: "We're here to help you make the most of the Alkemio platform..."
- Three action buttons are visible:
  - "Explore Documentation"
    "Explore Documentation" button is visible

#### 1.2 Navigate to Documentation from Support Dialog

**Pre-conditions:**

- Support dialog is open
- User is on dashboard page

**Steps:**

1. Open Support dialog (see scenario 1.1)
2. Click "Explore Documentation" button

**Expected Results:**

- New browser tab opens
- Tab navigates to `/docs` URL
- Documentation page loads with:
  - Page title: "Documentation"
  - Banner text: "Platform Manual & Support"
  - Embedded documentation iframe
- Original dashboard ta or page navigates to `/docs` URL
- Documentation page loads with:
  - Page title: "Documentation"
  - Banner text: "Platform Manual & Support"
  - Embedded documentation iframe with navigation menu
    **Steps:**

1. Open Support dialog (see scenario 1.1)
2. Click Close button (X icon) in dialog header

**Expected Results:**

- Support dialog closes
- Dashboard page remains visible
- User can reopen dialog by clicking Support link again

#### 1.4 Navigate to Contact Team from Support Dialog

**Pre-conditions:**

- Support dialog is open

**Steps:**

1. Open Support dialog (see scenario 1.1)
2. Click "Contact the Team" button

**Steps:**

1. Navigate directly to `http://localhost:3000/docs`

**Expected Results:**

- Documentation page loads
- Page title displays "Documentation"
- Banner shows heading "Documentation" and subtitle "Platform Manual & Support"
- Main content area contains documentation iframe
- Standard navigation menu is visible at top
- Footer is visible at bottom

#### 2.2 Documentation Page Layout Verification

**Pre-conditions:**

- User is on documentation page (`/docs`)

**Steps:**

1. Navigate to documentation page
2. Verify page structure and elements

**Expected Results:**

- Top navigation bar includes:
  - Search button
  - Notifications button (with count badge)
  - Tools menu button
  - User menu
  - "My Dashboard" link
- Banner section displays:
  - Background image
  - "Documentation" heading (h1)
  - "Platform Manual & Support" subtitle
- Main content area contains iframe for documentation content
- Footer includes:
  - Alkemio logo/link
  - Terms, Privacy, Security links
  - Support link
  - About link
  - Language selector
  - Copyright notice
- Help chat button visible in bottom-right corner

#### 2.3 Navigate Back to Dashboard from Documentation

**Pre-conditions:**

- User is on documentation page

**Steps:**

1. Navigate to documentation page
2. Click "My Dashboard" link in top navigation

**Expected Results:**

- Browser navigates to `/home` URL
- Dashboard page loads successfully
- Welcome banner displays user's name
- Dashboard content is visible

### 3. Complete Support Navigation Flow

**Seed:** `./client-web/src/functional-e2e/seed-docs.spec.ts`

#### 3.1 Full Support Journey - Dashboard to Documentation and Back

**Pre-conditions:**

- User is logged in
- User is on dashboard page

**Steps:**

1. Navigate to dashboard page (`http://localhost:3000/home`)
2. Locate "Tips & Tricks" button in left sidebar navigation list
3. Click "Tips & Tricks" button

**Expected Results:**

- Tips & Tricks dialog opens
- Dialog displays heading "Tips & Tricks"
- Multiple tip cards are displayed with icons, titles, and descriptions:
  - "👋 Join the Welcome@Alkemio Space" - links to welcome space
  - "💭 Have a look at the documentation" - links to docs
  - "📑 Read more about Alkemio's Space structure" - links to space structure docs
  - "⚒️ Start a new Space" - links to space creation info
  - "💬 Powered by Generative AI" - links to chatbot blog post
- "Find more tips & tricks" link visible at bottom
- Close button (X) visible in dialog header

#### 3.2 Navigate to Documentation from Tips & Tricks

**Pre-conditions:**

- Tips & Tricks dialog is open

**Steps:**

1. Open
   **Steps:**
1. Navigate to dashboard
1. Click "Support" link in footer
1. Close support dialog
1. Click "Tips & Tricks" button in sidebar
1. Click documentation link in Tips & Tricks panel
1. Verify navigation to documentation

**Expected Results:**

- Each navigation step completes successfully
- Support dialog opens correctly
- Documentation page loads successfully
- All page elements render correctly
- Navigation back to dashboard works without errors
- User session remains active throughout flow

### 4. Documentation Navigation - How to Invite People

**Seed:** `./client-web/src/functional-e2e/seed-docs.spec.ts`

#### 4.1 Navigate to "Inviting People to a Space" Documentation

**Pre-conditions:**

- User is on documentation page (`/docs`)
- Documentation iframe content is loaded

**Steps:**

1. Navigate to documentation page (`http://localhost:3000/docs`)
2. Wait for iframe content to load
3. Locate "How to..." section in documentation navigation
4. Click on "Inviting People to a Space" link

**Expected Results:**

- Documentation iframe displays navigation menu with "How to..." section
- "Inviting People to a Space" link is visible in the menu
- Clicking the link navigates to `/docs/how-to/inviting` URL
- Page loads invitation documentation content
- Content explains the process of inviting people to spaces
- Documentation remains accessible and readable

#### 4.2 Complete Flow: Dashboard to Invitation Documentation

**Pre-conditions:**

- User is logged in
- User is on dashboard page

**Steps:**

1. Navigate to dashboard (`http://localhost:3000/home`)
2. Click "Support" link in footer
3. Click "Explore Documentation" button in support dialog
4. Switch to documentation tab (if opened in new tab)
5. Wait for documentation iframe to load
6. Navigate to "How to..." section
7. Click "Inviting People to a Space"
8. Verify invitation documentation displays

**Expected Results:**

- Complete navigation flow works without errors
- Each step transitions smoothly
- Support dialog opens correctly
- Documentation page loads
- iframe content loads and displays navigation
- "How to..." section is accessible
- "Inviting People to a Space" link is clickable
- Invitation documentation page loads at `/docs/how-to/inviting`
- Content is displayed correctly in iframe

#### 4.3 Navigate Back to Dashboard from Invitation Documentation

**Pre-conditions:**

- User is viewing invitation documentation at `/docs/how-to/inviting`

**Steps:**

1. From invitation documentation page (`/docs/how-to/inviting`)
2. Click "My Dashboard" link in top navigation bar

**Expected Results:**

- Browser navigates back to `/home` URL
- Dashboard page loads successfully
- Welcome banner and dashboard content display correctly
- User session remains active
- No errors occur during navigation

### 5. Edge Cases and Error Handling

**Seed:** `./client-web/src/functional-e2e/seed-docs.spec.ts`

#### 5.1 Multiple Support Dialog Opens

#### 3.1 Full Support Journey - Dashboard to Documentation and Back

- User is on dashboard

**Steps:**

1. Click "Support" link in footer
2. Without closing the dialog, click "Support" link again

**Expected Results:**

- Only one support dialog is visible
- Second click either:
  - Does nothing (dialog already open)
  - Closes then reopens the dialog
  - Toggles the dialog closed
- No duplicate dialogs appear
- No JavaScript errors occur

#### 5.2 Documentation Page with Network Issues

**Pre-conditions:**

- User has network connectivity
- Documentation server may be unavailable

**Steps:**

1. Navigate to documentation page
2. Observe iframe loading behavior

**Expected Results:**

- If documentation fails to load:
  - Error message is displayed in iframe
  - Page structure remains intact
  - User can still navigate back to dashboard
  - No page crashes occur
- If documentation loads successfully:
  - Content displays properly
  - Interactive elements work correctly

#### 5.3 Support Dialog Accessibility

**Pre-conditions:**

- User is on dashboard

**Steps:**

1. Navigate to dashboard using keyboard only (Tab key)
2. Tab to "Support" link in footer
3. Press Enter to open dialog
4. Tab through dialog elements
5. Press Escape key

**Expected Results:**

- Support link is reachable via keyboard
- Enter key opens dialog
- Dialog elements are keyboard accessible
- Tab order is logical (buttons, links, close button)
- Escape key closes dialog
- Focus returns to appropriate element
- Screen reader announces dialog content

### 7. Cross-Browser and Responsive Testing

**Seed:** `./client-web/src/functional-e2e/seed-docs.spec.ts`

#### 7.1 Support Navigation on Mobile Viewport

**Pre-conditions:**

- Browser viewport set to mobile size (e.g., 375x667)

**Steps:**

1. Resize browser to mobile viewport
2. Navigate to dashboard
3. Scroll to footer
4. Click "Support" link
5. Interact with support dialog

**Expected Results:**

- Support link is visible and clickable on mobile
- Dialog displays properly on small screens
- All buttons are accessible and appropriately sized
- Tex6 is readable without horizontal scrolling
- Touch targets meet minimum size requirements (44x44px)
- Dialog can be closed easily

#### 7.2 Documentation on Different Browsers

**Pre-conditions:**

- Test on Chrome, Firefox, Safari, Edge

**Steps:**

1. Open documentation page in each browser
2. Verify page rendering
3. Test navigation and interactions

**Expected Results:**

- Documentation page loads correctly in all browsers
- Iframe content displays properly
- Navigation elements work consistently
- No browser-specific rendering issues
- All interactive elements function correctly
  6

## Testing Notes

### Environment Configuration

- Test environment URL: `http://localhost:3000`
- Production URL may differ: `https://alkem.io`
- Documentation iframe source may point to external service
- Some external links point to `welcome.alkem.io` domain

### Known Limitations

- Documentation iframe may not load in local development if documentation server is not running
- Some documentation links point to production environment (`https://alkem.io`)
- External links require internet connectivity

### Test Data Requirements

- Valid test user account (e.g., admin@alkem.io)
- Access to test environment
- Network connectivity for external links

### Automation Considerations

- Use Playwright's tab handling for multi-tab scenarios
- Implement proper wait strategies for dialog animations
- Handle iframe content carefully (may require frame switching)

### Known Limitations

- Documentation iframe may not load in local development if documentation server is not running
  ✅ **Support navigation flow is fully automated**
- Scenarios 1.1-1.5 cover support dialog navigation
- Scenarios 3.1-3.5 cover Tips & Tricks navigation
- Scenario 4.1-4.2 cover complete flows

✅ **Documentation links are accessible**

- Scenario 1.2 validates documentation access
- Scenario 3.2-3.3 validate documentation access from Tips & Tricks

✅ **Tutorial content loads correctly**

- Scenario 3.1 validates Tips & Tricks panel content
- Scenario 3.4 validates Welcome Space tutorial access
- Scenario 5.1 validates "Inviting People" documentation navigation
- Scenario 5.2 validates complete flow to invitation documentation

✅ **Navigation back to dashboard works**

- Scenario 2.3 validates dashboard return navigation
- Scenario 4.1 includes return navigation verification

✅ **Tests are integrated into CI/CD pipeline**

- Tests use standard cover support dialog navigation
- Scenario 3.1 covers complete flow

✅ **Documentation links are accessible**

- Scenario 1.2 validates documentation access from support
- Scenario 2.1 validates direct documentation access

✅ **Tutorial content loads correctly**

- Scenario 4.1 validates "Inviting People" documentation navigation
- Scenario 4.2 validates complete flow to invitation documentation

✅ **Navigation back to dashboard works**

- Scenario 2.3 validates dashboard return navigation
- Scenario 4.3 validates return from invitation document
  **P2 (Core Features):**

7. Scenario 3.1 - Open Tips & Tricks
8. Scenario 3.2 - Documentation from Tips & Tricks
9. Scenario 1.2 - Navigate to Documentation from Support Dialog
10. Scenario 4.1 - Navigate to "Inviting People" Documentation
11. Scenario 4.2 - Complete Flow to Invitation Documentation
12. Scenario 4.3 - Navigate back to Dashboard from Invitation Docs
13. Scenario 3.1 - Complete support journey

**P2 (Core Features):** 7. Scenario 1.3 - Close Support Dialog 8. Scenario 2.1 - Direct Documentation Access 9. Scenario 2.2 - Documentation Page Layout Verification 10. Scenario 2.3 - Navigate back to Dashboard

**P3 (Additional Coverage):** 11. Section 5 - Edge cases 12. Section 6
