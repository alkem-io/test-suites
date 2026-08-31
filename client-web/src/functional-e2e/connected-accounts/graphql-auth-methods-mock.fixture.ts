import { Page } from '@playwright/test';

// GraphQL mock for the UserSecurityAuthenticationMethods query
// (client-web src/main/crdPages/topLevelPages/userPages/settings/security/
// UserSecurityAuthenticationMethods.graphql). Only that one operation is
// fulfilled; every other GraphQL operation falls through to the live server,
// so the rest of the page (route context, owner check, profile data) stays
// real. Used to synthesize connected / connected-locked provider states
// without touching any real identity — nothing is mutated anywhere.
//
// `methods` values come from the AuthenticationType enum:
// EMAIL | GITHUB | LINKEDIN | MICROSOFT | CLEVERBASE | PASSKEY | UNKNOWN.

export type AuthMethodsMockState = {
  /** Re-read on EVERY request — mutate to change the served state (never a call counter). */
  methods: string[];
};

export async function mockAuthenticationMethods(page: Page, state: AuthMethodsMockState): Promise<void> {
  await page.route(
    url => url.pathname.endsWith('/api/private/graphql'),
    async route => {
      let operationName: string | undefined;
      try {
        operationName = (route.request().postDataJSON() as { operationName?: string } | null)?.operationName;
      } catch {
        operationName = undefined;
      }
      if (operationName !== 'UserSecurityAuthenticationMethods') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        json: {
          data: {
            me: {
              __typename: 'MeQueryResults',
              user: {
                __typename: 'User',
                id: 'connected-accounts-spec-mock-user',
                authentication: {
                  __typename: 'UserAuthenticationResult',
                  methods: state.methods,
                },
              },
            },
          },
        },
      });
    }
  );
}
