import { LogManager } from '@alkemio/tests-lib';
import './utils/array.matcher';

beforeAll(() => {
  // This will run before any test is executed in the suite
  const testFileName = expect.getState().testPath || 'Unknown Test Suite';
  LogManager.getLogger().info(`Starting test suite: ${testFileName}`);
});
