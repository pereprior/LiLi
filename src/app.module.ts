import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from '@/auth/users/users.module.js';
import { getEnvironmentFilePath } from '@/config/environment.config.js';
import { DatabaseModule } from '@/database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [getEnvironmentFilePath()],
      expandVariables: true,
    }),
    DatabaseModule,
    UsersModule,
  ],
})
export class AppModule {}
