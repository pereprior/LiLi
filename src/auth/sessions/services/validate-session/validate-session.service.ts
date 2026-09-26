import { Inject, Injectable } from '@nestjs/common';

import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import type { SessionEntity } from '#src/auth/sessions/entities/session.entity.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { SessionLoggerContext } from '#src/auth/sessions/types/enum/session-logger-context.enum.js';
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

  async execute(token: string): Promise<SessionEntity | null> {
    try {
      const now = new Date();
      const session = await this.repository.findByTokenHash(
        AuthSecretsUtils.hash(token),
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
        session.lastUsedAt = now;
      }

      return session;
    } catch (error) {
      this.logger.error('Failed to validate session.');

      if (error instanceof SessionException) {
        throw error;
      }

      throw new SessionException();
    }
  }
}
