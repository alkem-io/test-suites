import { randomUUID } from 'crypto';
import { Page } from '@playwright/test';

// Kratos Settings-flow mocking for the Connected Accounts specs
// (workspace#051-cleverbase-account-linking).
//
// Path matching is SUFFIX-based on the pathname ('/self-service/settings…')
// so it holds under the same-origin `/identity/ory/kratos/public` proxy
// prefix the dev stack serves Kratos through — the prefix is never
// hard-coded anywhere in these fixtures or specs. The same-origin proxy is
// also what lets the inert intercepted page below share sessionStorage with
// the app (the outcome-marker asserts depend on it).
//
// STATE CONTRACT (anti-flake, non-negotiable): every route handler consults a
// CALLER-OWNED state object on EVERY request — never a call counter.
// useKratosFlow's returnTo-settling re-kickoff plus React StrictMode double
// effects make the per-mount request count indeterminate, so any
// "fail the first N requests" scheme is a built-in race. A test that needs a
// phase change (fail → recover, locked → cured) mutates the state object it
// owns AFTER its previous phase's asserts have completed.

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

export type MockFlowMessage = {
  id: number;
  type: 'info' | 'error' | 'success';
  text: string;
};

export type MockProviderNode = {
  /** Lower-cased Kratos provider id ('microsoft' | 'linkedin' | 'github' | …). */
  provider: string;
  /** Which oidc submit node the flow offers for this provider. */
  action: 'link' | 'unlink';
};

export type BuildSettingsFlowOptions = {
  id?: string;
  /** The flow's own return_to (drives securitySettingsResumeTarget on /settings). */
  returnTo?: string;
  /** Kratos `flow.active` — leave undefined so the section keeps flow messages. */
  active?: string;
  providerNodes?: MockProviderNode[];
  messages?: MockFlowMessage[];
};

export const MOCK_CSRF_TOKEN = 'mock-csrf-token-value';

/**
 * Crafts a Kratos SettingsFlow JSON of exactly the shape
 * connectedAccountsFlowAdapter consumes: a hidden csrf_token node
 * (node_type 'input', type 'hidden') plus one oidc-group submit node
 * (type 'submit', name 'link'|'unlink', value <provider>) per entry.
 */
export function buildSettingsFlow(options: BuildSettingsFlowOptions = {}) {
  const id = options.id ?? randomUUID();
  const action = `${baseUrl}/identity/ory/kratos/public/self-service/settings?flow=${id}`;
  const now = Date.now();

  const csrfNode = {
    type: 'input',
    group: 'default',
    attributes: {
      node_type: 'input',
      name: 'csrf_token',
      type: 'hidden',
      value: MOCK_CSRF_TOKEN,
      required: true,
      disabled: false,
    },
    messages: [],
    meta: {},
  };

  const oidcNodes = (options.providerNodes ?? []).map(node => ({
    type: 'input',
    group: 'oidc',
    attributes: {
      node_type: 'input',
      name: node.action,
      type: 'submit',
      value: node.provider,
      disabled: false,
    },
    messages: [],
    meta: {
      label: {
        id: node.action === 'link' ? 1050002 : 1050003,
        text: `${node.action === 'link' ? 'Link' : 'Unlink'} ${node.provider}`,
        type: 'info',
      },
    },
  }));

  return {
    id,
    type: 'browser',
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + 30 * 60 * 1000).toISOString(),
    request_url: `${baseUrl}/identity/ory/kratos/public/self-service/settings/browser`,
    return_to: options.returnTo,
    active: options.active,
    state: 'show_form',
    ui: {
      action,
      method: 'POST',
      nodes: [csrfNode, ...oidcNodes],
      messages: options.messages ?? [],
    },
  };
}

export type SettingsFlowRoutingState = {
  /**
   * When set, EVERY settings-flow read (browser init AND flows?id) is
   * fulfilled with this flow. Mutate to serve a different flow (e.g.
   * locked → cured) — the handler re-reads it on every request.
   */
  flow?: ReturnType<typeof buildSettingsFlow>;
  /**
   * When true, EVERY settings-flow request — browser init, flows?id, and the
   * action POST — is aborted (connection refused). Flip to false AFTER the
   * fail-closed asserts to let the live Kratos serve the recovery phase.
   */
  failAll?: boolean;
};

/**
 * One route covering all three Kratos settings-flow endpoints, driven by the
 * caller-owned state object (see the state contract above). Anything the
 * state doesn't claim falls through to the live dev Kratos.
 */
export async function interceptSettingsFlowReads(page: Page, state: SettingsFlowRoutingState): Promise<void> {
  await page.route(
    url =>
      url.pathname.endsWith('/self-service/settings/browser') ||
      url.pathname.endsWith('/self-service/settings/flows') ||
      url.pathname.endsWith('/self-service/settings'),
    async route => {
      if (state.failAll) {
        await route.abort('connectionrefused');
        return;
      }
      const pathname = new URL(route.request().url()).pathname;
      const isRead =
        pathname.endsWith('/self-service/settings/browser') || pathname.endsWith('/self-service/settings/flows');
      if (isRead && state.flow) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(state.flow),
        });
        return;
      }
      await route.fallback();
    }
  );
}

export const OAUTH_INTERCEPTED_TESTID = 'oauth-intercepted';

/**
 * Fulfills only the native POST to the flow's own action URL
 * (`…/self-service/settings?flow=<id>`) with an inert same-origin page, so a
 * Connect/Disconnect submit is captured deterministically BEFORE any provider
 * contact. The settings-flow init GET and flows?id GET are untouched (they
 * fall through to whichever handler — live Kratos or a read mock — owns them).
 */
export async function interceptOidcRedirect(page: Page): Promise<void> {
  await page.route(
    url => url.pathname.endsWith('/self-service/settings'),
    async route => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        // The body needs REAL content: Playwright's toBeVisible requires a
        // non-empty bounding box, and a completely empty <body> has none —
        // the marker would resolve yet always report "hidden".
        body: `<!doctype html><html><body data-testid="${OAUTH_INTERCEPTED_TESTID}"><main>OAuth redirect intercepted by the test harness.</main></body></html>`,
      });
    }
  );
}

/** The inert page interceptOidcRedirect serves — web-first anchor for "the POST fired". */
export const oauthInterceptedBody = (page: Page) =>
  page.locator(`body[data-testid="${OAUTH_INTERCEPTED_TESTID}"]`);

const PROVIDER_HOST_PATTERN = /(^|\.)(linkedin\.com|github\.com|microsoftonline\.com|live\.com)$/i;

/**
 * Records every request the page makes to a real OAuth provider host, so
 * specs can assert the entire interaction completed with ZERO third-party
 * contact. Arm BEFORE navigation.
 */
export function providerHostCollector(page: Page): string[] {
  const hits: string[] = [];
  page.on('request', request => {
    let host: string;
    try {
      host = new URL(request.url()).hostname;
    } catch {
      return;
    }
    if (PROVIDER_HOST_PATTERN.test(host)) {
      hits.push(request.url());
    }
  });
  return hits;
}

/**
 * Records every Kratos settings-flow request (any of the three endpoints),
 * matched by path suffix so the proxy prefix stays irrelevant. Used as the
 * strongest deterministic form of the owner-only "no flash" assertion: the
 * flow hook is mounted only behind the isOwner gate, so zero requests here
 * proves the section never mounted.
 */
export function settingsFlowRequestCollector(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', request => {
    let pathname: string;
    try {
      pathname = new URL(request.url()).pathname;
    } catch {
      return;
    }
    if (pathname.includes('/self-service/settings')) {
      urls.push(request.url());
    }
  });
  return urls;
}

export const OUTCOME_MARKER_KEY = 'alkemio.connectedAccounts.outcomeMarker';

export type OutcomeMarker = { action: 'link' | 'unlink'; provider: string; ts: number };

/**
 * Reads the sessionStorage outcome marker written synchronously by
 * onProviderActionSubmit just before a row's native form navigates away.
 * Works on the inert intercepted page too — it is served on the same origin
 * (the Kratos public proxy is same-origin on the dev stack), so it shares the
 * app's sessionStorage.
 */
export async function readOutcomeMarker(page: Page): Promise<OutcomeMarker | null> {
  const raw = await page.evaluate(key => sessionStorage.getItem(key), OUTCOME_MARKER_KEY);
  return raw ? (JSON.parse(raw) as OutcomeMarker) : null;
}

/**
 * Seeds a pending outcome marker before app boot (addInitScript), simulating
 * exactly what a real Connect/Disconnect click leaves behind before Kratos's
 * redirect lands back. sessionStorage never travels via storageState, so each
 * test seeds its own context — no cross-test coupling is possible.
 */
export async function seedOutcomeMarker(page: Page, action: 'link' | 'unlink', provider: string): Promise<void> {
  await page.addInitScript(
    ([key, markerAction, markerProvider]) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ action: markerAction, provider: markerProvider, ts: Date.now() })
      );
    },
    [OUTCOME_MARKER_KEY, action, provider] as const
  );
}
