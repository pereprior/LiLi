import type { UserEntity } from '#src/auth/users/entities/user.entity.js';
import type { CreateUserData } from '#src/auth/users/types/data/create-user.data.js';
import type { UpdateUserData } from '#src/auth/users/types/data/update-user.data.js';

export abstract class UserRepository {
  abstract create(data: CreateUserData): Promise<UserEntity>;

  abstract findAll(): Promise<UserEntity[]>;

  abstract findByUuid(uuid: string): Promise<UserEntity | null>;

  abstract update(uuid: string, data: UpdateUserData): Promise<UserEntity>;

  abstract delete(uuid: string): Promise<void>;
}
