import type { User } from '@prisma/client';

import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserResponse } from '#src/auth/users/responses/user.response.js';
import { UserListResponse } from '#src/auth/users/responses/user-list.response.js';

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
