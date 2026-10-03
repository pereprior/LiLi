import { ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { OidcLoginAttempt, Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authConfig } from '#src/auth/config/auth.config.js';
import { OidcLoginException } from '#src/auth/google-login/attempts/exceptions/oidc-login.exception.js';
import { CompleteOidcLoginService } from '#src/auth/google-login/attempts/services/complete-oidc-login/complete-oidc-login.service.js';
import { GoogleOidcClient } from '#src/auth/google-login/oidc/clients/google-oidc.client.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';

describe('CompleteOidcLoginService', () => {
  let module: TestingModule;
  let service: CompleteOidcLoginService;
  const updateMany =
    vi.fn<
      (
        args: Prisma.OidcLoginAttemptUpdateManyArgs,
      ) => Promise<Prisma.BatchPayload>
    >();
  const findUniqueOrThrow =
    vi.fn<
      (
        args: Prisma.OidcLoginAttemptFindUniqueOrThrowArgs,
      ) => Promise<OidcLoginAttempt>
    >();
  const exchangeCode = vi.fn<GoogleOidcClient['exchangeCode']>();

  beforeEach(async () => {
    updateMany.mockReset();
    findUniqueOrThrow.mockReset();
    exchangeCode.mockReset();

    const config: Pick<AuthConfig, 'google'> = {
      google: {
        redirectUri: 'http://localhost:3000/auth/google/callback',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        allowedEmails: new Set(['member@example.com']),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        CompleteOidcLoginService,
        {
          provide: PrismaService,
          useValue: { oidcLoginAttempt: { updateMany, findUniqueOrThrow } },
        },
        { provide: GoogleOidcClient, useValue: { exchangeCode } },
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();

    service = module.get(CompleteOidcLoginService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await module.close();
  });

  describe('Callback validation', () => {
    it.each([
      {
        reason: 'an unexpected origin',
        url: 'https://other.example/auth/google/callback?state=state&code=code',
        browserState: 'state',
      },
      {
        reason: 'an unexpected path',
        url: 'http://localhost:3000/other/callback?state=state&code=code',
        browserState: 'state',
      },
      {
        reason: 'missing state',
        url: 'http://localhost:3000/auth/google/callback?code=code',
        browserState: 'state',
      },
      {
        reason: 'empty state',
        url: 'http://localhost:3000/auth/google/callback?state=&code=code',
        browserState: '',
      },
      {
        reason: 'duplicate state',
        url: 'http://localhost:3000/auth/google/callback?state=state&state=state&code=code',
        browserState: 'state',
      },
      {
        reason: 'missing browser state',
        url: 'http://localhost:3000/auth/google/callback?state=state&code=code',
        browserState: undefined,
      },
      {
        reason: 'mismatched browser state',
        url: 'http://localhost:3000/auth/google/callback?state=state&code=code',
        browserState: 'other',
      },
    ])(
      'rejects a callback with $reason before accessing collaborators',
      async ({ url, browserState }) => {
        const callbackUrl = new URL(url);

        await expect(
          service.execute(callbackUrl, browserState),
        ).rejects.toBeInstanceOf(OidcLoginException);

        expect(updateMany).not.toHaveBeenCalled();
        expect(findUniqueOrThrow).not.toHaveBeenCalled();
        expect(exchangeCode).not.toHaveBeenCalled();
      },
    );
  });

  describe('Attempt consumption and retrieval', () => {
    it('marks only an unexpired and unconsumed attempt with the matching state hash as consumed', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      const now = new Date('2026-09-26T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T11:59:00.000Z'),
        expiresAt: new Date('2026-09-26T12:09:00.000Z'),
        consumedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      exchangeCode.mockResolvedValue({
        subject: 'subject-1',
        email: 'member@example.com',
        emailVerified: true,
      });

      await service.execute(callbackUrl, 'state');

      expect(updateMany).toHaveBeenCalledExactlyOnceWith({
        where: {
          stateHash: AuthSecretsUtils.hash('state'),
          expiresAt: { gt: now },
          consumedAt: null,
        },
        data: { consumedAt: now },
      });
    });

    it('retrieves the consumed attempt using the matching state hash', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T11:59:00.000Z'),
        expiresAt: new Date('2026-09-26T12:09:00.000Z'),
        consumedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      exchangeCode.mockResolvedValue({
        subject: 'subject-1',
        email: 'member@example.com',
        emailVerified: true,
      });

      await service.execute(callbackUrl, 'state');

      expect(findUniqueOrThrow).toHaveBeenCalledExactlyOnceWith({
        where: { stateHash: AuthSecretsUtils.hash('state') },
      });
    });

    it('waits for consumption to finish before retrieving the attempt and exchanging the code', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      const consumption = Promise.withResolvers<Prisma.BatchPayload>();
      updateMany.mockImplementation(() => consumption.promise);
      findUniqueOrThrow.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T11:59:00.000Z'),
        expiresAt: new Date('2026-09-26T12:09:00.000Z'),
        consumedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      exchangeCode.mockResolvedValue({
        subject: 'subject-1',
        email: 'member@example.com',
        emailVerified: true,
      });

      const login = service.execute(callbackUrl, 'state');
      const result = expect(login).resolves.toEqual({
        subject: 'subject-1',
        email: 'member@example.com',
        emailVerified: true,
      });

      expect(updateMany).toHaveBeenCalledOnce();
      expect(findUniqueOrThrow).not.toHaveBeenCalled();
      expect(exchangeCode).not.toHaveBeenCalled();

      consumption.resolve({ count: 1 });
      await result;

      expect(findUniqueOrThrow).toHaveBeenCalledOnce();
      expect(exchangeCode).toHaveBeenCalledOnce();
    });

    it('rejects an attempt that could not be consumed', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.execute(callbackUrl, 'state'),
      ).rejects.toBeInstanceOf(OidcLoginException);

      expect(findUniqueOrThrow).not.toHaveBeenCalled();
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('returns a public availability error when consuming the attempt fails', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      updateMany.mockRejectedValue(new Error('secret database detail'));

      const login = service.execute(callbackUrl, 'state');

      await expect(login).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(login).rejects.toMatchObject({
        message: 'OIDC login is unavailable.',
      });

      expect(findUniqueOrThrow).not.toHaveBeenCalled();
      expect(exchangeCode).not.toHaveBeenCalled();
    });

    it('returns a public availability error when retrieving the attempt fails', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockRejectedValue(new Error('secret database detail'));

      const login = service.execute(callbackUrl, 'state');

      await expect(login).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(login).rejects.toMatchObject({
        message: 'OIDC login is unavailable.',
      });

      expect(exchangeCode).not.toHaveBeenCalled();
    });
  });

  describe('Code exchange', () => {
    it('exchanges the callback using state and the stored nonce and code verifier', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T11:59:00.000Z'),
        expiresAt: new Date('2026-09-26T12:09:00.000Z'),
        consumedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      exchangeCode.mockResolvedValue({
        subject: 'subject-1',
        email: 'member@example.com',
        emailVerified: true,
      });

      await service.execute(callbackUrl, 'state');

      expect(exchangeCode).toHaveBeenCalledExactlyOnceWith(callbackUrl, {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      });
    });

    it('returns the identity authenticated by the OIDC client', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T11:59:00.000Z'),
        expiresAt: new Date('2026-09-26T12:09:00.000Z'),
        consumedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      const identity = {
        subject: 'subject-1',
        email: 'member@example.com',
        emailVerified: true,
      };
      exchangeCode.mockResolvedValue(identity);

      const result = await service.execute(callbackUrl, 'state');

      expect(result).toEqual(identity);
    });

    it('returns a public login error when exchanging the code fails', async () => {
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      updateMany.mockResolvedValue({ count: 1 });
      findUniqueOrThrow.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T11:59:00.000Z'),
        expiresAt: new Date('2026-09-26T12:09:00.000Z'),
        consumedAt: new Date('2026-09-26T12:00:00.000Z'),
      });
      exchangeCode.mockRejectedValue(new Error('secret provider detail'));

      const login = service.execute(callbackUrl, 'state');

      await expect(login).rejects.toBeInstanceOf(OidcLoginException);
      await expect(login).rejects.toMatchObject({
        message: 'Invalid or expired OIDC login attempt.',
      });
    });
  });
});
