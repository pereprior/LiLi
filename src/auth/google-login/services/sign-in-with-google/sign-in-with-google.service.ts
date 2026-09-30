import { ForbiddenException, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { authConfig } from '#src/auth/config/auth.config.js';
import type { AuthenticatedExternalIdentity } from '#src/auth/google-login/oidc/types/authenticated-external-identity.type.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import type { CreatedSession } from '#src/auth/sessions/types/created-session.type.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import { PrismaService } from '#src/database/prisma.service.js';

@Injectable()
export class SignInWithGoogleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createSession: CreateSessionService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(
    identity: AuthenticatedExternalIdentity,
  ): Promise<CreatedSession> {
    const email = identity.email.trim().toLowerCase();

    if (
      !identity.emailVerified ||
      !this.config.google.allowedEmails.has(email)
    ) {
      throw new ForbiddenException('Google account is not allowed.');
    }

    let user;
    try {
      user = await this.prisma.user.upsert({
        where: { googleSubject: identity.subject },
        create: { googleSubject: identity.subject, email },
        update: { email },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      user = await this.prisma.user.update({
        where: { googleSubject: identity.subject },
        data: { email },
      });
    }

    return this.createSession.execute(user.uuid);
  }
}
