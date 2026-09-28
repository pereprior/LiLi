import { Inject, Injectable } from '@nestjs/common';

import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';
import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { PrismaService } from '#src/database/prisma.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class ValidateSessionService {
  private readonly logger = new AppLogger('ValidateSessionService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(
    token: string,
  ): Promise<{ userUuid: string; email: string } | null> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { tokenHash: AuthSecretsUtils.hash(token) },
        include: { user: true },
      });

      if (
        !session ||
        session.revokedAt !== null ||
        session.expiresAt <= new Date() ||
        !this.config.google.allowedEmails.has(session.user.email.toLowerCase())
      ) {
        return null;
      }

      return { userUuid: session.userUuid, email: session.user.email };
    } catch {
      this.logger.error('Failed to validate session.');
      throw new SessionException();
    }
  }
}
