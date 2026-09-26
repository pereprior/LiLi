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
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import type { SessionEntity } from '#src/auth/sessions/entities/session.entity.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import { UserStatus } from '#src/auth/users/types/enum/user-status.enum.js';
import { AppLogger } from '#src/logging/app-logger.js';
import { userEntityFactory } from '#test-factories/auth/users/user-entity.factory.js';

const now = new Date('2026-09-24T12:00:00.000Z');
const config = {
  session: {
    absoluteTtlSeconds: 30 * 24 * 60 * 60,
    idleTtlSeconds: 7 * 24 * 60 * 60,
    touchIntervalSeconds: 15 * 60,
  },
} as AuthConfig;

describe('ValidateSessionService', () => {
  let module: TestingModule;
  let sessionRepository: {
    findByTokenHash: ReturnType<
      typeof vi.fn<(tokenHash: string) => Promise<SessionEntity | null>>
    >;
    touchIfValid: ReturnType<
      typeof vi.fn<
        (uuid: string, now: Date, idleCutoff: Date) => Promise<boolean>
      >
    >;
  };
  let service: ValidateSessionService;

  const token = 'token';

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    sessionRepository = {
      findByTokenHash:
        vi.fn<(tokenHash: string) => Promise<SessionEntity | null>>(),
      touchIfValid:
        vi.fn<
          (uuid: string, now: Date, idleCutoff: Date) => Promise<boolean>
        >(),
    } satisfies Pick<SessionRepository, 'findByTokenHash' | 'touchIfValid'>;

    module = await Test.createTestingModule({
      providers: [
        ValidateSessionService,
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();

    service = module.get(ValidateSessionService);
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

  it('returns the session entity for a valid session', async () => {
    const session: SessionEntity = {
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(now.getTime() - 60_000),
      revokedAt: null,
      user: userEntityFactory.build(),
    };
    sessionRepository.findByTokenHash.mockResolvedValue(session);

    await expect(service.execute(token)).resolves.toBe(session);
  });

  it('looks up the hash of the provided token', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue(null);

    await service.execute(token);

    expect(sessionRepository.findByTokenHash).toHaveBeenCalledWith(
      AuthSecretsUtils.hash(token),
    );
  });

  it('rejects an unknown token', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue(null);

    await expect(service.execute('unknown')).resolves.toBeNull();
  });

  it('rejects a revoked session', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue({
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(now.getTime() - 60_000),
      revokedAt: new Date(now.getTime() - 1000),
      user: userEntityFactory.build(),
    });

    await expect(service.execute(token)).resolves.toBeNull();
  });

  it('rejects a session at its absolute expiry', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue({
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: now,
      lastUsedAt: new Date(now.getTime() - 60_000),
      revokedAt: null,
      user: userEntityFactory.build(),
    });

    await expect(service.execute(token)).resolves.toBeNull();
  });

  it('rejects a session at its idle expiry', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue({
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(
        now.getTime() - config.session.idleTtlSeconds * 1000,
      ),
      revokedAt: null,
      user: userEntityFactory.build(),
    });

    await expect(service.execute(token)).resolves.toBeNull();
  });

  it('rejects a disabled user', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue({
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(now.getTime() - 60_000),
      revokedAt: null,
      user: userEntityFactory.build({ status: UserStatus.DISABLED }),
    });

    await expect(service.execute(token)).resolves.toBeNull();
  });

  it('touches a session after the configured interval', async () => {
    const session = {
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(
        now.getTime() - config.session.touchIntervalSeconds * 1000,
      ),
      revokedAt: null,
      user: userEntityFactory.build(),
    };
    sessionRepository.findByTokenHash.mockResolvedValue(session);
    sessionRepository.touchIfValid.mockResolvedValue(true);

    await expect(service.execute(token)).resolves.toBe(session);

    expect(session.lastUsedAt).toEqual(now);
    expect(sessionRepository.touchIfValid).toHaveBeenCalledWith(
      session.uuid,
      now,
      new Date(now.getTime() - config.session.idleTtlSeconds * 1000),
    );
  });

  it('skips touch within the configured interval', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue({
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(now.getTime() - 60_000),
      revokedAt: null,
      user: userEntityFactory.build(),
    });

    await service.execute(token);

    expect(sessionRepository.touchIfValid).not.toHaveBeenCalled();
  });

  it('rejects a session invalidated before touch', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue({
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(
        now.getTime() - config.session.touchIntervalSeconds * 1000,
      ),
      revokedAt: null,
      user: userEntityFactory.build(),
    });
    sessionRepository.touchIfValid.mockResolvedValue(false);

    await expect(service.execute(token)).resolves.toBeNull();
  });

  it('wraps repository lookup failures as session errors', async () => {
    sessionRepository.findByTokenHash.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(service.execute(token)).rejects.toBeInstanceOf(
      SessionException,
    );
  });

  it('wraps touch failures as session errors', async () => {
    sessionRepository.findByTokenHash.mockResolvedValue({
      uuid: 'session-1',
      userUuid: 'user-1',
      csrfTokenHash: 'csrf-hash',
      expiresAt: new Date(now.getTime() + 60_000),
      lastUsedAt: new Date(
        now.getTime() - config.session.touchIntervalSeconds * 1000,
      ),
      revokedAt: null,
      user: userEntityFactory.build(),
    });
    sessionRepository.touchIfValid.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(service.execute(token)).rejects.toBeInstanceOf(
      SessionException,
    );
  });

  it('preserves session errors from the repository', async () => {
    const sessionError = new SessionException();
    sessionRepository.findByTokenHash.mockRejectedValue(sessionError);

    await expect(service.execute(token)).rejects.toBe(sessionError);
  });
});
