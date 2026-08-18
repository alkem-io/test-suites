import type { SerializedTestUserModels } from '@alkemio/tests-lib';

// Types the `globalSetup` -> worker hand-off: `provide()` in
// globalTestsSetup.ts and `inject()` in setupTests.ts both go through this
// key, so a rename on either side is a compile error instead of a silent
// runtime `undefined`.
declare module 'vitest' {
  interface ProvidedContext {
    alkemioUserModels: SerializedTestUserModels;
  }
}
