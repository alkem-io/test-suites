import { chromium, expect, type Route } from '@playwright/test';
import type { AcceptanceFixture } from './attachments.acceptance';
import { loopbackURL, waitUntil } from './attachments.streaming';

/** Uses the fixture's existing supported Element UI login; never injects session state. */
export async function openElement(fixture: AcceptanceFixture) {
  loopbackURL(fixture.elementCDPURL);
  const origin = loopbackURL(fixture.elementBaseURL).origin;
  const browser = await chromium.connectOverCDP(fixture.elementCDPURL);
  const page = browser
    .contexts()
    .flatMap(context => context.pages())
    .find(candidate => {
      try {
        return new URL(candidate.url()).origin === origin;
      } catch {
        return false;
      }
    });
  if (!page) {
    await browser.close();
    throw new Error(
      'Owned Element UI session must be running before acceptance'
    );
  }
  expect(await page.evaluate(() => localStorage.getItem('mx_user_id'))).toBe(
    fixture.users[1].matrixUserID
  );
  await page.goto(
    `${fixture.elementBaseURL}/#/room/${fixture.independentRooms[0].matrixRoomID}`
  );
  await expect(page.locator('.mx_MessageComposer')).toBeVisible();
  return { page, disconnect: () => browser.close() };
}

/** Holds only native media event publication after the real Element upload. */
export async function pauseElementMediaSend(
  page: import('@playwright/test').Page
) {
  let held: Route | undefined;
  let release!: () => void;
  const released = new Promise<void>(resolve => {
    release = resolve;
  });
  const pattern = '**/_matrix/client/**/rooms/**/send/m.room.message/**';
  const handler = async (route: Route) => {
    const body = route.request().postDataJSON() as { url?: string };
    if (!body.url?.startsWith('mxc://')) return route.continue();
    if (held) throw new Error('Element attempted more than one media event');
    held = route;
    await released;
    await route.continue().catch(() => undefined);
  };
  await page.route(pattern, handler);
  return {
    wait: () =>
      waitUntil(() => !!held, 'Element media send was not intercepted', 30_000),
    release,
    close: async () => {
      release();
      await page.unroute(pattern, handler);
    },
  };
}

export async function uploadThroughElementUI(
  page: import('@playwright/test').Page,
  input: { name: string; mimeType: string; buffer: Buffer }
): Promise<string> {
  const completed = page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      /\/_matrix\/media\/(?:r0|v3)\/upload(?:\?|$)/.test(response.url()) &&
      decodeURIComponent(
        new URL(response.url()).searchParams.get('filename') ?? ''
      ) === input.name
  );
  await page.locator('input[type="file"]').first().setInputFiles(input);
  // Element's native upload preview owns the final Upload action.
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Upload', exact: true })
    .click();
  const response = await completed;
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { content_uri?: string };
  if (!body.content_uri?.startsWith('mxc://'))
    throw new Error('Element upload returned no Matrix media reference');
  return body.content_uri;
}
