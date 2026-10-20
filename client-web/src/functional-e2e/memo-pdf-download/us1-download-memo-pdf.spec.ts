// spec: specs/087-memo-pdf-download/spec.md — User Story 1 (P1)
// workspace#087-memo-pdf-download, alkem-io/server#6660.
//
// A signed-in reader opens a memo in the CRD memo dialog, clicks "Download PDF"
// and the browser saves `<title-slug>-<YYYY-MM-DD UTC>.pdf` whose text is the
// memo's CURRENT content. Walked through the gateway (:3000) with the real
// cookie session — never via :3001, never via the non-interactive REST path.
//
// Not reproduced here (verified in the live forge walk instead):
//  - US1-AS7 (document / signing_attempt counts unchanged) needs loopback DB
//    access, which the nightly harness does not have.
//  - the uploaded-image half of US1-AS3 needs a file upload through the
//    storage bucket; the external-image half is asserted.
//  - a standalone memo outside any space: no UI route opens one.
import { expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import {
  getGraphqlClient,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import {
  CalloutFramingType,
  CalloutVisibility,
  LicenseEntitlementType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { loginViaCrd } from '../helpers/login.helper';

const SIGNING_PLAN_NAME = 'SPACE_FEATURE_MEMO_SIGNING';
const uniqueId = UniqueIDGenerator.getID();
// Provisioning and a PDF render per walk need more than the long tier's 180 s.
const WALK_TIMEOUT_MS = 300_000;
const utcDay = () => new Date().toISOString().slice(0, 10);

const scenarioConfig: TestScenarioConfig = {
  name: 'memo-pdf-download-us1',
  space: {
    collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let planId = '';
let planAssigned = false;
const test = createPersonaTest('space.member@alkem.io');
test.describe.configure({ mode: 'serial' });

const admin = async (fn: (token: string | undefined) => Promise<any>): Promise<any> =>
  graphqlErrorWrapper(fn as any, TestUser.GLOBAL_ADMIN);

type Seeded = { calloutUrl: string; title: string };
const seeded: Record<string, Seeded> = {};

const createMemoCallout = async (
  key: string,
  title: string,
  markdown: string
): Promise<void> => {
  const client = getGraphqlClient();
  const created = await admin(token =>
    client.CreateCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID: baseScenario.space.collaboration.calloutsSetId,
          framing: {
            profile: { displayName: `${key} ${uniqueId}` },
            type: CalloutFramingType.Memo,
            memo: { markdown, profile: { displayName: title } },
          },
          settings: { visibility: CalloutVisibility.Published },
        },
      },
      { authorization: `Bearer ${token}` }
    )
  );
  const calloutUrl = created.data?.createCalloutOnCalloutsSet?.framing?.profile?.url ?? '';
  if (!calloutUrl) throw new Error(`memo callout ${key} not created: ${JSON.stringify(created.error)}`);
  seeded[key] = { calloutUrl, title };
};

test.beforeAll(async () => {
  test.setTimeout(WALK_TIMEOUT_MS);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await createMemoCallout(
    'board',
    'Board decision — Q4',
    [
      'Decision text with emoji 🎉 and ==highlight== and a [link text](https://example.com).',
      '',
      '![external image](https://example.com/x.png)',
    ].join('\n')
  );
  await createMemoCallout('cyrillic', 'Решение', 'Cyrillic title memo body.');
  await createMemoCallout('punct', '!!! ??? ...', 'Punctuation title memo body.');
  // Profile display names are capped at 128 characters by the server, so the
  // longest seedable title is 128; 120 is still well past the 80-character slug cap.
  await createMemoCallout('long', 'A'.repeat(120), 'Very long title memo body.');
  await createMemoCallout('live', `Live memo ${uniqueId}`, 'Initial paragraph.');
  const client = getGraphqlClient();
  const plans = await admin(token => client.GetPlatformLicensePlans({}, { authorization: `Bearer ${token}` }));
  planId = plans.data?.platform?.licensingFramework?.plans?.find((p: { name: string }) => p.name === SIGNING_PLAN_NAME)?.id ?? '';
});

test.afterAll(async () => {
  test.setTimeout(WALK_TIMEOUT_MS);
  // The revocation is checked, but the Space is deleted either way; a failed
  // revocation is raised only after the house cleanup has run.
  let revokeFailure = '';
  try {
    if (planAssigned && baseScenario?.space?.id) {
      const client = getGraphqlClient();
      const plans = await admin(token => client.GetPlatformLicensePlans({}, { authorization: `Bearer ${token}` }));
      const licensingID = plans.data?.platform?.licensingFramework?.id ?? '';
      if (!licensingID) {
        revokeFailure = `licensing framework not found: ${JSON.stringify(plans.error)}`;
      } else {
        const revoked = await admin(token =>
          client.RevokeLicensePlanFromSpace(
            { planData: { spaceID: baseScenario.space.id, licensePlanID: planId, licensingID } },
            { authorization: `Bearer ${token}` }
          )
        );
        if (revoked.error) revokeFailure = JSON.stringify(revoked.error);
      }
    }
  } finally {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  }
  if (revokeFailure) {
    throw new Error(`revoking ${SIGNING_PLAN_NAME} from Space ${baseScenario.space.id} failed: ${revokeFailure}`);
  }
});

const openMemo = async (page: Page, key: string) => {
  await page.goto(seeded[key].calloutUrl);
  await page.getByRole('button', { name: 'Open Memo' }).first().click();
  const dialog = page.getByRole('dialog', { name: seeded[key].title });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
};

const download = async (page: Page, savePath: string) => {
  const button = page.getByRole('button', { name: /download pdf/i });
  await expect(button).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await button.click();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  const file = await downloadPromise;
  await file.saveAs(savePath);
  await expect(button).toHaveAttribute('aria-busy', 'false');
  return { name: file.suggestedFilename(), bytes: fs.readFileSync(savePath) };
};

const pdfText = (path: string): string | null => {
  try {
    return execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
  } catch (error) {
    // Only a missing binary (poppler-utils not installed) skips the text checks;
    // a PDF pdftotext cannot read is a red, never a skip.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

/** The UTC days the server may have stamped a download with: the request can straddle midnight. */
const downloadDays = async <T>(fn: () => Promise<T>): Promise<{ result: T; days: string[] }> => {
  const before = utcDay();
  const result = await fn();
  const after = utcDay();
  return { result, days: before === after ? [before] : [before, after] };
};

// Sonner marks the variant on the toast element (`data-type`); it carries no status role.
const errorToast = (page: Page) =>
  page.locator('[data-sonner-toast][data-type="error"], [data-sonner-toast][data-type="warning"]');

test.describe('US1 — a reader downloads a memo as PDF', () => {
  test.setTimeout(WALK_TIMEOUT_MS);

  test('US1-AS1 @forge-acceptance — saves <slug>-<today UTC>.pdf, busy until it arrives, no error toast, within 10 s', async ({ page }, testInfo) => {
    await openMemo(page, 'board');
    const started = Date.now();
    const {
      result: { name, bytes },
      days,
    } = await downloadDays(() => download(page, testInfo.outputPath('as1.pdf')));
    expect(Date.now() - started).toBeLessThanOrEqual(10_000);
    expect(days.map(day => `board-decision-q4-${day}.pdf`)).toContain(name);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    await expect(errorToast(page)).toHaveCount(0);
  });

  test('US1-AS2 @forge-acceptance — the button is on the callout framing / contribution dialog for an authenticated reader', async ({ page }, testInfo) => {
    const dialog = await openMemo(page, 'board');
    await expect(dialog.getByRole('button', { name: /download pdf/i })).toBeVisible();
    const { name } = await download(page, testInfo.outputPath('as2.pdf'));
    expect(name).toMatch(/^[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test('US1-AS3 @forge-acceptance — mark, emoji, link text and a labelled external-image link; no header, no "sign" wording', async ({ page }, testInfo) => {
    await openMemo(page, 'board');
    const path = testInfo.outputPath('as3.pdf');
    const { bytes } = await download(page, path);
    const text = pdfText(path);
    test.skip(text === null, 'pdftotext is not available on this runner');
    expect(text).toContain('highlight');
    expect(text).toContain('link text');
    expect(text).toContain('🎉');
    expect(text).toContain('external image');
    expect(text).not.toMatch(/sign/i);
    expect(text).not.toContain('Board decision');
    expect(bytes.includes(Buffer.from('/URI (https://example.com/x.png)'))).toBe(true);
  });

  test('US1-AS4 @forge-acceptance — a paragraph typed by another collaborator is in the PDF (live read)', async ({ page, browser }, testInfo) => {
    await openMemo(page, 'live');
    // The persona fixture overrides the storageState option, and a bare
    // browser.newContext() inherits it, so the collaborator would start signed
    // in as the reader. An explicit empty session makes it start logged out.
    const collabContext = await browser.newContext({
      acceptDownloads: true,
      storageState: { cookies: [], origins: [] },
    });
    expect(await collabContext.cookies()).toHaveLength(0);
    const collab = await collabContext.newPage();
    try {
      await loginViaCrd(collab, 'space.admin@alkem.io');
      await openMemo(collab, 'live');
      const marker = `LIVE-${Date.now().toString(36)}`;
      const editor = collab.locator('.ProseMirror').first();
      await editor.click();
      await collab.keyboard.press('Control+End');
      await collab.keyboard.press('Enter');
      await collab.keyboard.type(`New paragraph ${marker}.`);
      await expect(page.locator('.ProseMirror').first()).toContainText(marker, { timeout: 15_000 });
      const path = testInfo.outputPath('as4.pdf');
      await download(page, path);
      const text = pdfText(path);
      test.skip(text === null, 'pdftotext is not available on this runner');
      expect(text).toContain(marker);
    } finally {
      await collabContext.close();
    }
  });

  test('US1-AS5 @forge-acceptance — non-Latin / punctuation-only titles fall back to memo-<date>.pdf; a 120-char title yields an 80-char slug', async ({ page }, testInfo) => {
    for (const key of ['cyrillic', 'punct']) {
      await openMemo(page, key);
      const {
        result: { name },
        days,
      } = await downloadDays(() => download(page, testInfo.outputPath(`as5-${key}.pdf`)));
      expect(days.map(day => `memo-${day}.pdf`)).toContain(name);
    }
    await openMemo(page, 'long');
    const {
      result: { name },
      days,
    } = await downloadDays(() => download(page, testInfo.outputPath('as5-long.pdf')));
    expect(days.map(day => `${'a'.repeat(80)}-${day}.pdf`)).toContain(name);
  });

  test('US1-AS6 @forge-acceptance — Download PDF is present with and without the signing entitlement', async ({ page }, testInfo) => {
    test.skip(!planId, `license plan ${SIGNING_PLAN_NAME} not found on this stack`);
    const dialog = await openMemo(page, 'board');
    await expect(dialog.getByRole('button', { name: /download pdf/i })).toBeVisible();
    const noEntitlement = await download(page, testInfo.outputPath('as6-off.pdf'));
    expect(noEntitlement.bytes.subarray(0, 5).toString()).toBe('%PDF-');

    const client = getGraphqlClient();
    const assigned = await admin(token =>
      client.AssignLicensePlanToSpace(
        { planData: { spaceID: baseScenario.space.id, licensePlanID: planId } },
        { authorization: `Bearer ${token}` }
      )
    );
    if (!assigned.error) planAssigned = true;
    expect(assigned.error).toBeUndefined();
    await expect
      .poll(async () => {
        const license = await admin(token =>
          client.GetSpaceLicenseEntitlements({ spaceID: baseScenario.space.id }, { authorization: `Bearer ${token}` })
        );
        return (
          license.data?.lookup?.space?.license?.entitlements?.find(
            (e: { type: LicenseEntitlementType }) => e.type === LicenseEntitlementType.SpaceFlagMemoSigning
          )?.enabled ?? false
        );
      }, { timeout: 30_000 })
      .toBe(true);
    const entitledDialog = await openMemo(page, 'board');
    await expect(entitledDialog.getByRole('button', { name: /download pdf/i })).toBeVisible();
    const entitled = await download(page, testInfo.outputPath('as6-on.pdf'));
    expect(entitled.bytes.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
