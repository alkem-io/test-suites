import {} from '@functional-api/contributor-management/user/user.request.params';
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
          endpoint: '0',
          rumEnabled: false,
        },
        geo: {
          endpoint: 'http://localhost:3000/api/public/rest/geo',
        },
        locations: {
          about: 'https://welcome.alkem.io',
          aup: 'https://welcome.alkem.io/legal/terms',
          blog: 'https://blog.alkem.io/',
          community: 'https://alkem.io/forum/',
          contactsupport: 'https://welcome.alkem.io/contact/',
          domain: 'localhost',
          environment: 'local',
          feedback: 'https://welcome.alkem.io/contact/',
          forumreleases: 'https://alkem.io/forum/releases/latest',
          foundation: 'https://alkemio.org/',
          help: 'https://alkem.io/docs/',
          impact: 'https://alkemio.org',
          innovationLibrary: 'https://alkem.io/innovation-library',
          inspiration: 'https://welcome.alkem.io/resources/',
          landing: 'https://welcome.alkem.io/',
          newuser: 'https://welcome.alkem.io/contact/',
          opensource: 'https://github.com/alkem-io/',
          privacy: 'https://welcome.alkem.io/legal/privacy',
          releases: 'https://alkem.io/forum/releases/',
          security: 'https://welcome.alkem.io/legal/security',
          support: 'https://welcome.alkem.io/contact/',
          switchplan: 'https://welcome.alkem.io/pricing/',
          terms: 'https://welcome.alkem.io/legal/terms/',
          tips: 'https://welcome.alkem.io/contact/',
        },
        sentry: {
          enabled: false,
          endpoint: '0',
          submitPII: false,
        },
        storage: {
          file: {
            maxFileSize: 20971520,
          },
        },
        featureFlags: [
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
            enabled: true,
            name: 'MEMO',
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
