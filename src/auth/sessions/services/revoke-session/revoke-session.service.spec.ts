import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { RevokeSessionService } from '#src/auth/sessions/services/revoke-session/revoke-session.service.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import type { PrismaService } from '#src/database/prisma.service.js';

const now = new Date('2026-09-24T12:00:00.000Z');

describe('RevokeSessionService', () => {
  const updateMany = vi.fn();
  const service = new RevokeSessionService({
    session: { updateMany },
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    updateMany.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('revokes by token hash', async () => {
    await service.execute('token');
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: AuthSecretsUtils.hash('token'),
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  });

  it('hides database errors', async () => {
    updateMany.mockRejectedValue(new Error('secret detail'));
    await expect(service.execute('token')).rejects.toBeInstanceOf(
      SessionException,
    );
  });
});
