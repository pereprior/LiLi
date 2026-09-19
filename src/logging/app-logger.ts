import { Logger } from '@nestjs/common';

export class AppLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string): void {
    this.logger.log(message);
  }

  error(message: string, error?: Error): void {
    this.logger.error(message, error?.stack);
  }
}
