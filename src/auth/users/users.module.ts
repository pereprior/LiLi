import { Module } from '@nestjs/common';

import { PrismaUserRepository } from '#src/auth/users/repositories/prisma-user.repository.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { CreateUserService } from '#src/auth/users/services/create-user/create-user.service.js';
import { DeleteUserService } from '#src/auth/users/services/delete-user/delete-user.service.js';
import { FindUserService } from '#src/auth/users/services/find-user/find-user.service.js';
import { ListUsersService } from '#src/auth/users/services/list-users/list-users.service.js';
import { UpdateUserService } from '#src/auth/users/services/update-user/update-user.service.js';
import { UsersController } from '#src/auth/users/users.controller.js';
import { DatabaseModule } from '#src/database/database.module.js';

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
