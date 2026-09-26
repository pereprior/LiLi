import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
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
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionUserUnavailableException } from '#src/auth/sessions/exceptions/session-user-unavailable.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import type { CreateSessionData } from '#src/auth/sessions/types/data/create-session.data.js';
import { AppLogger } from '#src/logging/app-logger.js';

const now = new Date('2026-09-24T12:00:00.000Z');
const config = {
  session: {
    absoluteTtlSeconds: 30 * 24 * 60 * 60,
    idleTtlSeconds: 7 * 24 * 60 * 60,
    touchIntervalSeconds: 15 * 60,
  },
} as AuthConfig;

describe('CreateSessionService', () => {
  let module: TestingModule;
  let sessionRepository: {
    create: ReturnType<
      typeof vi.fn<(data: CreateSessionData) => Promise<void>>
    >;
  };
  let service: CreateSessionService;

  const userUuid = 'user-1';

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    sessionRepository = {
      create: vi.fn<(data: CreateSessionData) => Promise<void>>(),
    } satisfies Pick<SessionRepository, 'create'>;

    module = await Test.createTestingModule({
      providers: [
        CreateSessionService,
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();

    service = module.get(CreateSessionService);
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

  it('persists token and CSRF hashes with the session dates', async () => {
    const created = await service.execute(userUuid);

    expect(sessionRepository.create).toHaveBeenCalledWith({
      userUuid,
      tokenHash: AuthSecretsUtils.hash(created.token),
      csrfTokenHash: AuthSecretsUtils.hash(created.csrfToken),
      lastUsedAt: now,
      expiresAt: new Date(
        now.getTime() + config.session.absoluteTtlSeconds * 1000,
      ),
    });
  });

  it('returns distinct secrets and the absolute expiry', async () => {
    const created = await service.execute(userUuid);

    expect(created.token).not.toBe(created.csrfToken);
    expect(created.expiresAt).toEqual(
      new Date(now.getTime() + config.session.absoluteTtlSeconds * 1000),
    );
  });

  it('rejects an unavailable user with a specific session error', async () => {
    sessionRepository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found.', {
        code: 'P2025',
        clientVersion: '7.10.0',
      }),
    );

    await expect(service.execute(userUuid)).rejects.toBeInstanceOf(
      SessionUserUnavailableException,
    );
  });

  it('preserves session errors from the repository', async () => {
    const sessionError = new SessionException();
    sessionRepository.create.mockRejectedValue(sessionError);

    await expect(service.execute(userUuid)).rejects.toBe(sessionError);
  });

  it('wraps unexpected repository failures as session errors', async () => {
    sessionRepository.create.mockRejectedValue(new Error('Database error'));

    await expect(service.execute(userUuid)).rejects.toBeInstanceOf(
      SessionException,
    );
  });
});
