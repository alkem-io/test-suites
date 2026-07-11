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
      },
    },
    identities: {
      admin: {
        email: '',
        password: process.env.AUTH_TEST_HARNESS_PASSWORD ?? 'not set',
      },
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
const validateEndpointSchemes = (config: AlkemioTestConfig): void => {
  const isInsecureRemote = (url: string): boolean =>
    /^(http|ws):\/\//i.test(url) &&
    !/^(http|ws):\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);

  const named: Array<[string, string]> = [
    ['ALKEMIO_SERVER (graphql.private)', config.endPoints.graphql.private],
    ['ALKEMIO_BASE_URL (server)', config.endPoints.server],
    ['ALKEMIO_SERVER_WS (ws)', config.endPoints.ws],
    ['ALKEMIO_SERVER_REST (rest)', config.endPoints.rest],
    ['MAIL_SLURPER_ENDPOINT (mailSlurper)', config.endPoints.mailSlurper],
    ['KRATOS_ENDPOINT (kratos.public)', config.endPoints.kratos.public],
    ['KRATOS_PRIVATE_API_URL (kratos.private)', config.endPoints.kratos.private],
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
  const fieldsToMask = ['password'];
  return JSON.stringify(
    config,
    (key, value) => (fieldsToMask.includes(key) ? `**${value.length}**` : value),
    2 // Indentation for pretty output
  );
};
