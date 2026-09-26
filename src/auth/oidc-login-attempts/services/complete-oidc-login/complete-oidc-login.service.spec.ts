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
import { OidcLoginException } from '#src/auth/oidc-login-attempts/exceptions/oidc-login.exception.js';
import { OidcLoginAttemptRepository } from '#src/auth/oidc-login-attempts/repositories/oidc-login-attempt.repository.js';
import { CompleteOidcLoginResponse } from '#src/auth/oidc-login-attempts/services/complete-oidc-login/complete-oidc-login.response.js';
import { CompleteOidcLoginService } from '#src/auth/oidc-login-attempts/services/complete-oidc-login/complete-oidc-login.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

const now = new Date('2026-09-26T12:00:00.000Z');
const config = {
  google: { redirectUri: 'http://localhost:3000/auth/google/callback' },
} as AuthConfig;

describe('CompleteOidcLoginService', () => {
  let module: TestingModule;
  let repository: {
    consume: ReturnType<
      typeof vi.fn<
        (stateHash: string, now: Date) => Promise<OidcLoginAttemptEntity | null>
      >
    >;
  };
  let oidcClient: {
    exchangeCode: ReturnType<typeof vi.fn<GoogleOidcClient['exchangeCode']>>;
  };
  let service: CompleteOidcLoginService;

  beforeAll(() => {
    vi.spyOn(AppLogger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(AppLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    repository = {
      consume:
        vi.fn<
          (
            stateHash: string,
            now: Date,
          ) => Promise<OidcLoginAttemptEntity | null>
        >(),
    } satisfies Pick<OidcLoginAttemptRepository, 'consume'>;
    oidcClient = {
      exchangeCode: vi.fn<GoogleOidcClient['exchangeCode']>(),
    } satisfies Pick<GoogleOidcClient, 'exchangeCode'>;

    module = await Test.createTestingModule({
      providers: [
        CompleteOidcLoginService,
        { provide: OidcLoginAttemptRepository, useValue: repository },
        { provide: GoogleOidcClient, useValue: oidcClient },
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();
    service = module.get(CompleteOidcLoginService);
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

  it('consumes the state hash and returns the verified identity and return path', async () => {
    repository.consume.mockResolvedValue(
      new OidcLoginAttemptEntity(
        'attempt-1',
        'state-hash',
        'nonce',
        'verifier',
        '/tasks',
        now,
        new Date(now.getTime() + 600_000),
        now,
      ),
    );
    oidcClient.exchangeCode.mockResolvedValue({
      issuer: 'https://accounts.google.com',
      subject: 'subject-1',
      email: 'member@example.com',
      emailVerified: true,
    });
    const callbackUrl = new URL(
      'http://localhost:3000/auth/google/callback?state=state&code=code',
    );

    await expect(service.execute(callbackUrl)).resolves.toEqual(
      new CompleteOidcLoginResponse(
        {
          issuer: 'https://accounts.google.com',
          subject: 'subject-1',
          email: 'member@example.com',
          emailVerified: true,
        },
        '/tasks',
      ),
    );
    expect(repository.consume).toHaveBeenCalledWith(
      AuthSecretsUtils.hash('state'),
      now,
    );
    expect(oidcClient.exchangeCode).toHaveBeenCalledWith(callbackUrl, {
      state: 'state',
      nonce: 'nonce',
      codeVerifier: 'verifier',
    });
  });

  it('rejects an unknown state before exchanging a code', async () => {
    repository.consume.mockResolvedValue(null);

    await expect(
      service.execute(
        new URL(
          'http://localhost:3000/auth/google/callback?state=unknown&code=code',
        ),
      ),
    ).rejects.toBeInstanceOf(OidcLoginException);
    expect(oidcClient.exchangeCode).not.toHaveBeenCalled();
  });

  it.each([
    'http://evil.example/auth/google/callback?state=state&code=code',
    'http://localhost:3000/auth/google/callback?code=code',
    'http://localhost:3000/auth/google/callback?state=first&state=second&code=code',
  ])(
    'rejects an invalid callback URL before consuming an attempt: %s',
    async (url) => {
      await expect(service.execute(new URL(url))).rejects.toBeInstanceOf(
        OidcLoginException,
      );
      expect(repository.consume).not.toHaveBeenCalled();
    },
  );

  it('allows only one code exchange for concurrent callbacks', async () => {
    repository.consume
      .mockResolvedValueOnce(
        new OidcLoginAttemptEntity(
          'attempt-1',
          'state-hash',
          'nonce',
          'verifier',
          '/',
          now,
          new Date(now.getTime() + 600_000),
          now,
        ),
      )
      .mockResolvedValueOnce(null);
    oidcClient.exchangeCode.mockResolvedValue({
      issuer: 'https://accounts.google.com',
      subject: 'subject-1',
      email: 'member@example.com',
      emailVerified: true,
    });
    const callbackUrl = new URL(
      'http://localhost:3000/auth/google/callback?state=state&code=code',
    );

    const results = await Promise.allSettled([
      service.execute(callbackUrl),
      service.execute(callbackUrl),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(oidcClient.exchangeCode).toHaveBeenCalledTimes(1);
  });

  it('hides database details when consuming an attempt fails', async () => {
    repository.consume.mockRejectedValue(new Error('secret database detail'));

    await expect(
      service.execute(
        new URL(
          'http://localhost:3000/auth/google/callback?state=state&code=code',
        ),
      ),
    ).rejects.toThrow('OIDC login is unavailable.');
    expect(oidcClient.exchangeCode).not.toHaveBeenCalled();
  });

  it('rejects a failed code exchange after consuming the attempt', async () => {
    repository.consume.mockResolvedValue(
      new OidcLoginAttemptEntity(
        'attempt-1',
        'state-hash',
        'nonce',
        'verifier',
        '/',
        now,
        new Date(now.getTime() + 600_000),
        now,
      ),
    );
    oidcClient.exchangeCode.mockRejectedValue(new Error('secret code'));

    await expect(
      service.execute(
        new URL(
          'http://localhost:3000/auth/google/callback?state=state&code=code',
        ),
      ),
    ).rejects.toBeInstanceOf(OidcLoginException);
    expect(repository.consume).toHaveBeenCalledTimes(1);
  });
});
