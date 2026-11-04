# Configuration Contract: Dependency Changes

**Date**: 2026-02-19
**Updated**: 2026-02-20 (reflects resolved versions and actual tsconfig approach)
**Feature**: 002-jest-to-vitest

## Purpose

Defines the exact dependency additions and removals for `server-api/package.json`.

## Remove from devDependencies

| Package | Current Version | Reason |
|---|---|---|
| `@types/jest` | ^29.5.14 | Replaced by Vitest's built-in types (`vitest/globals`) |
| `ts-jest` | ^29.2.5 | Replaced by Vitest's native TypeScript support |
| `jest-html-reporters` | ^3.1.7 | Replaced by Vitest's built-in `html` reporter + `@vitest/ui` |
| `tsconfig-paths` | ^4.2.0 | Replaced by `vite-tsconfig-paths` plugin |

## Add to devDependencies

| Package | Version | Reason |
|---|---|---|
| `vitest` | ^4.0.18 | Test runner (replaces jest) |
| `vite-tsconfig-paths` | ^6.1.1 | Resolves TypeScript path aliases from tsconfig.json |
| `@vitest/ui` | ^4.0.18 | Required for the built-in `html` reporter and `test:nightly:ui` script |

## Keep Unchanged

### Production dependencies (no changes)
- `@alkemio/client-lib`, `@alkemio/tests-lib`, `@ory/kratos-client`, `axios`, `graphql`, `ws`

### Dev dependencies (no changes)
- `@eslint/js`, `@graphql-codegen/*`, `@types/node`, `cross-env`, `eslint`, `globals`, `graphql-request`, `prettier`, `rimraf`, `tsx`, `typescript`, `typescript-eslint`

## tsconfig.json Change

```json
// Before:
"types": ["node", "jest"]

// After:
"types": ["node"]
```

**Note**: The original plan specified `"types": ["node", "vitest/globals"]`, but the actual implementation uses `"types": ["node"]` only. Vitest global types are resolved via the existing `typeRoots` mechanism:
- `tsconfig.json` has `"typeRoots": ["./node_modules/@types", "../node_modules/@types", "./src/types"]`
- `src/types/vitest-extend.d.ts` contains `/// <reference types="vitest/globals" />`
- This approach works correctly with the custom `typeRoots` configuration and avoids conflicts

## Validation

1. `pnpm install` succeeds without errors
2. No `jest` or `@jest` packages appear in `node_modules` under server-api's dependency tree
3. `vitest --version` resolves from within server-api
4. TypeScript compilation (`tsc --noEmit`) succeeds with Vitest global types (resolved via typeRoots)
