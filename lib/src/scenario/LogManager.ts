import winston, { Logger } from 'winston';

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
          level: 'error',
          format: this.logFormat,
        }),
        new winston.transports.File({
          filename: 'server-api-info.log',
          level: 'info',
        }),
        new winston.transports.File({
          filename: 'server-api-warnings.log',
          level: 'warn',
        }),
        new winston.transports.File({
          filename: 'server-api-errors.log',
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
          filename: 'server-api-profile-info.log',
          level: 'silly',
        }),
      ],
    });
  }
}
