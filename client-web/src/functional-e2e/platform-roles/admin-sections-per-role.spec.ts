// workspace#027 — platform role redesign. Manual checklist Part A, automated:
// every role sees EXACTLY its Administration sections — and any other section,
// typed by URL, ends on "Access Restricted".
//
// The expectations below are this suite's own statement of the requirements
// (spec §Target global role model), NOT an import of the client's access table:
// a test that reads its expectation from the code under test proves nothing.
import { expect, type Page } from '@playwright/test';
import {
  PLATFORM_ROLE_NAMES,
  platformRoleEmail,
  seedPlatformRoleUsers,
  type PlatformRoleName,
} from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** Section id → [tab label, path], in the order the shell renders them. */
const SECTIONS = {
  spaces: ['Spaces', '/admin/spaces'],
  users: ['Users', '/admin/users'],
  organizations: ['Organisations', '/admin/organizations'],
  'innovation-packs': ['Innovation Packs', '/admin/innovation-packs'],
  'innovation-hubs': ['Innovation Hubs', '/admin/innovation-hubs'],
  'virtual-contributors': ['Virtual Contributors', '/admin/virtual-contributors'],
  authorization: ['Authorisation', '/admin/authorization'],
  'authorization-policies': ['Authorisation Policies', '/admin/authorization-policies'],
  transfer: ['Conversions & Transfers', '/admin/transfer'],
  licensing: ['Licensing', '/admin/licensing'],
} as const;
type SectionId = keyof typeof SECTIONS;
const ALL_SECTIONS = Object.keys(SECTIONS) as SectionId[];

/** What each role may see. A role that is not listed sees NOTHING. */
const SEES: Partial<Record<PlatformRoleName, readonly SectionId[]>> = {
  PLATFORM_ROLES_ADMIN: ['authorization'],
  PLATFORM_CONTENT_FULL_ACCESS: [
    'spaces',
    'organizations',
    'innovation-packs',
    'innovation-hubs',
    'virtual-contributors',
  ],
  PLATFORM_RESOURCE_ADMIN: ['transfer'],
  PLATFORM_USERS_ADMIN: ['users', 'authorization'],
  PLATFORM_SUPPORT: ['organizations', 'innovation-packs', 'innovation-hubs'],
  PLATFORM_LICENSE_MANAGER: ['licensing'],
  PLATFORM_AUDIT_READER: ['authorization'],
  // Settings Admin, Operations Admin, Spaces Reader and the four Feature roles
  // have no Administration UI at all: everything they own is API-only today.
};

// Seeding is idempotent and cheap once done (15 sign-ins, no writes); memoised
// per worker so every test in this file can simply await it.
let seeded: Promise<unknown> | undefined;
const rolesAreSeeded = () => (seeded ??= seedPlatformRoleUsers());

const restricted = (page: Page) =>
  page.getByRole('heading', { name: 'Access Restricted', level: 1 });

for (const role of PLATFORM_ROLE_NAMES) {
  const sees = SEES[role] ?? [];
  const hidden = ALL_SECTIONS.filter(id => !sees.includes(id));
  const asRole = createPersonaTest(platformRoleEmail(role));

  asRole.describe(`${role} — Administration sections`, () => {
    asRole.beforeEach(rolesAreSeeded);

    if (sees.length === 0) {
      asRole('has no Administration area: /admin ends on "Access Restricted"', async ({ page }) => {
        await page.goto(`${baseUrl}/admin`);
        await expect(restricted(page)).toBeVisible({ timeout: 20_000 });
        await expect(page).toHaveURL(/\/restricted/);
        await expect(page.getByRole('heading', { name: 'Administration' })).toHaveCount(0);
      });
    } else {
      asRole(`sees exactly: ${sees.map(id => SECTIONS[id][0]).join(', ')}`, async ({ page }) => {
        await page.goto(`${baseUrl}/admin`);
        await expect(page.getByRole('heading', { name: 'Administration', level: 1 })).toBeVisible({
          timeout: 20_000,
        });
        const tabs = page.getByRole('main').getByRole('tablist').first().getByRole('tab');
        await expect(tabs).toHaveText(sees.map(id => SECTIONS[id][0]));
        // /admin lands on the role's FIRST section, and that tab is the selected one.
        await expect(page).toHaveURL(new RegExp(`${SECTIONS[sees[0]][1]}(/|$|\\?)`));
        await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
      });
    }

    asRole('no other section opens by URL', async ({ page }) => {
      // KNOWN CLIENT DEFECT (027): the shell filters the NAVIGATION but does not
      // guard the ROUTES. A role that has at least one section can type another
      // section's URL and its page renders — usually empty, because the server
      // refuses the data, but e.g. Platform License Manager on /admin/users gets
      // every user listed with Edit / Email change history / Delete controls.
      // Roles with NO section are bounced to "Access Restricted" correctly, so
      // for them this test passes for real. Expected to fail for the others
      // until the client guards the routes — then it turns RED: delete this line.
      asRole.fail(sees.length > 0, 'client-web 027: /admin/<section> routes are not guarded per section');
      // Up to ten navigations in one test.
      asRole.setTimeout(150_000);

      const leaks: string[] = [];
      for (const id of hidden) {
        const [label, path] = SECTIONS[id];
        await page.goto(`${baseUrl}${path}`);
        const shell = page.getByRole('heading', { name: 'Administration', level: 1 });
        await expect(restricted(page).or(shell)).toBeVisible({ timeout: 20_000 });
        if (await shell.isVisible()) {
          // Bounced to one of its OWN sections is fine; staying on the foreign
          // path with the shell rendered is the leak.
          if (new URL(page.url()).pathname.startsWith(path)) {
            // "Showing N of M" when the page has a list — never WAIT for it: most
            // of these pages have no such element.
            await page.waitForLoadState('networkidle').catch(() => undefined);
            const status = page.getByRole('main').getByRole('status').first();
            const rows = (await status.count()) > 0 ? await status.textContent() : null;
            leaks.push(`${label}${rows ? ` (${rows.trim()})` : ''}`);
          }
        }
      }
      expect(leaks, `sections that rendered for ${role}`).toEqual([]);
    });
  });
}
