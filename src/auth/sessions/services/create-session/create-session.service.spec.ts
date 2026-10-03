import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma, type Session } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionUserUnavailableException } from '#src/auth/sessions/exceptions/session-user-unavailable.exception.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';

describe('CreateSessionService', () => {
  let module: TestingModule;
  let service: CreateSessionService;
  const create = vi.fn<(args: Prisma.SessionCreateArgs) => Promise<Session>>();

  beforeEach(async () => {
    create.mockReset();

    module = await Test.createTestingModule({
      providers: [
        CreateSessionService,
        { provide: PrismaService, useValue: { session: { create } } },
      ],
    }).compile();

    service = module.get(CreateSessionService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('Session creation', () => {
    it('stores the token hash and connects the requested user with a seven-day expiration', async () => {
      const now = new Date('2026-09-24T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);
      create.mockResolvedValue({
        uuid: 'session-1',
        tokenHash: 'stored-hash',
        userUuid: 'user-1',
        createdAt: new Date('2026-09-24T12:00:00.000Z'),
        expiresAt: new Date('2026-10-01T12:00:00.000Z'),
        revokedAt: null,
      });

      const created = await service.execute('user-1');

      expect(create).toHaveBeenCalledExactlyOnceWith({
        data: {
          tokenHash: AuthSecretsUtils.hash(created.token),
          expiresAt: new Date('2026-10-01T12:00:00.000Z'),
          user: { connect: { uuid: 'user-1' } },
        },
      });
    });

    it('returns the generated token and its seven-day expiration', async () => {
      const now = new Date('2026-09-24T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);
      create.mockResolvedValue({
        uuid: 'session-1',
        tokenHash: 'stored-hash',
        userUuid: 'user-1',
        createdAt: new Date('2026-09-24T12:00:00.000Z'),
        expiresAt: new Date('2026-10-01T12:00:00.000Z'),
        revokedAt: null,
      });
      vi.spyOn(AuthSecretsUtils, 'generate').mockReturnValue('session-token');

      const created = await service.execute('user-1');

      expect(created).toEqual({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T12:00:00.000Z'),
      });
    });

    it('waits for persistence before returning the created session', async () => {
      const persistedSession: Session = {
        uuid: 'session-1',
        tokenHash: 'stored-hash',
        userUuid: 'user-1',
        createdAt: new Date('2026-09-24T12:00:00.000Z'),
        expiresAt: new Date('2026-10-01T12:00:00.000Z'),
        revokedAt: null,
      };
      const persistence = Promise.withResolvers<Session>();
      create.mockImplementation(() => persistence.promise);
      let completed = false;

      const result = service.execute('user-1').then((session) => {
        completed = true;
        return session;
      });
      await Promise.resolve();

      expect(completed).toBe(false);

      persistence.resolve(persistedSession);
      await result;

      expect(completed).toBe(true);
    });
  });

  describe('Creation failures', () => {
    it('reports an unavailable user when persistence raises P2025', async () => {
      create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found.', {
          code: 'P2025',
          clientVersion: '7.10.0',
        }),
      );

      const result = service.execute('missing');

      await expect(result).rejects.toBeInstanceOf(
        SessionUserUnavailableException,
      );
      await expect(result).rejects.toMatchObject({
        message: 'Cannot create a session for this user.',
      });
    });

    it('replaces unexpected database failures with the public session error', async () => {
      create.mockRejectedValue(new Error('secret database detail'));

      const result = service.execute('user-1');

      await expect(result).rejects.toBeInstanceOf(SessionException);
      await expect(result).rejects.toMatchObject({
        message: 'An unexpected error occurred while processing the session.',
      });
    });
  });
});
