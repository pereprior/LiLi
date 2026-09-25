import { Inject, Injectable } from '@nestjs/common';

import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionUserUnavailableException } from '#src/auth/sessions/exceptions/session-user-unavailable.exception.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import type { CreatedSession } from '#src/auth/sessions/types/created-session.type.js';
import { SessionLoggerContext } from '#src/auth/sessions/types/enum/session-logger-context.enum.js';
import { SessionSecretsUtils } from '#src/auth/sessions/utils/session-secrets/session-secrets.utils.js';
import { PrismaErrorUtils } from '#src/database/utils/prisma-error.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class CreateSessionService {
  private readonly logger = new AppLogger(
    SessionLoggerContext.CREATE_SESSION_SERVICE,
  );

  constructor(
    private readonly repository: SessionRepository,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(userUuid: string): Promise<CreatedSession> {
    this.logger.log('Creating session.');

    try {
      const now = new Date();
      const token = SessionSecretsUtils.generate();
      const csrfToken = SessionSecretsUtils.generate();
      const expiresAt = new Date(
        now.getTime() + this.config.session.absoluteTtlSeconds * 1000,
      );

      await this.repository.create({
        userUuid,
        tokenHash: SessionSecretsUtils.hash(token),
        csrfTokenHash: SessionSecretsUtils.hash(csrfToken),
        expiresAt,
        lastUsedAt: now,
      });

      this.logger.log('Session created successfully.');

      return { token, csrfToken, expiresAt };
    } catch (error) {
      if (error instanceof SessionException) {
        throw error;
      }

      if (PrismaErrorUtils.isRecordNotFoundError(error)) {
        this.logger.log('Session creation rejected.');
        throw new SessionUserUnavailableException();
      }

      this.logger.error('Failed to create session.');
      throw new SessionException();
    }
  }
}
