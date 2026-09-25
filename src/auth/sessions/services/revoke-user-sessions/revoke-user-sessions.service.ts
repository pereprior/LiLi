import { Injectable } from '@nestjs/common';

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { SessionLoggerContext } from '#src/auth/sessions/types/enum/session-logger-context.enum.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class RevokeUserSessionsService {
  private readonly logger = new AppLogger(
    SessionLoggerContext.REVOKE_USER_SESSIONS_SERVICE,
  );

  constructor(private readonly repository: SessionRepository) {}

  async execute(userUuid: string): Promise<number> {
    this.logger.log('Revoking user sessions.');

    try {
      const revokedCount = await this.repository.revokeByUserUuid(
        userUuid,
        new Date(),
      );

      this.logger.log('User sessions revoked successfully.');

      return revokedCount;
    } catch (error) {
      this.logger.error('Failed to revoke user sessions.');

      if (error instanceof SessionException) {
        throw error;
      }

      throw new SessionException();
    }
  }
}
