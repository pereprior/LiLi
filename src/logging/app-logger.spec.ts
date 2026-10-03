import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppLogger } from '#src/logging/app-logger.js';

describe('AppLogger', () => {
  afterEach(() => vi.restoreAllMocks());

  describe('log', () => {
    it('forwards an application message to the Nest logger', () => {
      const log = vi.spyOn(Logger.prototype, 'log');
      const logger = new AppLogger('Auth');

      logger.log('Started');

      expect(log).toHaveBeenCalledExactlyOnceWith('Started');
    });
  });

  describe('error', () => {
    it('forwards an error message and its stack to the Nest logger', () => {
      const logError = vi.spyOn(Logger.prototype, 'error');
      const logger = new AppLogger('Auth');
      const failure = new Error('Unexpected failure');

      logger.error('Failed', failure);

      expect(logError).toHaveBeenCalledExactlyOnceWith('Failed', failure.stack);
    });

    it('forwards an error message when no error object is provided', () => {
      const logError = vi.spyOn(Logger.prototype, 'error');
      const logger = new AppLogger('Auth');

      logger.error('Failed');

      expect(logError).toHaveBeenCalledExactlyOnceWith('Failed', undefined);
    });
  });
});
