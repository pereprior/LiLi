import { Logger } from '@nestjs/common';

import type { LoggerContext } from '@/logging/logger-context.enum.js';

export class AppLogger {
  private readonly logger: Logger;

  constructor(context: LoggerContext) {
    this.logger = new Logger(context);
  }

  log(message: string): void {
    this.logger.log(message);
  }

  error(message: string, error?: Error): void {
    this.logger.error(message, error?.stack);
  }
}
