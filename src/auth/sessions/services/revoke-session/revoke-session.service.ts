import { Injectable } from '@nestjs/common';

import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { SessionLoggerContext } from '#src/auth/sessions/types/enum/session-logger-context.enum.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class RevokeSessionService {
  private readonly logger = new AppLogger(
    SessionLoggerContext.REVOKE_SESSION_SERVICE,
  );

  constructor(private readonly repository: SessionRepository) {}

  async execute(token: string): Promise<void> {
    this.logger.log('Revoking session.');

    try {
      await this.repository.revokeByTokenHash(
        AuthSecretsUtils.hash(token),
        new Date(),
      );

      this.logger.log('Session revoked successfully.');
    } catch (error) {
      this.logger.error('Failed to revoke session.');

      if (error instanceof SessionException) {
        throw error;
      }

      throw new SessionException();
    }
  }
}
