import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import type { OidcLoginAttemptEntity } from '#src/auth/oidc-login-attempts/entities/oidc-login-attempt.entity.js';
import { OidcLoginException } from '#src/auth/oidc-login-attempts/exceptions/oidc-login.exception.js';
import { OidcLoginAttemptRepository } from '#src/auth/oidc-login-attempts/repositories/oidc-login-attempt.repository.js';
import { CompleteOidcLoginResponse } from '#src/auth/oidc-login-attempts/services/complete-oidc-login/complete-oidc-login.response.js';
import { OidcLoginAttemptLoggerContext } from '#src/auth/oidc-login-attempts/types/enum/oidc-login-attempt-logger-context.enum.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class CompleteOidcLoginService {
  private readonly logger = new AppLogger(
    OidcLoginAttemptLoggerContext.COMPLETE_OIDC_LOGIN_SERVICE,
  );

  constructor(
    private readonly repository: OidcLoginAttemptRepository,
    private readonly oidcClient: GoogleOidcClient,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(callbackUrl: URL): Promise<CompleteOidcLoginResponse> {
    const expectedCallbackUrl = new URL(this.config.google.redirectUri);
    const states = callbackUrl.searchParams.getAll('state');

    if (
      callbackUrl.origin !== expectedCallbackUrl.origin ||
      callbackUrl.pathname !== expectedCallbackUrl.pathname ||
      states.length !== 1 ||
      !states[0]
    ) {
      throw new OidcLoginException();
    }

    this.logger.log('Completing OIDC login attempt.');

    const stateHash = AuthSecretsUtils.hash(states[0]);

    let attempt: OidcLoginAttemptEntity | null;
    try {
      attempt = await this.repository.consume(stateHash, new Date());
    } catch {
      this.logger.error('Failed to consume OIDC login attempt.');
      throw new ServiceUnavailableException('OIDC login is unavailable.');
    }

    if (!attempt) throw new OidcLoginException();

    try {
      const identity = await this.oidcClient.exchangeCode(callbackUrl, {
        state: states[0],
        nonce: attempt.nonce,
        codeVerifier: attempt.codeVerifier,
      });

      this.logger.log('OIDC login attempt completed successfully.');
      return new CompleteOidcLoginResponse(identity, attempt.returnTo);
    } catch {
      this.logger.log('OIDC login attempt rejected.');
      throw new OidcLoginException();
    }
  }
}
