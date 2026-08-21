/**
 * SHARED console guard for BOTH 024-classifications suites (adjudicated
 * cross-cutting decision #1). Read-only code sharing — the module holds no
 * mutable state, so the suites' disjoint-mutable-state rule is untouched.
 *
 * Ownership: the space-lifecycle implementer owns this file (like the
 * classifications playwright config); the templates-library suite IMPORTS
 * from here but never edits it.
 *
 * Contract:
 * - `attachConsoleGuard(page)` collects BOTH console.error messages AND
 *   uncaught page exceptions (`pageerror`) — an uncaught exception on a
 *   classification surface must fail the test, not pass silently.
 * - `assertConsoleClean(guard, label)` fails only on entries that reference
 *   classification surfaces or GraphQL (never a blanket "no console errors"
 *   flake factory), after filtering the shared noise allowlist and any
 *   per-test `guard.allow` additions (e.g. intentionally provoked duplicate
 *   conflicts in SL-02/SL-06).
 */

import { expect, type Page } from '@playwright/test';

export interface ConsoleGuard {
  errors: string[];
  /** Per-test additions for errors a scenario intentionally provokes
   *  (e.g. the duplicate-guard conflict responses in SL-02/SL-06). */
  allow: RegExp[];
}

/**
 * Noise that must never fail a test — the UNION of both suites' previous
 * allowlists so the guard behaves identically everywhere:
 * vite/HMR/websocket/favicon/asset chatter, plus React dev-mode
 * hydration/nesting complaints and DevTools promos the app under test emits
 * on every surface (legacy-DOM noise, not 024 regressions).
 */
export const GUARD_NOISE: RegExp[] = [
  /favicon/i,
  /vite|\[hmr\]|\[hot\]|hot update|websocket|ws:\/\/|sockjs/i,
  /manifest/i,
  /service.?worker/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /hydration|cannot be a descendant|cannot contain a nested/i,
  /React DevTools|Download the React DevTools/i,
];

/** Only errors that reference classification surfaces or GraphQL fail a test. */
export const GUARD_RELEVANT: RegExp[] = [/classif/i, /graphql/i, /apollo/i];

export function attachConsoleGuard(page: Page): ConsoleGuard {
  const guard: ConsoleGuard = { errors: [], allow: [] };
  page.on('console', message => {
    if (message.type() !== 'error') return;
    guard.errors.push(
      `[console.error] ${message.text()} @ ${message.location().url}`
    );
  });
  page.on('pageerror', error => {
    guard.errors.push(`[pageerror] ${error.message}`);
  });
  return guard;
}

export function assertConsoleClean(guard: ConsoleGuard, label: string) {
  const offenders = guard.errors
    // Uncaught page exceptions are ALWAYS relevant (still subject to noise /
    // per-test allow below) — a crash is a defect even when its message never
    // mentions classification/GraphQL. Matches the documented contract above.
    .filter(
      entry =>
        entry.startsWith('[pageerror]') ||
        GUARD_RELEVANT.some(pattern => pattern.test(entry))
    )
    .filter(entry => !GUARD_NOISE.some(pattern => pattern.test(entry)))
    .filter(entry => !guard.allow.some(pattern => pattern.test(entry)));
  expect(
    offenders,
    `console guard (${label}): classification/GraphQL console errors detected`
  ).toEqual([]);
}
