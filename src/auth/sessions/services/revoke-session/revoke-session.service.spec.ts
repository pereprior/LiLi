import { Test, type TestingModule } from '@nestjs/testing';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { RevokeSessionService } from '#src/auth/sessions/services/revoke-session/revoke-session.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

const now = new Date('2026-09-24T12:00:00.000Z');

describe('RevokeSessionService', () => {
  let module: TestingModule;
  let sessionRepository: {
    revokeByTokenHash: ReturnType<
      typeof vi.fn<(tokenHash: string, now: Date) => Promise<void>>
    >;
  };
  let service: RevokeSessionService;

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    sessionRepository = {
      revokeByTokenHash:
        vi.fn<(tokenHash: string, now: Date) => Promise<void>>(),
    } satisfies Pick<SessionRepository, 'revokeByTokenHash'>;

    module = await Test.createTestingModule({
      providers: [
        RevokeSessionService,
        { provide: SessionRepository, useValue: sessionRepository },
      ],
    }).compile();

    service = module.get(RevokeSessionService);
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await module.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('revokes one session using its token hash', async () => {
    await service.execute('token');

    expect(sessionRepository.revokeByTokenHash).toHaveBeenCalledWith(
      AuthSecretsUtils.hash('token'),
      now,
    );
  });

  it('preserves session errors from the repository', async () => {
    const sessionError = new SessionException();
    sessionRepository.revokeByTokenHash.mockRejectedValue(sessionError);

    await expect(service.execute('token')).rejects.toBe(sessionError);
  });

  it('wraps repository failures as session errors', async () => {
    sessionRepository.revokeByTokenHash.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(service.execute('token')).rejects.toBeInstanceOf(
      SessionException,
    );
  });
});
