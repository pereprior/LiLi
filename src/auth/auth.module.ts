import { Module } from '@nestjs/common';

import { SessionsModule } from '#src/auth/sessions/sessions.module.js';
import { UsersModule } from '#src/auth/users/users.module.js';

@Module({ imports: [UsersModule, SessionsModule] })
export class AuthModule {}
