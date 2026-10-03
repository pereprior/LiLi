import { Test, type TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authConfig } from '#src/auth/config/auth.config.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';

describe('ValidateSessionService', () => {
  let module: TestingModule;
  let service: ValidateSessionService;
  const findUnique =
    vi.fn<
      (
        args: Prisma.SessionFindUniqueArgs,
      ) => Promise<Prisma.SessionGetPayload<{ include: { user: true } }> | null>
    >();

  beforeEach(async () => {
    findUnique.mockReset();

    const config: Pick<AuthConfig, 'google'> = {
      google: {
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        allowedEmails: new Set(['member@example.com']),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        ValidateSessionService,
        { provide: PrismaService, useValue: { session: { findUnique } } },
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();

    service = module.get(ValidateSessionService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('Session lookup', () => {
    it('looks up the token hash together with the associated user', async () => {
      findUnique.mockResolvedValue(null);

      await service.execute('token');

      expect(findUnique).toHaveBeenCalledExactlyOnceWith({
        where: { tokenHash: AuthSecretsUtils.hash('token') },
        include: { user: true },
      });
    });
  });

  describe('Valid sessions', () => {
    it('returns only the user identifier and email for an allowed active session', async () => {
      const now = new Date('2026-09-24T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);
      findUnique.mockResolvedValue({
        uuid: 'session-1',
        tokenHash: 'stored-hash',
        userUuid: 'user-1',
        createdAt: new Date('2026-09-24T11:59:00.000Z'),
        expiresAt: new Date('2026-09-24T12:01:00.000Z'),
        revokedAt: null,
        user: {
          uuid: 'user-1',
          googleSubject: 'subject-1',
          email: 'member@example.com',
          createdAt: new Date('2026-09-24T11:00:00.000Z'),
          updatedAt: new Date('2026-09-24T11:00:00.000Z'),
        },
      });

      const result = await service.execute('token');

      expect(result).toEqual({
        userUuid: 'user-1',
        email: 'member@example.com',
      });
    });

    it('checks the allowlist without changing the stored email casing', async () => {
      const now = new Date('2026-09-24T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);
      findUnique.mockResolvedValue({
        uuid: 'session-1',
        tokenHash: 'stored-hash',
        userUuid: 'user-1',
        createdAt: new Date('2026-09-24T11:59:00.000Z'),
        expiresAt: new Date('2026-09-24T12:01:00.000Z'),
        revokedAt: null,
        user: {
          uuid: 'user-1',
          googleSubject: 'subject-1',
          email: 'MEMBER@example.com',
          createdAt: new Date('2026-09-24T11:00:00.000Z'),
          updatedAt: new Date('2026-09-24T11:00:00.000Z'),
        },
      });

      const result = await service.execute('token');

      expect(result).toEqual({
        userUuid: 'user-1',
        email: 'MEMBER@example.com',
      });
    });
  });

  describe('Invalid sessions', () => {
    it('returns null when no session matches the token', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.execute('token')).resolves.toBeNull();
    });

    it.each([
      {
        reason: 'revoked',
        expiresAt: new Date('2026-09-24T12:01:00.000Z'),
        revokedAt: new Date('2026-09-24T12:00:00.000Z'),
        email: 'member@example.com',
      },
      {
        reason: 'at the expiration boundary',
        expiresAt: new Date('2026-09-24T12:00:00.000Z'),
        revokedAt: null,
        email: 'member@example.com',
      },
      {
        reason: 'expired before the current time',
        expiresAt: new Date('2026-09-24T11:59:00.000Z'),
        revokedAt: null,
        email: 'member@example.com',
      },
      {
        reason: 'associated with a disallowed email',
        expiresAt: new Date('2026-09-24T12:01:00.000Z'),
        revokedAt: null,
        email: 'removed@example.com',
      },
    ])(
      'returns null for a session that is $reason',
      async ({ expiresAt, revokedAt, email }) => {
        const now = new Date('2026-09-24T12:00:00.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(now);

        findUnique.mockResolvedValue({
          uuid: 'session-1',
          tokenHash: 'stored-hash',
          userUuid: 'user-1',
          createdAt: new Date('2026-09-24T11:59:00.000Z'),
          expiresAt,
          revokedAt,
          user: {
            uuid: 'user-1',
            googleSubject: 'subject-1',
            email,
            createdAt: new Date('2026-09-24T11:00:00.000Z'),
            updatedAt: new Date('2026-09-24T11:00:00.000Z'),
          },
        });

        await expect(service.execute('token')).resolves.toBeNull();
      },
    );
  });

  describe('Lookup failures', () => {
    it('replaces database failures with the public session error', async () => {
      findUnique.mockRejectedValue(new Error('secret database detail'));

      const result = service.execute('token');

      await expect(result).rejects.toBeInstanceOf(SessionException);
      await expect(result).rejects.toMatchObject({
        message: 'An unexpected error occurred while processing the session.',
      });
    });
  });
});
