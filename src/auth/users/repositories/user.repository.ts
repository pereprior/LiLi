import type { UserEntity } from '@/auth/users/entities/user.entity.js';

export abstract class UserRepository {
  abstract create(user: UserEntity): Promise<UserEntity>;

  abstract findByUsername(username: string): Promise<UserEntity | null>;
}
