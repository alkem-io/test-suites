// Session-based auth for the 029 language-offer walks.
//
// Authentication happens ONCE per persona in `auth.setup.ts` (a Playwright
// `setup` project the browser project depends on) and is persisted as storage
// state under `client-web/.auth/`. Specs consume it declaratively with
//   test.use({ storageState: ADMIN_STATE })
// so every test still gets its OWN isolated context — which the anonymous
// specs need (fresh cookie jar per test) and the per-file `locale` override
// requires. That rules out `fixtures/authenticated-session.fixture.ts`, which
// shares a single context/page across a file.

import path from 'path';

export const ADMIN_EMAIL = 'admin@alkem.io';
/** Seeded user with no space memberships — used for the account-level language walks. */
export const MEMBER_EMAIL = 'non.space@alkem.io';

const AUTH_DIR = path.resolve(__dirname, '..', '..', '..', '.auth');

export const ADMIN_STATE = path.join(AUTH_DIR, 'language-offer-admin.json');
export const MEMBER_STATE = path.join(AUTH_DIR, 'language-offer-member.json');
