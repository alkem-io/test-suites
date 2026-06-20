/**
 * Shared OIDC/BFF login + GraphQL fixture helpers for the unified
 * collaboration service-level e2e (epic 003-unify-collab-yjs).
 *
 * Both the memo and the whiteboard service-level specs drive two RAW WebSocket
 * clients straight at the unified collaboration service —
 *
 *     ws://localhost:3000/collab/<documentId>?type=memo
 *     ws://localhost:3000/collab/<documentId>?type=whiteboard
 *
 * — and assert CRDT convergence, per-property merge, awareness and persistence at
 * the y-protocols wire level. They do NOT touch the React UI (no ProseMirror, no
 * Excalidraw). This is the robust, headless, CI-gating layer: it tests the
 * WS/CRDT protocol + backend, not the editor bindings.
 *
 * The one place a real browser is still needed is AUTH. Post the develop OIDC
 * cutover the server no longer accepts the `@alkemio/client-lib` Bearer token
 * (it fails `ERR_JWS_INVALID` / `unauthenticated`). The working identity is the
 * OIDC/BFF session cookie (`alkemio_session`), minted by driving the full
 * browser login once with Playwright:
 *
 *     GET /api/auth/oidc/login?returnTo=/      (BFF kicks off OIDC)
 *       → Hydra → Kratos /login?flow=…         (the SPA renders the password form)
 *       → fill admin email/password → SIGN IN
 *       → Hydra consent auto-grants → GET /api/auth/oidc/callback
 *       → server req.session.regenerate() stamps alkemio_actor_id
 *         and Set-Cookie alkemio_session → 302 to the app.
 *
 * The resulting cookie jar (notably `alkemio_session`) authenticates BOTH:
 *   1. the GraphQL fixture calls — `Cookie:` instead of the dead Bearer; the
 *      server's cookie-session strategy resolves it to the admin actor.
 *   2. the two `/collab` WS clients — Traefik's `alkemio-resolve` forwardAuth
 *      resolves `alkemio_session` to `X-Alkemio-Actor-Id`, which the collab
 *      service consumes at the WS handshake (cookie → 101 + actor id;
 *      Bearer/no-cookie → 401).
 *
 * @see ../../../../client-web/src/core/collab/UnifiedCollabProvider.ts (the prod client)
 */
import { chromium, type Browser } from '@playwright/test';

export const ADMIN_EMAIL = process.env.COLLAB_ADMIN_EMAIL || 'admin@alkem.io';
export const ADMIN_PASSWORD =
  process.env.COLLAB_ADMIN_PASSWORD ||
  process.env.AUTH_TEST_HARNESS_PASSWORD ||
  'Alk3mio$Collab!2026';

/**
 * Apex origin the browser + WS must use. In the single-host dev stack Traefik
 * serves the web client, the GraphQL API and the `/collab` WS on the SAME apex
 * origin (`http://localhost:3000`). The server CORS allow-list only contains the
 * apex, so everything must speak to :3000.
 */
export const BASE_URL = process.env.COLLAB_BASE_URL || 'http://localhost:3000';
export const GQL_PRIVATE =
  process.env.COLLAB_GQL || `${BASE_URL}/api/private/non-interactive/graphql`;
const OIDC_LOGIN = `${BASE_URL}/api/auth/oidc/login?returnTo=/`;
/** `ws://localhost:3000/collab` — y-websocket appends `/<documentId>?type=…`. */
export const WS_BASE = BASE_URL.replace(/^http/, 'ws') + '/collab';

/**
 * Drives the full OIDC/BFF browser login as admin and returns a serialized
 * `Cookie:` header (`name=value; …`) that authenticates GraphQL and rides the
 * `/collab` WS handshake.
 *
 * Launches its own short-lived chromium (system Chrome channel) so the caller
 * does not need a Playwright `page` fixture — the WS clients are raw `ws`, not a
 * browser. Cached process-wide: one login per spec run.
 */
let cachedCookie: string | undefined;

export async function loginAsAdminCookie(): Promise<string> {
  if (cachedCookie) return cachedCookie;

  // Default to the Playwright-bundled chromium (always installed by
  // `playwright install` in CI). The existing base config uses the system
  // `chrome` channel; allow opting into it (or any channel) via env for parity.
  const channel = process.env.COLLAB_BROWSER_CHANNEL || undefined;
  const browser: Browser = await chromium.launch({
    ...(channel ? { channel } : {}),
    headless: true,
  });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(OIDC_LOGIN, { waitUntil: 'domcontentloaded' });

    // The BFF bounces to the Kratos login flow; the SPA renders the real
    // email/password form at /login?flow=<id>.
    await page.locator('input[name="identifier"]').waitFor({ timeout: 25000 });

    const cookieBtn = page.getByRole('button', { name: /Accept All Cookies/i });
    if (await cookieBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cookieBtn.click();
    }

    await page.locator('input[name="identifier"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /^SIGN IN$/i }).click();

    // The flow completes through Hydra consent → BFF callback → app. We only
    // need to leave the Kratos /login?flow form; the callback sets the
    // alkemio_session cookie along the way.
    await page
      .waitForURL(u => !/\/login\?flow/.test(u.toString()), { timeout: 30000 })
      .catch(() => undefined);
    // Settle the redirect chain so the Set-Cookie from the BFF callback is in
    // the jar before we read it.
    await page
      .waitForLoadState('networkidle', { timeout: 15000 })
      .catch(() => undefined);

    const cookies = await ctx.cookies();
    const names = cookies.map(c => c.name);
    if (!names.includes('alkemio_session')) {
      throw new Error(
        `OIDC/BFF login did not yield an alkemio_session cookie (got: ${names.join(', ')}). ` +
          `Is the dev stack up at ${BASE_URL} with OIDC routed?`
      );
    }
    cachedCookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    return cachedCookie;
  } finally {
    await browser.close();
  }
}

/** POSTs a GraphQL operation as admin (cookie-authenticated). */
export async function gql<T = any>(
  cookie: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GQL_PRIVATE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
      origin: BASE_URL,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}
