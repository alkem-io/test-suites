/**
 * Unit coverage for the fail-fast environment guard, run directly with
 * Node's built-in test runner via tsx (no vitest config exists for `lib/`
 * itself — server-api/client-web are the only packages with a test runner
 * wired up). Invoke with:
 *
 *   node --import tsx --test src/config/__tests__/environment-guard.spec.ts
 *
 * from the `lib/` package directory. Named `*.spec.ts`, not `*.test.ts`, so
 * `tsconfig.prod.json`'s existing `**\/*spec.ts` exclude keeps it out of the
 * published `dist/`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AlkemioTestConfig } from '../alkemio-test-config';
import { assertApprovedTestTarget } from '../environment-guard';

const OPT_OUT_ENV_VAR = 'ALLOW_UNAPPROVED_TEST_TARGET';

// Builds a full config with every endpoint pointed at one base host by
// default, so a single override argument controls exactly what a test cares
// about without repeating the whole shape everywhere.
const buildConfig = (
  overrides: Partial<{
    graphql: string;
    server: string;
    ws: string;
    rest: string;
    mailSlurper: string;
    kratosPublic: string;
    kratosPrivate: string;
    kratosAdmin: string;
  }> = {}
): AlkemioTestConfig => ({
  registerUsers: true,
  endPoints: {
    graphql: { private: overrides.graphql ?? 'http://localhost:3000/graphql' },
    server: overrides.server ?? 'http://localhost:3000',
    ws: overrides.ws ?? 'ws://localhost:3000/graphql',
    rest: overrides.rest ?? 'http://localhost:3000/rest',
    mailSlurper: overrides.mailSlurper ?? 'http://localhost:4437/mail',
    kratos: {
      public: overrides.kratosPublic ?? 'http://localhost:4433',
      private: overrides.kratosPrivate ?? 'http://localhost:4434',
      admin: overrides.kratosAdmin ?? '',
    },
    rabbitMqManagement: {
      url: 'http://localhost:15672',
      user: 'alkemio-admin',
      password: 'change_me',
    },
  },
  identities: { admin: { email: '', password: 'not set' } },
});

// Every test runs with a clean slate for the opt-out var, restored after —
// a leaked value from one test could silently defeat the very next
// "unrecognised host aborts" assertion.
const withoutOptOut = <T>(fn: () => T): T => {
  const saved = process.env[OPT_OUT_ENV_VAR];
  delete process.env[OPT_OUT_ENV_VAR];
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env[OPT_OUT_ENV_VAR];
    else process.env[OPT_OUT_ENV_VAR] = saved;
  }
};

test('approved host (localhost) passes silently — does not throw', () => {
  withoutOptOut(() => {
    assert.doesNotThrow(() => assertApprovedTestTarget(buildConfig()));
  });
});

test('approved host (test-alkem.io family) passes', () => {
  withoutOptOut(() => {
    const config = buildConfig({
      graphql: 'https://test-alkem.io/api/private/non-interactive/graphql',
      server: 'https://test-alkem.io',
      ws: 'wss://test-alkem.io/graphql',
      rest: 'https://test-alkem.io/api/private/rest',
      mailSlurper: 'https://test-alkem.io/mailslurper-api/mail',
      kratosPublic: 'https://identity.test-alkem.io/ory/kratos/public',
      kratosPrivate: 'https://identity.test-alkem.io/ory/kratos/public',
    });
    assert.doesNotThrow(() => assertApprovedTestTarget(config));
  });
});

test('unrecognised host aborts the run', () => {
  withoutOptOut(() => {
    const config = buildConfig({ graphql: 'https://alkem.io/api/private/non-interactive/graphql' });
    assert.throws(() => assertApprovedTestTarget(config), /not on the approved throwaway list/);
  });
});

test('approved GraphQL endpoint with an unapproved Kratos admin endpoint aborts, naming the Kratos endpoint', () => {
  withoutOptOut(() => {
    const config = buildConfig({
      kratosAdmin: 'https://identity.production-lookalike.io/admin',
    });
    assert.throws(() => assertApprovedTestTarget(config), (err: Error) => {
      assert.match(err.message, /Kratos ADMIN endpoint/);
      assert.match(err.message, /identity\.production-lookalike\.io/);
      // The approved GraphQL endpoint must NOT be listed as a rejection.
      assert.doesNotMatch(err.message, /GraphQL API \(ALKEMIO_SERVER\) -> host/);
      return true;
    });
  });
});

test('the opt-out permits an unapproved target and logs loudly', () => {
  const saved = process.env[OPT_OUT_ENV_VAR];
  process.env[OPT_OUT_ENV_VAR] = 'yes-i-understand';
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };
  try {
    const config = buildConfig({ graphql: 'https://alkem.io/api/private/non-interactive/graphql' });
    assert.doesNotThrow(() => assertApprovedTestTarget(config));
    assert.ok(
      warnings.some(line => line.includes('BYPASSING')),
      'expected a loud bypass warning to be logged'
    );
  } finally {
    console.warn = originalWarn;
    if (saved === undefined) delete process.env[OPT_OUT_ENV_VAR];
    else process.env[OPT_OUT_ENV_VAR] = saved;
  }
});

test('an incorrect opt-out value (not the exact sentinel) still aborts', () => {
  const saved = process.env[OPT_OUT_ENV_VAR];
  process.env[OPT_OUT_ENV_VAR] = 'true';
  try {
    const config = buildConfig({ graphql: 'https://alkem.io/api/private/non-interactive/graphql' });
    assert.throws(() => assertApprovedTestTarget(config), /not on the approved throwaway list/);
  } finally {
    if (saved === undefined) delete process.env[OPT_OUT_ENV_VAR];
    else process.env[OPT_OUT_ENV_VAR] = saved;
  }
});

test('a malformed endpoint URL fails closed rather than passing', () => {
  withoutOptOut(() => {
    const config = buildConfig({ graphql: 'not-a-valid-url' });
    assert.throws(() => assertApprovedTestTarget(config), /not on the approved throwaway list/);
  });
});

test('an absent (empty string) endpoint URL fails closed rather than passing', () => {
  withoutOptOut(() => {
    const config = buildConfig({ graphql: '' });
    assert.throws(() => assertApprovedTestTarget(config), /not on the approved throwaway list/);
  });
});

test('an unset Kratos admin endpoint (empty string) is not checked at all', () => {
  withoutOptOut(() => {
    // kratosAdmin defaults to '' in buildConfig — local dev shape, admin API
    // unused. Must pass, and must not mention Kratos ADMIN in any output.
    assert.doesNotThrow(() => assertApprovedTestTarget(buildConfig()));
  });
});
