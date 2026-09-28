import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

const LOGIN_ATTEMPT_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class StartOidcLoginService {
  private readonly logger = new AppLogger('StartOidcLoginService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly oidcClient: GoogleOidcClient,
  ) {}

  async execute(): Promise<{ authorizationUrl: URL; state: string }> {
    const state = AuthSecretsUtils.generate();
    const nonce = AuthSecretsUtils.generate();
    const codeVerifier = AuthSecretsUtils.generate();

    try {
      const authorizationUrl = await this.oidcClient.createAuthorizationUrl({
        state,
        nonce,
        codeVerifier,
      });

      await this.prisma.oidcLoginAttempt.create({
        data: {
          stateHash: AuthSecretsUtils.hash(state),
          nonce,
          codeVerifier,
          expiresAt: new Date(Date.now() + LOGIN_ATTEMPT_TTL_MS),
        },
      });

      return { authorizationUrl, state };
    } catch {
      this.logger.error('Failed to start OIDC login attempt.');
      throw new ServiceUnavailableException('OIDC login is unavailable.');
    }
  }
}
