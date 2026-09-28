import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import type { PrismaService } from '#src/database/prisma.service.js';

const now = new Date('2026-09-24T12:00:00.000Z');

describe('ValidateSessionService', () => {
  const findUnique = vi.fn();
  const prisma = { session: { findUnique } } as unknown as PrismaService;
  const config = {
    google: { allowedEmails: new Set(['member@example.com']) },
  } as unknown as AuthConfig;
  const service = new ValidateSessionService(prisma, config);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    findUnique.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  const validSession = (): {
    userUuid: string;
    expiresAt: Date;
    revokedAt: Date | null;
    user: { email: string };
  } => ({
    userUuid: 'user-1',
    expiresAt: new Date(now.getTime() + 60_000),
    revokedAt: null,
    user: { email: 'member@example.com' },
  });

  it('returns the user for an allowed valid session', async () => {
    findUnique.mockResolvedValue(validSession());
    await expect(service.execute('token')).resolves.toEqual({
      userUuid: 'user-1',
      email: 'member@example.com',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { tokenHash: AuthSecretsUtils.hash('token') },
      include: { user: true },
    });
  });

  it.each([
    ['unknown', null],
    ['revoked', { ...validSession(), revokedAt: now }],
    ['expired', { ...validSession(), expiresAt: now }],
    [
      'email removed from allowlist',
      { ...validSession(), user: { email: 'removed@example.com' } },
    ],
  ])('rejects a %s session', async (_reason, session) => {
    findUnique.mockResolvedValue(session);
    await expect(service.execute('token')).resolves.toBeNull();
  });

  it('hides database errors', async () => {
    findUnique.mockRejectedValue(new Error('secret detail'));
    await expect(service.execute('token')).rejects.toBeInstanceOf(
      SessionException,
    );
  });
});
