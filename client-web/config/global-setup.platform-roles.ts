import { clearPersonaSessions } from './global-setup';

/**
 * globalSetup for the workspace#027 runner. No registration here — every spec
 * seeds the 14 single-role users itself through `seedPlatformRoleUsers()` —
 * but the cached per-persona sessions of a PREVIOUS run must still go: the
 * authenticated-session fixture adopts any `.auth/persona.*.json` it finds on
 * disk instead of logging in, and relies on globalSetup to keep that reuse
 * run-scoped. Without this, an expired Kratos session from yesterday's run
 * lands every role on the login page with no login attempt made.
 */
export default async function globalSetup() {
  clearPersonaSessions();
}
