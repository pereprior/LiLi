import { Test, type TestingModule } from '@nestjs/testing';
import type * as OpenidClient from 'openid-client';
import { Configuration } from 'openid-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authConfig } from '#src/auth/config/auth.config.js';
import { OidcLoginException } from '#src/auth/google-login/attempts/exceptions/oidc-login.exception.js';
import { OpenidGoogleOidcClient } from '#src/auth/google-login/oidc/clients/openid-google-oidc.client.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';

const oidc = vi.hoisted(() => ({
  discovery: vi.fn<typeof OpenidClient.discovery>(),
  calculatePKCECodeChallenge:
    vi.fn<typeof OpenidClient.calculatePKCECodeChallenge>(),
  buildAuthorizationUrl: vi.fn<typeof OpenidClient.buildAuthorizationUrl>(),
  authorizationCodeGrant:
    vi.fn<
      (
        ...args: Parameters<typeof OpenidClient.authorizationCodeGrant>
      ) => Promise<{ claims(): Record<string, unknown> | undefined }>
    >(),
}));

vi.mock('openid-client', async (importOriginal) => {
  const original = await importOriginal<typeof OpenidClient>();
  return { ...original, ...oidc };
});

describe('OpenidGoogleOidcClient', () => {
  let module: TestingModule;
  let client: OpenidGoogleOidcClient;

  beforeEach(async () => {
    oidc.discovery.mockReset();
    oidc.calculatePKCECodeChallenge.mockReset();
    oidc.buildAuthorizationUrl.mockReset();
    oidc.authorizationCodeGrant.mockReset();

    const config: Pick<AuthConfig, 'google'> = {
      google: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        allowedEmails: new Set(['member@example.com']),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        OpenidGoogleOidcClient,
        { provide: authConfig.KEY, useValue: config },
      ],
    }).compile();

    client = module.get(OpenidGoogleOidcClient);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Provider discovery', () => {
    it('discovers Google using the configured client credentials', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
      oidc.buildAuthorizationUrl.mockReturnValue(
        new URL('https://accounts.google.com/authorize'),
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await client.createAuthorizationUrl(request);

      expect(oidc.discovery).toHaveBeenCalledExactlyOnceWith(
        new URL('https://accounts.google.com'),
        'client-id',
        'client-secret',
      );
    });

    it('reuses successful discovery across authorization and code exchange', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
      oidc.buildAuthorizationUrl.mockReturnValue(
        new URL('https://accounts.google.com/authorize'),
      );
      oidc.authorizationCodeGrant.mockResolvedValue({
        claims: () => ({
          sub: 'google-subject',
          email: 'member@example.com',
          email_verified: true,
        }),
      });
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await client.createAuthorizationUrl(request);
      await client.exchangeCode(
        new URL(
          'http://localhost:3000/auth/google/callback?state=state&code=code',
        ),
        request,
      );

      expect(oidc.discovery).toHaveBeenCalledOnce();
    });

    it('retries discovery on a later call after discovery fails', async () => {
      const failure = new Error('Provider unavailable');
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce(configuration);
      oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
      oidc.buildAuthorizationUrl.mockReturnValue(
        new URL('https://accounts.google.com/authorize'),
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await expect(client.createAuthorizationUrl(request)).rejects.toBe(
        failure,
      );
      await expect(client.createAuthorizationUrl(request)).resolves.toEqual(
        new URL('https://accounts.google.com/authorize'),
      );

      expect(oidc.discovery).toHaveBeenCalledTimes(2);
    });

    it('does not generate an authorization URL when discovery fails', async () => {
      const failure = new Error('Provider unavailable');
      oidc.discovery.mockRejectedValue(failure);
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await expect(client.createAuthorizationUrl(request)).rejects.toBe(
        failure,
      );

      expect(oidc.calculatePKCECodeChallenge).not.toHaveBeenCalled();
      expect(oidc.buildAuthorizationUrl).not.toHaveBeenCalled();
    });
  });

  describe('Authorization URL', () => {
    it('calculates the PKCE challenge from the supplied verifier', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
      oidc.buildAuthorizationUrl.mockReturnValue(
        new URL('https://accounts.google.com/authorize'),
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await client.createAuthorizationUrl(request);

      expect(oidc.calculatePKCECodeChallenge).toHaveBeenCalledExactlyOnceWith(
        'verifier',
      );
    });

    it('builds the URL with the configured callback, scopes, state, nonce and S256 challenge', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
      oidc.buildAuthorizationUrl.mockReturnValue(
        new URL('https://accounts.google.com/authorize'),
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await client.createAuthorizationUrl(request);

      expect(oidc.buildAuthorizationUrl).toHaveBeenCalledExactlyOnceWith(
        configuration,
        {
          redirect_uri: 'http://localhost:3000/auth/google/callback',
          scope: 'openid email',
          state: 'state',
          nonce: 'nonce',
          code_challenge: 'challenge',
          code_challenge_method: 'S256',
        },
      );
    });

    it('returns the authorization URL supplied by the OIDC library', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
      oidc.buildAuthorizationUrl.mockReturnValue(
        new URL('https://accounts.google.com/authorize'),
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      const result = await client.createAuthorizationUrl(request);

      expect(result).toEqual(new URL('https://accounts.google.com/authorize'));
    });

    it('waits for the PKCE challenge before building the URL', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      const challenge = Promise.withResolvers<string>();
      oidc.calculatePKCECodeChallenge.mockImplementation(
        () => challenge.promise,
      );
      oidc.buildAuthorizationUrl.mockReturnValue(
        new URL('https://accounts.google.com/authorize'),
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      const result = client.createAuthorizationUrl(request);
      const expectation = expect(result).resolves.toEqual(
        new URL('https://accounts.google.com/authorize'),
      );
      await Promise.resolve();

      expect(oidc.buildAuthorizationUrl).not.toHaveBeenCalled();

      challenge.resolve('challenge');
      await expectation;

      expect(oidc.buildAuthorizationUrl).toHaveBeenCalledOnce();
    });
  });

  describe('Code exchange', () => {
    it('requests ID token validation using the expected state, nonce and PKCE verifier', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      oidc.authorizationCodeGrant.mockResolvedValue({
        claims: () => ({
          sub: 'google-subject',
          email: 'member@example.com',
          email_verified: true,
        }),
      });
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await client.exchangeCode(callbackUrl, request);

      expect(oidc.authorizationCodeGrant).toHaveBeenCalledExactlyOnceWith(
        configuration,
        callbackUrl,
        {
          expectedState: 'state',
          expectedNonce: 'nonce',
          pkceCodeVerifier: 'verifier',
          idTokenExpected: true,
        },
      );
    });

    it.each([true, false])(
      'maps ID token claims to the external identity with emailVerified=%s',
      async (emailVerified) => {
        const configuration = new Configuration(
          { issuer: 'https://accounts.google.com' },
          'client-id',
        );
        oidc.discovery.mockResolvedValue(configuration);
        oidc.authorizationCodeGrant.mockResolvedValue({
          claims: () => ({
            sub: 'google-subject',
            email: 'member@example.com',
            email_verified: emailVerified,
          }),
        });
        const callbackUrl = new URL(
          'http://localhost:3000/auth/google/callback?state=state&code=code',
        );
        const request = {
          state: 'state',
          nonce: 'nonce',
          codeVerifier: 'verifier',
        };

        const result = await client.exchangeCode(callbackUrl, request);

        expect(result).toEqual({
          subject: 'google-subject',
          email: 'member@example.com',
          emailVerified,
        });
      },
    );

    it('propagates a validation failure reported by the OIDC library', async () => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      const failure = new Error('nonce mismatch');
      oidc.authorizationCodeGrant.mockRejectedValue(failure);
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      await expect(client.exchangeCode(callbackUrl, request)).rejects.toBe(
        failure,
      );
    });
  });

  describe('Required ID token claims', () => {
    it.each([
      { reason: 'missing claims', claims: undefined },
      {
        reason: 'missing subject',
        claims: { email: 'member@example.com', email_verified: true },
      },
      {
        reason: 'empty subject',
        claims: { sub: '', email: 'member@example.com', email_verified: true },
      },
      {
        reason: 'non-string subject',
        claims: { sub: 123, email: 'member@example.com', email_verified: true },
      },
      {
        reason: 'missing email',
        claims: { sub: 'google-subject', email_verified: true },
      },
      {
        reason: 'empty email',
        claims: { sub: 'google-subject', email: '', email_verified: true },
      },
      {
        reason: 'non-string email',
        claims: { sub: 'google-subject', email: 123, email_verified: true },
      },
      {
        reason: 'missing verification flag',
        claims: { sub: 'google-subject', email: 'member@example.com' },
      },
      {
        reason: 'non-boolean verification flag',
        claims: {
          sub: 'google-subject',
          email: 'member@example.com',
          email_verified: 'true',
        },
      },
    ])('rejects $reason with the public login error', async ({ claims }) => {
      const configuration = new Configuration(
        { issuer: 'https://accounts.google.com' },
        'client-id',
      );
      oidc.discovery.mockResolvedValue(configuration);
      oidc.authorizationCodeGrant.mockResolvedValue({ claims: () => claims });
      const callbackUrl = new URL(
        'http://localhost:3000/auth/google/callback?state=state&code=code',
      );
      const request = {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      };

      const result = client.exchangeCode(callbackUrl, request);

      await expect(result).rejects.toBeInstanceOf(OidcLoginException);
      await expect(result).rejects.toMatchObject({
        message: 'Invalid or expired OIDC login attempt.',
      });
    });
  });
});
