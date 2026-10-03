import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma, type User } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authConfig } from '#src/auth/config/auth.config.js';
import { SignInWithGoogleService } from '#src/auth/google-login/services/sign-in-with-google/sign-in-with-google.service.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import { PrismaService } from '#src/database/prisma.service.js';

describe('SignInWithGoogleService', () => {
  let module: TestingModule;
  let service: SignInWithGoogleService;
  const upsert = vi.fn<(args: Prisma.UserUpsertArgs) => Promise<User>>();
  const update = vi.fn<(args: Prisma.UserUpdateArgs) => Promise<User>>();
  const createSession = vi.fn<CreateSessionService['execute']>();

  beforeEach(async () => {
    upsert.mockReset();
    update.mockReset();
    createSession.mockReset();

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
        SignInWithGoogleService,
        { provide: PrismaService, useValue: { user: { upsert, update } } },
        { provide: CreateSessionService, useValue: { execute: createSession } },
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();

    service = module.get(SignInWithGoogleService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('Identity approval', () => {
    it.each([
      {
        reason: 'an unverified email',
        identity: {
          subject: 'google-subject-1',
          email: 'member@example.com',
          emailVerified: false,
        },
      },
      {
        reason: 'a disallowed email',
        identity: {
          subject: 'google-subject-1',
          email: 'other@example.com',
          emailVerified: true,
        },
      },
    ])(
      'rejects $reason before accessing persistence or sessions',
      async ({ identity }) => {
        const result = service.execute(identity);

        await expect(result).rejects.toBeInstanceOf(ForbiddenException);
        await expect(result).rejects.toMatchObject({
          message: 'Google account is not allowed.',
        });
        expect(upsert).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
        expect(createSession).not.toHaveBeenCalled();
      },
    );
  });

  describe('User linking', () => {
    it('links by Google subject and normalizes email for creation and updates', async () => {
      const identity = {
        subject: 'google-subject-1',
        email: ' MEMBER@example.com ',
        emailVerified: true,
      };
      upsert.mockResolvedValue({
        uuid: 'user-1',
        googleSubject: 'google-subject-1',
        email: 'member@example.com',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        updatedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      createSession.mockResolvedValue({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      });

      await service.execute(identity);

      expect(upsert).toHaveBeenCalledExactlyOnceWith({
        where: { googleSubject: 'google-subject-1' },
        create: {
          googleSubject: 'google-subject-1',
          email: 'member@example.com',
        },
        update: { email: 'member@example.com' },
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('updates the existing subject and creates its session after P2002', async () => {
      const identity = {
        subject: 'google-subject-1',
        email: ' MEMBER@example.com ',
        emailVerified: true,
      };
      upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );
      update.mockResolvedValue({
        uuid: 'existing-user',
        googleSubject: 'google-subject-1',
        email: 'member@example.com',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        updatedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      createSession.mockResolvedValue({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      });

      await service.execute(identity);

      expect(update).toHaveBeenCalledExactlyOnceWith({
        where: { googleSubject: 'google-subject-1' },
        data: { email: 'member@example.com' },
      });
      expect(createSession).toHaveBeenCalledExactlyOnceWith('existing-user');
    });

    it('waits for the linked user before creating its session', async () => {
      const identity = {
        subject: 'google-subject-1',
        email: ' MEMBER@example.com ',
        emailVerified: true,
      };
      const persistence = Promise.withResolvers<User>();
      upsert.mockImplementation(() => persistence.promise);
      createSession.mockResolvedValue({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      });

      const result = service.execute(identity);
      const expectation = expect(result).resolves.toEqual({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      });

      expect(createSession).not.toHaveBeenCalled();

      persistence.resolve({
        uuid: 'user-1',
        googleSubject: 'google-subject-1',
        email: 'member@example.com',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        updatedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      await expectation;

      expect(createSession).toHaveBeenCalledExactlyOnceWith('user-1');
    });
  });

  describe('Local session creation', () => {
    it('creates a session for the linked user', async () => {
      const identity = {
        subject: 'google-subject-1',
        email: ' MEMBER@example.com ',
        emailVerified: true,
      };
      upsert.mockResolvedValue({
        uuid: 'user-1',
        googleSubject: 'google-subject-1',
        email: 'member@example.com',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        updatedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      createSession.mockResolvedValue({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      });

      await service.execute(identity);

      expect(createSession).toHaveBeenCalledExactlyOnceWith('user-1');
    });

    it('returns the complete session supplied by the session service', async () => {
      const identity = {
        subject: 'google-subject-1',
        email: ' MEMBER@example.com ',
        emailVerified: true,
      };
      upsert.mockResolvedValue({
        uuid: 'user-1',
        googleSubject: 'google-subject-1',
        email: 'member@example.com',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        updatedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      createSession.mockResolvedValue({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      });

      const result = await service.execute(identity);

      expect(result).toEqual({
        token: 'session-token',
        expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      });
    });
  });

  describe('Collaborator failures', () => {
    it.each([
      {
        reason: 'an unexpected error',
        failure: new Error('Database unavailable'),
      },
      {
        reason: 'a Prisma error other than P2002',
        failure: new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.10.0',
        }),
      },
    ])(
      'propagates $reason from user linking without fallback or session creation',
      async ({ failure }) => {
        const identity = {
          subject: 'google-subject-1',
          email: 'member@example.com',
          emailVerified: true,
        };
        upsert.mockRejectedValue(failure);

        await expect(service.execute(identity)).rejects.toBe(failure);

        expect(update).not.toHaveBeenCalled();
        expect(createSession).not.toHaveBeenCalled();
      },
    );

    it('propagates a fallback update failure without creating a session', async () => {
      const identity = {
        subject: 'google-subject-1',
        email: ' MEMBER@example.com ',
        emailVerified: true,
      };
      upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );
      const failure = new Error('Update unavailable');
      update.mockRejectedValue(failure);

      await expect(service.execute(identity)).rejects.toBe(failure);

      expect(createSession).not.toHaveBeenCalled();
    });

    it('propagates a session creation failure', async () => {
      const identity = {
        subject: 'google-subject-1',
        email: ' MEMBER@example.com ',
        emailVerified: true,
      };
      upsert.mockResolvedValue({
        uuid: 'user-1',
        googleSubject: 'google-subject-1',
        email: 'member@example.com',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        updatedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      const failure = new Error('Session unavailable');
      createSession.mockRejectedValue(failure);

      await expect(service.execute(identity)).rejects.toBe(failure);
    });
  });
});
