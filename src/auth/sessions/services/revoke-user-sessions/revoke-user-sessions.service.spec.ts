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

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { RevokeUserSessionsService } from '#src/auth/sessions/services/revoke-user-sessions/revoke-user-sessions.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

const now = new Date('2026-09-24T12:00:00.000Z');

describe('RevokeUserSessionsService', () => {
  let module: TestingModule;
  let sessionRepository: {
    revokeByUserUuid: ReturnType<
      typeof vi.fn<(userUuid: string, now: Date) => Promise<number>>
    >;
  };
  let service: RevokeUserSessionsService;

  const userUuid = 'user-1';

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    sessionRepository = {
      revokeByUserUuid:
        vi.fn<(userUuid: string, now: Date) => Promise<number>>(),
    } satisfies Pick<SessionRepository, 'revokeByUserUuid'>;

    module = await Test.createTestingModule({
      providers: [
        RevokeUserSessionsService,
        { provide: SessionRepository, useValue: sessionRepository },
      ],
    }).compile();

    service = module.get(RevokeUserSessionsService);
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

  it('revokes all active sessions for a user', async () => {
    sessionRepository.revokeByUserUuid.mockResolvedValue(3);

    await service.execute(userUuid);

    expect(sessionRepository.revokeByUserUuid).toHaveBeenCalledWith(
      userUuid,
      now,
    );
  });

  it('returns the number of revoked sessions', async () => {
    sessionRepository.revokeByUserUuid.mockResolvedValue(3);

    await expect(service.execute(userUuid)).resolves.toBe(3);
  });

  it('preserves session errors from the repository', async () => {
    const sessionError = new SessionException();
    sessionRepository.revokeByUserUuid.mockRejectedValue(sessionError);

    await expect(service.execute(userUuid)).rejects.toBe(sessionError);
  });

  it('wraps repository failures as session errors', async () => {
    sessionRepository.revokeByUserUuid.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(service.execute(userUuid)).rejects.toBeInstanceOf(
      SessionException,
    );
  });
});
