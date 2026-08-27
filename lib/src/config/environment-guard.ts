import { AlkemioTestConfig } from './alkemio-test-config';

/**
 * Fail-fast guard against provisioning test identities anywhere but a
 * throwaway environment.
 *
 * The harness has two ways to seed identities: self-service registration
 * (needs MailSlurper, so it already fails loudly against a real mail
 * client) and the Kratos ADMIN API (no mail, no verification — it upserts
 * identities on whatever host it can reach). CI reaches the admin API via a
 * `KRATOS_ADMIN_URL` port-forward, and the pool it provisions now grants
 * platform roles, including GLOBAL_ADMIN, to every worker-scoped identity
 * using a bootstrap-privileged token. A misconfigured endpoint pointed at a
 * real environment would upsert privileged accounts there with no
 * self-service safeguard in the way.
 *
 * This is an allowlist, not a denylist: an endpoint is approved only when
 * its host is positively recognised as a throwaway target (loopback, or the
 * `test-alkem.io` / `dev-alkem.io` families these suites are documented to
 * run against — see `server-api/.env.default` and
 * `.github/workflows/nightly-build-trigger.yml`). Anything else — including
 * an unparseable URL — is rejected. Call this before any provisioning,
 * registration, minting, or role-granting step.
 */

const OPT_OUT_ENV_VAR = 'ALLOW_UNAPPROVED_TEST_TARGET';
// Deliberately not a boolean-ish value ('true', '1', 'yes') — this has to
// read as an explicit, considered act, never something set by habit or by
// copying an unrelated "enable everything" env block.
const OPT_OUT_VALUE = 'yes-i-understand';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

// Host-family suffixes these suites are documented to run against outside
// localhost. Derived from server-api/.env.default and lib/.env.default's TEST
// (test-alkem.io) and DEV (dev-alkem.io) blocks, and from
// .github/workflows/nightly-build-trigger.yml, whose only environment the
// nightly job deploys to and targets is that same Hetzner "test cluster".
// Deliberately excludes acc-alkem.io (acceptance, seen in
// load-testing/stress-test.ts) and bare alkem.io (production) — neither is a
// throwaway identity target for this harness.
const APPROVED_HOST_SUFFIXES = ['test-alkem.io', 'dev-alkem.io'];

const isApprovedHost = (hostname: string): boolean => {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (LOOPBACK_HOSTS.has(host)) return true;
  return APPROVED_HOST_SUFFIXES.some(
    suffix => host === suffix || host.endsWith(`.${suffix}`)
  );
};

interface EndpointCheck {
  name: string;
  envVar: string;
  url: string;
}

interface RejectedEndpoint extends EndpointCheck {
  host: string;
  reason: string;
}

const resolveChecks = (config: AlkemioTestConfig): EndpointCheck[] => {
  const checks: EndpointCheck[] = [
    {
      name: 'GraphQL API',
      envVar: 'ALKEMIO_SERVER',
      url: config.endPoints.graphql.private,
    },
    {
      name: 'Server base URL',
      envVar: 'ALKEMIO_BASE_URL',
      url: config.endPoints.server,
    },
    {
      name: 'WebSocket endpoint',
      envVar: 'ALKEMIO_SERVER_WS',
      url: config.endPoints.ws,
    },
    {
      name: 'REST endpoint',
      envVar: 'ALKEMIO_SERVER_REST',
      url: config.endPoints.rest,
    },
    {
      name: 'MailSlurper endpoint',
      envVar: 'MAIL_SLURPER_ENDPOINT',
      url: config.endPoints.mailSlurper,
    },
    {
      name: 'Kratos public endpoint',
      envVar: 'KRATOS_ENDPOINT',
      url: config.endPoints.kratos.public,
    },
    {
      name: 'Kratos private endpoint',
      envVar: 'KRATOS_PRIVATE_API_URL',
      url: config.endPoints.kratos.private,
    },
  ];

  // Only validated when actually configured — empty means "admin API not
  // used" (local dev falls back to self-service registration), not "unset
  // and therefore unchecked-but-dangerous".
  if (config.endPoints.kratos.admin) {
    checks.push({
      name: 'Kratos ADMIN endpoint',
      envVar: 'KRATOS_ADMIN_URL',
      url: config.endPoints.kratos.admin,
    });
  }

  return checks;
};

const rejectionFor = (check: EndpointCheck): RejectedEndpoint | undefined => {
  let hostname: string;
  try {
    hostname = new URL(check.url).hostname;
  } catch {
    return { ...check, host: '(unparseable)', reason: 'the URL could not be parsed' };
  }
  if (!hostname) {
    return { ...check, host: '(empty)', reason: 'no host could be extracted' };
  }
  if (!isApprovedHost(hostname)) {
    return { ...check, host: hostname, reason: 'host is not on the approved list' };
  }
  return undefined;
};

const APPROVED_LIST_TEXT = [
  'localhost / 127.0.0.1 / 0.0.0.0 / ::1',
  ...APPROVED_HOST_SUFFIXES.map(suffix => `*.${suffix} (and ${suffix} itself)`),
].join(', ');

/**
 * Throws if any configured endpoint targets a host that is not positively
 * approved as a throwaway test environment. Never logs full URLs or
 * secrets — only hostnames.
 */
export const assertApprovedTestTarget = (config: AlkemioTestConfig): void => {
  const rejected = resolveChecks(config)
    .map(rejectionFor)
    .filter((r): r is RejectedEndpoint => r !== undefined);

  if (rejected.length === 0) {
    console.log(
      `[env-guard] target approved — all configured endpoints resolve to an approved throwaway host.`
    );
    return;
  }

  const rejectedLines = rejected
    .map(r => `  - ${r.name} (${r.envVar}) -> host "${r.host}" (${r.reason})`)
    .join('\n');

  if (process.env[OPT_OUT_ENV_VAR] === OPT_OUT_VALUE) {
    console.warn(
      `\n[env-guard] *** ${OPT_OUT_ENV_VAR}=${OPT_OUT_VALUE} is set — BYPASSING the throwaway-environment check. ***\n` +
        `[env-guard] Proceeding to provision/register/mint test identities against the following unapproved endpoint(s):\n${rejectedLines}\n` +
        `[env-guard] This was a deliberate override. If you did not intend it, unset ${OPT_OUT_ENV_VAR} and re-run.\n`
    );
    return;
  }

  throw new Error(
    `\n[env-guard] Refusing to provision test identities: the target environment is not on the approved throwaway list.\n\n` +
      `Rejected endpoint(s):\n${rejectedLines}\n\n` +
      `Approved hosts: ${APPROVED_LIST_TEXT}\n\n` +
      `If this is a genuine, deliberately-provisioned new test/dev environment, opt in explicitly by setting\n` +
      `  ${OPT_OUT_ENV_VAR}=${OPT_OUT_VALUE}\n` +
      `in the run's own environment (never commit it, never set it as a default). This variable is named awkwardly ` +
      `on purpose — it must never be set casually.\n`
  );
};
