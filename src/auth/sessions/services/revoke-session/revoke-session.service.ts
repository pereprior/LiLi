import { Injectable } from '@nestjs/common';

import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';
import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';
import { PrismaService } from '#src/database/prisma.service.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class RevokeSessionService {
  private readonly logger = new AppLogger('RevokeSessionService');

  constructor(private readonly prisma: PrismaService) {}

  async execute(token: string): Promise<void> {
    try {
      await this.prisma.session.updateMany({
        where: { tokenHash: AuthSecretsUtils.hash(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      this.logger.error('Failed to revoke session.');
      throw new SessionException();
    }
  }
}
