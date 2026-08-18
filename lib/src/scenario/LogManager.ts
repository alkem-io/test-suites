import winston, { Logger } from 'winston';

// Parallel-era forensics: when vitest runs with more than one worker, each
// worker gets its own log files instead of interleaving un-attributable
// lines into one shared file. `VITEST_POOL_ID` is set by vitest's `threads`
// pool for every worker (including the sole worker at maxWorkers 1, where
// this is a harmless no-op filename suffix — no workflow or script consumes
// these filenames by name).
const workerSuffix = process.env.VITEST_POOL_ID
  ? `.w${process.env.VITEST_POOL_ID}`
  : '';

// Note: putting the logger in a static class to enable more flexibility later
export class LogManager {
  private static logger: Logger | undefined;
  private static logFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  );

  public static getLogger() {
    if (this.logger === undefined) {
      this.logger = this.createLogger();
    }

    return this.logger;
  }

  private static createLogger() {
    return winston.createLogger({
      transports: [
        new winston.transports.Console({
          level: process.env.LOG_LEVEL ?? 'error',
          format: this.logFormat,
        }),
        new winston.transports.File({
          filename: `server-api-info${workerSuffix}.log`,
          level: 'info',
        }),
        new winston.transports.File({
          filename: `server-api-warnings${workerSuffix}.log`,
          level: 'warn',
        }),
        new winston.transports.File({
          filename: `server-api-errors${workerSuffix}.log`,
          level: 'error',
        }),
      ],
    });
  }

  private static createProfiler() {
    return winston.createLogger({
      transports: [
        new winston.transports.Console({
          level: 'info',
          format: this.logFormat,
        }),
        new winston.transports.File({
          filename: `server-api-profile-info${workerSuffix}.log`,
          level: 'silly',
        }),
      ],
    });
  }
}
