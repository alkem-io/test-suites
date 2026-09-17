import dotenv from 'dotenv';
import { AlkemioTestConfig } from '../config/alkemio-test-config';

export const createConfigUsingEnvVars = (): AlkemioTestConfig => {
  dotenv.config();

  let registerUsers = true;
  if (process.env.SKIP_USER_REGISTRATION === 'true') {
    registerUsers = false;
  }
  const config: AlkemioTestConfig = {
    registerUsers: registerUsers,
    endPoints: {
      graphql: {
        private:
          process.env.ALKEMIO_SERVER ||
          'http://localhost:3000/api/private/non-interactive/graphql',
      },
      server: process.env.ALKEMIO_BASE_URL ?? 'http://localhost:3000',
      ws: process.env.ALKEMIO_SERVER_WS ?? 'ws://localhost:3000/graphql',
      rest: process.env.ALKEMIO_SERVER_REST ?? 'http://localhost:3000/rest',
      mailSlurper:
        process.env.MAIL_SLURPER_ENDPOINT || 'http://localhost:4437/mail',
      kratos: {
        public: process.env.KRATOS_ENDPOINT ?? 'http://localhost:4434',
        private: process.env.KRATOS_PRIVATE_API_URL ?? 'http://localhost:4434',
        admin: process.env.KRATOS_ADMIN_URL ?? '',
      },
      rabbitMqManagement: {
        url: process.env.RABBITMQ_MANAGEMENT_ENDPOINT ?? 'http://localhost:15672',
        user: process.env.RABBITMQ_MANAGEMENT_USER ?? 'alkemio-admin',
        password: process.env.RABBITMQ_MANAGEMENT_PASSWORD ?? 'alkemio!',
      },
    },
    identities: {
      admin: {
        email: '',
        password: process.env.AUTH_TEST_HARNESS_PASSWORD ?? 'not set',
      },
    },
    redis: {
      // server/quickstart-services.yml publishes `redis` on a docker-assigned
      // random host port (no fixed `host:container` mapping) — resolve it with
      // `docker compose port redis 6379` and set REDIS_PORT, or run a local
      // Redis on the default 6379.
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? '6379'),
    },
    postgres: {
      // Same caveat as `redis` above — `server/quickstart-services.yml`
      // publishes postgres on a random host port; resolve with
      // `docker compose port postgres 5432` and set POSTGRES_PORT.
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? '5432'),
      database: process.env.POSTGRES_DB ?? 'alkemio',
      // `server/.env.docker` provisions every compose-stack database
      // (POSTGRES_MULTIPLE_DATABASES, including `alkemio`) under the same
      // POSTGRES_USER/POSTGRES_PASSWORD pair.
      user: process.env.POSTGRES_USER ?? 'synapse',
      password: process.env.POSTGRES_PASSWORD ?? 'synapse',
    },
    oidc: {
      sessionCookieName: process.env.OIDC_SESSION_COOKIE_NAME ?? 'alkemio_session',
      // Matches `server/alkemio.yml`'s `identity.authentication.providers.oidc.session_signing_key`
      // committed local-dev placeholder default. MUST be overridden with the
      // real SESSION_SIGNING_KEY value for any stack that sets one.
      sessionSigningKey:
        process.env.SESSION_SIGNING_KEY ??
        'placeholder-session-signing-key-change-me',
      webClientId: process.env.ALKEMIO_WEB_CLIENT_ID ?? 'alkemio-web',
      idleTtlS: Number(process.env.OIDC_SESSION_COOKIE_IDLE_TTL_S ?? '1209600'),
      absoluteTtlS: Number(
        process.env.OIDC_SESSION_COOKIE_ABSOLUTE_TTL_S ?? '2592000'
      ),
    },
  };
  validateEndpointSchemes(config);
  return config;
};

/**
 * Fail fast when a REMOTE endpoint is configured over an insecure scheme
 * (`http://` / `ws://`). Every hosted environment (test/dev/…) is served over
 * TLS behind Traefik, which 301-redirects http→https and (for wss) rejects
 * plain ws. A client like supertest that doesn't follow redirects then sees a
 * 301 on every request, which surfaces as a cryptic assertion failure
 * (`expected 301 to deeply equal 200`) rather than an obvious config error —
 * exactly the drift that broke the storage/auth suite (alkem-io/server#6257,
 * `ALKEMIO_SERVER_REST` set to `http://…` instead of `https://…`). Localhost
 * over http/ws is normal for local dev and is exempt.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const validateEndpointSchemes = (config: AlkemioTestConfig): void => {
  // Parse the URL rather than regex the raw string: a string regex both
  // false-rejects valid local forms (`http://localhost?x=1`, `http://[::1]`) and
  // can be fooled by userinfo (`http://localhost@evil.example`). The parsed
  // `hostname` is the real host to compare against the loopback allowlist.
  const isInsecureRemote = (url: string): boolean => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false; // unparseable — not our concern (fails elsewhere with a clearer error)
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'ws:') return false;
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return !LOOPBACK_HOSTS.has(host);
  };

  const named: Array<[string, string]> = [
    ['ALKEMIO_SERVER (graphql.private)', config.endPoints.graphql.private],
    ['ALKEMIO_BASE_URL (server)', config.endPoints.server],
    ['ALKEMIO_SERVER_WS (ws)', config.endPoints.ws],
    ['ALKEMIO_SERVER_REST (rest)', config.endPoints.rest],
    ['MAIL_SLURPER_ENDPOINT (mailSlurper)', config.endPoints.mailSlurper],
    ['KRATOS_ENDPOINT (kratos.public)', config.endPoints.kratos.public],
    ['KRATOS_PRIVATE_API_URL (kratos.private)', config.endPoints.kratos.private],
    [
      'RABBITMQ_MANAGEMENT_ENDPOINT (rabbitMqManagement.url)',
      config.endPoints.rabbitMqManagement.url,
    ],
  ];

  const offenders = named.filter(([, url]) => isInsecureRemote(url));
  if (offenders.length > 0) {
    const detail = offenders.map(([n, url]) => `  - ${n} = ${url}`).join('\n');
    throw new Error(
      `Insecure scheme on remote endpoint(s) — use https:// / wss:// (Traefik 301-redirects http→https, which non-redirect-following clients read as a failing status):\n${detail}`
    );
  }
};

export const stringifyConfig = (config: AlkemioTestConfig): string => {
  // Pattern rather than an exact-name list: `sessionSigningKey` is exactly
  // the material that makes BFF session fabrication (`mint-bff-session.ts`)
  // exploitable if it ever leaked into CI logs / published reports, and an
  // exact-name mask silently misses the next secret-shaped field too.
  const sensitiveKeyPattern = /password|secret|key|token/i;
  return JSON.stringify(
    config,
    (key, value) =>
      sensitiveKeyPattern.test(key) && typeof value === 'string'
        ? `**${value.length}**`
        : value,
    2 // Indentation for pretty output
  );
};
