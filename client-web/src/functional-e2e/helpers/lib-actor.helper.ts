import type { BrowserContext, Page } from '@playwright/test';
import {
  testConfiguration,
  type GraphqlActor,
  type GraphqlReturnWithError,
} from '@alkemio/tests-lib';

/**
 * Unwrap a lib result or fail loudly with the GraphQL errors. The one place
 * a spec turns the lib's `{ data } | { error }` into a value; a set-up or
 * read-back that fails must stop the walk, never carry on with half a
 * fixture.
 */
export function must<T>(result: GraphqlReturnWithError<T>, what: string): T {
  if (result.error || !result.data) {
    throw new Error(
      `${what} failed: ${JSON.stringify(result.error?.errors ?? 'no data')}`
    );
  }
  return result.data;
}

/**
 * The signed-in browser session as a lib actor: the context's cookies for
 * the app origin, sent as one `Cookie` header to the session GraphQL
 * endpoint. A lib function called with it reads and writes exactly what a
 * same-origin `fetch(…, { credentials: 'include' })` inside the page would —
 * the server-side outcome of a UI action, as that user.
 */
export async function sessionActor(
  pageOrContext: Page | BrowserContext
): Promise<GraphqlActor> {
  const context =
    'context' in pageOrContext ? pageOrContext.context() : pageOrContext;
  const cookies = await context.cookies(testConfiguration.endPoints.server);
  return { cookieHeader: cookies.map(c => `${c.name}=${c.value}`).join('; ') };
}
