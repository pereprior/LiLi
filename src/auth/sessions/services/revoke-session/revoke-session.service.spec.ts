import { Test, type TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { RevokeSessionService } from '#src/auth/sessions/services/revoke-session/revoke-session.service.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';

describe('RevokeSessionService', () => {
  let module: TestingModule;
  let service: RevokeSessionService;
  const updateMany =
    vi.fn<
      (args: Prisma.SessionUpdateManyArgs) => Promise<Prisma.BatchPayload>
    >();

  beforeEach(async () => {
    updateMany.mockReset();

    module = await Test.createTestingModule({
      providers: [
        RevokeSessionService,
        { provide: PrismaService, useValue: { session: { updateMany } } },
      ],
    }).compile();

    service = module.get(RevokeSessionService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('Session revocation', () => {
    it('marks only unrevoked sessions with the matching token hash as revoked', async () => {
      const now = new Date('2026-09-24T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);
      updateMany.mockResolvedValue({ count: 1 });

      await service.execute('token');

      expect(updateMany).toHaveBeenCalledExactlyOnceWith({
        where: { tokenHash: AuthSecretsUtils.hash('token'), revokedAt: null },
        data: { revokedAt: now },
      });
    });

    it('completes without an error when no session is updated', async () => {
      updateMany.mockResolvedValue({ count: 0 });

      await expect(service.execute('token')).resolves.toBeUndefined();
    });

    it('waits for persistence before completing revocation', async () => {
      const persistence = Promise.withResolvers<Prisma.BatchPayload>();
      updateMany.mockImplementation(() => persistence.promise);
      let completed = false;

      const result = service.execute('token').then(() => {
        completed = true;
      });
      await Promise.resolve();

      expect(completed).toBe(false);

      persistence.resolve({ count: 1 });
      await result;

      expect(completed).toBe(true);
    });
  });

  describe('Revocation failures', () => {
    it('replaces database failures with the public session error', async () => {
      updateMany.mockRejectedValue(new Error('secret database detail'));

      const result = service.execute('token');

      await expect(result).rejects.toBeInstanceOf(SessionException);
      await expect(result).rejects.toMatchObject({
        message: 'An unexpected error occurred while processing the session.',
      });
    });
  });
});
