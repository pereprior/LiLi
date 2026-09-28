import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import type { AuthenticatedExternalIdentity } from '#src/auth/identities/types/authenticated-external-identity.type.js';
import { OidcLoginException } from '#src/auth/oidc-login-attempts/exceptions/oidc-login.exception.js';
import { PrismaService } from '#src/database/prisma.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class CompleteOidcLoginService {
  private readonly logger = new AppLogger('CompleteOidcLoginService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly oidcClient: GoogleOidcClient,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(
    callbackUrl: URL,
    browserState: string | undefined,
  ): Promise<AuthenticatedExternalIdentity> {
    const expectedCallbackUrl = new URL(this.config.google.redirectUri);
    const states = callbackUrl.searchParams.getAll('state');
    if (
      callbackUrl.origin !== expectedCallbackUrl.origin ||
      callbackUrl.pathname !== expectedCallbackUrl.pathname ||
      states.length !== 1 ||
      !states[0] ||
      states[0] !== browserState
    ) {
      throw new OidcLoginException();
    }

    let attempt;
    try {
      const now = new Date();
      const consumed = await this.prisma.oidcLoginAttempt.updateMany({
        where: {
          stateHash: AuthSecretsUtils.hash(states[0]),
          expiresAt: { gt: now },
          consumedAt: null,
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw new OidcLoginException();

      attempt = await this.prisma.oidcLoginAttempt.findUniqueOrThrow({
        where: { stateHash: AuthSecretsUtils.hash(states[0]) },
      });
    } catch (error) {
      if (error instanceof OidcLoginException) throw error;
      this.logger.error('Failed to consume OIDC login attempt.');
      throw new ServiceUnavailableException('OIDC login is unavailable.');
    }

    try {
      return await this.oidcClient.exchangeCode(callbackUrl, {
        state: states[0],
        nonce: attempt.nonce,
        codeVerifier: attempt.codeVerifier,
      });
    } catch {
      throw new OidcLoginException();
    }
  }
}
