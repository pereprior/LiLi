import { Module } from '@nestjs/common';

import { PrismaSessionRepository } from '#src/auth/sessions/repositories/prisma-session.repository.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import { RevokeSessionService } from '#src/auth/sessions/services/revoke-session/revoke-session.service.js';
import { RevokeUserSessionsService } from '#src/auth/sessions/services/revoke-user-sessions/revoke-user-sessions.service.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import { DatabaseModule } from '#src/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SessionRepository,
      useClass: PrismaSessionRepository,
    },
    CreateSessionService,
    ValidateSessionService,
    RevokeSessionService,
    RevokeUserSessionsService,
  ],
  exports: [
    CreateSessionService,
    ValidateSessionService,
    RevokeSessionService,
    RevokeUserSessionsService,
  ],
})
export class SessionsModule {}
