import type { AuthenticatedExternalIdentity } from '#src/auth/identities/types/authenticated-external-identity.type.js';

export abstract class GoogleOidcClient {
  abstract createAuthorizationUrl(data: {
    state: string;
    nonce: string;
    codeVerifier: string;
  }): Promise<URL>;

  abstract exchangeCode(
    callbackUrl: URL,
    checks: { state: string; nonce: string; codeVerifier: string },
  ): Promise<AuthenticatedExternalIdentity>;
}
