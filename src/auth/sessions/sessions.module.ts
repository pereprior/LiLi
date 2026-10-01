import { Module } from '@nestjs/common';

import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import { RevokeSessionService } from '#src/auth/sessions/services/revoke-session/revoke-session.service.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import { DatabaseModule } from '#src/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    CreateSessionService,
    ValidateSessionService,
    RevokeSessionService,
  ],
  exports: [CreateSessionService, ValidateSessionService, RevokeSessionService],
})
export class SessionsModule {}
