import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from '#src/auth/auth.controller.js';
import { GoogleLoginModule } from '#src/auth/google-login/google-login.module.js';
import { AuthenticationGuard } from '#src/auth/guards/authentication.guard.js';
import { OriginGuard } from '#src/auth/guards/origin.guard.js';
import { CookieWriterPipe } from '#src/auth/pipes/cookie-writer.pipe.js';
import { SessionsModule } from '#src/auth/sessions/sessions.module.js';

@Module({
  imports: [GoogleLoginModule, SessionsModule],
  controllers: [AuthController],
  providers: [
    CookieWriterPipe,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
})
export class AuthModule {}
