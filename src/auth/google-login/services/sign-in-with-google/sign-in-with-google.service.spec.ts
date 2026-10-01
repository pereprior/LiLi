import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedExternalIdentity } from '#src/auth/google-login/oidc/types/authenticated-external-identity.type.js';
import { SignInWithGoogleService } from '#src/auth/google-login/services/sign-in-with-google/sign-in-with-google.service.js';
import type { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import type { PrismaService } from '#src/database/prisma.service.js';

const identity: AuthenticatedExternalIdentity = {
  subject: 'google-subject-1',
  email: ' MEMBER@example.com ',
  emailVerified: true,
};

describe('SignInWithGoogleService', () => {
  const upsert = vi.fn();
  const update = vi.fn();
  const createSession = vi.fn<CreateSessionService['execute']>();
  const service = new SignInWithGoogleService(
    { user: { upsert, update } } as unknown as PrismaService,
    { execute: createSession } as unknown as CreateSessionService,
    {
      google: { allowedEmails: new Set(['member@example.com']) },
    } as unknown as AuthConfig,
  );

  beforeEach(() => {
    upsert.mockReset();
    update.mockReset();
    createSession.mockReset();
    upsert.mockResolvedValue({ uuid: 'user-1' });
    createSession.mockResolvedValue({
      token: 'session-token',
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
    });
  });

  it('links by Google subject and creates a local session', async () => {
    await expect(service.execute(identity)).resolves.toMatchObject({
      token: 'session-token',
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { googleSubject: 'google-subject-1' },
      create: {
        googleSubject: 'google-subject-1',
        email: 'member@example.com',
      },
      update: { email: 'member@example.com' },
    });
    expect(createSession).toHaveBeenCalledWith('user-1');
  });

  it.each([
    { ...identity, emailVerified: false },
    { ...identity, email: 'other@example.com' },
  ])('rejects an unapproved identity before writing a user', async (denied) => {
    await expect(service.execute(denied)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('propagates unexpected database failures', async () => {
    const failure = new Error('Database unavailable');
    upsert.mockRejectedValue(failure);

    await expect(service.execute(identity)).rejects.toBe(failure);
    expect(update).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('resolves a concurrent unique-subject creation', async () => {
    upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );
    update.mockResolvedValue({ uuid: 'existing-user' });

    await service.execute(identity);

    expect(update).toHaveBeenCalledWith({
      where: { googleSubject: identity.subject },
      data: { email: 'member@example.com' },
    });
    expect(createSession).toHaveBeenCalledWith('existing-user');
  });
});
