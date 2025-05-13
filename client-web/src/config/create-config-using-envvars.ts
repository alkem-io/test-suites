import dotenv from 'dotenv';
import { AlkemioTestConfig } from '@src/config/alkemio-test-config';

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
  return config;
};

export const stringifyConfig = (config: AlkemioTestConfig): string => {
  const fieldsToMask = ['password'];
  return JSON.stringify(
    config,
    (key, value) => (fieldsToMask.includes(key) ? `**${value.length}**` : value),
    2 // Indentation for pretty output
  );
};
