import { Module } from '@nestjs/common';

import { PrismaUserRepository } from '@/auth/users/repositories/prisma-user.repository.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { CreateUserService } from '@/auth/users/services/create-user/create-user.service.js';
import { DeleteUserService } from '@/auth/users/services/delete-user/delete-user.service.js';
import { FindUserService } from '@/auth/users/services/find-user/find-user.service.js';
import { ListUsersService } from '@/auth/users/services/list-users/list-users.service.js';
import { UpdateUserService } from '@/auth/users/services/update-user/update-user.service.js';
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
    CreateUserService,
    DeleteUserService,
    FindUserService,
    ListUsersService,
    UpdateUserService,
  ],
})
export class UsersModule {}
