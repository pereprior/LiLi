import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { StartOidcLoginService } from '#src/auth/oidc-login-attempts/services/start-oidc-login/start-oidc-login.service.js';
import type { PrismaService } from '#src/database/prisma.service.js';

const now = new Date('2026-09-26T12:00:00.000Z');

describe('StartOidcLoginService', () => {
  const create = vi.fn();
  const createAuthorizationUrl =
    vi.fn<GoogleOidcClient['createAuthorizationUrl']>();
  const service = new StartOidcLoginService(
    { oidcLoginAttempt: { create } } as unknown as PrismaService,
    { createAuthorizationUrl } as unknown as GoogleOidcClient,
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    create.mockReset();
    createAuthorizationUrl.mockReset();
    createAuthorizationUrl.mockResolvedValue(
      new URL('https://accounts.google.com/authorize'),
    );
  });
  afterEach(() => vi.useRealTimers());

  it('stores a one-time attempt and returns browser state', async () => {
    const result = await service.execute();
    const request = createAuthorizationUrl.mock.calls[0]![0];

    expect(result).toEqual({
      authorizationUrl: new URL('https://accounts.google.com/authorize'),
      state: request.state,
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        stateHash: AuthSecretsUtils.hash(request.state),
        nonce: request.nonce,
        codeVerifier: request.codeVerifier,
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      },
    });
    expect(new Set(Object.values(request)).size).toBe(3);
  });

  it('hides provider failures', async () => {
    createAuthorizationUrl.mockRejectedValue(new Error('secret detail'));
    await expect(service.execute()).rejects.toThrow(
      'OIDC login is unavailable.',
    );
    expect(create).not.toHaveBeenCalled();
  });
});
