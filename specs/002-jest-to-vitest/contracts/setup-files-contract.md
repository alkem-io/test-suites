# Configuration Contract: Setup Files

**Date**: 2026-02-19
**Updated**: 2026-02-20 (reflects actual implementation)
**Feature**: 002-jest-to-vitest

## Purpose

Defines the expected structure and behavior of the three setup files after migration.

## Contract: globalTestsSetup.ts

**Role**: Runs once before all test files. Registers test users in Kratos and Alkemio.

**Before (Jest)**:
```typescript
require('tsconfig-paths/register');
import { ... } from '@alkemio/tests-lib';
module.exports = async () => { /* registration logic */ };
```

**After (Vitest)**:
```typescript
import { ... } from '@alkemio/tests-lib';
export default async function setup() { /* registration logic unchanged */ }
```

**Changes**:
- Remove `require('tsconfig-paths/register')` — path resolution handled by `vite-tsconfig-paths` plugin
- Replace `module.exports = async () =>` with `export default async function setup()`
- All registration logic inside the function body remains unchanged

**Validation**: Test users (all TestUser enum values except GLOBAL_ADMIN) are registered and verified before any test files execute.

## Contract: setupTests.ts

**Role**: Runs before each test file. Installs WebSocket polyfill.

**Before (Jest)**:
```typescript
(global as any).WebSocket = require('ws');
```

**After (Vitest)**:
```typescript
import WebSocket from 'ws';
(globalThis as any).WebSocket = WebSocket;
```

**Changes**:
- Replace CJS `require('ws')` with ESM `import WebSocket from 'ws'`
- Replace `global` with `globalThis` (standard)
- Remove eslint-disable comments for `@typescript-eslint/no-require-imports` (no longer needed)

**Validation**: `globalThis.WebSocket` is defined and functional during all test executions.

## Contract: vitest.setup.ts (renamed from jest.setup.ts)

**Role**: Runs after framework initialization. Registers custom matchers and logs test suite names.

**Before (Jest)**:
```typescript
import { LogManager } from '@alkemio/tests-lib';
import './utils/array.matcher';

beforeAll(() => {
  const testFileName = expect.getState().testPath || 'Unknown Test Suite';
  LogManager.getLogger().info(`Starting test suite: ${testFileName}`);
});
```

**After (Vitest)**:
```typescript
import { LogManager } from '@alkemio/tests-lib';
import './utils/array.matcher';

beforeAll(() => {
  const testFileName = expect.getState().testPath || 'Unknown Test Suite';
  LogManager.getLogger().info(`Starting test suite: ${testFileName}`);
});
```

**Changes**: Rename file from `jest.setup.ts` to `vitest.setup.ts`. Logic is identical — `expect.getState().testPath` works in Vitest v3+ `beforeAll` hooks.

**Validation**: Each test suite logs its file path before execution.

## Contract: array.matcher.ts

**Role**: Defines custom `toContainObject` matcher and utility functions.

**Before (Jest)**:
```typescript
import { expect } from '@jest/globals';
declare global { namespace jest { interface Matchers<R> { toContainObject(argument: any): R; } } }
expect.extend({ toContainObject(received, argument) { /* ... */ } });
```

**After (Vitest)**:
```typescript
import { expect } from 'vitest';
declare module 'vitest' { interface Matchers<T = any> { toContainObject(argument: any): T; } }
expect.extend({ toContainObject(received, argument) { /* ... */ } });
```

**Changes**:
- Replace `import { expect } from '@jest/globals'` with `import { expect } from 'vitest'`
- Replace `jest` namespace declaration with `vitest` module augmentation
- Matcher implementation body is unchanged — `this.equals()`, `this.utils.printReceived()`, `this.utils.printExpected()` are API-compatible

**Validation**: `expect([{id: 1}]).toContainObject({id: 1})` passes; `expect([{id: 1}]).toContainObject({id: 2})` fails with a descriptive message.

## Contract: jest-extend.d.ts → vitest-extend.d.ts

**Role**: TypeScript type declarations for custom matchers.

**Before (Jest)**:
```typescript
declare global { namespace jest { interface Matchers<R> { toContainObject(argument: any): R; } } }
export {};
```

**After (Vitest)**:
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vitest/globals" />

import 'vitest';
declare module 'vitest' {
  interface Matchers<T = any> {
    toContainObject(argument: any): T;
  }
}

export {};
```

**Changes**:
- Replace Jest namespace with Vitest module augmentation
- Add `/// <reference types="vitest/globals" />` — this is the mechanism that provides global Vitest types (`describe`, `it`, `expect`, etc.) via the `typeRoots` configuration in `tsconfig.json`, since the types array uses `["node"]` only (not `["node", "vitest/globals"]`)
- Retain `eslint-disable` for `@typescript-eslint/no-explicit-any` (needed for the `any` type parameter)
