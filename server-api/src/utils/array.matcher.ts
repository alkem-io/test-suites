/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'vitest';

// Type augmentation for toContainObject is in src/types/vitest-extend.d.ts

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

/**
 * Recursively strips `url` from every object nested under a `profile` key.
 * All entities with a profile (spaces, callouts, posts, whiteboards,
 * innovation flows, calendar events, etc.) have a `profile.url` that is
 * derived from the hierarchy and changes on move/convert operations.
 * Use this when comparing data before and after such operations.
 */
export function stripProfileUrls<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => stripProfileUrls(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (key === 'profile' && value && typeof value === 'object') {
        // Strip url from profile objects, recurse the rest
        result[key] = Object.fromEntries(
          Object.entries(value)
            .filter(([k]) => k !== 'url')
            .map(([k, v]) => [k, stripProfileUrls(v)])
        );
      } else {
        result[key] = stripProfileUrls(value);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Collects all `profile.url` values found anywhere in the object tree.
 * Returns an array of `{ path, url }` entries for assertion.
 */
export function collectProfileUrls(
  obj: unknown,
  path = ''
): Array<{ path: string; url: string }> {
  const urls: Array<{ path: string; url: string }> = [];
  if (obj === null || obj === undefined) return urls;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      urls.push(...collectProfileUrls(item, `${path}[${i}]`));
    });
    return urls;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (
        key === 'profile' &&
        value &&
        typeof value === 'object' &&
        typeof value.url === 'string'
      ) {
        urls.push({ path: `${currentPath}.url`, url: value.url });
      }
      urls.push(...collectProfileUrls(value, currentPath));
    }
  }

  return urls;
}
