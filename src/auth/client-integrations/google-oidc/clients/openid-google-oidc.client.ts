import { Inject, Injectable } from '@nestjs/common';
import * as oidc from 'openid-client';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import type { AuthenticatedExternalIdentity } from '#src/auth/identities/types/authenticated-external-identity.type.js';
import { OidcLoginException } from '#src/auth/oidc-login-attempts/exceptions/oidc-login.exception.js';

const GOOGLE_ISSUER = new URL('https://accounts.google.com');

@Injectable()
export class OpenidGoogleOidcClient extends GoogleOidcClient {
  private configuration: Promise<oidc.Configuration> | undefined;

  constructor(@Inject(authConfig.KEY) private readonly config: AuthConfig) {
    super();
  }

  override async createAuthorizationUrl(data: {
    state: string;
    nonce: string;
    codeVerifier: string;
  }): Promise<URL> {
    const configuration = await this.getConfiguration();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(
      data.codeVerifier,
    );

    return oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.config.google.redirectUri,
      scope: 'openid email profile',
      state: data.state,
      nonce: data.nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  override async exchangeCode(
    callbackUrl: URL,
    checks: { state: string; nonce: string; codeVerifier: string },
  ): Promise<AuthenticatedExternalIdentity> {
    const configuration = await this.getConfiguration();
    const tokens = await oidc.authorizationCodeGrant(
      configuration,
      callbackUrl,
      {
        expectedState: checks.state,
        expectedNonce: checks.nonce,
        pkceCodeVerifier: checks.codeVerifier,
        idTokenExpected: true,
      },
    );

    const claims = tokens.claims();

    if (
      !claims ||
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      typeof claims.email !== 'string' ||
      !claims.email ||
      typeof claims.email_verified !== 'boolean'
    ) {
      throw new OidcLoginException();
    }

    const identity: AuthenticatedExternalIdentity = {
      issuer: configuration.serverMetadata().issuer,
      subject: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified,
    };

    if (typeof claims.name === 'string' && claims.name) {
      identity.displayName = claims.name;
    }

    return identity;
  }

  private getConfiguration(): Promise<oidc.Configuration> {
    this.configuration ??= oidc
      .discovery(
        GOOGLE_ISSUER,
        this.config.google.clientId,
        this.config.google.clientSecret,
      )
      .catch((error: unknown) => {
        this.configuration = undefined;
        throw error;
      });

    return this.configuration;
  }
}
