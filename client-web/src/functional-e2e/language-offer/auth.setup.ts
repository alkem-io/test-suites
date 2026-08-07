// Playwright `setup` project for the 029 language-offer walks: log each persona
// in once through the repo's shared CRD login helper and persist the session to
// `.auth/`. The browser project depends on this, so specs only declare
// `test.use({ storageState: ... })` and never drive the Kratos UI themselves.

import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loginViaCrd } from '../helpers/login.helper';
import { ADMIN_EMAIL, ADMIN_STATE, MEMBER_EMAIL, MEMBER_STATE } from './authState';

/**
 * Persist a persona session. Storage state must carry the session only — if a
 * language key ever leaked into it, the US2 "stored preference wins" walks would
 * be proving browser storage rather than the account setting, so we assert the
 * state is language-free at capture time.
 */
async function captureSession(page: import('@playwright/test').Page, email: string, statePath: string) {
  await fs.promises.mkdir(path.dirname(statePath), { recursive: true });
  await loginViaCrd(page, email);
  await page.context().storageState({ path: statePath });

  const saved = JSON.parse(await fs.promises.readFile(statePath, 'utf-8'));
  const languageKeys = (saved.origins ?? [])
    .flatMap((o: { localStorage?: Array<{ name: string }> }) => o.localStorage ?? [])
    .map((entry: { name: string }) => entry.name)
    .filter((name: string) => name === 'i18nextLng' || name === 'alkemio.languageOffer');
  expect(languageKeys, `${email} storage state must carry no language keys`).toEqual([]);
}

setup('authenticate admin', async ({ page }) => {
  await captureSession(page, ADMIN_EMAIL, ADMIN_STATE);
});

setup('authenticate member', async ({ page }) => {
  await captureSession(page, MEMBER_EMAIL, MEMBER_STATE);
});
