import { Inject, Injectable } from '@nestjs/common';

import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { SessionLoggerContext } from '#src/auth/sessions/types/enum/session-logger-context.enum.js';
import type { ValidatedSession } from '#src/auth/sessions/types/validated-session.type.js';
import { SessionSecretsUtils } from '#src/auth/sessions/utils/session-secrets/session-secrets.utils.js';
import { UserStatus } from '#src/auth/users/types/enum/user-status.enum.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class ValidateSessionService {
  private readonly logger = new AppLogger(
    SessionLoggerContext.VALIDATE_SESSION_SERVICE,
  );

  constructor(
    private readonly repository: SessionRepository,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(token: string): Promise<ValidatedSession | null> {
    try {
      const now = new Date();
      const session = await this.repository.findByTokenHash(
        SessionSecretsUtils.hash(token),
      );
      if (!session) return null;

      const idleCutoff = new Date(
        now.getTime() - this.config.session.idleTtlSeconds * 1000,
      );
      if (
        session.revokedAt !== null ||
        session.expiresAt <= now ||
        session.lastUsedAt <= idleCutoff ||
        session.user.status !== UserStatus.ACTIVE
      ) {
        return null;
      }

      const touchCutoff = new Date(
        now.getTime() - this.config.session.touchIntervalSeconds * 1000,
      );
      if (session.lastUsedAt <= touchCutoff) {
        const touched = await this.repository.touchIfValid(
          session.uuid,
          now,
          idleCutoff,
        );
        if (!touched) return null;
      }

      return {
        uuid: session.uuid,
        user: session.user,
        csrfTokenHash: session.csrfTokenHash,
      };
    } catch (error) {
      this.logger.error('Failed to validate session.');

      if (error instanceof SessionException) {
        throw error;
      }

      throw new SessionException();
    }
  }
}
