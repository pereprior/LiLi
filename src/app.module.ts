import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '#src/auth/auth.module.js';
import { getEnvironmentFilePath } from '#src/config/environment.config.js';
import { DatabaseModule } from '#src/database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [getEnvironmentFilePath()],
      expandVariables: true,
    }),
    DatabaseModule,
    AuthModule,
  ],
})
export class AppModule {}
