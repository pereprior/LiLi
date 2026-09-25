import type { UserEntity } from '#src/auth/users/entities/user.entity.js';

export type ValidatedSession = {
  uuid: string;
  user: UserEntity;
  csrfTokenHash: string;
};
