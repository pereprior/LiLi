import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenidGoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/openid-google-oidc.client.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { OidcLoginException } from '#src/auth/oidc-login-attempts/exceptions/oidc-login.exception.js';

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
      scope: 'openid email profile',
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
        name: 'Member',
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
      issuer: 'https://accounts.google.com',
      subject: 'google-subject',
      email: 'member@example.com',
      emailVerified: true,
      displayName: 'Member',
    });
  });

  it('omits an absent display name', async () => {
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

    const identity = await client.exchangeCode(
      new URL(config.google.redirectUri),
      { state: 'state', nonce: 'nonce', codeVerifier: 'verifier' },
    );

    expect(identity).not.toHaveProperty('displayName');
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
