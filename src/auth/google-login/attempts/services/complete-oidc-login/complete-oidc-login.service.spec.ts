import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OidcLoginException } from '#src/auth/google-login/attempts/exceptions/oidc-login.exception.js';
import { CompleteOidcLoginService } from '#src/auth/google-login/attempts/services/complete-oidc-login/complete-oidc-login.service.js';
import type { GoogleOidcClient } from '#src/auth/google-login/oidc/clients/google-oidc.client.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import type { PrismaService } from '#src/database/prisma.service.js';

const now = new Date('2026-09-26T12:00:00.000Z');
const callbackUrl = new URL(
  'http://localhost:3000/auth/google/callback?state=state&code=code',
);

describe('CompleteOidcLoginService', () => {
  const updateMany = vi.fn();
  const findUniqueOrThrow = vi.fn();
  const exchangeCode = vi.fn();
  const service = new CompleteOidcLoginService(
    {
      oidcLoginAttempt: { updateMany, findUniqueOrThrow },
    } as unknown as PrismaService,
    { exchangeCode } as unknown as GoogleOidcClient,
    {
      google: { redirectUri: 'http://localhost:3000/auth/google/callback' },
    } as AuthConfig,
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    updateMany.mockReset();
    findUniqueOrThrow.mockReset();
    exchangeCode.mockReset();
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({
      nonce: 'nonce',
      codeVerifier: 'verifier',
    });
    exchangeCode.mockResolvedValue({
      subject: 'subject-1',
      email: 'member@example.com',
      emailVerified: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('consumes the attempt before exchanging the code', async () => {
    await expect(service.execute(callbackUrl, 'state')).resolves.toEqual({
      subject: 'subject-1',
      email: 'member@example.com',
      emailVerified: true,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        stateHash: AuthSecretsUtils.hash('state'),
        expiresAt: { gt: now },
        consumedAt: null,
      },
      data: { consumedAt: now },
    });
    expect(exchangeCode).toHaveBeenCalledWith(callbackUrl, {
      state: 'state',
      nonce: 'nonce',
      codeVerifier: 'verifier',
    });
  });

  it('rejects a callback without matching browser state', async () => {
    await expect(service.execute(callbackUrl, 'other')).rejects.toBeInstanceOf(
      OidcLoginException,
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects a consumed or expired attempt', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.execute(callbackUrl, 'state')).rejects.toBeInstanceOf(
      OidcLoginException,
    );
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it('hides database failures while consuming an attempt', async () => {
    updateMany.mockRejectedValue(new Error('secret detail'));

    await expect(service.execute(callbackUrl, 'state')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it('rejects an exchange failure', async () => {
    exchangeCode.mockRejectedValue(new Error('secret detail'));
    await expect(service.execute(callbackUrl, 'state')).rejects.toBeInstanceOf(
      OidcLoginException,
    );
  });
});
