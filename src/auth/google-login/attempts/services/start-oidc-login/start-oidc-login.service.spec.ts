import { ServiceUnavailableException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { OidcLoginAttempt, Prisma } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StartOidcLoginService } from '#src/auth/google-login/attempts/services/start-oidc-login/start-oidc-login.service.js';
import { GoogleOidcClient } from '#src/auth/google-login/oidc/clients/google-oidc.client.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';

describe('StartOidcLoginService', () => {
  let module: TestingModule;
  let service: StartOidcLoginService;
  const create =
    vi.fn<
      (args: Prisma.OidcLoginAttemptCreateArgs) => Promise<OidcLoginAttempt>
    >();
  const createAuthorizationUrl =
    vi.fn<GoogleOidcClient['createAuthorizationUrl']>();

  beforeEach(async () => {
    create.mockReset();
    createAuthorizationUrl.mockReset();

    module = await Test.createTestingModule({
      providers: [
        StartOidcLoginService,
        { provide: PrismaService, useValue: { oidcLoginAttempt: { create } } },
        { provide: GoogleOidcClient, useValue: { createAuthorizationUrl } },
      ],
    }).compile();

    service = module.get(StartOidcLoginService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await module.close();
  });

  describe('Authorization request', () => {
    it('passes separately generated state, nonce and code verifier to the provider', async () => {
      vi.spyOn(AuthSecretsUtils, 'generate')
        .mockReturnValueOnce('state')
        .mockReturnValueOnce('nonce')
        .mockReturnValueOnce('verifier');
      createAuthorizationUrl.mockResolvedValue(
        new URL('https://accounts.google.com/authorize'),
      );
      create.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        expiresAt: new Date('2026-09-26T12:10:00.000Z'),
        consumedAt: null,
      });

      await service.execute();

      expect(createAuthorizationUrl).toHaveBeenCalledExactlyOnceWith({
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      });
    });
  });

  describe('Attempt persistence', () => {
    it('stores the state hash, nonce and code verifier with a ten-minute expiration', async () => {
      const now = new Date('2026-09-26T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);
      vi.spyOn(AuthSecretsUtils, 'generate')
        .mockReturnValueOnce('state')
        .mockReturnValueOnce('nonce')
        .mockReturnValueOnce('verifier');
      createAuthorizationUrl.mockResolvedValue(
        new URL('https://accounts.google.com/authorize'),
      );
      create.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        expiresAt: new Date('2026-09-26T12:10:00.000Z'),
        consumedAt: null,
      });

      await service.execute();

      expect(create).toHaveBeenCalledExactlyOnceWith({
        data: {
          stateHash: AuthSecretsUtils.hash('state'),
          nonce: 'nonce',
          codeVerifier: 'verifier',
          expiresAt: new Date('2026-09-26T12:10:00.000Z'),
        },
      });
    });

    it('returns the provider URL and generated browser state after persistence', async () => {
      vi.spyOn(AuthSecretsUtils, 'generate')
        .mockReturnValueOnce('state')
        .mockReturnValueOnce('nonce')
        .mockReturnValueOnce('verifier');
      createAuthorizationUrl.mockResolvedValue(
        new URL('https://accounts.google.com/authorize'),
      );
      create.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        expiresAt: new Date('2026-09-26T12:10:00.000Z'),
        consumedAt: null,
      });

      const result = await service.execute();

      expect(result).toEqual({
        authorizationUrl: new URL('https://accounts.google.com/authorize'),
        state: 'state',
      });
    });

    it('waits for the authorization URL before persisting the attempt', async () => {
      vi.spyOn(AuthSecretsUtils, 'generate')
        .mockReturnValueOnce('state')
        .mockReturnValueOnce('nonce')
        .mockReturnValueOnce('verifier');
      create.mockResolvedValue({
        uuid: 'attempt-1',
        stateHash: AuthSecretsUtils.hash('state'),
        nonce: 'nonce',
        codeVerifier: 'verifier',
        createdAt: new Date('2026-09-26T12:00:00.000Z'),
        expiresAt: new Date('2026-09-26T12:10:00.000Z'),
        consumedAt: null,
      });
      const authorization = Promise.withResolvers<URL>();
      createAuthorizationUrl.mockImplementation(() => authorization.promise);

      const result = service.execute();
      const expectation = expect(result).resolves.toEqual({
        authorizationUrl: new URL('https://accounts.google.com/authorize'),
        state: 'state',
      });

      expect(create).not.toHaveBeenCalled();

      authorization.resolve(new URL('https://accounts.google.com/authorize'));
      await expectation;

      expect(create).toHaveBeenCalledOnce();
    });
  });

  describe('Login start failures', () => {
    it('returns the public availability error without persisting after a provider failure', async () => {
      createAuthorizationUrl.mockRejectedValue(
        new Error('secret provider detail'),
      );

      const result = service.execute();

      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(result).rejects.toMatchObject({
        message: 'OIDC login is unavailable.',
      });
      expect(create).not.toHaveBeenCalled();
    });

    it('replaces persistence failures with the public availability error', async () => {
      createAuthorizationUrl.mockResolvedValue(
        new URL('https://accounts.google.com/authorize'),
      );
      create.mockRejectedValue(new Error('secret database detail'));

      const result = service.execute();

      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(result).rejects.toMatchObject({
        message: 'OIDC login is unavailable.',
      });
    });
  });
});
