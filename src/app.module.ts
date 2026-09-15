import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from '@/auth/users/users.module.js';
import { DatabaseModule } from '@/database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      expandVariables: true,
    }),
    DatabaseModule,
    UsersModule,
  ],
})
export class AppModule {}
