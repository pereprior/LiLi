import type { Prisma, User } from '@prisma/client';

import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserResponse } from '@/auth/users/responses/user.response.js';

export class UserMapper {
  static toEntity(user: User): UserEntity {
    return new UserEntity(
      user.uuid,
      user.username,
      user.passwordHash,
      user.createdAt,
      user.updatedAt,
    );
  }

  static toCreateInput(user: UserEntity): Prisma.UserCreateInput {
    return {
      uuid: user.uuid,
      username: user.username,
      passwordHash: user.passwordHash,
    };
  }

  static toResponse(user: UserEntity): UserResponse {
    return new UserResponse(
      user.uuid,
      user.username,
      user.createdAt,
      user.updatedAt,
    );
  }
}
