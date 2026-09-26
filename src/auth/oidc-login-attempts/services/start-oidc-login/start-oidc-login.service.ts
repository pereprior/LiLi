import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { OidcLoginAttemptRepository } from '#src/auth/oidc-login-attempts/repositories/oidc-login-attempt.repository.js';
import { OidcLoginAttemptLoggerContext } from '#src/auth/oidc-login-attempts/types/enum/oidc-login-attempt-logger-context.enum.js';
import { InternalReturnPathUtils } from '#src/auth/oidc-login-attempts/utils/internal-return-path.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class StartOidcLoginService {
  private readonly logger = new AppLogger(
    OidcLoginAttemptLoggerContext.START_OIDC_LOGIN_SERVICE,
  );

  constructor(
    private readonly repository: OidcLoginAttemptRepository,
    private readonly oidcClient: GoogleOidcClient,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(returnTo?: string): Promise<URL> {
    const validatedReturnTo = InternalReturnPathUtils.validate(
      returnTo,
      this.config.appOrigin,
    );

    this.logger.log('Starting OIDC login attempt.');

    const state = AuthSecretsUtils.generate();
    const nonce = AuthSecretsUtils.generate();
    const codeVerifier = AuthSecretsUtils.generate();

    try {
      const authorizationUrl = await this.oidcClient.createAuthorizationUrl({
        state,
        nonce,
        codeVerifier,
      });

      await this.repository.create({
        stateHash: AuthSecretsUtils.hash(state),
        nonce,
        codeVerifier,
        returnTo: validatedReturnTo,
        expiresAt: new Date(
          Date.now() + this.config.oidcAttemptTtlSeconds * 1000,
        ),
      });

      this.logger.log('OIDC login attempt created successfully.');

      return authorizationUrl;
    } catch {
      this.logger.error('Failed to start OIDC login attempt.');
      throw new ServiceUnavailableException('OIDC login is unavailable.');
    }
  }
}
