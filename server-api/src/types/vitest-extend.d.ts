/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vitest/globals" />

import 'vitest';
declare module 'vitest' {
  interface Matchers<T = any> {
    toContainObject(argument: any): T;
  }
}

export {};
