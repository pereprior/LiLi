import { Test, type TestingModule } from '@nestjs/testing';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { OidcLoginAttemptEntity } from '#src/auth/oidc-login-attempts/entities/oidc-login-attempt.entity.js';
import { OidcLoginAttemptRepository } from '#src/auth/oidc-login-attempts/repositories/oidc-login-attempt.repository.js';
import { StartOidcLoginService } from '#src/auth/oidc-login-attempts/services/start-oidc-login/start-oidc-login.service.js';
import type { CreateOidcLoginAttemptData } from '#src/auth/oidc-login-attempts/types/data/create-oidc-login-attempt.data.js';
import { AppLogger } from '#src/logging/app-logger.js';

const now = new Date('2026-09-26T12:00:00.000Z');
const config = {
  appOrigin: 'http://localhost:3000',
  oidcAttemptTtlSeconds: 600,
} as AuthConfig;

describe('StartOidcLoginService', () => {
  let module: TestingModule;
  let repository: {
    create: ReturnType<
      typeof vi.fn<
        (data: CreateOidcLoginAttemptData) => Promise<OidcLoginAttemptEntity>
      >
    >;
  };
  let oidcClient: {
    createAuthorizationUrl: ReturnType<
      typeof vi.fn<GoogleOidcClient['createAuthorizationUrl']>
    >;
  };
  let service: StartOidcLoginService;

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    repository = {
      create:
        vi.fn<
          (data: CreateOidcLoginAttemptData) => Promise<OidcLoginAttemptEntity>
        >(),
    } satisfies Pick<OidcLoginAttemptRepository, 'create'>;
    repository.create.mockResolvedValue(
      new OidcLoginAttemptEntity(
        'attempt-1',
        'state-hash',
        'nonce',
        'verifier',
        '/',
        now,
        new Date(now.getTime() + 600_000),
        null,
      ),
    );
    oidcClient = {
      createAuthorizationUrl:
        vi.fn<GoogleOidcClient['createAuthorizationUrl']>(),
    } satisfies Pick<GoogleOidcClient, 'createAuthorizationUrl'>;

    module = await Test.createTestingModule({
      providers: [
        StartOidcLoginService,
        { provide: OidcLoginAttemptRepository, useValue: repository },
        { provide: GoogleOidcClient, useValue: oidcClient },
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();
    service = module.get(StartOidcLoginService);
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await module.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('persists the state hash, OIDC secrets and expiry', async () => {
    oidcClient.createAuthorizationUrl.mockResolvedValue(
      new URL('https://accounts.google.com/authorize'),
    );

    await service.execute('/tasks');

    const request = oidcClient.createAuthorizationUrl.mock.calls[0]![0];
    expect(repository.create).toHaveBeenCalledWith({
      stateHash: AuthSecretsUtils.hash(request.state),
      nonce: request.nonce,
      codeVerifier: request.codeVerifier,
      returnTo: '/tasks',
      expiresAt: new Date(now.getTime() + config.oidcAttemptTtlSeconds * 1000),
    });
    expect(repository.create.mock.calls[0]?.[0]).not.toHaveProperty('state');
  });

  it('generates independent 256-bit state, nonce and PKCE verifier', async () => {
    oidcClient.createAuthorizationUrl.mockResolvedValue(
      new URL('https://accounts.google.com/authorize'),
    );

    await service.execute();

    const request = oidcClient.createAuthorizationUrl.mock.calls[0]![0];
    expect(Buffer.from(request.state, 'base64url')).toHaveLength(32);
    expect(Buffer.from(request.nonce, 'base64url')).toHaveLength(32);
    expect(Buffer.from(request.codeVerifier, 'base64url')).toHaveLength(32);
    expect(new Set(Object.values(request)).size).toBe(3);
  });

  it.each(['/tasks?view=today', '/'])(
    'accepts local return path %s',
    async (path) => {
      oidcClient.createAuthorizationUrl.mockResolvedValue(
        new URL('https://accounts.google.com/authorize'),
      );

      await service.execute(path);

      expect(repository.create.mock.calls[0]?.[0].returnTo).toBe(path);
    },
  );

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'tasks',
  ])('rejects external return path %s', async (path) => {
    await expect(service.execute(path)).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
    expect(oidcClient.createAuthorizationUrl).not.toHaveBeenCalled();
  });

  it('returns the authorization URL after storing the attempt', async () => {
    const authorizationUrl = new URL('https://accounts.google.com/authorize');
    oidcClient.createAuthorizationUrl.mockResolvedValue(authorizationUrl);

    await expect(service.execute()).resolves.toBe(authorizationUrl);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('hides provider details when authorization URL creation fails', async () => {
    oidcClient.createAuthorizationUrl.mockRejectedValue(
      new Error('secret provider response'),
    );

    await expect(service.execute()).rejects.toThrow(
      'OIDC login is unavailable.',
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('hides database details when storing the attempt fails', async () => {
    oidcClient.createAuthorizationUrl.mockResolvedValue(
      new URL('https://accounts.google.com/authorize'),
    );
    repository.create.mockRejectedValue(new Error('secret database detail'));

    await expect(service.execute()).rejects.toThrow(
      'OIDC login is unavailable.',
    );
  });
});
