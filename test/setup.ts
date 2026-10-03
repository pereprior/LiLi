import { ConsoleLogger } from '@nestjs/common';
import { beforeEach, vi } from 'vitest';

function silenceNestLogs(): void {
  for (const method of [
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
    'fatal',
  ] as const) {
    vi.spyOn(ConsoleLogger.prototype, method).mockImplementation(() => {});
  }
}

silenceNestLogs();
beforeEach(silenceNestLogs);
