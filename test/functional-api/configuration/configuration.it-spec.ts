/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import {} from '@test/functional-api/user-management/user.request.params';
import { fullConfiguration } from './configuration.request.params';

describe('Platform configuration', () => {
  describe('Platform configuration can be loaded and defaults are OK', () => {
    // Arrange
    test.only('Full configuration defaults to be same as the one on alkemio.yml. ', async () => {
      // Act
      const res = await fullConfiguration();

      // Assert
      expect(res?.data?.platform.configuration).toStrictEqual({
        apm: {
          endpoint: '',
          rumEnabled: false,
        },
        geo: {
          endpoint: 'http://localhost:3000/api/public/rest/geo',
        },
        locations: {
          about: 'https://alkemio.org/about/',
          aup: 'https://www.alkemio.org/legal/hub/#aup',
          blog: 'https://welcome.alkem.io/blog/',
          community: 'https://alkemio.org/support/',
          contactsupport: 'https://welcome.alkem.io/contact/',
          domain: 'localhost',
          environment: 'local',
          feedback: 'https://alkemio.org/contact/',
          forumreleases: 'https://alkem.io/forum/releases/latest',
          foundation: 'https://alkemio.org/',
          help: 'https://alkemio.org/help/',
          impact: 'https://alkemio.org/manifesto',
          innovationLibrary: 'https://www.alkemio.org/help/innovation-library',
          inspiration: 'https://alkemio.org/help/collaboration-tools/',
          landing: 'https://welcome.alkem.io/',
          newuser: 'https://alkemio.org/help/',
          opensource: 'https://github.com/alkem-io',
          privacy: 'https://alkemio.org/privacy/',
          releases: 'https://alkemio.org/releases',
          security: 'https://alkemio.org/security/',
          support: 'https://welcome.alkem.io/contact/',
          switchplan: 'https://welcome.alkem.io/pricing-own-space/',
          terms: 'https://welcome.alkem.io/legal/#tc',
          tips: 'https://alkemio.org/post/',
        },
        sentry: {
          enabled: false,
          endpoint: '',
          submitPII: false,
        },
        storage: {
          file: {
            maxFileSize: 1048576,
          },
        },
        featureFlags: [
          {
            enabled: false,
            name: 'SSI',
          },
          {
            enabled: true,
            name: 'COMMUNICATIONS',
          },
          {
            enabled: true,
            name: 'COMMUNICATIONS_DISCUSSIONS',
          },
          {
            enabled: true,
            name: 'SUBSCRIPTIONS',
          },
          {
            enabled: true,
            name: 'NOTIFICATIONS',
          },
          {
            enabled: true,
            name: 'WHITEBOARDS',
          },
          {
            enabled: false,
            name: 'LANDING_PAGE',
          },
          {
            enabled: true,
            name: 'GUIDENCE_ENGINE',
          },
        ],
        authentication: {
          providers: [
            {
              config: {
                issuer: 'http://alkemio-server-dev/',
                kratosPublicBaseURL: 'http://localhost:3000/ory/kratos/public',
                __typename: 'OryConfig',
              },
              enabled: true,
              icon: '',
              label: 'Ory Kratos Config',
              name: 'Ory Kratos Config',
            },
          ],
        },
      });
    });
  });
});
