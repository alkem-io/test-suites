/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainObject(argument: any): R;
    }
  }
}

export {};
