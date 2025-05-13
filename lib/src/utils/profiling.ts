import { LogManager } from '@src/scenario/LogManager';
import { performance } from 'perf_hooks';

export const logElapsedTime = (prefix: string, start: number) => {
  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  const msg = `${prefix}: Execution time: ${elapsed} seconds`;
  LogManager.getLogger().info(msg);
};
