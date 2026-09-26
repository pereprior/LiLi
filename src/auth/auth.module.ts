import { Module } from '@nestjs/common';

import { OidcLoginAttemptsModule } from '#src/auth/oidc-login-attempts/oidc-login-attempts.module.js';
import { SessionsModule } from '#src/auth/sessions/sessions.module.js';
import { UsersModule } from '#src/auth/users/users.module.js';

@Module({ imports: [UsersModule, SessionsModule, OidcLoginAttemptsModule] })
export class AuthModule {}
