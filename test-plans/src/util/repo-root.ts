import path from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Walk up from `start` until we find the directory containing `pnpm-workspace.yaml`.
 * Returns `start` if no workspace root is found (caller can still run, just with
 * unresolved globs).
 */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = path.resolve(start);
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(start);
}
