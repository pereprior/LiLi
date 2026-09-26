import type { User } from '@prisma/client';

import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserResponse } from '#src/auth/users/responses/user.response.js';
import { UserListResponse } from '#src/auth/users/responses/user-list.response.js';
import { UserRole } from '#src/auth/users/types/enum/user-role.enum.js';
import { UserStatus } from '#src/auth/users/types/enum/user-status.enum.js';

export class UserMapper {
  static toEntity(user: User): UserEntity {
    return new UserEntity(
      user.uuid,
      user.username,
      user.passwordHash,
      UserRole[user.role],
      UserStatus[user.status],
      user.createdAt,
      user.updatedAt,
    );
  }

  static toListEntity(users: User[]): UserEntity[] {
    return users.map((user) => UserMapper.toEntity(user));
  }

  static toResponse(user: UserEntity): UserResponse {
    return new UserResponse(
      user.uuid,
      user.username,
      user.createdAt,
      user.updatedAt,
    );
  }

  static toListResponse(users: UserEntity[]): UserListResponse {
    return new UserListResponse(
      users.map((user) => UserMapper.toResponse(user)),
    );
  }
}
