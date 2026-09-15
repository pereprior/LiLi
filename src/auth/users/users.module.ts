import { Module } from '@nestjs/common';

import { PrismaUserRepository } from '@/auth/users/repositories/prisma-user.repository.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { CreateUserService } from '@/auth/users/services/create-user/create-user.service.js';
import { PasswordHasher } from '@/auth/users/services/password-hasher/password-hasher.js';
import { ScryptPasswordHasher } from '@/auth/users/services/password-hasher/scrypt-password-hasher.js';
import { UsersController } from '@/auth/users/users.controller.js';
import { DatabaseModule } from '@/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: PasswordHasher,
      useClass: ScryptPasswordHasher,
    },
    CreateUserService,
  ],
})
export class UsersModule {}
