import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppLogger } from '#src/logging/app-logger.js';

describe('AppLogger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('forwards application messages to the Nest logger', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    new AppLogger('Auth').log('Started');

    expect(log).toHaveBeenCalledWith('Started');
  });
});
