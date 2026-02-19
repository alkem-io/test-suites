# Configuration Contract: Dependency Changes

**Date**: 2026-02-19
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
| `vitest` | latest | Test runner (replaces jest) |
| `vite-tsconfig-paths` | latest | Resolves TypeScript path aliases from tsconfig.json |
| `@vitest/ui` | latest | Required for the built-in `html` reporter |

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
"types": ["node", "vitest/globals"]
```

## Validation

1. `pnpm install` succeeds without errors
2. No `jest` or `@jest` packages appear in `node_modules` under server-api's dependency tree
3. `vitest --version` resolves from within server-api
4. TypeScript compilation (`tsc --noEmit`) succeeds with `vitest/globals` types
