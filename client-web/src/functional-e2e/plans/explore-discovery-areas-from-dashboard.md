# Test Plan: Explore Discovery Areas from Dashboard

**Seed:** `client-web/src/functional-e2e/seed.spec.ts`

## Application Overview

This plan covers navigation from the Alkem.io `My Dashboard` to key discovery areas and back:

- Spaces (explore spaces page + space detail)
- Contributors (contributors page + organisation detail)
- Forum (forum page + discussion detail)
- Library (library page + template pack + collaboration tool)

Focus is on navigation correctness, page loading, and basic content presence, not on deep functional behavior inside each area.

---

## Preconditions / Assumptions

- User is logged in as `admin@alkem.io` using the existing seed login flow in `seed.spec.ts`.
- Starting URL: `$ALKEMIO_BASE_URL/home` (My Dashboard).
- Cookies consent is already accepted or handled in setup.
- Default language: English.
- Test runs on desktop viewport in Chromium.

---

## Scenario 1: Explore Spaces, Open Space, Return

**Title:** Explore Spaces page and open a Space from Dashboard

**Steps:**

1. Ensure you are on `My Dashboard` (e.g. heading "Welcome, admin!" is visible).
2. Scroll to the "Explore Spaces of Your Interest" section.
3. Click on the control or link that opens the full Spaces explore view (e.g. a space card or "Explore Spaces" action).
4. Wait for navigation to complete.
   - **Expected:** URL changes to Spaces listing (e.g. contains `/spaces`), page heading or label indicates Spaces listing.
5. On the Spaces listing page, locate any visible Space card.
6. Click the Space card title or primary action to open its details.
7. Wait for navigation.
   - **Expected:** Space detail page loads; heading shows Space name; no error banner.
8. Use in-page navigation (e.g. "Back to Spaces") or browser Back to return to the Spaces listing page.
   - **Expected:** Spaces listing is visible again; at least one Space card is shown.
9. Navigate back to `My Dashboard` using global navigation (e.g. "My Dashboard" link or logo).
   - **Expected:** Dashboard heading "Welcome, admin!" is visible; URL is `/home`.

**Success Criteria:**

- All navigations occur without errors.
- Spaces listing and Space detail pages render key headings/content.
- Back navigation restores the correct page each time.

**Failure Conditions:**

- Any link is missing, disabled, or navigates to 4xx/5xx.
- Spaces list is empty when seed data should provide spaces.
- Detail view shows generic error or blank content.
- Back navigation lands on unexpected page.

---

## Scenario 2: Explore Contributors, Open Organisation, Return

**Title:** Explore Contributors page and open an Organisation

**Steps:**

1. From `My Dashboard`, open the Contributors area via the main navigation (e.g. a "Contributors" or "People & Organizations" link).
2. Wait for navigation.
   - **Expected:** URL indicates contributors/organisations; page heading mentions Contributors/Organisations; a list or grid is visible.
3. In the list, identify an Organisation entry (not an individual user), based on label or icon.
   - **Expected:** At least one organisation-type entry is present.
4. Click the Organisation name/card to open its detail page.
5. Wait for navigation.
   - **Expected:** Organisation detail page loads; heading matches the organisation name; basic metadata (description, related spaces, etc.) is visible.
6. Use in-page navigation or Back to return to the Contributors listing.
   - **Expected:** Same contributors/organisations view is visible again.
7. Navigate back to `My Dashboard` using main navigation.
   - **Expected:** Dashboard is shown with the welcome heading.

**Success Criteria:**

- Contributors page and Organisation detail page load with appropriate headings and content.
- Organisation link works and returns correctly to the listing.
- Dashboard remains reachable from Contributors.

**Failure Conditions:**

- Contributors link missing or leads to error.
- No organisation entries available.
- Organisation detail missing name or shows error.

---

## Scenario 3: Explore Forum, Open Discussion, Return

**Title:** Explore Forum and open a Discussion

**Steps:**

1. From `My Dashboard`, navigate to the Forum area (e.g. click "Forum" / "Discussions" in the main nav).
2. Wait for navigation.
   - **Expected:** URL indicates forum/discussions; page heading references Forum or Discussions; list of topics is visible.
3. Identify an existing discussion topic in the list.
   - **Expected:** At least one discussion item is present.
4. Click on the discussion title to open its detail page.
5. Wait for navigation.
   - **Expected:** Discussion detail page shows the discussion title, main post content, and possibly replies.
6. Use in-page "Back to Forum" or Back to return to the discussion list.
   - **Expected:** Forum listing is visible again, with at least one discussion.
7. Navigate back to `My Dashboard` via main navigation.
   - **Expected:** Dashboard heading is visible; URL is `/home`.

**Success Criteria:**

- Forum/Discussions page and Discussion detail page load correctly.
- Opening and closing a discussion preserves navigation flow.
- No unexpected errors or blank content.

**Failure Conditions:**

- Forum navigation missing or broken.
- No discussions available when expected.
- Discussion detail lacks title or main content.

---

## Scenario 4: Explore Library, Open Template Pack, Open Collaboration Tool, Return

**Title:** Explore Library, open Template Pack and Collaboration Tool

**Steps:**

1. From `My Dashboard`, navigate to the Library section using the main navigation (e.g. "Library" or "Templates").
2. Wait for navigation.
   - **Expected:** URL indicates library/templates; page heading references Library or Templates; listing of items is visible.
3. In the Library listing, locate an item identified as a Template Pack (via label, tag, or title).
   - **Expected:** At least one Template Pack item is visible.
4. Click the Template Pack card/title to open its detail page.
5. Wait for navigation.
   - **Expected:** Template Pack detail page shows pack name, description, and included templates/tools.
6. On the Template Pack page, locate a Collaboration Tool entry or action (e.g. card, button, or link).
7. Click the Collaboration Tool item.
8. Wait for the Collaboration Tool view to load.
   - **Expected:** A dedicated Collaboration Tool UI is rendered (e.g. board/canvas, configuration, or embedded app); no error page.
9. Use in-page navigation or Back to return from the Collaboration Tool to the Template Pack detail page.
   - **Expected:** Template Pack detail page is visible again.
10. Use in-page navigation or Back to return from the Template Pack to the Library listing.
    - **Expected:** Library listing page is shown again with items.
11. Navigate back to `My Dashboard` via main navigation.
    - **Expected:** Dashboard heading "Welcome, admin!" is visible.

**Success Criteria:**

- Library listing, Template Pack detail, and Collaboration Tool views all load with meaningful content.
- Each navigation step (Dashboard → Library → Template Pack → Collaboration Tool → back) works without error.
- Final return to Dashboard is successful.

**Failure Conditions:**

- Library or Template Pack links missing or broken.
- No Template Pack available in listing when expected.
- Collaboration Tool fails to load or shows an error/blank screen.
- Back navigation lands on incorrect page.
