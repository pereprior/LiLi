import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OidcLoginException } from '#src/auth/google-login/attempts/exceptions/oidc-login.exception.js';
import { OpenidGoogleOidcClient } from '#src/auth/google-login/oidc/clients/openid-google-oidc.client.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';

const oidc = vi.hoisted(() => ({
  discovery: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
}));

vi.mock('openid-client', () => oidc);

const config = {
  google: {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://localhost:3000/auth/google/callback',
  },
} as AuthConfig;

describe('OpenidGoogleOidcClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('discovers Google and builds an authorization URL with PKCE S256, state and nonce', async () => {
    const configuration = {
      serverMetadata: (): { issuer: string } => ({
        issuer: 'https://accounts.google.com',
      }),
    };
    oidc.discovery.mockResolvedValue(configuration);
    oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
    oidc.buildAuthorizationUrl.mockReturnValue(
      new URL('https://accounts.google.com/o/oauth2/v2/auth'),
    );
    const client = new OpenidGoogleOidcClient(config);

    await client.createAuthorizationUrl({
      state: 'state',
      nonce: 'nonce',
      codeVerifier: 'verifier',
    });

    expect(oidc.discovery).toHaveBeenCalledWith(
      new URL('https://accounts.google.com'),
      'client-id',
      'client-secret',
    );
    expect(oidc.calculatePKCECodeChallenge).toHaveBeenCalledWith('verifier');
    expect(oidc.buildAuthorizationUrl).toHaveBeenCalledWith(configuration, {
      redirect_uri: config.google.redirectUri,
      scope: 'openid email',
      state: 'state',
      nonce: 'nonce',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
    });
  });

  it('passes state, nonce and verifier to the OIDC library', async () => {
    const configuration = {
      serverMetadata: (): { issuer: string } => ({
        issuer: 'https://accounts.google.com',
      }),
    };
    oidc.discovery.mockResolvedValue(configuration);
    oidc.authorizationCodeGrant.mockResolvedValue({
      claims: () => ({
        sub: 'google-subject',
        email: 'member@example.com',
        email_verified: true,
      }),
    });
    const client = new OpenidGoogleOidcClient(config);
    const callbackUrl = new URL(
      'http://localhost:3000/auth/google/callback?state=state&code=code',
    );

    await client.exchangeCode(callbackUrl, {
      state: 'state',
      nonce: 'nonce',
      codeVerifier: 'verifier',
    });

    expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(
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

  it('normalizes verified ID token claims', async () => {
    oidc.discovery.mockResolvedValue({
      serverMetadata: (): { issuer: string } => ({
        issuer: 'https://accounts.google.com',
      }),
    });
    oidc.authorizationCodeGrant.mockResolvedValue({
      claims: () => ({
        sub: 'google-subject',
        email: 'member@example.com',
        email_verified: true,
      }),
    });
    const client = new OpenidGoogleOidcClient(config);

    await expect(
      client.exchangeCode(new URL(config.google.redirectUri), {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      }),
    ).resolves.toEqual({
      subject: 'google-subject',
      email: 'member@example.com',
      emailVerified: true,
    });
  });

  it('rejects missing required claims', async () => {
    oidc.discovery.mockResolvedValue({
      serverMetadata: (): { issuer: string } => ({
        issuer: 'https://accounts.google.com',
      }),
    });
    oidc.authorizationCodeGrant.mockResolvedValue({
      claims: () => ({
        sub: 'google-subject',
        email_verified: true,
      }),
    });
    const client = new OpenidGoogleOidcClient(config);

    await expect(
      client.exchangeCode(new URL(config.google.redirectUri), {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      }),
    ).rejects.toBeInstanceOf(OidcLoginException);
  });

  it('retries discovery after a failure', async () => {
    oidc.discovery
      .mockRejectedValueOnce(new Error('Provider unavailable'))
      .mockResolvedValueOnce({});
    oidc.calculatePKCECodeChallenge.mockResolvedValue('challenge');
    oidc.buildAuthorizationUrl.mockReturnValue(
      new URL('https://accounts.google.com/o/oauth2/v2/auth'),
    );
    const client = new OpenidGoogleOidcClient(config);
    const request = {
      state: 'state',
      nonce: 'nonce',
      codeVerifier: 'verifier',
    };

    await expect(client.createAuthorizationUrl(request)).rejects.toThrow(
      'Provider unavailable',
    );
    await expect(
      client.createAuthorizationUrl(request),
    ).resolves.toBeInstanceOf(URL);
    expect(oidc.discovery).toHaveBeenCalledTimes(2);
  });

  it('passes a nonce validation failure through to the caller', async () => {
    oidc.discovery.mockResolvedValue({
      serverMetadata: (): { issuer: string } => ({
        issuer: 'https://accounts.google.com',
      }),
    });
    oidc.authorizationCodeGrant.mockRejectedValue(new Error('nonce mismatch'));
    const client = new OpenidGoogleOidcClient(config);

    await expect(
      client.exchangeCode(new URL(config.google.redirectUri), {
        state: 'state',
        nonce: 'nonce',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow('nonce mismatch');
  });
});
