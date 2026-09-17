import type { UserEntity } from '@/auth/users/entities/user.entity.js';
import type { CreateUserData } from '@/auth/users/types/data/create-user.data.js';

export abstract class UserRepository {
  abstract create(data: CreateUserData): Promise<UserEntity>;
}
