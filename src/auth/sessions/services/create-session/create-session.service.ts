import { Injectable } from '@nestjs/common';

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { SessionUserUnavailableException } from '#src/auth/sessions/exceptions/session-user-unavailable.exception.js';
import type { CreatedSession } from '#src/auth/sessions/types/created-session.type.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';
import { PrismaErrorUtils } from '#src/database/utils/prisma-error.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CreateSessionService {
  private readonly logger = new AppLogger('CreateSessionService');

  constructor(private readonly prisma: PrismaService) {}

  async execute(userUuid: string): Promise<CreatedSession> {
    try {
      const token = AuthSecretsUtils.generate();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

      await this.prisma.session.create({
        data: {
          tokenHash: AuthSecretsUtils.hash(token),
          expiresAt,
          user: { connect: { uuid: userUuid } },
        },
      });

      return { token, expiresAt };
    } catch (error) {
      if (PrismaErrorUtils.isRecordNotFoundError(error)) {
        throw new SessionUserUnavailableException();
      }

      this.logger.error('Failed to create session.');
      throw new SessionException();
    }
  }
}
