import { Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionUserUnavailableException } from '#src/auth/sessions/exceptions/session-user-unavailable.exception.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import type { PrismaService } from '#src/database/prisma.service.js';

const now = new Date('2026-09-24T12:00:00.000Z');

describe('CreateSessionService', () => {
  const create = vi.fn();
  const prisma = { session: { create } } as unknown as PrismaService;
  const service = new CreateSessionService(prisma);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    create.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it('stores only the token hash and returns a seven-day session', async () => {
    const created = await service.execute('user-1');

    expect(create).toHaveBeenCalledWith({
      data: {
        tokenHash: AuthSecretsUtils.hash(created.token),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        user: { connect: { uuid: 'user-1' } },
      },
    });
    expect(created.expiresAt).toEqual(
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    );
  });

  it('rejects a missing user', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found.', {
        code: 'P2025',
        clientVersion: '7.10.0',
      }),
    );
    await expect(service.execute('missing')).rejects.toBeInstanceOf(
      SessionUserUnavailableException,
    );
  });

  it('hides unexpected database failures', async () => {
    create.mockRejectedValue(new Error('secret detail'));
    await expect(service.execute('user-1')).rejects.toBeInstanceOf(
      SessionException,
    );
  });
});
