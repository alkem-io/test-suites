/**
 * globalSetup tears down only the groups whose `build()` RETURNED. A build that
 * throws half-way would strand whatever it had already created, so a build
 * registers how to undo each step as it goes; on failure the steps are undone
 * newest-first and the original error is re-thrown.
 */
export type Undo = (step: () => Promise<unknown>) => void;

export const undoOnFailure = async <T>(
  build: (undo: Undo) => Promise<T>
): Promise<T> => {
  const steps: (() => Promise<unknown>)[] = [];
  try {
    return await build(step => steps.push(step));
  } catch (buildError) {
    for (const step of steps.reverse()) {
      try {
        await step();
      } catch (undoError) {
        console.error(
          `[platform-roles setup] undo failed, residue left: ${(undoError as Error).message}`
        );
      }
    }
    throw buildError;
  }
};
