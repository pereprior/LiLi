import { Module } from '@nestjs/common';

import { UsersModule } from '#src/auth/users/users.module.js';

@Module({ imports: [UsersModule] })
export class AuthModule {}
