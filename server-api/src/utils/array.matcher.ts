/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
/* eslint-disable @typescript-eslint/no-namespace */
import { expect } from '@jest/globals';

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainObject(argument: any): R;
    }
  }
}

expect.extend({
  toContainObject(received, argument) {
    const pass = this.equals(
      received,
      expect.arrayContaining([expect.objectContaining(argument)])
    );

    if (pass) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} not to contain object ${this.utils.printExpected(argument)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} to contain object ${this.utils.printExpected(argument)}`,
        pass: false,
      };
    }
  },
});

/**
 * Recursively sorts arrays within an object to ensure consistent ordering for comparisons.
 * Arrays of objects are sorted by 'id', 'name', or first string property.
 * This helps make tests robust against non-deterministic array ordering from APIs.
 */
export function sortArraysInObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Sort the array elements recursively, then sort the array itself
    const sortedElements = obj.map(item => sortArraysInObject(item));
    return sortedElements.sort((a, b) => {
      // Sort by 'id' if present
      if (a?.id && b?.id) {
        return String(a.id).localeCompare(String(b.id));
      }
      // Sort by 'name' if present
      if (a?.name && b?.name) {
        return String(a.name).localeCompare(String(b.name));
      }
      // For primitives or objects without id/name, use string comparison
      return String(a).localeCompare(String(b));
    }) as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = sortArraysInObject((obj as any)[key]);
    }
    return result as T;
  }

  return obj;
}

/**
 * Compares two values after normalizing array order.
 * Use this for comparing API responses where array ordering is non-deterministic.
 */
export function expectEqualIgnoringArrayOrder<T>(actual: T, expected: T): void {
  expect(sortArraysInObject(actual)).toEqual(sortArraysInObject(expected));
}
